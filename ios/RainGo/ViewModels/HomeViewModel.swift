import Foundation
import CoreLocation
import UIKit

@MainActor
final class HomeViewModel: NSObject, ObservableObject {
    @Published var decision: DecisionResponse?
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var locationDenied = false

    private let locationManager = CLLocationManager()
    private var locationContinuation: CheckedContinuation<CLLocation, Error>?

    override init() {
        super.init()
        locationManager.delegate = self
        locationManager.desiredAccuracy = kCLLocationAccuracyKilometer
    }

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
            decision = result
            triggerHaptic(for: result.state)
        } catch let err as CLError where err.code == .denied {
            locationDenied = true
        } catch {
            errorMessage = error.localizedDescription
            UINotificationFeedbackGenerator().notificationOccurred(.error)
        }

        isLoading = false
    }

    // MARK: - Haptics

    private func triggerHaptic(for state: String) {
        switch state {
        case "GO":
            UINotificationFeedbackGenerator().notificationOccurred(.success)
        case "WAIT":
            UIImpactFeedbackGenerator(style: .medium).impactOccurred()
        case "DELAY":
            UINotificationFeedbackGenerator().notificationOccurred(.warning)
        default:
            break
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
        if manager.authorizationStatus == .authorizedWhenInUse
            || manager.authorizationStatus == .authorizedAlways {
            manager.requestLocation()
        } else if manager.authorizationStatus == .denied
                    || manager.authorizationStatus == .restricted {
            locationContinuation?.resume(throwing: CLError(.denied))
            locationContinuation = nil
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
