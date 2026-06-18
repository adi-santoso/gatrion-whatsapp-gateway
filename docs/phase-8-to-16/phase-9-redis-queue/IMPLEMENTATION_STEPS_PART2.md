# Phase 9: Implementation Steps - Part 2

> **Continuation from IMPLEMENTATION_STEPS.md (Steps 1-5)**

---

## Step 6: Create Queue Workers

### 6.1 Create `src/queue/workers.js`

**File:** `src/queue/workers.js` (NEW)  
**Purpose:** Process jobs from queue

```javascript
const { Worker } = require('bullmq');
const { getRedisClient } = require('../config/redis');
const { getWhatsAppClient } = require('../whatsapp/client');
const { JOB_TYPES } = require('./types');
const config = require('../config/env');

let worker = null;

/**
 * Create and start queue worker
 */
function startWorker() {
  if (!config.REDIS_ENABLED) {
    console.log('⚠️  Redis disabled, worker not started');
    return null;
  }
  
  const connection = getRedisClient();
  
  worker = new Worker('whatsapp:messages', async (job) => {
    console.log(`🔄 Processing job: ${job.name} (${job.id})`);
    
    try {
      await processJob(job);
      console.log(`✅ Job completed: ${job.id}`);
    } catch (error) {
      console.error(`❌ Job failed: ${job.id}`, error.message);
      throw error; // Re-throw for BullMQ retry
    }
  }, {
    connection,
    concurrency: config.QUEUE_CONCURRENCY,
    limiter: {
      max: config.QUEUE_RATE_LIMIT_MAX,
      duration: config.QUEUE_RATE_LIMIT_DURATION,
    },
  });
  
  // Worker event listeners
  worker.on('completed', (job) => {
    console.log(`✅ Job ${job.id} completed`);
  });
  
  worker.on('failed', (job, err) => {
    console.error(`❌ Job ${job.id} failed:`, err.message);
  });
  
  worker.on('error', (err) => {
    console.error('❌ Worker error:', err.message);
  });
  
  console.log('✅ Queue worker started');
  
  return worker;
}

/**
 * Process job based on type
 */
async function processJob(job) {
  const { name, data } = job;
  const sock = getWhatsAppClient();
  
  if (!sock) {
    throw new Error('WhatsApp client not available');
  }
  
  switch (name) {
    case JOB_TYPES.SEND_TEXT:
      return await sendText(sock, data);
    
    case JOB_TYPES.SEND_IMAGE:
      return await sendImage(sock, data);
    
    default:
      throw new Error(`Unknown job type: ${name}`);
  }
}

/**
 * Send text message
 */
async function sendText(sock, data) {
  const { to, message } = data;
  
  // Normalize phone number
  const jid = to.includes('@') ? to : `${to}@s.whatsapp.net`;
  
  const result = await sock.sendMessage(jid, {
    text: message,
  });
  
  return {
    messageId: result.key.id,
    to: jid,
    status: 'sent',
  };
}

/**
 * Send image message
 */
async function sendImage(sock, data) {
  const { to, buffer, caption, mimeType } = data;
  
  const jid = to.includes('@') ? to : `${to}@s.whatsapp.net`;
  
  const result = await sock.sendMessage(jid, {
    image: buffer,
    caption: caption || '',
    mimetype: mimeType || 'image/jpeg',
  });
  
  return {
    messageId: result.key.id,
    to: jid,
    type: 'image',
    status: 'sent',
  };
}

/**
 * Stop worker gracefully
 */
async function stopWorker() {
  if (worker) {
    await worker.close();
    worker = null;
    console.log('✅ Queue worker stopped');
  }
}

/**
 * Get worker instance
 */
function getWorker() {
  return worker;
}

module.exports = {
  startWorker,
  stopWorker,
  getWorker,
};
```

**Verify:**
```bash
node -e "const w = require('./src/queue/workers'); console.log(typeof w.startWorker)"
# Should output: function
```

---

## Step 7: Update Send Controllers to Use Queue

### 7.1 Modify `src/api/controllers/send.controller.js`

**File:** `src/api/controllers/send.controller.js`  
**Action:** Replace direct send with queue

**Find the sendText function:**

```javascript
// OLD CODE (remove this)
async function sendText(req, res) {
  // ... validation ...
  
  const sock = getWhatsAppClient();
  const result = await sock.sendMessage(jid, { text: message });
  
  res.json({ success: true, data: { messageId: result.key.id } });
}
```

