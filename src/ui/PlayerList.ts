import type { Player } from "../state/GameState";

export function renderPlayerList(players: Player[]) {
  return `
    <div class="panel">
      <h2>Players</h2>

      <div class="player-header">
        <span>Name</span>
        <span>Status</span>
        <span>Room</span>
        <span>Last Action</span>
      </div>

      ${players
        .map(
          (p) => `
            <div class="player-row">
              <span class="name">${p.name}</span>
              <span>${p.alive ? "🟢 Alive" : "🔴 Dead"}</span>
              <span class="room">${p.location}</span>
              <span class="last-action">${p.lastAction ?? "Waiting"}</span>
            </div>
          `
        )
        .join("")}
    </div>
  `;
}