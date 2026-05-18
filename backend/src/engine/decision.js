const { haversineKm } = require('../storm/dbscan');

const DEFAULT_SPEED_KMH = 20;
const DELAY_THRESHOLD_MIN = 10;
const WAIT_THRESHOLD_MIN = 25;
const DRIZZLE_AVG_INTENSITY = 80; // below this = light rain / drizzle
const NEAREST_STATION_KM = 3;     // single-station drizzle check radius
const NEAREST_STATION_MIN_I = 15; // minimum intensity for nearest-station check

function makeDecision(userLat, userLng, clusters, cells = []) {
  // ── Nearest-station drizzle check ─────────────────────────────────────────
  // Even with no cluster (e.g. only one station reporting light rain), we
  // surface a drizzle warning if a station is within NEAREST_STATION_KM.
  function nearestWetStation() {
    let best = null, bestDist = Infinity;
    for (const c of cells) {
      if ((c.intensity ?? 0) < NEAREST_STATION_MIN_I) continue;
      const d = haversineKm(userLat, userLng, c.lat, c.lng);
      if (d < bestDist) { bestDist = d; best = c; }
    }
    return best && bestDist <= NEAREST_STATION_KM ? { station: best, dist: bestDist } : null;
  }

  // ── No clusters at all ────────────────────────────────────────────────────
  if (clusters.length === 0) {
    const wet = nearestWetStation();
    if (wet) {
      const km = wet.dist.toFixed(1);
      return {
        state: 'WAIT',
        minutes: 0,
        confidence: 65,
        message: `Light drizzle detected ${km} km from you. It may reach your location soon.`,
      };
    }
    return {
      state: 'GO',
      minutes: 999,
      confidence: 90,
      message: 'No rain at your location. You\'re clear to go.',
    };
  }

  // ── Check each cluster ────────────────────────────────────────────────────
  let minTime = Infinity;
  let nearestCluster = null;
  let weakSignalOnly = true;

  for (const cluster of clusters) {
    const distToCenter = haversineKm(userLat, userLng, cluster.centroid.lat, cluster.centroid.lng);
    const radiusKm = cluster.radiusKm ?? 1;
    const avgI = cluster.avgIntensity ?? 100;
    const isDrizzle = avgI < DRIZZLE_AVG_INTENSITY;

    // ── User is inside this storm ─────────────────────────────────────────
    if (distToCenter <= radiusKm) {
      let clearingMsg = '';

      if (cluster.velocity) {
        const { dLat, dLng, speedKmh } = cluster.velocity;
        const toUserLat = userLat - cluster.centroid.lat;
        const toUserLng = userLng - cluster.centroid.lng;
        const movingAway = toUserLat * dLat + toUserLng * dLng < 0;
        if (movingAway && speedKmh > 1) {
          // Time for storm edge to travel past user's position
          const clearMin = Math.round((distToCenter + radiusKm) / speedKmh * 60);
          clearingMsg = ` Rain should clear from your location in about ${clearMin} min.`;
        }
      }

      if (isDrizzle) {
        return {
          state: 'DELAY',
          minutes: 0,
          confidence: 70,
          message: `It's drizzling at your location right now.${clearingMsg || ' Should clear soon — keep an eye on it.'}`,
        };
      }

      return {
        state: 'DELAY',
        minutes: 0,
        confidence: 80,
        message: `It's raining at your location right now. Wait for it to pass.${clearingMsg}`,
      };
    }

    if (avgI > DRIZZLE_AVG_INTENSITY) weakSignalOnly = false;

    // ── Check if this cluster is approaching ──────────────────────────────
    let timeMin;
    const edgeDist = distToCenter - radiusKm;

    if (cluster.velocity) {
      const { dLat, dLng, speedKmh } = cluster.velocity;
      const toUserLat = userLat - cluster.centroid.lat;
      const toUserLng = userLng - cluster.centroid.lng;
      const approaching = toUserLat * dLat + toUserLng * dLng > 0;
      timeMin = approaching ? (edgeDist / speedKmh) * 60 : Infinity;
    } else {
      timeMin = (edgeDist / DEFAULT_SPEED_KMH) * 60;
    }

    if (timeMin < minTime) {
      minTime = timeMin;
      nearestCluster = cluster;
    }
  }

  // ── All clusters moving away ──────────────────────────────────────────────
  if (minTime === Infinity) {
    return {
      state: 'GO',
      minutes: 999,
      confidence: 80,
      message: 'Rain is moving away from your location. You\'re clear to go.',
    };
  }

  // ── Approaching storm ─────────────────────────────────────────────────────
  const minutes = Math.round(minTime);
  const confidence = weakSignalOnly ? 70 : 80;
  const isDrizzle = nearestCluster && (nearestCluster.avgIntensity ?? 100) < DRIZZLE_AVG_INTENSITY;

  if (minutes < DELAY_THRESHOLD_MIN) {
    return {
      state: 'DELAY',
      minutes,
      confidence,
      message: isDrizzle
        ? `Light rain is reaching your location in about ${minutes} minutes.`
        : `Rain is reaching your location in about ${minutes} minutes. Stay covered.`,
    };
  }

  if (minutes < WAIT_THRESHOLD_MIN) {
    return {
      state: 'WAIT',
      minutes,
      confidence,
      message: isDrizzle
        ? `Light rain is heading your way — about ${minutes} minutes out. You may still have time.`
        : `Rain is heading to your location — about ${minutes} minutes away. Best to wait here.`,
    };
  }

  return {
    state: 'GO',
    minutes,
    confidence,
    message: `Rain is ${minutes} minutes from your location. Plenty of time — head out now.`,
  };
}

module.exports = { makeDecision };
