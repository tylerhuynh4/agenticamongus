import type { Player } from "../state/GameState";

const mapImage = "/map.webp";

export function renderGameMap(players: Player[]) {
  return `
    <div class="map-panel">
      <h2>Map</h2>

      <div class="map-container" id="map">
        <img class="map-image" src="${mapImage}" />

        ${players
          .map(
            (p, i) => `
              <div 
                class="player-dot ${p.alive ? "alive" : "dead"}"
                style="left:${getPlayerX(i)}%; top:${getPlayerY(i)}%;"
              >
                ${p.id}
              </div>
            `
          )
          .join("")}
      </div>
    </div>
  `;
}

function getPlayerX(i: number) {
  return [45, 25, 12, 70][i] ?? 50;
}

function getPlayerY(i: number) {
  return [18, 62, 48, 70][i] ?? 50;
}