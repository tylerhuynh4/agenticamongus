export function renderEventLog(events: string[]) {
  return `
    <div class="panel">
      <h2>Event Log</h2>
      <div class="log">
        ${events.map((e) => `<div>• ${e}</div>`).join("")}
      </div>
    </div>
  `;
}