**Replace with:**

```javascript
const { addJob } = require('../../queue/messageQueue');
const { JOB_TYPES } = require('../../queue/types');
const config = require('../../config/env');

async function sendText(req, res) {
  try {
    const { to, message } = req.body;
    
    // Validation
    if (!to || !message) {
      return res.status(400).json({
        success: false,
        error: 'ValidationError',
        message: 'Fields "to" and "message" are required',
      });
    }
    
    // Check if Redis enabled
    if (config.REDIS_ENABLED) {
      // Add to queue
      const job = await addJob(JOB_TYPES.SEND_TEXT, {
        to,
        message,
      });
      
      return res.json({
        success: true,
        data: {
          jobId: job.id,
          to,
          status: 'queued',
          timestamp: new Date().toISOString(),
        },
      });
    } else {
      // Fallback: direct send (Phase 1-8 behavior)
      const sock = getWhatsAppClient();
      
      if (!sock) {
        return res.status(503).json({
          success: false,
          error: 'ServiceUnavailable',
          message: 'WhatsApp not connected',
        });
      }
      
      const jid = to.includes('@') ? to : `${to}@s.whatsapp.net`;
      const result = await sock.sendMessage(jid, { text: message });
      
      return res.json({
        success: true,
        data: {
          messageId: result.key.id,
          to: jid,
          status: 'sent',
          timestamp: new Date().toISOString(),
        },
      });
    }
  } catch (error) {
    console.error('Error in sendText:', error);
    return res.status(500).json({
      success: false,
      error: 'InternalError',
      message: error.message,
    });
  }
}
```

**Do the same for sendImage function:**

```javascript
async function sendImage(req, res) {
  try {
    const { to } = req.body;
    const file = req.file;
    
    // Validation
    if (!to || !file) {
      return res.status(400).json({
        success: false,
        error: 'ValidationError',
        message: 'Fields "to" and "image" are required',
      });
    }
    
    if (config.REDIS_ENABLED) {
      // Add to queue
      const job = await addJob(JOB_TYPES.SEND_IMAGE, {
        to,
        buffer: file.buffer,
        caption: req.body.caption || '',
        mimeType: file.mimetype,
        size: file.size,
      });
      
      return res.json({
        success: true,
        data: {
          jobId: job.id,
          to,
          type: 'image',
          status: 'queued',
          size: file.size,
          timestamp: new Date().toISOString(),
        },
      });
    } else {
      // Fallback: direct send
      const sock = getWhatsAppClient();
      
      if (!sock) {
        return res.status(503).json({
          success: false,
          error: 'ServiceUnavailable',
          message: 'WhatsApp not connected',
        });
      }
      
      const jid = to.includes('@') ? to : `${to}@s.whatsapp.net`;
      const result = await sock.sendMessage(jid, {
        image: file.buffer,
        caption: req.body.caption || '',
        mimetype: file.mimetype,
      });
      
      return res.json({
        success: true,
        data: {
          messageId: result.key.id,
          to: jid,
          type: 'image',
          status: 'sent',
          size: file.size,
          timestamp: new Date().toISOString(),
        },
      });
    }
  } catch (error) {
    console.error('Error in sendImage:', error);
    return res.status(500).json({
      success: false,
      error: 'InternalError',
      message: error.message,
    });
  }
}
```

---

## Step 8: Create Queue Management API

### 8.1 Create `src/api/controllers/queue.controller.js`

**File:** `src/api/controllers/queue.controller.js` (NEW)

