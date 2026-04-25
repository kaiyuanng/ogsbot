# RainGo

Real-time rain decision engine for Singapore.  
**Input:** your location. **Output:** GO / WAIT / DELAY + minutes.

---

## Backend

### Quick start

```bash
cd backend
cp .env.example .env
npm install
npm start          # production
npm run dev        # hot-reload via nodemon
```

Server listens on `http://localhost:3000`.

### API

#### `POST /decision`

```json
// Request
{ "lat": 1.3521, "lng": 103.8198 }

// Response
{
  "state": "WAIT",
  "minutes": 18,
  "confidence": 80,
  "message": "Rain expected in ~18 min. Wait a bit.",
  "dataAgeSeconds": 43
}
```

#### `GET /health`

Returns current cluster count, last update time, and per-cluster velocity.

### Data sources

| Source | URL | Usage |
|---|---|---|
| NEA Radar PNG | `weather.gov.sg/files/rainarea/50km/v2/…` | 480×480 grid, 5-min updates *(primary)* |
| NEA Station API | `api.data.gov.sg/v1/environment/rainfall` | ~50 stations *(fallback)* |

Both are free, public, no API key needed.

**To enable the full radar PNG path** install `pngjs`:

```bash
npm install pngjs
```

Then uncomment the `parsePngBuffer` implementation in `src/radar/fetcher.js`.  
Without `pngjs` the server automatically falls back to the station API.

### Pipeline

```
NEA API (5 min)
  └─ fetchRadarFrame()       raw cells [lat, lng, intensity 0–255]
       └─ clusterStorms()    DBSCAN (eps=5 km, min=2)  →  clusters
            └─ trackStorms() match prev frame centroid  →  velocity vectors
                 └─ /decision  dot-product approach check →  GO/WAIT/DELAY
```

---

## iOS App

### Setup (Xcode 15+, iOS 16+)

1. Open Xcode → **Create a new project** → iOS App → SwiftUI, Swift
2. Name it **RainGo**, Bundle ID anything you like
3. Copy the files from `ios/RainGo/` into your project:
   - `RainGoApp.swift` (replace the generated one)
   - `Views/HomeView.swift`
   - `ViewModels/HomeViewModel.swift`
   - `Models/DecisionResponse.swift`
   - `Services/APIService.swift`
4. Merge `Info.plist` entries into your project's Info.plist (or replace it)
5. Run on simulator or device

### Pointing at your server

The app reads `RAINGO_API_URL` from the process environment.  
In Xcode: **Edit Scheme → Run → Environment Variables → add `RAINGO_API_URL=http://your-server:3000`**

For a production build set the value in `APIService.swift` directly.

---

## Decision logic

| time_to_rain | State | Colour |
|---|---|---|
| 0–9 min | **DELAY** | Red |
| 10–24 min | **WAIT** | Orange |
| 25+ min or moving away | **GO** | Green |

Confidence:
- `90` — no storm detected
- `85` — strong storm (intensity > 150) heading toward you
- `80` — moderate storm
- `70` — weak signal

---

## MVP constraints honoured

- No login
- No database (in-memory state)
- No push notifications
- No maps / charts
- Response time < 1 s (decision is pure in-memory math after radar refresh)
