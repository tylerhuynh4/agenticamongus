import { Player } from "../state/GameState";

export function renderPlayerList(players: Player[]) {
  return `
    <div class="panel">
      <h2>Players</h2>
      ${players
        .map(
          (p) => `
        <div class="player">
          <strong>${p.name}</strong>
          <span>${p.alive ? "🟢 Alive" : "🔴 Dead"}</span>
          <span>${p.location}</span>
          <span>Sus: ${p.suspicion.toFixed(2)}</span>
        </div>
      `
        )
        .join("")}
    </div>
  `;
}