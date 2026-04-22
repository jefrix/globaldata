// GlobeEngine: Three.js WebGL 3D globe with toggleable data layers.
// Exposes window.GlobeEngine with .init(container, opts) and layer controls.

window.GlobeEngine = (function () {
  const R = 100; // base radius
  const DEG = Math.PI / 180;

  function latLonToVec3(lat, lon, r = R) {
    const phi = (90 - lat) * DEG;
    const theta = (lon + 180) * DEG;
    const x = -r * Math.sin(phi) * Math.cos(theta);
    const z = r * Math.sin(phi) * Math.sin(theta);
    const y = r * Math.cos(phi);
    return new THREE.Vector3(x, y, z);
  }

  // Great-circle arc points between two lat/lon, at altitude "arcH"
  function greatCircle(lat1, lon1, lat2, lon2, segments = 48, arcH = 0.18) {
    const a = latLonToVec3(lat1, lon1, 1);
    const b = latLonToVec3(lat2, lon2, 1);
    const angle = a.angleTo(b);
    const pts = [];
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const p = new THREE.Vector3().addVectors(
        a.clone().multiplyScalar(Math.sin((1 - t) * angle) / Math.sin(angle)),
        b.clone().multiplyScalar(Math.sin(t * angle) / Math.sin(angle))
      );
      // Raise midpoint for arc feel
      const bump = 1 + Math.sin(t * Math.PI) * arcH;
      p.multiplyScalar(R * bump);
      pts.push(p);
    }
    return pts;
  }

  function GlobeEngine(container, theme) {
    this.container = container;
    this.theme = theme;
    this.layers = {};
    this.layerOpacity = {};
    this.flightsData = [];
    this.vesselsData = [];
    this.cyberData = [];
    this.satellitesData = [];
    this.onPickCallbacks = [];
    this.labelsVisible = true;
    this.gridVisible = true;
    this.density = 'normal';
    this.projection = 'orthographic'; // 'orthographic' | 'perspective'
    this._init();
  }

  GlobeEngine.prototype._init = function () {
    const c = this.container;
    const w = c.clientWidth;
    const h = c.clientHeight;

    this.scene = new THREE.Scene();
    this.scene.background = null;

    this.camera = new THREE.PerspectiveCamera(45, w / h, 1, 10000);
    this.camera.position.set(0, 0, 320);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(w, h);
    c.appendChild(this.renderer.domElement);

    // Interaction
    this.rotationY = 0.3; // spin
    this.rotationX = 0.15;
    this.targetZ = 320;
    this.currentZ = 320;
    this.autoSpin = true;

    this._setupControls();

    // Root group (everything rotates together)
    this.root = new THREE.Group();
    this.scene.add(this.root);

    // Build static layers
    this._buildGlow();
    this._buildGrid();
    this._buildLandmasses();

    // Raycaster for picking
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2(9999, 9999);
    this.renderer.domElement.addEventListener('pointermove', (e) => {
      const rect = this.renderer.domElement.getBoundingClientRect();
      this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    });
    this.renderer.domElement.addEventListener('click', (e) => this._handleClick(e));

    this._resizeObserver = new ResizeObserver(() => this._onResize());
    this._resizeObserver.observe(c);

    this._animate();
  };

  GlobeEngine.prototype._setupControls = function () {
    const dom = this.renderer.domElement;
    let dragging = false;
    let lx = 0, ly = 0;
    dom.addEventListener('pointerdown', (e) => {
      dragging = true; lx = e.clientX; ly = e.clientY;
      this.autoSpin = false;
      dom.setPointerCapture(e.pointerId);
      this._dragStart = { x: e.clientX, y: e.clientY, t: Date.now() };
    });
    dom.addEventListener('pointerup', (e) => {
      dragging = false;
      try { dom.releasePointerCapture(e.pointerId); } catch (_) {}
    });
    dom.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const dx = e.clientX - lx;
      const dy = e.clientY - ly;
      lx = e.clientX; ly = e.clientY;
      this.rotationY += dx * 0.006;
      this.rotationX += dy * 0.006;
      this.rotationX = Math.max(-1.4, Math.min(1.4, this.rotationX));
    });
    dom.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.targetZ *= (1 + e.deltaY * 0.0012);
      this.targetZ = Math.max(140, Math.min(600, this.targetZ));
    }, { passive: false });
  };

  GlobeEngine.prototype._onResize = function () {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  };

  GlobeEngine.prototype._buildGlow = function () {
    // Atmosphere halo — a back-side sphere with gradient shader
    const geo = new THREE.SphereGeometry(R * 1.12, 64, 64);
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: { uColor: { value: new THREE.Color(this.theme.glow) } },
      vertexShader: `varying vec3 vN; void main(){ vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,
      fragmentShader: `varying vec3 vN; uniform vec3 uColor; void main(){ float intensity = pow(0.7 - dot(vN, vec3(0.,0.,1.)), 2.5); gl_FragColor = vec4(uColor, 1.0) * intensity; }`,
    });
    this.glowMesh = new THREE.Mesh(geo, mat);
    this.scene.add(this.glowMesh);

    // Core sphere (subtle filled sphere so landmass lines "pop" and raycast works)
    const coreGeo = new THREE.SphereGeometry(R * 0.995, 64, 64);
    const coreMat = new THREE.MeshBasicMaterial({ color: this.theme.core, transparent: true, opacity: 0.9 });
    this.coreMesh = new THREE.Mesh(coreGeo, coreMat);
    this.root.add(this.coreMesh);
  };

  GlobeEngine.prototype._buildGrid = function () {
    const g = new THREE.Group();
    const mat = new THREE.LineBasicMaterial({ color: this.theme.grid, transparent: true, opacity: 0.45 });

    // Latitude circles every 15°
    for (let lat = -75; lat <= 75; lat += 15) {
      const pts = [];
      for (let lon = -180; lon <= 180; lon += 3) pts.push(latLonToVec3(lat, lon, R * 1.001));
      g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat));
    }
    // Longitude circles every 15°
    for (let lon = -180; lon < 180; lon += 15) {
      const pts = [];
      for (let lat = -90; lat <= 90; lat += 3) pts.push(latLonToVec3(lat, lon, R * 1.001));
      g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat));
    }
    // Equator (brighter)
    const eqMat = new THREE.LineBasicMaterial({ color: this.theme.gridStrong, transparent: true, opacity: 0.8 });
    const eqPts = [];
    for (let lon = -180; lon <= 180; lon += 2) eqPts.push(latLonToVec3(0, lon, R * 1.002));
    g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(eqPts), eqMat));
    // Prime meridian
    const pmPts = [];
    for (let lat = -90; lat <= 90; lat += 2) pmPts.push(latLonToVec3(lat, 0, R * 1.002));
    g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pmPts), eqMat));

    this.grid = g;
    this.root.add(g);
  };

  GlobeEngine.prototype._buildLandmasses = function () {
    const g = new THREE.Group();
    const mat = new THREE.LineBasicMaterial({ color: this.theme.land, transparent: true, opacity: 0.9 });
    const data = window.COASTLINES || {};
    Object.values(data).forEach(poly => {
      const pts = poly.map(([lat, lon]) => latLonToVec3(lat, lon, R * 1.003));
      // close loop
      pts.push(pts[0]);
      g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat));
    });
    this.landmasses = g;
    this.root.add(g);
  };

  // ============ LAYER BUILDERS ============
  GlobeEngine.prototype.ensureLayer = function (name) {
    if (!this.layers[name]) {
      const g = new THREE.Group();
      g.visible = false;
      this.layers[name] = g;
      this.layerOpacity[name] = 1;
      this.root.add(g);
    }
    return this.layers[name];
  };

  GlobeEngine.prototype._applyOpacityToGroup = function (group, op) {
    group.traverse(o => {
      if (o.material) {
        if (Array.isArray(o.material)) {
          o.material.forEach(m => { m.transparent = true; m.opacity = (m.userData.baseOpacity ?? 1) * op; });
        } else {
          o.material.transparent = true;
          o.material.opacity = (o.material.userData.baseOpacity ?? 1) * op;
        }
      }
    });
  };

  GlobeEngine.prototype.setLayerVisible = function (name, visible) {
    const layer = this.layers[name];
    if (layer) layer.visible = visible;
  };

  GlobeEngine.prototype.setLayerOpacity = function (name, op) {
    const layer = this.layers[name];
    if (!layer) return;
    this.layerOpacity[name] = op;
    this._applyOpacityToGroup(layer, op);
  };

  GlobeEngine.prototype.setGridVisible = function (v) {
    this.gridVisible = v;
    if (this.grid) this.grid.visible = v;
  };

  GlobeEngine.prototype.buildGeologic = function () {
    const g = this.ensureLayer('geologic');
    g.clear();
    const D = window.MOCK_DATA;
    // Rivers
    const riverMat = new THREE.LineBasicMaterial({ color: this.theme.river, transparent: true, opacity: 0.8 });
    riverMat.userData.baseOpacity = 0.8;
    D.rivers.forEach(r => {
      const pts = r.pts.map(([la, lo]) => latLonToVec3(la, lo, R * 1.004));
      g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), riverMat));
    });
    // Mountains — small tick marks along ranges
    const mtnMat = new THREE.LineBasicMaterial({ color: this.theme.mountain, transparent: true, opacity: 0.9 });
    mtnMat.userData.baseOpacity = 0.9;
    D.mountains.forEach(r => {
      const pts = r.pts.map(([la, lo]) => latLonToVec3(la, lo, R * 1.008));
      g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mtnMat));
      // Peak markers
      r.pts.forEach(([la, lo]) => {
        const s = new THREE.Mesh(
          new THREE.ConeGeometry(0.5, 1.4, 4),
          new THREE.MeshBasicMaterial({ color: this.theme.mountain, transparent: true, opacity: 0.9 })
        );
        s.material.userData.baseOpacity = 0.9;
        const v = latLonToVec3(la, lo, R * 1.012);
        s.position.copy(v);
        s.lookAt(0, 0, 0);
        s.rotateX(Math.PI / 2);
        g.add(s);
      });
    });
    this.setLayerOpacity('geologic', this.layerOpacity['geologic']);
  };

  GlobeEngine.prototype.buildGeographic = function () {
    const g = this.ensureLayer('geographic');
    g.clear();
    const D = window.MOCK_DATA;
    // City dots
    const dotMat = new THREE.MeshBasicMaterial({ color: this.theme.city, transparent: true, opacity: 1 });
    dotMat.userData.baseOpacity = 1;
    D.CITIES.forEach(c => {
      const sz = 0.35 + Math.min(1.8, c.pop / 10);
      const m = new THREE.Mesh(new THREE.SphereGeometry(sz, 8, 8), dotMat);
      m.position.copy(latLonToVec3(c.lat, c.lon, R * 1.01));
      m.userData = { kind: 'city', data: c };
      g.add(m);
      // outer ring
      const ringGeo = new THREE.RingGeometry(sz * 1.8, sz * 2.1, 20);
      const ringMat = new THREE.MeshBasicMaterial({ color: this.theme.city, side: THREE.DoubleSide, transparent: true, opacity: 0.4 });
      ringMat.userData.baseOpacity = 0.4;
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.copy(latLonToVec3(c.lat, c.lon, R * 1.011));
      ring.lookAt(0, 0, 0);
      g.add(ring);
    });
    this.setLayerOpacity('geographic', this.layerOpacity['geographic']);
  };

  GlobeEngine.prototype.buildClimate = function () {
    const g = this.ensureLayer('climate');
    g.clear();
    const D = window.MOCK_DATA;
    // Storms as pulsing spiral discs
    D.storms.forEach(s => {
      const stormGroup = new THREE.Group();
      stormGroup.userData = { kind: 'storm', data: s, pulse: true };
      const color = s.cat >= 3 ? this.theme.stormHi : this.theme.storm;
      for (let ring = 1; ring <= 3; ring++) {
        const geo = new THREE.RingGeometry(s.radius * 0.3 * ring, s.radius * 0.3 * ring + 0.3, 48);
        const mat = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, transparent: true, opacity: 0.5 - ring * 0.1 });
        mat.userData.baseOpacity = 0.5 - ring * 0.1;
        const m = new THREE.Mesh(geo, mat);
        m.position.copy(latLonToVec3(s.lat, s.lon, R * 1.015));
        m.lookAt(0, 0, 0);
        stormGroup.add(m);
      }
      // center dot
      const center = new THREE.Mesh(
        new THREE.SphereGeometry(0.6, 8, 8),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1 })
      );
      center.material.userData.baseOpacity = 1;
      center.position.copy(latLonToVec3(s.lat, s.lon, R * 1.018));
      center.userData = { kind: 'storm', data: s };
      stormGroup.add(center);
      g.add(stormGroup);
    });
    // Wind arrows
    D.winds.forEach(w => {
      const len = 2.5;
      const p0 = latLonToVec3(w.lat, w.lon, R * 1.02);
      const p1 = latLonToVec3(w.lat, w.lon + len, R * 1.02);
      const mat = new THREE.LineBasicMaterial({ color: this.theme.wind, transparent: true, opacity: 0.6 });
      mat.userData.baseOpacity = 0.6;
      g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([p0, p1]), mat));
    });
    this.setLayerOpacity('climate', this.layerOpacity['climate']);
  };

  GlobeEngine.prototype.buildNews = function () {
    const g = this.ensureLayer('news');
    g.clear();
    const D = window.MOCK_DATA;
    D.news.forEach(n => {
      // Color by heat: 1→15 yellow, 15→30 orange, 30+ red
      let color;
      if (n.sources < 12) color = 0xf5d142;
      else if (n.sources < 25) color = 0xf58a42;
      else color = 0xe03535;
      const sz = 0.4 + (n.sources / 50) * 1.4;
      const geo = new THREE.SphereGeometry(sz, 10, 10);
      const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95 });
      mat.userData.baseOpacity = 0.95;
      const m = new THREE.Mesh(geo, mat);
      m.position.copy(latLonToVec3(n.lat, n.lon, R * 1.013));
      m.userData = { kind: 'news', data: n };
      g.add(m);

      // pulse ring
      const ringGeo = new THREE.RingGeometry(sz * 1.5, sz * 1.7, 24);
      const ringMat = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, transparent: true, opacity: 0.6 });
      ringMat.userData.baseOpacity = 0.6;
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.copy(latLonToVec3(n.lat, n.lon, R * 1.014));
      ring.lookAt(0, 0, 0);
      ring.userData = { kind: 'newsRing', baseSize: sz, t: Math.random() * Math.PI * 2 };
      g.add(ring);
    });
    this.setLayerOpacity('news', this.layerOpacity['news']);
  };

  GlobeEngine.prototype.buildLogistics = function () {
    const g = this.ensureLayer('logistics');
    g.clear();
    const D = window.MOCK_DATA;
    this.vesselsData = [];

    // Shipping lane polylines
    D.SHIPPING.forEach((lane, i) => {
      const pts = [];
      for (let j = 0; j < lane.length - 1; j++) {
        const arc = greatCircle(lane[j][0], lane[j][1], lane[j+1][0], lane[j+1][1], 30, 0.02);
        pts.push(...arc);
      }
      const mat = new THREE.LineBasicMaterial({ color: this.theme.lane, transparent: true, opacity: 0.45 });
      mat.userData.baseOpacity = 0.45;
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat);
      line.userData = { laneIdx: i, lanePts: pts };
      g.add(line);
    });

    // Vessels
    D.vessels.forEach(v => {
      const color = v.type === 'oil' ? this.theme.oil : v.type === 'lng' ? this.theme.lng : this.theme.container;
      const m = new THREE.Mesh(
        new THREE.SphereGeometry(0.5, 6, 6),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1 })
      );
      m.material.userData.baseOpacity = 1;
      m.userData = { kind: 'vessel', data: v };
      g.add(m);
      this.vesselsData.push({ mesh: m, v });
    });

    // Trucking routes
    D.trucking.forEach(route => {
      const pts = [];
      for (let j = 0; j < route.length - 1; j++) {
        const arc = greatCircle(route[j][0], route[j][1], route[j+1][0], route[j+1][1], 20, 0.01);
        pts.push(...arc);
      }
      const mat = new THREE.LineBasicMaterial({ color: this.theme.truck, transparent: true, opacity: 0.6 });
      mat.userData.baseOpacity = 0.6;
      g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat));
    });

    this.setLayerOpacity('logistics', this.layerOpacity['logistics']);
  };

  GlobeEngine.prototype.buildFlights = function () {
    const g = this.ensureLayer('flights');
    g.clear();
    const D = window.MOCK_DATA;
    this.flightsData = [];

    D.flights.forEach(f => {
      const pts = greatCircle(f.origin.lat, f.origin.lon, f.dest.lat, f.dest.lon, 40, 0.18);
      // Route line (dim)
      const mat = new THREE.LineBasicMaterial({ color: this.theme.flightLine, transparent: true, opacity: 0.25 });
      mat.userData.baseOpacity = 0.25;
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat);
      g.add(line);

      // Aircraft dot
      const dot = new THREE.Mesh(
        new THREE.SphereGeometry(0.55, 6, 6),
        new THREE.MeshBasicMaterial({ color: this.theme.flight, transparent: true, opacity: 1 })
      );
      dot.material.userData.baseOpacity = 1;
      dot.userData = { kind: 'flight', data: f };
      g.add(dot);
      this.flightsData.push({ dot, line, pts, f });
    });
    this.setLayerOpacity('flights', this.layerOpacity['flights']);
  };

  GlobeEngine.prototype.buildCyber = function () {
    const g = this.ensureLayer('cyber');
    g.clear();
    const D = window.MOCK_DATA;
    this.cyberData = [];

    D.cyber.forEach(c => {
      const pts = greatCircle(c.origin.lat, c.origin.lon, c.target.lat, c.target.lon, 50, 0.3);
      const color = c.severity === 'CRIT' ? 0xff3370 :
                    c.severity === 'HIGH' ? 0xff5c2e :
                    c.severity === 'MED'  ? 0xf5a742 : 0x9a6bff;

      // Attack arc — a tube with a moving head
      const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.35 });
      mat.userData.baseOpacity = 0.35;
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat);
      g.add(line);

      const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.9, 8, 8),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1 })
      );
      head.material.userData.baseOpacity = 1;
      head.userData = { kind: 'cyber', data: c };
      g.add(head);

      // Origin marker
      const origin = new THREE.Mesh(
        new THREE.RingGeometry(1.5, 1.8, 20),
        new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, transparent: true, opacity: 0.8 })
      );
      origin.material.userData.baseOpacity = 0.8;
      origin.position.copy(latLonToVec3(c.origin.lat, c.origin.lon, R * 1.015));
      origin.lookAt(0, 0, 0);
      g.add(origin);

      this.cyberData.push({ head, pts, c });
    });
    this.setLayerOpacity('cyber', this.layerOpacity['cyber']);
  };

  GlobeEngine.prototype.buildSatellites = function () {
    const g = this.ensureLayer('satellites');
    g.clear();
    const D = window.MOCK_DATA;
    this.satellitesData = [];

    D.satellites.forEach(s => {
      const color = s.type === 'GEO' ? this.theme.satGeo :
                    s.type === 'MEO' ? this.theme.satMeo : this.theme.satLeo;
      const size = s.type === 'GEO' ? 0.8 : 0.45;
      const dot = new THREE.Mesh(
        new THREE.SphereGeometry(size, 6, 6),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1 })
      );
      dot.material.userData.baseOpacity = 1;
      dot.userData = { kind: 'satellite', data: s };
      g.add(dot);

      // Show orbit ring for GEO and some LEO
      if (s.type === 'GEO' || Math.random() < 0.08) {
        const orbitR = R + s.alt / 50;
        const orbitPts = [];
        const segs = 64;
        for (let i = 0; i <= segs; i++) {
          const a = (i / segs) * Math.PI * 2;
          orbitPts.push(new THREE.Vector3(Math.cos(a) * orbitR, 0, Math.sin(a) * orbitR));
        }
        const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.2 });
        mat.userData.baseOpacity = 0.2;
        const orbit = new THREE.Line(new THREE.BufferGeometry().setFromPoints(orbitPts), mat);
        orbit.rotation.x = s.inclination * DEG;
        g.add(orbit);
      }

      this.satellitesData.push({ dot, s });
    });
    this.setLayerOpacity('satellites', this.layerOpacity['satellites']);
  };

  GlobeEngine.prototype.buildConflicts = function () {
    const g = this.ensureLayer('conflicts');
    g.clear();
    const D = window.MOCK_DATA;

    D.conflicts.forEach(c => {
      // Shade a patch on the globe for the bbox
      const [latMin, lonMin, latMax, lonMax] = c.bbox;
      const latSteps = 8, lonSteps = 8;
      const geom = new THREE.BufferGeometry();
      const positions = [];
      const indices = [];
      let vi = 0;
      for (let i = 0; i <= latSteps; i++) {
        const la = latMin + (latMax - latMin) * (i / latSteps);
        for (let j = 0; j <= lonSteps; j++) {
          const lo = lonMin + (lonMax - lonMin) * (j / lonSteps);
          const v = latLonToVec3(la, lo, R * 1.006);
          positions.push(v.x, v.y, v.z);
        }
      }
      for (let i = 0; i < latSteps; i++) {
        for (let j = 0; j < lonSteps; j++) {
          const a = i * (lonSteps + 1) + j;
          const b = a + 1;
          const c2 = a + (lonSteps + 1);
          const d = c2 + 1;
          indices.push(a, b, d, a, d, c2);
        }
      }
      geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geom.setIndex(indices);
      geom.computeVertexNormals();

      // Color intensity: level 0..1 → light red → dark red
      const level = c.level;
      const col = new THREE.Color().setHSL(0.01, 0.9, 0.65 - level * 0.35);
      const mat = new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.15 + level * 0.5, side: THREE.DoubleSide });
      mat.userData.baseOpacity = 0.15 + level * 0.5;
      const mesh = new THREE.Mesh(geom, mat);
      mesh.userData = { kind: 'conflict', data: c };
      g.add(mesh);

      // Border outline for readability
      const border = [];
      for (let j = 0; j <= lonSteps; j++) border.push(latLonToVec3(latMin, lonMin + (lonMax-lonMin)*(j/lonSteps), R*1.007));
      for (let i = 0; i <= latSteps; i++) border.push(latLonToVec3(latMin + (latMax-latMin)*(i/latSteps), lonMax, R*1.007));
      for (let j = lonSteps; j >= 0; j--) border.push(latLonToVec3(latMax, lonMin + (lonMax-lonMin)*(j/lonSteps), R*1.007));
      for (let i = latSteps; i >= 0; i--) border.push(latLonToVec3(latMin + (latMax-latMin)*(i/latSteps), lonMin, R*1.007));
      const bmat = new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: 0.9 });
      bmat.userData.baseOpacity = 0.9;
      g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(border), bmat));
    });
    this.setLayerOpacity('conflicts', this.layerOpacity['conflicts']);
  };

  GlobeEngine.prototype.buildAll = function () {
    this.buildGeologic();
    this.buildGeographic();
    this.buildClimate();
    this.buildNews();
    this.buildLogistics();
    this.buildFlights();
    this.buildCyber();
    this.buildSatellites();
    this.buildConflicts();
  };

  // ============ INTERACTION ============
  GlobeEngine.prototype.onPick = function (cb) { this.onPickCallbacks.push(cb); };

  GlobeEngine.prototype._handleClick = function (e) {
    if (this._dragStart) {
      const dx = e.clientX - this._dragStart.x, dy = e.clientY - this._dragStart.y, dt = Date.now() - this._dragStart.t;
      if (dx*dx + dy*dy > 25 || dt > 400) return; // drag, not click
    }
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const pickable = [];
    Object.values(this.layers).forEach(layer => {
      if (layer.visible) {
        layer.traverse(o => { if (o.userData && o.userData.kind) pickable.push(o); });
      }
    });
    const hits = this.raycaster.intersectObjects(pickable, false);
    if (hits.length) {
      const h = hits[0].object;
      this.onPickCallbacks.forEach(cb => cb(h.userData));
    } else {
      this.onPickCallbacks.forEach(cb => cb(null));
    }
  };

  // ============ ANIMATION ============
  GlobeEngine.prototype._animate = function () {
    const clock = new THREE.Clock();
    const tick = () => {
      const dt = clock.getDelta();
      const t = clock.elapsedTime;

      // Spin
      if (this.autoSpin) this.rotationY += dt * 0.05;
      this.root.rotation.y = this.rotationY;
      this.root.rotation.x = this.rotationX;
      this.glowMesh.rotation.y = this.rotationY;
      this.glowMesh.rotation.x = this.rotationX;

      // Zoom
      this.currentZ += (this.targetZ - this.currentZ) * 0.08;
      this.camera.position.z = this.currentZ;

      // Flights
      if (this.layers.flights && this.layers.flights.visible) {
        this.flightsData.forEach(({ dot, pts, f }) => {
          f.progress = (f.progress + f.speed + dt * 0.15 * f.speed * 100) % 1;
          const idx = Math.min(pts.length - 1, Math.floor(f.progress * (pts.length - 1)));
          dot.position.copy(pts[idx]);
        });
      }

      // Vessels
      if (this.layers.logistics && this.layers.logistics.visible) {
        // Rebuild vessel positions from lane paths
        const lanes = this.layers.logistics.children.filter(ch => ch.userData && ch.userData.lanePts);
        this.vesselsData.forEach(({ mesh, v }) => {
          const lane = lanes.find(l => l.userData.laneIdx === v.lane);
          if (!lane) return;
          const pts = lane.userData.lanePts;
          v.progress = (v.progress + v.speed * v.dir + 1) % 1;
          const idx = Math.min(pts.length - 1, Math.max(0, Math.floor(v.progress * (pts.length - 1))));
          mesh.position.copy(pts[idx]);
        });
      }

      // Cyber — move head along arc and loop
      if (this.layers.cyber && this.layers.cyber.visible) {
        this.cyberData.forEach(({ head, pts, c }) => {
          c.progress = (c.progress + c.speed) % 1;
          const idx = Math.min(pts.length - 1, Math.floor(c.progress * (pts.length - 1)));
          head.position.copy(pts[idx]);
        });
      }

      // Satellites
      if (this.layers.satellites && this.layers.satellites.visible) {
        this.satellitesData.forEach(({ dot, s }) => {
          s.phase += dt * s.speed;
          const orbitR = R + s.alt / 50;
          const x = Math.cos(s.phase) * orbitR;
          const z = Math.sin(s.phase) * orbitR;
          const y = 0;
          // Rotate by inclination
          const inc = s.inclination * DEG;
          dot.position.set(x, y * Math.cos(inc) - z * Math.sin(inc), y * Math.sin(inc) + z * Math.cos(inc));
        });
      }

      // News pulse
      if (this.layers.news && this.layers.news.visible) {
        this.layers.news.children.forEach(ch => {
          if (ch.userData && ch.userData.kind === 'newsRing') {
            ch.userData.t += dt * 2;
            const s = 1 + (Math.sin(ch.userData.t) + 1) * 0.3;
            ch.scale.setScalar(s);
            if (ch.material) ch.material.opacity = (ch.material.userData.baseOpacity || 0.6) * (0.4 + 0.6 * (1 - ((Math.sin(ch.userData.t) + 1) / 2))) * (this.layerOpacity.news || 1);
          }
        });
      }

      // Storm spin
      if (this.layers.climate && this.layers.climate.visible) {
        this.layers.climate.children.forEach(ch => {
          if (ch.userData && ch.userData.kind === 'storm') {
            ch.rotation.z -= dt * 0.4;
          }
        });
      }

      // Hover pick
      this.raycaster.setFromCamera(this.pointer, this.camera);
      const pickable = [];
      Object.values(this.layers).forEach(layer => {
        if (layer.visible) layer.traverse(o => { if (o.userData && o.userData.kind) pickable.push(o); });
      });
      const hits = this.raycaster.intersectObjects(pickable, false);
      if (hits.length) this.renderer.domElement.style.cursor = 'crosshair';
      else this.renderer.domElement.style.cursor = 'grab';

      this.renderer.render(this.scene, this.camera);
      requestAnimationFrame(tick);
    };
    tick();
  };

  // Zoom helpers
  GlobeEngine.prototype.zoomBy = function (factor) {
    this.targetZ = Math.max(140, Math.min(600, this.targetZ * factor));
  };
  GlobeEngine.prototype.resetView = function () {
    this.targetZ = 320;
    this.rotationX = 0.15;
    this.autoSpin = true;
  };

  return {
    create: (el, theme) => new GlobeEngine(el, theme),
  };
})();
