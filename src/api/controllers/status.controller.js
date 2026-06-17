export function healthCheck(req, res) {
  const memoryUsage = process.memoryUsage();
  const used = Math.round(memoryUsage.heapUsed / 1024 / 1024);
  const total = Math.round(memoryUsage.heapTotal / 1024 / 1024);

  res.json({
    success: true,
    data: {
      status: 'healthy',
      uptime: process.uptime(),
      timestamp: new Date(),
      memory: {
        used,
        total,
        unit: 'MB'
      }
    }
  });
}

export async function getStatus(req, res, next) {
  try {
    const { getClientConnectionState } = await import('../../whatsapp/client.js');
    const state = getClientConnectionState();

    res.json({
      success: true,
      data: {
        connected: state.state === 'connected',
        state: state.state,
        phone: state.phone || null,
        timestamp: state.timestamp ? new Date(state.timestamp) : new Date()
      }
    });
  } catch (error) {
    next(error);
  }
}
