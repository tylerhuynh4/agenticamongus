export interface Player {
  id: number;
  name: string;
  alive: boolean;
  role: "crew" | "imp";
  location: string;
  suspicion: number;
  lastAction?: string;
}

export interface GameState {
  phase: "ROAM" | "DISCUSSION" | "VOTING" | "END";
  round: number;
  players: Player[];
  events: string[];
}