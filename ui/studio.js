/* Presentation layer. The original renderer, commands, history and formats stay intact. */
(() => {
  'use strict';
  document.documentElement.classList.add('minimal-studio');
  document.title = 'Cubo Studio · Estudio';

  const make = (tag, className, text) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text) element.textContent = text;
    return element;
  };
  const labelButton = (id, label, glyph) => {
    const button = $(id);
    const labelNode = make('span', 'button-label', label);
    button.replaceChildren(...(glyph ? [icon(glyph)] : []), labelNode);
    return button;
  };

  // Neutral themes are additional choices; every original color theme remains available.
  THEME_CATALOG.paper = themeEntry('Papel', false, 'charcoal', ['#f5f5f2','#ffffff','#f0f1ed','#fafaf8','#e2e4de','#292e2b','#656c65','#526e60','#293e33','#ffffff','#fafaf8','#f0f1ed']);
  THEME_CATALOG.charcoal = themeEntry('Carbón', true, 'paper', ['#202321','#282d29','#333a34','#242925','#434c44','#edf1eb','#b2bcb2','#a1b4a2','#c4d8c2','#233125','#292f2a','#303830']);
  const neutralThemes = make('div', 'neutral-themes');
  for (const name of ['paper', 'charcoal']) {
    const button = make('button', '', THEME_CATALOG[name].name);
    button.dataset.themeOption = name;
    button.onclick = () => {
      workspacePrefs.theme = name;
      applyTheme();
      saveWorkspace();
    };
    neutralThemes.append(button);
  }
  document.querySelector('.theme-options').prepend(neutralThemes);
  let preference = null;
  try {
    preference = localStorage.getItem('cubo-minimal-theme');
    if (preference && Object.hasOwn(THEME_CATALOG, preference)) workspacePrefs.theme = preference;
  } catch {}
  if (!preference) {
    // Keep the user's existing theme when migrating an established workspace.
    if (workspacePrefs.theme === 'system') workspacePrefs.theme = systemTheme.matches ? 'charcoal' : 'paper';
  }
  const originalApplyTheme = applyTheme;
  applyTheme = function () {
    originalApplyTheme();
    try { localStorage.setItem('cubo-minimal-theme', workspacePrefs.theme); } catch {}
  };
  applyTheme();
  saveWorkspace();

  const header = document.querySelector('.app-header');
  const brand = document.querySelector('.brand');
  brand.innerHTML = '<span class="brand-mark"><svg aria-hidden="true"><use href="#i-cube"/></svg></span><span>Cubo <span class="brand-light">Studio</span></span>';
  const context = document.querySelector('.header-center');
  context.replaceChildren(make('span', 'header-separator', '/'), make('span', '', 'Estudio de ilustración'));
  labelButton('workspaceSettings', 'Entorno', 'layout');
  labelButton('help', 'Ayuda', 'book');
  labelButton('openLibrary', 'Biblioteca', 'book');
  $('openLibrary').title = 'Biblioteca de presets (Ctrl + S)';
  $('openLibrary').setAttribute('aria-label', 'Biblioteca de presets');
  labelButton('openExport', 'Exportar', 'export');
  const actions = document.querySelector('.header-actions');
  actions.append($('help'), $('themeToggle'), $('workspaceSettings'), $('openLibrary'), $('openExport'));
  $('help').classList.remove('icon-button');
  $('workspaceSettings').classList.remove('icon-button');
  $('help').classList.add('header-utility');
  $('workspaceSettings').classList.add('header-utility');
  header.setAttribute('aria-label', 'Cubo Studio');

  const workspaceHeading = document.querySelector('.workspace-top > div');
  workspaceHeading.replaceChildren(make('span', 'eyebrow', 'ESTUDIO'), make('h1', '', 'Lienzo de trabajo'));
  const modelTag = make('span', 'model-tag', 'Cubo 3 × 3');
  workspaceHeading.append(modelTag);
  document.querySelector('.inspector-top .eyebrow').textContent = 'Propiedades';
  document.querySelector('.inspector-footer').replaceChildren(icon('check'), make('span', '', 'Tu trabajo se guarda en este equipo'));

  // Restore commands keep their actual original nodes and handlers.
  const resetMenu = make('div', 'reset-menu');
  const resetToggle = make('button', 'reset-toggle');
  resetToggle.id = 'resetMenuToggle';
  resetToggle.type = 'button';
  resetToggle.setAttribute('aria-expanded', 'false');
  resetToggle.setAttribute('aria-controls', 'resetMenu');
  resetToggle.append(icon('turn'), make('span', '', 'Restablecer'), make('span', 'chevron', '⌄'));
  const resetContent = make('div', 'reset-content');
  resetContent.id = 'resetMenu';
  resetContent.hidden = true;
  resetContent.append(make('p', 'menu-heading', 'Restablecer'));
  labelButton('resetColors', 'Colores originales', 'paint');
  labelButton('resetEverything', 'Todo el estudio', 'turn');
  const resetActive = make('button');
  resetActive.id = 'resetActiveTool';
  resetActive.append(icon('sliders'), make('span', '', 'Herramienta actual'));
  resetActive.onclick = () => $('resetTool').click();
  resetContent.append(resetActive, $('resetColors'), $('resetEverything'), make('p', 'tiny-note', 'Puedes deshacer estos cambios.'));
  resetMenu.append(resetToggle, resetContent);
  document.querySelector('.workspace-options').prepend(resetMenu);
  const closeResets = (returnFocus = false) => {
    resetContent.hidden = true;
    resetToggle.setAttribute('aria-expanded', 'false');
    if (returnFocus) resetToggle.focus();
  };
  resetToggle.onclick = () => {
    const open = resetContent.hidden;
    resetContent.hidden = !open;
    resetToggle.setAttribute('aria-expanded', String(open));
  };
  resetContent.addEventListener('click', event => { if (event.target.closest('button')) closeResets(true); });
  document.addEventListener('pointerdown', event => { if (!resetMenu.contains(event.target)) closeResets(); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && !resetContent.hidden) closeResets(true); });

  const names = {orbit:'Cámara', paint:'Pintar', tile:'Pegatinas', piece:'Piezas', turn:'Girar capas'};
  const descriptions = {
    orbit: 'Arrastra el cubo para orientarlo. Shift + rueda para cambiar la escala.',
    paint: 'Elige un color y pulsa una pegatina. Arrastra para ver las demás caras.',
    tile: 'Pulsa una pegatina para cambiar su visibilidad. Arrastra para orientar.',
    piece: 'Pulsa una pieza para seleccionar todas sus pegatinas juntas.',
    turn: 'Arrastra una capa para girarla, o usa los botones de giro preciso.'
  };
  for (const [value, name] of Object.entries(names)) {
    const button = document.querySelector(`[data-mode="${value}"]`);
    button.querySelector('span').textContent = name;
    button.setAttribute('aria-label', `${name} (tecla ${['orbit','paint','tile','piece','turn'].indexOf(value)+1})`);
  }
  $('tab-camera').textContent = 'Cámara';
  $('tab-edit').textContent = 'Herramienta';
  document.querySelector('#panel-camera .panel-heading h2').textContent = 'Cámara y encuadre';
  document.querySelector('#panel-camera .panel-heading p').textContent = 'Controla qué caras se ven y desde dónde.';
  document.querySelector('#panel-style .panel-heading h2').textContent = 'Estilo de ilustración';
  document.querySelector('#panel-style .panel-heading p').textContent = 'Ajusta el trazo, los colores y el fondo.';
  $('goViews').textContent = 'Abrir ajustes de cámara';
  const gesture = document.querySelector('.gesture-guide');
  gesture.querySelector('b').textContent = 'Control de cámara';
  gesture.querySelector('p').textContent = 'Arrastrar: orientar. Alt + arrastrar: orientar desde cualquier herramienta.';

  // Keep useful actions at the edge of the canvas instead of repeating them inside the inspector.
  const historyActions = document.querySelector('.history-actions');
  labelButton('undo', 'Deshacer', 'undo');
  labelButton('redo', 'Rehacer', 'redo');
  const historyDivider = make('span', 'toolbar-divider');
  historyActions.append(historyDivider, $('verifyCase'));
  $('verifyCase').replaceChildren(icon('check'), make('span', '', 'Verificar caso'));
  const canvasToolbar = document.querySelector('.canvas-toolbar');
  const canvasActions = make('div', 'canvas-actions');
  const frameButton = make('button', 'canvas-frame');
  frameButton.id = 'canvasFrame';
  frameButton.title = 'Restablecer encuadre (F)';
  frameButton.append(icon('focus'), make('span', '', 'Encuadrar'), make('kbd', '', 'F'));
  frameButton.onclick = () => $('resetCamera').click();
  const zoomControl = make('div', 'zoom-control');
  const zoomMinus = make('button', '', '−');
  zoomMinus.id = 'zoomOut';
  zoomMinus.setAttribute('aria-label', 'Alejar el cubo');
  const zoomValue = make('output', 'zoom-readout', '100%');
  zoomValue.id = 'canvasZoom';
  zoomValue.setAttribute('aria-label', 'Escala del cubo');
  const zoomPlus = make('button', '', '+');
  zoomPlus.id = 'zoomIn';
  zoomPlus.setAttribute('aria-label', 'Acercar el cubo');
  const stepZoom = direction => {
    if (studioLocked('zoom') || twist || settling) return;
    const input = $('zoom');
    input.value = String(Math.max(Number(input.min), Math.min(Number(input.max), Math.round((state.zoom + direction * .1) * 100) / 100)));
    input.dispatchEvent(new Event('input', {bubbles:true}));
  };
  zoomMinus.onclick = () => stepZoom(-1);
  zoomPlus.onclick = () => stepZoom(1);
  zoomControl.append(zoomMinus, zoomValue, zoomPlus);
  canvasActions.append(frameButton, zoomControl, $('mobileOptions'));
  canvasToolbar.append(canvasActions);
  $('mobileOptions').title = 'Fondo y opciones del visor';
  $('mobileOptions').setAttribute('aria-label', 'Fondo y opciones del visor');

  const helpDialogTitle = $('helpTitle');
  helpDialogTitle.textContent = 'Ayuda y atajos';
  $('workspaceTitle').textContent = 'Personalizar entorno';
  $('exportTitle').textContent = 'Exportar ilustración';
  for (const id of ['helpDialog','workspaceDialog','exportDialog']) {
    const eyebrow = $(id).querySelector('.eyebrow');
    if (eyebrow) eyebrow.textContent = 'CUBO STUDIO';
  }
  $('openExport').setAttribute('aria-label', 'Exportar PNG o SVG');
  $('exportSVG').classList.remove('primary');
  $('exportSVG').replaceChildren(icon('export'), make('span', '', 'Descargar SVG editable'));
  $('export').replaceChildren(icon('export'), make('span', '', 'Descargar PNG'));
  $('save').append(make('span', '', 'Guardar'));
  $('save').title = 'Guardar el estado actual como preset';
  const librarySubtitle = make('p', 'library-intro', 'Guarda y organiza tus casos. Cada preset conserva el cubo, el estilo y su cámara.');
  $('libraryDialog').querySelector('.dialog-heading').after(librarySubtitle);
  $('presetSearch').placeholder = 'Buscar preset por nombre';
  $('presetName').placeholder = 'Nombre del nuevo preset';

  const decorateBrushes = () => {
    const labels = colorLabels();
    for (const [index, button] of [...$('brushes').children].entries()) {
      const name = labels[index].charAt(0).toUpperCase() + labels[index].slice(1);
      button.dataset.colorLabel = name;
      button.title = name;
    }
  };
  const originalUpdateBrushes = updateBrushes;
  updateBrushes = function () { originalUpdateBrushes(); decorateBrushes(); };

  // A single small presentation refresh wraps the original chain without changing its decisions.
  const priorRefresh = refreshUI;
  refreshUI = function () {
    priorRefresh();
    $('toolTitle').textContent = names[mode];
    $('toolSubtitle').textContent = mode === 'turn' && state.captureMode ? 'Captura una capa a mitad de su giro.' : 'Herramienta activa';
    $('modeHelp').textContent = mode === 'turn' && state.captureMode ? 'Arrastra una capa: se detendrá a mitad del giro para ilustrar el movimiento.' : descriptions[mode];
    $('canvasZoom').textContent = Math.round(state.zoom * 100) + '%';
    if (workspacePrefs.viewerAuto) {
      const darkInk = [1,3,5].reduce((total, offset) => total + parseInt(state.ink.slice(offset, offset + 2), 16), 0) < 420;
      if (darkInk) {
        $('stage').style.setProperty('--canvas-paper', '#fafaf8');
        $('stage').style.setProperty('--canvas-checker', '#eff0ec');
        $('stage').style.setProperty('--canvas-text', '#656c65');
      }
    }
    $('zoomOut').disabled = studioLocked('zoom') || state.zoom <= .55 || !!twist || settling;
    $('zoomIn').disabled = studioLocked('zoom') || state.zoom >= 1.6 || !!twist || settling;
    frameButton.disabled = studioLocked('camera') && studioLocked('zoom');
    document.body.dataset.tool = mode;
    historyDivider.hidden = $('verifyCase').hidden;
    decorateBrushes();
  };
  const priorMode = setMode;
  setMode = function (value) {
    priorMode(value);
    if (mode === 'orbit') showTab('camera');
  };

  // Accessible names for the existing compact controls.
  document.querySelectorAll('button').forEach(button => {
    if (!button.getAttribute('aria-label') && button.title && !button.textContent.trim()) button.setAttribute('aria-label', button.title);
  });
  const skipLink = make('a', 'skip-link', 'Ir al lienzo');
  skipLink.href = '#canvas';
  document.body.prepend(skipLink);
  showTab(mode === 'orbit' ? 'camera' : 'edit');
  refreshUI();
  requestAnimationFrame(() => resize());
})();

