import type { Player } from "../state/GameState";

const mapImage = "/map.webp";

export function renderGameMap(players: Player[]) {
  return `
    <div class="map-panel">
      <h2>Map</h2>

      <div class="map-container" id="map">
        <img class="map-image" src="${mapImage}" />

        ${players
          .map((p, index) => {
            const pos = getRoomPosition(p.location);
            const offset = getPlayerOffset(index);

            return `
              <div
                class="player-dot ${p.alive ? "alive" : "dead"}"
                style="left:${pos.x + offset.x}%; top:${pos.y + offset.y}%;"
                title="${p.name} - ${p.location}"
              >
                ${p.name[0]}
              </div>
            `;
          })
          .join("")}
      </div>
    </div>
  `;
}

function getRoomPosition(room: string) {
  const rooms: Record<string, { x: number; y: number }> = {
    cafe: { x: 52, y: 25 },

    weapons: { x: 78, y: 30 },
    nav: { x: 91, y: 43 },
    o2: { x: 70, y: 38 },
    shields: { x: 76, y: 73 },
    comms: { x: 63, y: 82 },

    storage: { x: 50, y: 75 },
    admin: { x: 63, y: 58 },

    elec: { x: 37, y: 71 },
    sec: { x: 23, y: 48 },
    med: { x: 35, y: 39 },

    reactor: { x: 12, y: 47 },
    engine_l: { x: 18, y: 28 },
    engine_r: { x: 18, y: 72 },
  };

  return rooms[room] ?? { x: 52, y: 25 };
}

function getPlayerOffset(index: number) {
  const offsets = [
    { x: 0, y: 0 },
    { x: 2, y: 0 },
    { x: -2, y: 0 },
    { x: 0, y: 2 },
    { x: 0, y: -2 },
    { x: 2, y: 2 },
    { x: -2, y: -2 },
    { x: 2, y: -2 },
  ];

  return offsets[index % offsets.length];
}