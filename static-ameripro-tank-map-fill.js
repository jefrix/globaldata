(function () {
  const LEVEL_KEY = 'gd_ameripro_tank_levels';
  const ASSET_SPECS = {
    'large-truck-1': { xOffset: -13, yOffset: -5, width: 15, height: 8, rx: 0 },
    'large-truck-2': { xOffset: -13, yOffset: -5, width: 15, height: 8, rx: 0 },
    'small-truck-1': { xOffset: -13, yOffset: -5, width: 15, height: 8, rx: 0 },
    'frak-tank': { xOffset: -10, yOffset: -4, width: 20, height: 8, rx: 3 },
  };

  function ensureStyle() {
    if (document.querySelector('[data-ameripro-tank-map-fill-style]')) return;
    const style = document.createElement('style');
    style.dataset.ameriproTankMapFillStyle = '1';
    style.textContent = `
      .ameripro-marker-level-empty {
        fill: rgba(0,0,0,0.24);
        stroke: rgba(207,226,255,0.24);
        stroke-width: 0.45;
        vector-effect: non-scaling-stroke;
      }
      .ameripro-marker-level-fill {
        fill: var(--asset-color, #73ff9a);
        opacity: 0.52;
        transition: width .12s linear;
      }
    `;
    document.head.appendChild(style);
  }

  function readLevels() {
    if (window.GlobalDataAmeripro?.getLevels) return window.GlobalDataAmeripro.getLevels();
    try {
      return JSON.parse(localStorage.getItem(LEVEL_KEY) || '{}');
    } catch {
      return {};
    }
  }

  function markerCenter(group) {
    const label = group.querySelector('.ameripro-marker-label');
    if (!label) return null;
    const x = Number(label.getAttribute('x'));
    const y = Number(label.getAttribute('y')) + 13;
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    return { x, y };
  }

  function rect(className, id, center, spec) {
    const node = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    node.setAttribute('class', className);
    node.setAttribute('x', (center.x + spec.xOffset).toFixed(2));
    node.setAttribute('y', (center.y + spec.yOffset).toFixed(2));
    node.setAttribute('width', className.includes('level-fill') ? '0' : String(spec.width));
    node.setAttribute('height', String(spec.height));
    if (spec.rx) node.setAttribute('rx', String(spec.rx));
    if (className.includes('level-fill')) node.dataset.ameriproMarkerFill = id;
    return node;
  }

  function ensureMarkerFill(group) {
    const id = group.dataset.ameriproAsset;
    const spec = ASSET_SPECS[id];
    const center = markerCenter(group);
    if (!spec || !center) return null;

    group.querySelectorAll('.ameripro-marker-fill:not(.ameripro-marker-level-fill)').forEach(node => node.remove());

    let fill = group.querySelector('[data-ameripro-marker-fill]');
    if (!fill) {
      const label = group.querySelector('.ameripro-marker-label');
      const empty = rect('ameripro-marker-level-empty', id, center, spec);
      fill = rect('ameripro-marker-fill ameripro-marker-level-fill', id, center, spec);
      group.insertBefore(empty, label);
      group.insertBefore(fill, label);
    }
    return { fill, spec };
  }

  function syncMarkerFills() {
    ensureStyle();
    const levels = readLevels();
    document.querySelectorAll('[data-ameripro-asset]').forEach(group => {
      const id = group.dataset.ameriproAsset;
      const marker = ensureMarkerFill(group);
      if (!marker) return;
      const level = Math.max(0, Math.min(100, Number(levels[id]) || 0));
      marker.fill.setAttribute('width', (marker.spec.width * level / 100).toFixed(2));
    });
  }

  syncMarkerFills();
  setInterval(syncMarkerFills, 500);
})();
