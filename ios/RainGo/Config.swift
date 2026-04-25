import Foundation

enum Config {
    // ─────────────────────────────────────────────────────────────────────
    // CHANGE THIS to test on a real iPhone.
    //
    // Option A — same WiFi as your Mac:
    //   Run `ipconfig getifaddr en0` in Terminal, paste the IP below.
    //   e.g. "http://192.168.1.42:3000"
    //
    // Option B — ngrok tunnel (works anywhere):
    //   Run `ngrok http 3000`, paste the https URL below.
    //   e.g. "https://abc123.ngrok-free.app"
    //
    // Option C — deployed backend:
    //   Paste your Railway / Render URL.
    //   e.g. "https://raingo-backend.up.railway.app"
    // ─────────────────────────────────────────────────────────────────────
    static let apiURL: String = {
        // 1. Xcode scheme env var overrides everything (great for CI)
        if let env = ProcessInfo.processInfo.environment["RAINGO_API_URL"], !env.isEmpty {
            return env
        }
        // 2. Change the string below for quick local testing
        return "http://localhost:3000"
    }()
}
