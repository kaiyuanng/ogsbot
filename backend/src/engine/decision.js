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
      let clearMinutes = null;
      let clearingMsg = '';

      if (cluster.velocity && cluster.velocity.speedKmh > 1) {
        const { dLat, dLng, speedKmh } = cluster.velocity;
        // Convert velocity to km/hr components
        const cosLat = Math.cos(cluster.centroid.lat * Math.PI / 180);
        const vLatKm = dLat * 111;
        const vLngKm = dLng * 111 * cosLat;
        // User offset from centroid in km
        const uLatKm = (userLat - cluster.centroid.lat) * 111;
        const uLngKm = (userLng - cluster.centroid.lng) * 111 * cosLat;
        // Projection of user-from-centroid vector onto velocity direction
        const uParallel = (uLatKm * vLatKm + uLngKm * vLngKm) / speedKmh;
        const d2 = uLatKm * uLatKm + uLngKm * uLngKm;
        // Exact quadratic: dist(user, centroid + t·v) = R → t = (uP + √(uP² + R² − d²)) / speed
        const disc = uParallel * uParallel + radiusKm * radiusKm - d2;
        if (disc >= 0) {
          const t = (uParallel + Math.sqrt(disc)) / speedKmh; // hours
          if (t >= 0) {
            clearMinutes = Math.round(t * 60);
            clearingMsg = ` You can leave in about ${clearMinutes} min.`;
          }
        }
      }

      if (isDrizzle) {
        return {
          state: 'DELAY',
          minutes: 0,
          confidence: 70,
          clearMinutes,
          message: `It's drizzling at your location right now.${clearingMsg || ' Should clear soon — keep an eye on it.'}`,
        };
      }

      return {
        state: 'DELAY',
        minutes: 0,
        confidence: 80,
        clearMinutes,
        message: `It's raining at your location right now.${clearingMsg || ' Wait for it to pass.'}`,
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
