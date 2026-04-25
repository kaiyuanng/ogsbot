const { dbscan } = require('./dbscan');

// Spec: filter intensity > 60, DBSCAN eps=2 (grid units ≈ km), min_samples=3
// Station data is sparser than a pixel grid, so eps=5 km, min_samples=2
// preserves the same spirit while working with ~50 Singapore stations.
const INTENSITY_THRESHOLD = 60;
const EPS_KM = 5;
const MIN_SAMPLES = 2;

function clusterStorms(cells) {
  const active = cells.filter(c => c.intensity > INTENSITY_THRESHOLD);
  if (active.length === 0) return [];

  const clusters = dbscan(active, EPS_KM, MIN_SAMPLES);

  return clusters.map(pts => {
    const lat = pts.reduce((s, p) => s + p.lat, 0) / pts.length;
    const lng = pts.reduce((s, p) => s + p.lng, 0) / pts.length;
    const maxIntensity = Math.max(...pts.map(p => p.intensity));
    const avgIntensity = pts.reduce((s, p) => s + p.intensity, 0) / pts.length;
    return { centroid: { lat, lng }, points: pts, maxIntensity, avgIntensity };
  });
}

module.exports = { clusterStorms };
