const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');

router.get('/', async (req, res) => {
  try {
    const response = await fetch('https://opensky-network.org/api/states/all');
    const data = await response.json();

    const flights = (data.states || [])
      .map(f => ({
        id: f[0],
        callsign: f[1]?.trim(),
        country: f[2],
        lon: f[5],
        lat: f[6],
        alt: f[7],
        velocity: f[9],
      }))
      .filter(f => f.lat && f.lon);

    res.json(flights);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch flights' });
  }
});

module.exports = router;
