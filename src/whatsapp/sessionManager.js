import makeWASocket, { useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys';
import QRCode from 'qrcode';
import pino from 'pino';
import path from 'path';
import SessionDB from '../storage/sessionDb.js';
import { webhookService } from '../services/webhookService.js';

class SessionManager {
  constructor(config) {
    this.config = config;
    this.sessions = new Map();
    this.initializingLock = new Set();
    this.deduplicationMap = new Map();
    this.wsServer = null;
    this.db = new SessionDB('./data/sessions.db');
    
    this.startDeduplicationCleanup();
  }

  setWebSocketServer(wsServer) {
    this.wsServer = wsServer;
  }

  async createSession(sessionId, name, webhookConfig = {}) {
    await this.db.waitReady();
    
    if (this.sessions.has(sessionId)) {
      throw new Error('Session already exists');
    }

    if (this.initializingLock.has(sessionId)) {
      throw new Error('Session is already being initialized');
    }

    this.initializingLock.add(sessionId);

    try {
      const sessionPath = path.join('./sessions', sessionId);
      const { state, saveCreds } = await useMultiFileAuthState(sessionPath);

      const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        syncFullHistory: false,
        markOnlineOnConnect: false,
        generateHighQualityLinkPreview: false,
        browser: ['WhatsApp Gateway', 'Chrome', '10.0'],
        logger: pino({ level: 'silent' })
      });

      const session = {
        id: sessionId,
        name: name,
        phone: null,
        status: 'connecting',
        sock: sock,
        qr: null,
        createdAt: new Date(),
        lastConnectedAt: null,
        reconnectAttempts: 0,
        webhookUrl: webhookConfig.webhookUrl || null,
        webhookSecret: webhookConfig.webhookSecret || null,
        webhookEnabled: webhookConfig.webhookEnabled || false,
        qrTimeoutId: null
      };

      this.sessions.set(sessionId, session);
      this.setupEventHandlers(sessionId, sock, saveCreds);

      this.db.insertSession({
        id: sessionId,
        name,
        auth_path: sessionPath,
        webhook_url: webhookConfig.webhookUrl,
        webhook_secret: webhookConfig.webhookSecret,
        webhook_enabled: webhookConfig.webhookEnabled ? 1 : 0
      });

      return session;
    } finally {
      this.initializingLock.delete(sessionId);
    }
  }

  setupEventHandlers(sessionId, sock, saveCreds) {
    sock.ev.on('connection.update', async (update) => {
      const session = this.sessions.get(sessionId);
      if (!session) return;

      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        try {
          const qrBase64 = await QRCode.toDataURL(qr);
          session.qr = qrBase64;
          session.status = 'qr_ready';

          if (this.wsServer) {
            this.wsServer.emitToSession(sessionId, 'qr_ready', {
              sessionId,
              qrCode: qrBase64
            });
          }

          if (session.qrTimeoutId) {
            clearTimeout(session.qrTimeoutId);
          }

          session.qrTimeoutId = setTimeout(() => {
            if (session.status === 'qr_ready') {
              console.log(`QR timeout for ${sessionId}, cleaning up...`);
              this.deleteSession(sessionId);
            }
          }, 60000);
        } catch (err) {
          console.error(`Failed to generate QR for ${sessionId}:`, err);
        }
      }

      if (connection === 'open') {
        session.phone = sock.user?.id?.split(':')[0] || null;
        session.status = 'connected';
        session.lastConnectedAt = new Date();
        session.reconnectAttempts = 0;
        session.qr = null;

        if (session.qrTimeoutId) {
          clearTimeout(session.qrTimeoutId);
          session.qrTimeoutId = null;
        }

        this.db.updateSessionStatus(sessionId, 'connected');
        this.db.updateSessionPhone(sessionId, session.phone);
        this.db.updateLastConnected(sessionId);

        if (this.wsServer) {
          this.wsServer.emitToSession(sessionId, 'session_connected', {
            sessionId,
            phone: session.phone
          });
        }

        console.log(`Session ${sessionId} connected:`, session.phone);
      }

      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

        session.status = 'disconnected';
        session.qr = null;

        if (session.qrTimeoutId) {
          clearTimeout(session.qrTimeoutId);
          session.qrTimeoutId = null;
        }

        this.db.updateSessionStatus(sessionId, 'disconnected');

        if (this.wsServer) {
          this.wsServer.emitToSession(sessionId, 'session_disconnected', {
            sessionId
          });
        }

        if (shouldReconnect && session.reconnectAttempts < 5) {
          const delay = Math.min(1000 * Math.pow(2, session.reconnectAttempts), 30000);
          session.reconnectAttempts++;
          console.log(`Reconnecting ${sessionId} (attempt ${session.reconnectAttempts}) in ${delay}ms...`);
          setTimeout(() => this.reconnectSession(sessionId), delay);
        } else {
          console.log(`Session ${sessionId} disconnected permanently`);
        }
      }

      if (connection === 'connecting') {
        session.status = 'connecting';
      }
    });

    sock.ev.on('messages.upsert', async ({ messages, type }) => {
      if (type !== 'notify') return;
      
      const session = this.sessions.get(sessionId);
      if (!session) return;
      
      for (const message of messages) {
        if (message.key.fromMe) continue;
        
        if (this.isDuplicate(sessionId, message.key.id)) {
          console.log(`Duplicate message ${message.key.id} for ${sessionId}, skipping webhook`);
          continue;
        }
        
        try {
          await webhookService.sendMessageReceived(session, message);
        } catch (err) {
          console.error(`Webhook error for ${sessionId}:`, err);
        }
      }
    });

    sock.ev.on('creds.update', saveCreds);
  }

  async reconnectSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    try {
      const sessionPath = path.join('./sessions', sessionId);
      const { state, saveCreds } = await useMultiFileAuthState(sessionPath);

      const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        syncFullHistory: false,
        markOnlineOnConnect: false,
        generateHighQualityLinkPreview: false,
        browser: ['WhatsApp Gateway', 'Chrome', '10.0'],
        logger: pino({ level: 'silent' })
      });

      session.sock = sock;
      session.status = 'connecting';
      this.setupEventHandlers(sessionId, sock, saveCreds);
    } catch (err) {
      console.error(`Failed to reconnect ${sessionId}:`, err);
      session.status = 'disconnected';
    }
  }

  async getSession(sessionId) {
    return this.sessions.get(sessionId) || null;
  }

  async getAllSessions() {
    return Array.from(this.sessions.values()).map(session => ({
      id: session.id,
      name: session.name,
      phone: session.phone,
      status: session.status,
      qr: session.qr,
      createdAt: session.createdAt,
      lastConnectedAt: session.lastConnectedAt,
      webhookUrl: session.webhookUrl,
      webhookEnabled: session.webhookEnabled
    }));
  }

  async deleteSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    if (session.qrTimeoutId) {
      clearTimeout(session.qrTimeoutId);
    }

    try {
      await session.sock.logout();
    } catch (err) {
      console.error(`Error logging out ${sessionId}:`, err);
    }

    this.sessions.delete(sessionId);
    this.db.deleteSession(sessionId);
    console.log(`Session ${sessionId} deleted`);
  }

  async disconnectSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    if (session.qrTimeoutId) {
      clearTimeout(session.qrTimeoutId);
      session.qrTimeoutId = null;
    }

    try {
      await session.sock.logout();
      session.status = 'disconnected';
    } catch (err) {
      console.error(`Error disconnecting ${sessionId}:`, err);
      session.status = 'disconnected';
    }
  }

  getSessionStatus(sessionId) {
    const session = this.sessions.get(sessionId);
    return session ? session.status : null;
  }

  isSessionConnected(sessionId) {
    const session = this.sessions.get(sessionId);
    return session && session.status === 'connected';
  }

  updateSessionWebhook(sessionId, webhookConfig) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    if (webhookConfig.webhookUrl !== undefined) {
      session.webhookUrl = webhookConfig.webhookUrl;
    }
    if (webhookConfig.webhookSecret !== undefined) {
      session.webhookSecret = webhookConfig.webhookSecret;
    }
    if (webhookConfig.webhookEnabled !== undefined) {
      session.webhookEnabled = webhookConfig.webhookEnabled;
    }

    this.db.updateWebhook(sessionId, webhookConfig);

    return session;
  }

  async restoreAllSessions() {
    await this.db.waitReady();
    console.log('Restoring sessions from database...');
    const dbSessions = this.db.getAllSessions();
    
    for (const dbSession of dbSessions) {
      if (this.initializingLock.has(dbSession.id)) continue;
      
      try {
        await this.createSession(
          dbSession.id,
          dbSession.name,
          {
            webhookUrl: dbSession.webhook_url,
            webhookSecret: dbSession.webhook_secret,
            webhookEnabled: dbSession.webhook_enabled === 1
          }
        );
        
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (err) {
        console.error(`Failed to restore ${dbSession.id}:`, err);
      }
    }
    
    console.log(`Restored ${dbSessions.length} sessions`);
  }

  async sendTextMessage(sessionId, to, message) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }
    if (!this.isSessionConnected(sessionId)) {
      throw new Error('Session not connected');
    }

    const jid = to.includes('@s.whatsapp.net') ? to : `${to}@s.whatsapp.net`;
    const result = await session.sock.sendMessage(jid, { text: message });
    return { id: result.key.id, status: 'sent' };
  }

  async sendImageMessage(sessionId, to, imageBuffer, options = {}) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }
    if (!this.isSessionConnected(sessionId)) {
      throw new Error('Session not connected');
    }

    const jid = to.includes('@s.whatsapp.net') ? to : `${to}@s.whatsapp.net`;
    const content = {
      image: imageBuffer,
      caption: options.caption || '',
      mimetype: options.mimetype
    };
    const result = await session.sock.sendMessage(jid, content);
    return { id: result.key.id, status: 'sent' };
  }

  async shutdownAll() {
    console.log('Shutting down all sessions...');
    const promises = [];

    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.qrTimeoutId) {
        clearTimeout(session.qrTimeoutId);
      }

      promises.push(
        session.sock.logout().catch(err => {
          console.error(`Error shutting down ${sessionId}:`, err);
        })
      );
    }

    await Promise.allSettled(promises);
    this.sessions.clear();
    this.db.close();
    console.log('All sessions shut down');
  }

  isDuplicate(sessionId, messageId) {
    const key = `${sessionId}:${messageId}`;
    if (this.deduplicationMap.has(key)) {
      return true;
    }
    this.deduplicationMap.set(key, Date.now());
    return false;
  }

  startDeduplicationCleanup() {
    setInterval(() => {
      const tenMinAgo = Date.now() - 600000;
      for (const [key, timestamp] of this.deduplicationMap.entries()) {
        if (timestamp < tenMinAgo) {
          this.deduplicationMap.delete(key);
        }
      }
    }, 600000);
  }
}

export default SessionManager;
