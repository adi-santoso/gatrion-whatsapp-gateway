import { getQueueStats, messageQueue } from '../../queue/messageQueue.js';

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
    const { jobId } = req.params;
    const job = await messageQueue.getJob(jobId);
    
    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found'
      });
    }
    
    const state = await job.getState();
    
    res.json({
      success: true,
      data: {
        id: job.id,
        name: job.name,
        sessionId: job.data.sessionId,
        state,
        progress: job.progress,
        returnvalue: job.returnvalue,
        failedReason: job.failedReason
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}
