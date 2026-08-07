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
    this.sessionManager = null;
  }

  setSessionManager(sessionManager) {
    this.sessionManager = sessionManager;
    console.log('[WebSocket] SessionManager injected for message handling');
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

        // Send current QR/status immediately if already available
        if (this.sessionManager) {
          const session = this.sessionManager.sessions.get(`session-${sessionId}`) ||
                          this.sessionManager.sessions.get(sessionId);
          if (session) {
            this.sendCurrentState(socket, session, sessionId);
          }
        }
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

        // Send current QR/status immediately if already available
        if (this.sessionManager) {
          const session = this.sessionManager.sessions.get(`session-${sid}`);
          if (!session) {
            const altSession = this.sessionManager.sessions.get(sid);
            if (altSession) {
              this.sendCurrentState(socket, altSession, sid);
            }
          } else {
            this.sendCurrentState(socket, session, sid);
          }
        }
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

      // Listen for send message request from any client
      socket.on('send:message', async (data) => {
        try {
          console.log('[Gateway] Received send:message request:', {
            sessionId: data.sessionId,
            to: data.to,
            messagePreview: data.message?.substring(0, 50),
            timestamp: data.timestamp
          });

          const { sessionId, message, to } = data;

          if (!sessionId || !message || !to) {
            console.error('[Gateway] Invalid send:message data:', data);
            socket.emit('message:error', {
              sessionId,
              error: 'Missing required fields: sessionId, message, or to'
            });
            return;
          }

          // Check if SessionManager is available
          if (!this.sessionManager) {
            console.error('[Gateway] SessionManager not available');
            socket.emit('message:error', {
              sessionId,
              error: 'SessionManager not initialized'
            });
            return;
          }

          // Normalize phone number format
          // Input might be: "250946466648070@lid" or "250946466648070" or "62250946466648070"
          // Output should be: "62250946466648070@s.whatsapp.net"
          let phoneNumber = to;

          // Remove @lid or @s.whatsapp.net suffix if present
          phoneNumber = phoneNumber.replace(/@lid$/, '').replace(/@s\.whatsapp\.net$/, '');

          // Add country code 62 if not present (assuming Indonesia)
          if (!phoneNumber.startsWith('62')) {
            phoneNumber = '62' + phoneNumber;
          }

          // Add WhatsApp suffix
          const whatsappNumber = phoneNumber + '@s.whatsapp.net';

          console.log(`[Gateway] Normalized phone number: ${to} -> ${whatsappNumber}`);

          // Send message to WhatsApp user
          await this.sessionManager.sendTextMessage(sessionId, whatsappNumber, message);

          console.log(`[Gateway] Message sent to ${whatsappNumber} via ${sessionId}`);

          // Emit confirmation
          socket.emit('message:sent', {
            sessionId,
            to: whatsappNumber,
            success: true,
            timestamp: Date.now()
          });

        } catch (error) {
          console.error('[Gateway] Failed to send message:', error);
          socket.emit('message:error', {
            sessionId: data?.sessionId,
            error: error.message,
            timestamp: Date.now()
          });
        }
      });
    });
  }
  
  sendCurrentState(socket, session, sid) {
    const sessionId = session.id || `session-${sid}`;
    console.log(`[WebSocket] Sending current state for ${sessionId}: status=${session.status}, hasQR=${!!session.qr}`);
    if (session.status === 'qr_ready' && session.qr) {
      socket.emit('qr_ready', { sessionId, qrCode: session.qr });
    } else if (session.status === 'connected') {
      socket.emit('session_connected', { sessionId, phone: session.phone });
    } else if (session.status === 'disconnected' || session.status === 'failed') {
      socket.emit('session_disconnected', { sessionId });
    }
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
