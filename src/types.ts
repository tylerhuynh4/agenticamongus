export type AgentRole = "crewmate" | "impostor";

export type TaskStatus = "pending" | "done";

export interface GameTask {
  id: string;
  name: string;
  status: TaskStatus;
}

export interface PlayerState {
  id: string;
  role: AgentRole;
  location: string;
  alive: boolean;
  suspicion: number;
}

export interface GameState {
  round: number;
  phase: "freeplay" | "meeting";
  self: PlayerState;
  visiblePlayers: PlayerState[];
  tasks: GameTask[];
  emergencyCooldown: number;
}

export type AgentActionType =
  | "move"
  | "do_task"
  | "report"
  | "call_meeting"
  | "vote"
  | "sabotage"
  | "wait";

export interface AgentAction {
  type: AgentActionType;
  targetId?: string;
  destination?: string;
  reason: string;
}

export interface LlmResult {
  text: string;
  durationMs: number;
}

export interface LlmClient {
  complete(prompt: string): Promise<LlmResult>;
}
