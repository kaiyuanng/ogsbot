import Foundation
import CoreLocation
import UIKit

@MainActor
final class HomeViewModel: NSObject, ObservableObject {
    @Published var decision: DecisionResponse?
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var locationDenied = false

    // Auto-refresh
    @Published var nextRefreshIn: Int = 300

    // Notifications
    @Published var hasScheduledAlert = false

    // Flash animation flag — HomeView watches this to trigger the overlay
    @Published var stateDidChange = false

    private var previousState: String?
    private var countdownTimer: Timer?
    private var alertNotificationID: String?
    private var lastLocationName: String = ""

    private let locationManager = CLLocationManager()
    private var locationContinuation: CheckedContinuation<CLLocation, Error>?

    override init() {
        super.init()
        locationManager.delegate = self
        locationManager.desiredAccuracy = kCLLocationAccuracyKilometer
        startCountdown()
    }

    deinit { countdownTimer?.invalidate() }

    // MARK: - Fetch

    func fetchDecision() async {
        isLoading = true
        errorMessage = nil
        locationDenied = false

        do {
            let location = try await requestLocation()
            let result = try await APIService.shared.fetchDecision(
                lat: location.coordinate.latitude,
                lng: location.coordinate.longitude
            )

            if let prev = previousState, prev != result.state {
                stateDidChange = true
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.6) { self.stateDidChange = false }
            }
            previousState = result.state
            decision = result

            WidgetSharedStore.save(
                state: result.state,
                minutes: result.minutes,
                confidence: result.confidence,
                locationName: lastLocationName
            )

            triggerHaptic(for: result.state)
            startCountdown()
        } catch let err as CLError where err.code == .denied {
            locationDenied = true
        } catch {
            errorMessage = error.localizedDescription
            UINotificationFeedbackGenerator().notificationOccurred(.error)
        }

        isLoading = false
    }

    // MARK: - Auto-refresh countdown

    private func startCountdown() {
        countdownTimer?.invalidate()
        nextRefreshIn = 300
        countdownTimer = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { [weak self] _ in
            guard let self else { return }
            Task { @MainActor in
                if self.nextRefreshIn <= 1 {
                    self.nextRefreshIn = 300
                    if !self.isLoading { await self.fetchDecision() }
                } else {
                    self.nextRefreshIn -= 1
                }
            }
        }
        RunLoop.main.add(countdownTimer!, forMode: .common)
    }

    // MARK: - Notifications

    func scheduleAlert() {
        Task {
            let granted = await NotificationService.shared.requestPermission()
            guard granted else { return }
            let minutes = max(5, decision?.minutes ?? 20)
            let id = await NotificationService.shared.scheduleRainCheck(inMinutes: minutes)
            alertNotificationID = id
            hasScheduledAlert = true
        }
    }

    func cancelAlert() {
        if let id = alertNotificationID {
            NotificationService.shared.cancel(id: id)
            alertNotificationID = nil
        }
        hasScheduledAlert = false
    }

    // MARK: - Share

    var shareText: String {
        guard let d = decision else { return "Check RainGo for rain conditions in Singapore." }
        let loc = lastLocationName.isEmpty ? "Singapore" : lastLocationName
        switch d.state {
        case "GO":
            return "RainGo ✅ Safe to go at \(loc) — no rain nearby. (\(d.confidence)% confidence)"
        case "WAIT":
            return "RainGo ⏳ Rain in \(d.minutes) min at \(loc). Best to wait. (\(d.confidence)% confidence)"
        case "DELAY":
            return d.minutes == 0
                ? "RainGo 🌧 It's raining at \(loc) right now."
                : "RainGo 🌧 Rain hits \(loc) in \(d.minutes) min — delay your trip. (\(d.confidence)% confidence)"
        default:
            return "Check RainGo for rain conditions in Singapore."
        }
    }

    // MARK: - Haptics

    private func triggerHaptic(for state: String) {
        switch state {
        case "GO":    UINotificationFeedbackGenerator().notificationOccurred(.success)
        case "WAIT":  UIImpactFeedbackGenerator(style: .medium).impactOccurred()
        case "DELAY": UINotificationFeedbackGenerator().notificationOccurred(.warning)
        default: break
        }
    }

    // MARK: - Location

    private func requestLocation() async throws -> CLLocation {
        if let loc = locationManager.location, -loc.timestamp.timeIntervalSinceNow < 60 {
            return loc
        }
        return try await withCheckedThrowingContinuation { continuation in
            locationContinuation = continuation
            switch locationManager.authorizationStatus {
            case .notDetermined:
                locationManager.requestWhenInUseAuthorization()
            case .denied, .restricted:
                continuation.resume(throwing: CLError(.denied))
                locationContinuation = nil
            default:
                locationManager.requestLocation()
            }
        }
    }
}

extension HomeViewModel: CLLocationManagerDelegate {
    func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        switch manager.authorizationStatus {
        case .authorizedWhenInUse, .authorizedAlways:
            manager.requestLocation()
        case .denied, .restricted:
            locationContinuation?.resume(throwing: CLError(.denied))
            locationContinuation = nil
        default: break
        }
    }

    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let loc = locations.last else { return }
        locationContinuation?.resume(returning: loc)
        locationContinuation = nil
    }

    func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        locationContinuation?.resume(throwing: error)
        locationContinuation = nil
    }
}
