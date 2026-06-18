# Phase 15: Structured Logging & Monitoring - Blueprint

> **Objective:** Production-grade logging with Pino, Prometheus metrics, and Grafana dashboard

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

### Current Logging

**Phase 1-14:**
```javascript
console.log('Message sent');
console.error('Error:', error.message);
```

**Problems:**
- ❌ Unstructured output
- ❌ No log levels
- ❌ No correlation IDs
- ❌ No log rotation
- ❌ Hard to parse
- ❌ No metrics collection

### What Will Change

- Replace console.log with Pino (structured logging)
- Add log levels (trace, debug, info, warn, error, fatal)
- Add correlation IDs for request tracing
- Add log rotation (daily, max 7 days)
- Add Prometheus metrics endpoint
- Add Grafana dashboard template

---

## 2. Technical Specification

### 2.1 Log Levels

| Level | Usage | Example |
|-------|-------|---------|
| `trace` | Very detailed (debug only) | Function entry/exit |
| `debug` | Debugging information | Variable values, logic flow |
| `info` | General information | Server started, message sent |
| `warn` | Warning messages | Deprecated API, fallback used |
| `error` | Error messages | API call failed, validation error |
| `fatal` | Fatal errors (crash) | Database unavailable, config invalid |

### 2.2 Structured Log Format

**JSON Output:**

```json
{
  "level": 30,
  "time": 1718697600000,
  "pid": 12345,
  "hostname": "server-01",
  "reqId": "req-abc123",
  "component": "whatsapp",
  "action": "send-message",
  "messageId": "3EB0ABC...",
  "to": "628123456789",
  "duration": 250,
  "msg": "Message sent successfully"
}
```

**Pretty Output (Development):**

```
[2026-06-18 10:30:00] INFO (whatsapp/12345): Message sent successfully
    component: "whatsapp"
    action: "send-message"
    messageId: "3EB0ABC..."
    duration: 250ms
```

### 2.3 Metrics to Collect

**Application Metrics:**
- `whatsapp_messages_total` - Total messages sent (counter)
- `whatsapp_messages_failed_total` - Failed messages (counter)
- `whatsapp_message_duration_seconds` - Message send duration (histogram)
- `whatsapp_sessions_active` - Active sessions (gauge)
- `whatsapp_queue_size` - Queue size (gauge)
- `whatsapp_webhook_requests_total` - Webhook requests (counter)

**System Metrics:**
- `process_cpu_usage` - CPU usage
- `process_memory_bytes` - Memory usage
- `process_uptime_seconds` - Uptime
- `nodejs_eventloop_lag_seconds` - Event loop lag

### 2.4 New API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `GET /metrics` | GET | Prometheus metrics endpoint |
| `GET /api/logs` | GET | Get recent logs (admin only) |

### 2.5 File Structure

```
src/
├── utils/
│   └── logger.js                # [NEW] Pino logger setup
├── middleware/
│   └── logging.middleware.js    # [NEW] Request logging
├── metrics/
│   ├── prometheus.js            # [NEW] Metrics collector
│   └── collectors/
│       ├── messageMetrics.js    # [NEW] Message metrics
│       └── systemMetrics.js     # [NEW] System metrics
├── index.js                     # [MODIFY] Replace console.log
├── grafana/
│   └── dashboard.json           # [NEW] Grafana dashboard
└── logs/                        # Log files (auto-created)
    ├── app.log                  # Current log
    ├── app-2026-06-17.log       # Rotated logs
    └── error.log                # Error-only log
```

### 2.6 Environment Variables

```env
# Logging Configuration (Phase 15)
LOG_LEVEL=info                   # trace, debug, info, warn, error, fatal
LOG_DIR=./logs
LOG_ROTATION=daily               # daily, size
LOG_MAX_FILES=7
LOG_PRETTY=false                 # true for development

# Metrics Configuration
METRICS_ENABLED=true
METRICS_PORT=9090               # Separate port for metrics (optional)
```

### 2.7 Dependencies

```json
{
  "pino": "^8.15.0",
  "pino-pretty": "^10.2.0",
  "pino-rotating-file-stream": "^3.0.0",
  "prom-client": "^15.0.0"
}
```

---

## 3. Implementation Steps

See: [IMPLEMENTATION_STEPS.md](./IMPLEMENTATION_STEPS.md)

---

