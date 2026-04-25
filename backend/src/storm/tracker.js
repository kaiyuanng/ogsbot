const { haversineKm } = require('./dbscan');

// Maximum centroid displacement between frames to still count as the same storm
const MAX_MATCH_KM = 25;

function trackStorms(prevClusters, currClusters, intervalMin = 5) {
  if (!prevClusters || prevClusters.length === 0) {
    return currClusters.map(c => ({ ...c, velocity: null }));
  }

  const intervalHr = intervalMin / 60;

  return currClusters.map(curr => {
    let best = null;
    let bestDist = Infinity;

    for (const prev of prevClusters) {
      const d = haversineKm(
        curr.centroid.lat, curr.centroid.lng,
        prev.centroid.lat, prev.centroid.lng
      );
      if (d < bestDist) { bestDist = d; best = prev; }
    }

    if (!best || bestDist > MAX_MATCH_KM) {
      return { ...curr, velocity: null };
    }

    const speedKmh = bestDist / intervalHr;
    // dLat / dLng are deg/hr — used as direction vector
    const dLat = (curr.centroid.lat - best.centroid.lat) / intervalHr;
    const dLng = (curr.centroid.lng - best.centroid.lng) / intervalHr;

    return { ...curr, velocity: { speedKmh, dLat, dLng } };
  });
}

module.exports = { trackStorms };