/* Open studio: a new workbench using the original commands and persisted state. */
(() => {
  'use strict';
  document.documentElement.classList.add('open-studio');
  const node = (tag, className, text) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text) element.textContent = text;
    return element;
  };
  const relabel = (id, text, glyph) => {
    $(id).replaceChildren(...(glyph ? [icon(glyph)] : []), node('span', 'button-label', text));
  };
  const glyphs = {
    camera: '<circle cx="12" cy="12" r="8.5"/><ellipse cx="12" cy="12" rx="3.6" ry="8.5"/><path d="M3.5 12h17"/>',
    paint: '<path d="m14 3 7 7-9.5 9.5-7 1 1-7ZM12 5l7 7M5.5 13.5l5 5"/><path d="M4 21h17"/>',
    tile: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M15 3v18M3 9h18M3 15h18"/><path d="M9 9h6v6H9Z" fill="currentColor" stroke="none"/>',
    piece: '<path d="m12 2 9 5v10l-9 5-9-5V7ZM3 7l9 5 9-5M12 12v10M7.5 4.5l9 5v10M3 12l9 5 9-5"/>',
    turn: '<path d="M20 7A9 9 0 1 0 21 15M20 2v5h-5"/><path d="M8 9h7v7H8ZM11.5 9v7M8 12.5h7"/>',
    'view-three':'<path d="m12 3 9 5v10l-9 4-9-5V7ZM3 7l9 5 9-4M12 12v10M7.5 5l9 5M7.5 9.5v10M3 12l9 5 9-4"/>',
    'view-iso':'<path d="m12 2 9 5.2v9.6L12 22l-9-5.2V7.2ZM3 7.2l9 5.2 9-5.2M12 12.4V22M7.5 4.6l9 5.2M7.5 9.8v9.6M3 12l9 5.2 9-5.2"/>',
    'view-flat':'<rect x="3" y="3" width="18" height="18" rx="1"/><path d="M9 3v18M15 3v18M3 9h18M3 15h18"/>',
    'style-simple':'<path d="M4 17 9 7l5 10 6-10M4 21h16"/>',
    'style-comic':'<path d="m3 17 3-5 2-6 3 5 2 7 4-7 4-5M4 21l4-.6 5 .6 7-.4"/>',
    'style-solid':'<path d="m3 18 6-12 5 10 7-11v13Z" fill="currentColor" stroke="none"/>',
    show:'<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
    hide:'<path d="m3 3 18 18M10 5.2A11 11 0 0 1 22 12a15 15 0 0 1-3.3 4M6.4 6.5A18 18 0 0 0 2 12s3.5 7 10 7a11 11 0 0 0 4.5-1M9.8 9.8a3 3 0 0 0 4.4 4.4"/>',
    isolate:'<path d="M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5"/><rect x="8" y="8" width="8" height="8" rx="1"/>',
    toggle:'<rect x="3" y="6" width="18" height="12" rx="6"/><circle cx="9" cy="12" r="3"/>',
    book:'<path d="M3 6h7l2-2h9v16H3Z M3 10h18"/>',
    help:'<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 2-2.5 2-2.5 4M12 17h.01"/>',
    export:'<path d="M5 10v10h14V10M12 16V3m-5 5 5-5 5 5"/>',
    reset:'<path d="M3 10a9 9 0 1 1 1 8M3 4v6h6"/>',
  };
  const defs = document.querySelector('.svg-defs defs');
  for (const [name, markup] of Object.entries(glyphs)) {
    let symbol = $('i-' + name);
    if (!symbol) { symbol = document.createElementNS('http://www.w3.org/2000/svg', 'symbol'); symbol.id = 'i-' + name; symbol.setAttribute('viewBox', '0 0 24 24'); defs.append(symbol); }
    symbol.innerHTML = markup;
  }

  THEME_CATALOG.paper.colors = ['#f6f5f1','#f6f5f1','#e9e8e2','#f6f5f1','#ddded6','#252720','#73776d','#767f70','#252720','#ffffff','#f6f5f1','#eeeee7'];
  THEME_CATALOG.charcoal.colors = ['#242621','#242621','#34382f','#242621','#454a3f','#efeee7','#b8bdb0','#b1bda3','#e5e8dc','#252720','#242621','#2c3028'];
  applyTheme();

  document.querySelector('.brand').innerHTML = '<span class="brand-mark"><svg aria-hidden="true"><use href="#i-cube"/></svg></span><span>cubo<span class="brand-light">studio</span></span>';
  const globalNavigation = document.querySelector('.header-center');
  globalNavigation.replaceChildren(document.querySelector('.panel-tabs'));
  $('tab-camera').textContent = 'Encuadre';
  $('tab-style').textContent = 'Apariencia';
  $('tab-edit').textContent = 'Herramienta';
  relabel('help', 'Ayuda', 'help');
  relabel('workspaceSettings', 'Entorno', 'sliders');
  relabel('openLibrary', 'Biblioteca', 'book');
  relabel('openExport', 'Exportar', 'export');
  const title = document.querySelector('.workspace-top > div');
  title.replaceChildren(node('span','eyebrow','Cubo 3 × 3'),node('h1','','Estudio.'));
  const contextLine = node('p','workspace-caption','Ilustra cada movimiento.');
  title.append(contextLine);
  const tools = document.querySelector('.modebar');
  tools.setAttribute('aria-label','Elegir herramienta');
  const toolNames = {orbit:'Orientar',paint:'Pintar',tile:'Pegatinas',piece:'Piezas',turn:'Girar'};
  const toolIcons = {orbit:'camera',paint:'paint',tile:'tile',piece:'piece',turn:'turn'};
  for (const [key, text] of Object.entries(toolNames)) {
    const button = document.querySelector(`[data-mode="${key}"]`);
    const glyph = node('span','tool-glyph'); glyph.append(icon(toolIcons[key]));
    const shortcut = node('kbd','',String(Object.keys(toolNames).indexOf(key)+1));
    button.replaceChildren(glyph,node('span','tool-name',text),shortcut);
    button.title = text + ' · ' + shortcut.textContent;
  }
  relabel('three','Tres cuartos','view-three');
  relabel('iso','Isométrica','view-iso');
  relabel('front','Frontal','view-flat');
  document.querySelector('#panel-camera .panel-heading h2').textContent='Encuadre.';
  document.querySelector('#panel-camera .panel-heading p').textContent='Tu punto de vista.';
  document.querySelector('#panel-style .panel-heading h2').textContent='Apariencia.';
  document.querySelector('#panel-style .panel-heading p').textContent='El carácter de tu ilustración.';
  document.querySelector('.inspector-top').hidden = true;
  document.querySelector('.inspector-footer').hidden = true;

  const disclosure = (id, text, items) => {
    const details=node('details','detail-section'); details.id=id;
    const summary=node('summary','',text); summary.append(node('span','disclosure-mark','+'));
    const content=node('div','detail-content');
    for (const item of items) if (item) content.append(item);
    details.append(summary,content);
    return details;
  };
  const quickViews=document.querySelector('#panel-camera .quick-views');
  const reference=$('viewFace').closest('label');
  reference.after($('selectCameraFaces'));
  const advancedCamera=disclosure('cameraAdvanced','Orientación y escala',[
    $('viewAngle').closest('label'),$('viewCorner').closest('label'),document.querySelector('.camera-top-control'),$('zoom').closest('label'),document.querySelector('.framing-actions')
  ]);
  $('panel-camera').append(advancedCamera);
  quickViews.before(node('p','section-label','Vistas rápidas'));
  const modeHelp=$('modeHelp');
  $('panel-edit').append(document.querySelector('.case-utilities'),$('caseBadge'),modeHelp);
  relabel('outputOptions','Apariencia de lo oculto','show');
  relabel('noColors','Quitar colores','hide');
  relabel('allColors','Mostrar todos','show');
  relabel('resetCamera','Restablecer cámara','reset');
  relabel('applyFraming','Aplicar orientación','check');
  relabel('solved','Volver a cubo resuelto','cube');

  // Choice buttons use the existing select as the source of truth and keep all lock rules.
  const choices=[];
  const choiceLabels={
    visibilityAction:{toggle:'Alternar',solo:'Aislar',show:'Mostrar',hide:'Ocultar'},
    style:{simple:'Limpio',comic:'Orgánico',solid:'Sólido'},
    hiddenOutput:{outline:'Solo trazo',ghost:'Transparencia',show:'Mostrar color',hide:'Ocultar todo'},
    arrowMode:{'2d':'Plana · 2D','3d':'Volumen · 3D'},
    arrowPlacement:{auto:'Automática',manual:'Manual'},
    arrowOutline:{none:'Ninguno',outer:'Silueta',edges:'Aristas'},
    resolution:{'1024':'1024 px','2048':'2048 px','4096':'4096 px'}
  };
  const choiceIcons={visibilityAction:{toggle:'toggle',solo:'isolate',show:'show',hide:'hide'},style:{simple:'style-simple',comic:'style-comic',solid:'style-solid'}};
  for (const [id, labels] of Object.entries(choiceLabels)) {
    const select=$(id),group=node('div','choice-list choice-'+id);
    group.setAttribute('role','group'); group.setAttribute('aria-label',select.getAttribute('aria-label')||select.closest('label').firstChild.textContent.trim());
    select.classList.add('source-control');select.tabIndex=-1;select.setAttribute('aria-hidden','true');
    for (const option of select.options) {
      const button=node('button','choice-button');button.type='button';button.dataset.choice=id;button.dataset.value=option.value;
      const glyph=choiceIcons[id]?.[option.value];if(glyph)button.append(icon(glyph));
      button.append(node('span','',labels[option.value]||option.textContent));
      button.onclick=event=>{
        event.preventDefault();event.stopPropagation();
        if(select.disabled||option.disabled)return;
        select.value=option.value;
        select.dispatchEvent(new Event('input',{bubbles:true}));select.dispatchEvent(new Event('change',{bubbles:true}));
        syncChoices();
      };
      group.append(button);
    }
    select.after(group);choices.push({select,group});
  }
  function syncChoices(){
    for(const {select,group} of choices)for(const button of group.children){
      button.setAttribute('aria-pressed',String(select.value===button.dataset.value));
      button.disabled=select.disabled||[...select.options].find(o=>o.value===button.dataset.value)?.disabled;
    }
  }

  // Editable numbers replace repeated sliders. The original inputs still handle validation and history.
  const steppers=[];
  for(const input of document.querySelectorAll('input[type="range"]')){
    if(input.id==='arrowRotationDial'){input.classList.add('source-control');input.tabIndex=-1;input.setAttribute('aria-hidden','true');continue;}
    const field=input.closest('label');if(!field)continue;
    const caption=input.getAttribute('aria-label')||field.firstChild.textContent.trim();
    const control=node('div','number-control');
    const percent=['zoom','opacity','bgOpacity','hiddenAlpha'].includes(input.id),factor=percent?100:1;
    const unit=percent?'%':({width:'px',arrowWidth:'px',arrowLength:'°',arrowHead:'×',arrowScaleX:'×',arrowScaleY:'×',arrowOutlineWidth:'px'}[input.id]||'');
    const decrease=node('button','number-step','−'),increase=node('button','number-step','+'),number=document.createElement('input');
    decrease.type=increase.type='button';
    decrease.setAttribute('aria-label','Reducir '+caption);increase.setAttribute('aria-label','Aumentar '+caption);
    number.type='number';number.min=String(Number(input.min)*factor);number.max=String(Number(input.max)*factor);number.step=String(Number(input.step)*factor);number.id=input.id+'Direct';number.setAttribute('aria-label',caption+(unit?' ('+unit+')':''));
    const commit=value=>{
      if(input.disabled)return;
      const amount=Number(value)/factor;
      if(value===''||!Number.isFinite(amount)){number.setAttribute('aria-invalid','true');return;}
      const step=Number(input.step)||1,min=Number(input.min),max=Number(input.max);
      const next=Math.max(min,Math.min(max,Number((Math.round((amount-min)/step)*step+min).toFixed(5))));
      input.value=String(next);number.value=String(Number((next*factor).toFixed(4)));number.removeAttribute('aria-invalid');
      input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));
    };
    decrease.onclick=e=>{e.preventDefault();commit((Number(input.value)-(Number(input.step)||1))*factor);};
    increase.onclick=e=>{e.preventDefault();commit((Number(input.value)+(Number(input.step)||1))*factor);};
    number.onchange=()=>commit(number.value);
    number.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();commit(number.value);number.blur();}};
    control.append(decrease,number,node('span','number-unit',unit),increase);input.after(control);input.classList.add('source-control');input.tabIndex=-1;input.setAttribute('aria-hidden','true');
    field.classList.add('direct-value-field');steppers.push({input,number,decrease,increase,factor});
  }
  function syncNumbers(){
    for(const {input,number,decrease,increase,factor} of steppers){
      if(document.activeElement!==number)number.value=String(Number((Number(input.value)*factor).toFixed(4)));
      number.disabled=input.disabled;decrease.disabled=input.disabled||Number(input.value)<=Number(input.min);increase.disabled=input.disabled||Number(input.value)>=Number(input.max);
    }
  }

  // Extra export choices stay one step away; common output choices are always visible.
  const exportAdvanced=disclosure('exportAdvanced','Recorte y nombre de archivo',[
    $('exportName').closest('label'),document.querySelector('.auto-name-row'),$('tightExport').closest('label'),$('cropExport').closest('label'),$('filenameFull')
  ]);
  document.querySelector('#exportDialog .export-body').after(exportAdvanced);
  $('exportTitle').textContent='Exportar.';
  $('helpTitle').textContent='A mano.';
  $('workspaceTitle').textContent='Tu entorno.';
  relabel('footerHelp','Atajos','help');
  $('save').title='Guardar nuevo preset';
  $('libraryDialog').querySelector('.dialog-heading h2').textContent='Biblioteca.';
  document.querySelector('.library-intro').textContent='Tus casos, listos para volver a ellos.';
  const emptyNotes=()=>{
    const empty=$('presets').querySelector(':scope > .tiny-note');
    if(empty){empty.classList.add('library-empty');empty.textContent=$('presetSearch').value?'No hay coincidencias. Prueba otro nombre.':'Tu biblioteca empieza aquí. Ponle un nombre al cubo y guárdalo.';}
  };
  const priorList=list;list=function(){priorList();emptyNotes();};
  const oldGridClick=$('toggleGrid').onclick;
  $('toggleGrid').onclick=()=>{oldGridClick();try{localStorage.setItem('cubo-open-grid',$('toggleGrid').getAttribute('aria-pressed'));}catch{}};
  let showGrid=false;try{showGrid=localStorage.getItem('cubo-open-grid')==='true';}catch{}
  $('stage').classList.toggle('clean-background',!showGrid);$('toggleGrid').setAttribute('aria-pressed',String(showGrid));

  const updateOpenUI=()=>{
    const names={orbit:'Orientar.',paint:'Color.',tile:'Pegatinas.',piece:'Piezas.',turn:'Movimiento.'};
    $('toolTitle').textContent=names[mode];
    $('toolSubtitle').textContent={orbit:'El cubo en tus manos.',paint:'Un color, cada detalle.',tile:'Elige qué quieres mostrar.',piece:'Aristas, esquinas y centros.',turn:'Cada giro cuenta.'}[mode];
    if(workspacePrefs.viewerAuto){
      const darkInk=[1,3,5].reduce((sum,i)=>sum+parseInt(state.ink.slice(i,i+2),16),0)<420;
      if(darkInk){
        const darkTheme=document.documentElement.dataset.theme==='dark',rootStyle=getComputedStyle(document.documentElement);
        $('stage').style.setProperty('--canvas-paper',darkTheme?'#efefe9':rootStyle.getPropertyValue('--ui-bg'));
        $('stage').style.setProperty('--canvas-checker',darkTheme?'#e5e6de':rootStyle.getPropertyValue('--ui-soft'));
        $('stage').style.setProperty('--canvas-text',darkTheme?'#656c60':rootStyle.getPropertyValue('--ui-muted'));
      }
    }
    for(const [i,button] of [...$('brushes').children].entries()){
      button.style.setProperty('--brush-color',state.colors[i]);
      const brightness=[1,3,5].reduce((sum,p,j)=>sum+parseInt(state.colors[i].slice(p,p+2),16)*[.21,.72,.07][j],0);
      button.style.setProperty('--brush-ink',brightness>150?'#252720':'#ffffff');
    }
    for(const [id,angle]of[['three','three'],['iso','iso'],['front','flat']]){
      const target=state.cameraFaces?.length>1?targetForFaces(state.cameraFaces,angle,state.viewCorner,cameraReferenceUp()):cameraTargetForFace(Number(state.viewFace),angle,state.viewCorner);
      const q=cameraRotation(),expected=cameraRotation(target),matches=Math.abs(q.reduce((sum,v,i)=>sum+v*expected[i],0))>.999999;
      $(id).setAttribute('aria-pressed',String(state.viewAngle===angle&&(!!cameraAnimation||matches)));
    }
    const activePreset=presets[activePresetIndex];contextLine.textContent=activePreset?.name||'Ilustra cada movimiento.';
    const cameraFaces=state.cameraFaces?.length||0;
    $('selectCameraFaces').replaceChildren(icon('isolate'),node('span','',cameraFaces?'Caras elegidas · '+cameraFaces:'Elegir caras en el cubo'));
    $('captureMode').replaceChildren(icon('arrow-arc'),node('span','',state.captureMode?'Captura activa':'Capturar giro'));
    $('scrambleCube').replaceChildren(icon('scramble'),node('span','','Mezclar'));
    syncChoices();syncNumbers();
  };
  const previousRefresh=refreshUI;refreshUI=function(){previousRefresh();updateOpenUI();};
  const previousBrushes=updateBrushes;updateBrushes=function(){previousBrushes();for(const [i,button]of[...$('brushes').children].entries()){button.style.setProperty('--brush-color',state.colors[i]);const brightness=[1,3,5].reduce((sum,p,j)=>sum+parseInt(state.colors[i].slice(p,p+2),16)*[.21,.72,.07][j],0);button.style.setProperty('--brush-ink',brightness>150?'#252720':'#ffffff');}};
  const previousTheme=applyTheme;applyTheme=function(){previousTheme();if(typeof updateOpenUI==='function')updateOpenUI();};
  $('arrowDialog').addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();$('arrowDialog').close();$('arrowConfig').focus();}});
  refreshUI();list();requestAnimationFrame(()=>resize());
})();
