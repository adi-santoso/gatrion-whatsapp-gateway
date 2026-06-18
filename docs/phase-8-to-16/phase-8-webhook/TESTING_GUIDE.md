# Phase 8: Testing Guide

> **Manual and automated testing procedures for webhook functionality**

---

## Pre-Testing Setup

### 1. Setup Webhook Testing Endpoint

**Option A: webhook.site (Recommended for testing)**

1. Go to https://webhook.site
2. Copy your unique URL (e.g., `https://webhook.site/abc-123-xyz`)
3. Keep the page open to see incoming webhooks in real-time

**Option B: Local test server**

Create `test-webhook-server.js`:

```javascript
const express = require('express');
const crypto = require('crypto');

const app = express();
app.use(express.json());

const WEBHOOK_SECRET = 'your-webhook-secret-key-minimum-32-characters-long';

app.post('/webhook/whatsapp', (req, res) => {
  console.log('\n📨 Webhook received:');
  console.log(JSON.stringify(req.body, null, 2));
  
  // Verify signature
  const signature = req.headers['x-webhook-signature'];
  const expectedSignature = 'sha256=' + crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(JSON.stringify(req.body))
    .digest('hex');
  
  if (signature === expectedSignature) {
    console.log('✅ Signature valid');
  } else {
    console.log('❌ Signature invalid');
  }
  
  res.json({ success: true, message: 'Webhook received' });
});

app.listen(3001, () => {
  console.log('🎯 Test webhook server running on http://localhost:3001');
  console.log('📍 Endpoint: http://localhost:3001/webhook/whatsapp');
});
```

Run: `node test-webhook-server.js`

### 2. Configure Environment

**Update `.env`:**

```env
# For webhook.site
WEBHOOK_ENABLED=true
WEBHOOK_URL=https://webhook.site/your-unique-id
WEBHOOK_SECRET=your-webhook-secret-key-minimum-32-characters-long
WEBHOOK_RETRY_ATTEMPTS=3
WEBHOOK_TIMEOUT=10000

# For local test server
# WEBHOOK_URL=http://localhost:3001/webhook/whatsapp
```

### 3. Generate Webhook Secret

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy output to `WEBHOOK_SECRET` in `.env`

---

## Test Suite 1: Unit Tests

### Run Automated Tests

```bash
# Run all tests
npm test

# Run only webhook tests
npm test -- tests/webhook.test.js

# Run with coverage
npm test -- --coverage tests/webhook.test.js
```

### Expected Results

```
PASS  tests/webhook.test.js
  Webhook Handler - Unit Tests
    generateSignature
      ✓ should generate valid HMAC signature (5ms)
      ✓ should generate consistent signatures (2ms)
    verifySignature
      ✓ should verify valid signature (3ms)
      ✓ should reject invalid signature (2ms)
    MessageDeduplicator
      ✓ should detect duplicate messages (3ms)
      ✓ should cleanup expired messages (1105ms)
    WebhookHandler.buildPayload
      ✓ should build payload for text message (4ms)
      ✓ should build payload for group message (2ms)
      ✓ should build payload for image message (3ms)

Test Suites: 1 passed, 1 total
Tests:       9 passed, 9 total
Coverage:    >80%
```

**✅ Pass Criteria:** All tests pass, coverage >80%

---

## Test Suite 2: Integration Tests

### Test Case 1: Text Message Webhook

**Objective:** Verify text message forwarded to webhook

**Steps:**
1. Start service: `npm run dev`
2. Ensure WhatsApp connected (QR scanned)
3. Send text message from your phone to WhatsApp number
4. Check webhook.site or test server logs

**Expected Webhook Payload:**
```json
{
  "event": "message.received",
  "timestamp": "2026-06-18T10:30:00.000Z",
  "messageId": "3EB0ABC123...",
  "from": "628123456789@s.whatsapp.net",
  "fromNumber": "628123456789",
  "fromName": "Your Name",
  "isGroup": false,
  "groupId": null,
  "message": {
    "type": "text",
    "text": "Your message text"
  }
}
```

**Expected Logs:**
```
📥 Incoming message: { from: '628123456789@s.whatsapp.net', type: 'conversation', messageId: '3EB0...' }
✅ Webhook sent successfully (attempt 1/3, 250ms) { messageId: '3EB0...' }
```

