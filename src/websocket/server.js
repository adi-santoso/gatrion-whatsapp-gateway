import { Server } from 'socket.io';

class WebSocketServer {
  constructor(httpServer) {
    this.io = new Server(httpServer, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      },
      transports: ['websocket'],
      pingTimeout: 60000,
      pingInterval: 25000
    });
  }
  
  initialize() {
    this.io.on('connection', (socket) => {
      const sessionId = socket.handshake.query.sessionId;
      
      if (!sessionId) {
        console.log('Client connected without sessionId');
        socket.disconnect();
        return;
      }
      
      const roomName = `session-${sessionId}`;
      socket.join(roomName);
      console.log(`Client joined room: ${roomName}`);
      
      socket.on('disconnect', () => {
        console.log(`Client left room: ${roomName}`);
      });
    });
  }
  
  emitToSession(sessionId, event, data) {
    this.io.to(`session-${sessionId}`).emit(event, data);
  }
  
  emitToAll(event, data) {
    this.io.emit(event, data);
  }
  
  async getConnectedClients(sessionId) {
    const roomName = `session-${sessionId}`;
    const sockets = await this.io.in(roomName).fetchSockets();
    return sockets.length;
  }
}

export default WebSocketServer;
