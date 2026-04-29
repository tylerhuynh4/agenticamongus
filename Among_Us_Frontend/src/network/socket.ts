export class SocketClient {
  private socket?: WebSocket;

  connect(onMessage: (message: any) => void) {
    this.socket = new WebSocket("ws://localhost:3001/ws");

    this.socket.onopen = () => {
      console.log("Connected to backend");
    };

    this.socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      onMessage(message);
    };

    this.socket.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    this.socket.onclose = () => {
      console.log("Disconnected from backend");
    };
  }

  send(type: string, payload: any = {}) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;

    this.socket.send(
      JSON.stringify({
        type,
        ...payload,
      })
    );
  }
}