**✅ Pass:** Webhook received with correct payload

---

### Test Case 2: Image Message Webhook

**Objective:** Verify image message forwarded to webhook

**Steps:**
1. Send image with caption from your phone to WhatsApp number
2. Check webhook.site

**Expected Payload:**
```json
{
  "event": "message.received",
  ...
  "message": {
    "type": "image",
    "caption": "Your caption",
    "media": {
      "mimetype": "image/jpeg",
      "size": 102400
    }
  }
}
```

**✅ Pass:** Webhook received with type "image" and media info

---

### Test Case 3: Duplicate Message Prevention

**Objective:** Verify same message not sent twice to webhook

**Steps:**
1. Note current webhook count on webhook.site
2. Send message from phone
3. Wait 5 seconds
4. Restart service: `pm2 restart whatsapp-gateway` or Ctrl+C and `npm run dev`
5. Wait for reconnection
6. Check webhook.site

**Expected:**
- First message: Webhook sent ✅
- After restart: No duplicate webhook

**Expected Logs:**
```
⏭️  Duplicate message ignored: 3EB0ABC123...
```

**✅ Pass:** No duplicate webhook sent

---

### Test Case 4: Group Message Webhook

**Objective:** Verify group messages forwarded correctly

**Steps:**
1. Add WhatsApp number to a test group
2. Send message in group from another account
3. Check webhook.site

**Expected Payload:**
```json
{
  "event": "message.received",
  ...
  "isGroup": true,
  "groupId": "123456789@g.us",
  "message": {
    "type": "text",
    "text": "Group message"
  }
}
```

**✅ Pass:** `isGroup: true` and `groupId` present

---

### Test Case 5: Webhook Signature Verification

**Objective:** Verify HMAC signature is correct

**Steps:**
1. Check webhook.site request headers
2. Find `x-webhook-signature` header
3. Verify signature manually or use test script

**Test Script:**
```javascript
const crypto = require('crypto');

const payload = { /* copy from webhook.site */ };
const signature = 'sha256=...'; // from header
const secret = 'your-webhook-secret-key-minimum-32-characters-long';

const expectedSignature = 'sha256=' + crypto
  .createHmac('sha256', secret)
  .update(JSON.stringify(payload))
  .digest('hex');

console.log('Received:', signature);
console.log('Expected:', expectedSignature);
console.log('Valid:', signature === expectedSignature);
```

**✅ Pass:** Signatures match

---

### Test Case 6: Webhook Retry on Failure

**Objective:** Verify retry logic works

**Steps:**
1. Set `WEBHOOK_URL=http://localhost:9999/webhook` (non-existent server)
2. Restart service
3. Send message from phone
4. Check logs

**Expected Logs:**
```
❌ Webhook failed (attempt 1/3) { messageId: '...', error: 'connect ECONNREFUSED', willRetry: true }
⏳ Retrying in 1000ms...
❌ Webhook failed (attempt 2/3) { messageId: '...', error: 'connect ECONNREFUSED', willRetry: true }
⏳ Retrying in 2000ms...
❌ Webhook failed (attempt 3/3) { messageId: '...', error: 'connect ECONNREFUSED', willRetry: false }
```

**✅ Pass:** 3 attempts with exponential backoff

---

### Test Case 7: Webhook Disabled Mode

**Objective:** Verify service works normally when webhook disabled

**Steps:**
1. Set `WEBHOOK_ENABLED=false` in `.env`
2. Restart service
3. Send message via API: `POST /api/send-text`
4. Send message from phone to WhatsApp number
5. Check webhook.site (should not receive anything)

**Expected:**
- API send works normally ✅
- No webhook sent for incoming message ✅
- No errors in logs ✅

**✅ Pass:** Existing functionality unaffected

---

### Test Case 8: Performance Test

**Objective:** Verify webhook doesn't slow down message processing

**Steps:**
1. Enable webhook with webhook.site
2. Send 10 messages rapidly from phone
3. Measure time for all webhooks to arrive
4. Check memory usage

**Expected:**
- All 10 webhooks arrive within 30 seconds
- No duplicate webhooks
- Memory usage stable (<200MB)
- No errors

**✅ Pass:** Performance acceptable

---

## Test Suite 3: Edge Cases

