import type { GameState } from "../state/GameState";
import { renderPlayerList } from "./PlayerList";
import { renderEventLog } from "./EventLog";
import { renderControls } from "./Controls";
import { renderGameMap } from "./GameMap";

export function renderDashboard(state: GameState) {
  const winnerText =
    state.phase === "END"
      ? getWinnerText(state.events)
      : "";

  return `
    <div class="dashboard-layout">

      <div class="left-panel">
        <h1> AI Among Us Simulation</h1>

        ${
          state.phase === "END"
            ? `
              <div class="game-over">
                <div>GAME OVER</div>
                <div class="winner-text">${winnerText}</div>
              </div>
            `
            : ""
        }

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

function getWinnerText(events: string[]) {
  const winEvent = events.findLast((e) => e.includes("win") || e.includes("Game over"));
  return winEvent ?? "Game over";
}