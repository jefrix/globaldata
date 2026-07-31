// collect-hormuz.js — diagnostic mode
require('dotenv').config();
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

const API_KEY = process.env.AISSTREAM_KEY;
if (!API_KEY) {
  console.error('Missing AISSTREAM_KEY in .env');
  process.exit(1);
}
console.log(`Key loaded, length ${API_KEY.length}, starts "${API_KEY.slice(0, 6)}..."`);

// Set to 'global' to test connectivity, 'hormuz' for the real box.
const MODE = process.argv[2] || 'global';

const BOXES = {
  global: [[[-90, -180], [90, 180]]],
  hormuz: [[[24.0, 54.0], [27.5, 58.0]]],
  singapore: [[[0.5, 103.0], [1.8, 104.5]]],
};
const box = BOXES[MODE];
if (!box) {
  console.error(`Unknown mode "${MODE}". Use: global | hormuz | singapore`);
  process.exit(1);
}

const LISTEN_MS = 30_000;
const OUT_PATH = path.join(__dirname, '..', 'data', 'hormuz-vessels.json');

const vessels = new Map();
let rawCount = 0, positionCount = 0, staticCount = 0;
let printedRaw = 0;

console.log(`Mode: ${MODE}`);
console.log(`Box: ${JSON.stringify(box)}`);

const ws = new WebSocket('wss://stream.aisstream.io/v0/stream');

ws.on('open', () => {
  const sub = {
    APIKey: API_KEY,
    BoundingBoxes: box,
    FilterMessageTypes: ['PositionReport', 'ShipStaticData'],
  };
  console.log('Socket open. Sending subscription...');
  ws.send(JSON.stringify(sub));
  console.log(`Listening ${LISTEN_MS / 1000}s...\n`);
  setTimeout(finish, LISTEN_MS);
});

ws.on('message', raw => {
  rawCount++;
  const text = raw.toString();

  // Dump the first 3 messages verbatim, whatever they are
  if (printedRaw < 3) {
    printedRaw++;
    console.log(`--- raw message ${printedRaw} ---`);
    console.log(text.slice(0, 1500));
    console.log('');
  }

  let msg;
  try { msg = JSON.parse(text); } catch { return; }
  if (msg.error || msg.Error) {
    console.error('SERVER ERROR:', msg.error || msg.Error);
    return;
  }

  const meta = msg.MetaData || {};
  const mmsi = String(meta.MMSI || meta.MMSI_String || '').trim();
  if (!mmsi) return;

  const v = vessels.get(mmsi) || { mmsi };

  if (msg.MessageType === 'PositionReport') {
    positionCount++;
    const p = msg.Message?.PositionReport || {};
    v.lat = p.Latitude ?? meta.latitude;
    v.lon = p.Longitude ?? meta.longitude;
    v.sog = p.Sog; v.cog = p.Cog; v.heading = p.TrueHeading;
    v.navStatus = p.NavigationalStatus;
    v.ts = meta.time_utc || new Date().toISOString();
    if (meta.ShipName) v.name = String(meta.ShipName).trim();
  }

  if (msg.MessageType === 'ShipStaticData') {
    staticCount++;
    const s = msg.Message?.ShipStaticData || {};
    v.name = (s.Name || meta.ShipName || v.name || '').trim();
    v.destination = (s.Destination || '').trim();
    v.imo = s.ImoNumber;
    v.callsign = (s.CallSign || '').trim();
    v.shipType = s.Type;
  }

  vessels.set(mmsi, v);
});

ws.on('error', err => console.error('SOCKET ERROR:', err.message));
ws.on('close', (code, reason) => {
  console.error(`SOCKET CLOSED. code=${code} reason="${reason}"`);
});

function finish() {
  const list = [...vessels.values()].filter(v => v.lat != null && v.lon != null);
  const withDest = list.filter(v => v.destination).length;

  console.log('\n===== RESULT =====');
  console.log(`Mode: ${MODE}`);
  console.log(`Raw messages received: ${rawCount}`);
  console.log(`  position: ${positionCount}, static: ${staticCount}`);
  console.log(`Unique vessels with position: ${list.length}`);
  console.log(`  with destination string: ${withDest}`);

  const samples = list.filter(v => v.destination).slice(0, 30);
  if (samples.length) {
    console.log('\nDestination strings:');
    samples.forEach(v => {
      console.log(`  ${v.mmsi}  ${(v.name || '?').padEnd(22).slice(0, 22)}  "${v.destination}"`);
    });
  }

  if (MODE === 'hormuz') {
    fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
    fs.writeFileSync(OUT_PATH, JSON.stringify({
      generatedAt: new Date().toISOString(),
      boundingBox: box,
      counts: { vessels: list.length, withDestination: withDest },
      vessels: list,
    }, null, 2));
    console.log(`\nWritten to: ${OUT_PATH}`);
  } else {
    console.log('\n(No file written — diagnostic mode only.)');
  }

  ws.close();
  process.exit(0);
}
