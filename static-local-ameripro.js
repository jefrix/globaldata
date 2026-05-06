(function () {
  const BOUNDS = { minLon: -85.62, maxLon: -80.84, minLat: 30.36, maxLat: 35.01 };
  const LEVEL_KEY = 'gd_ameripro_tank_levels';
  const LEVEL_STEP = 5;
  const BASE = {
    name: 'AmeriPro Environmental Services',
    address: '210 Savannah Ave, East Dublin, GA 31027',
    phone: '478-595-3906',
    lat: 32.548338,
    lon: -82.864773,
    source: 'ameripro-environmental.com',
  };
  const ASSETS = [
    {
      id: 'large-truck-1',
      label: 'Large Pump Truck 1',
      shortLabel: 'L1',
      kind: 'Large Pump Truck',
      tank: 'Large truck tank',
      capacity: 'Large',
      lat: BASE.lat + 0.030,
      lon: BASE.lon - 0.030,
      color: '#73ff9a',
    },
    {
      id: 'large-truck-2',
      label: 'Large Pump Truck 2',
      shortLabel: 'L2',
      kind: 'Large Pump Truck',
      tank: 'Large truck tank',
      capacity: 'Large',
      lat: BASE.lat + 0.018,
      lon: BASE.lon + 0.034,
      color: '#73ff9a',
    },
    {
      id: 'small-truck-1',
      label: 'Small Pump Truck',
      shortLabel: 'S1',
      kind: 'Small Pump Truck',
      tank: 'Small truck tank',
      capacity: 'Small',
      lat: BASE.lat - 0.030,
      lon: BASE.lon - 0.018,
      color: '#5bd7ff',
    },
    {
      id: 'frak-tank',
      label: 'Dublin Frak Tank',
      shortLabel: 'FT',
      kind: 'Stationary Frak Tank',
      tank: 'Dublin grease holding tank',
      capacity: 'Stationary',
      lat: BASE.lat,
      lon: BASE.lon,
      color: '#f5d142',
      fixed: true,
    },
  ];

  let levels = readLevels();
  let active = false;
  let selectedId = null;
  let lastViewBox = '';

  function readLevels() {
    try {
      const saved = JSON.parse(localStorage.getItem(LEVEL_KEY) || '{}');
      return ASSETS.reduce((acc, asset) => {
        const value = Number(saved[asset.id]);
        acc[asset.id] = Number.isFinite(value) ? Math.max(0, Math.min(100, Math.round(value))) : 0;
        return acc;
      }, {});
    } catch {
      return {};
    }
  }

  function saveLevels() {
    localStorage.setItem(LEVEL_KEY, JSON.stringify(levels));
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }[char]));
  }

  function row(label, value, color) {
    const style = color ? ` style="color:${escapeHtml(color)}"` : '';
    return `<div class="insp-row"><span>${escapeHtml(label)}</span><b${style}>${escapeHtml(value || '--')}</b></div>`;
  }

  function ensureStyle() {
    if (document.querySelector('[data-ameripro-style]')) return;
    const style = document.createElement('style');
    style.dataset.ameriproStyle = '1';
    style.textContent = `
      .local-placeholder-layer[data-local-placeholder="ameripro"] .local-placeholder-badge {
        display: none;
      }
      .ameripro-asset {
        cursor: pointer;
      }
      .ameripro-marker-body {
        fill: rgba(6,21,40,0.94);
        stroke: var(--asset-color, #73ff9a);
        stroke-width: 1.4;
        vector-effect: non-scaling-stroke;
        filter: drop-shadow(0 0 4px var(--asset-glow, rgba(115,255,154,0.6)));
      }
      .ameripro-marker-fill {
        fill: var(--asset-color, #73ff9a);
        opacity: 0.32;
      }
      .ameripro-marker-label {
        fill: #ffffff;
        font-family: var(--mono);
        font-size: 8px;
        letter-spacing: 0.09em;
        text-anchor: middle;
        pointer-events: none;
        paint-order: stroke;
        stroke: rgba(0,0,0,0.82);
        stroke-width: 2.2;
      }
      .ameripro-marker-selected .ameripro-marker-body {
        stroke: #ffffff;
        stroke-width: 2.1;
        filter: drop-shadow(0 0 7px rgba(255,255,255,0.82));
      }
      .ameripro-meter {
        display: grid;
        gap: 7px;
        margin: 12px 0 10px;
      }
      .ameripro-meter-track {
        height: 14px;
        border: 1px solid rgba(115,255,154,0.55);
        background: rgba(0,0,0,0.32);
        box-shadow: inset 0 0 8px rgba(0,0,0,0.55);
      }
      .ameripro-meter-fill {
        height: 100%;
        width: var(--level, 0%);
        background: linear-gradient(90deg, #73ff9a, #f5d142, #ff7050);
        transition: width .12s linear;
      }
      .ameripro-meter-labels {
        display: flex;
        justify-content: space-between;
        color: var(--text-dim);
        font-family: var(--mono);
        font-size: 8px;
        letter-spacing: 0.14em;
      }
      .ameripro-slider {
        width: 100%;
        accent-color: #73ff9a;
      }
      .ameripro-fleet-list {
        display: grid;
        gap: 8px;
        margin-top: 10px;
      }
      .ameripro-fleet-item {
        display: grid;
        grid-template-columns: 1fr 54px;
        gap: 8px;
        align-items: center;
        border: 1px solid rgba(26,49,83,0.75);
        background: rgba(3,12,24,0.56);
        color: var(--text);
        cursor: pointer;
        padding: 8px;
        text-align: left;
        font: inherit;
      }
      .ameripro-fleet-item:hover {
        border-color: #73ff9a;
        background: rgba(115,255,154,0.08);
      }
      .ameripro-fleet-meter {
        height: 7px;
        border: 1px solid rgba(115,255,154,0.38);
        background: rgba(0,0,0,0.34);
      }
      .ameripro-fleet-meter span {
        display: block;
        height: 100%;
        width: var(--level, 0%);
        background: var(--asset-color, #73ff9a);
      }
      .ameripro-fleet-name {
        font-family: var(--mono);
        font-size: 9px;
        letter-spacing: 0.12em;
      }
      .ameripro-fleet-kind {
        color: var(--text-dim);
        font-family: var(--mono);
        font-size: 8px;
        letter-spacing: 0.1em;
        margin-top: 3px;
      }
      .feed.ameripro-feed-mode > .feed-head,
      .feed.ameripro-feed-mode > .feed-list {
        display: none;
      }
      .ameripro-tank-board {
        display: grid;
        height: 100%;
        min-height: 0;
        grid-template-rows: auto repeat(4, minmax(0, 1fr));
        border-top: 1px solid rgba(115,255,154,0.18);
      }
      .ameripro-tank-head {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 12px;
        border-bottom: 1px solid rgba(115,255,154,0.22);
        font-family: var(--mono);
        letter-spacing: 0.14em;
        font-size: 9px;
        color: #73ff9a;
      }
      .ameripro-tank-row {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 46px;
        align-content: center;
        gap: 7px 9px;
        padding: 8px 12px;
        border-bottom: 1px solid rgba(26,49,83,0.56);
        background: rgba(3,12,24,0.35);
      }
      .ameripro-tank-row.selected {
        background: rgba(115,255,154,0.08);
        box-shadow: inset 2px 0 0 var(--asset-color, #73ff9a);
      }
      .ameripro-tank-name {
        color: var(--text);
        font-family: var(--mono);
        font-size: 9px;
        letter-spacing: 0.12em;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .ameripro-tank-kind {
        color: var(--text-dim);
        font-family: var(--mono);
        font-size: 7.5px;
        letter-spacing: 0.1em;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .ameripro-tank-level {
        grid-row: span 2;
        align-self: center;
        justify-self: end;
        color: var(--asset-color, #73ff9a);
        font-family: var(--mono);
        font-size: 12px;
        letter-spacing: 0.08em;
      }
      .ameripro-tank-control {
        grid-column: 1 / -1;
        display: grid;
        grid-template-columns: 24px minmax(0, 1fr) 24px;
        gap: 8px;
        align-items: center;
      }
      .ameripro-tank-track {
        height: 8px;
        border: 1px solid rgba(115,255,154,0.25);
        background: rgba(0,0,0,0.28);
      }
      .ameripro-tank-track span {
        display: block;
        height: 100%;
        width: var(--level, 0%);
        background: linear-gradient(90deg, #73ff9a, #f5d142, #ff7050);
        transition: width .12s linear;
      }
      .ameripro-tank-step {
        width: 24px;
        height: 22px;
        border: 1px solid rgba(115,255,154,0.34);
        background: rgba(8,23,42,0.84);
        color: var(--asset-color, #73ff9a);
        cursor: pointer;
        font-family: var(--mono);
        font-size: 14px;
        line-height: 1;
      }
      .ameripro-tank-step:hover,
      .ameripro-tank-step:focus-visible {
        border-color: var(--asset-color, #73ff9a);
        background: rgba(115,255,154,0.12);
        outline: none;
      }
      .ameripro-inspector .insp-note {
        margin-top: 10px;
        color: var(--text-dim);
        font-size: 11px;
        line-height: 1.45;
      }
    `;
    document.head.appendChild(style);
  }

  function projectFactory(svg) {
    const box = (svg.getAttribute('viewBox') || '0 0 900 620').split(/\s+/).map(Number);
    const width = box[2] || 900;
    const height = box[3] || 620;
    const pad = Math.max(16, Math.min(width, height) * 0.04);
    const spanLon = BOUNDS.maxLon - BOUNDS.minLon;
    const spanLat = BOUNDS.maxLat - BOUNDS.minLat;
    const scale = Math.min((width - pad * 2) / spanLon, (height - pad * 2) / spanLat);
    const mapW = spanLon * scale;
    const mapH = spanLat * scale;
    const ox = (width - mapW) / 2;
    const oy = (height - mapH) / 2;
    return ([lon, lat]) => [
      ox + (lon - BOUNDS.minLon) * scale,
      oy + (BOUNDS.maxLat - lat) * scale,
    ];
  }

  function assetIcon(asset, x, y) {
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    const glow = asset.color === '#f5d142' ? 'rgba(245,209,66,0.62)' : asset.color === '#5bd7ff' ? 'rgba(91,215,255,0.62)' : 'rgba(115,255,154,0.62)';
    group.setAttribute('class', `ameripro-asset ${selectedId === asset.id ? 'ameripro-marker-selected' : ''}`);
    group.style.setProperty('--asset-color', asset.color);
    group.style.setProperty('--asset-glow', glow);
    group.dataset.ameriproAsset = asset.id;
    group.dataset.name = asset.label;

    if (asset.fixed) {
      const tank = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      tank.setAttribute('class', 'ameripro-marker-body');
      tank.setAttribute('d', `M${(x - 14).toFixed(2)} ${(y - 8).toFixed(2)}h28a8 8 0 0 1 0 16h-28a8 8 0 0 1 0-16Z`);
      group.appendChild(tank);
    } else {
      const body = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      body.setAttribute('class', 'ameripro-marker-body');
      body.setAttribute('d', `M${(x - 16).toFixed(2)} ${(y - 7).toFixed(2)}h22l8 7v7h-30Z`);
      group.appendChild(body);

      const tank = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      tank.setAttribute('class', 'ameripro-marker-fill');
      tank.setAttribute('x', (x - 13).toFixed(2));
      tank.setAttribute('y', (y - 5).toFixed(2));
      tank.setAttribute('width', '15');
      tank.setAttribute('height', '8');
      group.appendChild(tank);
    }

    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    label.setAttribute('class', 'ameripro-marker-label');
    label.setAttribute('x', x.toFixed(2));
    label.setAttribute('y', (y - 13).toFixed(2));
    label.textContent = asset.shortLabel;
    group.appendChild(label);

    group.addEventListener('click', event => {
      event.stopPropagation();
      selectAsset(asset.id);
    });
    return group;
  }

  function placeholderActive() {
    const marker = document.querySelector('[data-local-placeholder="ameripro"]');
    const localMode = Boolean(document.querySelector('.globe-wrap.local-map-mode'));
    return Boolean(localMode && (active || (marker && marker.style.display !== 'none')));
  }

  function drawAssets() {
    const svg = document.querySelector('[data-local-map-svg]');
    if (!svg) return;
    ensureStyle();
    const viewBox = svg.getAttribute('viewBox') || '';
    const isActive = placeholderActive();
    const exists = Boolean(svg.querySelector('[data-ameripro-assets]'));
    if (viewBox === lastViewBox && exists) {
      svg.querySelectorAll('[data-ameripro-assets]').forEach(node => { node.style.display = isActive ? '' : 'none'; });
      return;
    }

    lastViewBox = viewBox;
    svg.querySelectorAll('[data-ameripro-assets]').forEach(node => node.remove());
    const project = projectFactory(svg);
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.dataset.ameriproAssets = '1';
    group.style.display = isActive ? '' : 'none';

    ASSETS.forEach(asset => {
      const [x, y] = project([asset.lon, asset.lat]);
      group.appendChild(assetIcon(asset, x, y));
    });

    svg.appendChild(group);
  }

  function resetSelectedClass() {
    document.querySelectorAll('.ameripro-marker-selected').forEach(node => node.classList.remove('ameripro-marker-selected'));
    if (selectedId) {
      document.querySelector(`[data-ameripro-asset="${selectedId}"]`)?.classList.add('ameripro-marker-selected');
    }
  }

  function renderOverview() {
    const panel = document.querySelector('.rail-right .inspector');
    if (!panel) return;
    panel.className = 'inspector active ameripro-inspector';
    panel.innerHTML = [
      '<div class="insp-hd"><span>AMERIPRO</span></div>',
      '<div class="insp-body">',
      '<div class="insp-title">AmeriPro Environmental Services</div>',
      '<div class="heat-bar"><div class="heat-fill" style="width:100%;background:#73ff9a"></div></div>',
      row('BASE', 'DUBLIN / EAST DUBLIN'),
      row('SERVICE', 'FOG / GREASE TRAPS / HOODS'),
      row('PHONE', BASE.phone),
      row('FLEET', '3 PUMP TRUCKS / 1 FRAK TANK', '#73ff9a'),
      row('TANK INPUT', 'EVENT PANE +/- CONTROLS', '#f5d142'),
      '</div>',
    ].join('');
  }

  function renderAsset(asset) {
    const panel = document.querySelector('.rail-right .inspector');
    if (!panel || !asset) return;
    const level = levels[asset.id] || 0;
    panel.className = 'inspector active ameripro-inspector';
    panel.innerHTML = [
      '<div class="insp-hd">',
      '<span>TANK LEVEL</span>',
      '<button data-ameripro-close type="button">x</button>',
      '</div>',
      '<div class="insp-body">',
      `<div class="insp-title" style="color:${asset.color}">${escapeHtml(asset.label)}</div>`,
      '<div class="heat-bar"><div class="heat-fill" style="width:100%;background:#73ff9a"></div></div>',
      row('TYPE', asset.kind.toUpperCase()),
      row('TANK', asset.tank.toUpperCase()),
      row('CAPACITY', asset.capacity.toUpperCase()),
      row('LEVEL', `${level}%`, asset.color),
      row('BASE', BASE.address),
      row('SOURCE', asset.fixed ? 'USER INPUT / DUBLIN FRAK TANK' : 'USER INPUT / AMERIPRO FLEET'),
      '<div class="insp-note">Use the tank controls in the Event pane to update levels.</div>',
      '</div>',
    ].join('');

    panel.querySelector('[data-ameripro-close]')?.addEventListener('click', () => {
      selectedId = null;
      resetSelectedClass();
      renderOverview();
    });
  }

  function selectAsset(id) {
    const asset = ASSETS.find(item => item.id === id);
    if (!asset) return;
    window.GlobalDataLocalEventOwner = 'ameripro';
    selectedId = id;
    resetSelectedClass();
    renderAsset(asset);
    renderTankBoard();
  }

  function setLevel(id, level) {
    const asset = ASSETS.find(item => item.id === id);
    if (!asset) return;
    levels[id] = Math.max(0, Math.min(100, Math.round(Number(level) || 0)));
    saveLevels();
    updateTankBoardValues(id);
    if (selectedId === id) renderAsset(asset);
  }

  function stepLevel(id, delta) {
    const current = levels[id] || 0;
    setLevel(id, current + delta);
  }

  function renderTankBoard() {
    const feed = document.querySelector('.rail-right .feed');
    if (!feed || !placeholderActive()) return;
    if (window.GlobalDataLocalEventOwner && window.GlobalDataLocalEventOwner !== 'ameripro') return;
    ensureStyle();
    feed.classList.add('ameripro-feed-mode');
    let board = feed.querySelector('[data-ameripro-tank-board]');
    if (board) {
      ASSETS.forEach(asset => updateTankBoardValues(asset.id));
      updateTankBoardSelection();
      return;
    }
    board = document.createElement('div');
    board.className = 'ameripro-tank-board';
    board.dataset.ameriproTankBoard = '1';
    feed.appendChild(board);
    board.innerHTML = [
      '<div class="ameripro-tank-head">',
      '<span>TANK LEVELS</span>',
      '<span>EMPTY / FULL</span>',
      '</div>',
      ...ASSETS.map(asset => tankRow(asset)),
    ].join('');
    board.querySelectorAll('[data-ameripro-level-step]').forEach(button => {
      button.addEventListener('click', event => {
        event.stopPropagation();
        window.GlobalDataLocalEventOwner = 'ameripro';
        selectedId = event.currentTarget.dataset.ameriproLevelId;
        resetSelectedClass();
        renderAsset(ASSETS.find(asset => asset.id === selectedId));
        stepLevel(selectedId, Number(event.currentTarget.dataset.ameriproLevelStep));
        updateTankBoardSelection();
      });
    });
    board.querySelectorAll('[data-ameripro-tank-row]').forEach(rowNode => {
      rowNode.addEventListener('click', event => {
        if (event.target?.matches?.('button')) return;
        window.GlobalDataLocalEventOwner = 'ameripro';
        selectedId = rowNode.dataset.ameriproTankRow;
        resetSelectedClass();
        renderAsset(ASSETS.find(asset => asset.id === selectedId));
        updateTankBoardSelection();
      });
    });
    updateTankBoardSelection();
  }

  function tankRow(asset) {
    const level = levels[asset.id] || 0;
    const selected = selectedId === asset.id ? ' selected' : '';
    return [
      `<div class="ameripro-tank-row${selected}" data-ameripro-tank-row="${escapeHtml(asset.id)}" style="--asset-color:${asset.color};--level:${level}%">`,
      `<div class="ameripro-tank-name">${escapeHtml(asset.label)}</div>`,
      `<div class="ameripro-tank-level" data-ameripro-level-text="${escapeHtml(asset.id)}">${level}%</div>`,
      `<div class="ameripro-tank-kind">${escapeHtml(asset.kind)} / ${escapeHtml(asset.capacity)}</div>`,
      '<div class="ameripro-tank-control">',
      `<button class="ameripro-tank-step" data-ameripro-level-step="-${LEVEL_STEP}" data-ameripro-level-id="${escapeHtml(asset.id)}" type="button" aria-label="Lower ${escapeHtml(asset.label)} level">-</button>`,
      '<div class="ameripro-tank-track"><span></span></div>',
      `<button class="ameripro-tank-step" data-ameripro-level-step="${LEVEL_STEP}" data-ameripro-level-id="${escapeHtml(asset.id)}" type="button" aria-label="Raise ${escapeHtml(asset.label)} level">+</button>`,
      '</div>',
      '</div>',
    ].join('');
  }

  function updateTankBoardValues(id) {
    const rowNode = document.querySelector(`[data-ameripro-tank-row="${id}"]`);
    const text = document.querySelector(`[data-ameripro-level-text="${id}"]`);
    const level = levels[id] || 0;
    if (rowNode) rowNode.style.setProperty('--level', `${level}%`);
    if (text) text.textContent = `${level}%`;
  }

  function updateTankBoardSelection() {
    document.querySelectorAll('[data-ameripro-tank-row]').forEach(rowNode => {
      rowNode.classList.toggle('selected', rowNode.dataset.ameriproTankRow === selectedId);
    });
  }

  function resetTankBoard() {
    const feed = document.querySelector('.rail-right .feed.ameripro-feed-mode');
    if (!feed) return;
    feed.classList.remove('ameripro-feed-mode');
    feed.querySelector('[data-ameripro-tank-board]')?.remove();
  }

  function setActive(next) {
    active = Boolean(next);
    if (active) window.GlobalDataLocalEventOwner = 'ameripro';
    if (!active && window.GlobalDataLocalEventOwner === 'ameripro') window.GlobalDataLocalEventOwner = '';
    drawAssets();
    if (active) {
      renderOverview();
      renderTankBoard();
    }
    if (!active) {
      selectedId = null;
      resetSelectedClass();
      resetInspectorIfAmeripro();
      resetTankBoard();
    }
  }

  function sync() {
    const next = placeholderActive();
    const rowSub = document.querySelector('[data-local-menu-layer="ameripro"] .layer-sub');
    if (rowSub) rowSub.textContent = '3 TRUCKS / FRAK TANK / LEVELS';
    drawAssets();
    if (next && !document.querySelector('.ameripro-inspector')) renderOverview();
    if (next) renderTankBoard();
    if (!next) {
      resetInspectorIfAmeripro();
      resetTankBoard();
    }
  }

  function resetInspectorIfAmeripro() {
    const panel = document.querySelector('.rail-right .ameripro-inspector');
    if (!panel) return;
    panel.className = 'inspector empty';
    panel.innerHTML = [
      '<div class="insp-hd">INSPECTOR</div>',
      '<div class="insp-empty">SELECT A GLOBE OBJECT<br><span>OR CLICK AN EVENT FEED ITEM</span></div>',
    ].join('');
  }

  window.GlobalDataAmeripro = {
    setActive,
    getActive: () => placeholderActive(),
    selectAsset,
    setLevel,
    getLevels: () => ({ ...levels }),
  };

  setInterval(sync, 300);
})();
