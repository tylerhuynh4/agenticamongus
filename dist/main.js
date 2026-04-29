import { decideAction } from "./agent/decision.js";
import { OpenRouterClient } from "./ai/llamaClient.js";
async function run() {
    const sampleState = {
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
    const client = new OpenRouterClient();
    const action = await decideAction(sampleState, client);
    console.log("AI action:", action);
}
run().catch((error) => {
    console.error(error);
    process.exit(1);
});
