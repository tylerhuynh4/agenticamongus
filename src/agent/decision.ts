import type { AgentAction, GameState, LlmClient } from "../types.js";

const VALID_ACTION_TYPES: AgentAction["type"][] = [
  "move",
  "do_task",
  "report",
  "call_meeting",
  "vote",
  "sabotage",
  "wait",
];

const KNOWN_LOCATIONS = [
  "cafeteria",
  "electrical",
  "reactor",
  "security",
  "medbay",
  "navigation",
  "weapons",
  "admin",
  "storage",
  "upper engine",
  "lower engine",
  "communications",
  "shields",
  "o2",
];

function extractJsonObject(text: string): string {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Model output does not contain a JSON object.");
  }

  return text.slice(start, end + 1);
}

function sanitizeAction(action: Partial<AgentAction>): AgentAction {
  const validTypes = new Set<AgentAction["type"]>(VALID_ACTION_TYPES);

  const type = validTypes.has(action.type as AgentAction["type"])
    ? (action.type as AgentAction["type"])
    : "wait";

  return {
    type,
    destination: action.destination,
    targetId: action.targetId,
    reason: action.reason?.slice(0, 200) ?? "fallback-safe-action",
  };
}

function toFallbackAction(text: string): AgentAction {
  const lower = text.toLowerCase();

  const foundLocation = KNOWN_LOCATIONS.find((location) =>
    lower.includes(location),
  );

  if (lower.includes("call meeting") || lower.includes("emergency meeting")) {
    return { type: "call_meeting", reason: "heuristic-from-llm-output" };
  }

  if (lower.includes("report")) {
    return { type: "report", reason: "heuristic-from-llm-output" };
  }

  if (lower.includes("vote")) {
    return { type: "vote", reason: "heuristic-from-llm-output" };
  }

  if (lower.includes("sabotage")) {
    return { type: "sabotage", reason: "heuristic-from-llm-output" };
  }

  if (lower.includes("task") || lower.includes("fix") || lower.includes("scan")) {
    return { type: "do_task", reason: "heuristic-from-llm-output" };
  }

  if (lower.includes("move") || lower.includes("go to") || foundLocation) {
    return {
      type: "move",
      destination: foundLocation,
      reason: "heuristic-from-llm-output",
    };
  }

  return {
    type: "wait",
    reason: "failed-to-parse-model-output",
  };
}

function policyFallback(state: GameState): AgentAction {
  const nextTask = state.tasks.find((task) => task.status === "pending");
  if (nextTask) {
    return {
      type: "do_task",
      reason: "policy-fallback-pending-task",
    };
  }

  const visibleAlive = state.visiblePlayers.find((player) => player.alive);
  if (visibleAlive) {
    return {
      type: "move",
      destination: visibleAlive.location,
      reason: "policy-fallback-follow-visible-player",
    };
  }

  return {
    type: "move",
    destination: state.self.location,
    reason: "policy-fallback-hold-position",
  };
}

export function buildDecisionPrompt(state: GameState): string {
  return [
    "You are an Among Us agent deciding a single next action.",
    "Return ONLY a compact JSON object. Do not include markdown, code fences, or extra text.",
    "JSON schema: {\"type\": string, \"targetId\"?: string, \"destination\"?: string, \"reason\": string}",
    `Allowed type values: ${VALID_ACTION_TYPES.join(", ")}.`,
    "Keep reason concise and under 12 words.",
    "Game state:",
    JSON.stringify(state),
  ].join("\n");
}

export async function decideAction(
  state: GameState,
  llm: LlmClient,
): Promise<AgentAction> {
  const prompt = buildDecisionPrompt(state);
  const result = await llm.complete(prompt);

  if (!result.text.trim()) {
    return policyFallback(state);
  }

  try {
    const raw = extractJsonObject(result.text);
    const parsed = JSON.parse(raw) as Partial<AgentAction>;
    return sanitizeAction(parsed);
  } catch {
    const heuristic = toFallbackAction(result.text);
    if (heuristic.type !== "wait") {
      return heuristic;
    }

    return policyFallback(state);
  }
}