```javascript
const { getQueueStats } = require('../../queue/messageQueue');
const { getWorker } = require('../../queue/workers');
const config = require('../../config/env');

/**
 * Get queue statistics
 * GET /api/queue/stats
 */
async function getStats(req, res) {
  try {
    if (!config.REDIS_ENABLED) {
      return res.json({
        success: true,
        data: {
          enabled: false,
          message: 'Queue disabled (using in-memory)',
        },
      });
    }
    
    const stats = await getQueueStats();
    
    return res.json({
      success: true,
      data: {
        enabled: true,
        ...stats,
      },
    });
  } catch (error) {
    console.error('Error getting queue stats:', error);
    return res.status(500).json({
      success: false,
      error: 'InternalError',
      message: error.message,
    });
  }
}

/**
 * Get worker status
 * GET /api/queue/worker
 */
async function getWorkerStatus(req, res) {
  try {
    const worker = getWorker();
    
    if (!worker) {
      return res.json({
        success: true,
        data: {
          running: false,
          message: 'Worker not running',
        },
      });
    }
    
    return res.json({
      success: true,
      data: {
        running: true,
        concurrency: config.QUEUE_CONCURRENCY,
        rateLimit: {
          max: config.QUEUE_RATE_LIMIT_MAX,
          duration: config.QUEUE_RATE_LIMIT_DURATION,
        },
      },
    });
  } catch (error) {
    console.error('Error getting worker status:', error);
    return res.status(500).json({
      success: false,
      error: 'InternalError',
      message: error.message,
    });
  }
}

module.exports = {
  getStats,
  getWorkerStatus,
};
```

### 8.2 Add Queue Routes

**File:** `src/api/routes.js`  
**Action:** Add queue routes

**Add at the end of routes:**

```javascript
const queueController = require('./controllers/queue.controller');

// Queue management routes
router.get('/queue/stats', authMiddleware, queueController.getStats);
router.get('/queue/worker', authMiddleware, queueController.getWorkerStatus);
```

---

## Step 9: Initialize Worker in Main App

### 9.1 Modify `src/index.js`

**File:** `src/index.js`  
**Action:** Start worker on app start, stop on shutdown

**Add imports at top:**

```javascript
const { testRedisConnection } = require('./config/redis');
const { startWorker, stopWorker } = require('./queue/workers');
```

**Add after WhatsApp client initialization:**

```javascript
// Initialize WhatsApp client
await initializeWhatsApp();

// Test Redis connection (Phase 9)
if (config.REDIS_ENABLED) {
  const redisOk = await testRedisConnection();
  if (redisOk) {
    console.log('✅ Redis connection successful');
    
    // Start queue worker
    startWorker();
  } else {
    console.error('⚠️  Redis connection failed, using in-memory queue');
  }
}

// Start server
const server = app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
```

**Add graceful shutdown:**

```javascript
// Graceful shutdown
async function shutdown(signal) {
  console.log(`\n${signal} received, closing server gracefully...`);
  
  // Stop accepting new requests
  server.close(async () => {
    console.log('✅ HTTP server closed');
    
    // Stop queue worker
    await stopWorker();
    
    // Close Redis connection
    const { closeRedis } = require('./config/redis');
    await closeRedis();
    
    // Close queue
    const { closeQueue } = require('./queue/messageQueue');
    await closeQueue();
    
    console.log('✅ All connections closed, exiting');
    process.exit(0);
  });
  
  // Force shutdown after 10 seconds
  setTimeout(() => {
    console.error('⚠️  Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
```

---

## Step 10: Update README Documentation

### 10.1 Add Redis Section to README.md

**File:** `README.md`  
**Action:** Add Redis Queue documentation

**Add new section after Webhook section:**

```markdown
---

## Redis Queue (Optional)

### Overview

WhatsApp Gateway dapat menggunakan Redis + BullMQ untuk persistent message queue. Fitur ini **optional** dan dapat diaktifkan/dinonaktifkan via environment variable.

### Benefits

**With Redis (Production):**
- ✅ Messages persist on restart (zero loss)
- ✅ Job retry mechanism (3 attempts)
- ✅ Priority queue support
- ✅ Scheduled messages
- ✅ Queue monitoring

**Without Redis (Simple Deployment):**
- ✅ No external dependencies
- ✅ Simple setup
- ⚠️ Messages lost on restart

### Setup Redis

**Option 1: Docker (Recommended)**

```bash
# Start Redis
docker-compose up -d redis

# Verify
docker ps
```

**Option 2: Local Install**

```bash
# Ubuntu/Debian
sudo apt install redis-server
sudo systemctl start redis

# macOS
brew install redis
brew services start redis

# Verify
redis-cli ping  # Should return: PONG
```

### Configuration

**Enable Redis in `.env`:**

```env
REDIS_ENABLED=true
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

QUEUE_CONCURRENCY=5
QUEUE_RATE_LIMIT_MAX=20
QUEUE_RATE_LIMIT_DURATION=60000
```

**Disable Redis:**

```env
REDIS_ENABLED=false
```

### Queue API Endpoints

**Get Queue Stats:**

```bash
curl -H "x-api-key: your-api-key" \
  http://localhost:3000/api/queue/stats
