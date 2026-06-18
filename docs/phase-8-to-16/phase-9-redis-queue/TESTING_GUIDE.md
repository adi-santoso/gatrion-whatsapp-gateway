# Phase 9: Testing Guide

> **Manual and automated testing for Redis Queue functionality**

---

## Pre-Testing Setup

### 1. Ensure Redis is Running

```bash
# Docker
docker ps | grep redis

# Local
redis-cli ping
# Should return: PONG
```

### 2. Configure Environment

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

### 3. Start Service

```bash
npm run dev
```

**Expected logs:**
```
✅ Redis enabled: localhost:6379
✅ Redis connected
✅ Message queue initialized
✅ Queue worker started
✅ Server running on port 3000
```

---

## Test Suite 1: Unit Tests

```bash
npm test -- tests/queue.test.js
```

**Expected:**
```
PASS  tests/queue.test.js
  Queue - Unit Tests
    ✓ should add text job to queue (25ms)
    ✓ should add image job to queue (15ms)
    ✓ should get queue stats (10ms)
    ✓ should support priority (12ms)
    ✓ should support delay (8ms)

Test Suites: 1 passed, 1 total
Tests:       5 passed, 5 total
```

---

## Test Suite 2: Integration Tests

### Test Case 1: Send Text with Queue

**Objective:** Verify message added to queue successfully

**Steps:**
```bash
curl -X POST http://localhost:3000/api/send-text \
  -H "x-api-key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{"to":"628123456789","message":"Test with queue"}'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "jobId": "1",
    "to": "628123456789",
    "status": "queued",
    "timestamp": "2026-06-18T10:00:00.000Z"
  }
}
```

**Expected Logs:**
```
📥 Job added to queue: send-text { jobId: '1', priority: 5 }
🔄 Processing job: send-text (1)
✅ Job completed: 1
```

**✅ Pass:** Response has `jobId` and `status: "queued"`

---

### Test Case 2: Queue Stats API

**Objective:** Verify queue stats endpoint works

**Steps:**
```bash
curl -H "x-api-key: your-api-key" \
  http://localhost:3000/api/queue/stats
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "enabled": true,
    "waiting": 0,
    "active": 0,
    "completed": 1,
    "failed": 0,
    "delayed": 0,
    "total": 1
  }
}
```

**✅ Pass:** Stats show correct counts

---

### Test Case 3: Worker Status API

**Objective:** Verify worker is running

**Steps:**
```bash
curl -H "x-api-key: your-api-key" \
  http://localhost:3000/api/queue/worker
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "running": true,
    "concurrency": 5,
    "rateLimit": {
      "max": 20,
      "duration": 60000
    }
  }
}
```

**✅ Pass:** Worker is running with correct config

---

### Test Case 4: Message Persistence (Restart Test)

**Objective:** Verify messages survive restart

**Steps:**

1. **Send 5 messages:**
```bash
for i in {1..5}; do
  curl -X POST http://localhost:3000/api/send-text \
    -H "x-api-key: your-api-key" \
    -H "Content-Type: application/json" \
    -d "{\"to\":\"628123456789\",\"message\":\"Message $i\"}"
  sleep 0.5
done
```

2. **Check queue stats:**
```bash
curl -H "x-api-key: your-api-key" \
  http://localhost:3000/api/queue/stats
```

Note the `completed` count (e.g., 5)

3. **Restart service:**
```bash
pm2 restart whatsapp-gateway
# or Ctrl+C and npm run dev
```

4. **Check stats again:**
```bash
curl -H "x-api-key: your-api-key" \
  http://localhost:3000/api/queue/stats
```

**Expected:** `completed` count preserved (still 5)

**✅ Pass:** Queue data persisted across restart

---

### Test Case 5: Job Retry on Failure

**Objective:** Verify failed jobs are retried

**Steps:**

1. **Stop WhatsApp connection** (disconnect phone temporarily)

