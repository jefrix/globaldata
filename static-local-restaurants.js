(function () {
  const DATA = window.AMERIPRO_RESTAURANTS || { metadata: {}, customers: [] };
  const CUSTOMERS = (DATA.customers || [])
    .filter(item => Number.isFinite(Number(item.lat)) && Number.isFinite(Number(item.lon)))
    .sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
  const BOUNDS = { minLon: -85.70, maxLon: -80.75, minLat: 30.30, maxLat: 35.08 };

  let active = false;
  let selectedId = CUSTOMERS[0]?.id || null;
  let lastViewBox = '';

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g, char => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }[char]));
  }

  function ensureStyle() {
    if (document.querySelector('[data-local-restaurants-style]')) return;
    const style = document.createElement('style');
    style.dataset.localRestaurantsStyle = '1';
    style.textContent = `
      .local-restaurant-marker {
        pointer-events: all;
        cursor: pointer;
      }
      .local-restaurant-dot {
        fill: rgba(91,215,255,0.94);
        stroke: rgba(207,226,255,0.95);
        stroke-width: 0.75;
        vector-effect: non-scaling-stroke;
        filter: drop-shadow(0 0 4px rgba(91,215,255,0.75));
      }
      .local-restaurant-marker.city-estimated .local-restaurant-dot {
        fill: rgba(91,215,255,0.46);
        stroke: rgba(91,215,255,0.72);
      }
      .local-restaurant-plus {
        stroke: rgba(0,8,18,0.92);
        stroke-width: 0.8;
        stroke-linecap: square;
        vector-effect: non-scaling-stroke;
      }
      .local-restaurant-label {
        display: none;
        fill: #cfe2ff;
        font-family: var(--mono);
        font-size: 9px;
        letter-spacing: 0.12em;
        paint-order: stroke;
        stroke: rgba(0,0,0,0.8);
        stroke-width: 3px;
        pointer-events: none;
      }
      .local-restaurant-select {
        display: none;
        fill: none;
        stroke: #73ff9a;
        stroke-width: 1.2;
        vector-effect: non-scaling-stroke;
        filter: drop-shadow(0 0 7px rgba(115,255,154,0.85));
      }
      .local-restaurant-marker:hover .local-restaurant-select,
      .local-restaurant-marker.selected .local-restaurant-select,
      .local-restaurant-marker.selected .local-restaurant-label {
        display: block;
      }
      .local-restaurant-marker.selected .local-restaurant-dot {
        fill: #73ff9a;
        stroke: #f7ffe8;
      }
      .feed.restaurant-feed-mode > .feed-head,
      .feed.restaurant-feed-mode > .feed-list {
        display: none;
      }
      .feed.restaurant-feed-mode > [data-ameripro-tank-board] {
        display: none;
      }
      .restaurant-feed-board {
        display: grid;
        grid-template-rows: auto auto minmax(0, 1fr);
        gap: 8px;
        height: 100%;
        min-height: 0;
        padding: 10px 12px;
        font-family: var(--mono);
        color: var(--text);
      }
      .restaurant-feed-head {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 10px;
        color: #5bd7ff;
        font-size: 10px;
        letter-spacing: 0.18em;
      }
      .restaurant-feed-count {
        color: var(--text-dim);
        font-size: 8px;
      }
      .restaurant-selected-card {
        border: 1px solid rgba(115,255,154,0.45);
        background: rgba(0, 10, 22, 0.62);
        padding: 8px;
        box-shadow: inset 0 0 18px rgba(115,255,154,0.06);
      }
      .restaurant-selected-title {
        color: #73ff9a;
        font-size: 11px;
        letter-spacing: 0.08em;
        line-height: 1.25;
        margin-bottom: 7px;
      }
      .restaurant-info-row {
        display: grid;
        grid-template-columns: 74px minmax(0, 1fr);
        gap: 8px;
        align-items: start;
        font-size: 9px;
        line-height: 1.35;
        color: #cfe2ff;
      }
      .restaurant-info-row span:first-child {
        color: var(--text-dim);
        letter-spacing: 0.12em;
      }
      .restaurant-feed-list {
        min-height: 0;
        overflow-y: auto;
        border-top: 1px solid rgba(26,49,83,0.75);
      }
      .restaurant-feed-row {
        width: 100%;
        display: grid;
        grid-template-columns: minmax(0,1fr) auto;
        gap: 8px;
        padding: 7px 0;
        border: 0;
        border-bottom: 1px solid rgba(26,49,83,0.55);
        background: transparent;
        color: var(--text);
        text-align: left;
        font-family: var(--mono);
        cursor: pointer;
      }
      .restaurant-feed-row:hover,
      .restaurant-feed-row.active {
        color: #73ff9a;
      }
      .restaurant-feed-row strong {
        display: block;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-size: 9px;
        letter-spacing: 0.08em;
        font-weight: 600;
      }
      .restaurant-feed-row small {
        display: block;
        color: var(--text-dim);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-size: 8px;
        letter-spacing: 0.08em;
        margin-top: 2px;
      }
      .restaurant-quality {
        color: rgba(207,226,255,0.72);
        font-size: 7px;
        letter-spacing: 0.12em;
        align-self: center;
      }
    `;
    document.head.appendChild(style);
  }

  function placeholderActive() {
    const marker = document.querySelector('[data-local-placeholder="restaurants"]');
    const localMode = Boolean(document.querySelector('.globe-wrap.local-map-mode'));
    return localMode && Boolean(marker) && marker.style.display !== 'none';
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

  function locationText(item) {
    return [item.street, item.city, item.state, item.zip].filter(Boolean).join(', ');
  }

  function qualityLabel(item) {
    return item.locationQuality === 'city-estimated' ? 'CITY EST.' : 'STREET';
  }

  function selectedCustomer() {
    return CUSTOMERS.find(item => item.id === selectedId) || CUSTOMERS[0] || null;
  }

  function drawRestaurants() {
    const svg = document.querySelector('.globe-wrap.local-map-mode [data-local-map-svg]');
    if (!svg) return;
    ensureStyle();
    const isActive = placeholderActive();
    const viewBox = svg.getAttribute('viewBox') || '';
    const existing = svg.querySelector('[data-local-restaurants]');
    if (existing && lastViewBox === viewBox) {
      existing.style.display = isActive ? '' : 'none';
      existing.querySelectorAll('.local-restaurant-marker').forEach(node => {
        node.classList.toggle('selected', node.dataset.customerId === selectedId);
      });
      return;
    }
    svg.querySelectorAll('[data-local-restaurants]').forEach(node => node.remove());
    lastViewBox = viewBox;
    const project = projectFactory(svg);
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.dataset.localRestaurants = '1';
    group.style.display = isActive ? '' : 'none';
    CUSTOMERS.forEach(item => {
      const [x, y] = project([Number(item.lon), Number(item.lat)]);
      const marker = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      marker.setAttribute('class', `local-restaurant-marker ${item.locationQuality === 'city-estimated' ? 'city-estimated' : ''} ${item.id === selectedId ? 'selected' : ''}`);
      marker.setAttribute('transform', `translate(${x.toFixed(2)} ${y.toFixed(2)})`);
      marker.dataset.customerId = item.id;
      marker.setAttribute('tabindex', '0');
      marker.setAttribute('role', 'button');
      marker.setAttribute('aria-label', item.name || 'Restaurant customer');
      marker.innerHTML = [
        '<rect class="local-restaurant-select" x="-7" y="-7" width="14" height="14"></rect>',
        '<circle class="local-restaurant-dot" r="3.4"></circle>',
        '<path class="local-restaurant-plus" d="M-1.8 0H1.8M0 -1.8V1.8"></path>',
      ].join('');
      const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      label.setAttribute('class', 'local-restaurant-label');
      label.setAttribute('x', '8');
      label.setAttribute('y', '-7');
      label.textContent = String(item.name || '').toUpperCase();
      marker.appendChild(label);
      marker.addEventListener('click', () => selectCustomer(item.id));
      marker.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          selectCustomer(item.id);
        }
      });
      group.appendChild(marker);
    });
    svg.appendChild(group);
  }

  function detailRows(item) {
    if (!item) return '<div class="restaurant-info-row"><span>STATUS</span><b>No customer selected</b></div>';
    const quality = item.locationQuality === 'city-estimated'
      ? 'City-estimated location'
      : 'Street-matched location';
    const rows = [
      ['ADDRESS', locationText(item)],
      ['SERVICE', item.serviceFocus || 'Grease trap / exhaust hood service'],
      ['TYPE', item.type || 'Restaurant / food service customer'],
    ];
    rows.push(['TRAP', item.greaseTrapSizeGal || item.greaseTrapLocation
      ? `${item.greaseTrapSizeGal ? `${item.greaseTrapSizeGal} gal` : 'Size unknown'} / ${item.greaseTrapLocation || 'Location unknown'}`
      : 'Not found in older list']);
    if (item.greaseTrapSizeGal || item.greaseTrapLocation) {
      rows.push(['TRAP SRC', item.greaseTrapMatchedName ? `${item.greaseTrapMatchedName} / older list` : 'Older restaurant list']);
    }
    rows.push(['SOURCE', quality]);
    return rows.map(([label, value]) => `<div class="restaurant-info-row"><span>${label}</span><b>${escapeHtml(value)}</b></div>`).join('');
  }

  function renderBoard() {
    const feed = document.querySelector('.rail-right .feed');
    if (!feed || !placeholderActive()) return;
    ensureStyle();
    feed.classList.add('restaurant-feed-mode');
    let board = feed.querySelector('[data-restaurant-feed-board]');
    if (!board) {
      board = document.createElement('div');
      board.className = 'restaurant-feed-board';
      board.dataset.restaurantFeedBoard = '1';
      feed.appendChild(board);
    }
    const selected = selectedCustomer();
    const meta = DATA.metadata || {};
    const renderKey = `${selected?.id || 'none'}:${CUSTOMERS.length}:${meta.streetMatches || 0}`;
    if (board.dataset.renderKey === renderKey) return;
    board.dataset.renderKey = renderKey;
    board.innerHTML = [
      '<div class="restaurant-feed-head">',
      '<span>RESTAURANT CLIENTS</span>',
      `<span class="restaurant-feed-count">${CUSTOMERS.length} PLOTTED / ${meta.streetMatches || 0} STREET</span>`,
      '</div>',
      '<div class="restaurant-selected-card">',
      `<div class="restaurant-selected-title">${escapeHtml(selected?.name || 'SELECT A RESTAURANT')}</div>`,
      detailRows(selected),
      '</div>',
      '<div class="restaurant-feed-list" data-restaurant-feed-list>',
      CUSTOMERS.map(item => [
        `<button class="restaurant-feed-row ${item.id === selectedId ? 'active' : ''}" data-restaurant-row="${escapeHtml(item.id)}">`,
        '<span>',
        `<strong>${escapeHtml(item.name)}</strong>`,
        `<small>${escapeHtml([item.city, item.state].filter(Boolean).join(', '))}${item.greaseTrapSizeGal ? ` / ${item.greaseTrapSizeGal} gal ${item.greaseTrapLocation || ''}` : ''}</small>`,
        '</span>',
        `<span class="restaurant-quality">${qualityLabel(item)}</span>`,
        '</button>',
      ].join('')).join(''),
      '</div>',
    ].join('');
    board.querySelectorAll('[data-restaurant-row]').forEach(row => {
      row.addEventListener('click', () => selectCustomer(row.dataset.restaurantRow));
    });
    board.querySelector('.restaurant-feed-row.active')?.scrollIntoView({ block: 'nearest' });
  }

  function resetBoard() {
    const feed = document.querySelector('.rail-right .feed.restaurant-feed-mode');
    if (!feed) return;
    feed.classList.remove('restaurant-feed-mode');
    feed.querySelector('[data-restaurant-feed-board]')?.remove();
  }

  function selectCustomer(id) {
    if (id) selectedId = id;
    drawRestaurants();
    renderBoard();
  }

  function setActive(next) {
    active = Boolean(next);
    if (active && !selectedId) selectedId = CUSTOMERS[0]?.id || null;
    drawRestaurants();
    if (active) renderBoard();
    if (!active) resetBoard();
  }

  function sync() {
    const next = placeholderActive();
    const rowSub = document.querySelector('[data-local-menu-layer="restaurants"] .layer-sub');
    if (rowSub) rowSub.textContent = `${CUSTOMERS.length} CLIENT POINTS / GREASE / HOODS`;
    if (next !== active) active = next;
    drawRestaurants();
    if (next) renderBoard();
    if (!next) resetBoard();
  }

  window.GlobalDataRestaurants = {
    setActive,
    getActive: () => placeholderActive(),
    selectCustomer,
    getCustomers: () => CUSTOMERS.slice(),
  };

  setInterval(sync, 450);
})();
