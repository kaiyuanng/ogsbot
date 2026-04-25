const { haversineKm } = require('../storm/dbscan');

const DEFAULT_SPEED_KMH = 20; // assumed when no prior frame to compute velocity
const DELAY_THRESHOLD_MIN = 10;
const WAIT_THRESHOLD_MIN = 25;
const AT_RAIN_KM = 1; // within 1 km = user is in the rain

function makeDecision(userLat, userLng, clusters) {
  if (clusters.length === 0) {
    return { state: 'GO', minutes: 999, confidence: 90, message: 'No rain nearby. Safe to go!' };
  }

  let minTime = Infinity;
  let nearestCluster = null;

  for (const cluster of clusters) {
    const dist = haversineKm(userLat, userLng, cluster.centroid.lat, cluster.centroid.lng);

    if (dist <= AT_RAIN_KM) {
      return { state: 'DELAY', minutes: 0, confidence: 85, message: "You're in the rain right now. Wait it out!" };
    }

    let timeMin;
    if (cluster.velocity) {
      const { dLat, dLng, speedKmh } = cluster.velocity;
      // Positive dot product → storm vector points toward user → approaching
      const toUserLat = userLat - cluster.centroid.lat;
      const toUserLng = userLng - cluster.centroid.lng;
      const approaching = toUserLat * dLat + toUserLng * dLng > 0;
      timeMin = approaching ? (dist / speedKmh) * 60 : Infinity;
    } else {
      // No velocity data — assume worst case: storm heading straight at user
      timeMin = (dist / DEFAULT_SPEED_KMH) * 60;
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
  const intensity = nearestCluster?.avgIntensity ?? 128;
  const confidence = intensity > 150 ? 85 : intensity > 80 ? 80 : 70;

  if (minutes < DELAY_THRESHOLD_MIN) {
    return { state: 'DELAY', minutes, confidence, message: `Rain arrives in ~${minutes} min. Better to wait.` };
  }
  if (minutes < WAIT_THRESHOLD_MIN) {
    return { state: 'WAIT', minutes, confidence, message: `Rain expected in ~${minutes} min. Wait a bit.` };
  }
  return { state: 'GO', minutes, confidence: 80, message: `Rain is ${minutes} min away. Safe to go!` };
}

module.exports = { makeDecision };
