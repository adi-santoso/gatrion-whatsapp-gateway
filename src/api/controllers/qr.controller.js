import { sessionManager } from '../../index.js';

export async function getQR(req, res) {
  const { sessionId } = req.query;
  
  if (!sessionId) {
    return res.status(400).json({
      success: false,
      error: 'sessionId is required'
    });
  }
  
  try {
    const session = await sessionManager.getSession(sessionId);
    
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
    res.status(500).json({ success: false, error: error.message });
  }
}
