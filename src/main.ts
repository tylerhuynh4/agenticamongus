import { decideAction } from "./agent/decision.js";
import { LlamaCppClient } from "./ai/llamaClient.js";
import type { GameState } from "./types.js";

async function run(): Promise<void> {
  const sampleState: GameState = {
    round: 3,
    phase: "freeplay",
    emergencyCooldown: 10,
    self: {
      id: "duy-bot",
      role: "crewmate",
      location: "cafeteria",
      alive: true,
      suspicion: 0.1,
    },
    visiblePlayers: [
      {
        id: "player-2",
        role: "crewmate",
        location: "weapons",
        alive: true,
        suspicion: 0.5,
      },
    ],
    tasks: [
      {
        id: "task-1",
        name: "Swipe Card",
        status: "pending",
      },
    ],
  };

  const client = new LlamaCppClient();
  const action = await decideAction(sampleState, client);
  console.log("AI action:", action);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
