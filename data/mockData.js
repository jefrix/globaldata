// Mock data for all intel layers. All coordinates are [lat, lon].
window.MOCK_DATA = (() => {
  // Utility
  const rand = (min, max) => min + Math.random() * (max - min);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  // Major cities (for geographic layer + news anchors)
  const CITIES = [
    { name: "New York",     lat: 40.71, lon: -74.01, pop: 8.3, country: "USA" },
    { name: "Los Angeles",  lat: 34.05, lon: -118.24, pop: 4.0, country: "USA" },
    { name: "Chicago",      lat: 41.88, lon: -87.63, pop: 2.7, country: "USA" },
    { name: "Mexico City",  lat: 19.43, lon: -99.13, pop: 9.2, country: "MEX" },
    { name: "São Paulo",    lat: -23.55, lon: -46.63, pop: 12.3, country: "BRA" },
    { name: "Buenos Aires", lat: -34.60, lon: -58.38, pop: 3.1, country: "ARG" },
    { name: "Lima",         lat: -12.05, lon: -77.04, pop: 9.7, country: "PER" },
    { name: "Bogotá",       lat: 4.71, lon: -74.07, pop: 7.4, country: "COL" },
    { name: "London",       lat: 51.51, lon: -0.13, pop: 9.0, country: "GBR" },
    { name: "Paris",        lat: 48.86, lon: 2.35, pop: 2.2, country: "FRA" },
    { name: "Berlin",       lat: 52.52, lon: 13.40, pop: 3.7, country: "DEU" },
    { name: "Madrid",       lat: 40.42, lon: -3.70, pop: 3.3, country: "ESP" },
    { name: "Rome",         lat: 41.90, lon: 12.50, pop: 2.9, country: "ITA" },
    { name: "Moscow",       lat: 55.76, lon: 37.62, pop: 12.5, country: "RUS" },
    { name: "Kyiv",         lat: 50.45, lon: 30.52, pop: 2.9, country: "UKR" },
    { name: "Istanbul",     lat: 41.01, lon: 28.98, pop: 15.5, country: "TUR" },
    { name: "Cairo",        lat: 30.04, lon: 31.24, pop: 10.2, country: "EGY" },
    { name: "Lagos",        lat: 6.52, lon: 3.38, pop: 15.4, country: "NGA" },
    { name: "Nairobi",      lat: -1.29, lon: 36.82, pop: 4.4, country: "KEN" },
    { name: "Johannesburg", lat: -26.20, lon: 28.05, pop: 5.6, country: "ZAF" },
    { name: "Tehran",       lat: 35.69, lon: 51.39, pop: 9.0, country: "IRN" },
    { name: "Riyadh",       lat: 24.71, lon: 46.68, pop: 7.6, country: "SAU" },
    { name: "Dubai",        lat: 25.20, lon: 55.27, pop: 3.3, country: "ARE" },
    { name: "Karachi",      lat: 24.86, lon: 67.00, pop: 16.1, country: "PAK" },
    { name: "Mumbai",       lat: 19.08, lon: 72.88, pop: 20.4, country: "IND" },
    { name: "Delhi",        lat: 28.61, lon: 77.21, pop: 32.0, country: "IND" },
    { name: "Bangkok",      lat: 13.76, lon: 100.50, pop: 10.5, country: "THA" },
    { name: "Singapore",    lat: 1.35, lon: 103.82, pop: 5.9, country: "SGP" },
    { name: "Jakarta",      lat: -6.21, lon: 106.85, pop: 10.6, country: "IDN" },
    { name: "Manila",       lat: 14.60, lon: 120.98, pop: 13.5, country: "PHL" },
    { name: "Hong Kong",    lat: 22.32, lon: 114.17, pop: 7.5, country: "HKG" },
    { name: "Shanghai",     lat: 31.23, lon: 121.47, pop: 27.0, country: "CHN" },
    { name: "Beijing",      lat: 39.90, lon: 116.40, pop: 21.5, country: "CHN" },
    { name: "Seoul",        lat: 37.57, lon: 126.98, pop: 9.7, country: "KOR" },
    { name: "Tokyo",        lat: 35.68, lon: 139.69, pop: 37.4, country: "JPN" },
    { name: "Sydney",       lat: -33.87, lon: 151.21, pop: 5.3, country: "AUS" },
    { name: "Melbourne",    lat: -37.81, lon: 144.96, pop: 5.1, country: "AUS" },
    { name: "Auckland",     lat: -36.85, lon: 174.76, pop: 1.7, country: "NZL" },
    { name: "Anchorage",    lat: 61.22, lon: -149.90, pop: 0.3, country: "USA" },
    { name: "Vancouver",    lat: 49.28, lon: -123.12, pop: 2.6, country: "CAN" },
    { name: "Toronto",      lat: 43.65, lon: -79.38, pop: 6.2, country: "CAN" },
  ];

  const dataCenters = [
    { id: 'DC-SWITCH-CITADEL', name: 'Switch Citadel Campus', owner: 'Switch', operator: 'Switch', type: 'Colocation / hyperscale campus', city: 'Tahoe Reno / Sparks', country: 'USA', region: 'Nevada', lat: 39.52, lon: -119.57, powerMw: 650, powerLabel: 'Up to 650 MW campus power', computeCapacity: 'Exact server/GPU fleet undisclosed; exascale colocation power proxy', facilitySize: 'Up to 7.2M sq ft planned', network: 'Switch SUPERLOOP / carrier-neutral colocation', status: 'Operational / expanding', sourceName: 'Switch', sourceUrl: 'https://www.switch.com/switch-tahoe-reno-data-center-now-open/', confidence: 'public campus disclosure' },
    { id: 'DC-START-SINES', name: 'SINES Data Campus', owner: 'Start Campus', operator: 'Start Campus', type: 'AI / cloud / HPC hyperscale campus', city: 'Sines', country: 'PRT', region: 'Portugal Atlantic edge', lat: 37.96, lon: -8.86, powerMw: 1200, powerLabel: '1.2 GW campus; SIN01 33 MW announced', computeCapacity: 'Built for high-density AI, cloud and HPC; exact deployed compute undisclosed', facilitySize: 'Multi-building gigascale campus', network: 'Atlantic subsea cable landing ecosystem', status: 'SIN01 operational; campus buildout underway', sourceName: 'Start Campus', sourceUrl: 'https://www.startcampus.pt/sines', confidence: 'public campus disclosure' },
    { id: 'DC-AIRTRUNK-TOK1', name: 'AirTrunk TOK1', owner: 'AirTrunk', operator: 'AirTrunk', type: 'Hyperscale campus', city: 'Tokyo', country: 'JPN', region: 'Inzai / Tokyo metro', lat: 35.83, lon: 140.15, powerMw: 300, powerLabel: '300MW+ campus platform', computeCapacity: 'Hyperscale cloud/AI capacity; exact customer compute undisclosed', facilitySize: 'Multi-phase campus', network: 'Tokyo cloud and carrier ecosystem', status: 'Operational / expanding', sourceName: 'AirTrunk sustainability report', sourceUrl: 'https://airtrunk.com/wp-content/uploads/2023/01/airtrunk-sustainability-report-2022-online.pdf', confidence: 'public operator report' },
    { id: 'DC-NTT-PHOENIX', name: 'NTT Phoenix Campus', owner: 'NTT DATA', operator: 'NTT Global Data Centers', type: 'AI-ready colocation campus', city: 'Mesa / Phoenix', country: 'USA', region: 'Arizona', lat: 33.31, lon: -111.64, powerMw: 240, powerLabel: 'Over 240 MW IT load when fully operational', computeCapacity: 'High-density AI workloads supported; exact racks/server count undisclosed', facilitySize: '102-acre campus', network: 'Phoenix regional carrier ecosystem', status: 'Operational / phased campus', sourceName: 'NTT DATA', sourceUrl: 'https://services.global.ntt/en-us/services-and-products/global-data-centers/global-locations/americas/phoenix-data-centers', confidence: 'public operator disclosure' },
    { id: 'DC-VANTAGE-CWL1', name: 'Vantage Cardiff CWL1', owner: 'Vantage Data Centers', operator: 'Vantage Data Centers', type: 'Hyperscale / colocation campus', city: 'Newport / Cardiff', country: 'GBR', region: 'South Wales', lat: 51.57, lon: -3.03, powerMw: 148, powerLabel: '148 MW critical IT load', computeCapacity: 'Rack density from 2 kW to 125 kW+; exact deployed compute undisclosed', facilitySize: '2M sq ft / 3 data centers', network: 'Carrier-neutral campus near London corridor', status: 'Operational / expanding', sourceName: 'Vantage Data Centers', sourceUrl: 'https://vantage-dc.com/data-center-locations/emea/cardiff-united-kingdom/', confidence: 'public operator disclosure' },
    { id: 'DC-AIRTRUNK-SYD2', name: 'AirTrunk SYD2', owner: 'AirTrunk', operator: 'AirTrunk', type: 'Hyperscale campus', city: 'Sydney', country: 'AUS', region: 'Lane Cove West', lat: -33.81, lon: 151.15, powerMw: 110, powerLabel: '110 MW total capacity once complete', computeCapacity: 'Hyperscale cloud capacity; exact deployed compute undisclosed', facilitySize: 'Four-phase hyperscale facility', network: 'Sydney cloud and carrier ecosystem', status: 'Operational / phased buildout', sourceName: 'Data Center Dynamics', sourceUrl: 'https://www.datacenterdynamics.com/en/news/airtrunk-opens-second-hyperscale-sydney-data-center/', confidence: 'public operator/news disclosure' },
    { id: 'DC-VANTAGE-JNB1', name: 'Vantage Johannesburg JNB1', owner: 'Vantage Data Centers', operator: 'Vantage Data Centers', type: 'Hyperscale / colocation campus', city: 'Johannesburg', country: 'ZAF', region: 'Waterfall City', lat: -26.02, lon: 28.10, powerMw: 80, powerLabel: '80 MW critical IT capacity campus', computeCapacity: 'Hyperscale cloud/enterprise capacity; exact deployed compute undisclosed', facilitySize: '650K sq ft / 3 planned data centers', network: 'Sub-Saharan Africa cloud hub / carrier-neutral', status: 'First facility operational; campus expanding', sourceName: 'Vantage Data Centers', sourceUrl: 'https://vantage-dc.com/news/vantage-data-centers-opens-johannesburg-data-center-campus-breaks-ground-on-additional-data-center-in-frankfurt/', confidence: 'public operator disclosure' },
    { id: 'DC-QTS-ATL1', name: 'QTS Atlanta Metro ATL1', owner: 'QTS', operator: 'QTS', type: 'Enterprise / hyperscale data center', city: 'Atlanta', country: 'USA', region: 'Georgia', lat: 33.75, lon: -84.39, powerMw: 70, powerLabel: '70MW+ critical power capacity', computeCapacity: 'Enterprise/hyperscale suites; exact deployed compute undisclosed', facilitySize: '531K sq ft data center footprint', network: 'Southeast US carrier ecosystem', status: 'Operational', sourceName: 'QTS data sheet', sourceUrl: 'https://qtsdatacenters.com/-/media/resources/data-sheets/qts_datasheet_atl1-dc1.pdf', confidence: 'public operator data sheet' },
    { id: 'DC-VANTAGE-BER1', name: 'Vantage Berlin BER1', owner: 'Vantage Data Centers', operator: 'Vantage Data Centers', type: 'Hyperscale campus', city: 'Berlin / Brandenburg', country: 'DEU', region: 'Brandenburg Park', lat: 52.28, lon: 13.45, powerMw: 56, powerLabel: '56 MW critical IT load', computeCapacity: '300 W/sq ft average density; exact deployed compute undisclosed', facilitySize: '474K sq ft / 4 data centers', network: 'Berlin-Brandenburg cloud corridor', status: 'Operational / full campus plan', sourceName: 'Vantage Data Centers', sourceUrl: 'https://vantage-dc.com/data-center-locations/emea/berlin-i-germany/', confidence: 'public operator disclosure' },
    { id: 'DC-YOTTA-NM1', name: 'Yotta NM1', owner: 'Yotta Infrastructure', operator: 'Yotta Infrastructure', type: 'Tier IV hyperscale data center', city: 'Navi Mumbai', country: 'IND', region: 'Maharashtra', lat: 18.99, lon: 73.12, powerMw: 52, powerLabel: '52 MW IT load', computeCapacity: '7,000+ racks public capacity; exact installed compute undisclosed', facilitySize: '820K sq ft / 16 floors', network: 'Carrier-neutral India cloud/content hub', status: 'Operational', sourceName: 'Yotta', sourceUrl: 'https://yotta.com/data-center/', confidence: 'public operator disclosure' },
    { id: 'DC-GOOGLE-DALLES', name: 'Google The Dalles', owner: 'Google', operator: 'Google', type: 'Owned hyperscale data center', city: 'The Dalles', country: 'USA', region: 'Oregon', lat: 45.60, lon: -121.18, powerMw: null, powerLabel: 'Power / compute capacity not publicly disclosed', computeCapacity: 'Google-owned data center; exact server/GPU fleet undisclosed', facilitySize: '$2.4B+ Oregon investment disclosed', network: 'Google global private network', status: 'Operational / expanding', sourceName: 'Google Data Centers', sourceUrl: 'https://datacenters.google/locations/oregon/', confidence: 'public location disclosure' },
    { id: 'DC-GOOGLE-HAMINA', name: 'Google Hamina', owner: 'Google', operator: 'Google', type: 'Owned hyperscale data center', city: 'Hamina', country: 'FIN', region: 'Finland', lat: 60.57, lon: 27.20, powerMw: null, powerLabel: 'Power / compute capacity not publicly disclosed', computeCapacity: 'Google data center campus; exact server/GPU fleet undisclosed', facilitySize: 'Public expansion/investment disclosed', network: 'Google global private network / Nordic connectivity', status: 'Operational / expanding', sourceName: 'Google Data Centers', sourceUrl: 'https://datacenters.google/locations/finland/', confidence: 'public location disclosure' },
    { id: 'DC-META-PRINEVILLE', name: 'Meta Prineville', owner: 'Meta Platforms', operator: 'Meta', type: 'Owned hyperscale data center campus', city: 'Prineville', country: 'USA', region: 'Oregon', lat: 44.30, lon: -120.85, powerMw: 30, powerLabel: 'Original phase cited at 30 MW; full campus compute undisclosed', computeCapacity: 'Meta-owned hyperscale campus; exact server/GPU fleet undisclosed', facilitySize: 'Nearly 4.6M sq ft campus announced by Meta', network: 'Meta global infrastructure', status: 'Operational / multi-building campus', sourceName: 'Meta Data Centers', sourceUrl: 'https://datacenters.atmeta.com/2021/03/facebooks-prineville-data-center-is-growing-again/', confidence: 'public operator disclosure' },
    { id: 'DC-AWS-IAD', name: 'AWS US-East Northern Virginia', owner: 'Amazon Web Services', operator: 'AWS', type: 'Cloud region / availability-zone cluster', city: 'Ashburn / Northern Virginia', country: 'USA', region: 'US-East-1', lat: 39.04, lon: -77.49, powerMw: null, powerLabel: 'Facility power not publicly disclosed', computeCapacity: 'AWS region with multiple Availability Zones; exact data center count and compute undisclosed', facilitySize: 'Regional cloud cluster, not a single building', network: 'AWS global backbone / high-bandwidth AZ fabric', status: 'Operational cloud region', sourceName: 'AWS Global Infrastructure', sourceUrl: 'https://aws.amazon.com/about-aws/global-infrastructure/regions_az/', confidence: 'public cloud-region disclosure' },
    { id: 'DC-AWS-FRA', name: 'AWS Europe Frankfurt', owner: 'Amazon Web Services', operator: 'AWS', type: 'Cloud region / availability-zone cluster', city: 'Frankfurt', country: 'DEU', region: 'eu-central-1', lat: 50.11, lon: 8.68, powerMw: null, powerLabel: 'Facility power not publicly disclosed', computeCapacity: 'AWS region with multiple Availability Zones; exact compute undisclosed', facilitySize: 'Regional cloud cluster, not a single building', network: 'AWS global backbone / Frankfurt interconnect market', status: 'Operational cloud region', sourceName: 'AWS Global Infrastructure', sourceUrl: 'https://aws.amazon.com/about-aws/global-infrastructure/regions_az/', confidence: 'public cloud-region disclosure' },
    { id: 'DC-AZURE-DUBLIN', name: 'Microsoft Azure Ireland', owner: 'Microsoft', operator: 'Microsoft Azure', type: 'Cloud region / data center cluster', city: 'Dublin', country: 'IRL', region: 'North Europe', lat: 53.35, lon: -6.26, powerMw: null, powerLabel: 'Facility power not publicly disclosed', computeCapacity: 'Azure region capacity; exact deployed compute undisclosed', facilitySize: 'Regional cloud cluster, not a single building', network: 'Microsoft global network / Azure fabric', status: 'Operational cloud region', sourceName: 'Microsoft Azure geographies', sourceUrl: 'https://azure.microsoft.com/explore/global-infrastructure/geographies/', confidence: 'public cloud-region disclosure' },
    { id: 'DC-GCP-SINGAPORE', name: 'Google Cloud Singapore Region', owner: 'Google', operator: 'Google Cloud', type: 'Cloud region / zone cluster', city: 'Singapore', country: 'SGP', region: 'asia-southeast1', lat: 1.35, lon: 103.82, powerMw: null, powerLabel: 'Facility power not publicly disclosed', computeCapacity: 'Google Cloud region; exact deployed compute undisclosed', facilitySize: 'Regional cloud cluster, not a single building', network: 'Google Cloud global backbone', status: 'Operational cloud region', sourceName: 'Google Cloud locations', sourceUrl: 'https://cloud.google.com/about/locations/', confidence: 'public cloud-region disclosure' },
  ];

  // News events — the "heat" is number of sources reporting (1..50)
  const NEWS_TEMPLATES = [
    { cat: "POL", title: "Election protests intensify" },
    { cat: "POL", title: "Summit negotiations underway" },
    { cat: "ECO", title: "Market volatility triggers trading halt" },
    { cat: "ECO", title: "Central bank emergency session" },
    { cat: "SEC", title: "Embassy security alert issued" },
    { cat: "SEC", title: "Checkpoint incident reported" },
    { cat: "NAT", title: "Seismic activity detected" },
    { cat: "NAT", title: "Severe weather warning" },
    { cat: "NAT", title: "Wildfire containment effort" },
    { cat: "HLT", title: "Outbreak surveillance update" },
    { cat: "INF", title: "Power grid disturbance" },
    { cat: "INF", title: "Port operations suspended" },
    { cat: "MIL", title: "Military exercise commenced" },
    { cat: "MIL", title: "Airspace restriction in effect" },
  ];

  const news = [];
  for (let i = 0; i < 80; i++) {
    const c = pick(CITIES);
    const t = pick(NEWS_TEMPLATES);
    news.push({
      id: 'NW-' + (1000 + i),
      lat: c.lat + rand(-1.5, 1.5),
      lon: c.lon + rand(-1.5, 1.5),
      city: c.name,
      country: c.country,
      sources: Math.floor(rand(1, 48)),
      category: t.cat,
      title: t.title,
      ts: Date.now() - Math.floor(rand(0, 6 * 3600 * 1000)),
    });
  }

  // Flights — generate arcs between airports
  const AIRPORTS = CITIES.filter(c => c.pop > 2.0);
  const flights = [];
  for (let i = 0; i < 140; i++) {
    const a = pick(AIRPORTS);
    let b = pick(AIRPORTS);
    while (b === a) b = pick(AIRPORTS);
    flights.push({
      id: pick(["UA","DL","AA","BA","LH","AF","EK","QR","SQ","JL","AC","KE","CX","TK"]) + Math.floor(rand(100, 9999)),
      origin: a,
      dest: b,
      progress: Math.random(),
      speed: rand(0.0008, 0.0022),
      alt: Math.floor(rand(32000, 42000)),
    });
  }

  // Shipping lanes (logistics) — major chokepoints and trunk routes
  const SHIPPING = [
    // Trans-Pacific
    [[34.05,-118.24],[40,-160],[35.68,139.69]],
    [[37.57,-122.40],[35,-170],[31.23,121.47]],
    // Trans-Atlantic
    [[40.71,-74.01],[45,-40],[51.51,-0.13]],
    [[25.77,-80.19],[35,-50],[36.12,-5.35]],
    // Panama Canal
    [[40.71,-74.01],[15,-65],[9.08,-79.68],[5,-85],[-12.05,-77.04]],
    // Suez Canal
    [[41.01,28.98],[32,30],[30,32.5],[25,35],[12.5,45],[1.35,103.82]],
    // Cape of Good Hope
    [[36.12,-5.35],[20,-15],[0,-5],[-20,5],[-34,18],[-20,40],[-5,70],[22,60]],
    // Strait of Malacca
    [[1.35,103.82],[5,95],[10,85],[15,72],[25,60]],
    // Arctic
    [[71,-156],[75,-140],[78,-100],[80,-60],[80,0],[78,60],[75,110],[70,150]],
  ];
  const vessels = [];
  SHIPPING.forEach((lane, li) => {
    const count = Math.floor(rand(4, 9));
    for (let i = 0; i < count; i++) {
      vessels.push({
        id: 'MV-' + li + '-' + i,
        type: pick(['container','oil','lng','container','container']),
        name: 'Estimated merchant vessel ' + li + '-' + i,
        lane: li,
        progress: Math.random(),
        speed: rand(0.0002, 0.0006),
        dir: Math.random() > 0.5 ? 1 : -1,
        status: 'Estimated underway',
        source: 'Mock public shipping lane estimate',
      });
    }
  });

  const militaryBases = [
    { id: 'MIL-RAMSTEIN', name: 'Ramstein Air Base', country: 'Germany', function: 'Air Base', region: 'Europe', lat: 49.44, lon: 7.60 },
    { id: 'MIL-ROTA', name: 'Naval Station Rota', country: 'Spain', function: 'Naval Base', region: 'Europe', lat: 36.62, lon: -6.35 },
    { id: 'MIL-NORFOLK', name: 'Naval Station Norfolk', country: 'United States', function: 'Naval Base', region: 'North America', lat: 36.95, lon: -76.33 },
    { id: 'MIL-SAN-DIEGO', name: 'Naval Base San Diego', country: 'United States', function: 'Naval Base', region: 'North America', lat: 32.68, lon: -117.12 },
    { id: 'MIL-PEARL', name: 'Joint Base Pearl Harbor-Hickam', country: 'United States', function: 'Joint Naval/Air Base', region: 'Pacific', lat: 21.35, lon: -157.95 },
    { id: 'MIL-YOKOSUKA', name: 'Fleet Activities Yokosuka', country: 'Japan', function: 'Naval Base', region: 'Pacific', lat: 35.29, lon: 139.67 },
    { id: 'MIL-OSAN', name: 'Osan Air Base', country: 'South Korea', function: 'Air Base', region: 'Pacific', lat: 37.09, lon: 127.03 },
    { id: 'MIL-GUAM', name: 'Naval Base Guam', country: 'United States', function: 'Naval Base', region: 'Pacific', lat: 13.44, lon: 144.66 },
    { id: 'MIL-DIEGO-GARCIA', name: 'Diego Garcia', country: 'United Kingdom', function: 'Joint Support Facility', region: 'Indian Ocean', lat: -7.31, lon: 72.41 },
    { id: 'MIL-BAHRAIN', name: 'Naval Support Activity Bahrain', country: 'Bahrain', function: 'Naval Base', region: 'Middle East', lat: 26.20, lon: 50.61 },
    { id: 'MIL-INCIRLIK', name: 'Incirlik Air Base', country: 'Turkey', function: 'Air Base', region: 'Middle East', lat: 37.00, lon: 35.43 },
    { id: 'MIL-DJIBOUTI', name: 'Camp Lemonnier', country: 'Djibouti', function: 'Expeditionary Base', region: 'Horn of Africa', lat: 11.55, lon: 43.15 },
    { id: 'MIL-AKROTIRI', name: 'RAF Akrotiri', country: 'United Kingdom', function: 'Air Base', region: 'Eastern Mediterranean', lat: 34.59, lon: 32.99 },
    { id: 'MIL-DARWIN', name: 'Robertson Barracks', country: 'Australia', function: 'Army Base', region: 'Pacific', lat: -12.44, lon: 130.97 },
  ];

  const militaryShips = [
    { id: 'NAV-ATL-01', name: 'Atlantic Surface Group', country: 'United States', function: 'Naval Ship', region: 'North Atlantic', lat: 36.2, lon: -45.0, type: 'military' },
    { id: 'NAV-MED-01', name: 'Mediterranean Task Group', country: 'NATO', function: 'Naval Ship', region: 'Mediterranean', lat: 34.7, lon: 18.4, type: 'military' },
    { id: 'NAV-GULF-01', name: 'Gulf Patrol Group', country: 'United States', function: 'Naval Ship', region: 'Persian Gulf', lat: 25.9, lon: 54.5, type: 'military' },
    { id: 'NAV-IO-01', name: 'Indian Ocean Surface Group', country: 'United Kingdom', function: 'Naval Ship', region: 'Indian Ocean', lat: -4.5, lon: 68.0, type: 'military' },
    { id: 'NAV-SCS-01', name: 'South China Sea Patrol', country: 'United States', function: 'Naval Ship', region: 'South China Sea', lat: 12.2, lon: 114.5, type: 'military' },
    { id: 'NAV-PAC-01', name: 'Western Pacific Carrier Group', country: 'United States', function: 'Naval Ship', region: 'Western Pacific', lat: 24.5, lon: 138.0, type: 'military' },
    { id: 'NAV-BALTIC-01', name: 'Baltic Maritime Patrol', country: 'NATO', function: 'Naval Ship', region: 'Baltic Sea', lat: 56.1, lon: 19.3, type: 'military' },
  ];

  // Cyber attacks — origin → target flows
  const CYBER_ORIGINS = [
    {lat:55.76,lon:37.62,label:"MOW"},
    {lat:39.90,lon:116.40,label:"PEK"},
    {lat:39.03,lon:125.75,label:"FNJ"},
    {lat:35.69,lon:51.39,label:"THR"},
    {lat:44.43,lon:26.10,label:"BUH"},
    {lat:52.23,lon:21.01,label:"WAW"},
    {lat:50.45,lon:30.52,label:"KBP"},
  ];
  const CYBER_TARGETS = [
    {lat:38.89,lon:-77.04,label:"DCA"},
    {lat:51.51,lon:-0.13,label:"LON"},
    {lat:52.52,lon:13.40,label:"BER"},
    {lat:35.68,lon:139.69,label:"TYO"},
    {lat:1.35,lon:103.82,label:"SIN"},
    {lat:-33.87,lon:151.21,label:"SYD"},
    {lat:43.65,lon:-79.38,label:"YTO"},
  ];
  const cyber = [];
  for (let i = 0; i < 60; i++) {
    cyber.push({
      id: 'CY-'+i,
      origin: pick(CYBER_ORIGINS),
      target: pick(CYBER_TARGETS),
      type: pick(['DDoS','Malware','Phishing','Intrusion','Ransomware','APT']),
      severity: pick(['LOW','MED','HIGH','CRIT']),
      progress: Math.random(),
      speed: rand(0.003, 0.008),
    });
  }

  // Satellites — orbits
  const satellites = [];
  for (let i = 0; i < 180; i++) {
    const alt = pick([
      rand(400, 800),   // LEO
      rand(400, 800),
      rand(400, 800),
      rand(400, 800),
      rand(19000, 22000), // MEO/GPS
      rand(35700, 35900), // GEO
    ]);
    satellites.push({
      id: 'SAT-' + (10000 + i),
      alt,
      inclination: rand(-85, 85),
      phase: rand(0, Math.PI * 2),
      speed: 6000 / (alt + 6371), // faster when lower
      type: alt < 2000 ? 'LEO' : alt < 30000 ? 'MEO' : 'GEO',
    });
  }

  // Conflicts — country-level threat rating [0..1]
  // We use country bounding boxes (rough) to shade on the globe.
  const conflicts = [
    { country: "Ukraine", bbox: [44, 22, 52, 40], level: 0.95, note: "Active conflict" },
    { country: "Russia (W)", bbox: [49, 28, 60, 50], level: 0.70, note: "Active operations" },
    { country: "Israel/Gaza", bbox: [29, 34, 33, 36], level: 0.88, note: "Active conflict" },
    { country: "Lebanon", bbox: [33, 35, 34.7, 36.6], level: 0.65, note: "Border skirmishes" },
    { country: "Syria", bbox: [32, 35, 37, 42], level: 0.60, note: "Insurgency" },
    { country: "Yemen", bbox: [12, 42, 19, 53], level: 0.78, note: "Civil war" },
    { country: "Sudan", bbox: [10, 22, 22, 38], level: 0.85, note: "Civil war" },
    { country: "Myanmar", bbox: [10, 92, 28, 101], level: 0.55, note: "Internal conflict" },
    { country: "DR Congo (E)", bbox: [-5, 27, 2, 31], level: 0.50, note: "Insurgency" },
    { country: "Ethiopia/Tigray", bbox: [11, 36, 15, 42], level: 0.35, note: "Unrest" },
    { country: "Mali/Sahel", bbox: [12, -5, 18, 4], level: 0.40, note: "Insurgency" },
    { country: "Taiwan Strait", bbox: [22, 118, 26, 122], level: 0.25, note: "Elevated" },
    { country: "Korean DMZ", bbox: [37, 126, 39, 129], level: 0.20, note: "Standby" },
    { country: "Kashmir", bbox: [32, 73, 35, 78], level: 0.30, note: "Skirmishes" },
  ];

  // Storms (nature)
  const storms = [
    { id: "ST-01", type: "hurricane", lat: 22, lon: -72, radius: 8, cat: 3 },
    { id: "ST-02", type: "typhoon",   lat: 18, lon: 130, radius: 10, cat: 4 },
    { id: "ST-03", type: "cyclone",   lat: -14, lon: 90, radius: 6, cat: 2 },
    { id: "ST-04", type: "storm",     lat: 55, lon: -20, radius: 12, cat: 1 },
    { id: "ST-05", type: "storm",     lat: -45, lon: 30, radius: 9, cat: 2 },
    { id: "ST-06", type: "typhoon",   lat: 12, lon: 145, radius: 7, cat: 3 },
  ];

  // Topography (geologic) — mountain ranges as polylines
  const mountains = [
    { name: "Rockies",       pts: [[60,-130],[55,-125],[49,-120],[43,-110],[37,-106],[33,-107]] },
    { name: "Andes",         pts: [[10,-72],[0,-77],[-10,-76],[-20,-68],[-30,-70],[-40,-71],[-50,-73]] },
    { name: "Himalaya",      pts: [[36,72],[35,78],[33,83],[30,88],[28,91],[27,96],[28,98]] },
    { name: "Alps",          pts: [[45,6],[46,9],[47,11],[47,13],[46,15]] },
    { name: "Urals",         pts: [[68,65],[64,60],[60,58],[55,58],[52,58]] },
    { name: "Atlas",         pts: [[35,-5],[33,-2],[32,2],[34,6],[35,9]] },
    { name: "Great Dividing",pts: [[-15,145],[-22,148],[-28,151],[-34,150],[-37,148]] },
    { name: "Appalachian",   pts: [[45,-68],[42,-73],[38,-79],[35,-83],[33,-84]] },
    { name: "Zagros",        pts: [[38,46],[34,48],[30,51],[27,55]] },
    { name: "Scandinavian",  pts: [[70,22],[67,16],[63,10],[60,7]] },
  ];

  // Major rivers
  const rivers = [
    { name: "Amazon",      pts: [[-2,-78],[-3,-72],[-3,-66],[-2,-60],[-1,-55],[-0.5,-50]] },
    { name: "Nile",        pts: [[31,30],[27,31],[22,32],[15,33],[8,32],[3,32]] },
    { name: "Mississippi", pts: [[30,-90],[32,-91],[35,-90],[38,-90],[42,-91],[45,-93]] },
    { name: "Yangtze",     pts: [[31,121],[30,115],[30,108],[30,100],[33,96],[35,91]] },
    { name: "Ganges",      pts: [[22,89],[24,85],[25,82],[26,80],[28,78],[30,78]] },
    { name: "Volga",       pts: [[46,48],[49,46],[52,48],[55,49],[57,50],[58,52]] },
    { name: "Danube",      pts: [[48,17],[48,19],[47,21],[46,27],[45,29],[45,30]] },
    { name: "Congo",       pts: [[-6,12],[-4,16],[-2,18],[0,22],[1,26],[2,29]] },
    { name: "Mekong",      pts: [[10,106],[12,105],[15,106],[18,104],[22,100],[28,97]] },
    { name: "Ob",          pts: [[67,69],[64,66],[60,72],[56,76],[53,78]] },
  ];

  // Trucking routes (fewer — land only)
  const trucking = [
    [[40.71,-74.01],[41.88,-87.63],[39.74,-104.99],[34.05,-118.24]], // US transcontinental
    [[43.65,-79.38],[45.50,-73.57],[40.71,-74.01]], // Toronto-NYC
    [[51.51,-0.13],[48.86,2.35],[50.85,4.35],[52.37,4.90],[52.52,13.40]], // UK-EU
    [[52.52,13.40],[50.07,14.43],[48.20,16.37],[47.50,19.04],[44.43,26.10]], // Berlin-Bucharest
    [[35.68,139.69],[34.69,135.50],[33.59,130.40]], // Japan
    [[28.61,77.21],[26.91,75.78],[23.03,72.58],[19.08,72.88]], // India NW
    [[-23.55,-46.63],[-22.91,-43.17],[-19.92,-43.94]], // Brazil SE
  ];

  return {
    CITIES, news, flights, SHIPPING, vessels, militaryBases, militaryShips, cyber, satellites,
    conflicts, storms, mountains, rivers, trucking, dataCenters
  };
})();
