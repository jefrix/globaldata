(function () {
  if (!window.GlobeEngine || !window.GlobeEngine.create || !window.THREE) return;

  const R = 100;
  const DEG = Math.PI / 180;
  const GEORGIA_COUNTIES_URL = 'https://cdn.jsdelivr.net/gh/plotly/datasets@master/geojson-counties-fips.json';
  const originalCreate = window.GlobeEngine.create;
  const STATE_CENTER = { lat: 32.72, lon: -83.35 };
  const STATE_ZOOM = 175;
  let countyPromise = null;
  let countyCache = null;

  function latLonToVec3(lat, lon, radius = R) {
    const phi = (90 - lat) * DEG;
    const theta = (lon + 180) * DEG;
    return new THREE.Vector3(
      -(radius * Math.sin(phi) * Math.cos(theta)),
      radius * Math.cos(phi),
      radius * Math.sin(phi) * Math.sin(theta)
    );
  }

  function ensureLayer(engine) {
    if (!engine.layerGroups) engine.layerGroups = {};
    if (!engine.layerGroups.local) {
      const group = new THREE.Group();
      group.visible = false;
      engine.layerGroups.local = group;
      engine.root?.add?.(group);
    }
    return engine.layerGroups.local;
  }

  function ringsFromGeometry(geometry) {
    if (!geometry) return [];
    if (geometry.type === 'Polygon') return geometry.coordinates || [];
    if (geometry.type === 'MultiPolygon') return (geometry.coordinates || []).flat();
    return [];
  }

  function ringToLatLon(ring) {
    return (ring || [])
      .map(([lon, lat]) => [Number(lat), Number(lon)])
      .filter(([lat, lon]) => Number.isFinite(lat) && Number.isFinite(lon));
  }

  function centroid(rings) {
    let lat = 0;
    let lon = 0;
    let count = 0;
    rings.forEach(ring => {
      ring.forEach(point => {
        lat += point[0];
        lon += point[1];
        count += 1;
      });
    });
    return count ? { lat: lat / count, lon: lon / count } : null;
  }

  function fallbackCounties() {
    const counties = [
      ['Fulton', 33.79, -84.47], ['DeKalb', 33.77, -84.23], ['Gwinnett', 33.96, -84.02],
      ['Cobb', 33.94, -84.57], ['Clayton', 33.54, -84.36], ['Chatham', 32.0, -81.13],
      ['Richmond', 33.36, -82.07], ['Muscogee', 32.51, -84.88], ['Bibb', 32.81, -83.69],
      ['Houston', 32.46, -83.66], ['Clarke', 33.95, -83.37], ['Lowndes', 30.84, -83.27],
      ['Dougherty', 31.53, -84.22], ['Whitfield', 34.8, -84.97], ['Glynn', 31.23, -81.5],
      ['Camden', 30.92, -81.65],
    ];
    return counties.map(([name, lat, lon], index) => ({
      id: `ga-fallback-${index}`,
      name,
      rings: [],
      center: { lat, lon },
      fallback: true,
    }));
  }

  async function loadGeorgiaCounties() {
    if (countyCache) return countyCache;
    if (!countyPromise) {
      countyPromise = fetch(GEORGIA_COUNTIES_URL)
        .then(response => {
          if (!response.ok) throw new Error(`counties HTTP ${response.status}`);
          return response.json();
        })
        .then(data => {
          const counties = (data.features || [])
            .filter(feature => String(feature.id || feature.properties?.GEO_ID || '').includes('13'))
            .filter(feature => String(feature.id || feature.properties?.STATE || '').startsWith('13') || feature.properties?.STATE === '13')
            .map(feature => {
              const rings = ringsFromGeometry(feature.geometry).map(ringToLatLon).filter(ring => ring.length > 2);
              return {
                id: feature.id || feature.properties?.GEO_ID || feature.properties?.COUNTY,
                name: feature.properties?.NAME || feature.properties?.name || 'Georgia County',
                rings,
                center: centroid(rings),
                properties: feature.properties || {},
              };
            })
            .filter(county => county.center);
          countyCache = counties.length ? counties : fallbackCounties();
          return countyCache;
        })
        .catch(() => {
          countyCache = fallbackCounties();
          return countyCache;
        });
    }
    return countyPromise;
  }

  function addCountyLine(engine, ring, color, opacity) {
    const group = ensureLayer(engine);
    const points = ring.map(([lat, lon]) => latLonToVec3(lat, lon, R + 2.15));
    if (points.length < 2) return;
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(points),
      new THREE.LineBasicMaterial({
        color,
        transparent: true,
        opacity,
        depthTest: true,
        depthWrite: false,
      })
    );
    line.renderOrder = 6;
    line.userData = { layer: 'local', kind: 'local-boundary' };
    group.add(line);
  }

  function addCountyPoint(engine, county) {
    const center = county.center;
    if (!center) return;
    const data = {
      id: county.id,
      name: `${county.name} County`,
      country: 'Georgia, USA',
      state: county.fallback ? 'County reference point' : 'County boundary',
      lat: center.lat,
      lon: center.lon,
      source: county.fallback ? 'Local Georgia fallback' : 'US county GeoJSON',
    };
    engine._addPoint?.('local', center.lat, center.lon, '#73ff9a', county.fallback ? 0.34 : 0.22, 'port', data);
  }

  function renderLocal(engine, counties) {
    ensureLayer(engine);
    engine._clearGroup?.('local');
    const lineColor = '#73ff9a';
    counties.forEach(county => {
      county.rings.forEach(ring => addCountyLine(engine, ring, lineColor, 0.36));
      addCountyPoint(engine, county);
    });
    const labelCounties = ['Fulton', 'Cobb', 'DeKalb', 'Gwinnett', 'Chatham', 'Richmond', 'Muscogee', 'Bibb', 'Clarke', 'Lowndes'];
    counties
      .filter(county => labelCounties.includes(county.name))
      .forEach(county => engine._addTextLabel?.('local', county.center.lat, county.center.lon, [county.name, 'GA COUNTY'], '#73ff9a', 10, 3.8));
  }

  function setUiActive(row, active) {
    row.classList.toggle('active', active);
    const knob = row.querySelector('[data-local-knob]');
    const button = row.querySelector('[data-local-toggle]');
    const slider = row.querySelector('input[type="range"]');
    if (button) {
      button.style.background = active ? '#73ff9a' : 'transparent';
      button.style.borderColor = active ? '#73ff9a' : 'var(--edge)';
      button.setAttribute('aria-pressed', String(active));
    }
    if (knob) {
      knob.style.left = active ? '17px' : '1px';
      knob.style.background = active ? '#000' : 'var(--text-dim)';
    }
    if (slider) slider.disabled = !active;
  }

  function applyLocal(active) {
    const engine = window.__globalDataEngine;
    if (!engine?.layerGroups?.local) return;
    engine.setLayerVisible?.('local', active);
    if (active) {
      engine.focusOn?.(STATE_CENTER.lat, STATE_CENTER.lon, STATE_ZOOM);
    }
    document.querySelectorAll('[data-local-row]').forEach(row => setUiActive(row, active));
  }

  function applyInfrastructure(active) {
    const engine = window.__globalDataEngine;
    if (!engine?.layerGroups?.infrastructure) return;
    engine.setLayerVisible?.('infrastructure', active);
    document.querySelectorAll('[data-infra-row]').forEach(row => {
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
    });
  }

  function injectUi() {
    const engine = window.__globalDataEngine;
    const layers = document.querySelector('.layers');
    if (!engine || !layers || layers.querySelector('[data-local-row]')) return;

    const row = document.createElement('div');
    row.className = 'layer-row';
    row.dataset.localRow = '1';
    row.innerHTML = [
      '<div class="layer-head">',
      '<div class="layer-idx">L</div>',
      '<div style="flex:1;min-width:0">',
      '<div class="layer-label">LOCAL</div>',
      '<div class="layer-sub">GEORGIA / COUNTY LEVEL</div>',
      '</div>',
      '<button data-local-toggle aria-pressed="false" style="width:32px;height:16px;border-radius:2px;position:relative;cursor:pointer;background:transparent;border:1px solid var(--edge);padding:0;flex-shrink:0">',
      '<span data-local-knob style="position:absolute;top:1px;left:1px;width:12px;height:12px;background:var(--text-dim);transition:left .15s"></span>',
      '</button>',
      '</div>',
      '<div class="layer-slider">',
      '<span class="sl-lbl">OPA</span>',
      '<input type="range" min="0" max="100" value="100" class="opSlider" style="--sc:#73ff9a;opacity:.3" disabled>',
      '<span class="sl-val">100</span>',
      '</div>',
    ].join('');

    const toggle = row.querySelector('[data-local-toggle]');
    const slider = row.querySelector('input[type="range"]');
    const value = row.querySelector('.sl-val');
    toggle.addEventListener('click', () => applyLocal(!engine.layerGroups.local?.visible));
    slider.addEventListener('input', event => {
      const opacity = Number(event.target.value) / 100;
      value.textContent = String(Math.round(opacity * 100)).padStart(3, '0');
      engine.setLayerOpacity?.('local', opacity);
    });

    const infra = layers.querySelector('[data-infra-row]');
    if (infra?.nextSibling) layers.insertBefore(row, infra.nextSibling);
    else layers.insertBefore(row, layers.children[2] || null);
    setUiActive(row, Boolean(engine.layerGroups.local?.visible));
  }

  window.addEventListener('keydown', event => {
    if (event.target?.tagName === 'INPUT' || event.target?.tagName === 'TEXTAREA') return;
    if (event.key !== 'l' && event.key !== 'L') return;
    const engine = window.__globalDataEngine;
    if (!engine?.layerGroups?.local) return;
    applyLocal(!engine.layerGroups.local.visible);
  });

  document.addEventListener('click', event => {
    const button = event.target?.closest?.('.rail-btn');
    if (!button) return;
    const label = String(button.textContent || '').toUpperCase();
    if (!/ALL LAYERS|CLEAR ALL/.test(label)) return;
    const next = label.includes('ALL LAYERS');
    setTimeout(() => {
      applyLocal(next);
      applyInfrastructure(next);
    }, 0);
  });

  setInterval(injectUi, 1200);

  window.GlobeEngine.create = function localLayerCreate(el, theme) {
    const engine = originalCreate(el, theme);
    window.__globalDataEngine = engine;
    const originalEnsure = engine._ensureLayerGroups?.bind(engine);
    const originalClear = engine._clearGroup?.bind(engine);
    const originalUpdate = engine.updateLiveData?.bind(engine);

    engine._ensureLayerGroups = function localEnsure() {
      originalEnsure?.();
      ensureLayer(engine);
    };
    engine._clearGroup = function localClear(id) {
      originalClear?.(id);
    };
    engine.updateLiveData = function localUpdate(data) {
      originalUpdate?.(data);
      loadGeorgiaCounties().then(counties => renderLocal(engine, counties));
    };

    engine._ensureLayerGroups();
    loadGeorgiaCounties().then(counties => renderLocal(engine, counties));
    injectUi();
    return engine;
  };
})();
