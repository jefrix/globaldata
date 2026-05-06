(function () {
  const BOUNDS = { minLon: -85.70, maxLon: -80.75, minLat: 30.30, maxLat: 35.08 };
  const CITY_COUNTIES = {
    'athens': 'Clarke',
    'atlanta': 'Fulton',
    'brunswick': 'Glynn',
    'dublin': 'Laurens',
    'east dublin': 'Laurens',
    'hinesville': 'Liberty',
    'macon': 'Bibb',
    'millen': 'Jenkins',
    'pooler': 'Chatham',
    'savannah': 'Chatham',
    'statesboro': 'Bulloch',
    'swainsboro': 'Emanuel',
    'vidalia': 'Toombs',
    'warner robins': 'Houston',
  };

  let selectedCounty = null;
  let renderKey = '';

  function ensureStyle() {
    if (document.querySelector('[data-county-drilldown-style]')) return;
    const style = document.createElement('style');
    style.dataset.countyDrilldownStyle = '1';
    style.textContent = `
      .local-county.county-drilldown-selected {
        fill: rgba(255,138,66,0.24) !important;
        stroke: #ff8a42 !important;
        stroke-width: 1.45 !important;
        filter: drop-shadow(0 0 6px rgba(255,138,66,0.62));
      }
      .feed.county-drilldown-mode > .feed-head,
      .feed.county-drilldown-mode > .feed-list,
      .feed.county-drilldown-mode > [data-ameripro-tank-board],
      .feed.county-drilldown-mode > [data-restaurant-feed-board],
      .feed.county-drilldown-mode > [data-opportunity-board] {
        display: none;
      }
      .county-drilldown-board {
        height: 100%;
        min-height: 0;
        overflow-y: auto;
        padding: 10px 12px;
        font-family: var(--mono);
        color: var(--text);
      }
      .county-drilldown-head {
        display: flex;
        justify-content: space-between;
        gap: 10px;
        color: #ff8a42;
        font-size: 10px;
        letter-spacing: 0.18em;
        margin-bottom: 8px;
      }
      .county-drilldown-summary {
        border: 1px solid rgba(255,138,66,0.42);
        background: rgba(0,10,22,0.62);
        padding: 8px;
        margin-bottom: 8px;
      }
      .county-drilldown-title {
        color: #ffd1a8;
        font-size: 11px;
        letter-spacing: 0.12em;
        margin-bottom: 7px;
      }
      .county-drilldown-row {
        display: grid;
        grid-template-columns: 92px minmax(0, 1fr);
        gap: 8px;
        font-size: 9px;
        line-height: 1.35;
      }
      .county-drilldown-row span:first-child {
        color: var(--text-dim);
        letter-spacing: 0.12em;
      }
      .county-status-legend {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 5px 8px;
        margin-top: 8px;
        color: var(--text-dim);
        font-size: 7.5px;
        letter-spacing: 0.1em;
      }
      .county-status-legend span::before {
        content: "";
        display: inline-block;
        width: 7px;
        height: 7px;
        margin-right: 5px;
        background: var(--status-color);
        box-shadow: 0 0 5px var(--status-color);
      }
      .county-restaurant-list {
        border-top: 1px solid rgba(26,49,83,0.75);
      }
      .county-restaurant-row {
        width: 100%;
        display: grid;
        grid-template-columns: 8px minmax(0, 1fr) auto;
        gap: 8px;
        align-items: center;
        padding: 7px 0;
        border: 0;
        border-bottom: 1px solid rgba(26,49,83,0.55);
        background: transparent;
        color: var(--text);
        text-align: left;
        font-family: var(--mono);
        cursor: pointer;
      }
      .county-restaurant-row:hover,
      .county-restaurant-row.active {
        color: #ff8a42;
      }
      .county-restaurant-status {
        width: 7px;
        height: 7px;
        background: var(--status-color, #73ff9a);
        box-shadow: 0 0 6px var(--status-color, #73ff9a);
      }
      .county-restaurant-row strong,
      .county-restaurant-row small {
        display: block;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .county-restaurant-row strong {
        font-size: 9px;
        letter-spacing: 0.08em;
      }
      .county-restaurant-row small {
        color: var(--text-dim);
        font-size: 8px;
        letter-spacing: 0.08em;
        margin-top: 2px;
      }
      .county-restaurant-tag {
        color: rgba(207,226,255,0.72);
        font-size: 7px;
        letter-spacing: 0.12em;
      }
      .county-drilldown-empty {
        color: var(--text-dim);
        border: 1px solid rgba(26,49,83,0.75);
        padding: 10px;
        font-size: 9px;
        line-height: 1.45;
        letter-spacing: 0.1em;
      }
    `;
    document.head.appendChild(style);
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

  function customers() {
    return window.GlobalDataRestaurants?.getCustomers?.() || [];
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

  function pointInCounty(path, item) {
    const svg = path?.ownerSVGElement;
    const lat = Number(item.lat);
    const lon = Number(item.lon);
    if (!svg || !Number.isFinite(lat) || !Number.isFinite(lon) || typeof path.isPointInFill !== 'function') return false;
    const [x, y] = projectFactory(svg)([lon, lat]);
    try {
      return path.isPointInFill(new DOMPoint(x, y));
    } catch {
      return false;
    }
  }

  function cityCounty(item) {
    return CITY_COUNTIES[String(item.city || '').trim().toLowerCase()] || '';
  }

  function countyRestaurants(countyName, path) {
    const direct = customers().filter(item => pointInCounty(path, item));
    if (direct.length) return direct;
    return customers().filter(item => cityCounty(item).toLowerCase() === String(countyName || '').toLowerCase());
  }

  function statusFor(item) {
    if (item.serviceDue || item.needsService || item.status === 'due') {
      return { key: 'due', label: 'SERVICE DUE', color: '#ff4f5f' };
    }
    if (item.contacted && !item.customer) {
      return { key: 'contacted', label: 'CONTACTED', color: '#f5d142' };
    }
    if (item.customer === false) {
      return { key: 'open', label: 'OPEN', color: '#8b98a9' };
    }
    return { key: 'client', label: 'CLIENT', color: '#73ff9a' };
  }

  function locationText(item) {
    return [item.street, item.city, item.state, item.zip].filter(Boolean).join(', ');
  }

  function row(label, value, color) {
    const style = color ? ` style="color:${escapeHtml(color)}"` : '';
    return `<div class="county-drilldown-row"><span>${escapeHtml(label)}</span><b${style}>${escapeHtml(value || '--')}</b></div>`;
  }

  function zoomToCounty(path) {
    const svg = path?.ownerSVGElement;
    const stage = svg?.closest('.local-map-stage');
    if (!svg || !stage || typeof path.getBBox !== 'function') return;
    const box = path.getBBox();
    const stageBox = stage.getBoundingClientRect();
    if (!box.width || !box.height || !stageBox.width || !stageBox.height) return;
    const scale = Math.max(1, Math.min(5, Math.min(stageBox.width / (box.width * 1.75), stageBox.height / (box.height * 1.75))));
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    const tx = stageBox.width / 2 - cx * scale;
    const ty = stageBox.height / 2 - cy * scale;
    svg.style.transformOrigin = '0 0';
    svg.style.transform = `translate(${tx.toFixed(1)}px, ${ty.toFixed(1)}px) scale(${scale.toFixed(2)})`;
    const label = document.querySelector('[data-local-zoom-label]');
    if (label) label.textContent = `${scale.toFixed(1)}x`;
    const tick = document.querySelector('[data-local-zoom-tick]');
    if (tick) tick.style.top = `${(1 - ((scale - 1) / 4)) * 100}%`;
  }

  function selectRestaurant(item) {
    if (!item?.id) return;
    window.GlobalDataLocalMenu?.setLayer?.('restaurants', true);
    window.GlobalDataRestaurants?.selectCustomer?.(item.id, { focusPanel: true });
  }

  function renderBoard(countyName, path) {
    const feed = document.querySelector('.rail-right .feed');
    if (!feed) return;
    if (window.GlobalDataLocalEventOwner && window.GlobalDataLocalEventOwner !== 'county') return;
    ensureStyle();
    const list = countyRestaurants(countyName, path).sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
    const key = `${countyName}:${list.map(item => item.id).join('|')}`;
    if (renderKey === key && feed.classList.contains('county-drilldown-mode')) return;
    renderKey = key;
    feed.classList.add('county-drilldown-mode');
    let board = feed.querySelector('[data-county-drilldown-board]');
    if (!board) {
      board = document.createElement('div');
      board.className = 'county-drilldown-board';
      board.dataset.countyDrilldownBoard = '1';
      feed.appendChild(board);
    }
    const dueCount = list.filter(item => statusFor(item).key === 'due').length;
    const exactCount = list.filter(item => item.locationQuality === 'exact').length;
    board.innerHTML = [
      '<div class="county-drilldown-head">',
      '<span>COUNTY RESTAURANTS</span>',
      `<span>${list.length} FOUND</span>`,
      '</div>',
      '<div class="county-drilldown-summary">',
      `<div class="county-drilldown-title">${escapeHtml(String(countyName || 'GEORGIA').toUpperCase())} COUNTY</div>`,
      row('AMERIPRO', `${list.length} clients`, '#73ff9a'),
      row('SERVICE DUE', dueCount ? `${dueCount} flagged` : 'schedule pending', dueCount ? '#ff4f5f' : '#7a94b8'),
      row('LOCATION', `${exactCount} exact / ${Math.max(0, list.length - exactCount)} estimated`),
      row('NEXT IMPORT', 'public restaurants + contact status', '#f5d142'),
      '<div class="county-status-legend">',
      '<span style="--status-color:#8b98a9">OPEN</span>',
      '<span style="--status-color:#f5d142">CONTACTED</span>',
      '<span style="--status-color:#73ff9a">CLIENT</span>',
      '<span style="--status-color:#ff4f5f">DUE</span>',
      '</div>',
      '</div>',
      list.length ? [
        '<div class="county-restaurant-list">',
        list.map(item => {
          const status = statusFor(item);
          return [
            `<button class="county-restaurant-row" data-county-restaurant="${escapeHtml(item.id)}" style="--status-color:${status.color}">`,
            '<span class="county-restaurant-status"></span>',
            '<span>',
            `<strong>${escapeHtml(item.name)}</strong>`,
            `<small>${escapeHtml(locationText(item))}</small>`,
            '</span>',
            `<span class="county-restaurant-tag">${status.label}</span>`,
            '</button>',
          ].join('');
        }).join(''),
        '</div>',
      ].join('') : '<div class="county-drilldown-empty">NO AMERIPRO RESTAURANTS FOUND IN THIS COUNTY YET.<br>PUBLIC RESTAURANT IMPORT WILL FILL OPEN PROSPECTS HERE.</div>',
    ].join('');
    board.querySelectorAll('[data-county-restaurant]').forEach(button => {
      button.addEventListener('click', () => {
        const item = list.find(candidate => candidate.id === button.dataset.countyRestaurant);
        selectRestaurant(item);
      });
    });
  }

  function handleCounty(detail) {
    if (!detail || detail.featureType !== 'county') return;
    const path = [...document.querySelectorAll('.local-county')]
      .find(node => String(node.dataset.countyName || '').toLowerCase() === String(detail.name || '').toLowerCase());
    if (!path) return;
    ensureStyle();
    window.GlobalDataLocalEventOwner = 'county';
    selectedCounty = detail.name;
    document.querySelectorAll('.county-drilldown-selected').forEach(node => node.classList.remove('county-drilldown-selected'));
    path.classList.add('county-drilldown-selected');
    const readout = document.querySelector('[data-local-map-readout]');
    if (readout) readout.textContent = `${String(detail.name || '').toUpperCase()} COUNTY`;
    zoomToCounty(path);
    renderBoard(detail.name, path);
  }

  function sync() {
    if (!document.querySelector('.globe-wrap.local-map-mode')) {
      selectedCounty = null;
      renderKey = '';
      const feed = document.querySelector('.rail-right .feed.county-drilldown-mode');
      feed?.classList.remove('county-drilldown-mode');
      feed?.querySelector('[data-county-drilldown-board]')?.remove();
      return;
    }
    if (!selectedCounty) return;
    if (window.GlobalDataLocalEventOwner && window.GlobalDataLocalEventOwner !== 'county') return;
    const path = [...document.querySelectorAll('.local-county')]
      .find(node => String(node.dataset.countyName || '').toLowerCase() === String(selectedCounty).toLowerCase());
    if (path) renderBoard(selectedCounty, path);
  }

  function clearSelection() {
    if (window.GlobalDataLocalEventOwner === 'county') window.GlobalDataLocalEventOwner = '';
    selectedCounty = null;
    renderKey = '';
    document.querySelectorAll('.county-drilldown-selected').forEach(node => node.classList.remove('county-drilldown-selected'));
    const feed = document.querySelector('.rail-right .feed.county-drilldown-mode');
    feed?.classList.remove('county-drilldown-mode');
    feed?.querySelector('[data-county-drilldown-board]')?.remove();
  }

  window.addEventListener('globaldata:local-select', event => handleCounty(event.detail));
  window.GlobalDataCountyDrilldown = {
    renderCounty: handleCounty,
    getSelectedCounty: () => selectedCounty,
    clearSelection,
  };
  setInterval(sync, 1000);
})();