## 4. Code Standards & Patterns

### 4.1 Logger Usage Pattern

```javascript
const logger = require('./utils/logger');

// Basic logging
logger.info('Server started on port 3000');
logger.error('Failed to connect to database');

// Structured logging
logger.info({
  component: 'whatsapp',
  action: 'send-message',
  messageId: '3EB0ABC...',
  duration: 250
}, 'Message sent successfully');

// Child logger (automatic context)
const reqLogger = logger.child({ reqId: 'req-abc123' });
reqLogger.info('Processing request');
// Output includes reqId automatically

// Error logging
logger.error({ err: error }, 'Failed to send message');
// Automatically logs error stack trace
```

### 4.2 Request Logging Middleware

```javascript
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

function loggingMiddleware(req, res, next) {
  const reqId = uuidv4();
  req.id = reqId;
  req.log = logger.child({ reqId });
  
  const startTime = Date.now();
  
  req.log.info({
    method: req.method,
    url: req.url,
    ip: req.ip
  }, 'Request received');
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    req.log.info({
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration
    }, 'Request completed');
  });
  
  next();
}
```

### 4.3 Metrics Collection Pattern

```javascript
const promClient = require('prom-client');

// Counter
const messagesTotal = new promClient.Counter({
  name: 'whatsapp_messages_total',
  help: 'Total messages sent',
  labelNames: ['type', 'status', 'session_id']
});

// Usage
messagesTotal.inc({ type: 'text', status: 'success', session_id: 'session-123' });

// Histogram
const messageDuration = new promClient.Histogram({
  name: 'whatsapp_message_duration_seconds',
  help: 'Message send duration',
  labelNames: ['type'],
  buckets: [0.1, 0.5, 1, 2, 5, 10]
});

// Usage
const endTimer = messageDuration.startTimer({ type: 'text' });
// ... send message ...
endTimer();

// Gauge
const activeSessions = new promClient.Gauge({
  name: 'whatsapp_sessions_active',
  help: 'Number of active sessions'
});

// Usage
activeSessions.set(5);
```

### 4.4 Replace Console.log Pattern

**Before:**
```javascript
console.log('Message sent:', messageId);
console.error('Error:', error.message);
```

**After:**
```javascript
logger.info({ messageId }, 'Message sent');
logger.error({ err: error }, 'Failed to send message');
```

---

## 5. Integration Points

### 5.1 Replace All Console.log

**Files to update:**
- `src/index.js`
- `src/whatsapp/client.js`
- `src/whatsapp/handlers.js`
- `src/whatsapp/webhookHandler.js`
- `src/queue/*.js`
- `src/api/controllers/*.js`

**Pattern:**
```javascript
// Old
console.log('✅ Message sent');

// New
logger.info({ component: 'send' }, 'Message sent');
```

### 5.2 Add Metrics to Key Operations

**Message Send:**
```javascript
messagesTotal.inc({ type: 'text', status: 'success' });
const endTimer = messageDuration.startTimer();
// ... send ...
endTimer();
```

**Queue Operations:**
```javascript
queueSize.set(await queue.getWaitingCount());
```

**Session Status:**
```javascript
activeSessions.set(sessionManager.getActiveSessions().length);
```

---

## 6. Acceptance Criteria

### Must Have (P0)

- [ ] Pino logger configured and working
- [ ] All console.log replaced with logger
- [ ] Log rotation working (daily)
- [ ] Correlation IDs added to requests
- [ ] Prometheus metrics endpoint works
- [ ] Key metrics collected (messages, sessions, queue)
- [ ] Grafana dashboard template created
- [ ] Error logs separated
- [ ] Log level configurable via env
- [ ] Tests pass

### Nice to Have (P1)

- [ ] Log search API
- [ ] Real-time log streaming (WebSocket)
- [ ] Alert rules for Grafana
- [ ] Custom metrics dashboard

---

## 7. Testing Requirements

See: [TESTING_GUIDE.md](./TESTING_GUIDE.md)

---

## 8. Rollback Plan

Logging is non-breaking. To disable structured logging:

```env
LOG_LEVEL=silent
METRICS_ENABLED=false
```

To rollback:

```bash
git revert <commit-hash>
pm2 restart whatsapp-gateway
```

---

**Next:** See [IMPLEMENTATION_STEPS.md](./IMPLEMENTATION_STEPS.md)
