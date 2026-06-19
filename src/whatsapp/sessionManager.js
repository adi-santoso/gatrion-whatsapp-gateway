import makeWASocket, { useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys';
import QRCode from 'qrcode';
import pino from 'pino';
import path from 'path';
import SessionDB from '../storage/sessionDb.js';
import { webhookService } from '../services/webhookService.js';
import { analyticsService } from '../services/analyticsService.js';
import { loggerService } from '../services/loggerService.js';

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

          console.log(`QR generated for ${sessionId}`);

          if (this.wsServer) {
            console.log(`Emitting qr_ready to session: ${sessionId}`);
            this.wsServer.emitToSession(sessionId, 'qr_ready', {
              sessionId,
              qrCode: qrBase64
            });
          } else {
            console.warn(`WebSocket server not available for ${sessionId}`);
          }

          if (session.qrTimeoutId) {
            clearTimeout(session.qrTimeoutId);
          }

          session.qrTimeoutId = setTimeout(() => {
            const currentSession = this.sessions.get(sessionId);
            if (currentSession && currentSession.status === 'qr_ready') {
              console.log(`QR timeout for ${sessionId}, cleaning up...`);
              this.deleteSession(sessionId).catch(err => {
                console.error(`Failed to delete session ${sessionId}:`, err.message);
              });
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

        analyticsService.initSession(sessionId);
        loggerService.info(sessionId, 'Session connected', { phone: session.phone });

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
          analyticsService.trackReconnect(sessionId);
          loggerService.warn(sessionId, 'Reconnecting', { attempt: session.reconnectAttempts });
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
      console.warn(`Session ${sessionId} not found, already deleted`);
      return;
    }

    if (session.qrTimeoutId) {
      clearTimeout(session.qrTimeoutId);
    }

    try {
      await session.sock.logout();
    } catch (err) {
      console.error(`Error logging out ${sessionId}:`, err.message);
    }

    this.sessions.delete(sessionId);
    
    try {
      this.db.deleteSession(sessionId);
    } catch (err) {
      console.error(`Error deleting from DB ${sessionId}:`, err.message);
    }
    
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

  async sendVideoMessage(sessionId, to, videoBuffer, options = {}) {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error('Session not found');
    if (!this.isSessionConnected(sessionId)) throw new Error('Session not connected');

    const jid = to.includes('@s.whatsapp.net') ? to : `${to}@s.whatsapp.net`;
    const result = await session.sock.sendMessage(jid, {
      video: videoBuffer,
      caption: options.caption || '',
      mimetype: options.mimetype
    });
    return { id: result.key.id, status: 'sent' };
  }

  async sendAudioMessage(sessionId, to, audioBuffer, options = {}) {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error('Session not found');
    if (!this.isSessionConnected(sessionId)) throw new Error('Session not connected');

    const jid = to.includes('@s.whatsapp.net') ? to : `${to}@s.whatsapp.net`;
    const result = await session.sock.sendMessage(jid, {
      audio: audioBuffer,
      mimetype: options.mimetype,
      ptt: options.ptt || false
    });
    return { id: result.key.id, status: 'sent' };
  }

  async sendDocumentMessage(sessionId, to, documentBuffer, options = {}) {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error('Session not found');
    if (!this.isSessionConnected(sessionId)) throw new Error('Session not connected');

    const jid = to.includes('@s.whatsapp.net') ? to : `${to}@s.whatsapp.net`;
    const result = await session.sock.sendMessage(jid, {
      document: documentBuffer,
      mimetype: options.mimetype,
      fileName: options.filename || 'document',
      caption: options.caption || ''
    });
    return { id: result.key.id, status: 'sent' };
  }

  async sendLocationMessage(sessionId, to, location) {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error('Session not found');
    if (!this.isSessionConnected(sessionId)) throw new Error('Session not connected');

    const jid = to.includes('@s.whatsapp.net') ? to : `${to}@s.whatsapp.net`;
    const result = await session.sock.sendMessage(jid, {
      location: {
        degreesLatitude: location.latitude,
        degreesLongitude: location.longitude,
        name: location.name || '',
        address: location.address || ''
      }
    });
    return { id: result.key.id, status: 'sent' };
  }

  async sendContactMessage(sessionId, to, contact) {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error('Session not found');
    if (!this.isSessionConnected(sessionId)) throw new Error('Session not connected');

    const jid = to.includes('@s.whatsapp.net') ? to : `${to}@s.whatsapp.net`;
    const vcard = `BEGIN:VCARD
VERSION:3.0
FN:${contact.name}
TEL;type=CELL;type=VOICE;waid=${contact.phone}:+${contact.phone}
${contact.organization ? `ORG:${contact.organization}` : ''}
${contact.email ? `EMAIL:${contact.email}` : ''}
END:VCARD`;

    const result = await session.sock.sendMessage(jid, {
      contacts: {
        displayName: contact.name,
        contacts: [{ vcard }]
      }
    });
    return { id: result.key.id, status: 'sent' };
  }

  async sendStickerMessage(sessionId, to, stickerBuffer, options = {}) {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error('Session not found');
    if (!this.isSessionConnected(sessionId)) throw new Error('Session not connected');

    const jid = to.includes('@s.whatsapp.net') ? to : `${to}@s.whatsapp.net`;
    const result = await session.sock.sendMessage(jid, {
      sticker: stickerBuffer,
      mimetype: 'image/webp'
    });
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

  async getGroups(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error('Session not found');
    if (!this.isSessionConnected(sessionId)) throw new Error('Session not connected');

    const groups = await session.sock.groupFetchAllParticipating();
    return Object.values(groups).map(group => ({
      id: group.id,
      name: group.subject,
      participantCount: group.participants.length,
      owner: group.owner,
      creation: group.creation
    }));
  }

  async getGroupMetadata(sessionId, groupId) {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error('Session not found');
    if (!this.isSessionConnected(sessionId)) throw new Error('Session not connected');

    const metadata = await session.sock.groupMetadata(groupId);
    return {
      id: metadata.id,
      name: metadata.subject,
      description: metadata.desc,
      owner: metadata.owner,
      creation: metadata.creation,
      participants: metadata.participants.map(p => ({
        id: p.id,
        admin: p.admin,
        isAdmin: p.admin !== null,
        isSuperAdmin: p.admin === 'superadmin'
      })),
      size: metadata.size,
      announce: metadata.announce,
      restrict: metadata.restrict
    };
  }

  async createGroup(sessionId, name, participants) {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error('Session not found');
    if (!this.isSessionConnected(sessionId)) throw new Error('Session not connected');

    const participantJids = participants.map(p => 
      p.includes('@s.whatsapp.net') ? p : `${p}@s.whatsapp.net`
    );
    
    const result = await session.sock.groupCreate(name, participantJids);
    return {
      id: result.id,
      name: name,
      participants: participantJids
    };
  }

  async updateGroupSubject(sessionId, groupId, subject) {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error('Session not found');
    if (!this.isSessionConnected(sessionId)) throw new Error('Session not connected');

    await session.sock.groupUpdateSubject(groupId, subject);
    return { success: true };
  }

  async updateGroupDescription(sessionId, groupId, description) {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error('Session not found');
    if (!this.isSessionConnected(sessionId)) throw new Error('Session not connected');

    await session.sock.groupUpdateDescription(groupId, description);
    return { success: true };
  }

  async addGroupParticipants(sessionId, groupId, participants) {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error('Session not found');
    if (!this.isSessionConnected(sessionId)) throw new Error('Session not connected');

    const participantJids = participants.map(p => 
      p.includes('@s.whatsapp.net') ? p : `${p}@s.whatsapp.net`
    );
    
    const result = await session.sock.groupParticipantsUpdate(groupId, participantJids, 'add');
    return result;
  }

  async removeGroupParticipants(sessionId, groupId, participants) {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error('Session not found');
    if (!this.isSessionConnected(sessionId)) throw new Error('Session not connected');

    const participantJids = participants.map(p => 
      p.includes('@s.whatsapp.net') ? p : `${p}@s.whatsapp.net`
    );
    
    const result = await session.sock.groupParticipantsUpdate(groupId, participantJids, 'remove');
    return result;
  }

  async promoteGroupParticipants(sessionId, groupId, participants) {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error('Session not found');
    if (!this.isSessionConnected(sessionId)) throw new Error('Session not connected');

    const participantJids = participants.map(p => 
      p.includes('@s.whatsapp.net') ? p : `${p}@s.whatsapp.net`
    );
    
    const result = await session.sock.groupParticipantsUpdate(groupId, participantJids, 'promote');
    return result;
  }

  async demoteGroupParticipants(sessionId, groupId, participants) {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error('Session not found');
    if (!this.isSessionConnected(sessionId)) throw new Error('Session not connected');

    const participantJids = participants.map(p => 
      p.includes('@s.whatsapp.net') ? p : `${p}@s.whatsapp.net`
    );
    
    const result = await session.sock.groupParticipantsUpdate(groupId, participantJids, 'demote');
    return result;
  }

  async leaveGroup(sessionId, groupId) {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error('Session not found');
    if (!this.isSessionConnected(sessionId)) throw new Error('Session not connected');

    await session.sock.groupLeave(groupId);
    return { success: true };
  }

  async getGroupInviteCode(sessionId, groupId) {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error('Session not found');
    if (!this.isSessionConnected(sessionId)) throw new Error('Session not connected');

    const code = await session.sock.groupInviteCode(groupId);
    return {
      code,
      inviteLink: `https://chat.whatsapp.com/${code}`
    };
  }

  async sendGroupMessage(sessionId, groupId, message, options = {}) {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error('Session not found');
    if (!this.isSessionConnected(sessionId)) throw new Error('Session not connected');

    const content = { text: message };
    
    if (options.mentions && options.mentions.length > 0) {
      content.mentions = options.mentions.map(m => 
        m.includes('@s.whatsapp.net') ? m : `${m}@s.whatsapp.net`
      );
    }
    
    const result = await session.sock.sendMessage(groupId, content);
    return { id: result.key.id, status: 'sent' };
  }
}

export default SessionManager;
