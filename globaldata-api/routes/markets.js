const express = require('express');
const fetch = require('node-fetch');

const router = express.Router();
const CACHE_TTL_MS = Number(process.env.MARKETS_CACHE_TTL_MS || 45000);
const MAX_SYMBOLS = 80;
let cache = null;

function compactSymbol(value) {
  return String(value || '').trim().slice(0, 24);
}

function parseSymbols(value) {
  return [...new Set(String(value || '')
    .split(',')
    .map(compactSymbol)
    .filter(Boolean))]
    .slice(0, MAX_SYMBOLS);
}

function finite(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

async function fetchYahooChart(symbol) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1d&interval=5m`;
  const response = await fetch(url, { timeout: 8000 });
  if (!response.ok) throw new Error(`${symbol} HTTP ${response.status}`);
  const payload = await response.json();
  const error = payload.chart && payload.chart.error;
  if (error) throw new Error(error.description || `${symbol} quote error`);
  const meta = payload.chart && payload.chart.result && payload.chart.result[0] && payload.chart.result[0].meta;
  if (!meta) throw new Error(`${symbol} missing quote metadata`);

  const price = finite(meta.regularMarketPrice);
  const previousClose = finite(meta.chartPreviousClose ?? meta.previousClose);
  const change = price !== null && previousClose !== null ? price - previousClose : null;
  const changePct = change !== null && previousClose ? (change / previousClose) * 100 : null;

  return {
    symbol,
    price,
    previousClose,
    change,
    changePct,
    currency: meta.currency || null,
    exchange: meta.exchangeName || null,
    exchangeName: meta.fullExchangeName || null,
    dayHigh: finite(meta.regularMarketDayHigh),
    dayLow: finite(meta.regularMarketDayLow),
    volume: finite(meta.regularMarketVolume),
    marketTime: meta.regularMarketTime ? new Date(Number(meta.regularMarketTime) * 1000).toISOString() : null,
    sourceUrl: `https://finance.yahoo.com/quote/${encodeURIComponent(symbol)}`,
    ok: price !== null,
  };
}

router.get('/', async (req, res) => {
  const symbols = parseSymbols(req.query.symbols);
  const cacheKey = symbols.join(',');

  if (!symbols.length) {
    res.json({ ok: true, generatedAt: new Date().toISOString(), source: 'Yahoo Finance chart API', quotes: {} });
    return;
  }

  if (cache && cache.key === cacheKey && Date.now() - cache.time < CACHE_TTL_MS) {
    res.json(cache.payload);
    return;
  }

  const results = await Promise.allSettled(symbols.map(fetchYahooChart));
  const quotes = {};
  results.forEach((result, index) => {
    const symbol = symbols[index];
    quotes[symbol] = result.status === 'fulfilled'
      ? result.value
      : { symbol, ok: false, error: result.reason?.message || 'quote unavailable' };
  });

  const payload = {
    ok: true,
    generatedAt: new Date().toISOString(),
    source: 'Yahoo Finance chart API',
    quotes,
  };
  cache = { key: cacheKey, time: Date.now(), payload };
  res.json(payload);
});

module.exports = router;
