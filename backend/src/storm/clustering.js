const { dbscan, haversineKm } = require('./dbscan');

const INTENSITY_THRESHOLD = 20; // ~0.4 mm/5 min — catches light rain and drizzle
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
    // Furthest point from centroid = storm edge radius
    const radiusKm = Math.max(...pts.map(p => haversineKm(lat, lng, p.lat, p.lng)), 1);
    return { centroid: { lat, lng }, points: pts, maxIntensity, avgIntensity, radiusKm };
  });
}

module.exports = { clusterStorms };
