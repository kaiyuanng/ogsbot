require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { fetchRadarFrame } = require('./src/radar/fetcher');
const { clusterStorms } = require('./src/storm/clustering');
const { trackStorms } = require('./src/storm/tracker');
const { makeDecision } = require('./src/engine/decision');
const state = require('./src/state');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const POLL_INTERVAL_MS = 5 * 60 * 1000; // NEA radar updates every 5 minutes

async function refreshRadar() {
  try {
    const { prevClusters } = state.get();
    const frame = await fetchRadarFrame();
    const clusters = clusterStorms(frame.cells);
    const tracked = trackStorms(prevClusters, clusters);
    state.update(frame, clusters, tracked);
    console.log(`[${new Date().toISOString()}] Radar refreshed — ${clusters.length} cluster(s), source: ${frame.source}`);
  } catch (err) {
    console.error('Radar refresh failed:', err.message);
  }
}

refreshRadar();
setInterval(refreshRadar, POLL_INTERVAL_MS);

// POST /decision — core endpoint
app.post('/decision', (req, res) => {
  const { lat, lng } = req.body ?? {};
  if (lat == null || lng == null) {
    return res.status(400).json({ error: 'lat and lng are required' });
  }

  const { trackedClusters, lastUpdated } = state.get();
  const decision = makeDecision(Number(lat), Number(lng), trackedClusters);
  const dataAgeSeconds = lastUpdated
    ? Math.round((Date.now() - new Date(lastUpdated)) / 1000)
    : null;

  res.json({ ...decision, dataAgeSeconds });
});

// GET /health — liveness + debug info
app.get('/health', (_req, res) => {
  const { trackedClusters, lastUpdated, frame } = state.get();
  res.json({
    status: 'ok',
    lastUpdated,
    dataSource: frame?.source ?? null,
    activeClusters: trackedClusters.length,
    clusters: trackedClusters.map(c => ({
      centroid: c.centroid,
      size: c.points.length,
      avgIntensity: Math.round(c.avgIntensity),
      velocity: c.velocity
        ? { speedKmh: Math.round(c.velocity.speedKmh) }
        : null,
    })),
  });
});

app.listen(PORT, () => console.log(`RainGo running on :${PORT}`));
