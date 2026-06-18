import { sessionManager } from '../../index.js';

export async function healthCheck(req, res) {
  const memoryUsage = process.memoryUsage();
  const used = Math.round(memoryUsage.heapUsed / 1024 / 1024);
  const total = Math.round(memoryUsage.heapTotal / 1024 / 1024);
  const external = Math.round(memoryUsage.external / 1024 / 1024);
  const rss = Math.round(memoryUsage.rss / 1024 / 1024);

  const { getClientConnectionState } = await import('../../whatsapp/client.js');
  const state = getClientConnectionState();

  res.json({
    success: true,
    data: {
      status: 'healthy',
      uptime: process.uptime(),
      timestamp: new Date(),
      memory: {
        used,
        total,
        external,
        rss
      },
      whatsapp: {
        connected: state.state === 'connected',
        state: state.state
      },
      nodeVersion: process.version,
      platform: process.platform,
      pid: process.pid
    }
  });
}

export async function getStatus(req, res) {
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
    
    res.json({
      success: true,
      data: {
        sessionId: session.id,
        name: session.name,
        phone: session.phone,
        status: session.status
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}
