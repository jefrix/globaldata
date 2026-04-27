const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..')));
app.use('/api/live', require('./routes/live'));

app.get('/health', (req, res) => {
  const liveCacheGeneratedAt = global.__GLOBALDATA_LIVE_CACHE_GENERATED_AT || null;
  res.json({
    ok: true,
    service: 'globaldata-api',
    time: new Date().toISOString(),
    liveCacheAgeMs: liveCacheGeneratedAt ? Date.now() - liveCacheGeneratedAt : null,
  });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

const PORT = Number(process.env.PORT || 3000);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
