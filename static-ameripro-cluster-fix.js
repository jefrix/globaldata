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
      @media (max-width: 900px), (pointer: coarse) {
        .ameripro-marker-label { font-size: 8px !important; }
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

  function updateLabel(assetNode) {
    const label = assetNode.querySelector('.ameripro-marker-label');
    const center = markerCenter(assetNode);
    if (!label || !center) return;
    label.setAttribute('x', center.x.toFixed(2));
    label.setAttribute('y', (center.y + 0.8).toFixed(2));
  }

  function addClusterRing(group, centers) {
    if (!centers.length || group.querySelector('[data-ameripro-cluster-ring]')) return;
    const cx = centers.reduce((sum, item) => sum + item.x, 0) / centers.length;
    const cy = centers.reduce((sum, item) => sum + item.y, 0) / centers.length;
    const ring = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
    ring.dataset.ameriproClusterRing = '1';
    ring.setAttribute('class', 'ameripro-cluster-ring');
    ring.setAttribute('cx', cx.toFixed(2));
    ring.setAttribute('cy', cy.toFixed(2));
    ring.setAttribute('rx', '55');
    ring.setAttribute('ry', '39');
    group.insertBefore(ring, group.firstChild);

    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    label.dataset.ameriproClusterRing = '1';
    label.setAttribute('class', 'ameripro-cluster-label');
    label.setAttribute('x', cx.toFixed(2));
    label.setAttribute('y', (cy - 44).toFixed(2));
    label.textContent = 'AMERIPRO BASE';
    group.insertBefore(label, group.firstChild.nextSibling);
  }

  function fixCluster() {
    ensureStyle();
    document.querySelectorAll('[data-ameripro-assets]').forEach(group => {
      const centers = [];
      group.querySelectorAll('.ameripro-asset').forEach(assetNode => {
        const id = assetNode.dataset.ameriproAsset;
        const offset = OFFSETS[id] || { x: 0, y: 0 };
        assetNode.setAttribute('transform', `translate(${offset.x} ${offset.y})`);
        updateLabel(assetNode);
        const center = markerCenter(assetNode);
        if (center) centers.push({ x: center.x + offset.x, y: center.y + offset.y });
      });
      group.querySelectorAll('[data-ameripro-cluster-ring]').forEach(node => node.remove());
      addClusterRing(group, centers);
    });
  }

  setInterval(fixCluster, 250);
})();
