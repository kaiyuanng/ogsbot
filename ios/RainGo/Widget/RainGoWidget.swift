// RainGoWidget.swift
// Add this file to the RainGoWidget extension target in Xcode (NOT the main app target).
// See SETUP.md → Part 5 for full widget setup instructions.

import WidgetKit
import SwiftUI

// MARK: - Entry

struct RainGoEntry: TimelineEntry {
    let date: Date
    let state: String
    let minutes: Int
    let confidence: Int
    let locationName: String
    let updatedAt: Date?

    static let placeholder = RainGoEntry(
        date: .now, state: "GO", minutes: 0, confidence: 90,
        locationName: "Singapore", updatedAt: .now
    )
}

// MARK: - Provider

struct RainGoProvider: TimelineProvider {
    func placeholder(in context: Context) -> RainGoEntry { .placeholder }

    func getSnapshot(in context: Context, completion: @escaping (RainGoEntry) -> Void) {
        completion(context.isPreview ? .placeholder : entryFromStore())
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<RainGoEntry>) -> Void) {
        let entry = entryFromStore()
        let next = Calendar.current.date(byAdding: .minute, value: 5, to: .now)!
        completion(Timeline(entries: [entry], policy: .after(next)))
    }

    private func entryFromStore() -> RainGoEntry {
        let data = WidgetSharedStore.load()
        return RainGoEntry(
            date: .now,
            state: data.state,
            minutes: data.minutes,
            confidence: data.confidence,
            locationName: data.location,
            updatedAt: data.updated
        )
    }
}

// MARK: - View

struct RainGoWidgetView: View {
    let entry: RainGoEntry
    @Environment(\.widgetFamily) var family

    var body: some View {
        ZStack {
            gradient.ignoresSafeArea()
            VStack(alignment: .leading, spacing: 4) {
                HStack(alignment: .top) {
                    Image(systemName: icon)
                        .font(.system(size: family == .systemSmall ? 20 : 26, weight: .light))
                        .foregroundColor(.white.opacity(0.9))
                    Spacer()
                    if !entry.locationName.isEmpty {
                        Text(entry.locationName)
                            .font(.caption2)
                            .foregroundColor(.white.opacity(0.55))
                            .lineLimit(1)
                    }
                }
                Spacer()
                Text(headline)
                    .font(.system(size: family == .systemSmall ? 21 : 28, weight: .bold, design: .rounded))
                    .foregroundColor(.white)
                    .minimumScaleFactor(0.65)
                    .lineLimit(2)
                if let updated = entry.updatedAt {
                    Text(RelativeDateTimeFormatter().localizedString(for: updated, relativeTo: .now))
                        .font(.caption2)
                        .foregroundColor(.white.opacity(0.45))
                }
            }
            .padding(14)
        }
    }

    private var icon: String {
        switch entry.state {
        case "GO":    return "sun.max.fill"
        case "WAIT":  return "cloud.drizzle.fill"
        case "DELAY": return "cloud.bolt.rain.fill"
        default:      return "questionmark.circle"
        }
    }

    private var headline: String {
        switch entry.state {
        case "GO":    return "Safe to go"
        case "WAIT":  return "Wait \(entry.minutes) min"
        case "DELAY": return entry.minutes == 0 ? "Raining now" : "Rain in \(entry.minutes) min"
        default:      return "Open app"
        }
    }

    private var gradient: LinearGradient {
        let colors: [Color]
        switch entry.state {
        case "GO":    colors = [Color(hex: "0D9E5A"), Color(hex: "0A7A44")]
        case "WAIT":  colors = [Color(hex: "E8920A"), Color(hex: "C47208")]
        case "DELAY": colors = [Color(hex: "D42B2B"), Color(hex: "A01F1F")]
        default:      colors = [Color(hex: "1C1C2E"), Color(hex: "111120")]
        }
        return LinearGradient(colors: colors, startPoint: .topLeading, endPoint: .bottomTrailing)
    }
}

// MARK: - Widget

@main
struct RainGoWidget: Widget {
    let kind = "RainGoWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: RainGoProvider()) { entry in
            RainGoWidgetView(entry: entry)
        }
        .configurationDisplayName("RainGo")
        .description("GO, WAIT, or DELAY — at a glance.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

// MARK: - Color helper (duplicated; widgets can't import the main app target)

private extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        self.init(
            red:   Double((int >> 16) & 0xFF) / 255,
            green: Double((int >> 8)  & 0xFF) / 255,
            blue:  Double(int         & 0xFF) / 255
        )
    }
}
