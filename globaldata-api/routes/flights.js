const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');

router.get('/', async (req, res) => {
  try {
    const response = await fetch('https://pocketworld.org/api/flights');
    if (!response.ok) throw new Error(`PocketWorld HTTP ${response.status}`);
    const data = await response.json();

    const flights = (data.flights || [])
      .map(f => ({
        id: f.icao24 || f.hex || f.callsign || f.registration,
        callsign: String(f.callsign || f.flight || f.icao24 || '').trim(),
        country: f.country || f.operator || f.airline || 'PocketWorld',
        lon: Number(f.lng ?? f.lon),
        lat: Number(f.lat),
        alt: Number(f.alt ?? f.baro_alt ?? f.geo_alt),
        velocity: Number(f.velocity ?? f.gs),
        heading: Number(f.heading ?? f.track),
        verticalRate: Number(f.vertical_rate ?? f.geom_rate),
        source: f.source ? `PocketWorld / ${f.source}` : 'PocketWorld',
        sourceName: 'PocketWorld flights',
        sourceQuality: f.source_quality,
        sourceType: f.source_type,
        registration: f.registration,
        manufacturer: f.manufacturer,
        model: f.model,
        typecode: f.typecode,
        operator: f.operator,
        aircraftType: f.aircraft_type,
        origin: f.origin,
        destination: f.destination,
        airline: f.airline,
        live: true,
      }))
      .filter(f => Number.isFinite(f.lat) && Number.isFinite(f.lon));

    res.json(flights);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch flights' });
  }
});

module.exports = router;
