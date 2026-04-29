export function renderControls() {
  return `
    <div class="panel controls">
      <h2>Controls</h2>

      <button id="start">Start</button>
      <button id="pause">Pause</button>
      <button id="resume">Resume</button>
      <button id="reset">Reset</button>

      <div class="speed-control">
        <label>Speed: <span id="speed-value">2.0s</span></label>
        <input 
          type="range" 
          id="speed" 
          min="500" 
          max="3000" 
          step="100" 
          value="2000"
        />
      </div>
    </div>
  `;
}