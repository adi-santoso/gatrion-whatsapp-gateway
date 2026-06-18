import { addMessageJob, JOB_TYPES } from '../../queue/messageQueue.js';
import { sessionManager } from '../../index.js';
import { config } from '../../config/env.js';

export async function sendText(req, res) {
  try {
    const { sessionId, to, message, priority, delay } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'sessionId is required'
      });
    }
    
    // If Redis disabled, send directly
    if (!config.redis.enabled) {
      const result = await sessionManager.sendTextMessage(sessionId, to, message);
      return res.json({
        success: true,
        data: result
      });
    }
    
    const job = await addMessageJob(JOB_TYPES.SEND_TEXT, sessionId, {
      to,
      message
    }, {
      priority,
      delay
    });
    
    res.json({
      success: true,
      data: {
        jobId: job.id,
        status: 'queued'
      }
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
}

export async function sendImage(req, res) {
  try {
    const { sessionId, to, caption, priority, delay } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'sessionId is required'
      });
    }
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No image file uploaded'
      });
    }
    
    // If Redis disabled, send directly
    if (!config.redis.enabled) {
      const result = await sessionManager.sendImageMessage(sessionId, to, req.file.buffer, {
        caption,
        mimetype: req.file.mimetype
      });
      return res.json({
        success: true,
        data: result
      });
    }
    
    const job = await addMessageJob(JOB_TYPES.SEND_IMAGE, sessionId, {
      to,
      caption,
      imageBuffer: req.file.buffer,
      mimetype: req.file.mimetype
    }, {
      priority,
      delay
    });
    
    res.json({
      success: true,
      data: {
        jobId: job.id,
        status: 'queued'
      }
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
}
