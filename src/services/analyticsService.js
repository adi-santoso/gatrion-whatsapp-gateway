class AnalyticsService {
  constructor() {
    this.stats = new Map();
  }

  initSession(sessionId) {
    if (!this.stats.has(sessionId)) {
      this.stats.set(sessionId, {
        sessionId,
        messages: { sent: 0, delivered: 0, failed: 0, received: 0 },
        media: { image: 0, video: 0, audio: 0, document: 0, sticker: 0 },
        groups: { sent: 0, received: 0 },
        lastActivity: new Date(),
        uptime: 0,
        reconnects: 0
      });
    }
  }

  trackMessageSent(sessionId, type = 'text') {
    this.initSession(sessionId);
    const stats = this.stats.get(sessionId);
    stats.messages.sent++;
    if (type !== 'text') {
      stats.media[type] = (stats.media[type] || 0) + 1;
    }
    stats.lastActivity = new Date();
  }

  trackMessageDelivered(sessionId) {
    this.initSession(sessionId);
    const stats = this.stats.get(sessionId);
    stats.messages.delivered++;
  }

  trackMessageFailed(sessionId) {
    this.initSession(sessionId);
    const stats = this.stats.get(sessionId);
    stats.messages.failed++;
  }

  trackMessageReceived(sessionId) {
    this.initSession(sessionId);
    const stats = this.stats.get(sessionId);
    stats.messages.received++;
    stats.lastActivity = new Date();
  }

  trackReconnect(sessionId) {
    this.initSession(sessionId);
    const stats = this.stats.get(sessionId);
    stats.reconnects++;
  }

  getSessionStats(sessionId) {
    return this.stats.get(sessionId) || null;
  }

  getAllStats() {
    return Array.from(this.stats.values());
  }

  getAggregateStats() {
    const all = this.getAllStats();
    return all.reduce((acc, stat) => ({
      sessions: acc.sessions + 1,
      messages: {
        sent: acc.messages.sent + stat.messages.sent,
        delivered: acc.messages.delivered + stat.messages.delivered,
        failed: acc.messages.failed + stat.messages.failed,
        received: acc.messages.received + stat.messages.received
      },
      totalReconnects: acc.totalReconnects + stat.reconnects
    }), {
      sessions: 0,
      messages: { sent: 0, delivered: 0, failed: 0, received: 0 },
      totalReconnects: 0
    });
  }
}

export const analyticsService = new AnalyticsService();
