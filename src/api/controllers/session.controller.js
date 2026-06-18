import { randomBytes } from 'crypto';
import { sessionManager } from '../../index.js';
import { webhookService } from '../../services/webhookService.js';

function generateSessionId() {
  return 'session-' + randomBytes(8).toString('hex');
}

export async function createSession(req, res) {
  try {
    const { sessionId, name, webhookUrl, webhookSecret, webhookEnabled } = req.body;
    
    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'name is required'
      });
    }
    
    const id = sessionId || generateSessionId();
    
    const session = await sessionManager.createSession(id, name, {
      webhookUrl,
      webhookSecret,
      webhookEnabled
    });
    
    res.status(201).json({
      success: true,
      data: {
        sessionId: session.id,
        name: session.name,
        status: session.status,
        qr: session.qr
      }
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
}

export async function getAllSessions(req, res) {
  try {
    const sessions = await sessionManager.getAllSessions();
    
    const sanitized = sessions.map(s => ({
      sessionId: s.id,
      name: s.name,
      phone: s.phone,
      status: s.status,
      webhookUrl: s.webhookUrl,
      webhookEnabled: s.webhookEnabled,
      createdAt: s.createdAt
    }));
    
    res.json({ success: true, data: sanitized });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
}

export async function getSession(req, res) {
  try {
    const { id } = req.params;
    
    const session = await sessionManager.getSession(id);
    
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }
    
    res.json({
      success: true,
      data: {
        sessionId: session.id,
        name: session.name,
        phone: session.phone,
        status: session.status,
        webhookUrl: session.webhookUrl,
        webhookEnabled: session.webhookEnabled,
        createdAt: session.createdAt
      }
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
}

export async function getSessionQR(req, res) {
  try {
    const { id } = req.params;
    
    const session = await sessionManager.getSession(id);
    
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }
    
    if (!session.qr) {
      return res.json({
        success: true,
        data: { qr: null, status: session.status }
      });
    }
    
    res.json({
      success: true,
      data: { qr: session.qr, status: session.status }
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
}

export async function getSessionStatus(req, res) {
  try {
    const { id } = req.params;
    
    const status = await sessionManager.getSessionStatus(id);
    
    if (!status) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }
    
    res.json({ success: true, data: status });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
}

export async function updateWebhook(req, res) {
  try {
    const { id } = req.params;
    const { webhookUrl, webhookSecret, webhookEnabled } = req.body;
    
    const session = await sessionManager.updateSessionWebhook(id, {
      webhookUrl,
      webhookSecret,
      webhookEnabled
    });
    
    res.json({
      success: true,
      data: {
        sessionId: session.id,
        webhookUrl: session.webhookUrl,
        webhookEnabled: session.webhookEnabled
      }
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
}

export async function logoutSession(req, res) {
  try {
    const { id } = req.params;
    
    await sessionManager.disconnectSession(id);
    
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
}

export async function deleteSession(req, res) {
  try {
    const { id } = req.params;
    
    await sessionManager.deleteSession(id);
    
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
}

export async function testWebhook(req, res) {
  try {
    const { id } = req.params;
    
    const session = await sessionManager.getSession(id);
    
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }
    
    if (!session.webhookEnabled || !session.webhookUrl) {
      return res.status(400).json({
        success: false,
        error: 'Webhook not configured for this session'
      });
    }
    
    await webhookService.sendWebhook(session, 'webhook.test', {
      message: 'This is a test webhook from WhatsApp Gateway'
    });
    
    res.json({
      success: true,
      message: 'Test webhook sent'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}
