import SwiftUI

// MARK: - Root view

struct HomeView: View {
    @StateObject private var vm = HomeViewModel()
    @State private var flashOpacity: Double = 0

    var body: some View {
        ZStack {
            backgroundGradient.ignoresSafeArea()

            // State-change flash overlay
            Color.white
                .ignoresSafeArea()
                .opacity(flashOpacity)
                .allowsHitTesting(false)

            if let rainState = vm.decision.flatMap({ RainState($0.state) }),
               rainState != .go {
                PulseRings(color: pulseColor(for: rainState))
            }

            VStack(spacing: 0) {
                topBar
                    .padding(.top, 56)
                    .padding(.horizontal, 20)

                Spacer()

                content
                    .transition(.opacity.combined(with: .scale(scale: 0.97)))

                Spacer()

                bottomBar
                    .padding(.bottom, 52)
            }
        }
        .animation(.easeInOut(duration: 0.45), value: vm.decision?.state)
        .onChange(of: vm.stateDidChange) { changed in
            guard changed else { return }
            withAnimation(.easeOut(duration: 0.08)) { flashOpacity = 0.35 }
            withAnimation(.easeIn(duration: 0.5).delay(0.08)) { flashOpacity = 0 }
        }
        .task { await vm.fetchDecision() }
    }

    // MARK: - Top bar (share)

    private var topBar: some View {
        HStack {
            Spacer()
            if vm.decision != nil {
                ShareLink(item: vm.shareText) {
                    Image(systemName: "square.and.arrow.up")
                        .font(.system(size: 18, weight: .medium))
                        .foregroundColor(.white.opacity(0.65))
                        .frame(width: 40, height: 40)
                        .background(.ultraThinMaterial, in: Circle())
                }
                .transition(.opacity.combined(with: .scale(scale: 0.8)))
            }
        }
    }

    // MARK: - Content switcher

    @ViewBuilder
    private var content: some View {
        if vm.isLoading {
            LoadingView()
        } else if vm.locationDenied {
            LocationDeniedView()
        } else if let d = vm.decision {
            DecisionView(decision: d)
        } else if let err = vm.errorMessage {
            ErrorStateView(message: err)
        }
    }

    // MARK: - Bottom bar

    private var bottomBar: some View {
        VStack(spacing: 10) {
            // Countdown / age
            if vm.isLoading {
                EmptyView()
            } else if let age = vm.decision?.dataAgeSeconds {
                Text(ageLabel(age))
                    .font(.caption)
                    .foregroundColor(.white.opacity(0.35))
            }

            Text(countdownLabel)
                .font(.caption)
                .foregroundColor(.white.opacity(0.35))
                .animation(.none, value: vm.nextRefreshIn)

            // "Notify me when safe" — only shown on WAIT / DELAY
            if let state = vm.decision.flatMap({ RainState($0.state) }), state != .go, !vm.isLoading {
                Button {
                    vm.hasScheduledAlert ? vm.cancelAlert() : vm.scheduleAlert()
                } label: {
                    HStack(spacing: 7) {
                        Image(systemName: vm.hasScheduledAlert ? "bell.slash" : "bell")
                            .font(.system(size: 14, weight: .medium))
                        Text(vm.hasScheduledAlert ? "Cancel reminder" : "Remind me when safe")
                            .font(.system(size: 14, weight: .medium))
                    }
                    .foregroundColor(.white.opacity(0.75))
                    .padding(.horizontal, 18)
                    .padding(.vertical, 10)
                    .background(Color.white.opacity(0.1), in: Capsule())
                    .overlay(Capsule().stroke(Color.white.opacity(0.18), lineWidth: 1))
                }
                .transition(.opacity.combined(with: .move(edge: .bottom)))
            }

            // Check again button
            Button {
                vm.cancelAlert()
                Task { await vm.fetchDecision() }
            } label: {
                HStack(spacing: 8) {
                    if vm.isLoading {
                        ProgressView().tint(.white).scaleEffect(0.8)
                    } else {
                        Image(systemName: "arrow.clockwise")
                    }
                    Text(vm.isLoading ? "Checking…" : "Check again")
                        .fontWeight(.semibold)
                }
                .font(.system(size: 17))
                .foregroundColor(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 18)
                .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 16))
                .overlay(
                    RoundedRectangle(cornerRadius: 16)
                        .stroke(Color.white.opacity(0.2), lineWidth: 1)
                )
            }
            .disabled(vm.isLoading)
            .padding(.horizontal, 32)
        }
    }

    // MARK: - Helpers

    private var backgroundGradient: LinearGradient {
        let colors = gradientColors(for: vm.decision.flatMap { RainState($0.state) })
        return LinearGradient(colors: colors, startPoint: .topLeading, endPoint: .bottomTrailing)
    }

    private func gradientColors(for state: RainState?) -> [Color] {
        switch state {
        case .go:    return [Color(hex: "0D9E5A"), Color(hex: "0A7A44")]
        case .wait:  return [Color(hex: "E8920A"), Color(hex: "C47208")]
        case .delay: return [Color(hex: "D42B2B"), Color(hex: "A01F1F")]
        default:     return [Color(hex: "1C1C2E"), Color(hex: "111120")]
        }
    }

    private func pulseColor(for state: RainState) -> Color {
        state == .delay ? Color(hex: "FF6B6B") : Color(hex: "FFB84D")
    }

    private func ageLabel(_ seconds: Int) -> String {
        seconds < 60 ? "Radar updated just now" : "Radar updated \(seconds / 60) min ago"
    }

    private var countdownLabel: String {
        guard !vm.isLoading else { return "" }
        let s = vm.nextRefreshIn
        let m = s / 60, sec = s % 60
        return "Next update in \(m):\(String(format: "%02d", sec))"
    }
}

