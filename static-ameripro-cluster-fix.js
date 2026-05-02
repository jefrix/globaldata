(function () {
  const OFFSETS = {
    'large-truck-1': { x: -30, y: -18 },
    'large-truck-2': { x: 30, y: -18 },
    'small-truck-1': { x: -30, y: 20 },
    'frak-tank': { x: 30, y: 20 },
  };

  function ensureStyle() {
    if (document.querySelector('[data-ameripro-cluster-style]')) return;
    const style = document.createElement('style');
    style.dataset.ameriproClusterStyle = '1';
    style.textContent = `
      .ameripro-asset {
        pointer-events: all;
      }
      .ameripro-marker-label {
        font-size: 7px !important;
        letter-spacing: 0.02em !important;
        dominant-baseline: central;
        stroke-width: 1.45 !important;
      }
      .ameripro-cluster-ring {
        fill: rgba(6,21,40,0.42);
        stroke: rgba(115,255,154,0.42);
        stroke-width: 0.8;
        vector-effect: non-scaling-stroke;
        pointer-events: none;
        filter: drop-shadow(0 0 5px rgba(115,255,154,0.28));
      }
      .ameripro-cluster-label {
        fill: rgba(207,226,255,0.86);
        font-family: var(--mono);
        font-size: 7.5px;
        letter-spacing: 0.12em;
        text-anchor: middle;
        paint-order: stroke;
        stroke: rgba(0,0,0,0.86);
        stroke-width: 2.2;
        pointer-events: none;
      }
      .feed.ameripro-feed-mode {
        min-height: 0;
        overflow: hidden;
      }
      .feed.ameripro-feed-mode .ameripro-tank-board {
        display: flex !important;
        flex-direction: column;
        min-height: 0;
        overflow-y: auto;
        overflow-x: hidden;
        grid-template-rows: none !important;
        scrollbar-width: thin;
      }
      .feed.ameripro-feed-mode .ameripro-tank-head {
        flex: 0 0 auto;
        position: sticky;
        top: 0;
        z-index: 2;
        background: rgba(3,12,24,0.96);
      }
      .feed.ameripro-feed-mode .ameripro-tank-row {
        flex: 0 0 auto;
        min-height: 82px;
        align-content: start;
        padding-top: 9px;
        padding-bottom: 9px;
      }
      .feed.ameripro-feed-mode .ameripro-tank-name,
      .feed.ameripro-feed-mode .ameripro-tank-kind {
        line-height: 1.25;
      }
      .feed.ameripro-feed-mode .ameripro-tank-control {
        margin-top: 3px;
      }
      .feed.ameripro-feed-mode .ameripro-tank-step {
        min-width: 28px;
        min-height: 24px;
      }
      @media (max-width: 900px), (pointer: coarse) {
        .ameripro-marker-label { font-size: 8px !important; }
        .feed.ameripro-feed-mode .ameripro-tank-row { min-height: 92px; }
        .feed.ameripro-feed-mode .ameripro-tank-control { grid-template-columns: 30px minmax(0, 1fr) 30px; }
        .feed.ameripro-feed-mode .ameripro-tank-step { width: 30px; height: 28px; }
      }
    `;
    document.head.appendChild(style);
  }

  function markerCenter(assetNode) {
    const body = assetNode.querySelector('.ameripro-marker-body');
    if (!body || !body.getBBox) return null;
    try {
      const box = body.getBBox();
      return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    } catch {
      return null;
    }
  }

  function updateLabel(assetNode, center) {
    const label = assetNode.querySelector('.ameripro-marker-label');
    if (!label || !center) return;
    const x = center.x.toFixed(2);
    const y = (center.y + 0.8).toFixed(2);
    if (label.getAttribute('x') !== x) label.setAttribute('x', x);
    if (label.getAttribute('y') !== y) label.setAttribute('y', y);
  }

  function upsertClusterRing(group, centers) {
    if (!centers.length) {
      group.querySelectorAll('[data-ameripro-cluster-ring]').forEach(node => node.remove());
      return;
    }

    const cx = centers.reduce((sum, item) => sum + item.x, 0) / centers.length;
    const cy = centers.reduce((sum, item) => sum + item.y, 0) / centers.length;
    const x = cx.toFixed(2);
    const y = cy.toFixed(2);

    let ring = group.querySelector('[data-ameripro-cluster-ring="ring"]');
    if (!ring) {
      ring = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
      ring.dataset.ameriproClusterRing = 'ring';
      ring.setAttribute('class', 'ameripro-cluster-ring');
      ring.setAttribute('rx', '55');
      ring.setAttribute('ry', '39');
      group.insertBefore(ring, group.firstChild);
    }
    if (ring.getAttribute('cx') !== x) ring.setAttribute('cx', x);
    if (ring.getAttribute('cy') !== y) ring.setAttribute('cy', y);

    let label = group.querySelector('[data-ameripro-cluster-ring="label"]');
    if (!label) {
      label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      label.dataset.ameriproClusterRing = 'label';
      label.setAttribute('class', 'ameripro-cluster-label');
      label.textContent = 'AMERIPRO BASE';
      group.insertBefore(label, ring.nextSibling);
    }
    if (label.getAttribute('x') !== x) label.setAttribute('x', x);
    const labelY = (cy - 44).toFixed(2);
    if (label.getAttribute('y') !== labelY) label.setAttribute('y', labelY);
  }

  function fixCluster() {
    ensureStyle();
    document.querySelectorAll('[data-ameripro-assets]').forEach(group => {
      const centers = [];
      const signatureParts = [];

      group.querySelectorAll('.ameripro-asset').forEach(assetNode => {
        const id = assetNode.dataset.ameriproAsset;
        const offset = OFFSETS[id] || { x: 0, y: 0 };
        const center = markerCenter(assetNode);
        signatureParts.push(`${id}:${offset.x}:${offset.y}:${center ? center.x.toFixed(1) : 'x'}:${center ? center.y.toFixed(1) : 'y'}`);
        if (center) centers.push({ x: center.x + offset.x, y: center.y + offset.y, node: assetNode, center });
      });

      const signature = signatureParts.join('|');
      if (group.dataset.ameriproClusterSignature === signature) return;
      group.dataset.ameriproClusterSignature = signature;

      centers.forEach(item => {
        const id = item.node.dataset.ameriproAsset;
        const offset = OFFSETS[id] || { x: 0, y: 0 };
        const transform = `translate(${offset.x} ${offset.y})`;
        if (item.node.getAttribute('transform') !== transform) item.node.setAttribute('transform', transform);
        updateLabel(item.node, item.center);
      });
      upsertClusterRing(group, centers);
    });
  }

  fixCluster();
  setInterval(fixCluster, 900);
})();
