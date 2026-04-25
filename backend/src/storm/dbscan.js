function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Standard DBSCAN on geographic points.
// eps is in km; each point must have {lat, lng}.
function dbscan(points, eps, minSamples) {
  const n = points.length;
  const UNVISITED = 0;
  const NOISE = -1;
  const labels = new Array(n).fill(UNVISITED);
  let clusterId = 1;

  function getNeighbors(i) {
    const p = points[i];
    const nb = [];
    for (let j = 0; j < n; j++) {
      if (j !== i && haversineKm(p.lat, p.lng, points[j].lat, points[j].lng) <= eps) {
        nb.push(j);
      }
    }
    return nb;
  }

  for (let i = 0; i < n; i++) {
    if (labels[i] !== UNVISITED) continue;

    const nb = getNeighbors(i);
    // nb.length + 1 (self) < minSamples → noise
    if (nb.length + 1 < minSamples) {
      labels[i] = NOISE;
      continue;
    }

    labels[i] = clusterId;
    const seed = new Set(nb);

    for (const q of seed) {
      if (labels[q] === NOISE) labels[q] = clusterId;
      if (labels[q] !== UNVISITED) continue;
      labels[q] = clusterId;
      const qNb = getNeighbors(q);
      if (qNb.length + 1 >= minSamples) {
        for (const r of qNb) seed.add(r);
      }
    }

    clusterId++;
  }

  const clusters = [];
  for (let c = 1; c < clusterId; c++) {
    clusters.push(points.filter((_, i) => labels[i] === c));
  }
  return clusters;
}

module.exports = { dbscan, haversineKm };
