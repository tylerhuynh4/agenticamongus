export interface Player {
  id: number;
  name: string;
  alive: boolean;
  location: string;
  suspicion: number;
}

export interface GameState {
  phase: "ROAM" | "DISCUSSION" | "VOTING" | "END";
  round: number;
  players: Player[];
  events: string[];
}