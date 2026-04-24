export class App {
  constructor(private root: HTMLElement) {
    this.render();
  }

  render() {
    this.root.innerHTML = `
      <div style="font-family: Arial; padding: 20px;">
        
        <h1>🧠 AI Among Us Dashboard</h1>
        <p>Status: <b style="color:green">System Online</b></p>

        <hr />

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
          
          <div>
            <h2>Players</h2>
            <div>Agent 1 - Alive</div>
            <div>Agent 2 - Alive</div>
            <div>Agent 3 - Dead</div>
          </div>

          <div>
            <h2>Event Log</h2>
            <div>Agent 2 moved</div>
            <div>Meeting started</div>
          </div>

        </div>

        <hr />

        <button>Start Simulation</button>
        <button>Next Step</button>

      </div>
    `;
  }
}