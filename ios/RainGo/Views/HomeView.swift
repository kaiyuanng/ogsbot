import SwiftUI

struct HomeView: View {
    @StateObject private var vm = HomeViewModel()

    var body: some View {
        ZStack {
            background.ignoresSafeArea()

            VStack(spacing: 0) {
                Spacer()
                content
                Spacer()
                refreshButton
                    .padding(.horizontal, 32)
                    .padding(.bottom, 52)
            }
        }
        .task { await vm.fetchDecision() }
    }

    // MARK: - Content

    @ViewBuilder
    private var content: some View {
        if vm.isLoading {
            loadingView
        } else if let decision = vm.decision {
            decisionView(decision)
        } else if let error = vm.errorMessage {
            errorView(error)
        } else {
            EmptyView()
        }
    }

    private var loadingView: some View {
        VStack(spacing: 20) {
            ProgressView()
                .progressViewStyle(CircularProgressViewStyle(tint: .white))
                .scaleEffect(1.8)
            Text("Checking rain radar…")
                .font(.title3)
                .foregroundColor(.white.opacity(0.8))
        }
    }

    private func decisionView(_ d: DecisionResponse) -> some View {
        VStack(spacing: 28) {
            Text(headline(for: d))
                .font(.system(size: 44, weight: .bold, design: .rounded))
                .foregroundColor(.white)
                .multilineTextAlignment(.center)
                .minimumScaleFactor(0.65)
                .padding(.horizontal, 32)

            Text(d.message)
                .font(.title3)
                .foregroundColor(.white.opacity(0.85))
                .multilineTextAlignment(.center)
                .padding(.horizontal, 40)

            HStack(spacing: 6) {
                Image(systemName: "checkmark.circle.fill")
                    .font(.callout)
                Text("\(d.confidence)% confidence")
                    .font(.callout)
            }
            .foregroundColor(.white.opacity(0.65))
        }
    }

    private func errorView(_ message: String) -> some View {
        VStack(spacing: 16) {
            Image(systemName: "exclamationmark.triangle.fill")
                .font(.system(size: 48))
                .foregroundColor(.white.opacity(0.8))
            Text(message)
                .font(.body)
                .foregroundColor(.white.opacity(0.85))
                .multilineTextAlignment(.center)
                .padding(.horizontal, 40)
        }
    }

    // MARK: - Refresh button

    private var refreshButton: some View {
        Button {
            Task { await vm.fetchDecision() }
        } label: {
            Text("Check again")
                .font(.system(size: 18, weight: .semibold))
                .foregroundColor(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 18)
                .background(Color.white.opacity(0.22))
                .cornerRadius(16)
        }
        .disabled(vm.isLoading)
    }

    // MARK: - Helpers

    private var background: Color {
        switch vm.decision.flatMap({ RainState($0.state) }) {
        case .go:    return Color(red: 0.10, green: 0.68, blue: 0.40)
        case .wait:  return Color(red: 0.90, green: 0.58, blue: 0.08)
        case .delay: return Color(red: 0.85, green: 0.18, blue: 0.18)
        default:     return Color(red: 0.13, green: 0.13, blue: 0.20)
        }
    }

    private func headline(for d: DecisionResponse) -> String {
        switch RainState(d.state) {
        case .go:    return "Safe to go now"
        case .wait:  return "Wait \(d.minutes) minutes"
        case .delay:
            return d.minutes == 0 ? "It's raining now" : "Heavy rain in \(d.minutes) min"
        default:     return "—"
        }
    }
}

#Preview {
    HomeView()
}
