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
      let sessionId = socket.handshake.query.sessionId;
      
      if (!sessionId) {
        console.log('[WebSocket] Client connected without sessionId');
        socket.disconnect();
        return;
      }
      
      console.log(`[WebSocket] Client connecting with sessionId: ${sessionId}`);
      
      // Remove 'session-' prefix if already present (avoid double prefix)
      if (sessionId.startsWith('session-')) {
        sessionId = sessionId.substring(8); // Remove 'session-' (8 chars)
      }
      
      const roomName = `session-${sessionId}`;
      socket.join(roomName);
      console.log(`[WebSocket] Client joined room: ${roomName}`);
      
      socket.on('disconnect', () => {
        console.log(`[WebSocket] Client left room: ${roomName}`);
      });
    });
  }
  
  emitToSession(sessionId, event, data) {
    // Remove 'session-' prefix if already present (same as in initialize)
    if (sessionId.startsWith('session-')) {
      sessionId = sessionId.substring(8);
    }
    
    const roomName = `session-${sessionId}`;
    console.log(`[WebSocket] Emitting '${event}' to room: ${roomName}`);
    console.log(`[WebSocket] Connected clients in room: ${this.io.sockets.adapter.rooms.get(roomName)?.size || 0}`);
    console.log(`[WebSocket] Event data:`, JSON.stringify(data).substring(0, 100) + '...');
    this.io.to(roomName).emit(event, data);
  }
  
  emitToAll(event, data) {
    this.io.emit(event, data);
  }
  
  async getConnectedClients(sessionId) {
    // Remove 'session-' prefix if already present
    if (sessionId.startsWith('session-')) {
      sessionId = sessionId.substring(8);
    }
    
    const roomName = `session-${sessionId}`;
    const sockets = await this.io.in(roomName).fetchSockets();
    return sockets.length;
  }
}

export default WebSocketServer;
