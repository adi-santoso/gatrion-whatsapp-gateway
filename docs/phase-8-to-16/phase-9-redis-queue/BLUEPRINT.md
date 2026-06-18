# Phase 9: Redis Queue (Persistent Message Queue) - Blueprint

> **Objective:** Replace in-memory queue with Redis-backed persistent queue using BullMQ for zero message loss and reliability

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

### Current Queue Implementation

**Location:** `src/api/controllers/send.controller.js`

```javascript
// Current: Simple in-memory queue with setTimeout
const messageQueue = [];
let isProcessing = false;

async function processQueue() {
  if (isProcessing || messageQueue.length === 0) return;
  isProcessing = true;
  
  const job = messageQueue.shift();
  await sendMessage(job);
  
  setTimeout(() => {
    isProcessing = false;
    processQueue();
  }, 150); // 150ms delay
}
```

### Problems with Current Implementation

1. **Message Loss:** Queue in memory - lost on restart
2. **No Persistence:** Can't survive crashes
3. **No Retry:** Failed messages not retried
4. **No Priority:** All messages treated equally
5. **No Scheduling:** Can't schedule messages for later
6. **No Monitoring:** Can't see queue status
7. **No Job Tracking:** Can't check message delivery status

### What Will Change

- Add Redis as dependency
- Replace in-memory queue with BullMQ
- Add job persistence and retry
- Add priority queue (urgent, normal, low)
- Add scheduled messages
- Add queue monitoring API

---

## 2. Technical Specification

### 2.1 Architecture

```
┌─────────────┐
│  API Layer  │
└──────┬──────┘
       │ Add job
       ▼
┌─────────────────┐      ┌──────────┐
│  BullMQ Queue   │◄────►│  Redis   │
└──────┬──────────┘      └──────────┘
       │ Process job
       ▼
┌─────────────────┐
│  Baileys Client │
└─────────────────┘
```

### 2.2 Environment Variables

**Add to `.env.example`:**

```env
# Redis Configuration (Phase 9)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
REDIS_ENABLED=true

# Queue Configuration
QUEUE_CONCURRENCY=5
QUEUE_RATE_LIMIT_MAX=20
QUEUE_RATE_LIMIT_DURATION=60000
```

### 2.3 New Dependencies

```json
{
  "bullmq": "^5.0.0",
  "ioredis": "^5.3.0"
}
```

### 2.4 New File Structure

```
src/
├── config/
│   ├── env.js                    # [MODIFY] Add Redis config
│   └── redis.js                  # [NEW] Redis connection
├── queue/
│   ├── messageQueue.js           # [NEW] BullMQ queue setup
│   ├── workers.js                # [NEW] Job processors
│   └── types.js                  # [NEW] Job type definitions
├── api/
│   └── controllers/
│       ├── send.controller.js    # [MODIFY] Use queue instead of direct send
│       └── queue.controller.js   # [NEW] Queue management API
└── index.js                      # [MODIFY] Initialize queue workers
```

### 2.5 Data Models

**Job Data Schema (Multi-Session):**

```javascript
{
  id: "job-uuid",
  type: "send-text" | "send-image" | "send-video" | "send-document",
  sessionId: "session-abc123",  // ← REQUIRED: Session identifier
  data: {
    to: "628123456789",
    message: "Hello",
    // ... other fields based on type
  },
  priority: 1 | 5 | 10,  // 1=urgent, 5=normal, 10=low
  delay: 0,               // milliseconds to delay
  timestamp: "2026-06-18T10:30:00.000Z",
  attempts: 0,
  maxAttempts: 3,
}
```

**Queue Stats Schema (Per-Session):**

```javascript
// Global stats
{
  waiting: 5,
  active: 2,
  completed: 1523,
  failed: 12,
  delayed: 3,
  paused: false
}

// Per-session stats (optional)
{
  sessionId: "session-abc123",
  waiting: 2,
  active: 1,
  completed: 850,
  failed: 3
}
```

### 2.6 Queue Names

- `whatsapp:messages` - Main message queue
- `whatsapp:messages:failed` - Failed jobs (DLQ)

### 2.7 Redis Keys

- `bull:whatsapp:messages:*` - BullMQ internal keys
- `bull:whatsapp:messages:id` - Job counter
- `bull:whatsapp:messages:wait` - Waiting jobs
- `bull:whatsapp:messages:active` - Active jobs
- `bull:whatsapp:messages:completed` - Completed jobs
- `bull:whatsapp:messages:failed` - Failed jobs

---

## 3. Implementation Steps

See: [IMPLEMENTATION_STEPS.md](./IMPLEMENTATION_STEPS.md)

---

## 4. Code Standards & Patterns

### 4.1 Error Handling

```javascript
// Always catch and handle queue errors
queue.on('error', (error) => {
  logger.error('Queue error', { error: error.message, stack: error.stack });
  // Don't crash - log and continue
});

// Job failure handling
worker.on('failed', (job, err) => {
  logger.error('Job failed', {
    jobId: job.id,
    type: job.name,
    attempts: job.attemptsMade,
    error: err.message,
  });
});
```

