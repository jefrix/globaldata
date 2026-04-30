(function () {
  if (!window.GlobeEngine || !window.GlobeEngine.create || !window.THREE) return;

  const R = 100;
  const DEG = Math.PI / 180;
  const originalCreate = window.GlobeEngine.create;
  const textures = new Map();

  function latLonToVec3(lat, lon, radius = R) {
    const phi = (90 - lat) * DEG;
    const theta = (lon + 180) * DEG;
    return new THREE.Vector3(
      -(radius * Math.sin(phi) * Math.cos(theta)),
      radius * Math.cos(phi),
      radius * Math.sin(phi) * Math.sin(theta)
    );
  }

  function validPoint(point) {
    return Array.isArray(point) && Number.isFinite(Number(point[0])) && Number.isFinite(Number(point[1]));
  }

  function interpolateGreatCircle(a, b, steps = 18, radius = R + 1.55) {
    const start = latLonToVec3(Number(a[0]), Number(a[1]), 1).normalize();
    const end = latLonToVec3(Number(b[0]), Number(b[1]), 1).normalize();
    const angle = start.angleTo(end);
    const count = Math.max(2, Math.ceil((angle / Math.PI) * steps));
    const pts = [];
    for (let i = 0; i <= count; i += 1) {
      const t = i / count;
      pts.push(start.clone().lerp(end, t).normalize().multiplyScalar(radius));
    }
    return pts;
  }

  function pathToVectors(path, radius = R + 1.55) {
    const clean = (path || []).filter(validPoint);
    const vectors = [];
    for (let i = 0; i < clean.length - 1; i += 1) {
      const segment = interpolateGreatCircle(clean[i], clean[i + 1], 24, radius);
      if (vectors.length) segment.shift();
      vectors.push(...segment);
    }
    return vectors;
  }

  function colorForType(type) {
    const key = String(type || '').toLowerCase();
    if (key === 'cloud') return '#5bd7ff';
    if (key === 'exchange') return '#f5d142';
    if (key === 'hq') return '#d85cff';
    if (key === 'landing') return '#9ad4ff';
    if (key === 'event') return '#ff5c2e';
    return '#7bd6a8';
  }

  function textureFor(type, color) {
    const key = `${type}:${color}`;
    if (textures.has(key)) return textures.get(key);

    const canvas = document.createElement('canvas');
    canvas.width = 96;
    canvas.height = 96;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 96, 96);
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 12;

    ctx.globalAlpha = 0.22;
    ctx.beginPath();
    ctx.arc(48, 48, 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.92;
    ctx.lineWidth = 4;
    ctx.strokeRect(23, 23, 50, 50);

    if (type === 'cloud') {
      ctx.beginPath();
      ctx.arc(40, 50, 12, Math.PI, 0);
      ctx.arc(52, 44, 15, Math.PI, 0);
      ctx.arc(61, 52, 10, Math.PI, 0);
      ctx.lineTo(30, 52);
      ctx.stroke();
    } else if (type === 'exchange') {
      ctx.beginPath();
      ctx.moveTo(31, 48);
      ctx.lineTo(65, 48);
      ctx.moveTo(48, 31);
      ctx.lineTo(48, 65);
      ctx.moveTo(36, 36);
      ctx.lineTo(60, 60);
      ctx.moveTo(60, 36);
      ctx.lineTo(36, 60);
      ctx.stroke();
    } else if (type === 'hq') {
      ctx.beginPath();
      ctx.moveTo(48, 29);
      ctx.lineTo(64, 66);
      ctx.lineTo(48, 58);
      ctx.lineTo(32, 66);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(48, 48, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(48, 48, 20, 0, Math.PI * 2);
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    textures.set(key, texture);
    return texture;
  }

  function ensureLayer(engine) {
    if (!engine.layerGroups) engine.layerGroups = {};
    if (!engine.layerGroups.infrastructure) {
      const group = new THREE.Group();
      group.visible = false;
      engine.layerGroups.infrastructure = group;
      engine.root?.add?.(group);
    }
    return engine.layerGroups.infrastructure;
  }

  function pointOnPath(points, progress) {
    if (!points || points.length < 2) return null;
    const scaled = (((progress % 1) + 1) % 1) * (points.length - 1);
    const index = Math.min(points.length - 2, Math.floor(scaled));
    return points[index].clone().lerp(points[index + 1], scaled - index);
  }

  function addCable(engine, cable) {
    const group = ensureLayer(engine);
    const points = pathToVectors(cable.pts || cable.path || [], R + 1.55);
    if (points.length < 2) return;
    const color = cable.color || '#5bd7ff';
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(points),
      new THREE.LineBasicMaterial({
        color,
        transparent: true,
        opacity: 0.46 * (engine.layerOpacity.infrastructure ?? 1),
        depthTest: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    line.renderOrder = 4;
    line.userData = { layer: 'infrastructure', kind: 'infrastructure-cable', data: cable };
    group.add(line);

    const packetCount = Math.min(4, Math.max(1, Math.ceil(points.length / 26)));
    for (let i = 0; i < packetCount; i += 1) {
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
        map: textureFor('landing', color),
        color: 0xffffff,
        transparent: true,
        opacity: 0.82,
        depthTest: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }));
      sprite.scale.set(3.0, 3.0, 1);
      sprite.renderOrder = 9;
      sprite.position.copy(pointOnPath(points, i / packetCount) || points[0]);
      sprite.userData = { layer: 'infrastructure', kind: 'infrastructure-packet', data: cable };
      group.add(sprite);
      engine.infrastructurePackets.push({
        sprite,
        points,
        progress: i / packetCount + Math.random() * 0.05,
        speed: 0.045 + Math.random() * 0.035,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  function addNode(engine, node) {
    if (!Number.isFinite(Number(node.lat)) || !Number.isFinite(Number(node.lon))) return;
    const group = ensureLayer(engine);
    const color = node.color || colorForType(node.type);
    const size = 2.0 + Math.min(3, Number(node.tier || 1)) * 0.75;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: textureFor(node.type, color),
      color: 0xffffff,
      transparent: true,
      opacity: 0.92 * (engine.layerOpacity.infrastructure ?? 1),
      depthTest: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }));
    sprite.position.copy(latLonToVec3(Number(node.lat), Number(node.lon), R + 1.9));
    sprite.scale.set(size, size, 1);
    sprite.renderOrder = 8;
    sprite.userData = {
      layer: 'infrastructure',
      kind: 'port',
      data: {
        id: node.id,
        name: node.name,
        country: node.country || '--',
        state: `${String(node.type || 'node').toUpperCase()}${node.operator ? ` / ${node.operator}` : ''}`,
        lat: Number(node.lat),
        lon: Number(node.lon),
        source: node.source || 'GlobalData infrastructure layer',
      },
    };
    group.add(sprite);
    engine.pickables?.push?.(sprite);
  }

  function newsToInfrastructureEvents(news) {
    const match = /\b(subsea|submarine cable|undersea|fiber|fibre|cloud|datacenter|data center|internet outage|telecom|cloudflare|akamai|aws|azure|google cloud|gcp|ixp|peering)\b/i;
    return (news || [])
      .filter(item => item.category === 'INFRASTRUCTURE' || match.test(`${item.title || ''} ${item.description || ''}`))
      .slice(0, 80)
      .map(item => ({
        ...item,
        category: item.category || 'INFRASTRUCTURE',
        sourceName: item.sourceName || item.source || 'News',
      }));
  }

  function addEvent(engine, event) {
    if (!Number.isFinite(Number(event.lat)) || !Number.isFinite(Number(event.lon))) return;
    const group = ensureLayer(engine);
    const color = /watch|risk|high|outage/i.test(event.severity || event.title || '') ? '#ff5c2e' : '#f5d142';
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: textureFor('event', color),
      color: 0xffffff,
      transparent: true,
      opacity: 0.9,
      depthTest: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }));
    sprite.position.copy(latLonToVec3(Number(event.lat), Number(event.lon), R + 2.05));
    sprite.scale.set(3.3, 3.3, 1);
    sprite.renderOrder = 10;
    sprite.userData = {
      layer: 'infrastructure',
      kind: 'news',
      data: {
        ...event,
        id: event.id || `infra-${event.title}`,
        category: event.category || 'INFRASTRUCTURE',
        sourceName: event.sourceName || event.source || 'Infrastructure',
        source: event.source || event.sourceName || 'Infrastructure',
        city: event.city || event.name || 'Infrastructure',
        country: event.country || '--',
        ts: event.ts || Date.now(),
      },
    };
    group.add(sprite);
    engine.pickables?.push?.(sprite);
  }

  function combinedPayload(data) {
    const fallback = window.GLOBALDATA_INFRASTRUCTURE || {};
    return {
      cables: data?.infrastructureCables?.length ? data.infrastructureCables : fallback.cables || [],
      nodes: data?.infrastructureNodes?.length ? data.infrastructureNodes : fallback.nodes || [],
      events: [
        ...(fallback.events || []),
        ...(data?.infrastructureEvents || []),
        ...newsToInfrastructureEvents(data?.news),
      ],
    };
  }

  function renderInfrastructure(engine, data) {
    ensureLayer(engine);
    engine.infrastructurePackets = [];
    engine._clearGroup?.('infrastructure');
    const payload = combinedPayload(data);
    payload.cables.slice(0, engine.maxTrackedObjects || 5000).forEach(cable => addCable(engine, cable));
    payload.nodes.slice(0, engine.maxTrackedObjects || 5000).forEach(node => addNode(engine, node));
    payload.events.slice(0, 180).forEach(event => addEvent(engine, event));
    window.dispatchEvent(new CustomEvent('globaldata:infrastructure-ready', {
      detail: {
        cables: payload.cables.length,
        nodes: payload.nodes.length,
        events: payload.events.length,
      },
    }));
  }

  function startInfrastructureLoop(engine) {
    if (engine.infrastructureLoopStarted) return;
    engine.infrastructureLoopStarted = true;
    let last = performance.now();
    const tick = now => {
      const dt = Math.min(0.08, (now - last) / 1000);
      last = now;
      (engine.infrastructurePackets || []).forEach(packet => {
        packet.progress = (packet.progress + packet.speed * dt) % 1;
        const point = pointOnPath(packet.points, packet.progress);
        if (point) packet.sprite.position.copy(point);
        const pulse = 1 + Math.sin(now * 0.009 + packet.phase) * 0.18;
        packet.sprite.scale.set(3.0 * pulse, 3.0 * pulse, 1);
        if (packet.sprite.material) packet.sprite.material.opacity = 0.62 + Math.max(0, pulse - 1) * 0.8;
      });
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  function setUiActive(row, active) {
    row.classList.toggle('active', active);
    const knob = row.querySelector('[data-infra-knob]');
    const button = row.querySelector('[data-infra-toggle]');
    const slider = row.querySelector('input[type="range"]');
    if (button) {
      button.style.background = active ? '#5bd7ff' : 'transparent';
      button.style.borderColor = active ? '#5bd7ff' : 'var(--edge)';
      button.setAttribute('aria-pressed', String(active));
    }
    if (knob) {
      knob.style.left = active ? '17px' : '1px';
      knob.style.background = active ? '#000' : 'var(--text-dim)';
    }
    if (slider) slider.disabled = !active;
  }

  function injectUi() {
    const engine = window.__globalDataEngine;
    const layers = document.querySelector('.layers');
    if (!engine || !layers || layers.querySelector('[data-infra-row]')) return;

    const row = document.createElement('div');
    row.className = 'layer-row';
    row.dataset.infraRow = '1';
    row.innerHTML = [
      '<div class="layer-head">',
      '<div class="layer-idx">0</div>',
      '<div style="flex:1;min-width:0">',
      '<div class="layer-label">INFRASTRUCTURE</div>',
      '<div class="layer-sub">CABLES / CLOUD / EXCHANGES</div>',
      '</div>',
      '<button data-infra-toggle aria-pressed="false" style="width:32px;height:16px;border-radius:2px;position:relative;cursor:pointer;background:transparent;border:1px solid var(--edge);padding:0;flex-shrink:0">',
      '<span data-infra-knob style="position:absolute;top:1px;left:1px;width:12px;height:12px;background:var(--text-dim);transition:left .15s"></span>',
      '</button>',
      '</div>',
      '<div class="layer-slider">',
      '<span class="sl-lbl">OPA</span>',
      '<input type="range" min="0" max="100" value="100" class="opSlider" style="--sc:#5bd7ff;opacity:.3" disabled>',
      '<span class="sl-val">100</span>',
      '</div>',
    ].join('');

    const toggle = row.querySelector('[data-infra-toggle]');
    const slider = row.querySelector('input[type="range"]');
    const value = row.querySelector('.sl-val');
    const apply = active => {
      engine.setLayerVisible?.('infrastructure', active);
      setUiActive(row, active);
    };
    toggle.addEventListener('click', () => apply(!engine.layerGroups.infrastructure?.visible));
    slider.addEventListener('input', event => {
      const opacity = Number(event.target.value) / 100;
      value.textContent = String(Math.round(opacity * 100)).padStart(3, '0');
      engine.setLayerOpacity?.('infrastructure', opacity);
    });

    layers.insertBefore(row, layers.children[1] || null);
    setUiActive(row, Boolean(engine.layerGroups.infrastructure?.visible));
  }

  window.addEventListener('keydown', event => {
    if (event.target?.tagName === 'INPUT' || event.target?.tagName === 'TEXTAREA') return;
    if (event.key !== '0') return;
    const engine = window.__globalDataEngine;
    if (!engine?.layerGroups?.infrastructure) return;
    const next = !engine.layerGroups.infrastructure.visible;
    engine.setLayerVisible?.('infrastructure', next);
    document.querySelectorAll('[data-infra-row]').forEach(row => setUiActive(row, next));
  });

  setInterval(injectUi, 1200);
  window.addEventListener('globaldata:infrastructure-ready', injectUi);

  window.GlobeEngine.create = function infrastructureCreate(el, theme) {
    const engine = originalCreate(el, theme);
    window.__globalDataEngine = engine;

    const originalEnsure = engine._ensureLayerGroups?.bind(engine);
    const originalClear = engine._clearGroup?.bind(engine);
    const originalUpdate = engine.updateLiveData?.bind(engine);

    engine.infrastructurePackets = [];
    engine._ensureLayerGroups = function infrastructureEnsure() {
      originalEnsure?.();
      ensureLayer(engine);
    };
    engine._clearGroup = function infrastructureClear(id) {
      originalClear?.(id);
      if (id === 'infrastructure') engine.infrastructurePackets = [];
    };
    engine.updateLiveData = function infrastructureUpdate(data) {
      originalUpdate?.(data);
      renderInfrastructure(engine, data || {});
    };

    engine._ensureLayerGroups();
    startInfrastructureLoop(engine);
    renderInfrastructure(engine, engine.lastLiveData || window.MOCK_DATA || {});
    injectUi();
    return engine;
  };
})();
