// collect-hormuz.js
// Connects to AISStream, listens over the Strait of Hormuz for a fixed
// window, merges position + static data by MMSI, writes a JSON snapshot.
//
// Usage:  node collect-hormuz.js
// Output: ../data/hormuz-vessels.json

require('dotenv').config();
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

const API_KEY = process.env.AISSTREAM_KEY;
if (!API_KEY) {
  console.error('Missing AISSTREAM_KEY. Create globaldata-api/.env with AISSTREAM_KEY=yourkey');
  process.exit(1);
}

// Strait of Hormuz + approaches. [[swLat, swLon], [neLat, neLon]]
const HORMUZ_BOX = [[24.0, 54.0], [27.5, 58.0]];

const LISTEN_MS = 90_000;        // how long to collect before writing
const OUT_PATH = path.join(__dirname, '..', 'data', 'hormuz-vessels.json');

const vessels = new Map();       // mmsi -> merged record
let positionCount = 0;
let staticCount = 0;
let loggedSamplePosition = false;
let loggedSampleStatic = false;

const ws = new WebSocket('wss://stream.aisstream.io/v0/stream');

ws.on('open', () => {
  console.log('Connected. Subscribing to Hormuz box...');
  ws.send(JSON.stringify({
    APIKey: API_KEY,
    BoundingBoxes: [HORMUZ_BOX],
    FilterMessageTypes: ['PositionReport', 'ShipStaticData'],
  }));
  console.log(`Listening for ${LISTEN_MS / 1000}s...`);
  setTimeout(finish, LISTEN_MS);
});

ws.on('message', raw => {
  let msg;
  try { msg = JSON.parse(raw); } catch { return; }

  // AISStream sends an error object if the subscription is malformed
  if (msg.error) {
    console.error('AISStream error:', msg.error);
    return;
  }

  const meta = msg.MetaData || {};
  const mmsi = String(meta.MMSI || meta.MMSI_String || '').trim();
  if (!mmsi) return;

  const existing = vessels.get(mmsi) || { mmsi };

  if (msg.MessageType === 'PositionReport') {
    positionCount++;
    if (!loggedSamplePosition) {
      console.log('\n--- sample PositionReport ---');
      console.log(JSON.stringify(msg, null, 2).slice(0, 1200));
      loggedSamplePosition = true;
    }
    const p = msg.Message?.PositionReport || {};
    existing.lat = p.Latitude ?? meta.latitude;
    existing.lon = p.Longitude ?? meta.longitude;
    existing.sog = p.Sog;
    existing.cog = p.Cog;
    existing.heading = p.TrueHeading;
    existing.navStatus = p.NavigationalStatus;
    existing.ts = meta.time_utc || new Date().toISOString();
    if (meta.ShipName) existing.name = String(meta.ShipName).trim();
  }

  if (msg.MessageType === 'ShipStaticData') {
    staticCount++;
    if (!loggedSampleStatic) {
      console.log('\n--- sample ShipStaticData ---');
      console.log(JSON.stringify(msg, null, 2).slice(0, 1200));
      loggedSampleStatic = true;
    }
    const s = msg.Message?.ShipStaticData || {};
    existing.name = (s.Name || meta.ShipName || existing.name || '').trim();
    existing.destination = (s.Destination || '').trim();
    existing.imo = s.ImoNumber;
    existing.callsign = (s.CallSign || '').trim();
    existing.shipType = s.Type;
    existing.draught = s.MaximumStaticDraught;
  }

  vessels.set(mmsi, existing);
});

ws.on('error', err => {
  console.error('WebSocket error:', err.message);
});

function finish() {
  const list = [...vessels.values()].filter(v => v.lat != null && v.lon != null);

  const withDest = list.filter(v => v.destination).length;
  const payload = {
    generatedAt: new Date().toISOString(),
    boundingBox: HORMUZ_BOX,
    listenSeconds: LISTEN_MS / 1000,
    counts: {
      vessels: list.length,
      withDestination: withDest,
      positionMessages: positionCount,
      staticMessages: staticCount,
    },
    vessels: list,
  };

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, JSON.stringify(payload, null, 2));

  console.log('\n===== RESULT =====');
  console.log(`Vessels with position: ${list.length}`);
  console.log(`Of those, with a destination string: ${withDest}`);
  console.log(`Raw messages: ${positionCount} position, ${staticCount} static`);
  console.log(`Written to: ${OUT_PATH}`);

  const samples = list.filter(v => v.destination).slice(0, 25);
  if (samples.length) {
    console.log('\nDestination strings seen:');
    samples.forEach(v => {
      console.log(`  ${v.mmsi}  ${(v.name || '?').padEnd(24)}  "${v.destination}"`);
    });
  }

  ws.close();
  process.exit(0);
}
