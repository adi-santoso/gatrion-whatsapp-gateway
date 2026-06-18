# Phase 9: Implementation Steps

> **Step-by-step prescriptive implementation guide**

---

## Pre-Implementation Checklist

- [ ] Phase 8 completed and tested
- [ ] Redis installed locally or Docker available
- [ ] Git clean (no uncommitted changes)
- [ ] Service running and tested

---

## Step 1: Install Redis

### Option A: Docker (Recommended)

**Create `docker-compose.yml` in project root:**

```yaml
version: '3.8'

services:
  redis:
    image: redis:7-alpine
    container_name: whatsapp-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5

volumes:
  redis_data:
```

**Start Redis:**
```bash
docker-compose up -d redis
docker ps  # Verify running
```

### Option B: Local Install

**Windows:**
```bash
# Download Redis for Windows or use WSL
# Or use Memurai: https://www.memurai.com/
```

**Linux/macOS:**
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install redis-server
sudo systemctl start redis

# macOS
brew install redis
brew services start redis

# Verify
redis-cli ping  # Should return: PONG
```

---

## Step 2: Install Dependencies

```bash
npm install bullmq ioredis
```

**Verify:**
```bash
npm list bullmq ioredis
# Should show versions installed
```

---

## Step 3: Update Environment Configuration

### 3.1 Modify `.env.example`

**Add at the end:**

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

### 3.2 Update `.env`

Copy the same config to your `.env` file.

### 3.3 Modify `src/config/env.js`

**Add before `module.exports`:**

```javascript
// Redis Configuration (Phase 9)
const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT) || 6379;
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || '';
const REDIS_DB = parseInt(process.env.REDIS_DB) || 0;
const REDIS_ENABLED = process.env.REDIS_ENABLED !== 'false';

// Queue Configuration
const QUEUE_CONCURRENCY = parseInt(process.env.QUEUE_CONCURRENCY) || 5;
const QUEUE_RATE_LIMIT_MAX = parseInt(process.env.QUEUE_RATE_LIMIT_MAX) || 20;
const QUEUE_RATE_LIMIT_DURATION = parseInt(process.env.QUEUE_RATE_LIMIT_DURATION) || 60000;

if (REDIS_ENABLED) {
  console.log('✅ Redis enabled:', `${REDIS_HOST}:${REDIS_PORT}`);
}
```

**Update `module.exports`:**

```javascript
module.exports = {
  PORT,
  NODE_ENV,
  API_KEY,
  WA_SESSION_PATH,
  WEBHOOK_URL,
  WEBHOOK_SECRET,
  WEBHOOK_RETRY_ATTEMPTS,
  WEBHOOK_TIMEOUT,
  WEBHOOK_ENABLED,
  // Redis config
  REDIS_HOST,
  REDIS_PORT,
  REDIS_PASSWORD,
  REDIS_DB,
  REDIS_ENABLED,
  QUEUE_CONCURRENCY,
  QUEUE_RATE_LIMIT_MAX,
  QUEUE_RATE_LIMIT_DURATION,
};
```

**Verify:**
```bash
node -e "console.log(require('./src/config/env.js').REDIS_ENABLED)"
# Should output: true
```

---

## Step 4: Create Redis Connection Module

### 4.1 Create `src/config/redis.js`

```javascript
const Redis = require('ioredis');
const config = require('./env');

let redisClient = null;

/**
 * Get Redis client instance (singleton)
 */
function getRedisClient() {
  if (!config.REDIS_ENABLED) {
    return null;
  }
  
  if (redisClient) {
    return redisClient;
  }
  
  redisClient = new Redis({
    host: config.REDIS_HOST,
    port: config.REDIS_PORT,
    password: config.REDIS_PASSWORD || undefined,
    db: config.REDIS_DB,
    maxRetriesPerRequest: null, // Required for BullMQ
    enableReadyCheck: false,
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    lazyConnect: false,
  });
  
  redisClient.on('connect', () => {
    console.log('✅ Redis connected');
  });
  
  redisClient.on('error', (error) => {
    console.error('❌ Redis error:', error.message);
  });
  
  redisClient.on('close', () => {
    console.log('⚠️  Redis connection closed');
  });
  
  return redisClient;
}

/**
 * Close Redis connection
 */
async function closeRedis() {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    console.log('✅ Redis connection closed');
  }
}

/**
 * Test Redis connection
 */
