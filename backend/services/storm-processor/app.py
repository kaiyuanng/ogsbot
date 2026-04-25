"""
RainGo — Storm Processor microservice
Replaces the hand-rolled JS DBSCAN with scikit-learn's optimised implementation.
Handles both clustering and velocity tracking in one call.

POST /cluster
  Body : { cells, prev_clusters, interval_min }
  Reply: { clusters }

GET  /health
"""

from flask import Flask, request, jsonify
import numpy as np
from sklearn.cluster import DBSCAN
import math

app = Flask(__name__)

# ── Constants ──────────────────────────────────────────────────────────────

EARTH_R_KM       = 6371.0
INTENSITY_THRESH = 60
EPS_KM           = 5.0
MIN_SAMPLES      = 2
MAX_MATCH_KM     = 25.0

# At Singapore's latitude (≈1.35°) both degree-scales are nearly identical
LAT_KM = 111.0
LNG_KM = 111.0 * math.cos(math.radians(1.35))   # ≈ 110.97


# ── Helpers ────────────────────────────────────────────────────────────────

def haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = (math.sin(dlat / 2) ** 2
         + math.cos(math.radians(lat1))
         * math.cos(math.radians(lat2))
         * math.sin(dlng / 2) ** 2)
    return EARTH_R_KM * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def compute_velocity(centroid_lat, centroid_lng, prev_clusters, interval_hr):
    """Return velocity dict or None if no matching previous cluster."""
    if not prev_clusters:
        return None

    best_dist = MAX_MATCH_KM + 1
    best_prev = None
    for prev in prev_clusters:
        d = haversine_km(centroid_lat, centroid_lng,
                         prev["centroid"]["lat"], prev["centroid"]["lng"])
        if d < best_dist:
            best_dist = d
            best_prev = prev

    if best_prev is None or best_dist > MAX_MATCH_KM:
        return None

    speed_kmh = best_dist / interval_hr
    d_lat = (centroid_lat - best_prev["centroid"]["lat"]) / interval_hr
    d_lng = (centroid_lng - best_prev["centroid"]["lng"]) / interval_hr
    return {"speedKmh": round(speed_kmh, 2), "dLat": d_lat, "dLng": d_lng}


# ── Route ──────────────────────────────────────────────────────────────────

@app.route("/cluster", methods=["POST"])
def cluster():
    body         = request.get_json(force=True)
    cells        = body.get("cells", [])
    prev_clusters = body.get("prev_clusters", [])
    interval_min = float(body.get("interval_min", 5))
    interval_hr  = interval_min / 60.0

    active = [c for c in cells if c.get("intensity", 0) > INTENSITY_THRESH]
    if not active:
        return jsonify({"clusters": []})

    lats = np.array([c["lat"] for c in active])
    lngs = np.array([c["lng"] for c in active])
    intensities = np.array([c["intensity"] for c in active])

    # Convert to km for DBSCAN so eps is in real-world km
    coords_km = np.column_stack([lats * LAT_KM, lngs * LNG_KM])

    labels = DBSCAN(eps=EPS_KM, min_samples=MIN_SAMPLES,
                    algorithm="ball_tree", metric="euclidean").fit_predict(coords_km)

    result = []
    for cluster_id in set(labels):
        if cluster_id == -1:
            continue

        mask = labels == cluster_id
        c_lats = lats[mask]
        c_lngs = lngs[mask]
        c_ints = intensities[mask]
        c_cells = [active[i] for i, m in enumerate(mask) if m]

        centroid_lat = float(c_lats.mean())
        centroid_lng = float(c_lngs.mean())
        max_intensity = float(c_ints.max())
        avg_intensity = float(c_ints.mean())

        # Storm radius = furthest point from centroid
        radius_km = max(
            haversine_km(centroid_lat, centroid_lng, float(lat), float(lng))
            for lat, lng in zip(c_lats, c_lngs)
        ) or 1.0

        velocity = compute_velocity(centroid_lat, centroid_lng,
                                    prev_clusters, interval_hr)

        result.append({
            "centroid":     {"lat": centroid_lat, "lng": centroid_lng},
            "points":       c_cells,
            "maxIntensity": max_intensity,
            "avgIntensity": avg_intensity,
            "radiusKm":     round(radius_km, 2),
            "velocity":     velocity,
        })

    return jsonify({"clusters": result})


@app.route("/health")
def health():
    return jsonify({"status": "ok"})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001)
