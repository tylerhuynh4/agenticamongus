import { describe, expect, it } from "vitest";
import { decideAction } from "../src/agent/decision.js";
import { MockLlmClient } from "../src/ai/llamaClient.js";
import type { GameState } from "../src/types.js";

const baseState: GameState = {
  round: 1,
  phase: "freeplay",
  emergencyCooldown: 0,
  self: {
    id: "bot",
    role: "crewmate",
    location: "cafeteria",
    alive: true,
    suspicion: 0,
  },
  visiblePlayers: [],
  tasks: [],
};

describe("decideAction", () => {
  it("parses a valid JSON action", async () => {
    const llm = new MockLlmClient(
      '{"type":"move","destination":"electrical","reason":"going to task"}',
    );

    const action = await decideAction(baseState, llm);

    expect(action.type).toBe("move");
    expect(action.destination).toBe("electrical");
  });

  it("falls back to wait on invalid output", async () => {
    const llm = new MockLlmClient("not json");

    const action = await decideAction(baseState, llm);

    expect(action.type).toBe("move");
    expect(action.reason).toBe("policy-fallback-hold-position");
  });

  it("maps unstructured task text to do_task", async () => {
    const llm = new MockLlmClient("I should do my task in electrical now.");

    const action = await decideAction(baseState, llm);

    expect(action.type).toBe("do_task");
    expect(action.reason).toBe("heuristic-from-llm-output");
  });

  it("maps location mentions to move", async () => {
    const llm = new MockLlmClient("Go to navigation and stay alert.");

    const action = await decideAction(baseState, llm);

    expect(action.type).toBe("move");
    expect(action.destination).toBe("navigation");
  });

  it("uses policy fallback when output is empty", async () => {
    const stateWithPendingTask: GameState = {
      ...baseState,
      tasks: [
        {
          id: "task-x",
          name: "Swipe Card",
          status: "pending",
        },
      ],
    };

    const llm = new MockLlmClient("");

    const action = await decideAction(stateWithPendingTask, llm);

    expect(action.type).toBe("do_task");
    expect(action.reason).toBe("policy-fallback-pending-task");
  });
});