2. **Send message:**
```bash
curl -X POST http://localhost:3000/api/send-text \
  -H "x-api-key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{"to":"628123456789","message":"Test retry"}'
```

3. **Check logs:**
```
🔄 Processing job: send-text (1)
❌ Job failed: 1 (WhatsApp not connected)
🔄 Processing job: send-text (1) [Attempt 2/3]
❌ Job failed: 1 (WhatsApp not connected)
🔄 Processing job: send-text (1) [Attempt 3/3]
❌ Job failed: 1 (WhatsApp not connected)
```

4. **Check stats:**
```bash
curl -H "x-api-key: your-api-key" \
  http://localhost:3000/api/queue/stats
```

**Expected:** `failed: 1`

**✅ Pass:** Job retried 3 times before final failure

---

### Test Case 6: Priority Queue

**Objective:** Verify urgent messages processed first

**Steps:**

1. **Add low priority job:**
```bash
# Using Redis CLI to add with low priority
redis-cli
> ZADD bull:whatsapp:messages:wait 10 "job-low-priority"
```

2. **Add urgent priority job (via code or direct queue call)**

3. **Verify urgent processed first** (check logs)

**✅ Pass:** Urgent jobs processed before low priority

---

### Test Case 7: Scheduled Message

**Objective:** Verify delayed messages work

**Steps:**

1. **Add job with 10-second delay:**

Create test script `test-delay.js`:
```javascript
const { addJob } = require('./src/queue/messageQueue');
const { JOB_TYPES } = require('./src/queue/types');

async function test() {
  const job = await addJob(
    JOB_TYPES.SEND_TEXT,
    { to: '628123456789', message: 'Delayed message' },
    { delay: 10000 } // 10 seconds
  );
  
  console.log(`Job ${job.id} scheduled for +10s`);
}

test();
```

```bash
node test-delay.js
```

2. **Check stats immediately:**
```bash
curl -H "x-api-key: your-api-key" \
  http://localhost:3000/api/queue/stats
```

**Expected:** `delayed: 1`, `active: 0`

3. **Wait 11 seconds, check again:**

**Expected:** `delayed: 0`, `completed: +1`

**✅ Pass:** Delayed job processed after delay

---

### Test Case 8: Fallback Mode (Redis Disabled)

**Objective:** Verify service works without Redis

**Steps:**

1. **Stop Redis:**
```bash
docker-compose stop redis
# or: sudo systemctl stop redis
```

2. **Restart service:**
```bash
npm run dev
```

**Expected logs:**
```
⚠️  Redis connection failed, using in-memory queue
⚠️  Redis disabled, worker not started
✅ Server running on port 3000
```

3. **Send message:**
```bash
curl -X POST http://localhost:3000/api/send-text \
  -H "x-api-key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{"to":"628123456789","message":"Fallback test"}'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "messageId": "3EB0ABC...",
    "to": "628123456789@s.whatsapp.net",
    "status": "sent",
    "timestamp": "2026-06-18T10:00:00.000Z"
  }
}
```

**Note:** Response has `messageId` (not `jobId`) and `status: "sent"` (not "queued")

**✅ Pass:** Falls back to direct send (Phase 1-8 behavior)

4. **Restart Redis and service to restore queue mode**

---

### Test Case 9: Rate Limiting

**Objective:** Verify queue respects rate limits

**Steps:**

1. **Send 25 messages rapidly:**
```bash
for i in {1..25}; do
  curl -X POST http://localhost:3000/api/send-text \
    -H "x-api-key: your-api-key" \
    -H "Content-Type: application/json" \
    -d "{\"to\":\"628123456789\",\"message\":\"Bulk $i\"}" &
done
wait
```

2. **Check stats:**
```bash
curl -H "x-api-key: your-api-key" \
  http://localhost:3000/api/queue/stats
```

**Expected:** `waiting` > 0 (rate limited to 20/min)

3. **Wait 60 seconds, check again:**

