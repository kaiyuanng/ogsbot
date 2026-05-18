# RainGo — Test on iPhone & Launch Guide

> Follow this top to bottom. Every step is numbered. Don't skip steps.

---

## PART 1 — Test on Your iPhone Right Now

### What you need

| Thing | Minimum version |
|---|---|
| Mac | macOS 13 Ventura or later |
| Xcode | 15 or later ([download free from Mac App Store](https://apps.apple.com/app/xcode/id497799835)) |
| iPhone | iOS 16 or later |
| Apple ID | Free account is fine for testing on your own phone |
| Node.js | v18 or later (`node --version` to check) |

---

### Step 1 — Start the backend

Open **Terminal** on your Mac and run:

```bash
cd path/to/ogsbot/backend
npm install
npm start
```

You should see: `RainGo running on :3000`

Leave this Terminal window open. **Do not close it.**

---

### Step 2 — Find your Mac's IP address

In a **new** Terminal tab, run:

```bash
ipconfig getifaddr en0
```

You'll get something like `192.168.1.42`. **Write this down.**

> If that returns blank, try `ipconfig getifaddr en1` (for WiFi vs Ethernet).

---

### Step 3 — Set the API URL in the app and HTML artifact

**iOS app** — open `ios/RainGo/Config.swift` and change line 18:

```swift
// Change this:
return "http://localhost:3000"

// To this (use YOUR IP from Step 2):
return "http://192.168.1.42:3000"
```

Save the file.

**HTML artifact** — open `raingo-artifact.html` in any text editor and set `BACKEND_URL` near the top of the `<script>` block:

```javascript
// Change this:
const BACKEND_URL = '';

// To this (use YOUR IP from Step 2):
const BACKEND_URL = 'http://192.168.1.42:3000';
```

This gives the HTML artifact full NEA radar coverage (480×480 grid, ~920m resolution) instead of the sparse 66-station gauge network. Rain at locations like French Road or Kallang that fall between gauges will now be detected.

> **Your iPhone and Mac must be on the same WiFi network.** Mobile data will not reach localhost.

---

### Step 4 — Create the Xcode project

1. Open **Xcode**
2. Click **Create New Project**
3. Choose **iOS** → **App** → click **Next**
4. Fill in:
   - **Product Name:** `RainGo`
   - **Team:** your Apple ID (sign in if prompted)
   - **Organization Identifier:** `com.yourname` (anything works for testing)
   - **Bundle Identifier:** will auto-fill as `com.yourname.RainGo`
   - **Interface:** SwiftUI
   - **Language:** Swift
5. Click **Next**, then save the project anywhere you like

---

### Step 5 — Add the source files

In Xcode's left panel you'll see a group called **RainGo** with some default files.

1. **Delete** `ContentView.swift` (right-click → Delete → Move to Trash)
2. Right-click the **RainGo** group → **Add Files to "RainGo"…**
3. Navigate to `ogsbot/ios/RainGo/` and select **all files and folders**:
   - `Config.swift`
   - `RainGoApp.swift`
   - `Models/` (folder)
   - `Services/` (folder)
   - `ViewModels/` (folder)
   - `Views/` (folder)
4. Make sure **"Copy items if needed"** is checked
5. Click **Add**

---

### Step 6 — Update Info.plist

In Xcode, click on your project (the blue icon at the top of the file list) → select the **RainGo** target → **Info** tab.

Add these two keys:

| Key | Type | Value |
|---|---|---|
| `NSLocationWhenInUseUsageDescription` | String | `RainGo checks rain at your location.` |
| `NSAppTransportSecurity` | Dictionary | *(see below)* |

For `NSAppTransportSecurity`, add a child key:

| Key | Type | Value |
|---|---|---|
| `NSAllowsLocalNetworking` | Boolean | YES |

> Alternatively, open `ios/RainGo/Info.plist` in a text editor and copy its contents directly into your project's Info.plist.

---

### Step 7 — Plug in your iPhone

1. Connect iPhone to Mac with a USB cable
2. Trust the Mac on your iPhone if prompted
3. In Xcode, click the **device selector** (next to the play button at the top) and choose your iPhone

---

### Step 8 — Run the app

Click the **▶ Play button** in Xcode.

The first time:
- Xcode may ask you to enable Developer Mode on your iPhone
  - On iPhone: **Settings → Privacy & Security → Developer Mode → turn on**
- Your iPhone may show "Untrusted Developer" — fix it at:
  - **Settings → General → VPN & Device Management → [your Apple ID] → Trust**

The app will launch. It will ask for location permission — tap **Allow While Using App**.

You should see a GO / WAIT / DELAY result within 2 seconds. ✅

---

### Troubleshooting

| Problem | Fix |
|---|---|
| "Connection refused" error in app | Make sure backend is running and IP in Config.swift is correct |
| App shows spinning forever | iPhone and Mac not on same WiFi |
| "Untrusted Developer" on iPhone | Settings → General → VPN & Device Management → trust your Apple ID |
| Xcode says "No account" | Xcode → Settings → Accounts → add your Apple ID |
| Backend crashes on start | Run `npm install` first, then `npm start` |

---

## PART 2 — Share with Others via TestFlight

TestFlight lets you share the app with up to 10,000 testers **before** App Store launch. Free.

### What you need first

A paid **Apple Developer Program** membership ($99/year):
👉 https://developer.apple.com/programs/enroll/

### Steps

1. **Create App Store Connect record**
   - Go to https://appstoreconnect.apple.com
   - Click **+** → **New App**
   - Platform: iOS | Name: RainGo | Bundle ID: match what you used in Xcode | SKU: raingo

2. **Set the version number in Xcode**
   - Project → RainGo target → General
   - Version: `1.0` | Build: `1`

3. **Archive the app**
   - In Xcode, set the device to **"Any iOS Device (arm64)"** (not your phone)
   - Menu: **Product → Archive**
   - When done, the Organizer window opens

4. **Upload to App Store Connect**
   - In Organizer → click **Distribute App** → App Store Connect → Upload
   - Follow the prompts (defaults are fine)
   - Wait ~5 minutes for processing

5. **Add testers in App Store Connect**
   - TestFlight tab → Internal Testing → add your own email
   - You'll get an email — open it on your iPhone → install TestFlight → install RainGo

---

## PART 3 — Deploy the Backend for Production

The backend needs to be on the internet so the real app can reach it.

### Option A — Railway (recommended, free tier available)

1. Push this repo to GitHub
2. Go to https://railway.app → New Project → Deploy from GitHub
3. Select the repo → set **Root Directory** to `backend`
4. Add environment variable: `PORT = 3000`
5. Click Deploy

Railway gives you a URL like `https://raingo-backend-production.up.railway.app`.

6. Copy that URL into `Config.swift` → archive → upload new build

### Option B — Render

Same idea: https://render.com → New Web Service → connect repo → root dir = `backend` → `npm start`.

### Option C — Docker Compose on a VPS

```bash
# On your server (Ubuntu/Debian)
git clone https://github.com/yourname/ogsbot.git
cd ogsbot
docker compose up -d
```

Both services start automatically on boot.

---

## PART 5 — Home Screen Widget

The widget shows GO / WAIT / DELAY at a glance without opening the app. It reads the last result saved by the main app.

### Step 1 — Add the widget extension target

1. In Xcode, go to **File → New → Target**
2. Choose **Widget Extension** → click **Next**
3. Fill in:
   - **Product Name:** `RainGoWidget`
   - **Include Configuration App Intent:** unchecked
4. Click **Finish**
5. When prompted "Activate scheme?", click **Activate**

### Step 2 — Add the App Group capability

Do this for **both** the `RainGo` target and the `RainGoWidget` target:

1. Click the project (blue icon) in the file list → select the target
2. Go to the **Signing & Capabilities** tab
3. Click **+ Capability** → search for **App Groups** → add it
4. Click **+** under App Groups and enter: `group.com.raingo.app`
   - Use the same identifier on both targets

### Step 3 — Add the widget source files

Right-click the **RainGoWidget** group in Xcode → **Add Files to "RainGoWidget"…**

Add these two files from `ogsbot/ios/RainGo/Widget/`:
- `RainGoWidget.swift` — **add to the RainGoWidget target only**
- `WidgetSharedStore.swift` — **add to both targets** (check both boxes)

### Step 4 — Test

Run the main app on your iPhone first (so it writes data to the App Group store).
Then long-press the home screen → tap **+** → search for **RainGo** → add the small or medium widget.

The widget refreshes automatically every 5 minutes, matching the radar cadence.

---

## PART 4 — App Store Submission

### Before you submit, prepare:

| What | Details |
|---|---|
| **App icon** | 1024×1024 PNG, no alpha, no rounded corners (Apple applies them) |
| **Screenshots** | 6.7" iPhone (iPhone 15 Pro Max), portrait. At minimum 1, up to 10 |
| **App name** | RainGo |
| **Subtitle** | Know before you go |
| **Description** | See below |
| **Keywords** | rain,singapore,weather,umbrella,radar,forecast,go,walk |
| **Privacy policy URL** | Required — a simple page saying you collect location data |
| **Support URL** | Your website or email |
| **Category** | Weather |
| **Age rating** | 4+ |
| **Price** | $4.99/month — set up via Subscriptions in App Store Connect |

---

### App Store description (copy-paste ready)

```
RainGo tells you exactly what to do when it rains in Singapore: GO, WAIT, or DELAY — and how many minutes you have.

No weather maps. No hourly forecasts. Just one clear answer.

HOW IT WORKS
• Checks Singapore's real-time NEA rain radar every 5 minutes
• Tracks storm movement and speed
• Calculates when rain will reach your location
• Gives you a GO / WAIT / DELAY decision in under a second

DESIGNED FOR SINGAPORE
• Built specifically for Singapore's sudden, intense rain
• Uses NEA data — the same radar your weather app uses
• Works anywhere on the island

SIMPLE BY DESIGN
• Open the app → instant answer
• No account needed
• No ads
• No clutter

Perfect for commuters, cyclists, food delivery riders, and anyone tired of getting caught in the rain.
```

---

### Privacy policy (minimum viable)

Create a simple webpage with this text:

```
RainGo Privacy Policy

RainGo collects your device's GPS location only when the app is open.
Your location is sent to our server solely to determine nearby rain.
We do not store, log, or share your location.
We do not collect any personal information.

Contact: your@email.com
```

Host it on GitHub Pages, Notion, or any URL you control.

---

### Checklist before hitting Submit

- [ ] Backend is deployed and accessible
- [ ] Config.swift points to production URL
- [ ] App version set to 1.0, build 1
- [ ] App icon added to Assets.xcassets in Xcode
- [ ] At least one screenshot per device size uploaded
- [ ] Privacy policy URL filled in
- [ ] Subscription product created in App Store Connect (Revenue → Subscriptions)
- [ ] TestFlight tested on real device
- [ ] App runs without crash on fresh install (no prior data)
