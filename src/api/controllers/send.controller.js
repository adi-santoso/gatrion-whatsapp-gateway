import { sessionManager } from '../../index.js';

export async function sendText(req, res) {
  try {
    const { sessionId, to, message } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'sessionId is required',
        message: 'Create a session first at POST /api/sessions'
      });
    }
    
    const result = await sessionManager.sendTextMessage(sessionId, to, message);
    
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
}

export async function sendImage(req, res) {
  try {
    const { sessionId, to, caption } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'sessionId is required',
        message: 'Create a session first at POST /api/sessions'
      });
    }
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No image file uploaded'
      });
    }
    
    const result = await sessionManager.sendImageMessage(sessionId, to, req.file.buffer, {
      caption,
      mimetype: req.file.mimetype
    });
    
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
}
