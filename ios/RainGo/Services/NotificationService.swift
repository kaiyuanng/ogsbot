import Foundation
import UserNotifications

final class NotificationService {
    static let shared = NotificationService()

    func requestPermission() async -> Bool {
        let center = UNUserNotificationCenter.current()
        let settings = await center.notificationSettings()
        if settings.authorizationStatus == .authorized { return true }
        do {
            return try await center.requestAuthorization(options: [.alert, .sound, .badge])
        } catch {
            return false
        }
    }

    // Schedule a "check now" nudge after `minutes` minutes.
    // Returns the notification ID so the caller can cancel it.
    func scheduleRainCheck(inMinutes minutes: Int) async -> String {
        let id = "raingo-\(UUID().uuidString)"
        let content = UNMutableNotificationContent()
        content.title = "Rain check — RainGo"
        content.body = "Time to see if it's safe to head out now."
        content.sound = .default
        let trigger = UNTimeIntervalNotificationTrigger(
            timeInterval: TimeInterval(max(1, minutes) * 60),
            repeats: false
        )
        let request = UNNotificationRequest(identifier: id, content: content, trigger: trigger)
        try? await UNUserNotificationCenter.current().add(request)
        return id
    }

    func cancel(id: String) {
        UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: [id])
    }
}