```

**Response:**
```json
{
  "success": true,
  "data": {
    "enabled": true,
    "waiting": 5,
    "active": 2,
    "completed": 1523,
    "failed": 12,
    "delayed": 0,
    "total": 1542
  }
}
```

**Get Worker Status:**

```bash
curl -H "x-api-key: your-api-key" \
  http://localhost:3000/api/queue/worker
```

### Monitoring Queue

**Check queue health:**

```bash
# Redis CLI
redis-cli

# List all keys
KEYS bull:whatsapp:messages:*

# Check waiting jobs
LLEN bull:whatsapp:messages:wait

# Check active jobs
LLEN bull:whatsapp:messages:active

# Check failed jobs
LLEN bull:whatsapp:messages:failed
```

---
```

---

## Step 11: Testing

### 11.1 Create `tests/queue.test.js`

**File:** `tests/queue.test.js` (NEW)

```javascript
const { addJob, getQueueStats } = require('../src/queue/messageQueue');
const { JOB_TYPES } = require('../src/queue/types');

describe('Queue - Unit Tests', () => {
  
  beforeAll(() => {
    // Set env for testing
    process.env.REDIS_ENABLED = 'true';
    process.env.REDIS_HOST = 'localhost';
    process.env.REDIS_PORT = '6379';
  });
  
  it('should add text job to queue', async () => {
    const job = await addJob(JOB_TYPES.SEND_TEXT, {
      to: '628123456789',
      message: 'Test message',
    });
    
    expect(job).toBeDefined();
    expect(job.id).toBeDefined();
    expect(job.name).toBe('send-text');
  });
  
  it('should add image job to queue', async () => {
    const job = await addJob(JOB_TYPES.SEND_IMAGE, {
      to: '628123456789',
      buffer: Buffer.from('fake-image'),
      caption: 'Test image',
    });
    
    expect(job).toBeDefined();
    expect(job.name).toBe('send-image');
  });
  
  it('should get queue stats', async () => {
    const stats = await getQueueStats();
    
    expect(stats).toBeDefined();
    expect(stats).toHaveProperty('waiting');
    expect(stats).toHaveProperty('active');
    expect(stats).toHaveProperty('completed');
    expect(stats).toHaveProperty('failed');
  });
  
  it('should support priority', async () => {
    const job = await addJob(JOB_TYPES.SEND_TEXT, 
      { to: '628123456789', message: 'Urgent' },
      { priority: 1 } // Urgent
    );
    
    expect(job.opts.priority).toBe(1);
  });
  
  it('should support delay', async () => {
    const job = await addJob(JOB_TYPES.SEND_TEXT,
      { to: '628123456789', message: 'Delayed' },
      { delay: 5000 } // 5 seconds
    );
    
    expect(job.opts.delay).toBe(5000);
  });
});
```

**Run tests:**
```bash
npm test -- tests/queue.test.js
```

---

## Step 12: Commit Changes

```bash
git add .
git commit -m "feat(phase-9): implement Redis queue with BullMQ

- Add Redis connection module with health check
- Add BullMQ queue setup with job types
- Add queue workers with concurrency & rate limiting
- Update send controllers to use queue (with fallback)
- Add queue management API (stats, worker status)
- Add graceful shutdown for queue & Redis
- Add queue tests
- Update README with Redis documentation
- Optional feature: REDIS_ENABLED flag

Features:
- Zero message loss on restart (when enabled)
- Job retry with exponential backoff (3 attempts)
- Priority queue support
- Scheduled messages support
- Fallback to in-memory if disabled

Closes: Phase 9 - Redis Queue"

git push origin main
```

---

## Post-Implementation Checklist

- [ ] Redis installed and running
- [ ] Dependencies installed (bullmq, ioredis)
- [ ] Environment variables configured
- [ ] Queue initialized successfully
- [ ] Worker started and processing jobs
- [ ] Send APIs return jobId (queued status)
- [ ] Queue stats API works
- [ ] Graceful shutdown works
- [ ] Tests pass
- [ ] Works with REDIS_ENABLED=false (fallback)
- [ ] No regression (existing features work)

---

**Next:** [TESTING_GUIDE.md](./TESTING_GUIDE.md) - Integration testing procedures
