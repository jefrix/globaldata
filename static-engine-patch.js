(function () {
  if (window.location.hostname !== 'jefrix.github.io') return;
  if (!window.GlobeEngine || !window.GlobeEngine.create || !window.THREE) return;

  const R = 100;
  const DEG = Math.PI / 180;
  const originalCreate = window.GlobeEngine.create;
  const glowTextures = new Map();

  function latLonToVec3(lat, lon, radius = R) {
    const phi = (90 - lat) * DEG;
    const theta = (lon + 180) * DEG;
    return new THREE.Vector3(
      -(radius * Math.sin(phi) * Math.cos(theta)),
      radius * Math.cos(phi),
      radius * Math.sin(phi) * Math.sin(theta)
    );
  }

  function ringToSegments(points, width, height) {
    const segments = [];
    let segment = [];
    let previousX = null;

    (points || []).forEach(([lat, lon]) => {
      const x = ((Number(lon) + 180) / 360) * width;
      const y = ((90 - Number(lat)) / 180) * height;
      if (previousX !== null && Math.abs(x - previousX) > width * 0.5 && segment.length) {
        segments.push(segment);
        segment = [];
      }
      segment.push([x, y]);
      previousX = x;
    });
    if (segment.length) segments.push(segment);
    return segments.filter(part => part.length > 2);
  }

  function paintRings(ctx, rings, width, height, fill, stroke) {
    ctx.fillStyle = fill;
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1.35;
    (rings || []).forEach(ring => {
      ringToSegments(ring.points || [], width, height).forEach(segment => {
        ctx.beginPath();
        ctx.moveTo(segment[0][0], segment[0][1]);
        segment.slice(1).forEach(([x, y]) => ctx.lineTo(x, y));
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      });
    });
  }

  function makeContrastSurfaceTexture(engine) {
    const width = 2048;
    const height = 1024;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    const ocean = engine.theme.core || '#061528';
    const land = engine.theme.landFill || '#1d4f54';
    const coast = engine.theme.gridStrong || engine.theme.land || '#7bd6a8';

    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, ocean);
    gradient.addColorStop(0.45, '#03111f');
    gradient.addColorStop(1, '#02070d');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    ctx.globalAlpha = 0.28;
    ctx.strokeStyle = '#79d7ff';
    ctx.lineWidth = 0.7;
    for (let lon = -180; lon <= 180; lon += 30) {
      const x = ((lon + 180) / 360) * width;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let lat = -60; lat <= 60; lat += 30) {
      const y = ((90 - lat) / 180) * height;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    ctx.globalAlpha = 0.94;
    paintRings(ctx, engine.mapLandRings, width, height, land, coast);

    ctx.globalAlpha = 0.3;
    ctx.strokeStyle = '#b7fff4';
    ctx.lineWidth = 2.2;
    (engine.mapLandRings || []).forEach(ring => {
      ringToSegments(ring.points || [], width, height).forEach(segment => {
        ctx.beginPath();
        ctx.moveTo(segment[0][0], segment[0][1]);
        segment.slice(1).forEach(([x, y]) => ctx.lineTo(x, y));
        ctx.closePath();
        ctx.stroke();
      });
    });
    ctx.globalAlpha = 1;

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
    return texture;
  }

  function applyContrastSurface(engine) {
    if (!engine?.coreMesh?.material) return;
    const oldMap = engine.coreMesh.material.map;
    engine.coreMesh.material.map = makeContrastSurfaceTexture(engine);
    engine.coreMesh.material.needsUpdate = true;
    oldMap?.dispose?.();
  }

  function makeCyberPath(origin, target) {
    const start = latLonToVec3(Number(origin.lat), Number(origin.lon), 1).normalize();
    const end = latLonToVec3(Number(target.lat), Number(target.lon), 1).normalize();
    const distance = start.angleTo(end);
    const lift = Math.max(10, Math.min(34, distance * 18));
    const points = [];

    for (let i = 0; i <= 56; i++) {
      const t = i / 56;
      const eased = Math.sin(Math.PI * t);
      const v = start.clone().lerp(end, t).normalize();
      points.push(v.multiplyScalar(R + 2.4 + eased * lift));
    }
    return points;
  }

  function colorWithAlpha(color, alpha) {
    const hex = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(color || '');
    if (!hex) return color || '#ff5c2e';
    return `rgba(${parseInt(hex[1], 16)}, ${parseInt(hex[2], 16)}, ${parseInt(hex[3], 16)}, ${alpha})`;
  }

  function glowTexture(color) {
    if (glowTextures.has(color)) return glowTextures.get(color);
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    const glow = ctx.createRadialGradient(32, 32, 1, 32, 32, 30);
    glow.addColorStop(0, '#ffffff');
    glow.addColorStop(0.18, color);
    glow.addColorStop(0.55, colorWithAlpha(color, 0.42));
    glow.addColorStop(1, colorWithAlpha(color, 0));
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, 64, 64);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
    glowTextures.set(color, texture);
    return texture;
  }

  function pointOnPath(points, progress) {
    const scaled = progress * (points.length - 1);
    const index = Math.floor(scaled);
    const next = Math.min(points.length - 1, index + 1);
    return points[index].clone().lerp(points[next], scaled - index);
  }

  function addCyberArc(engine, origin, target, color, opacity) {
    if (!engine.layerGroups?.cyber) return;
    if (!Number.isFinite(Number(origin.lat)) || !Number.isFinite(Number(origin.lon))) return;
    if (!Number.isFinite(Number(target.lat)) || !Number.isFinite(Number(target.lon))) return;

    const points = makeCyberPath(origin, target);
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(points),
      new THREE.LineBasicMaterial({
        color,
        transparent: true,
        opacity: Math.max(0.12, opacity * 0.42),
        depthTest: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    line.renderOrder = 3;
    engine.layerGroups.cyber.add(line);

    const packetCount = 3;
    for (let i = 0; i < packetCount; i++) {
      const material = new THREE.SpriteMaterial({
        map: glowTexture(color),
        color,
        transparent: true,
        opacity: 0.86,
        depthTest: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const sprite = new THREE.Sprite(material);
      sprite.scale.set(3.8, 3.8, 1);
      sprite.renderOrder = 5;
      engine.layerGroups.cyber.add(sprite);
      engine.cyberPackets.push({
        sprite,
        points,
        progress: (i / packetCount) + Math.random() * 0.12,
        speed: 0.18 + Math.random() * 0.1,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  function startCyberPacketAnimation(engine) {
    if (engine.cyberPacketLoopStarted) return;
    engine.cyberPacketLoopStarted = true;
    let last = performance.now();

    const tick = now => {
      const dt = Math.min(0.08, (now - last) / 1000);
      last = now;
      (engine.cyberPackets || []).forEach(packet => {
        packet.progress = (packet.progress + packet.speed * dt) % 1;
        packet.sprite.position.copy(pointOnPath(packet.points, packet.progress));
        const pulse = 1 + Math.sin(now * 0.008 + packet.phase) * 0.22;
        packet.sprite.scale.set(3.8 * pulse, 3.8 * pulse, 1);
        if (packet.sprite.material) packet.sprite.material.opacity = 0.74 + (pulse - 1) * 0.35;
      });
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  window.GlobeEngine.create = function patchedCreate(el, theme) {
    const engine = originalCreate(el, theme);
    const originalUpdateLiveData = engine.updateLiveData?.bind(engine);
    const originalUpdateFlights = engine.updateFlights?.bind(engine);
    const originalClearGroup = engine._clearGroup?.bind(engine);
    const originalAddArc = engine._addArc?.bind(engine);
    const originalMakeSurfaceTexture = engine._makeSurfaceTexture?.bind(engine);

    engine.cyberPackets = [];

    if (originalMakeSurfaceTexture) {
      engine._makeSurfaceTexture = function patchedMakeSurfaceTexture() {
        return makeContrastSurfaceTexture(engine);
      };
      applyContrastSurface(engine);
    }

    if (originalClearGroup) {
      engine._clearGroup = function patchedClearGroup(id) {
        originalClearGroup(id);
        if (id === 'cyber') engine.cyberPackets = [];
      };
    }

    if (originalAddArc) {
      engine._addArc = function patchedAddArc(layer, origin, target, color, opacity = 0.34) {
        if (layer !== 'cyber') return originalAddArc(layer, origin, target, color, opacity);
        return addCyberArc(engine, origin, target, color || '#ff5c2e', opacity);
      };
    }

    startCyberPacketAnimation(engine);

    if (originalUpdateLiveData) {
      engine.updateLiveData = function patchedUpdateLiveData(data) {
        originalUpdateLiveData(data);
        if (!data?.shippingLanes?.length || !engine._addLine || !engine.layerGroups?.logistics) return;
        data.shippingLanes.slice(0, 260).forEach(lane => {
          engine._addLine('logistics', lane.pts || lane, engine.theme.lane || '#7bd6a8', 0.28);
        });
      };
    }

    if (originalUpdateFlights) {
      engine.updateFlights = function patchedUpdateFlights(flights) {
        originalUpdateFlights(flights);
        (engine.flightObjects || []).forEach(flight => {
          if (flight.data?.live || flight.data?.source === 'airplanes.live') {
            flight.velocity = Number(flight.velocity || 0) * 0.096;
          }
        });
      };
    }

    return engine;
  };
})();
