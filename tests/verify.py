#!/usr/bin/env python3
"""Behavioral regression checks against the recovered application and its real UI."""
from pathlib import Path
from contextlib import contextmanager
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
import functools
import hashlib
import json
import os
import re
import shutil
import struct
import threading
import time
import xml.etree.ElementTree as ET

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
RESULTS = ROOT / 'test-results'
RESULTS.mkdir(exist_ok=True)
checks = []
errors = []


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass


def require(condition, message):
    if not condition:
        raise AssertionError(message)


def record(name, action):
    start = time.monotonic()
    try:
        action()
        result = {'name': name, 'status': 'passed'}
    except Exception as error:
        result = {'name': name, 'status': 'failed', 'error': str(error)}
    result['seconds'] = round(time.monotonic() - start, 2)
    checks.append(result)
    print(json.dumps(result, ensure_ascii=False), flush=True)


def input_value(page, selector, value, event='input'):
    page.locator(selector).evaluate('(el,args)=>{el.value=args.value;el.dispatchEvent(new Event(args.event,{bubbles:true}));}', {'value': str(value), 'event': event})


def hit(page, condition='!isCenterSticker(p.sticker)'):
    point = page.evaluate('''() => {
      const polygon=hitPolys.find(p=>CONDITION);
      if(!polygon)throw new Error('No matching visible sticker');
      const rect=c.getBoundingClientRect();
      return {index:stickers.indexOf(polygon.sticker), x:rect.x+polygon.pts.reduce((v,p)=>v+p[0],0)/polygon.pts.length/c.width*rect.width,
        y:rect.y+polygon.pts.reduce((v,p)=>v+p[1],0)/polygon.pts.length/c.height*rect.height};
    }'''.replace('CONDITION', condition))
    page.mouse.click(point['x'], point['y'])
    return point['index']


def close_dialog(page, id):
    page.locator('#' + id).evaluate('(el)=>el.close()')


def wait_camera(page):
    page.wait_for_function('!cameraAnimation && !twist && !settling', timeout=8000)


