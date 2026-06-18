import { analyticsService } from '../../services/analyticsService.js';

export async function getSessionAnalytics(req, res) {
  try {
    const { sessionId } = req.query;
    
    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'sessionId is required'
      });
    }
    
    const stats = analyticsService.getSessionStats(sessionId);
    
    if (!stats) {
      return res.status(404).json({
        success: false,
        error: 'No analytics data for this session'
      });
    }
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
}

export async function getAllAnalytics(req, res) {
  try {
    const stats = analyticsService.getAllStats();
    
    res.json({
      success: true,
      data: {
        sessions: stats,
        total: stats.length
      }
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
}

export async function getAggregateAnalytics(req, res) {
  try {
    const aggregate = analyticsService.getAggregateStats();
    
    res.json({
      success: true,
      data: aggregate
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
}