### 4.2 Graceful Shutdown

```javascript
// In src/index.js
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, closing queue workers...');
  await worker.close();
  await queue.close();
  process.exit(0);
});
```

### 4.3 Job Options Pattern

```javascript
const defaultJobOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 1000, // 1s, 2s, 4s
  },
  removeOnComplete: {
    age: 86400, // 24 hours
    count: 1000,
  },
  removeOnFail: {
    age: 604800, // 7 days
  },
};
```

### 4.4 Redis Connection Pattern

```javascript
// Reuse connection, don't create multiple
const redis = new Redis({
  host: config.REDIS_HOST,
  port: config.REDIS_PORT,
  password: config.REDIS_PASSWORD,
  db: config.REDIS_DB,
  maxRetriesPerRequest: null, // Required for BullMQ
  enableReadyCheck: false,
  retryStrategy: (times) => Math.min(times * 50, 2000),
});
```

---

## 5. Integration Points

### 5.1 Multi-Session Worker Routing

**Worker routes jobs to correct session:**

```javascript
// src/queue/workers.js
import { sessionManager } from '../whatsapp/sessionManager.js';

async function processJob(job) {
  const { sessionId, data, type } = job.data;
  
  // Validate sessionId exists
  if (!sessionId) {
    throw new Error('Job missing sessionId');
  }
  
  // Get session
  const session = sessionManager.getSession(sessionId);
  if (!session) {
    throw new Error(`Session not found: ${sessionId}`);
  }
  
  // Validate session is connected
  if (session.status !== 'connected') {
    throw new Error(`Session ${sessionId} not connected (status: ${session.status})`);
  }
  
  // Route to session-specific client
  const { sock } = session;
  const jid = data.to.includes('@') ? data.to : `${data.to}@s.whatsapp.net`;
  
  switch (type) {
    case 'send-text':
      return await sock.sendMessage(jid, { text: data.message });
    case 'send-image':
      return await sock.sendMessage(jid, { 
        image: data.imageBuffer, 
        caption: data.caption 
      });
    // ... other types
    default:
      throw new Error(`Unknown job type: ${type}`);
  }
}
```

### 5.2 API Changes (Strict sessionId)

**Before (Phase 1-8):**
```javascript
POST /api/send-text
{ "to": "628123456789", "message": "Hello" }
```

**After (Phase 9 + 11):**
```javascript
POST /api/send-text
{
  "sessionId": "session-abc123",  // ← REQUIRED
  "to": "628123456789",
  "message": "Hello"
}

// Add to queue with sessionId
const job = await messageQueue.add('send-text', {
  sessionId: req.body.sessionId,  // ← Pass to job
  to: req.body.to,
  message: req.body.message
});

res.json({ 
  success: true, 
  data: { 
    jobId: job.id, 
    sessionId: req.body.sessionId,
    status: 'queued' 
  } 
});
```

### 5.3 Fallback Strategy (Redis Optional)

```javascript
// src/queue/messageQueue.js
if (!config.REDIS_ENABLED) {
  logger.warn('Redis disabled, using in-memory queue (messages may be lost on restart)');
  return inMemoryQueue;
}

try {
  await redis.ping();
  return bullMQQueue;
} catch (error) {
  logger.error('Redis unavailable, falling back to in-memory queue');
  return inMemoryQueue;
}
```

---

## 6. Acceptance Criteria

### Must Have (P0)

- [ ] Redis connection established successfully
- [ ] BullMQ queue created and working
- [ ] All jobs include `sessionId` field
- [ ] Worker validates session exists before processing
- [ ] Worker routes jobs to correct session client
- [ ] Jobs fail if session not found/connected
- [ ] Failed jobs retried with exponential backoff (3 attempts)
- [ ] Queue survives restart (no message loss)
- [ ] Queue stats API returns correct data
- [ ] Fallback to in-memory queue if Redis disabled
- [ ] Graceful shutdown closes queue cleanly
- [ ] Tests pass with >80% coverage

### Nice to Have (P1)

- [ ] Priority queue (urgent/normal/low)
- [ ] Scheduled messages (send later)
- [ ] Per-session queue stats
- [ ] Queue pause/resume per session
- [ ] Failed job retry dashboard

### Out of Scope

- Redis cluster support (single instance only)
- Queue UI dashboard (Phase 16)
- Multiple queue types

---

## 7. Testing Requirements

See: [TESTING_GUIDE.md](./TESTING_GUIDE.md)

---

## 8. Rollback Plan

### If Redis Unavailable

1. Set `REDIS_ENABLED=false` in `.env`
2. Restart service
3. Falls back to in-memory queue (Phase 1-8 behavior)

### If Implementation Fails

```bash
git revert <commit-hash>
git push
pm2 restart whatsapp-gateway
```

### Safe Stop Points

1. After Redis config (no queue changes yet)
2. After queue setup (not used by API yet)
3. After worker setup (processing disabled)
4. After API integration (with feature flag)

---

**Next:** See [IMPLEMENTATION_STEPS.md](./IMPLEMENTATION_STEPS.md) for detailed implementation.
