import Foundation

struct DecisionResponse: Decodable {
    let state: String       // "GO" | "WAIT" | "DELAY"
    let minutes: Int
    let confidence: Int
    let message: String
    let dataAgeSeconds: Int?
}

enum RainState {
    case go, wait, delay

    init?(_ raw: String) {
        switch raw {
        case "GO":    self = .go
        case "WAIT":  self = .wait
        case "DELAY": self = .delay
        default:      return nil
        }
    }
}
