import type { GameState } from "../state/GameState";
import { renderPlayerList } from "./PlayerList";
import { renderEventLog } from "./EventLog";
import { renderControls } from "./Controls";
import { renderGameMap } from "./GameMap";

export function renderDashboard(state: GameState) {
  return `
    <div class="dashboard-layout">

      <div class="left-panel">
        <h1> AI Among Us Simulation</h1>
        <h3>Phase: ${state.phase} | Round: ${state.round}</h3>

        <div class="grid">
          ${renderPlayerList(state.players)}
          ${renderEventLog(state.events)}
        </div>

        ${renderControls()}
      </div>

      <div class="right-panel">
        ${renderGameMap(state.players)}
      </div>

    </div>
  `;
}