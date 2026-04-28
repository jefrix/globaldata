window.GlobeEngine = (function () {
  const R = 100;
  const DEG = Math.PI / 180;
  const WORLD_ATLAS_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json';

  function isTodayUtc(ts) {
    const d = new Date(Number(ts) || Date.now());
    const now = new Date();
    return d.getUTCFullYear() === now.getUTCFullYear()
      && d.getUTCMonth() === now.getUTCMonth()
      && d.getUTCDate() === now.getUTCDate();
  }

  function latLonToVec3(lat, lon, r = R) {
    const phi = (90 - lat) * DEG;
    const theta = (lon + 180) * DEG;
    return new THREE.Vector3(
      -r * Math.sin(phi) * Math.cos(theta),
      r * Math.cos(phi),
      r * Math.sin(phi) * Math.sin(theta)
    );
  }

  function routePosition(flight) {
    if (Number.isFinite(Number(flight.lat)) && Number.isFinite(Number(flight.lon))) {
      return {
        lat: Number(flight.lat),
        lon: Number(flight.lon),
        live: true,
      };
    }

    if (!flight.origin || !flight.dest) return null;

    const progress = Number.isFinite(Number(flight.progress)) ? Number(flight.progress) : 0;
    const t = ((progress % 1) + 1) % 1;
    return {
      lat: Number(flight.origin.lat) + (Number(flight.dest.lat) - Number(flight.origin.lat)) * t,
      lon: Number(flight.origin.lon) + (Number(flight.dest.lon) - Number(flight.origin.lon)) * t,
      live: false,
      progress: t,
    };
  }

  function normalizePolygonForFill(poly) {
    const lons = poly.map(p => Number(p[1]));
    const min = Math.min(...lons);
    const max = Math.max(...lons);
    const crossesDateLine = max - min > 180;

    return {
      crossesDateLine,
      points: poly.map(([lat, lon]) => [
        Number(lat),
        crossesDateLine && Number(lon) < 0 ? Number(lon) + 360 : Number(lon),
      ]),
    };
  }

  function pointInPolygon(lat, lon, poly) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const yi = poly[i][0];
      const xi = poly[i][1];
      const yj = poly[j][0];
      const xj = poly[j][1];
      const intersects = ((yi > lat) !== (yj > lat)) &&
        (lon < ((xj - xi) * (lat - yi)) / (yj - yi || 0.000001) + xi);
      if (intersects) inside = !inside;
    }
    return inside;
  }

  function pushSphereQuad(vertices, lat, lon, step, radius) {
    const pad = step * 0.48;
    const corners = [
      latLonToVec3(lat - pad, lon - pad, radius),
      latLonToVec3(lat - pad, lon + pad, radius),
      latLonToVec3(lat + pad, lon + pad, radius),
      latLonToVec3(lat + pad, lon - pad, radius),
    ];
    [0, 1, 2, 0, 2, 3].forEach(i => {
      vertices.push(corners[i].x, corners[i].y, corners[i].z);
    });
  }

  function featureCollectionToRings(collection) {
    const rings = [];
    (collection?.features || []).forEach(feature => {
      const geometry = feature.geometry;
      if (!geometry) return;

      const polygons = geometry.type === 'Polygon'
        ? [geometry.coordinates]
        : geometry.type === 'MultiPolygon'
          ? geometry.coordinates
          : [];

      polygons.forEach(polygon => {
        const outer = polygon[0];
        if (!outer || outer.length < 4) return;
        rings.push({
          name: feature.properties?.name || feature.properties?.name_long || 'land',
          iso: feature.properties?.iso_a3 || feature.properties?.adm0_a3 || feature.id,
          points: outer.map(([lon, lat]) => [lat, lon]),
        });
      });
    });
    return rings;
  }

  function localCoastlineRings() {
    return Object.entries(window.COASTLINES || {}).map(([name, points]) => ({ name, points }));
  }

  function ringsToFeatureLike(rings) {
    return (rings || []).map(({ name, points }) => ({
      name,
      coordinates: [points.map(([lat, lon]) => [Number(lon), Number(lat)])],
    }));
  }

  function drawRingOnTexture(ctx, ring, width, height) {
    const coords = ring.coordinates?.[0] || [];
    if (coords.length < 3) return;
    const segments = [];
    let current = [];
    let previousX = null;

    coords.forEach(([lon, lat]) => {
      const x = ((Number(lon) + 180) / 360) * width;
      const y = ((90 - Number(lat)) / 180) * height;
      if (previousX !== null && Math.abs(x - previousX) > width * 0.5 && current.length) {
        segments.push(current);
        current = [];
      }
      current.push([x, y]);
      previousX = x;
    });
    if (current.length) segments.push(current);

    segments.forEach(segment => {
      if (segment.length < 3) return;
      ctx.beginPath();
      ctx.moveTo(segment[0][0], segment[0][1]);
      segment.slice(1).forEach(([x, y]) => ctx.lineTo(x, y));
      ctx.closePath();
      ctx.fill();
    });
  }

  function buildFilledRingMesh(ring, color, opacity, kind, data, radius = R * 1.019) {
    const poly = ring.points || [];
    if (poly.length < 3) return null;
    const normalized = normalizePolygonForFill(poly);
    const lats = normalized.points.map(p => p[0]);
    const lons = normalized.points.map(p => p[1]);
    const minLat = Math.max(-82, Math.floor(Math.min(...lats)));
    const maxLat = Math.min(84, Math.ceil(Math.max(...lats)));
    const minLon = Math.floor(Math.min(...lons));
    const maxLon = Math.ceil(Math.max(...lons));
    const step = Math.max(1.5, Math.min(4, Math.max(maxLat - minLat, maxLon - minLon) / 20));
    const vertices = [];

    for (let lat = minLat; lat <= maxLat; lat += step) {
      for (let lon = minLon; lon <= maxLon; lon += step) {
        if (!pointInPolygon(lat, lon, normalized.points)) continue;
        const renderLon = normalized.crossesDateLine && lon > 180 ? lon - 360 : lon;
        pushSphereQuad(vertices, lat, renderLon, step, radius);
      }
    }
    if (!vertices.length) return null;

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    const material = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity,
      depthTest: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.renderOrder = 2;
    mesh.userData = { layer: 'diplomacy', kind, data };
    return mesh;
  }

  function buildLatLonPatchMesh(bounds, color, opacity, kind, data, radius = R * 1.021) {
    const [southRaw, westRaw, northRaw, eastRaw] = bounds || [];
    const south = Number(southRaw);
    const west = Number(westRaw);
    const north = Number(northRaw);
    const east = Number(eastRaw);
    if (![south, west, north, east].every(Number.isFinite)) return null;

    const latSpan = Math.max(0.4, Math.abs(north - south));
    const lonSpan = Math.max(0.4, Math.abs(east - west));
    const step = Math.max(0.6, Math.min(3, Math.max(latSpan, lonSpan) / 6));
    const vertices = [];

    for (let lat = Math.min(south, north); lat < Math.max(south, north); lat += step) {
      for (let lon = Math.min(west, east); lon < Math.max(west, east); lon += step) {
        const lat2 = Math.min(lat + step, Math.max(south, north));
        const lon2 = Math.min(lon + step, Math.max(west, east));
        const corners = [
          latLonToVec3(lat, lon, radius),
          latLonToVec3(lat, lon2, radius),
          latLonToVec3(lat2, lon2, radius),
          latLonToVec3(lat2, lon, radius),
        ];
        [0, 1, 2, 0, 2, 3].forEach(i => vertices.push(corners[i].x, corners[i].y, corners[i].z));
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    const material = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity,
      depthTest: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.renderOrder = 2;
    mesh.userData = { layer: 'conflicts', kind, data };
    return mesh;
  }

  function makeMarkerTexture(kind, color, options = {}) {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 64, 64);
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    if (kind === 'quake') {
      const rings = Math.max(1, Math.min(8, Math.floor(Number(options.rings || 1))));
      ctx.strokeStyle = color;
      for (let i = 1; i <= rings; i++) {
        ctx.globalAlpha = 1 - (i - 1) * 0.08;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(32, 32, 5 + i * 4.2, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    } else if (kind === 'spiral') {
      ctx.strokeStyle = color;
      ctx.lineWidth = 4;
      ctx.beginPath();
      for (let i = 0; i < 90; i++) {
        const t = i / 89;
        const angle = t * Math.PI * 5.2;
        const radius = 3 + t * 24;
        const x = 32 + Math.cos(angle) * radius;
        const y = 32 + Math.sin(angle) * radius;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(32, 32, 3, 0, Math.PI * 2);
      ctx.fill();
    } else if (kind === 'flight') {
      ctx.lineWidth = 9;
      ctx.beginPath();
      ctx.moveTo(12, 32);
      ctx.lineTo(52, 32);
      ctx.moveTo(32, 12);
      ctx.lineTo(32, 52);
      ctx.stroke();
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(255,255,255,0.75)';
      ctx.beginPath();
      ctx.moveTo(18, 32);
      ctx.lineTo(46, 32);
      ctx.stroke();
    } else if (kind === 'vessel') {
      ctx.beginPath();
      ctx.moveTo(32, 7);
      ctx.bezierCurveTo(49, 12, 54, 26, 47, 46);
      ctx.bezierCurveTo(40, 55, 24, 55, 17, 46);
      ctx.bezierCurveTo(10, 26, 15, 12, 32, 7);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(32, 12);
      ctx.lineTo(32, 49);
      ctx.stroke();
    } else if (kind === 'news' || kind === 'diplomacy') {
      ctx.globalAlpha = 0.24;
      ctx.beginPath();
      ctx.arc(32, 32, 26, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.92;
      ctx.strokeStyle = color;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(32, 32, 25, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.fillStyle = color;
      ctx.font = 'bold 36px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = color;
      ctx.shadowBlur = 10;
      ctx.fillText(kind === 'news' ? 'N' : 'D', 32, 34);
      ctx.shadowBlur = 0;
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  function interpolatePath(path, progress, dir = 1) {
    if (!path || path.length < 2) return null;
    const segments = [];
    let total = 0;

    for (let i = 0; i < path.length - 1; i++) {
      const a = path[i];
      const b = path[i + 1];
      const length = Math.hypot(Number(b[0]) - Number(a[0]), Number(b[1]) - Number(a[1]));
      segments.push({ a, b, length });
      total += length;
    }

    let target = (((progress % 1) + 1) % 1) * total;
    if (dir < 0) target = total - target;

    for (const segment of segments) {
      if (target > segment.length) {
        target -= segment.length;
        continue;
      }
      const t = segment.length ? target / segment.length : 0;
      const lat = Number(segment.a[0]) + (Number(segment.b[0]) - Number(segment.a[0])) * t;
      const lon = Number(segment.a[1]) + (Number(segment.b[1]) - Number(segment.a[1])) * t;
      const heading = Math.atan2(Number(segment.b[1]) - Number(segment.a[1]), Number(segment.b[0]) - Number(segment.a[0]));
      return { lat, lon, heading };
    }

    const last = path[path.length - 1];
    return { lat: Number(last[0]), lon: Number(last[1]), heading: 0 };
  }

  function makeMaterial(color, opacity = 1) {
    return new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity,
      depthTest: true,
      depthWrite: false,
    });
  }

  function GlobeEngine(container, theme) {
    this.container = container;
    this.theme = theme;
    this.currentZ = 320;
    this.rotationY = 0.3;
    this.rotationX = 0.15;
    this.autoSpin = true;
    this.layerGroups = {};
    this.layerOpacity = {};
    this.pickables = [];
    this.flightObjects = [];
    this.vesselObjects = [];
    this.pulseLines = [];
    this.maxFlightMarkers = 5000;
    this.maxTrackedObjects = 5000;
    this.markerMaterials = {};
    this.surfaceTexture = null;
    this.selectedDiplomacyCode = null;
    this.pickHandler = null;
    this.lastLiveData = window.MOCK_DATA || {};
    this.mapLandRings = localCoastlineRings();
    this.mapCountryRings = [];
    this._init();
  }

  GlobeEngine.prototype._init = function () {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(45, w / h, 1, 10000);
    this.camera.position.set(0, 0, this.currentZ);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(w, h);
    this.container.appendChild(this.renderer.domElement);

    this.root = new THREE.Group();
    this.scene.add(this.root);

    this._buildGlow();
    this._buildCore();
    this._buildGrid();
    this._buildLandmasses();
    this._ensureLayerGroups();
    this._setupControls();
    this._setupResize();
    this._loadMapSource();
    this._animate();
  };

  GlobeEngine.prototype._ensureLayerGroups = function () {
    ['diplomacy', 'geographic', 'climate', 'news', 'logistics', 'flights', 'cyber', 'satellites', 'conflicts']
      .forEach(id => {
        if (!this.layerGroups[id]) {
          const group = new THREE.Group();
          group.visible = false;
          this.layerGroups[id] = group;
          this.root.add(group);
        }
      });
    this.flightGroup = this.layerGroups.flights;
  };

  GlobeEngine.prototype._buildGlow = function () {
    this.glowMesh = new THREE.Mesh(
      new THREE.SphereGeometry(R * 1.08, 64, 64),
      new THREE.MeshBasicMaterial({
        color: this.theme.glow || '#1a4d8f',
        transparent: true,
        opacity: 0.12,
        side: THREE.BackSide,
      })
    );
    this.scene.add(this.glowMesh);
  };

  GlobeEngine.prototype._buildCore = function () {
    this.surfaceTexture = this._makeSurfaceTexture();
    this.depthMaskMesh = new THREE.Mesh(
      new THREE.SphereGeometry(R, 64, 64),
      new THREE.MeshBasicMaterial({
        colorWrite: false,
        depthTest: true,
        depthWrite: true,
      })
    );
    this.depthMaskMesh.renderOrder = -1;
    this.root.add(this.depthMaskMesh);

    this.coreMesh = new THREE.Mesh(
      new THREE.SphereGeometry(R, 64, 64),
      new THREE.MeshBasicMaterial({
        color: this.theme.core || '#06111d',
        map: this.surfaceTexture,
        transparent: false,
        opacity: 1,
        depthTest: true,
        depthWrite: true,
      })
    );
    this.coreMesh.renderOrder = 0;
    this.root.add(this.coreMesh);
  };

  GlobeEngine.prototype._buildGrid = function () {
    this.grid = new THREE.Group();
    const mat = new THREE.LineBasicMaterial({
      color: this.theme.grid || '#1e4f86',
      transparent: true,
      opacity: 0.36,
      depthTest: true,
      depthWrite: false,
    });

    for (let lat = -60; lat <= 60; lat += 30) {
      const pts = [];
      for (let lon = -180; lon <= 180; lon += 4) pts.push(latLonToVec3(lat, lon, R * 1.004));
      this.grid.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat));
    }

    for (let lon = -180; lon < 180; lon += 30) {
      const pts = [];
      for (let lat = -85; lat <= 85; lat += 4) pts.push(latLonToVec3(lat, lon, R * 1.004));
      this.grid.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat));
    }

    this.root.add(this.grid);
  };

  GlobeEngine.prototype._loadMapSource = async function () {
    if (!window.topojson) return;
    try {
      const world = await fetch(WORLD_ATLAS_URL).then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      });
      const land = window.topojson.feature(world, world.objects.land);
      const countries = window.topojson.feature(world, world.objects.countries);
      this.mapLandRings = featureCollectionToRings(land);
      this.mapCountryRings = featureCollectionToRings(countries);

      this.root.remove(this.depthMaskMesh);
      this.root.remove(this.coreMesh);
      this.root.remove(this.landmasses);
      this._buildCore();
      this._buildLandmasses();
      this.updateLiveData(this.lastLiveData);
    } catch (error) {
      console.warn('Natural Earth map source unavailable; using local coastline fallback.', error);
    }
  };

  GlobeEngine.prototype._buildLandmasses = function () {
    this.landmasses = new THREE.Group();
    const coastMat = new THREE.LineBasicMaterial({
      color: this.theme.land || '#5ea9ff',
      transparent: true,
      opacity: 0.95,
      depthTest: true,
      depthWrite: false,
    });
    const shelfMat = new THREE.LineBasicMaterial({
      color: this.theme.gridStrong || this.theme.land || '#5ea9ff',
      transparent: true,
      opacity: 0.25,
      depthTest: true,
      depthWrite: false,
    });

    (this.mapLandRings || localCoastlineRings()).forEach(({ name, points: poly }) => {
      const pts = poly.map(([lat, lon]) => latLonToVec3(lat, lon, R * 1.012));
      if (pts.length > 2) pts.push(pts[0].clone());
      this.landmasses.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), coastMat));

      const shelfPts = poly.map(([lat, lon]) => latLonToVec3(lat, lon, R * 1.018));
      if (shelfPts.length > 2) shelfPts.push(shelfPts[0].clone());
      this.landmasses.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(shelfPts), shelfMat));
    });

    this.root.add(this.landmasses);
  };

  GlobeEngine.prototype._makeSurfaceTexture = function () {
    const width = 2048;
    const height = 1024;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    const ocean = this.theme.core || '#06111d';
    const land = this.theme.landFill || '#10283a';
    ctx.fillStyle = ocean;
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = land;

    ringsToFeatureLike(this.mapLandRings || localCoastlineRings()).forEach(ring => {
      drawRingOnTexture(ctx, ring, width, height);
    });

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
    return texture;
  };

  GlobeEngine.prototype._disposeObjectResources = function (obj) {
    obj.traverse(child => {
      if (child.userData?.preserveResources) return;
      child.geometry?.dispose?.();
      if (Array.isArray(child.material)) {
        child.material.forEach(mat => mat?.dispose?.());
      } else {
        child.material?.dispose?.();
      }
    });
  };

  GlobeEngine.prototype._clearGroup = function (id) {
    const group = this.layerGroups[id];
    if (!group) return;
    this._disposeObjectResources(group);
    group.clear();
    if (id === 'cyber') this.pulseLines = [];
    this.pickables = this.pickables.filter(p => p.userData.layer !== id);
  };

  GlobeEngine.prototype._getMarkerMaterial = function (kind, color, opacity = 1) {
    const key = `${kind}:${color}`;
    if (!this.markerMaterials[key]) {
      this.markerMaterials[key] = new THREE.SpriteMaterial({
        map: makeMarkerTexture(kind, color),
        color: 0xffffff,
        transparent: true,
        opacity,
        depthTest: true,
        depthWrite: false,
      });
    } else {
      this.markerMaterials[key].opacity = opacity;
    }
    return this.markerMaterials[key];
  };

  GlobeEngine.prototype._getQuakeMaterial = function (color, rings, opacity = 1) {
    const key = `quake:${color}:${rings}`;
    if (!this.markerMaterials[key]) {
      this.markerMaterials[key] = new THREE.SpriteMaterial({
        map: makeMarkerTexture('quake', color, { rings }),
        color: 0xffffff,
        transparent: true,
        opacity,
        depthTest: true,
        depthWrite: false,
      });
    } else {
      this.markerMaterials[key].opacity = opacity;
    }
    return this.markerMaterials[key];
  };

  GlobeEngine.prototype._addSpritePoint = function (layer, lat, lon, material, width, height, kind, data, radius = R + 1.4) {
    if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lon))) return null;
    const mesh = new THREE.Sprite(material);
    mesh.position.copy(latLonToVec3(Number(lat), Number(lon), radius));
    mesh.scale.set(width, height, 1);
    mesh.renderOrder = 2;
    mesh.userData = { layer, kind, data, preserveResources: true };
    this.layerGroups[layer].add(mesh);
    this.pickables.push(mesh);
    return mesh;
  };

  GlobeEngine.prototype._addPoint = function (layer, lat, lon, color, size, kind, data) {
    if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lon))) return null;
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(size, 10, 10),
      makeMaterial(color, this.layerOpacity[layer] ?? 1)
    );
    mesh.position.copy(latLonToVec3(Number(lat), Number(lon), R + 1.4));
    mesh.renderOrder = 2;
    mesh.userData = { layer, kind, data };
    this.layerGroups[layer].add(mesh);
    this.pickables.push(mesh);
    return mesh;
  };

  GlobeEngine.prototype._addLine = function (layer, coords, color, opacity = 0.7) {
    const pts = coords
      .filter(p => Number.isFinite(Number(p[0])) && Number.isFinite(Number(p[1])))
      .map(([lat, lon]) => latLonToVec3(Number(lat), Number(lon), R + 1.1));
    if (pts.length < 2) return;
    this.layerGroups[layer].add(new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(pts),
      new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthTest: true, depthWrite: false })
    ));
  };

  GlobeEngine.prototype._addArc = function (layer, origin, target, color, opacity = 0.34) {
    if (!origin || !target) return;
    if (!Number.isFinite(Number(origin.lat)) || !Number.isFinite(Number(origin.lon))) return;
    if (!Number.isFinite(Number(target.lat)) || !Number.isFinite(Number(target.lon))) return;

    const start = latLonToVec3(Number(origin.lat), Number(origin.lon), 1).normalize();
    const end = latLonToVec3(Number(target.lat), Number(target.lon), 1).normalize();
    const distance = start.angleTo(end);
    const lift = Math.max(8, Math.min(28, distance * 16));
    const pts = [];

    for (let i = 0; i <= 32; i++) {
      const t = i / 32;
      const eased = Math.sin(Math.PI * t);
      const v = start.clone().lerp(end, t).normalize();
      pts.push(v.multiplyScalar(R + 1.8 + eased * lift));
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(pts);
    const material = layer === 'cyber'
      ? new THREE.LineDashedMaterial({
        color,
        transparent: true,
        opacity: Math.max(opacity, 0.58),
        depthTest: true,
        depthWrite: false,
        dashSize: 2.4,
        gapSize: 9.5,
      })
      : new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthTest: true, depthWrite: false });
    const line = new THREE.Line(geometry, material);
    if (layer === 'cyber') {
      line.computeLineDistances();
      line.userData.flowSpeed = 16 + Math.random() * 7;
      this.pulseLines.push(line);
    }
    line.renderOrder = 3;
    this.layerGroups[layer].add(line);
  };

  GlobeEngine.prototype._renderDiplomacy = function (countries) {
    const selected = countries.find(c => c.code === this.selectedDiplomacyCode);
    const allies = new Set(selected?.allies || []);
    const adversaries = new Set(selected?.adversaries || []);

    (countries || []).forEach(country => {
      const rings = (this.mapCountryRings || []).filter(ring => ring.iso === country.code);
      rings.forEach(ring => {
        const pickMesh = buildFilledRingMesh(ring, '#ffffff', 0.001, 'diplomacy', country, R * 1.024);
        if (pickMesh) {
          pickMesh.material.colorWrite = false;
          this.layerGroups.diplomacy.add(pickMesh);
          this.pickables.push(pickMesh);
        }
      });

      let color = '#7a94b8';
      let fillColor = null;
      let size = 0.55;
      if (country.code === selected?.code) {
        color = '#7bd6a8';
        fillColor = '#1fbf75';
        size = 1.05;
      } else if (allies.has(country.code)) {
        color = '#7bd6a8';
        fillColor = '#1fbf75';
        size = 0.85;
      } else if (adversaries.has(country.code)) {
        color = '#ff3040';
        fillColor = '#ff3040';
        size = 0.85;
      }

      if (fillColor) {
        rings.forEach(ring => {
          const fill = buildFilledRingMesh(ring, fillColor, country.code === selected?.code ? 0.5 : 0.36, 'diplomacy', country, R * 1.021);
          if (fill) this.layerGroups.diplomacy.add(fill);
        });
      }

      const material = this._getMarkerMaterial('diplomacy', color, this.layerOpacity.diplomacy ?? 1);
      const point = this._addSpritePoint('diplomacy', country.lat, country.lon, material, size * 2.2, size * 2.2, 'diplomacy', country);
      if (point && selected && (allies.has(country.code) || adversaries.has(country.code))) {
        this._addArc('diplomacy', selected, country, color, 0.3);
      }
    });
  };

  GlobeEngine.prototype._addTrailSegment = function (layer, a, b, color, opacity) {
    const group = this.layerGroups[layer];
    if (!group) return null;
    const pts = [
      latLonToVec3(Number(a.lat), Number(a.lon), R + 1.2),
      latLonToVec3(Number(b.lat), Number(b.lon), R + 1.2),
    ];
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(pts),
      new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthTest: true, depthWrite: false })
    );
    group.add(line);
    return line;
  };

  GlobeEngine.prototype._rebuildTrail = function (layer, obj, color) {
    if (!obj.trailGroup) {
      obj.trailGroup = new THREE.Group();
      this.layerGroups[layer].add(obj.trailGroup);
    }
    obj.trailGroup.children.forEach(child => {
      child.geometry?.dispose?.();
      child.material?.dispose?.();
    });
    obj.trailGroup.clear();
    for (let i = 1; i < obj.trail.length; i++) {
      const opacity = (i / obj.trail.length) * 0.45;
      const pts = [
        latLonToVec3(obj.trail[i - 1].lat, obj.trail[i - 1].lon, R + 1.15),
        latLonToVec3(obj.trail[i].lat, obj.trail[i].lon, R + 1.15),
      ];
      obj.trailGroup.add(new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(pts),
        new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthTest: true, depthWrite: false })
      ));
    }
  };

  GlobeEngine.prototype.buildAll = function () {
    this.updateLiveData({ ...(window.MOCK_DATA || {}), diplomacy: window.DIPLOMACY_DATA || [] });
  };

  GlobeEngine.prototype.updateLiveData = function (data) {
    this.lastLiveData = data || {};
    this._ensureLayerGroups();
    this.vesselObjects = [];
    ['diplomacy', 'geographic', 'climate', 'news', 'logistics', 'cyber', 'satellites', 'conflicts'].forEach(id => this._clearGroup(id));

    (this.mapCountryRings || []).forEach(country => {
      this._addLine('geographic', country.points, this.theme.gridStrong || this.theme.land || '#5ea9ff', 0.18);
    });
    this._renderDiplomacy(data.diplomacy || window.DIPLOMACY_DATA || []);

    (data.CITIES || []).forEach(c => {
      const size = Math.max(0.45, Math.min(1.6, Number(c.pop || 1) / 18));
      this._addPoint('geographic', c.lat, c.lon, this.theme.city || '#ffffff', size, 'city', c);
    });

    (data.ports || []).forEach((p, i) => {
      const major = i < 240;
      this._addPoint('logistics', p.lat, p.lon, major ? (this.theme.lng || '#9ad4ff') : (this.theme.lane || '#7bd6a8'), major ? 0.42 : 0.26, 'port', p);
    });

    (data.news || []).slice(0, 120).forEach(n => {
      const color = isTodayUtc(n.ts) ? '#e03535' : '#f5d142';
      const material = this._getMarkerMaterial('news', color, this.layerOpacity.news ?? 1);
      const marker = this._addSpritePoint('news', n.lat, n.lon, material, 3.2, 3.2, 'news', n);
      if (marker) marker.userData.pulse = 0.18 + Math.random() * Math.PI * 2;
    });

    (data.earthquakes || []).forEach(q => {
      const mag = Number(q.mag || 1);
      const rings = Math.max(1, Math.min(8, Math.floor(mag)));
      const size = Math.max(2.2, Math.min(6.2, rings * 0.9));
      const color = Number(q.mag || 0) >= 5 ? '#ff7050' : '#f5b142';
      const material = this._getQuakeMaterial(color, rings, this.layerOpacity.climate ?? 1);
      this._addSpritePoint('climate', q.lat, q.lon, material, size, size, 'earthquake', q);
    });

    (data.weather || []).forEach(w => {
      this._addPoint('climate', w.lat, w.lon, this.theme.storm || '#a38bff', 1.0, 'weather', w);
    });

    (data.storms || []).forEach(s => {
      const material = this._getMarkerMaterial('spiral', this.theme.stormHi || '#d85cff', this.layerOpacity.climate ?? 1);
      this._addSpritePoint('climate', s.lat, s.lon, material, 3.2, 3.2, 'storm', s);
    });

    (data.vessels || []).slice(0, this.maxTrackedObjects).forEach(v => {
      const lane = (data.SHIPPING || [])[v.lane];
      const pos = interpolatePath(lane, Number(v.progress || 0), Number(v.dir || 1));
      if (!pos) return;
      const color = v.type === 'oil' ? (this.theme.oil || '#f5a742') : v.type === 'lng' ? (this.theme.lng || '#9ad4ff') : (this.theme.container || '#7bd6a8');
      const mesh = new THREE.Sprite(this._getMarkerMaterial('vessel', color, this.layerOpacity.logistics ?? 1));
      mesh.position.copy(latLonToVec3(Number(pos.lat), Number(pos.lon), R + 1.35));
      mesh.scale.set(1.45, 2.55, 1);
      mesh.renderOrder = 2;
      mesh.userData = { layer: 'logistics', kind: 'vessel', data: v, preserveResources: true };
      this.layerGroups.logistics.add(mesh);
      this.pickables.push(mesh);
      this.vesselObjects.push({
        mesh,
        data: v,
        lane,
        progress: Number(v.progress || 0),
        speed: Number(v.speed || 0.00025),
        dir: Number(v.dir || 1),
        trail: [{ lat: pos.lat, lon: pos.lon }],
        trailGroup: null,
        trailElapsed: 0,
        color,
      });
    });

    const cyberEvents = (data.kasperskyCyber?.length ? data.kasperskyCyber : data.cyber || []).slice(0, this.maxTrackedObjects);
    cyberEvents.forEach(c => {
      const origin = c.origin || c.source;
      const target = c.target || c;
      if (!origin || !target) return;
      this._addArc('cyber', origin, target, c.color || '#ff5c2e', 0.34);
      this._addPoint('cyber', origin.lat, origin.lon, c.color || '#ff5c2e', 0.38, 'cyber', c);
      this._addPoint('cyber', target.lat, target.lon, c.color || '#ff5c2e', 0.62, 'cyber', c);
    });

    (data.satellites || []).slice(0, Math.min(220, this.maxTrackedObjects)).forEach((s, i) => {
      const lon = ((s.phase || 0) / (Math.PI * 2)) * 360 - 180;
      const lat = Math.sin((s.phase || i) + i) * (s.inclination || 45);
      const color = s.type === 'GEO' ? this.theme.satGeo : s.type === 'MEO' ? this.theme.satMeo : this.theme.satLeo;
      this._addPoint('satellites', lat, lon, color || '#6ee7f5', 0.45, 'satellite', s);
    });

    (data.conflicts || []).forEach(c => {
      const patch = buildLatLonPatchMesh(c.bbox, '#ff4d3d', 0.28 + Math.min(0.3, Number(c.level || 0.4) * 0.22), 'conflict', c);
      if (patch) {
        this.layerGroups.conflicts.add(patch);
        this.pickables.push(patch);
      }
    });

    (data.conflictEvents || []).forEach(c => {
      const level = Math.max(0.25, Number(c.level || 0.35));
      const span = Math.max(0.8, Math.min(2.2, 0.7 + level * 1.6));
      const patch = buildLatLonPatchMesh(
        [Number(c.lat) - span, Number(c.lon) - span, Number(c.lat) + span, Number(c.lon) + span],
        '#ff4d3d',
        0.26 + Math.min(0.28, level * 0.24),
        'conflict',
        c
      );
      if (patch) {
        this.layerGroups.conflicts.add(patch);
        this.pickables.push(patch);
      }
    });
  };

  GlobeEngine.prototype.updateFlights = function (flights) {
    this._clearGroup('flights');
    this.flightObjects = [];
    const markerMaterial = this._getMarkerMaterial('flight', this.theme.flight || '#ffd96e', this.layerOpacity.flights ?? 1);

    (flights || []).slice(0, Math.min(this.maxFlightMarkers, this.maxTrackedObjects)).forEach(f => {
      const initial = routePosition(f);
      if (!initial) return;
      const size = initial.live ? 1.75 : 1.5;
      const mesh = new THREE.Sprite(markerMaterial);
      mesh.position.copy(latLonToVec3(Number(initial.lat), Number(initial.lon), R + 1.4));
      mesh.scale.set(size, size, 1);
      mesh.renderOrder = 2;
      mesh.userData = { layer: 'flights', kind: 'flight', data: f, preserveResources: true };
      this.layerGroups.flights.add(mesh);
      this.pickables.push(mesh);
      this.flightObjects.push({
        mesh,
        data: f,
        lat: initial.lat,
        lon: initial.lon,
        progress: initial.progress ?? Number(f.progress || 0),
        hasRoute: !initial.live && !!(f.origin && f.dest),
        routeSpeed: Number(f.speed || 0.0008),
        velocity: Number(f.velocity || 200),
        heading: Number.isFinite(Number(f.heading)) ? Number(f.heading) : Math.random() * 360,
        trail: [{ lat: initial.lat, lon: initial.lon }],
        trailGroup: null,
        trailElapsed: 0,
      });
    });
  };

  GlobeEngine.prototype.setLayerVisible = function (id, visible) {
    if (this.layerGroups[id]) this.layerGroups[id].visible = visible;
  };

  GlobeEngine.prototype.setLayerOpacity = function (id, opacity) {
    this.layerOpacity[id] = opacity;
    const group = this.layerGroups[id];
    if (!group) return;
    group.traverse(obj => {
      if (obj.material) {
        obj.material.transparent = true;
        obj.material.opacity = opacity;
      }
    });
  };

  GlobeEngine.prototype.setGridVisible = function (visible) {
    if (this.grid) this.grid.visible = visible;
  };

  GlobeEngine.prototype.selectDiplomacyCountry = function (code) {
    this.selectedDiplomacyCode = code;
    this._clearGroup('diplomacy');
    this._renderDiplomacy(this.lastLiveData.diplomacy || window.DIPLOMACY_DATA || []);
  };

  GlobeEngine.prototype.zoomBy = function (factor) {
    this.currentZ = Math.max(175, Math.min(520, this.currentZ * factor));
    this.camera.position.z = this.currentZ;
  };

  GlobeEngine.prototype.resetView = function () {
    this.rotationY = 0.3;
    this.rotationX = 0.15;
    this.currentZ = 320;
    this.camera.position.z = this.currentZ;
  };

  GlobeEngine.prototype.onPick = function (handler) {
    this.pickHandler = handler;
  };

  GlobeEngine.prototype._setupControls = function () {
    const dom = this.renderer.domElement;
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let dragging = false;
    let moved = false;
    let lx = 0;
    let ly = 0;

    dom.addEventListener('pointerdown', e => {
      dragging = true;
      moved = false;
      lx = e.clientX;
      ly = e.clientY;
      this.autoSpin = false;
    });

    window.addEventListener('pointerup', e => {
      if (!dragging) return;
      dragging = false;
      if (moved || !this.pickHandler) return;

      const rect = dom.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, this.camera);
      const visiblePickables = this.pickables.filter(p => p.visible && this.layerGroups[p.userData.layer]?.visible);
      const hit = raycaster.intersectObjects(visiblePickables, false)[0];
      if (hit?.object?.userData) {
        this.pickHandler({
          kind: hit.object.userData.kind,
          data: hit.object.userData.data,
        });
      }
    });

    dom.addEventListener('pointermove', e => {
      if (!dragging) return;
      const dx = e.clientX - lx;
      const dy = e.clientY - ly;
      if (Math.abs(dx) + Math.abs(dy) > 3) moved = true;
      lx = e.clientX;
      ly = e.clientY;
      this.rotationY += dx * 0.005;
      this.rotationX = Math.max(-1.25, Math.min(1.25, this.rotationX + dy * 0.005));
    });

    dom.addEventListener('wheel', e => {
      e.preventDefault();
      this.zoomBy(e.deltaY < 0 ? 0.9 : 1.1);
    }, { passive: false });
  };

  GlobeEngine.prototype._setupResize = function () {
    window.addEventListener('resize', () => {
      const w = this.container.clientWidth;
      const h = this.container.clientHeight;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    });
  };

  GlobeEngine.prototype._animate = function () {
    const clock = new THREE.Clock();
    const tick = () => {
      const dt = clock.getDelta();

      if (this.autoSpin) this.rotationY += dt * 0.05;
      this.root.rotation.y = this.rotationY;
      this.root.rotation.x = this.rotationX;

      this.pulseLines.forEach(line => {
        if (line.material) line.material.dashOffset = (line.material.dashOffset || 0) - dt * (line.userData.flowSpeed || 18);
      });

      if (this.layerGroups.news?.visible) {
        this.layerGroups.news.children.forEach(marker => {
          if (marker.userData?.kind !== 'news') return;
          marker.userData.pulse = (marker.userData.pulse || 0) + dt * 3.4;
          const scale = 1 + Math.sin(marker.userData.pulse) * 0.16;
          marker.scale.set(3.2 * scale, 3.2 * scale, 1);
        });
      }

      if (this.layerGroups.diplomacy?.visible) {
        this.layerGroups.diplomacy.children.forEach(marker => {
          if (marker.userData?.kind !== 'diplomacy' || !marker.isSprite) return;
          marker.material.rotation = -this.root.rotation.y * 0.12;
        });
      }

      this.flightObjects.forEach(f => {
        if (f.hasRoute) {
          f.progress = (f.progress + f.routeSpeed * dt * 16) % 1;
          f.data.progress = f.progress;
          const next = routePosition(f.data);
          if (!next) return;
          f.lat = next.lat;
          f.lon = next.lon;
        } else {
          const speed = f.velocity * dt * 0.00005;
          f.lat += Math.cos(f.heading * DEG) * speed;
          f.lon += Math.sin(f.heading * DEG) * speed;
          if (f.lon > 180) f.lon -= 360;
          if (f.lon < -180) f.lon += 360;
        }
        f.mesh.position.copy(latLonToVec3(f.lat, f.lon, R + 1.4));
        f.trailElapsed += dt;
        if (f.trailElapsed > 0.18) {
          f.trailElapsed = 0;
          f.trail.push({ lat: f.lat, lon: f.lon });
          if (f.trail.length > 10) f.trail.shift();
          this._rebuildTrail('flights', f, this.theme.flightLine || this.theme.flight || '#ffd96e');
        }
      });

      this.vesselObjects.forEach(v => {
        v.progress = (v.progress + v.speed * dt * 0.05) % 1;
        v.data.progress = v.progress;
        const next = interpolatePath(v.lane, v.progress, v.dir);
        if (!next) return;
        v.mesh.position.copy(latLonToVec3(next.lat, next.lon, R + 1.35));
        v.trailElapsed += dt;
        if (v.trailElapsed > 2.5) {
          v.trailElapsed = 0;
          v.trail.push({ lat: next.lat, lon: next.lon });
          if (v.trail.length > 8) v.trail.shift();
          this._rebuildTrail('logistics', v, v.color);
        }
      });

      this.renderer.render(this.scene, this.camera);
      requestAnimationFrame(tick);
    };

    tick();
  };

  return {
    create: (el, theme) => new GlobeEngine(el, theme),
  };
})();
