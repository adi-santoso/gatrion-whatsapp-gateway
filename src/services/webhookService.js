import crypto from 'crypto';
import { addWebhookJob } from '../queue/messageQueue.js';

export class WebhookService {
  constructor() {
    this.timeout = parseInt(process.env.WEBHOOK_TIMEOUT) || 10000;
    this.useQueue = process.env.WEBHOOK_USE_QUEUE === 'true';
  }
  
  generateSignature(payload, secret) {
    return crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(payload))
      .digest('hex');
  }
  
  async sendWebhook(session, eventType, data) {
    if (!session.webhookEnabled || !session.webhookUrl) {
      return;
    }
    
    const payload = {
      event: eventType,
      sessionId: session.id,
      sessionName: session.name,
      sessionPhone: session.phone,
      timestamp: new Date().toISOString(),
      ...data
    };
    
    const signature = this.generateSignature(payload, session.webhookSecret);
    
    try {
      const response = await fetch(session.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-webhook-signature': `sha256=${signature}`,
          'x-session-id': session.id
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(this.timeout)
      });
      
      if (!response.ok) {
        throw new Error(`Webhook failed: ${response.status}`);
      }
      
      console.log(`Webhook delivered to ${session.id}:`, eventType);
    } catch (error) {
      console.error(`Webhook failed for ${session.id}:`, error.message);
    }
  }
  
  async sendMessageReceived(session, message) {
    const data = {
      messageId: message.key.id,
      from: message.key.remoteJid,
      fromNumber: message.key.remoteJid.replace('@s.whatsapp.net', ''),
      fromName: message.pushName || 'Unknown',
      isGroup: message.key.remoteJid.includes('@g.us'),
      groupId: message.key.remoteJid.includes('@g.us') ? message.key.remoteJid : null,
      message: this.parseMessage(message)
    };
    
    if (this.useQueue) {
      await addWebhookJob(session.id, 'message.received', data);
      console.log(`Webhook queued for ${session.id}: message.received`);
    } else {
      await this.sendWebhook(session, 'message.received', data);
    }
  }
  
  parseMessage(message) {
    const msg = message.message;
    
    if (msg?.conversation) {
      return {
        type: 'text',
        text: msg.conversation
      };
    }
    
    if (msg?.extendedTextMessage) {
      return {
        type: 'text',
        text: msg.extendedTextMessage.text,
        quoted: msg.extendedTextMessage.contextInfo ? {
          messageId: msg.extendedTextMessage.contextInfo.stanzaId,
          text: msg.extendedTextMessage.contextInfo.quotedMessage?.conversation
        } : null
      };
    }
    
    if (msg?.imageMessage) {
      return {
        type: 'image',
        caption: msg.imageMessage.caption || '',
        media: {
          mimetype: msg.imageMessage.mimetype,
          size: msg.imageMessage.fileLength
        }
      };
    }
    
    if (msg?.videoMessage) {
      return {
        type: 'video',
        caption: msg.videoMessage.caption || '',
        media: {
          mimetype: msg.videoMessage.mimetype,
          size: msg.videoMessage.fileLength
        }
      };
    }
    
    if (msg?.audioMessage) {
      return {
        type: 'audio',
        media: {
          mimetype: msg.audioMessage.mimetype,
          size: msg.audioMessage.fileLength
        }
      };
    }
    
    if (msg?.documentMessage) {
      return {
        type: 'document',
        caption: msg.documentMessage.caption || '',
        media: {
          mimetype: msg.documentMessage.mimetype,
          size: msg.documentMessage.fileLength,
          filename: msg.documentMessage.fileName
        }
      };
    }
    
    return {
      type: 'unknown',
      text: ''
    };
  }
}

export const webhookService = new WebhookService();
