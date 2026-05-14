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

  function powerTypeKey(type) {
    const key = String(type || '').trim().toLowerCase().replace(/[\s_-]+/g, '-');
    if (key.includes('nuclear')) return 'nuclear';
    if (key.includes('hydro')) return 'hydro';
    if (key.includes('solar')) return 'solar';
    if (key.includes('wind')) return 'wind';
    if (key.includes('coal')) return 'coal';
    if (key.includes('gas')) return 'gas';
    if (key.includes('oil')) return 'oil';
    if (key.includes('geo')) return 'geothermal';
    if (key.includes('bio')) return 'biomass';
    if (key.includes('waste')) return 'waste';
    if (key.includes('storage') || key.includes('battery')) return 'storage';
    if (key.includes('cogen') || key.includes('chp')) return 'cogeneration';
    return key || 'other';
  }

  function powerMetaFor(type) {
    const key = powerTypeKey(type);
    const meta = window.GLOBALDATA_POWER_TYPES?.[key] || {};
    return {
      key,
      label: meta.label || key.toUpperCase(),
      tag: meta.tag || key.slice(0, 3).toUpperCase(),
      color: meta.color || '#d9e4ef',
    };
  }

  function activePowerFilters(engine) {
    return engine.infrastructurePowerFilters
      || window.GlobalDataInfrastructureFilters?.powerTypes
      || null;
  }

  function powerPlantVisible(engine, plant) {
    const filters = activePowerFilters(engine);
    if (!filters) return true;
    const key = powerTypeKey(plant.generationType || plant.primaryFuel || plant.primary_fuel || plant.fuel);
    return filters[key] !== false;
  }

  function drawPowerSymbol(ctx, type, color) {
    const meta = powerMetaFor(type);
    ctx.save();
    ctx.translate(48, 48);
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowBlur = 0;
    ctx.lineWidth = 4;

    if (meta.key === 'nuclear') {
      for (let i = 0; i < 3; i += 1) {
        ctx.save();
        ctx.rotate(i * Math.PI * 2 / 3 - Math.PI / 2);
        ctx.beginPath();
        ctx.moveTo(0, -6);
        ctx.arc(0, 0, 25, -1.03, -0.34, false);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.arc(0, 0, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      ctx.beginPath();
      ctx.arc(0, 0, 4, 0, Math.PI * 2);
      ctx.fill();
    } else if (meta.key === 'solar') {
      for (let i = 0; i < 12; i += 1) {
        const a = i * Math.PI / 6;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * 23, Math.sin(a) * 23);
        ctx.lineTo(Math.cos(a) * 31, Math.sin(a) * 31);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(0, 0, 15, 0, Math.PI * 2);
      ctx.stroke();
    } else if (meta.key === 'wind') {
      ctx.beginPath();
      ctx.moveTo(0, 6);
      ctx.lineTo(0, 28);
      ctx.moveTo(-10, 28);
      ctx.lineTo(10, 28);
      ctx.stroke();
      for (let i = 0; i < 3; i += 1) {
        ctx.save();
        ctx.rotate(i * Math.PI * 2 / 3);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, -27);
        ctx.lineTo(5, -12);
        ctx.stroke();
        ctx.restore();
      }
      ctx.beginPath();
      ctx.arc(0, 0, 4, 0, Math.PI * 2);
      ctx.fill();
    } else if (meta.key === 'hydro') {
      ctx.beginPath();
      ctx.moveTo(-24, -18);
      ctx.lineTo(20, -8);
      ctx.lineTo(20, 18);
      ctx.moveTo(-12, -15);
      ctx.lineTo(-12, 16);
      ctx.stroke();
      for (let y = 8; y <= 24; y += 8) {
        ctx.beginPath();
        ctx.moveTo(-26, y);
        ctx.bezierCurveTo(-16, y - 8, -8, y + 8, 2, y);
        ctx.bezierCurveTo(12, y - 8, 18, y + 8, 28, y);
        ctx.stroke();
      }
    } else if (meta.key === 'coal') {
      ctx.strokeRect(-22, -2, 34, 25);
      ctx.beginPath();
      ctx.moveTo(14, 23);
      ctx.lineTo(14, -24);
      ctx.lineTo(27, -24);
      ctx.lineTo(27, 23);
      ctx.moveTo(-22, -2);
      ctx.lineTo(-10, -14);
      ctx.lineTo(2, -2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(-10, 27, 4, 0, Math.PI * 2);
      ctx.arc(4, 27, 5, 0, Math.PI * 2);
      ctx.fill();
    } else if (meta.key === 'gas') {
      ctx.beginPath();
      ctx.moveTo(0, 28);
      ctx.bezierCurveTo(-24, 8, -5, -4, -7, -25);
      ctx.bezierCurveTo(18, -10, 25, 7, 0, 28);
      ctx.fill();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.moveTo(0, 18);
      ctx.bezierCurveTo(-8, 8, 0, 0, 2, -9);
      ctx.bezierCurveTo(12, 4, 11, 10, 0, 18);
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    } else if (meta.key === 'oil') {
      ctx.beginPath();
      ctx.moveTo(0, -29);
      ctx.bezierCurveTo(22, -5, 25, 10, 12, 24);
      ctx.bezierCurveTo(0, 36, -22, 25, -20, 6);
      ctx.bezierCurveTo(-18, -7, -5, -19, 0, -29);
      ctx.fill();
    } else if (meta.key === 'geothermal') {
      for (let x = -15; x <= 15; x += 15) {
        ctx.beginPath();
        ctx.moveTo(x, 25);
        ctx.bezierCurveTo(x - 10, 8, x + 10, 2, x, -16);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(0, 21, 20, Math.PI, 0);
      ctx.stroke();
    } else if (meta.key === 'biomass') {
      ctx.beginPath();
      ctx.ellipse(0, 0, 16, 29, Math.PI / 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-18, 20);
      ctx.lineTo(18, -20);
      ctx.stroke();
    } else if (meta.key === 'waste') {
      for (let i = 0; i < 3; i += 1) {
        ctx.save();
        ctx.rotate(i * Math.PI * 2 / 3);
        ctx.beginPath();
        ctx.moveTo(0, -25);
        ctx.lineTo(8, -10);
        ctx.lineTo(-8, -10);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      ctx.beginPath();
      ctx.arc(0, 0, 18, 0, Math.PI * 2);
      ctx.stroke();
    } else if (meta.key === 'storage') {
      ctx.strokeRect(-25, -14, 44, 28);
      ctx.strokeRect(20, -6, 6, 12);
      ctx.beginPath();
      ctx.moveTo(-12, 0);
      ctx.lineTo(-2, -11);
      ctx.lineTo(-1, -2);
      ctx.lineTo(11, -2);
      ctx.lineTo(1, 11);
      ctx.lineTo(1, 2);
      ctx.lineTo(-12, 2);
      ctx.stroke();
    } else if (meta.key === 'cogeneration') {
      ctx.beginPath();
      ctx.arc(-9, -8, 11, 0, Math.PI * 2);
      ctx.arc(12, 9, 11, 0, Math.PI * 2);
      ctx.moveTo(0, -1);
      ctx.lineTo(4, 2);
      ctx.stroke();
    } else {
      ctx.font = 'bold 22px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(meta.tag, 0, 1);
    }
    ctx.restore();
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
    ctx.shadowBlur = 4;

    ctx.globalAlpha = 0.12;
    ctx.beginPath();
    ctx.arc(48, 48, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.74;
    ctx.lineWidth = 3.5;
    ctx.strokeRect(23, 23, 50, 50);

    if (String(type || '').startsWith('power:')) {
      ctx.globalAlpha = 0.8;
      ctx.strokeRect(20, 20, 56, 56);
      drawPowerSymbol(ctx, String(type).slice(6), color);
    } else if (type === 'cloud') {
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

  function zoomFactor(engine, options) {
    return engine.visualScaleForZoom?.(options) || 1;
  }

  function registerZoomSprite(engine, sprite, baseScale, options = {}) {
    const base = Number(baseScale) || sprite.scale.x || 1;
    sprite.userData = {
      ...(sprite.userData || {}),
      baseScale: base,
    };
    engine.registerZoomAdaptiveObject?.(sprite, {
      baseX: base,
      baseY: base,
      minFactor: options.minFactor ?? 0.42,
      maxFactor: options.maxFactor ?? 1.95,
      farShrink: options.farShrink ?? 0.58,
      closeBoost: options.closeBoost ?? 0.95,
    });
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

  function ensureDataCenterNetworkGroup(engine) {
    if (!engine.layerGroups) engine.layerGroups = {};
    if (!engine.layerGroups.dataCenters) {
      const parent = new THREE.Group();
      parent.visible = false;
      engine.layerGroups.dataCenters = parent;
      engine.root?.add?.(parent);
    }
    const parent = engine.layerGroups.dataCenters;
    if (!engine.dataCenterNetworkGroup || engine.dataCenterNetworkGroup.parent !== parent) {
      const group = new THREE.Group();
      group.userData = { layer: 'dataCenters', kind: 'data-center-network', dataCenterNetwork: true };
      engine.dataCenterNetworkGroup = group;
      parent.add(group);
    }
    return engine.dataCenterNetworkGroup;
  }

  function clearDataCenterNetwork(engine) {
    const group = engine.dataCenterNetworkGroup;
    if (group) {
      engine._disposeObjectResources?.(group);
      group.clear();
    }
    engine.dataCenterPackets = [];
    engine.pickables = (engine.pickables || []).filter(obj => !obj?.userData?.dataCenterNetwork);
    engine.zoomAdaptiveObjects = (engine.zoomAdaptiveObjects || []).filter(obj => !obj?.userData?.dataCenterNetwork);
  }

  function pointOnPath(points, progress) {
    if (!points || points.length < 2) return null;
    const scaled = (((progress % 1) + 1) % 1) * (points.length - 1);
    const index = Math.min(points.length - 2, Math.floor(scaled));
    return points[index].clone().lerp(points[index + 1], scaled - index);
  }

  function addCable(engine, cable) {
    const group = ensureDataCenterNetworkGroup(engine);
    const points = pathToVectors(cable.pts || cable.path || [], R + 1.55);
    if (points.length < 2) return;
    const color = cable.color || '#5bd7ff';
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(points),
      new THREE.LineBasicMaterial({
        color,
        transparent: true,
        opacity: 0.26 * (engine.layerOpacity.dataCenters ?? 1),
        depthTest: true,
        depthWrite: false,
      })
    );
    line.renderOrder = 4;
    line.userData = { layer: 'dataCenters', kind: 'dataCenterCable', data: cable, dataCenterNetwork: true };
    group.add(line);

    const packetCount = Math.min(4, Math.max(1, Math.ceil(points.length / 26)));
    for (let i = 0; i < packetCount; i += 1) {
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
        map: textureFor('landing', color),
        color: 0xffffff,
        transparent: true,
        opacity: 0.42,
        depthTest: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }));
      sprite.scale.set(1.35, 1.35, 1);
      sprite.renderOrder = 9;
      sprite.position.copy(pointOnPath(points, i / packetCount) || points[0]);
      sprite.userData = { layer: 'dataCenters', kind: 'dataCenterPacket', data: cable, baseScale: 1.35, dataCenterNetwork: true };
      group.add(sprite);
      engine.dataCenterPackets.push({
        sprite,
        points,
        progress: i / packetCount + Math.random() * 0.05,
        speed: 0.045 + Math.random() * 0.035,
        phase: Math.random() * Math.PI * 2,
        baseScale: 1.35,
      });
    }
  }

  function addNode(engine, node) {
    if (!Number.isFinite(Number(node.lat)) || !Number.isFinite(Number(node.lon))) return;
    const group = ensureDataCenterNetworkGroup(engine);
    const color = node.color || colorForType(node.type);
    const size = 1.1 + Math.min(3, Number(node.tier || 1)) * 0.42;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: textureFor(node.type, color),
      color: 0xffffff,
      transparent: true,
      opacity: 0.78 * (engine.layerOpacity.dataCenters ?? 1),
      depthTest: true,
      depthWrite: false,
    }));
    sprite.position.copy(latLonToVec3(Number(node.lat), Number(node.lon), R + 1.9));
    sprite.scale.set(size, size, 1);
    sprite.renderOrder = 8;
    sprite.userData = {
      layer: 'dataCenters',
      kind: 'infrastructure',
      dataCenterNetwork: true,
      data: {
        id: node.id,
        name: node.name,
        type: node.type,
        tier: node.tier,
        city: node.city || node.name,
        country: node.country || '--',
        operator: node.operator || '--',
        status: `${String(node.type || 'node').toUpperCase()}${node.operator ? ` / ${node.operator}` : ''}`,
        lat: Number(node.lat),
        lon: Number(node.lon),
        source: node.source || 'GlobalData data center network layer',
      },
    };
    group.add(sprite);
    registerZoomSprite(engine, sprite, size, { minFactor: 0.45, maxFactor: 1.9, farShrink: 0.5, closeBoost: 0.82 });
    engine.pickables?.push?.(sprite);
  }

  function capacityToSize(capacityMw) {
    const mw = Number(capacityMw);
    if (!Number.isFinite(mw) || mw <= 0) return 1.55;
    return Math.max(1.35, Math.min(3.85, 0.75 + Math.log10(mw + 10) * 0.78));
  }

  function addPowerPlant(engine, plant) {
    if (!Number.isFinite(Number(plant.lat)) || !Number.isFinite(Number(plant.lon))) return;
    if (!powerPlantVisible(engine, plant)) return;
    const group = ensureLayer(engine);
    const meta = powerMetaFor(plant.generationType || plant.primaryFuel || plant.primary_fuel || plant.fuel);
    const color = plant.color || meta.color;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: textureFor(`power:${meta.key}`, color),
      color: 0xffffff,
      transparent: true,
      opacity: 0.82 * (engine.layerOpacity.infrastructure ?? 1),
      depthTest: true,
      depthWrite: false,
    }));
    const size = capacityToSize(plant.capacityMw || plant.capacity_mw);
    sprite.position.copy(latLonToVec3(Number(plant.lat), Number(plant.lon), R + 2.25));
    sprite.scale.set(size, size, 1);
    sprite.renderOrder = 10;
    sprite.userData = {
      layer: 'infrastructure',
      kind: 'powerPlant',
      data: {
        ...plant,
        generationType: meta.key,
        generationLabel: meta.label,
        color,
        lat: Number(plant.lat),
        lon: Number(plant.lon),
        capacityMw: Number(plant.capacityMw || plant.capacity_mw),
        sourceName: plant.sourceName || plant.source || 'Public power plant dataset',
        source: plant.source || plant.sourceName || 'Public power plant dataset',
      },
    };
    group.add(sprite);
    registerZoomSprite(engine, sprite, size, { minFactor: 0.38, maxFactor: 2.05, farShrink: 0.62, closeBoost: 1.05 });
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
    const group = ensureDataCenterNetworkGroup(engine);
    const color = /watch|risk|high|outage/i.test(event.severity || event.title || '') ? '#ff5c2e' : '#f5d142';
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: textureFor('event', color),
      color: 0xffffff,
      transparent: true,
      opacity: 0.76 * (engine.layerOpacity.dataCenters ?? 1),
      depthTest: true,
      depthWrite: false,
    }));
    sprite.position.copy(latLonToVec3(Number(event.lat), Number(event.lon), R + 2.05));
    sprite.scale.set(1.85, 1.85, 1);
    sprite.renderOrder = 10;
    sprite.userData = {
      layer: 'dataCenters',
      kind: 'news',
      dataCenterNetwork: true,
      data: {
        ...event,
        id: event.id || `network-${event.title}`,
        category: event.category || 'DATA CENTER NETWORK',
        sourceName: event.sourceName || event.source || 'Data center network',
        source: event.source || event.sourceName || 'Data center network',
        city: event.city || event.name || 'Data network',
        country: event.country || '--',
        ts: event.ts || Date.now(),
      },
    };
    group.add(sprite);
    registerZoomSprite(engine, sprite, 1.85, { minFactor: 0.45, maxFactor: 1.85, farShrink: 0.5, closeBoost: 0.75 });
    engine.pickables?.push?.(sprite);
  }

  function combinedPayload(data) {
    const fallback = window.GLOBALDATA_INFRASTRUCTURE || {};
    return {
      cables: data?.infrastructureCables?.length ? data.infrastructureCables : fallback.cables || [],
      nodes: data?.infrastructureNodes?.length ? data.infrastructureNodes : fallback.nodes || [],
      powerPlants: data?.powerPlants?.length ? data.powerPlants
        : data?.infrastructurePowerPlants?.length ? data.infrastructurePowerPlants
          : fallback.powerPlants || [],
      events: [
        ...(fallback.events || []),
        ...(data?.infrastructureEvents || []),
        ...newsToInfrastructureEvents(data?.news),
      ],
    };
  }

  function renderInfrastructure(engine, data) {
    ensureLayer(engine);
    ensureDataCenterNetworkGroup(engine);
    engine.infrastructurePackets = [];
    clearDataCenterNetwork(engine);
    engine._clearGroup?.('infrastructure');
    const payload = combinedPayload(data);
    const infrastructureLimit = Math.max(engine.maxTrackedObjects || 0, 1400);
    payload.cables.slice(0, engine.maxTrackedObjects || 5000).forEach(cable => addCable(engine, cable));
    payload.nodes.slice(0, engine.maxTrackedObjects || 5000).forEach(node => addNode(engine, node));
    payload.powerPlants.slice(0, infrastructureLimit).forEach(plant => addPowerPlant(engine, plant));
    payload.events.slice(0, 180).forEach(event => addEvent(engine, event));
    window.dispatchEvent(new CustomEvent('globaldata:infrastructure-ready', {
      detail: {
        cables: payload.cables.length,
        nodes: payload.nodes.length,
        powerPlants: payload.powerPlants.length,
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
      const animatePackets = packet => {
        packet.progress = (packet.progress + packet.speed * dt) % 1;
        const point = pointOnPath(packet.points, packet.progress);
        if (point) packet.sprite.position.copy(point);
        const pulse = 1 + Math.sin(now * 0.009 + packet.phase) * 0.18;
        const base = packet.baseScale || packet.sprite.userData?.baseScale || 1.35;
        const scale = base * pulse * zoomFactor(engine, { minFactor: 0.52, maxFactor: 1.8, farShrink: 0.42, closeBoost: 0.7 });
        packet.sprite.scale.set(scale, scale, 1);
        if (packet.sprite.material) {
          const layer = packet.sprite.userData?.layer || 'infrastructure';
          packet.sprite.material.opacity = (0.34 + Math.max(0, pulse - 1) * 0.28) * (engine.layerOpacity[layer] ?? 1);
        }
      };
      (engine.infrastructurePackets || []).forEach(animatePackets);
      (engine.dataCenterPackets || []).forEach(animatePackets);
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

  function reactInfrastructureRowExists() {
    if (document.querySelector('[data-layer-id="infrastructure"]')) return true;
    return Array.from(document.querySelectorAll('.layer-label'))
      .some(label => String(label.textContent || '').trim().toUpperCase() === 'INFRASTRUCTURE');
  }

  function injectUi() {
    const engine = window.__globalDataEngine;
    const layers = document.querySelector('.layers');
    if (!engine || !layers || layers.querySelector('[data-infra-row]') || reactInfrastructureRowExists()) return;

    const row = document.createElement('div');
    row.className = 'layer-row';
    row.dataset.infraRow = '1';
    row.innerHTML = [
      '<div class="layer-head">',
      '<div class="layer-idx">I</div>',
      '<div style="flex:1;min-width:0">',
      '<div class="layer-label">INFRASTRUCTURE</div>',
      '<div class="layer-sub">POWER GENERATION</div>',
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
    if (String(event.key || '').toLowerCase() !== 'i' || reactInfrastructureRowExists()) return;
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
    engine.dataCenterPackets = [];
    engine.infrastructurePowerFilters = window.GlobalDataInfrastructureFilters?.powerTypes || null;
    engine._ensureLayerGroups = function infrastructureEnsure() {
      originalEnsure?.();
      ensureLayer(engine);
    };
    engine._clearGroup = function infrastructureClear(id) {
      originalClear?.(id);
      if (id === 'infrastructure') engine.infrastructurePackets = [];
      if (id === 'dataCenters') {
        engine.dataCenterPackets = [];
        engine.dataCenterNetworkGroup = null;
      }
    };
    engine.updateLiveData = function infrastructureUpdate(data) {
      engine.lastInfrastructureData = data || {};
      originalUpdate?.(data);
      renderInfrastructure(engine, data || {});
    };
    engine.setInfrastructurePowerFilters = function infrastructurePowerFilters(filters) {
      engine.infrastructurePowerFilters = filters || null;
      renderInfrastructure(engine, engine.lastInfrastructureData || window.MOCK_DATA || {});
    };
    window.addEventListener('globaldata:infrastructure-filter-change', event => {
      engine.setInfrastructurePowerFilters?.(event.detail?.powerTypes || null);
    });

    engine._ensureLayerGroups();
    startInfrastructureLoop(engine);
    renderInfrastructure(engine, engine.lastLiveData || window.MOCK_DATA || {});
    injectUi();
    return engine;
  };
})();
