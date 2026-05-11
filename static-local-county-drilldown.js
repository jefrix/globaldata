(function () {
  let selectedCounty = null;
  let selectedDetail = null;
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
      .feed.county-drilldown-mode > .feed-list {
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

  function renderBoard(countyName, path, detail = {}) {
    const feed = document.querySelector('.rail-right .feed');
    if (!feed) return;
    if (window.GlobalDataLocalEventOwner && window.GlobalDataLocalEventOwner !== 'county') return;
    ensureStyle();
    const item = detail.localNewsItem || null;
    const key = `${countyName || ''}:${item?.id || ''}`;
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
    board.innerHTML = [
      '<div class="county-drilldown-head">',
      `<span>${item ? 'LOCAL NEWS' : 'COUNTY DETAIL'}</span>`,
      `<span>${item ? escapeHtml(item.topicLabel || 'NEWS') : 'LOCAL VIEW'}</span>`,
      '</div>',
      '<div class="county-drilldown-summary">',
      `<div class="county-drilldown-title">${escapeHtml(String(countyName || 'GEORGIA').toUpperCase())} COUNTY</div>`,
      item ? row('HEADLINE', item.title) : row('MAP MODE', 'COUNTY BOUNDARY'),
      item ? row('SOURCE', `${item.domain || 'source'} / ${item.source || 'news'}`) : row('SOURCE', 'GEORGIA COUNTY MAP'),
      item ? row('DATE', new Date(Number(item.ts) || Date.now()).toLocaleDateString()) : row('USE', 'LOCAL REFERENCE'),
      '</div>',
      `<div class="county-drilldown-empty">${escapeHtml(item ? 'COUNTY HIGHLIGHTED FROM SELECTED LOCAL NEWS ITEM.' : 'LOCAL COUNTY REFERENCE ONLY.')}</div>`,
    ].join('');
  }

  function handleCounty(detail) {
    if (!detail || detail.featureType !== 'county') return;
    const path = [...document.querySelectorAll('.local-county')]
      .find(node => String(node.dataset.countyName || '').toLowerCase() === String(detail.name || '').toLowerCase());
    if (!path) return;
    ensureStyle();
    const owner = detail.owner || (detail.localNewsItem || detail.suppressCountyBoard ? 'localNews' : 'county');
    const shouldRenderBoard = owner === 'county' && !detail.suppressCountyBoard;
    window.GlobalDataLocalEventOwner = owner;
    selectedCounty = detail.name;
    selectedDetail = detail;
    document.querySelectorAll('.county-drilldown-selected').forEach(node => node.classList.remove('county-drilldown-selected'));
    path.classList.add('county-drilldown-selected');
    const readout = document.querySelector('[data-local-map-readout]');
    if (readout) readout.textContent = `${String(detail.name || '').toUpperCase()} COUNTY`;
    zoomToCounty(path);
    if (shouldRenderBoard) {
      renderBoard(detail.name, path, detail);
    } else {
      renderKey = '';
      const feed = document.querySelector('.rail-right .feed.county-drilldown-mode');
      feed?.classList.remove('county-drilldown-mode');
      feed?.querySelector('[data-county-drilldown-board]')?.remove();
    }
  }

  function sync() {
    if (!document.querySelector('.globe-wrap.local-map-mode')) {
      if (window.GlobalDataLocalEventOwner === 'county' || window.GlobalDataLocalEventOwner === 'localNews') window.GlobalDataLocalEventOwner = '';
      selectedCounty = null;
      selectedDetail = null;
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
    if (path) renderBoard(selectedCounty, path, selectedDetail || {});
  }

  function clearSelection() {
    if (window.GlobalDataLocalEventOwner === 'county' || window.GlobalDataLocalEventOwner === 'localNews') window.GlobalDataLocalEventOwner = '';
    selectedCounty = null;
    selectedDetail = null;
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
