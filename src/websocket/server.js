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
    // Log all connection attempts
    this.io.engine.on('connection_error', (err) => {
      console.log('[WebSocket] Connection error:', err.message);
      console.log('[WebSocket] Error details:', err);
    });
    
    this.io.on('connection', (socket) => {
      console.log('[WebSocket] ============================================');
      console.log('[WebSocket] Client connected!');
      console.log('[WebSocket] Socket ID:', socket.id);
      console.log('[WebSocket] Transport:', socket.conn.transport.name);
      console.log('[WebSocket] Remote address:', socket.handshake.address);
      console.log('[WebSocket] Query params:', socket.handshake.query);
      console.log('[WebSocket] Headers:', {
        origin: socket.handshake.headers.origin,
        referer: socket.handshake.headers.referer,
        userAgent: socket.handshake.headers['user-agent']
      });
      console.log('[WebSocket] ============================================');
      
      let sessionId = socket.handshake.query.sessionId;
      
      // Auto-join from query parameter
      if (sessionId) {
        console.log(`[WebSocket] Client has sessionId in query: ${sessionId}`);
        
        // Remove 'session-' prefix if already present
        if (sessionId.startsWith('session-')) {
          sessionId = sessionId.substring(8);
        }
        
        const roomName = `session-${sessionId}`;
        socket.join(roomName);
        console.log(`[WebSocket] Client auto-joined room: ${roomName}`);
        console.log(`[WebSocket] Total clients in room: ${this.io.sockets.adapter.rooms.get(roomName)?.size || 0}`);
      } else {
        console.log('[WebSocket] Client connected without sessionId in query');
      }
      
      // Listen for manual join-session event
      socket.on('join-session', (sid) => {
        console.log(`[WebSocket] Client manually joining session: ${sid}`);
        
        // Remove 'session-' prefix if already present
        if (sid.startsWith('session-')) {
          sid = sid.substring(8);
        }
        
        const roomName = `session-${sid}`;
        socket.join(roomName);
        console.log(`[WebSocket] Client manually joined room: ${roomName}`);
        console.log(`[WebSocket] Total clients in room: ${this.io.sockets.adapter.rooms.get(roomName)?.size || 0}`);
        
        // Confirm join
        socket.emit('joined-session', { sessionId: `session-${sid}`, room: roomName });
      });
      
      // Listen for leave-session event
      socket.on('leave-session', (sid) => {
        if (sid.startsWith('session-')) {
          sid = sid.substring(8);
        }
        
        const roomName = `session-${sid}`;
        socket.leave(roomName);
        console.log(`[WebSocket] Client left room: ${roomName}`);
      });
      
      socket.on('disconnect', (reason) => {
        console.log(`[WebSocket] Client disconnected: ${socket.id}`);
        console.log(`[WebSocket] Disconnect reason: ${reason}`);
      });
      
      socket.on('error', (err) => {
        console.error(`[WebSocket] Socket error for ${socket.id}:`, err);
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