// MARK: - Loading

private struct LoadingView: View {
    var body: some View {
        VStack(spacing: 18) {
            ProgressView()
                .progressViewStyle(CircularProgressViewStyle(tint: .white))
                .scaleEffect(1.6)
            Text("Checking rain radar…")
                .font(.title3)
                .foregroundColor(.white.opacity(0.75))
        }
    }
}

// MARK: - Decision card

private struct DecisionView: View {
    let decision: DecisionResponse

    var body: some View {
        VStack(spacing: 32) {
            Image(systemName: iconName)
                .font(.system(size: 64, weight: .light))
                .foregroundColor(.white.opacity(0.9))
                .shadow(color: .black.opacity(0.2), radius: 8, x: 0, y: 4)

            Text(headline)
                .font(.system(size: 46, weight: .bold, design: .rounded))
                .foregroundColor(.white)
                .multilineTextAlignment(.center)
                .minimumScaleFactor(0.6)
                .shadow(color: .black.opacity(0.15), radius: 4, x: 0, y: 2)
                .padding(.horizontal, 28)

            Text(decision.message)
                .font(.system(size: 17, weight: .regular))
                .foregroundColor(.white.opacity(0.8))
                .multilineTextAlignment(.center)
                .padding(.horizontal, 40)

            HStack(spacing: 6) {
                Circle()
                    .fill(confidenceColor)
                    .frame(width: 7, height: 7)
                Text("\(decision.confidence)% confidence")
                    .font(.system(size: 13, weight: .medium))
            }
            .foregroundColor(.white.opacity(0.6))
            .padding(.horizontal, 14)
            .padding(.vertical, 6)
            .background(Color.white.opacity(0.12), in: Capsule())
        }
    }

    private var iconName: String {
        switch RainState(decision.state) {
        case .go:    return "sun.max.fill"
        case .wait:  return "cloud.drizzle.fill"
        case .delay: return "cloud.bolt.rain.fill"
        default:     return "questionmark.circle"
        }
    }

    private var headline: String {
        switch RainState(decision.state) {
        case .go:    return "Safe to go now"
        case .wait:  return "Wait \(decision.minutes) minutes"
        case .delay: return decision.minutes == 0 ? "It's raining now" : "Rain in \(decision.minutes) min"
        default:     return "—"
        }
    }

    private var confidenceColor: Color {
        decision.confidence >= 80 ? Color(hex: "7AE28C") : Color(hex: "FFD166")
    }
}

// MARK: - Error states

private struct ErrorStateView: View {
    let message: String

    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: "exclamationmark.triangle.fill")
                .font(.system(size: 52))
                .foregroundColor(.white.opacity(0.75))
            Text("Something went wrong")
                .font(.title2.bold())
                .foregroundColor(.white)
            Text(message)
                .font(.body)
                .foregroundColor(.white.opacity(0.7))
                .multilineTextAlignment(.center)
                .padding(.horizontal, 40)
        }
    }
}

private struct LocationDeniedView: View {
    var body: some View {
        VStack(spacing: 20) {
            Image(systemName: "location.slash.fill")
                .font(.system(size: 52))
                .foregroundColor(.white.opacity(0.8))

            Text("Location needed")
                .font(.title2.bold())
                .foregroundColor(.white)

            Text("RainGo needs your location to check for rain at your position.")
                .font(.body)
                .foregroundColor(.white.opacity(0.72))
                .multilineTextAlignment(.center)
                .padding(.horizontal, 40)

            Button("Open Settings") {
                if let url = URL(string: UIApplication.openSettingsURLString) {
                    UIApplication.shared.open(url)
                }
            }
            .font(.system(size: 16, weight: .semibold))
            .foregroundColor(.white)
            .padding(.horizontal, 28)
            .padding(.vertical, 13)
            .background(Color.white.opacity(0.2), in: Capsule())
            .overlay(Capsule().stroke(Color.white.opacity(0.25), lineWidth: 1))
        }
    }
}

// MARK: - Pulse rings

private struct PulseRings: View {
    let color: Color
    @State private var scale: CGFloat = 0.55
    @State private var opacity: Double = 0.35

    var body: some View {
        ZStack {
            ring(delay: 0)
            ring(delay: 0.8)
        }
    }

    private func ring(delay: Double) -> some View {
        Circle()
            .stroke(color, lineWidth: 1.5)
            .frame(width: 300, height: 300)
            .scaleEffect(scale)
            .opacity(opacity)
            .onAppear {
                withAnimation(
                    .easeOut(duration: 2.4)
                    .repeatForever(autoreverses: false)
                    .delay(delay)
                ) {
                    scale = 1.5
                    opacity = 0
                }
            }
    }
}

// MARK: - Hex color helper

extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let r = Double((int >> 16) & 0xFF) / 255
        let g = Double((int >> 8)  & 0xFF) / 255
        let b = Double(int         & 0xFF) / 255
        self.init(red: r, green: g, blue: b)
    }
}

#Preview {
    HomeView()
}
