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
