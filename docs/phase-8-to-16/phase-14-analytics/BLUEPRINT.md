# Phase 14: Analytics & Reporting - Blueprint

> **Objective:** Message tracking, delivery status, analytics dashboard, and reporting

---

## Table of Contents

1. [Context & Current State](#1-context--current-state)
2. [Technical Specification](#2-technical-specification)
3. [Implementation Steps](#3-implementation-steps)
4. [Code Standards & Patterns](#4-code-standards--patterns)
5. [Integration Points](#5-integration-points)
6. [Acceptance Criteria](#6-acceptance-criteria)
7. [Testing Requirements](#7-testing-requirements)
8. [Rollback Plan](#8-rollback-plan)

---

## 1. Context & Current State

### Current Limitations

**Phase 1-13:**
- ✅ Can send messages
- ✅ Can track via queue job ID
- ❌ No delivery status tracking
- ❌ No read receipts tracking
- ❌ No analytics/metrics
- ❌ No reporting

### What We Want to Track

1. **Message Metrics:**
   - Total sent (by day/week/month)
   - Success rate
   - Failed messages count
   - Average delivery time

2. **Delivery Status:**
   - Sent
   - Delivered
   - Read
   - Failed

3. **Session Metrics:**
   - Messages per session
   - Session uptime
   - Connection failures

4. **Template Metrics:**
   - Template usage
   - Template success rate

5. **Bulk Job Metrics:**
   - Bulk job completion rate
   - Average bulk send time

### What Will Change

- Message status tracking system
- Analytics aggregation
- Reporting API endpoints
- Export to CSV/JSON
- Real-time metrics endpoint

---

## 2. Technical Specification

### 2.1 New API Endpoints (Per-Session)

**All endpoints support optional `sessionId` query parameter for per-session filtering:**

| Endpoint | Method | Description |
|----------|--------|-------------|
| `GET /api/analytics/overview` | GET | Dashboard overview (all or per session) |
| `GET /api/analytics/messages` | GET | Message statistics (filterable by sessionId) |
| `GET /api/analytics/sessions` | GET | Per-session statistics comparison |
| `GET /api/analytics/templates` | GET | Template usage stats (per session) |
| `GET /api/analytics/failed` | GET | Failed messages list (filterable by sessionId) |
| `GET /api/analytics/export` | GET | Export analytics CSV/JSON (per session) |
| `GET /api/messages/:id/status` | GET | Get message delivery status |

**Query Examples:**
```
GET /api/analytics/overview                         # All sessions
GET /api/analytics/overview?sessionId=session-abc  # Specific session
GET /api/analytics/messages?sessionId=session-abc&period=7d
```

### 2.2 Data Models

**Message Event:**

```javascript
{
  id: "event-uuid",
  messageId: "3EB0ABC123...",
  sessionId: "session-abc123",  // ← REQUIRED
  jobId: "job-uuid",
  to: "628123456789@s.whatsapp.net",
  type: "text",              // text, image, video, etc
  status: "delivered",       // queued, sent, delivered, read, failed
  error: null,
  queuedAt: "2026-06-18T10:00:00Z",
  sentAt: "2026-06-18T10:00:05Z",
  deliveredAt: "2026-06-18T10:00:10Z",
  readAt: "2026-06-18T10:05:00Z",
  templateId: null,          // If from template
  bulkJobId: null,           // If from bulk job
  metadata: {
    size: 1024,
    duration: 250
  }
}
```

**Analytics Overview (Per-Session):**

```javascript
{
  sessionId: "session-abc123",  // ← null for all sessions
  sessionName: "Sales Department",
  today: {
    sent: 450,
    delivered: 445,
    read: 320,
    failed: 5,
    successRate: 99.0
  },
  week: {
    sent: 3200,
    delivered: 3180,
    read: 2800,
    failed: 20,
    successRate: 99.4
  },
  month: {
    sent: 15000,
    delivered: 14950,
    read: 13500,
    failed: 50,
    successRate: 99.7
  },
  sessions: {
    total: 5,
    active: 4,
    inactive: 1
  },
  avgDeliveryTime: 5.2,      // seconds
  avgResponseTime: 125       // seconds
}
```

**Failed Messages:**

```javascript
{
  messages: [
    {
      messageId: "3EB0ABC...",
      to: "628999888777",
      type: "text",
      error: "Invalid number",
      timestamp: "2026-06-18T10:05:00Z",
      retries: 3
    }
  ],
  total: 50,
  page: 1,
  perPage: 20
}
```

### 2.3 Database Schema (SQLite)

**Message Events Table:**

```sql
CREATE TABLE message_events (
  id TEXT PRIMARY KEY,
  message_id TEXT NOT NULL,
  session_id TEXT,
  job_id TEXT,
  recipient TEXT NOT NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL,
  error TEXT,
  queued_at DATETIME,
  sent_at DATETIME,
  delivered_at DATETIME,
  read_at DATETIME,
  template_id TEXT,
  bulk_job_id TEXT,
  metadata TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_message_events_status ON message_events(status);
CREATE INDEX idx_message_events_created_at ON message_events(created_at);
CREATE INDEX idx_message_events_session_id ON message_events(session_id);
CREATE INDEX idx_message_events_message_id ON message_events(message_id);
```

**Daily Aggregates Table (for performance):**

```sql
CREATE TABLE daily_stats (
  date DATE PRIMARY KEY,
  session_id TEXT,
  total_sent INTEGER DEFAULT 0,
  total_delivered INTEGER DEFAULT 0,
  total_read INTEGER DEFAULT 0,
  total_failed INTEGER DEFAULT 0,
  avg_delivery_time REAL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 2.4 Request/Response Schemas

**Get Overview:**

```javascript
// GET /api/analytics/overview?sessionId=session-123

// Response
{
  success: true,
  data: {
    today: { sent: 450, delivered: 445, ... },
    week: { ... },
    month: { ... },
    sessions: { total: 5, active: 4 },
    avgDeliveryTime: 5.2
  }
}
```

**Get Message Statistics:**

```javascript
// GET /api/analytics/messages?from=2026-06-01&to=2026-06-30&sessionId=session-123

// Response
{
  success: true,
  data: {
    summary: {
      total: 15000,
      delivered: 14950,
      failed: 50,
      successRate: 99.7
    },
    byDay: [
      { date: "2026-06-01", sent: 500, delivered: 498, failed: 2 },
      { date: "2026-06-02", sent: 480, delivered: 478, failed: 2 }
    ],
    byType: {
      text: 12000,
      image: 2500,
      video: 500
    }
  }
}
```

**Get Message Status:**

```javascript
// GET /api/messages/3EB0ABC123/status

// Response
{
  success: true,
  data: {
    messageId: "3EB0ABC123",
    status: "read",
    timeline: [
      { status: "queued", timestamp: "2026-06-18T10:00:00Z" },
      { status: "sent", timestamp: "2026-06-18T10:00:05Z" },
      { status: "delivered", timestamp: "2026-06-18T10:00:10Z" },
      { status: "read", timestamp: "2026-06-18T10:05:00Z" }
    ],
    deliveryTime: 10,          // seconds from queued to delivered
    readTime: 305              // seconds from delivered to read
  }
}
```

**Export Analytics:**

```javascript
// GET /api/analytics/export?format=csv&from=2026-06-01&to=2026-06-30

// CSV Response:
date,session_id,sent,delivered,read,failed,success_rate
2026-06-01,session-123,500,498,450,2,99.6
2026-06-02,session-123,480,478,440,2,99.6

// JSON Response:
{
  success: true,
  data: {
    period: { from: "2026-06-01", to: "2026-06-30" },
    records: [
      { date: "2026-06-01", sent: 500, ... },
      { date: "2026-06-02", sent: 480, ... }
    ]
  }
}
```

### 2.5 File Structure

```
src/
├── analytics/
│   ├── tracker.js               # [NEW] Event tracking
│   ├── storage.js               # [NEW] SQLite storage
│   ├── aggregator.js            # [NEW] Daily aggregation
│   └── reporter.js              # [NEW] Generate reports
├── api/
│   └── controllers/
│       └── analytics.controller.js  # [NEW] Analytics API
└── utils/
    └── csvExport.js             # [NEW] CSV export utility
```

### 2.6 Dependencies

```json
{
  "better-sqlite3": "^9.0.0",
  "json2csv": "^6.0.0"
}
```

---

## 3. Implementation Steps

See: [IMPLEMENTATION_STEPS.md](./IMPLEMENTATION_STEPS.md)

---

## 4. Code Standards & Patterns

### 4.1 Event Tracking Pattern

```javascript
class AnalyticsTracker {
  async trackMessageQueued(data) {
    await storage.insert({
      messageId: data.messageId,
      status: 'queued',
      queuedAt: new Date(),
      ...data
    });
  }
  
  async trackMessageSent(messageId) {
    await storage.update(messageId, {
      status: 'sent',
      sentAt: new Date()
    });
  }
  
  async trackMessageDelivered(messageId) {
    await storage.update(messageId, {
      status: 'delivered',
      deliveredAt: new Date()
    });
  }
  
  async trackMessageRead(messageId) {
    await storage.update(messageId, {
      status: 'read',
      readAt: new Date()
    });
  }
  
  async trackMessageFailed(messageId, error) {
    await storage.update(messageId, {
      status: 'failed',
      error: error.message
    });
  }
}
```

### 4.2 Baileys Status Events

```javascript
// In whatsapp client
sock.ev.on('messages.update', (updates) => {
  for (const update of updates) {
    const messageId = update.key.id;
    
    // Delivery receipt
    if (update.update.status === 3) {
      analyticsTracker.trackMessageDelivered(messageId);
    }
    
    // Read receipt
    if (update.update.status === 4) {
      analyticsTracker.trackMessageRead(messageId);
    }
  }
});
```

### 4.3 Aggregation Pattern

```javascript
async function aggregateDailyStats(date) {
  const stats = await db.prepare(`
    SELECT 
      session_id,
      COUNT(*) as total_sent,
      SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as total_delivered,
      SUM(CASE WHEN status = 'read' THEN 1 ELSE 0 END) as total_read,
      SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as total_failed,
      AVG(JULIANDAY(delivered_at) - JULIANDAY(sent_at)) * 86400 as avg_delivery_time
    FROM message_events
    WHERE DATE(created_at) = ?
    GROUP BY session_id
  `).all(date);
  
  for (const stat of stats) {
    await db.prepare(`
      INSERT OR REPLACE INTO daily_stats 
      (date, session_id, total_sent, total_delivered, total_read, total_failed, avg_delivery_time)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(date, stat.session_id, stat.total_sent, stat.total_delivered, 
           stat.total_read, stat.total_failed, stat.avg_delivery_time);
  }
}

// Run daily at midnight
setInterval(() => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  aggregateDailyStats(yesterday.toISOString().split('T')[0]);
}, 24 * 60 * 60 * 1000);
```

### 4.4 CSV Export Pattern

```javascript
const { Parser } = require('json2csv');

function exportToCSV(data) {
  const fields = ['date', 'session_id', 'sent', 'delivered', 'read', 'failed', 'success_rate'];
  const parser = new Parser({ fields });
  return parser.parse(data);
}
```

---

## 5. Integration Points

### 5.1 Queue Integration (Phase 9)

Track when jobs are queued and processed:

```javascript
// When job added to queue
await analyticsTracker.trackMessageQueued({
  messageId,
  jobId: job.id,
  sessionId,
  to,
  type: 'text'
});

// When job processed
await analyticsTracker.trackMessageSent(messageId);
```

### 5.2 Webhook Integration (Phase 8)

Track incoming message response times.

### 5.3 Template Integration (Phase 13)

Track template usage and success rates.

---

## 6. Acceptance Criteria

### Must Have (P0)

- [ ] Track message queued event
- [ ] Track message sent event
- [ ] Track message delivered event
- [ ] Track message read event
- [ ] Track message failed event
- [ ] Overview API returns correct metrics
- [ ] Message statistics API works
- [ ] Failed messages API works
- [ ] Message status API works
- [ ] Export to CSV works
- [ ] Daily aggregation runs
- [ ] Tests pass with >80% coverage

### Nice to Have (P1)

- [ ] Real-time metrics (WebSocket)
- [ ] Export to Excel
- [ ] Chart data endpoints
- [ ] Custom date range filtering

---

## 7. Testing Requirements

See: [TESTING_GUIDE.md](./TESTING_GUIDE.md)

---

## 8. Rollback Plan

Analytics is passive (read-only). To disable:

```env
ANALYTICS_ENABLED=false
```

To rollback:

```bash
git revert <commit-hash>
pm2 restart whatsapp-gateway
```

---

**Next:** See [IMPLEMENTATION_STEPS.md](./IMPLEMENTATION_STEPS.md)