**Expected:** `waiting` decreased as rate limit window resets

**✅ Pass:** Rate limiting works

---

### Test Case 10: Concurrent Processing

**Objective:** Verify worker processes jobs concurrently

**Steps:**

1. **Add 10 jobs to queue**

2. **Check logs** - should see multiple "Processing job" lines simultaneously

**Expected logs:**
```
🔄 Processing job: send-text (1)
🔄 Processing job: send-text (2)
🔄 Processing job: send-text (3)
🔄 Processing job: send-text (4)
🔄 Processing job: send-text (5)
```

**✅ Pass:** Up to 5 jobs (QUEUE_CONCURRENCY) processed concurrently

---

## Test Suite 3: Redis Monitoring

### Monitor Queue with Redis CLI

```bash
redis-cli

# List all queue keys
KEYS bull:whatsapp:messages:*

# Check waiting jobs count
LLEN bull:whatsapp:messages:wait

# Check active jobs count
LLEN bull:whatsapp:messages:active

# Check completed jobs count
ZCARD bull:whatsapp:messages:completed

# Check failed jobs count
ZCARD bull:whatsapp:messages:failed

# View a job data
HGETALL bull:whatsapp:messages:1
```

---

## Test Suite 4: Performance Tests

### Test: Queue Throughput

**Objective:** Measure messages processed per second

**Steps:**

1. **Send 100 messages:**
```bash
time for i in {1..100}; do
  curl -X POST http://localhost:3000/api/send-text \
    -H "x-api-key: your-api-key" \
    -H "Content-Type: application/json" \
    -d "{\"to\":\"628123456789\",\"message\":\"Perf test $i\"}" > /dev/null 2>&1
done
```

2. **Measure time taken**

**Expected:** <10 seconds for 100 jobs (>10 jobs/sec)

**✅ Pass:** Throughput acceptable

---

## Test Summary Checklist

### Automated Tests
- [ ] Unit tests pass (5/5)
- [ ] No test failures
- [ ] Coverage >80%

### Integration Tests
- [ ] Send text with queue works
- [ ] Queue stats API works
- [ ] Worker status API works
- [ ] Message persistence (restart) works
- [ ] Job retry on failure works
- [ ] Priority queue works
- [ ] Scheduled messages work
- [ ] Fallback mode (Redis disabled) works
- [ ] Rate limiting works
- [ ] Concurrent processing works

### Redis Monitoring
- [ ] Can view queue keys
- [ ] Can check job counts
- [ ] Can inspect job data

### Performance
- [ ] Throughput >10 jobs/sec
- [ ] Memory usage stable

### Regression Tests
- [ ] Send text API works (Phase 3)
- [ ] Send image API works (Phase 4)
- [ ] Webhook works (Phase 8)
- [ ] Existing tests pass

---

## Test Results Template

**Date:** 2026-06-18  
**Environment:** Development  
**Redis Version:** 7.0

| Test Case | Status | Notes |
|-----------|--------|-------|
| Unit Tests | ✅ PASS | 5/5 passed |
| Send with Queue | ✅ PASS | jobId returned |
| Queue Stats | ✅ PASS | Correct counts |
| Worker Status | ✅ PASS | Running |
| Persistence | ✅ PASS | Data survived restart |
| Job Retry | ✅ PASS | 3 attempts |
| Priority Queue | ✅ PASS | Urgent first |
| Scheduled Message | ✅ PASS | Delayed 10s |
| Fallback Mode | ✅ PASS | Works without Redis |
| Rate Limiting | ✅ PASS | 20/min enforced |
| Concurrent Processing | ✅ PASS | 5 concurrent |
| Performance | ✅ PASS | 15 jobs/sec |
| Regression | ✅ PASS | All existing features work |

**Overall Status:** ✅ READY FOR PRODUCTION

---

**Next:** Phase 9 Complete! Ready for Phase 10 (Rich Media)
