import Foundation

// Shared UserDefaults bridge between the main app and the widget extension.
// Both targets must have the same App Group capability enabled in Xcode
// (see SETUP.md → Part 5 for instructions).
struct WidgetSharedStore {
    static let appGroupID = "group.com.raingo.app"

    private static var defaults: UserDefaults? { UserDefaults(suiteName: appGroupID) }

    static func save(state: String, minutes: Int, confidence: Int, locationName: String) {
        guard let d = defaults else { return }
        d.set(state,        forKey: "lastState")
        d.set(minutes,      forKey: "lastMinutes")
        d.set(confidence,   forKey: "lastConfidence")
        d.set(locationName, forKey: "lastLocation")
        d.set(Date(),       forKey: "lastUpdated")
    }

    static func load() -> (state: String, minutes: Int, confidence: Int, location: String, updated: Date?) {
        let d = defaults
        return (
            state:      d?.string(forKey: "lastState")             ?? "—",
            minutes:    d?.integer(forKey: "lastMinutes")          ?? 0,
            confidence: d?.integer(forKey: "lastConfidence")       ?? 0,
            location:   d?.string(forKey: "lastLocation")          ?? "",
            updated:    d?.object(forKey: "lastUpdated") as? Date
        )
    }
}
