(function () {
  function setRowActive(row, prefix, active, color) {
    row.classList.toggle('active', active);
    const knob = row.querySelector(`[data-${prefix}-knob]`);
    const button = row.querySelector(`[data-${prefix}-toggle]`);
    const slider = row.querySelector('input[type="range"]');
    if (button) {
      button.style.background = active ? color : 'transparent';
      button.style.borderColor = active ? color : 'var(--edge)';
      button.setAttribute('aria-pressed', String(active));
    }
    if (knob) {
      knob.style.left = active ? '17px' : '1px';
      knob.style.background = active ? '#000' : 'var(--text-dim)';
    }
    if (slider) slider.disabled = !active;
  }

  function setExtraLayer(layer, active) {
    const engine = window.__globalDataEngine;
    if (!engine?.layerGroups?.[layer]) return;
    engine.setLayerVisible?.(layer, active);
    if (layer === 'infrastructure') {
      document.querySelectorAll('[data-infra-row]').forEach(row => setRowActive(row, 'infra', active, '#5bd7ff'));
    }
    if (layer === 'local') {
      document.querySelectorAll('[data-local-row]').forEach(row => setRowActive(row, 'local', active, '#73ff9a'));
    }
  }

  document.addEventListener('click', event => {
    const button = event.target?.closest?.('.rail-btn');
    if (!button) return;
    const label = String(button.textContent || '').toUpperCase();
    if (!/ALL LAYERS|CLEAR ALL/.test(label)) return;

    const next = label.includes('ALL LAYERS');
    setTimeout(() => {
      requestAnimationFrame(() => {
        setExtraLayer('infrastructure', next);
        setExtraLayer('local', next);
      });
    }, 0);
  }, true);
})();
