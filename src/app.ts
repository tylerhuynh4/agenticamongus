import { renderDashboard } from "./ui/Dashboard";
import { mockState } from "./state/mockData";
import type { GameState } from "./state/GameState";

export class App {
  private state: GameState = structuredClone(mockState);

  constructor(private root: HTMLElement) {
    this.render();
  }

  render() {
    this.root.innerHTML = renderDashboard(this.state);
    this.attachEvents();
  }

  attachEvents() {
    document.getElementById("step")?.addEventListener("click", () => {
      this.state.round++;
      this.state.events.push(`Step executed. Round is now ${this.state.round}`);
      this.render();
    });

    document.getElementById("reset")?.addEventListener("click", () => {
      this.state = structuredClone(mockState);
      this.render();
    });

    document.getElementById("start")?.addEventListener("click", () => {
      this.state.events.push("Simulation started");
      this.render();
    });

    document.getElementById("pause")?.addEventListener("click", () => {
      this.state.events.push("Simulation paused");
      this.render();
    });
  }
}