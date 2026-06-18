import { getQueueStats } from '../../queue/messageQueue.js';
import { config } from '../../config/env.js';

export async function getStats(req, res) {
  try {
    const stats = await getQueueStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function getJob(req, res) {
  try {
    if (!config.redis.enabled) {
      return res.status(400).json({
        success: false,
        error: 'Queue is disabled. Enable Redis to use job tracking.'
      });
    }
    
    const { jobId } = req.params;
    
    res.json({
      success: false,
      error: 'Job tracking requires Redis queue to be enabled'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}