### Edge Case 1: Invalid Webhook URL

**Setup:**
```env
WEBHOOK_URL=invalid-url-not-http
```

**Expected:** Service fails to start with error:
```
❌ WEBHOOK_URL must be a valid HTTP/HTTPS URL when WEBHOOK_ENABLED=true
```

**✅ Pass:** Validation catches invalid URL

---

### Edge Case 2: Short Webhook Secret

**Setup:**
```env
WEBHOOK_SECRET=short
```

**Expected:** Service fails to start with error:
```
❌ WEBHOOK_SECRET must be at least 32 characters when WEBHOOK_ENABLED=true
```

**✅ Pass:** Validation catches weak secret

---

### Edge Case 3: Webhook Returns 4xx Error

**Setup:** Configure webhook endpoint to return 400

**Expected Logs:**
```
❌ Webhook failed (attempt 1/3) { status: 400, willRetry: false }
⚠️  Client error (4xx), not retrying
```

**✅ Pass:** No retry on 4xx (client error)

---

### Edge Case 4: Webhook Timeout

**Setup:** Configure webhook endpoint with 15-second delay

**Expected Logs:**
```
❌ Webhook failed (attempt 1/3) { error: 'timeout of 10000ms exceeded', willRetry: true }
```

**✅ Pass:** Timeout after 10 seconds, retry

---

### Edge Case 5: Message Without Content

**Setup:** Receive system message or deleted message

**Expected:** Webhook with `type: "unknown"`

**✅ Pass:** Handled gracefully, no crash

---

## Test Suite 4: Regression Tests

### Regression 1: Send Text API

```bash
curl -X POST http://localhost:3000/api/send-text \
  -H "x-api-key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{"to":"628123456789","message":"Test"}'
```

**✅ Pass:** Still works as before

---

### Regression 2: Send Image API

```bash
curl -X POST http://localhost:3000/api/send-image \
  -H "x-api-key: your-api-key" \
  -F "image=@test.jpg" \
  -F "to=628123456789"
```

**✅ Pass:** Still works as before

---

### Regression 3: QR Code API

```bash
curl -H "x-api-key: your-api-key" http://localhost:3000/api/qr
```

**✅ Pass:** Still works as before

---

## Test Summary Checklist

### Automated Tests
- [ ] All unit tests pass
- [ ] Test coverage >80%
- [ ] No test failures

### Integration Tests
- [ ] Text message webhook works
- [ ] Image message webhook works
- [ ] Duplicate prevention works
- [ ] Group message webhook works
- [ ] Signature verification correct
- [ ] Retry logic works
- [ ] Disabled mode works
- [ ] Performance acceptable

### Edge Cases
- [ ] Invalid URL validation
- [ ] Short secret validation
- [ ] 4xx error handling
- [ ] Timeout handling
- [ ] Unknown message handling

### Regression Tests
- [ ] Send text API works
- [ ] Send image API works
- [ ] QR code API works
- [ ] Status API works
- [ ] Health check works

### Production Readiness
- [ ] No memory leaks (check with `pm2 monit`)
- [ ] No error spam in logs
- [ ] Service starts cleanly
- [ ] Service restarts cleanly
- [ ] Graceful shutdown works

---

## Test Results Template

**Date:** 2026-06-18  
**Tester:** [Your Name]  
**Environment:** Development / Staging / Production

| Test Case | Status | Notes |
|-----------|--------|-------|
| Unit Tests | ✅ PASS | 9/9 passed |
| Text Webhook | ✅ PASS | Payload correct |
| Image Webhook | ✅ PASS | Media info included |
| Duplicate Prevention | ✅ PASS | No duplicates |
| Group Webhook | ✅ PASS | isGroup true |
| Signature Verification | ✅ PASS | HMAC correct |
| Retry Logic | ✅ PASS | 3 attempts |
| Disabled Mode | ✅ PASS | No impact |
| Performance | ✅ PASS | <2s per webhook |
| Regression | ✅ PASS | All APIs work |

**Overall Status:** ✅ READY FOR PRODUCTION

**Blockers:** None

**Notes:**
- All tests passed successfully
- No regressions detected
- Performance within acceptable range
- Ready to deploy

---

**Next:** [COMPLETION_REPORT.md](./COMPLETION_REPORT.md) - Phase 8 completion summary