async function testRedisConnection() {
  if (!config.REDIS_ENABLED) {
    return false;
  }
  
  try {
    const client = getRedisClient();
    const result = await client.ping();
    return result === 'PONG';
  } catch (error) {
    console.error('❌ Redis connection test failed:', error.message);
    return false;
  }
}

module.exports = {
  getRedisClient,
  closeRedis,
  testRedisConnection,
};
```

**Verify:**
```bash
node -e "const r = require('./src/config/redis'); r.testRedisConnection().then(ok => console.log('Redis OK:', ok))"
# Should output: Redis OK: true
```

---

## Step 5: Create Queue Module

### 5.1 Create `src/queue/types.js`

```javascript
/**
 * Job type definitions
 */

const JOB_TYPES = {
  SEND_TEXT: 'send-text',
  SEND_IMAGE: 'send-image',
  SEND_VIDEO: 'send-video',
  SEND_AUDIO: 'send-audio',
  SEND_DOCUMENT: 'send-document',
  SEND_LOCATION: 'send-location',
  SEND_CONTACT: 'send-contact',
};

const JOB_PRIORITIES = {
  URGENT: 1,
  NORMAL: 5,
  LOW: 10,
};

const DEFAULT_JOB_OPTIONS = {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 1000, // 1s, 2s, 4s
  },
  removeOnComplete: {
    age: 86400, // Keep completed jobs for 24 hours
    count: 1000, // Keep max 1000 completed jobs
  },
  removeOnFail: {
    age: 604800, // Keep failed jobs for 7 days
  },
};

module.exports = {
  JOB_TYPES,
  JOB_PRIORITIES,
  DEFAULT_JOB_OPTIONS,
};
```

### 5.2 Create `src/queue/messageQueue.js`

```javascript
const { Queue } = require('bullmq');
const { getRedisClient } = require('../config/redis');
const config = require('../config/env');
const { DEFAULT_JOB_OPTIONS } = require('./types');

let messageQueue = null;

/**
 * Get message queue instance (singleton)
 */
function getMessageQueue() {
  if (!config.REDIS_ENABLED) {
    console.warn('⚠️  Redis disabled, queue not available');
    return null;
  }
  
  if (messageQueue) {
    return messageQueue;
  }
  
  const connection = getRedisClient();
  
  messageQueue = new Queue('whatsapp:messages', {
    connection,
    defaultJobOptions: {
      ...DEFAULT_JOB_OPTIONS,
      priority: 5, // Normal priority
    },
  });
  
  // Event listeners
  messageQueue.on('error', (error) => {
    console.error('❌ Queue error:', error.message);
  });
  
  console.log('✅ Message queue initialized');
  
  return messageQueue;
}

/**
 * Add job to queue
 * @param {string} jobType - Job type (send-text, send-image, etc)
 * @param {Object} data - Job data
 * @param {Object} options - Job options (priority, delay, etc)
 */
async function addJob(jobType, data, options = {}) {
  const queue = getMessageQueue();
  
  if (!queue) {
    throw new Error('Queue not available (Redis disabled)');
  }
  
  const job = await queue.add(jobType, data, {
    priority: options.priority || 5,
    delay: options.delay || 0,
    ...options,
  });
  
  console.log(`📥 Job added to queue: ${jobType}`, {
    jobId: job.id,
    priority: options.priority || 5,
  });
  
  return job;
}

/**
 * Get queue statistics
 */
async function getQueueStats() {
  const queue = getMessageQueue();
  
  if (!queue) {
    return null;
  }
  
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
    queue.getDelayedCount(),
  ]);
  
  return {
    waiting,
    active,
    completed,
    failed,
    delayed,
    total: waiting + active + completed + failed + delayed,
  };
}

/**
 * Close queue
 */
async function closeQueue() {
  if (messageQueue) {
    await messageQueue.close();
    messageQueue = null;
    console.log('✅ Message queue closed');
  }
}

module.exports = {
  getMessageQueue,
  addJob,
  getQueueStats,
  closeQueue,
};
```

**Verify:**
```bash
node -e "const q = require('./src/queue/messageQueue'); const queue = q.getMessageQueue(); console.log('Queue:', queue ? 'OK' : 'NULL')"
# Should output: Queue: OK
```

---

**Continue to IMPLEMENTATION_STEPS_PART2.md for Steps 6-10**
