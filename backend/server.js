require('dotenv').config();
const axios = require('axios');
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
const PYTHON_URL = process.env.STORM_PROCESSOR_URL || 'http://localhost:5001';
const POLL_INTERVAL_MS = 5 * 60 * 1000;

// ── Python microservice path ───────────────────────────────────────────────

async function clusterWithPython(cells, prevClusters) {
  const { data } = await axios.post(
    `${PYTHON_URL}/cluster`,
    { cells, prev_clusters: prevClusters, interval_min: 5 },
    { timeout: 5000 }
  );
  return data.clusters;
}

// ── Radar refresh loop ─────────────────────────────────────────────────────

async function refreshRadar() {
  try {
    // currClusters = last frame's output — correct reference for velocity tracking
    const { currClusters } = state.get();
    const frame = await fetchRadarFrame();

    let tracked;
    let clusterer;
    try {
      tracked = await clusterWithPython(frame.cells, currClusters);
      clusterer = 'python';
    } catch {
      // Python service not running — JS DBSCAN fallback
      const clusters = clusterStorms(frame.cells);
      tracked = trackStorms(currClusters, clusters);
      clusterer = 'js';
    }

    state.update(frame, tracked, tracked);
    console.log(
      `[${new Date().toISOString()}] Refreshed — ${tracked.length} cluster(s) ` +
      `via ${clusterer}, source: ${frame.source}`
    );
  } catch (err) {
    console.error('Radar refresh failed:', err.message);
  }
}

refreshRadar();
setInterval(refreshRadar, POLL_INTERVAL_MS);

// ── Routes ─────────────────────────────────────────────────────────────────

app.post('/decision', (req, res) => {
  const { lat, lng } = req.body ?? {};
  if (lat == null || lng == null) {
    return res.status(400).json({ error: 'lat and lng are required' });
  }

  const { trackedClusters, lastUpdated, frame: radarFrame } = state.get();
  const decision = makeDecision(Number(lat), Number(lng), trackedClusters, radarFrame?.cells ?? []);
  const dataAgeSeconds = lastUpdated
    ? Math.round((Date.now() - new Date(lastUpdated)) / 1000)
    : null;

  res.json({ ...decision, dataAgeSeconds });
});

app.get('/health', (_req, res) => {
  const { trackedClusters, lastUpdated, frame } = state.get();
  res.json({
    status: 'ok',
    lastUpdated,
    dataSource: frame?.source ?? null,
    activeClusters: trackedClusters.length,
    clusters: trackedClusters.map(c => ({
      centroid: c.centroid,
      radiusKm: c.radiusKm ? Math.round(c.radiusKm * 10) / 10 : null,
      size: c.points.length,
      avgIntensity: Math.round(c.avgIntensity),
      velocity: c.velocity ? { speedKmh: Math.round(c.velocity.speedKmh) } : null,
    })),
  });
});

app.listen(PORT, () => console.log(`RainGo running on :${PORT}`));
