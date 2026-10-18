#!/usr/bin/env python3
"""Package only a build with a passing, matching regression report."""
from pathlib import Path
from zipfile import ZipFile, ZipInfo, ZIP_DEFLATED
import hashlib
import json
import shutil

ROOT=Path(__file__).resolve().parents[1]


def main():
    report=json.loads((ROOT/'test-results/report.json').read_text())
    app=(ROOT/'index.html').read_bytes()
    assert report['failed']==0 and report['passed']>=14, 'Run the complete regression suite first.'
    assert report.get('app_sha256')==hashlib.sha256(app).hexdigest(), 'The tested build is stale.'
    assert (ROOT/'dist/Cubo-Studio-Minimal.html').read_bytes()==app
    shutil.copyfile(ROOT/'test-results/report.json',ROOT/'docs/test-report.json')
    shutil.copyfile(ROOT/'test-results/original-control-ids.json',ROOT/'docs/controles-originales.json')
    for width,name in [(1440,'interfaz.png'),(390,'interfaz-movil.png')]:
        shutil.copyfile(ROOT/f'test-results/editor-{width}.png',ROOT/'docs'/name)
    names=['Cubo-Studio-Minimal.exe','Cubo-Studio-Minimal.html']
    (ROOT/'dist/SHA256SUMS.txt').write_text(''.join(hashlib.sha256((ROOT/'dist'/name).read_bytes()).hexdigest()+'  '+name+'\n' for name in names))
    paths=['dist/Cubo-Studio-Minimal.exe','dist/Cubo-Studio-Minimal.html','dist/SHA256SUMS.txt','README.md','docs/funciones.md','docs/validacion.md','docs/test-report.json','docs/interfaz.png','licenses/WebView2.txt','licenses/Manrope-OFL.txt']
    with ZipFile(ROOT/'dist/Cubo-Studio-Minimal.zip','w',ZIP_DEFLATED) as archive:
        for name in paths:
            path=Path(name)
            entry=ZipInfo(path.name if path.parent.name=='dist' else name,date_time=(2026,1,1,0,0,0))
            entry.compress_type=ZIP_DEFLATED
            archive.writestr(entry,(ROOT/path).read_bytes())
        assert archive.testzip() is None
    print(f'Packaged {report["passed"]} passing checks, executable, HTML, screenshot and licenses.')


if __name__=='__main__':
    main()
