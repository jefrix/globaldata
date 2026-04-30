(function () {
  if (!window.GlobeEngine || !window.GlobeEngine.create || !window.THREE) return;

  const R = 100;
  const DEG = Math.PI / 180;
  const originalCreate = window.GlobeEngine.create;
  const textures = new Map();
  const cyberColors = ['#ff2d55', '#9b5cff', '#d85cff', '#ff3040'];

  function latLonToVec3(lat, lon, radius = R) {
    const phi = (90 - lat) * DEG;
    const theta = (lon + 180) * DEG;
    return new THREE.Vector3(
      -(radius * Math.sin(phi) * Math.cos(theta)),
      radius * Math.cos(phi),
      radius * Math.sin(phi) * Math.sin(theta)
    );
  }

  function colorWithAlpha(color, alpha) {
    const hex = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(color || '');
    if (!hex) return color || '#ff2d55';
    return `rgba(${parseInt(hex[1], 16)}, ${parseInt(hex[2], 16)}, ${parseInt(hex[3], 16)}, ${alpha})`;
  }

  function glowTexture(color) {
    if (textures.has(color)) return textures.get(color);
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    const glow = ctx.createRadialGradient(32, 32, 1, 32, 32, 30);
    glow.addColorStop(0, '#ffffff');
    glow.addColorStop(0.14, color);
    glow.addColorStop(0.48, colorWithAlpha(color, 0.48));
    glow.addColorStop(1, colorWithAlpha(color, 0));
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, 64, 64);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
    textures.set(color, texture);
    return texture;
  }

  function makeCyberPath(origin, target) {
    const start = latLonToVec3(Number(origin.lat), Number(origin.lon), 1).normalize();
    const end = latLonToVec3(Number(target.lat), Number(target.lon), 1).normalize();
    const distance = start.angleTo(end);
    const lift = Math.max(10, Math.min(34, distance * 18));
    const points = [];
    for (let i = 0; i <= 56; i += 1) {
      const t = i / 56;
      const eased = Math.sin(Math.PI * t);
      points.push(start.clone().lerp(end, t).normalize().multiplyScalar(R + 2.4 + eased * lift));
    }
    return points;
  }

  function pointOnPath(points, progress) {
    const scaled = progress * (points.length - 1);
    const index = Math.floor(scaled);
    const next = Math.min(points.length - 1, index + 1);
    return points[index].clone().lerp(points[next], scaled - index);
  }

  function paletteColor(engine, eventColor) {
    const text = String(eventColor || '').toLowerCase();
    if (text.includes('3370') || text.includes('3040')) return '#ff2d55';
    const index = engine.__cyberPaletteIndex = (Number(engine.__cyberPaletteIndex || 0) + 1) % cyberColors.length;
    return cyberColors[index];
  }

  function addCyberArc(engine, origin, target, eventColor, opacity) {
    if (!engine.layerGroups?.cyber) return;
    if (!Number.isFinite(Number(origin.lat)) || !Number.isFinite(Number(origin.lon))) return;
    if (!Number.isFinite(Number(target.lat)) || !Number.isFinite(Number(target.lon))) return;

    const color = paletteColor(engine, eventColor);
    const points = makeCyberPath(origin, target);
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(points),
      new THREE.LineBasicMaterial({
        color,
        transparent: true,
        opacity: Math.max(0.16, (Number(opacity) || 0.34) * 0.48),
        depthTest: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    line.renderOrder = 3;
    line.userData = { layer: 'cyber', kind: 'cyber-trace' };
    engine.layerGroups.cyber.add(line);

    for (let i = 0; i < 3; i += 1) {
      const packetColor = i % 2 ? '#9b5cff' : color;
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
        map: glowTexture(packetColor),
        color: 0xffffff,
        transparent: true,
        opacity: 0.86,
        depthTest: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }));
      sprite.scale.set(3.4, 3.4, 1);
      sprite.renderOrder = 8;
      sprite.position.copy(pointOnPath(points, i / 3) || points[0]);
      sprite.userData = { layer: 'cyber', kind: 'cyber-packet' };
      engine.layerGroups.cyber.add(sprite);
      engine.cyberPackets.push({
        sprite,
        points,
        progress: i / 3 + Math.random() * 0.1,
        speed: 0.16 + Math.random() * 0.1,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  function startCyberLoop(engine) {
    if (engine.__redPurpleCyberLoop) return;
    engine.__redPurpleCyberLoop = true;
    let last = performance.now();
    const tick = now => {
      const dt = Math.min(0.08, (now - last) / 1000);
      last = now;
      (engine.cyberPackets || []).forEach(packet => {
        if (!packet.sprite || !packet.points) return;
        packet.progress = (packet.progress + packet.speed * dt) % 1;
        packet.sprite.position.copy(pointOnPath(packet.points, packet.progress));
        const pulse = 1 + Math.sin(now * 0.009 + packet.phase) * 0.2;
        packet.sprite.scale.set(3.4 * pulse, 3.4 * pulse, 1);
        if (packet.sprite.material) packet.sprite.material.opacity = 0.68 + Math.max(0, pulse - 1) * 0.7;
      });
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  window.GlobeEngine.create = function cyberPaletteCreate(el, theme) {
    const engine = originalCreate(el, theme);
    const originalAddArc = engine._addArc?.bind(engine);
    const originalAddPoint = engine._addPoint?.bind(engine);
    const originalClearGroup = engine._clearGroup?.bind(engine);

    engine.cyberPackets = [];

    engine._clearGroup = function cyberPaletteClearGroup(id) {
      originalClearGroup?.(id);
      if (id === 'cyber') engine.cyberPackets = [];
    };

    engine._addArc = function cyberPaletteAddArc(layer, origin, target, color, opacity = 0.34) {
      if (layer !== 'cyber') return originalAddArc?.(layer, origin, target, color, opacity);
      return addCyberArc(engine, origin, target, color, opacity);
    };

    engine._addPoint = function cyberPaletteAddPoint(layer, lat, lon, color, size, kind, data) {
      if (layer !== 'cyber') return originalAddPoint?.(layer, lat, lon, color, size, kind, data);
      const cyberColor = kind === 'cyber' ? (Number(size) > 0.5 ? '#ff2d55' : '#9b5cff') : color;
      return originalAddPoint?.(layer, lat, lon, cyberColor, Math.min(Number(size) || 0.5, 0.52), kind, data);
    };

    startCyberLoop(engine);
    return engine;
  };
})();
