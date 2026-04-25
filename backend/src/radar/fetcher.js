/**
 * NEA public data sources used:
 *
 * PRIMARY — Rainfall station readings (data.gov.sg)
 *   https://api.data.gov.sg/v1/environment/rainfall
 *   ~50 stations across Singapore, updated every 5 minutes.
 *   Returns mm of rainfall per reading interval.
 *
 * ENHANCED — Rain radar PNG images (weather.gov.sg)
 *   https://www.weather.gov.sg/files/rainarea/50km/v2/dpsri_70km_<TIMESTAMP>0000dBR.dpsri.png
 *   480×480 pixel PNG where each pixel's green channel encodes radar intensity (0–255).
 *   Covers a ~220km × 220km area centred on Singapore.
 *   Updated every 5 minutes on :00/:05/:10/…/:55.
 *
 * Strategy: try radar PNG first (richer grid data); fall back to station API.
 */

const axios = require('axios');

// ── Constants ──────────────────────────────────────────────────────────────

const STATION_URL = 'https://api.data.gov.sg/v1/environment/rainfall';
const RADAR_BASE = 'https://www.weather.gov.sg/files/rainarea/50km/v2';

// The radar image covers a 220 km × 220 km box centred roughly on Singapore.
const RADAR_BOUNDS = {
  latMin: 1.1562,  latMax: 1.4787,
  lngMin: 103.5653, lngMax: 104.1311,
  widthPx: 480,    heightPx: 480,
};

// 5 mm / 5 min = tropical downpour → intensity 255
const MAX_RAIN_MM = 5;

// ── Radar PNG fetcher ──────────────────────────────────────────────────────

/**
 * Build the NEA radar URL for the most recent 5-minute slot.
 * NEA timestamps are UTC (not SGT) in the filename.
 */
function latestRadarUrl() {
  const now = new Date();
  // Round down to nearest 5-minute mark
  const slot = new Date(now);
  slot.setUTCSeconds(0, 0);
  slot.setUTCMinutes(Math.floor(slot.getUTCMinutes() / 5) * 5);

  const pad = n => String(n).padStart(2, '0');
  const ts =
    slot.getUTCFullYear() +
    pad(slot.getUTCMonth() + 1) +
    pad(slot.getUTCDate()) +
    pad(slot.getUTCHours()) +
    pad(slot.getUTCMinutes()) +
    '00';

  return `${RADAR_BASE}/dpsri_70km_${ts}0000dBR.dpsri.png`;
}

/**
 * Decode a raw PNG buffer into an array of {lat, lng, intensity} cells.
 * Uses only the green channel as the intensity value (NEA radar encoding).
 * Skips cells below INTENSITY_THRESHOLD to keep the array small.
 */
function parsePngBuffer(buffer) {
  const { PNG } = require('pngjs');
  const png = PNG.sync.read(buffer);
  const cells = [];
  const { latMin, latMax, lngMin, lngMax, widthPx, heightPx } = RADAR_BOUNDS;

  // Sample every 2nd pixel (240×240) — reduces array to ~14k cells while
  // keeping spatial resolution at ~920m, well within storm-scale accuracy.
  const STEP = 2;
  for (let py = 0; py < heightPx; py += STEP) {
    for (let px = 0; px < widthPx; px += STEP) {
      const idx = (py * widthPx + px) * 4;
      const intensity = png.data[idx + 1]; // green channel encodes dBZ
      if (intensity < 10) continue;        // skip essentially-dry pixels

      const lat = latMax - (py / heightPx) * (latMax - latMin);
      const lng = lngMin + (px / widthPx) * (lngMax - lngMin);
      cells.push({ lat, lng, intensity });
    }
  }
  return cells;
}

async function fetchFromRadarPng() {
  const url = latestRadarUrl();
  const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 8000 });
  const cells = parsePngBuffer(Buffer.from(res.data));
  return { timestamp: new Date().toISOString(), source: 'nea-radar-png', cells };
}

// ── Station rainfall API fetcher ───────────────────────────────────────────

async function fetchFromStationApi() {
  const res = await axios.get(STATION_URL, { timeout: 8000 });
  const { metadata, items } = res.data;

  const stationMap = {};
  for (const s of metadata.stations) {
    stationMap[s.id] = {
      id: s.id,
      lat: s.location.latitude,
      lng: s.location.longitude,
      intensity: 0,
    };
  }

  for (const r of items[0]?.readings ?? []) {
    if (stationMap[r.station_id]) {
      stationMap[r.station_id].intensity = Math.round(
        Math.min(255, (r.value / MAX_RAIN_MM) * 255)
      );
    }
  }

  return {
    timestamp: items[0]?.timestamp ?? new Date().toISOString(),
    source: 'nea-station-api',
    cells: Object.values(stationMap),
  };
}

// ── Public interface ───────────────────────────────────────────────────────

async function fetchRadarFrame() {
  // Try the richer radar PNG first; fall back to station API
  try {
    const frame = await fetchFromRadarPng();
    if (frame) return frame;
  } catch {
    // PNG fetch failed (network, 404 on timing mismatch, etc.) — fall through
  }

  return fetchFromStationApi();
}

module.exports = { fetchRadarFrame, RADAR_BOUNDS, latestRadarUrl };
