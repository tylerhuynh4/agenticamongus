import { renderDashboard } from "./ui/Dashboard";
import { mockState } from "./state/mockData";
import type { GameState } from "./state/GameState";
import { SocketClient } from "./network/socket";

export class App {
  private root: HTMLElement;
  private state: GameState = structuredClone(mockState);
  private socket = new SocketClient();
  private speedMs = 2000;
  private lastRenderTime = 0;

  constructor(root: HTMLElement) {
    this.root = root;
    this.render();

    this.socket.connect((message) => {
      console.log("Backend message:", message);

      if (message.type === "STATE_SYNC") {
        const now = Date.now();

        if (now - this.lastRenderTime >= this.speedMs) {
          this.state = convertBackendState(message.state);
          this.render();
          this.lastRenderTime = now;
        }
      }

      if (message.type === "GAME_OVER") {
        this.state.phase = "END";
        this.state.events.push(formatGameOver(message.winner, message.reason));
        this.render();
      }
    });
  }

  render() {
    this.root.innerHTML = renderDashboard(this.state);
    this.attachEvents();
    this.syncSpeedControl();
  }

  attachEvents() {
    document.getElementById("start")?.addEventListener("click", () => {
      this.socket.send("START_GAME");
    });

    document.getElementById("pause")?.addEventListener("click", () => {
      this.socket.send("PAUSE");
      this.state.events.push("Paused");
      this.render();
    });

    document.getElementById("resume")?.addEventListener("click", () => {
      this.socket.send("RESUME");
      this.state.events.push("Resumed");
      this.render();
    });

    document.getElementById("reset")?.addEventListener("click", () => {
      this.socket.send("RESET");
      this.lastRenderTime = 0;
    });

    const speedSlider = document.getElementById("speed") as HTMLInputElement | null;

    speedSlider?.addEventListener("input", () => {
      this.speedMs = Number(speedSlider.value);
      this.syncSpeedControl();
      this.socket.send("SET_SPEED", { tickMs: this.speedMs });
    });
  }

  syncSpeedControl() {
    const speedSlider = document.getElementById("speed") as HTMLInputElement | null;
    const speedValue = document.getElementById("speed-value");

    if (speedSlider) {
      speedSlider.value = String(this.speedMs);
    }

    if (speedValue) {
      speedValue.textContent = `${(this.speedMs / 1000).toFixed(1)}s`;
    }
  }
}

function convertBackendState(serverState: any): GameState {
  return {
    phase: convertPhase(serverState.phase),
    round: serverState.tick ?? 0,

    players: Object.values(serverState.agents ?? {}).map((agent: any, index) => ({
      id: index + 1,
      name: agent.name,
      alive: agent.alive,
      role: agent.role ?? "crew",
      location: agent.room,
      suspicion: 0,
      lastAction: getLastAction(serverState, agent.id),
    })),

    events: (serverState.log ?? []).slice(-10).map((event: any) => {
      switch (event.type) {
        case "MOVE":
          return `${getName(serverState, event.agentId)} moved from ${event.from} to ${event.to}`;

        case "TASK":
          return `${getName(serverState, event.agentId)} completed a task in ${event.room}`;

        case "KILL":
          return `${getName(serverState, event.killerId)} eliminated ${getName(serverState, event.victimId)}`;

        case "REPORT":
          return `${getName(serverState, event.reporterId)} reported a body`;

        case "SPEAK":
          return `${getName(serverState, event.agentId)}: "${event.text}"`;

        case "MEETING":
          return `Meeting called by ${getName(serverState, event.callerId)}`;

        case "VOTE":
          return `${getName(serverState, event.voterId)} voted`;

        case "EJECT":
          return `${getName(serverState, event.agentId)} was ejected`;

        case "WIN":
          return formatGameOver(event.winner, event.reason);

        case "PHASE":
          return `Phase changed to ${event.phase}`;

        default:
          return `${event.type}`;
      }
    }),
  };
}

function getLastAction(state: any, agentId: string) {
  const events = [...(state.log ?? [])].reverse();

  const event = events.find((e: any) => {
    return (
      e.agentId === agentId ||
      e.killerId === agentId ||
      e.reporterId === agentId ||
      e.voterId === agentId
    );
  });

  if (!event) return "Waiting";

  switch (event.type) {
    case "MOVE":
      return `Moved to ${event.to}`;

    case "TASK":
      return "Completed task";

    case "KILL":
      return `Eliminated ${getName(state, event.victimId)}`;

    case "REPORT":
      return "Reported body";

    case "MEETING":
      return "Called meeting";

    case "VOTE":
      return "Voted";

    default:
      return event.type;
  }
}

function convertPhase(phase: string): GameState["phase"] {
  if (phase === "play") return "ROAM";
  if (phase === "trial") return "DISCUSSION";
  if (phase === "voting") return "VOTING";
  if (phase === "end") return "END";
  return "ROAM";
}

function getName(state: any, id: string) {
  return state.agents?.[id]?.name ?? id;
}

function formatGameOver(winner: string, reason: string): string {
  if (winner === "crew") {
    if (reason === "imp_eject") return "Crewmates win — all impostors voted out!";
    if (reason === "tasks_done") return "Crewmates win — all tasks completed!";
    return "Crewmates win!";
  }
  if (winner === "imp") {
    if (reason === "crew_outnum") return "Impostors win — crewmates outnumbered!";
    return "Impostors win!";
  }
  return "Game over";
}