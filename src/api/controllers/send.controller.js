import { addMessageJob, JOB_TYPES } from '../../queue/messageQueue.js';

export async function sendText(req, res) {
  try {
    const { sessionId, to, message, priority, delay } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'sessionId is required'
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
