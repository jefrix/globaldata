(function () {
  const PROTECTED = new Set(['ameripro', 'restaurants']);
  const EXPECTED_HASH = '84e85efd4c001b6a897f25124ad5f1c9eeddc09db0bd4efd8904208595802daf';
  const SESSION_KEY = 'gd_local_private_layers_unlocked';
  const HOTKEYS = { a: 'ameripro', r: 'restaurants' };
  let pendingUnlock = null;

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
      .private-gate-overlay {
        position: fixed;
        inset: 0;
        z-index: 9998;
        display: grid;
        place-items: center;
        background: rgba(0, 6, 14, 0.64);
        backdrop-filter: blur(4px);
      }
      .private-gate-panel {
        width: min(360px, calc(100vw - 32px));
        border: 1px solid rgba(245,209,66,0.58);
        background: linear-gradient(180deg, rgba(8,23,42,0.98), rgba(3,12,24,0.98));
        box-shadow: 0 18px 60px rgba(0,0,0,0.55), inset 0 0 24px rgba(245,209,66,0.06);
        color: var(--text, #cfe2ff);
        font-family: var(--mono, monospace);
        padding: 14px;
      }
      .private-gate-title {
        color: #f5d142;
        font-size: 11px;
        letter-spacing: 0.18em;
        margin-bottom: 8px;
      }
      .private-gate-copy {
        color: var(--text-dim, #7a94b8);
        font-size: 9px;
        letter-spacing: 0.08em;
        line-height: 1.45;
        margin-bottom: 12px;
      }
      .private-gate-input {
        width: 100%;
        box-sizing: border-box;
        border: 1px solid rgba(115,255,154,0.34);
        background: rgba(0,0,0,0.36);
        color: var(--text, #cfe2ff);
        font: inherit;
        font-size: 16px;
        letter-spacing: 0.06em;
        padding: 9px 10px;
        outline: none;
      }
      .private-gate-input:focus {
        border-color: #73ff9a;
        box-shadow: 0 0 0 1px rgba(115,255,154,0.18);
      }
      .private-gate-actions {
        display: flex;
        gap: 8px;
        justify-content: flex-end;
        margin-top: 12px;
      }
      .private-gate-actions button {
        border: 1px solid rgba(26,49,83,0.95);
        background: rgba(3,12,24,0.86);
        color: var(--text-dim, #7a94b8);
        font: inherit;
        font-size: 9px;
        letter-spacing: 0.14em;
        padding: 8px 10px;
        cursor: pointer;
      }
      .private-gate-actions button[type="submit"] {
        border-color: rgba(115,255,154,0.55);
        color: #73ff9a;
      }
      .private-gate-error {
        min-height: 15px;
        color: #ff7050;
        font-size: 8px;
        letter-spacing: 0.12em;
        margin-top: 7px;
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

  function closeDialog(overlay, resolve, value) {
    overlay.remove();
    pendingUnlock = null;
    resolve(value);
  }

  function showUnlockDialog() {
    if (pendingUnlock) return pendingUnlock;
    pendingUnlock = new Promise(resolve => {
      const overlay = document.createElement('div');
      overlay.className = 'private-gate-overlay';
      overlay.innerHTML = [
        '<form class="private-gate-panel" data-private-gate-form>',
        '<div class="private-gate-title">PRIVATE LOCAL LAYERS</div>',
        '<div class="private-gate-copy">Enter the password to unlock AmeriPro and Restaurant layers for this browser tab.</div>',
        '<input class="private-gate-input" data-private-gate-input type="password" autocomplete="current-password" inputmode="text" aria-label="Private layer password" />',
        '<div class="private-gate-error" data-private-gate-error></div>',
        '<div class="private-gate-actions">',
        '<button type="button" data-private-gate-cancel>CANCEL</button>',
        '<button type="submit">UNLOCK</button>',
        '</div>',
        '</form>',
      ].join('');
      document.body.appendChild(overlay);
      const form = overlay.querySelector('[data-private-gate-form]');
      const input = overlay.querySelector('[data-private-gate-input]');
      const error = overlay.querySelector('[data-private-gate-error]');
      overlay.querySelector('[data-private-gate-cancel]')?.addEventListener('click', () => closeDialog(overlay, resolve, null));
      overlay.addEventListener('click', event => {
        if (event.target === overlay) closeDialog(overlay, resolve, null);
      });
      form.addEventListener('submit', async event => {
        event.preventDefault();
        const value = input.value || '';
        try {
          if (await sha256Hex(value) === EXPECTED_HASH) {
            closeDialog(overlay, resolve, value);
            return;
          }
        } catch {
          error.textContent = 'PASSWORD CHECK UNAVAILABLE IN THIS BROWSER';
          return;
        }
        input.value = '';
        error.textContent = 'PASSWORD REJECTED';
        input.focus();
      });
      setTimeout(() => input?.focus(), 0);
    });
    return pendingUnlock;
  }

  async function requestUnlock() {
    if (unlocked()) return true;
    const value = await showUnlockDialog();
    if (value == null) return false;
    setUnlocked();
    toast('LOCAL PRIVATE LAYERS UNLOCKED');
    return true;
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
