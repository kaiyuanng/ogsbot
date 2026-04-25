import Foundation

enum APIError: LocalizedError {
    case badResponse(Int)
    case noData

    var errorDescription: String? {
        switch self {
        case .badResponse(let code): return "Server error (\(code))"
        case .noData:                return "No data returned"
        }
    }
}

final class APIService {
    static let shared = APIService()

    private let baseURL = Config.apiURL

    func fetchDecision(lat: Double, lng: Double) async throws -> DecisionResponse {
        guard let url = URL(string: "\(baseURL)/decision") else {
            throw URLError(.badURL)
        }

        var request = URLRequest(url: url, timeoutInterval: 10)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONEncoder().encode(["lat": lat, "lng": lng])

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let http = response as? HTTPURLResponse else { throw APIError.noData }
        guard http.statusCode == 200 else { throw APIError.badResponse(http.statusCode) }

        return try JSONDecoder().decode(DecisionResponse.self, from: data)
    }
}
