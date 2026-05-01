(function () {
  const localState = {
    counties: true,
    cities: false,
    highways: true,
    water: false,
    powerGrid: false,
    ameripro: false,
    restaurants: false,
    parks: false,
    localNews: false,
  };
  let lastLocalMode = false;
  let savedHeader = null;

  function ensureStyles() {
    if (document.querySelector('[data-local-menu-style]')) return;
    const style = document.createElement('style');
    style.dataset.localMenuStyle = '1';
    style.textContent = `
      .local-menu-panel {
        display: block;
      }
      .local-menu-section {
        padding: 10px 14px;
        border-bottom: 1px solid rgba(26,49,83,0.4);
        font-family: var(--mono);
        font-size: 8.5px;
        letter-spacing: 0.15em;
        color: var(--text-dim);
      }
      .local-menu-note {
        line-height: 1.45;
      }
      .local-placeholder-layer {
        position: absolute;
        inset: 0;
        z-index: 5;
        display: none;
        pointer-events: none;
      }
      .local-placeholder-badge {
        position: absolute;
        right: 22px;
        top: 58px;
        border: 1px solid var(--edge);
        background: rgba(0,0,0,0.34);
        color: var(--text-dim);
        font-family: var(--mono);
        font-size: 9px;
        letter-spacing: 0.16em;
        padding: 6px 8px;
      }
    `;
    document.head.appendChild(style);
  }

  function setToggle(row, active, color) {
    row.classList.toggle('active', active);
    const button = row.querySelector('[data-local-menu-toggle]');
    const knob = row.querySelector('[data-local-menu-knob]');
    if (button) {
      button.style.background = active ? color : 'transparent';
      button.style.borderColor = active ? color : 'var(--edge)';
      button.setAttribute('aria-pressed', String(active));
    }
    if (knob) {
      knob.style.left = active ? '17px' : '1px';
      knob.style.background = active ? '#000' : 'var(--text-dim)';
    }
  }

  function layerRow({ keyName, hotkey, label, sub, color, active, onToggle }) {
    const row = document.createElement('div');
    row.className = `layer-row ${active ? 'active' : ''}`;
    row.dataset.localMenuLayer = keyName;
    row.innerHTML = [
      '<div class="layer-head">',
      `<div class="layer-idx">${hotkey}</div>`,
      '<div style="flex:1;min-width:0">',
      `<div class="layer-label">${label}</div>`,
      `<div class="layer-sub">${sub}</div>`,
      '</div>',
      '<button data-local-menu-toggle aria-pressed="false" style="width:32px;height:16px;border-radius:2px;position:relative;cursor:pointer;background:transparent;border:1px solid var(--edge);padding:0;flex-shrink:0">',
      '<span data-local-menu-knob style="position:absolute;top:1px;left:1px;width:12px;height:12px;background:var(--text-dim);transition:left .15s"></span>',
      '</button>',
      '</div>',
    ].join('');
    row.querySelector('[data-local-menu-toggle]').addEventListener('click', onToggle);
    setToggle(row, active, color);
    return row;
  }

  function ensurePanel(layers) {
    let panel = layers.querySelector('[data-local-menu-panel]');
    if (panel) return panel;
    panel = document.createElement('div');
    panel.className = 'local-menu-panel';
    panel.dataset.localMenuPanel = '1';
    layers.appendChild(panel);
    return panel;
  }

  function setHighwaysVisible(active) {
    localState.highways = active;
    document.querySelectorAll('[data-local-highways]').forEach(group => {
      group.style.display = active ? '' : 'none';
    });
  }

  function setCountiesVisible(active) {
    localState.counties = active;
    document.querySelectorAll('[data-local-counties]').forEach(group => {
      group.style.display = active ? '' : 'none';
    });
    document.querySelectorAll('.local-county, .local-county-label, .local-fallback-point').forEach(node => {
      if (!node.closest('[data-local-counties]')) node.style.display = active ? '' : 'none';
    });
  }

  function setPlaceholderLayer(name, active) {
    localState[name] = active;
    const wrap = document.querySelector('.globe-wrap');
    if (!wrap) return;
    let layer = wrap.querySelector(`[data-local-placeholder="${name}"]`);
    if (!layer) {
      layer = document.createElement('div');
      layer.className = 'local-placeholder-layer';
      layer.dataset.localPlaceholder = name;
      layer.innerHTML = `<div class="local-placeholder-badge">${layerLabel(name)} / READY FOR DATA</div>`;
      wrap.appendChild(layer);
    }
    layer.style.display = active ? 'block' : 'none';
  }

  function layerLabel(name) {
    return String(name)
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, char => char.toUpperCase())
      .toUpperCase();
  }

  function renderPanel(panel) {
    panel.replaceChildren();
    panel.appendChild(layerRow({
      keyName: 'counties',
      hotkey: 'C',
      label: 'COUNTIES',
      sub: 'BOUNDARIES / COUNTY VIEW',
      color: '#73ff9a',
      active: localState.counties,
      onToggle: () => {
        setCountiesVisible(!localState.counties);
        refreshRows();
      },
    }));
    panel.appendChild(layerRow({
      keyName: 'cities',
      hotkey: 'I',
      label: 'CITIES',
      sub: 'READY FOR MUNICIPAL DATA',
      color: '#cfe2ff',
      active: localState.cities,
      onToggle: () => {
        setPlaceholderLayer('cities', !localState.cities);
        refreshRows();
      },
    }));
    panel.appendChild(layerRow({
      keyName: 'highways',
      hotkey: 'H',
      label: 'HIGHWAYS',
      sub: 'INTERSTATES / MAJOR ROUTES',
      color: '#ff3d8d',
      active: localState.highways,
      onToggle: () => {
        setHighwaysVisible(!localState.highways);
        refreshRows();
      },
    }));
    panel.appendChild(layerRow({
      keyName: 'water',
      hotkey: 'W',
      label: 'WATER',
      sub: 'LAKES / RIVERS',
      color: '#5bd7ff',
      active: localState.water,
      onToggle: () => {
        setPlaceholderLayer('water', !localState.water);
        refreshRows();
      },
    }));
    panel.appendChild(layerRow({
      keyName: 'powerGrid',
      hotkey: 'P',
      label: 'POWER GRID',
      sub: 'READY FOR LOCAL INFRASTRUCTURE',
      color: '#f5d142',
      active: localState.powerGrid,
      onToggle: () => {
        const next = !localState.powerGrid;
        setPlaceholderLayer('powerGrid', next);
        window.GlobalDataPowerGrid?.setActive?.(next);
        refreshRows();
      },
    }));
    panel.appendChild(layerRow({
      keyName: 'ameripro',
      hotkey: 'A',
      label: 'AMERIPRO',
      sub: 'FLEET / FOG TANK LEVELS',
      color: '#73ff9a',
      active: localState.ameripro,
      onToggle: () => {
        const next = !localState.ameripro;
        setPlaceholderLayer('ameripro', next);
        window.GlobalDataAmeripro?.setActive?.(next);
        refreshRows();
      },
    }));
    panel.appendChild(layerRow({
      keyName: 'restaurants',
      hotkey: 'R',
      label: 'RESTAURANTS',
      sub: 'CLIENTS / GREASE / HOODS',
      color: '#5bd7ff',
      active: localState.restaurants,
      onToggle: () => {
        setPlaceholderLayer('restaurants', !localState.restaurants);
        refreshRows();
      },
    }));
    panel.appendChild(layerRow({
      keyName: 'parks',
      hotkey: 'K',
      label: 'PARKS',
      sub: 'PUBLIC LAND / RECREATION',
      color: '#7bd6a8',
      active: localState.parks,
      onToggle: () => {
        setPlaceholderLayer('parks', !localState.parks);
        refreshRows();
      },
    }));
    panel.appendChild(layerRow({
      keyName: 'localNews',
      hotkey: 'N',
      label: 'LOCAL NEWS',
      sub: 'REGIONAL INCIDENTS / ALERTS',
      color: '#f58a42',
      active: localState.localNews,
      onToggle: () => {
        setPlaceholderLayer('localNews', !localState.localNews);
        refreshRows();
      },
    }));
    panel.appendChild(layerRow({
      keyName: 'local',
      hotkey: 'L',
      label: 'LOCAL',
      sub: 'RETURN TO GLOBAL GLOBE',
      color: '#73ff9a',
      active: true,
      onToggle: () => window.GlobalDataLocalLayer?.setActive?.(false),
    }));
    const note = document.createElement('div');
    note.className = 'local-menu-section';
    note.innerHTML = '<div class="local-menu-note">SERVICE AREA: SAVANNAH / STATESBORO / DUBLIN / MACON / WARNER ROBINS</div>';
    panel.appendChild(note);
  }

  function refreshRows() {
    document.querySelectorAll('[data-local-menu-layer="counties"]').forEach(row => setToggle(row, localState.counties, '#73ff9a'));
    document.querySelectorAll('[data-local-menu-layer="cities"]').forEach(row => setToggle(row, localState.cities, '#cfe2ff'));
    document.querySelectorAll('[data-local-menu-layer="highways"]').forEach(row => setToggle(row, localState.highways, '#ff3d8d'));
    document.querySelectorAll('[data-local-menu-layer="water"]').forEach(row => setToggle(row, localState.water, '#5bd7ff'));
    document.querySelectorAll('[data-local-menu-layer="powerGrid"]').forEach(row => setToggle(row, localState.powerGrid, '#f5d142'));
    document.querySelectorAll('[data-local-menu-layer="ameripro"]').forEach(row => setToggle(row, localState.ameripro, '#73ff9a'));
    document.querySelectorAll('[data-local-menu-layer="restaurants"]').forEach(row => setToggle(row, localState.restaurants, '#5bd7ff'));
    document.querySelectorAll('[data-local-menu-layer="parks"]').forEach(row => setToggle(row, localState.parks, '#7bd6a8'));
    document.querySelectorAll('[data-local-menu-layer="localNews"]').forEach(row => setToggle(row, localState.localNews, '#f58a42'));
    setCountiesVisible(localState.counties);
    setHighwaysVisible(localState.highways);
  }

  function groupCountyLayer() {
    const svg = document.querySelector('[data-local-map-svg]');
    if (!svg || svg.querySelector('[data-local-counties]')) return;
    const nodes = [...svg.querySelectorAll('.local-county, .local-county-label, .local-fallback-point')];
    if (!nodes.length) return;
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.dataset.localCounties = '1';
    svg.insertBefore(group, svg.firstChild);
    nodes.forEach(node => group.appendChild(node));
  }

  function moveGlobalLocalToTop() {
    const layers = document.querySelector('.layers');
    const row = layers?.querySelector('[data-local-row]');
    if (!layers || !row || document.querySelector('.globe-wrap.local-map-mode')) return;
    const target = layers.children[1] || layers.firstChild;
    if (target && row !== target) layers.insertBefore(row, target);
  }

  function setGlobalMenuHidden(layers, hidden) {
    [...layers.children].forEach(child => {
      if (child.matches('[data-local-menu-panel]')) {
        child.style.display = hidden ? '' : 'none';
      } else {
        child.style.display = hidden ? 'none' : '';
      }
    });
    const footer = document.querySelector('.rail-ft');
    if (footer) footer.style.display = hidden ? 'none' : '';
  }

  function updateHeader(localMode) {
    const title = document.querySelector('.rail-hd span:first-child');
    const count = document.querySelector('.rail-hd-count');
    if (!title || !count) return;
    if (localMode && !lastLocalMode) {
      savedHeader = {
        title: title.textContent || 'DATA LAYERS',
        count: count.textContent || '',
      };
    }
    if (localMode) {
      title.textContent = 'LOCAL LAYERS';
      const activeCount = 1 + Object.values(localState).filter(Boolean).length;
      count.textContent = `${activeCount} ON`;
    } else if (lastLocalMode && savedHeader) {
      title.textContent = savedHeader.title;
      count.textContent = savedHeader.count;
    }
    lastLocalMode = localMode;
  }

  function syncLocalMenu() {
    ensureStyles();
    const layers = document.querySelector('.layers');
    if (!layers) return;
    const localMode = Boolean(document.querySelector('.globe-wrap.local-map-mode'));
    const panel = ensurePanel(layers);
    if (!panel.dataset.rendered) {
      renderPanel(panel);
      panel.dataset.rendered = '1';
    }
    setGlobalMenuHidden(layers, localMode);
    updateHeader(localMode);
    if (localMode) {
      groupCountyLayer();
      refreshRows();
    } else {
      moveGlobalLocalToTop();
    }
  }

  window.GlobalDataLocalMenu = {
    setLayer(name, active) {
      if (name === 'counties') setCountiesVisible(Boolean(active));
      if (name === 'highways') setHighwaysVisible(Boolean(active));
      if (['cities', 'water', 'powerGrid', 'ameripro', 'restaurants', 'parks', 'localNews'].includes(name)) {
        setPlaceholderLayer(name, Boolean(active));
      }
      if (name === 'powerGrid') window.GlobalDataPowerGrid?.setActive?.(Boolean(active));
      if (name === 'ameripro') window.GlobalDataAmeripro?.setActive?.(Boolean(active));
      refreshRows();
    },
    getLayer(name) {
      return Boolean(localState[name]);
    },
  };

  window.addEventListener('keydown', event => {
    if (!document.querySelector('.globe-wrap.local-map-mode')) return;
    if (event.target?.tagName === 'INPUT' || event.target?.tagName === 'TEXTAREA') return;
    if (event.key === 'h' || event.key === 'H') {
      setHighwaysVisible(!localState.highways);
      refreshRows();
    }
    if (event.key === 'c' || event.key === 'C') {
      setCountiesVisible(!localState.counties);
      refreshRows();
    }
    if (event.key === 'p' || event.key === 'P') {
      const next = !localState.powerGrid;
      setPlaceholderLayer('powerGrid', next);
      window.GlobalDataPowerGrid?.setActive?.(next);
      refreshRows();
    }
    if (event.key === 'a' || event.key === 'A') {
      const next = !localState.ameripro;
      setPlaceholderLayer('ameripro', next);
      window.GlobalDataAmeripro?.setActive?.(next);
      refreshRows();
    }
  });

  setInterval(syncLocalMenu, 400);
})();
