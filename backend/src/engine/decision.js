const { haversineKm } = require('../storm/dbscan');

const DEFAULT_SPEED_KMH = 20;
const DELAY_THRESHOLD_MIN = 10;
const WAIT_THRESHOLD_MIN = 25;

function makeDecision(userLat, userLng, clusters) {
  if (clusters.length === 0) {
    // Spec: confidence 90 when no storm nearby
    return { state: 'GO', minutes: 999, confidence: 90, message: 'No rain nearby. Safe to go!' };
  }

  let minTime = Infinity;
  let nearestCluster = null;
  let weakSignalOnly = true;

  for (const cluster of clusters) {
    const distToCenter = haversineKm(userLat, userLng, cluster.centroid.lat, cluster.centroid.lng);
    const radiusKm = cluster.radiusKm ?? 1;

    // User inside storm footprint → immediate DELAY
    if (distToCenter <= radiusKm) {
      return { state: 'DELAY', minutes: 0, confidence: 80, message: "You're in the rain right now. Wait it out!" };
    }

    // Distance to storm edge (not centroid) for time calculation
    const edgeDist = distToCenter - radiusKm;

    if (cluster.avgIntensity > 80) weakSignalOnly = false;

    let timeMin;
    if (cluster.velocity) {
      const { dLat, dLng, speedKmh } = cluster.velocity;
      // Dot product: positive → storm moving toward user
      const toUserLat = userLat - cluster.centroid.lat;
      const toUserLng = userLng - cluster.centroid.lng;
      const approaching = toUserLat * dLat + toUserLng * dLng > 0;
      timeMin = approaching ? (edgeDist / speedKmh) * 60 : Infinity;
    } else {
      // No prior frame — assume moving toward user at default speed
      timeMin = (edgeDist / DEFAULT_SPEED_KMH) * 60;
    }

    if (timeMin < minTime) {
      minTime = timeMin;
      nearestCluster = cluster;
    }
  }

  if (minTime === Infinity) {
    return { state: 'GO', minutes: 999, confidence: 80, message: 'Rain detected but moving away. Safe to go!' };
  }

  const minutes = Math.round(minTime);

  // Spec: confidence 70 = weak signal, 80 = storm detected
  const confidence = weakSignalOnly ? 70 : 80;

  if (minutes < DELAY_THRESHOLD_MIN) {
    return { state: 'DELAY', minutes, confidence, message: `Rain arrives in ~${minutes} min. Better to wait.` };
  }
  if (minutes < WAIT_THRESHOLD_MIN) {
    return { state: 'WAIT', minutes, confidence, message: `Rain expected in ~${minutes} min. Wait a bit.` };
  }
  return { state: 'GO', minutes, confidence, message: `Rain is ${minutes} min away. Safe to go!` };
}

module.exports = { makeDecision };
