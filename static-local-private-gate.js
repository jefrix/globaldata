(function () {
  const PROTECTED = new Set(['ameripro', 'restaurants']);
  const EXPECTED_HASH = '84e85efd4c001b6a897f25124ad5f1c9eeddc09db0bd4efd8904208595802daf';
  const SESSION_KEY = 'gd_local_private_layers_unlocked';
  const HOTKEYS = { a: 'ameripro', r: 'restaurants' };

  function ensureStyles() {
    if (document.querySelector('[data-private-gate-style]')) return;
    const style = document.createElement('style');
    style.dataset.privateGateStyle = '1';
    style.textContent = `
      [data-local-menu-layer="ameripro"] .layer-label::after,
      [data-local-menu-layer="restaurants"] .layer-label::after {
        content: ' LOCK';
        display: inline-block;
        margin-left: 6px;
        padding: 1px 4px;
        border: 1px solid rgba(245,209,66,0.46);
        color: #f5d142;
        font-size: 7px;
        letter-spacing: 0.12em;
        vertical-align: 1px;
      }
      .private-gate-unlocked [data-local-menu-layer="ameripro"] .layer-label::after,
      .private-gate-unlocked [data-local-menu-layer="restaurants"] .layer-label::after {
        content: ' OPEN';
        border-color: rgba(115,255,154,0.48);
        color: #73ff9a;
      }
      .private-gate-toast {
        position: fixed;
        right: 18px;
        bottom: 38px;
        z-index: 9999;
        border: 1px solid rgba(245,209,66,0.52);
        background: rgba(3,12,24,0.94);
        color: #f5d142;
        font-family: var(--mono, monospace);
        font-size: 10px;
        letter-spacing: 0.14em;
        padding: 8px 10px;
        box-shadow: 0 0 18px rgba(0,0,0,0.45);
        pointer-events: none;
      }
    `;
    document.head.appendChild(style);
  }

  function unlocked() {
    return sessionStorage.getItem(SESSION_KEY) === '1';
  }

  function setUnlocked() {
    sessionStorage.setItem(SESSION_KEY, '1');
    document.documentElement.classList.add('private-gate-unlocked');
  }

  function syncClass() {
    document.documentElement.classList.toggle('private-gate-unlocked', unlocked());
  }

  async function sha256Hex(value) {
    const bytes = new TextEncoder().encode(value);
    const hash = await crypto.subtle.digest('SHA-256', bytes);
    return [...new Uint8Array(hash)].map(byte => byte.toString(16).padStart(2, '0')).join('');
  }

  function layerActive(name) {
    return Boolean(window.GlobalDataLocalMenu?.getLayer?.(name));
  }

  function localMode() {
    return Boolean(document.querySelector('.globe-wrap.local-map-mode'));
  }

  function toast(message) {
    const old = document.querySelector('.private-gate-toast');
    old?.remove();
    const node = document.createElement('div');
    node.className = 'private-gate-toast';
    node.textContent = message;
    document.body.appendChild(node);
    setTimeout(() => node.remove(), 2200);
  }

  async function requestUnlock() {
    if (unlocked()) return true;
    const value = window.prompt('Password required for AmeriPro and Restaurant layers');
    if (value == null) return false;
    try {
      if (await sha256Hex(value) === EXPECTED_HASH) {
        setUnlocked();
        toast('LOCAL PRIVATE LAYERS UNLOCKED');
        return true;
      }
    } catch {
      // Keep the layer locked if Web Crypto is unavailable.
    }
    toast('PASSWORD REJECTED');
    return false;
  }

  function replayClick(button) {
    setTimeout(() => button?.click?.(), 0);
  }

  document.addEventListener('click', event => {
    const button = event.target.closest?.('[data-local-menu-toggle]');
    const row = button?.closest?.('[data-local-menu-layer]');
    const name = row?.dataset?.localMenuLayer;
    if (!button || !PROTECTED.has(name)) return;
    if (unlocked() || layerActive(name)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    requestUnlock().then(ok => {
      if (ok) replayClick(button);
    });
  }, true);

  window.addEventListener('keydown', event => {
    if (!localMode()) return;
    if (event.target?.tagName === 'INPUT' || event.target?.tagName === 'TEXTAREA') return;
    const name = HOTKEYS[String(event.key || '').toLowerCase()];
    if (!PROTECTED.has(name)) return;
    if (unlocked() || layerActive(name)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    requestUnlock().then(ok => {
      if (ok) window.GlobalDataLocalMenu?.setLayer?.(name, true);
    });
  }, true);

  ensureStyles();
  syncClass();
  setInterval(syncClass, 1000);
})();
