export class SocketClient {
  private socket?: WebSocket;

  connect(url: string) {
    this.socket = new WebSocket(url);

    this.socket.onopen = () => {
      console.log("Connected to server");
    };

    this.socket.onmessage = (event) => {
      console.log("Received:", event.data);
    };

    this.socket.onclose = () => {
      console.log("Disconnected");
    };
  }

  send(data: any) {
    if (!this.socket) return;
    this.socket.send(JSON.stringify(data));
  }
}