def main():
    server = ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(QuietHandler, directory=str(ROOT)))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    base = f'http://127.0.0.1:{server.server_port}'
    chrome = os.environ.get('CUBO_CHROME') or shutil.which('google-chrome') or shutil.which('chromium')
    bundled_chrome = '/workspace/.cache/chrome/opt/google/chrome/chrome'
    if not chrome and Path(bundled_chrome).exists():
        chrome = bundled_chrome

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(**({'executable_path': chrome} if chrome else {}), args=['--no-sandbox'])

        @contextmanager
        def page_at(path='/', width=1440, height=1000):
            context = browser.new_context(viewport={'width': width, 'height': height}, device_scale_factor=1, accept_downloads=True, reduced_motion='reduce')
            page = context.new_page()
            page.set_default_timeout(8000)
            page.on('pageerror', lambda e: errors.append(str(e)))
            page.goto(base + path, wait_until='networkidle')
            try:
                yield page
            finally:
                context.close()

        def original_integrity():
            original = (ROOT / 'src/original.html').read_text()
            redesigned = (ROOT / 'index.html').read_text()
            scripts = lambda text: re.findall(r'<script[^>]*>(.*?)</script>', text, re.S)
            require(scripts(redesigned)[:15] == scripts(original), 'An original script changed')
            require(hashlib.sha256((ROOT/'src/Cubo-Studio-1.14.exe').read_bytes()).hexdigest() == '3ebd2e9cb38b835527140aee26c6760e9df6fad9ec30a8d173732bbeaf4ab1e7', 'Original executable changed')
            with page_at('/src/original.html') as old, page_at() as new:
                original_ids = set(old.locator('button[id],input[id],select[id],dialog').evaluate_all('(els)=>els.map(e=>e.id)'))
                new_ids = set(new.locator('button[id],input[id],select[id],dialog').evaluate_all('(els)=>els.map(e=>e.id)'))
                require(original_ids <= new_ids, f'Missing original controls: {original_ids-new_ids}')
                require(new.locator('[id]').evaluate_all('(els)=>els.map(e=>e.id).filter((id,i,ids)=>ids.indexOf(id)!==i)') == [], 'Duplicate IDs')
                require(new.evaluate('valid(snapshot())'), 'Invalid initial snapshot')
                require(len(original_ids) >= 140, 'Inventory did not cover the application')
                (RESULTS/'original-control-ids.json').write_text(json.dumps(sorted(original_ids), ensure_ascii=False, indent=2))
        record('Original scripts unchanged; all original controls retained', original_integrity)

        def same_engine():
            operations = '''() => {
              setMode('turn'); turn('R');turn('U',true);turn('F');
              setMode('paint');brush=5;editSticker(stickers.find(s=>!isCenterSticker(s)&&s.color!==5));
              setMode('piece');$('visibilityAction').value='hide';editSticker(stickers.find(s=>s.p.every(v=>v!==0)));
              captureTurn(0,1,1);state.arrowMode='3d';state.arrowOutline='edges';state.arrowWidth=9;
              const out=document.createElement('canvas');out.width=out.height=256;render(out,true,true);
              return {snapshot:snapshot(),png:out.toDataURL(),valid:valid(snapshot())};
            }'''
            with page_at('/src/original.html') as old, page_at() as new:
                original = old.evaluate(operations)
                redesigned = new.evaluate(operations)
                require(original == redesigned, 'State or exported pixels differ from the original engine')
                require(redesigned['valid'], 'Pose is invalid')
        record('Same engine state and identical exported pixels after edits and 3D capture', same_engine)

        def camera():
            with page_at() as page:
                require(page.locator('#panel-camera').is_visible(), 'Camera panel not selected on startup')
                before = page.evaluate('[state.yaw,state.pitch]')
                canvas = page.locator('#canvas').bounding_box()
                page.mouse.move(canvas['x']+30, canvas['y']+70)
                page.mouse.down(); page.mouse.move(canvas['x']+100, canvas['y']+100, steps=8); page.mouse.up()
                require(page.evaluate('[state.yaw,state.pitch]') != before, 'Orbit did not move')
                page.locator('#zoomIn').click()
                require(abs(page.evaluate('state.zoom') - 1.1) < .001, 'Zoom in failed')
                page.locator('#zoomOut').click()
                require(abs(page.evaluate('state.zoom') - 1) < .001, 'Zoom out failed')
                page.locator('#front').click(); wait_camera(page)
                require(page.evaluate('Math.abs(state.yaw)<.001 && Math.abs(state.pitch)<.001'), 'Frontal view failed')
                page.locator('#iso').click(); wait_camera(page)
                require(page.evaluate('state.viewAngle') == 'iso', 'Isometric view failed')
                page.locator('#facePicker').click()
                page.locator('[data-face-option="4"]').click(); wait_camera(page)
                require(page.evaluate('state.viewFace') == '4', 'Reference face failed')
                page.locator('#cameraTop').select_option('1')
                require(page.evaluate('state.cameraTop') == 1, 'Top face failed')
                page.locator('#canvasFrame').click(); wait_camera(page)
                require(page.evaluate('state.cameraTop===null && state.zoom===1'), 'Frame reset failed')
                page.locator('#selectCameraFaces').click()
                hit(page, 'CubeCheck.face(p.sticker)===2')
                hit(page, 'CubeCheck.face(p.sticker)===4')
                page.locator('#checkSelected').click(); wait_camera(page)
                require(page.evaluate('state.cameraFaces.length') == 2, 'Multi-face framing failed')
        record('Camera drag, zoom, views, face references and multi-face framing', camera)

        def painting_visibility():
            with page_at() as page:
                page.locator('[data-mode=paint]').click()
                page.locator('#brushes button').nth(5).click()
                require(page.locator('#brushes button').nth(5).get_attribute('data-color-label') == 'Verde', 'Brush name disappeared')
                index = hit(page, '!isCenterSticker(p.sticker)&&p.sticker.color!==5')
                require(page.evaluate(f'stickers[{index}].color===5 && stickers[{index}].painted'), 'Painting failed')
                page.locator('#undo').click()
                require(not page.evaluate(f'!!stickers[{index}].painted'), 'Undo failed')
                page.locator('#redo').click()
                require(page.evaluate(f'stickers[{index}].painted'), 'Redo failed')
                page.locator('[data-mode=tile]').click()
                hit(page)
                require(page.evaluate('stickers.filter(s=>s.visible===false).length') == 1, 'Sticker visibility failed')
                page.locator('#allColors').click()
                page.locator('[data-mode=piece]').click()
                hit(page, 'p.sticker.p.every(v=>Math.abs(v)===1)')
                require(page.evaluate('stickers.filter(s=>s.visible===false).length') == 3, 'Whole-piece visibility failed')
                page.locator('#visibilityAction').select_option('solo')
                hit(page, 'p.sticker.p.filter(v=>v!==0).length===2')
                require(page.evaluate('stickers.filter(s=>s.visible!==false).length') == 2, 'Isolate edge failed')
                page.locator('#outputOptions').click()
                page.locator('#hiddenOutput').select_option('ghost')
                input_value(page, '#hiddenAlpha', '.35', 'change')
                require(page.evaluate('state.hiddenMode==="ghost" && state.hiddenAlpha===.35'), 'Hidden output policy failed')
                close_dialog(page, 'outputDialog')
                page.locator('#allColors').click()
                require(page.evaluate('stickers.every(s=>s.visible!==false)'), 'Show all failed')
                page.locator('#noColors').click()
                require(page.evaluate('stickers.every(s=>s.visible===false)'), 'Hide all failed')
        record('Painting, undo/redo, sticker and piece selection, isolation and hidden output', painting_visibility)

        def turns_capture():
            with page_at() as page:
                page.locator('[data-mode=turn]').click()
                before = page.evaluate('JSON.stringify(stickers)')
                page.locator('#moves button').filter(has_text=re.compile('^R$')).click()
                require(page.evaluate('JSON.stringify(stickers)') != before, 'Layer turn failed')
                page.locator('#inverse').check()
                page.locator('#moves button').filter(has_text=re.compile('^R$')).click()
                require(page.evaluate('JSON.stringify(stickers)') == before, 'Inverse turn failed')
                page.locator('#inverse').uncheck()
                page.locator('#captureMode').click()
                page.locator('#moves button').filter(has_text=re.compile('^U$')).click()
                require(page.evaluate('Math.abs(state.captureMove.angle)===Math.PI/4'), 'Capture failed')
                require(page.locator('#captureBar').is_visible(), 'Capture actions unavailable')
                page.locator('#arrowConfig').click()
                page.locator('#arrowMode').select_option('3d')
                page.locator('#arrowPlacement').select_option('manual')
                input_value(page, '#arrowRotation', '123.5')
                input_value(page, '#arrowWidth', '10')
                page.locator('#arrowLineTab').click()
                page.locator('#arrowOutline').select_option('edges')
                input_value(page, '#arrowOutlineColor', '#334455')
                require(page.evaluate('state.arrowMode==="3d"&&state.arrowRotation===123.5&&state.arrowOutline==="edges"&&state.arrowOutlineColor==="#334455"'), 'Arrow settings failed')
                close_dialog(page, 'arrowDialog')
                page.locator('#cancelCapture').click()
                require(page.evaluate('!state.captureMove') and page.evaluate('JSON.stringify(stickers)') == before, 'Cancel capture failed')
                page.locator('#moves button').filter(has_text=re.compile('^U$')).click()
                page.locator('#completeCapture').click()
                require(page.evaluate('!state.captureMove') and page.evaluate('JSON.stringify(stickers)') != before, 'Complete capture failed')
                page.locator('#captureMode').click()
                page.locator('#scrambleCube').click()
                require(page.evaluate('CubeCheck.verify(stickers,[0,1,2,3,4,5],colorLabels()).valid'), 'Scramble produced an invalid cube')
                page.locator('#solved').click()
                require(page.evaluate('JSON.stringify(stickers)') == before, 'Solved reset failed')
        record('Turns, inverse, scramble, half-turn captures, 3D arrows and resets', turns_capture)

        def visual_settings():
            with page_at() as page:
                page.locator('#tab-style').click()
                page.locator('#style').select_option('simple')
                input_value(page, '#width', '2.5')
                input_value(page, '#ink', '#27312b')
                require(page.evaluate('state.style==="simple"&&state.width===2.5&&state.ink==="#27312b"'), 'Stroke settings failed')
                page.locator('#divisions').uncheck()
                require(not page.evaluate('state.divisions'), 'Divisions toggle failed')
                page.locator('#subtab-color').click()
                page.locator('#cubePalette').select_option('4')
                require(page.evaluate('state.colors[2]') == '#e99d9b', 'Palette preset failed')
                input_value(page, '#color2', '#aa3344')
                page.wait_for_timeout(300)
                input_value(page, '#opacity', '.65')
                input_value(page, '#background', '#f0eee7')
                input_value(page, '#bgOpacity', '.4')
                require(page.evaluate('state.colors[2]==="#aa3344"&&state.opacity===.65&&state.bgOpacity===.4'), 'Color and opacity failed')
                page.locator('#mobileOptions').click()
                input_value(page, '#viewerColor', '#eeeecc')
                require(page.evaluate('workspacePrefs.viewerColor') == '#eeeecc', 'Viewer background failed')
                require(page.evaluate('state.background') == '#f0eee7', 'Viewer background changed the illustration')
                close_dialog(page, 'canvasDialog')
        record('Stroke, divisions, palette, individual colors, opacity and separate viewer background', visual_settings)

        def export_files():
            with page_at() as page:
                page.locator('#openExport').click()
                page.locator('#resolution').select_option('1024')
                page.locator('#autoFilename').uncheck()
                page.locator('#exportName').fill('Prueba de cubo')
                with page.expect_download() as png_download:
                    page.locator('#export').click()
                png = png_download.value
                png.save_as(RESULTS/'export.png')
                data = (RESULTS/'export.png').read_bytes()
                require(data[:8] == b'\x89PNG\r\n\x1a\n', 'Export is not PNG')
                width, height = struct.unpack_from('>II', data, 16)
                require(max(width, height) == 1024 and len(data)>5000, 'PNG dimensions or content invalid')
                with page.expect_download(timeout=60000) as svg_download:
                    page.locator('#exportSVG').click()
                svg_download.value.save_as(RESULTS/'export.svg')
                svg = ET.parse(RESULTS/'export.svg').getroot()
                require(len(list(svg.iter('{http://www.w3.org/2000/svg}path'))) > 10, 'SVG has no useful geometry')
                require(not list(svg.iter('{http://www.w3.org/2000/svg}image')), 'SVG contains a raster image')
                require('Prueba-de-cubo' in png.suggested_filename, 'Manual filename failed')
                page.locator('#tightExport').uncheck()
                require(not page.evaluate('state.tightExport'), 'Frame option failed')
                require(page.locator('#cropExport').is_disabled(), 'Dependent crop option not disabled')
        record('Download real 1024px PNG and editable vector SVG; filenames and framing', export_files)

        def library():
            with page_at() as page:
                page.locator('#openLibrary').click()
                page.locator('#presetName').fill('OLL · esquina')
                page.locator('#save').click()
                require(page.evaluate('presets.length') == 1, 'Preset save failed')
                page.locator('#toggleFolders').click()
                page.locator('#folderName').fill('Casos OLL')
                page.locator('#createFolder').click()
                require(page.evaluate('presetFolders.length') == 1, 'Folder creation failed')
                page.locator('#presetFolderFilter').select_option('*')
                folder_id = page.evaluate('presetFolders[0].id')
                page.locator('.preset-order select').select_option(folder_id)
                page.locator('#presetName').fill('PLL · aristas')
                page.locator('#save').click()
                page.locator('#presetSearch').fill('esquina')
                require(page.locator('#presets .preset').count() == 1, 'Preset search failed')
                page.locator('#presetSearch').fill('')
                with page.expect_download() as download:
                    page.locator('#downloadPresets').click()
                download.value.save_as(RESULTS/'library.json')
                saved = json.loads((RESULTS/'library.json').read_text())
                require(saved['version'] == 2 and len(saved['presets']) == 2 and len(saved['folders']) == 1, 'Library format changed')
                page.locator('#file').set_input_files(RESULTS/'library.json')
                require(page.evaluate('presets.length') >= 2, 'Library import failed')
                # Loading a cube must retain the live camera; applying the camera is separate.
                page.evaluate('state.yaw=.123;changed()')
                page.locator('#presets .preset > button').first.click()
                require(abs(page.evaluate('state.yaw') - .123) < .001, 'Loading preset replaced the live camera')
                page.locator('#presets [aria-label^="Detalles de"]').first.click()
                page.locator('.detail-camera').click(); wait_camera(page)
                require(abs(page.evaluate('state.yaw') - .123) > .01, 'Saved camera not applied')
                page.reload(wait_until='networkidle')
                require(page.evaluate('presets.length') >= 2, 'Library did not persist across reload')
        record('Preset save/search, folders, library JSON import/export, camera policy and persistence', library)

        def verification():
            with page_at() as page:
                page.locator('[data-mode=turn]').click()
                page.locator('#verifyCase').click()
                page.locator('#checkAll').click()
                require(page.evaluate('checkResult.data.valid'), 'Solved cube did not verify')
                require(page.locator('#caseReport').is_visible(), 'Verification report not visible')
                close_dialog(page, 'caseReport')
                page.locator('[data-mode=paint]').click()
                page.locator('#brushes button').nth(5).click()
                hit(page, '!isCenterSticker(p.sticker)&&p.sticker.color!==5')
                page.locator('#verifyCase').click()
                page.locator('#checkAll').click()
                require(not page.evaluate('checkResult.data.valid'), 'Impossible case was accepted')
                close_dialog(page, 'caseReport')
                page.locator('#openExport').click()
                require(page.locator('#exportDialog').is_visible(), 'An invalid case should still be exportable')
        record('Physical-case verification accepts solved cube and reports invalid paint without blocking export', verification)

        def environment():
            with page_at() as page:
                page.locator('#workspaceSettings').click()
                page.locator('[data-theme-option=charcoal]').click()
                require(page.evaluate('document.documentElement.dataset.theme') == 'dark', 'Dark theme failed')
                close_dialog(page, 'workspaceDialog')
                page.reload(wait_until='networkidle')
                require(page.evaluate('workspacePrefs.theme') == 'charcoal', 'Theme was not retained')
                page.locator('#workspaceSettings').click()
                page.locator('[data-theme-option=paper]').click()
                page.locator('#env-tab-locks').click()
                page.locator('#lockGroups .lock-option').filter(has_text='Escala / zoom').locator('input').check()
                close_dialog(page, 'workspaceDialog')
                require(page.locator('#zoomIn').is_disabled() and page.locator('#zoom').is_disabled(), 'Zoom lock was not honored')
                page.evaluate('setLock("zoom",false)')
                page.locator('#tab-style').click()
                page.locator('#panel-style .detach-panel').click()
                require(page.evaluate('floatingWindows.has("style")'), 'Floating panel not created')
                page.evaluate('dockPanel("style")')
                require(not page.evaluate('floatingWindows.has("style")'), 'Panel did not dock')
                page.locator('#focus').click()
                require(page.locator('body').evaluate('(el)=>el.classList.contains("focus-mode")'), 'Focus mode failed')
                page.keyboard.press('\\')
                require(not page.locator('body').evaluate('(el)=>el.classList.contains("focus-mode")'), 'Focus shortcut failed')
                page.locator('#resetMenuToggle').click()
                require(page.locator('#resetColors').is_visible() and page.locator('#resetEverything').is_visible(), 'Reset actions inaccessible')
                page.keyboard.press('Escape')
                require(not page.locator('#resetMenu').is_visible(), 'Reset menu did not close on Escape')
        record('Themes persist; locks, floating panels, focus, shortcuts and reset menu work', environment)

        def responsive():
            for width, height in [(1440,1000),(1280,720),(1024,768),(760,820),(390,844),(320,720)]:
                with page_at(width=width, height=height) as page:
                    require(page.evaluate('document.documentElement.scrollWidth<=innerWidth'), f'Horizontal overflow at {width}')
                    for selector in ['#openLibrary','#openExport','[data-mode=orbit]','[data-mode=turn]','#canvas','#tab-camera','#tab-style','#tab-edit']:
                        require(page.locator(selector).is_visible(), f'{selector} hidden at {width}')
                    bounds=page.locator('#canvas').bounding_box()
                    require(bounds['height']>100 and bounds['width']>200, f'Canvas collapsed at {width}')
                    quick=page.locator('#selectCameraFaces').bounding_box()
                    reference=page.locator('#facePicker').bounding_box()
                    require(quick['y']+quick['height']<=reference['y'], f'Camera controls overlap at {width}')
                    page.wait_for_timeout(200)
                    page.screenshot(path=str(RESULTS/f'editor-{width}.png'), full_page=True)
                    for tool in ['paint','tile','piece','turn']:
                        page.locator(f'[data-mode={tool}]').click()
                        require(page.locator('#panel-edit').is_visible(), f'Context inspector hidden for {tool} at {width}')
                    page.locator('#tab-style').click()
                    page.locator('#subtab-color').click()
                    require(page.locator('#cubePalette').is_visible(), f'Color controls hidden at {width}')
        record('Desktop, laptop, tablet and mobile layouts preserve navigation and canvas', responsive)

        record('No browser JavaScript errors during all checks', lambda: require(not errors, '\n'.join(errors)))
        browser.close()
    server.shutdown()
    summary = {'passed': sum(c['status']=='passed' for c in checks), 'failed': sum(c['status']=='failed' for c in checks), 'checks': checks, 'browser_errors': errors}
    (RESULTS/'report.json').write_text(json.dumps(summary, ensure_ascii=False, indent=2))
    print(json.dumps({'passed':summary['passed'],'failed':summary['failed']}, ensure_ascii=False))
    raise SystemExit(1 if summary['failed'] else 0)


if __name__ == '__main__':
    main()
