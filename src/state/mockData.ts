import { GameState } from "./GameState";

export const mockState: GameState = {
  phase: "ROAM",
  round: 1,
  players: [
    { id: 1, name: "Agent 1", alive: true, location: "Cafeteria", suspicion: 0.2 },
    { id: 2, name: "Agent 2", alive: true, location: "Electrical", suspicion: 0.8 },
    { id: 3, name: "Agent 3", alive: false, location: "MedBay", suspicion: 0.1 },
    { id: 4, name: "Agent 4", alive: true, location: "Admin", suspicion: 0.5 }
  ],
  events: [
    "Agent 2 moved to Electrical",
    "Agent 3 was eliminated",
    "Meeting started"
  ]
};