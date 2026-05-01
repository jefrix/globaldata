(function () {
  const FALLBACK_BOUNDS = { minLon: -85.62, maxLon: -80.84, minLat: 30.36, maxLat: 35.01 };
  const FALLBACK_GEORGIA = [
    [-85.605, 34.99], [-84.32, 34.99], [-83.10, 34.99], [-82.59, 34.81],
    [-82.22, 34.45], [-81.65, 33.82], [-81.19, 33.20], [-81.05, 32.65],
    [-80.84, 32.05], [-81.17, 31.53], [-81.37, 31.16], [-81.50, 30.75],
    [-82.05, 30.36], [-82.55, 30.50], [-82.85, 30.62], [-83.30, 30.63],
    [-84.00, 30.68], [-84.85, 30.72], [-85.00, 31.00], [-85.13, 31.78],
    [-85.08, 32.40], [-85.18, 32.86], [-85.13, 33.12], [-85.60, 34.98],
  ];
  let lastSignature = '';

  function ensureStyle() {
    if (document.querySelector('[data-local-outline-style]')) return;
    const style = document.createElement('style');
    style.dataset.localOutlineStyle = '1';
    style.textContent = `
      .local-state-fill {
        fill: rgba(115,255,154,0.06);
        stroke: none;
        pointer-events: none;
      }
      .local-state-outline {
        fill: none;
        stroke: rgba(207,226,255,0.96);
        stroke-width: 1.65;
        vector-effect: non-scaling-stroke;
        filter: drop-shadow(0 0 4px rgba(91,215,255,0.45));
        pointer-events: none;
      }
    `;
    document.head.appendChild(style);
  }

  function parseSubpaths(d) {
    const tokens = String(d || '').match(/[MLZ]|-?\d+(?:\.\d+)?/gi) || [];
    const paths = [];
    let current = [];
    for (let index = 0; index < tokens.length; index += 1) {
      const token = tokens[index].toUpperCase();
      if (token === 'M') {
        if (current.length > 1) paths.push(current);
        current = [{ x: Number(tokens[index + 1]), y: Number(tokens[index + 2]) }];
        index += 2;
      } else if (token === 'L') {
        current.push({ x: Number(tokens[index + 1]), y: Number(tokens[index + 2]) });
        index += 2;
      } else if (token === 'Z') {
        if (current.length > 1) paths.push(current);
        current = [];
      }
    }
    if (current.length > 1) paths.push(current);
    return paths.map(path => path.filter(point => Number.isFinite(point.x) && Number.isFinite(point.y)));
  }

  function pointKey(point) {
    return `${point.x.toFixed(2)},${point.y.toFixed(2)}`;
  }

  function buildBoundaryD(paths) {
    const edges = new Map();
    paths.forEach(path => {
      for (let index = 0; index < path.length; index += 1) {
        const a = path[index];
        const b = path[(index + 1) % path.length];
        const ak = pointKey(a);
        const bk = pointKey(b);
        if (ak === bk) continue;
        const key = ak < bk ? `${ak}|${bk}` : `${bk}|${ak}`;
        const edge = edges.get(key) || { a, b, count: 0 };
        edge.count += 1;
        edges.set(key, edge);
      }
    });
    return [...edges.values()]
      .filter(edge => edge.count === 1)
      .map(edge => `M${edge.a.x.toFixed(2)} ${edge.a.y.toFixed(2)}L${edge.b.x.toFixed(2)} ${edge.b.y.toFixed(2)}`)
      .join(' ');
  }

  function fallbackPath(svg) {
    const viewBox = svg.getAttribute('viewBox')?.split(/\s+/).map(Number) || [0, 0, 900, 620];
    const width = viewBox[2] || 900;
    const height = viewBox[3] || 620;
    const pad = Math.max(16, Math.min(width, height) * 0.04);
    const spanLon = FALLBACK_BOUNDS.maxLon - FALLBACK_BOUNDS.minLon;
    const spanLat = FALLBACK_BOUNDS.maxLat - FALLBACK_BOUNDS.minLat;
    const scale = Math.min((width - pad * 2) / spanLon, (height - pad * 2) / spanLat);
    const mapW = spanLon * scale;
    const mapH = spanLat * scale;
    const ox = (width - mapW) / 2;
    const oy = (height - mapH) / 2;
    return FALLBACK_GEORGIA.map(([lon, lat], index) => {
      const x = ox + (lon - FALLBACK_BOUNDS.minLon) * scale;
      const y = oy + (FALLBACK_BOUNDS.maxLat - lat) * scale;
      return `${index ? 'L' : 'M'}${x.toFixed(2)} ${y.toFixed(2)}`;
    }).join(' ') + ' Z';
  }

  function ensureOutline() {
    const svg = document.querySelector('[data-local-map-svg]');
    if (!svg) return;
    ensureStyle();
    const countyPaths = [...svg.querySelectorAll('.local-county')];
    const viewBox = svg.getAttribute('viewBox') || '';
    const signature = `${viewBox}:${countyPaths.length}:${countyPaths.map(path => path.getAttribute('d')?.length || 0).join(',')}`;
    if (signature === lastSignature && svg.querySelector('[data-local-state-base]')) return;
    lastSignature = signature;

    svg.querySelectorAll('[data-local-state-base]').forEach(node => node.remove());
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.dataset.localStateBase = '1';

    const fill = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    fill.setAttribute('class', 'local-state-fill');
    fill.setAttribute('d', countyPaths.length ? countyPaths.map(path => path.getAttribute('d') || '').join(' ') : fallbackPath(svg));
    group.appendChild(fill);

    const parsed = countyPaths.flatMap(path => parseSubpaths(path.getAttribute('d')));
    const outline = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    outline.setAttribute('class', 'local-state-outline');
    outline.setAttribute('d', parsed.length ? buildBoundaryD(parsed) : fallbackPath(svg));
    group.appendChild(outline);

    svg.insertBefore(group, svg.firstChild);
  }

  setInterval(ensureOutline, 300);
})();
