(function () {
  const KEY = 'gd_restaurant_edits_v1';
  const DATA = window.AMERIPRO_RESTAURANTS || { customers: [] };
  const originals = {};
  let decoratedCard = null;

  function loadEdits() {
    try {
      return JSON.parse(localStorage.getItem(KEY) || '{}') || {};
    } catch {
      return {};
    }
  }

  function saveEdits(edits) {
    localStorage.setItem(KEY, JSON.stringify(edits));
  }

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g, char => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[char]));
  }

  function clean(value) {
    return String(value || '').trim();
  }

  function applyStoredEdits() {
    const edits = loadEdits();
    (DATA.customers || []).forEach(customer => {
      if (!customer || !customer.id) return;
      originals[customer.id] = { ...customer };
      if (edits[customer.id]) Object.assign(customer, edits[customer.id], { edited: true });
    });
  }

  function ensureStyle() {
    if (document.querySelector('[data-restaurant-edit-overlay-style]')) return;
    const style = document.createElement('style');
    style.dataset.restaurantEditOverlayStyle = '1';
    style.textContent = `
      .restaurant-feed-board {
        grid-template-rows: auto minmax(0, auto) minmax(120px, 1fr) !important;
        overflow-y: auto !important;
      }
      .restaurant-selected-card { scroll-margin-top: 8px; }
      .restaurant-selected-top {
        display: flex;
        justify-content: space-between;
        align-items: start;
        gap: 8px;
        margin-bottom: 7px;
      }
      .restaurant-selected-top .restaurant-selected-title { margin-bottom: 0; min-width: 0; }
      .restaurant-feed-list { min-height: 120px !important; overflow-y: visible !important; }
      .restaurant-edit-btn,
      .restaurant-edit-action {
        border: 1px solid rgba(115,255,154,0.45);
        background: rgba(0,0,0,0.28);
        color: #73ff9a;
        font: 700 8px/1 var(--mono, monospace);
        letter-spacing: 0.14em;
        padding: 5px 7px;
        cursor: pointer;
        white-space: nowrap;
      }
      .restaurant-edit-btn:hover,
      .restaurant-edit-action:hover { background: rgba(115,255,154,0.16); }
      .restaurant-edit-form { display: grid; gap: 7px; margin-top: 7px; }
      .restaurant-edit-row {
        display: grid;
        grid-template-columns: 74px minmax(0, 1fr);
        gap: 8px;
        align-items: center;
      }
      .restaurant-edit-row span { color: var(--text-dim); font-size: 8px; letter-spacing: 0.12em; }
      .restaurant-edit-row input {
        min-width: 0;
        border: 1px solid rgba(26,49,83,0.95);
        background: rgba(0,7,18,0.82);
        color: #cfe2ff;
        font: 700 10px/1.2 var(--mono, monospace);
        padding: 6px 7px;
      }
      .restaurant-edit-row input:focus { outline: 1px solid rgba(115,255,154,0.75); }
      .restaurant-edit-actions { display: flex; flex-wrap: wrap; gap: 6px; justify-content: flex-end; margin-top: 3px; }
      .restaurant-edit-action.danger { color: #ff9b9b; border-color: rgba(255,155,155,0.5); }
    `;
    document.head.appendChild(style);
  }

  function currentCustomer() {
    const api = window.GlobalDataRestaurants;
    const activeId = document.querySelector('[data-restaurant-row].active')?.dataset.restaurantRow;
    const customers = api?.getCustomers?.() || [];
    return customers.find(item => item.id === activeId) || customers[0] || null;
  }

  function locationText(item) {
    return [item.street, item.city, item.state, item.zip].filter(Boolean).join(', ');
  }

  function qualityLabel(item) {
    return item.locationQuality === 'city-estimated' ? 'City-estimated location' : 'Street-matched location';
  }

  function detailRows(item) {
    if (!item) return '';
    const rows = [
      ['ADDRESS', locationText(item)],
      ['SERVICE', item.serviceFocus || 'Grease trap / exhaust hood service'],
      ['TYPE', item.type || 'Restaurant / food service customer'],
      ['TRAP', item.greaseTrapSizeGal || item.greaseTrapLocation
        ? `${item.greaseTrapSizeGal ? `${item.greaseTrapSizeGal} gal` : 'Size unknown'} / ${item.greaseTrapLocation || 'Location unknown'}`
        : 'Not found in older list'],
      ['SOURCE', item.edited ? `${qualityLabel(item)} / locally edited` : qualityLabel(item)],
    ];
    return rows.map(([label, value]) => `<div class="restaurant-info-row"><span>${label}</span><b>${escapeHtml(value)}</b></div>`).join('');
  }

  function editInput(label, name, value, type = 'text') {
    return [
      '<label class="restaurant-edit-row">',
      `<span>${escapeHtml(label)}</span>`,
      `<input name="${escapeHtml(name)}" type="${escapeHtml(type)}" value="${escapeHtml(value)}" autocomplete="off">`,
      '</label>',
    ].join('');
  }

  function renderForm(card, item) {
    card.querySelectorAll('.restaurant-info-row, [data-restaurant-edit-form]').forEach(node => node.remove());
    const form = document.createElement('form');
    form.className = 'restaurant-edit-form';
    form.dataset.restaurantEditForm = '1';
    form.innerHTML = [
      editInput('NAME', 'name', item.name || ''),
      editInput('ADDRESS', 'street', item.street || ''),
      editInput('CITY', 'city', item.city || ''),
      editInput('STATE', 'state', item.state || ''),
      editInput('ZIP', 'zip', item.zip || ''),
      editInput('SERVICE', 'serviceFocus', item.serviceFocus || 'Grease trap / exhaust hood service'),
      editInput('TYPE', 'type', item.type || 'Restaurant / food service customer'),
      editInput('TRAP GAL', 'greaseTrapSizeGal', item.greaseTrapSizeGal || '', 'number'),
      editInput('TRAP LOC', 'greaseTrapLocation', item.greaseTrapLocation || ''),
      '<div class="restaurant-edit-actions">',
      '<button class="restaurant-edit-action" type="submit">SAVE</button>',
      '<button class="restaurant-edit-action" type="button" data-restaurant-edit-cancel>CANCEL</button>',
      '<button class="restaurant-edit-action danger" type="button" data-restaurant-edit-reset>RESET</button>',
      '</div>',
    ].join('');
    form.addEventListener('submit', event => {
      event.preventDefault();
      saveForm(item, form);
    });
    form.querySelector('[data-restaurant-edit-cancel]')?.addEventListener('click', () => restoreCard(card, item));
    form.querySelector('[data-restaurant-edit-reset]')?.addEventListener('click', () => resetCustomer(item));
    card.appendChild(form);
    card.scrollIntoView({ block: 'start', inline: 'nearest' });
  }

  function refreshRestaurant(item) {
    const board = document.querySelector('[data-restaurant-feed-board]');
    if (board) board.dataset.renderKey = '';
    window.GlobalDataRestaurants?.selectCustomer?.(item.id);
    setTimeout(decorate, 0);
  }

  function saveForm(item, form) {
    const data = new FormData(form);
    const edit = {
      name: clean(data.get('name')),
      street: clean(data.get('street')),
      city: clean(data.get('city')),
      state: clean(data.get('state')),
      zip: clean(data.get('zip')),
      serviceFocus: clean(data.get('serviceFocus')),
      type: clean(data.get('type')),
      greaseTrapLocation: clean(data.get('greaseTrapLocation')),
    };
    const trapSize = clean(data.get('greaseTrapSizeGal'));
    edit.greaseTrapSizeGal = trapSize ? Number(trapSize) : '';
    Object.keys(edit).forEach(key => {
      if (Number.isNaN(edit[key])) delete edit[key];
    });
    if (!edit.name) delete edit.name;
    const edits = loadEdits();
    edits[item.id] = edit;
    saveEdits(edits);
    Object.assign(item, edit, { edited: true });
    const source = (DATA.customers || []).find(customer => customer.id === item.id);
    if (source) Object.assign(source, edit, { edited: true });
    refreshRestaurant(item);
  }

  function resetCustomer(item) {
    const original = originals[item.id];
    if (!original) return;
    const edits = loadEdits();
    delete edits[item.id];
    saveEdits(edits);
    Object.keys(item).forEach(key => { if (!(key in original)) delete item[key]; });
    Object.assign(item, original);
    const source = (DATA.customers || []).find(customer => customer.id === item.id);
    if (source) {
      Object.keys(source).forEach(key => { if (!(key in original)) delete source[key]; });
      Object.assign(source, original);
    }
    refreshRestaurant(item);
  }

  function restoreCard(card, item) {
    card.querySelector('[data-restaurant-edit-form]')?.remove();
    card.querySelectorAll('.restaurant-info-row').forEach(node => node.remove());
    card.insertAdjacentHTML('beforeend', detailRows(item));
  }

  function decorate() {
    ensureStyle();
    const card = document.querySelector('[data-restaurant-feed-board] .restaurant-selected-card');
    const item = currentCustomer();
    if (!card || !item) return;
    if (decoratedCard !== card) decoratedCard = card;
    if (!card.querySelector('.restaurant-selected-top')) {
      const title = card.querySelector('.restaurant-selected-title');
      if (title) {
        const top = document.createElement('div');
        top.className = 'restaurant-selected-top';
        title.parentNode.insertBefore(top, title);
        top.appendChild(title);
      }
    }
    const top = card.querySelector('.restaurant-selected-top');
    if (top && !top.querySelector('[data-restaurant-edit]')) {
      const button = document.createElement('button');
      button.className = 'restaurant-edit-btn';
      button.type = 'button';
      button.dataset.restaurantEdit = '1';
      button.textContent = 'EDIT';
      button.addEventListener('click', () => renderForm(card, item));
      top.appendChild(button);
    }
  }

  applyStoredEdits();
  ensureStyle();
  setInterval(decorate, 500);
})();
