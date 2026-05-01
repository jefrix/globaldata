(function () {
  const localState = {
    highways: true,
    powerGrid: false,
    restaurants: false,
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

  function setPlaceholderLayer(name, active) {
    localState[name] = active;
    const wrap = document.querySelector('.globe-wrap');
    if (!wrap) return;
    let layer = wrap.querySelector(`[data-local-placeholder="${name}"]`);
    if (!layer) {
      layer = document.createElement('div');
      layer.className = 'local-placeholder-layer';
      layer.dataset.localPlaceholder = name;
      wrap.appendChild(layer);
    }
    layer.style.display = active ? 'block' : 'none';
  }

  function renderPanel(panel) {
    panel.replaceChildren();
    panel.appendChild(layerRow({
      keyName: 'local',
      hotkey: 'L',
      label: 'LOCAL',
      sub: 'GEORGIA / RETURN TO GLOBE',
      color: '#73ff9a',
      active: true,
      onToggle: () => window.GlobalDataLocalLayer?.setActive?.(false),
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
      keyName: 'powerGrid',
      hotkey: 'P',
      label: 'POWER GRID',
      sub: 'READY FOR LOCAL INFRASTRUCTURE',
      color: '#f5d142',
      active: localState.powerGrid,
      onToggle: () => {
        setPlaceholderLayer('powerGrid', !localState.powerGrid);
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
    const note = document.createElement('div');
    note.className = 'local-menu-section';
    note.innerHTML = '<div class="local-menu-note">SERVICE AREA: SAVANNAH / STATESBORO / DUBLIN / MACON / WARNER ROBINS</div>';
    panel.appendChild(note);
  }

  function refreshRows() {
    document.querySelectorAll('[data-local-menu-layer="highways"]').forEach(row => setToggle(row, localState.highways, '#ff3d8d'));
    document.querySelectorAll('[data-local-menu-layer="powerGrid"]').forEach(row => setToggle(row, localState.powerGrid, '#f5d142'));
    document.querySelectorAll('[data-local-menu-layer="restaurants"]').forEach(row => setToggle(row, localState.restaurants, '#5bd7ff'));
    setHighwaysVisible(localState.highways);
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
    if (localMode) refreshRows();
  }

  window.GlobalDataLocalMenu = {
    setLayer(name, active) {
      if (name === 'highways') setHighwaysVisible(Boolean(active));
      if (name === 'powerGrid' || name === 'restaurants') setPlaceholderLayer(name, Boolean(active));
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
    if (event.key === 'p' || event.key === 'P') {
      setPlaceholderLayer('powerGrid', !localState.powerGrid);
      refreshRows();
    }
  });

  setInterval(syncLocalMenu, 400);
})();
