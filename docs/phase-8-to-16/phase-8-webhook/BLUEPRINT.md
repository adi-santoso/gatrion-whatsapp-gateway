# Phase 8: Webhook (Incoming Messages) - Blueprint

> **Objective:** Enable 2-way communication by forwarding incoming WhatsApp messages to external webhook URL

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

### Current Architecture
```
src/
├── config/
│   └── env.js                    # Environment config
├── whatsapp/
│   ├── client.js                 # Baileys singleton client
│   ├── handlers.js               # Connection event handlers
│   └── utils.js                  # Phone formatting
├── api/
│   ├── routes.js
│   └── controllers/
│       ├── qr.controller.js
│       ├── status.controller.js
│       └── send.controller.js
├── middleware/
│   └── [auth, rateLimit, etc]
└── index.js                      # Express server
```

### Current Behavior
- **Outbound only:** Can send messages, cannot receive
- **No event listeners:** Incoming messages are ignored
- **Baileys events available:** `messages.upsert`, `messages.update`

### What Will Change
- Add webhook dispatcher for incoming messages
- Add event listeners to Baileys client
- Add webhook configuration in `.env`
- Add message deduplication logic
- Add webhook signature verification

---

## 2. Technical Specification

### 2.1 Environment Variables

**Add to `.env.example` and `src/config/env.js`:**

```env
# Webhook Configuration
WEBHOOK_URL=https://your-backend.com/webhook/whatsapp
WEBHOOK_SECRET=your-webhook-secret-key-min-32-chars
WEBHOOK_RETRY_ATTEMPTS=3
WEBHOOK_TIMEOUT=10000
WEBHOOK_ENABLED=true
```

### 2.2 New File Structure

```
src/
├── config/
│   └── env.js                    # [MODIFY] Add webhook config
├── whatsapp/
│   ├── client.js                 # [MODIFY] Add event listeners
│   ├── handlers.js               # [KEEP] Existing
│   ├── utils.js                  # [KEEP] Existing
│   └── webhookHandler.js         # [NEW] Webhook dispatcher
├── utils/
│   ├── validateEnv.js            # [KEEP] Existing
│   ├── webhookClient.js          # [NEW] HTTP client with retry
│   └── messageDeduplicator.js    # [NEW] Prevent duplicate webhooks
├── middleware/
│   └── webhookSignature.js       # [NEW] HMAC signature generator
└── tests/
    └── webhook.test.js           # [NEW] Webhook tests
```

### 2.3 Data Models

**Webhook Payload Schema:**

```javascript
{
  "event": "message.received",
  "timestamp": "2026-06-18T10:30:00.000Z",
  "messageId": "3EB0ABC123...",
  "from": "628123456789@s.whatsapp.net",
  "fromNumber": "628123456789",
  "fromName": "John Doe",
  "isGroup": false,
  "groupId": null,
  "message": {
    "type": "text",           // text | image | video | audio | document
    "text": "Hello!",          // for text messages
    "caption": "Photo caption", // for media with caption
    "media": {                 // for media messages
      "mimetype": "image/jpeg",
      "size": 102400,
      "url": null,             // Not included (security)
      "base64": "data:image/jpeg;base64,..."  // Optional
    }
  },
  "quoted": {                  // If replying to message
    "messageId": "3EB0XYZ...",
    "text": "Original message"
  }
}
```

**Webhook Response Expected:**

```javascript
{
  "success": true,
  "message": "Webhook received"
}
```

### 2.4 Webhook Signature

**HMAC SHA256 signature in header:**

```
x-webhook-signature: sha256=abc123def456...
```

**Calculation:**
```javascript
const crypto = require('crypto');
const signature = crypto
  .createHmac('sha256', WEBHOOK_SECRET)
  .update(JSON.stringify(payload))
  .digest('hex');
```

---

## 3. Implementation Steps

See: [IMPLEMENTATION_STEPS.md](./IMPLEMENTATION_STEPS.md)

---

## 4. Code Standards & Patterns

### 4.1 Error Handling Pattern

```javascript
// Always use try-catch for async operations
async function sendWebhook(payload) {
  try {
    const result = await webhookClient.post(payload);
    logger.info('Webhook sent successfully', { messageId: payload.messageId });
    return result;
  } catch (error) {
    logger.error('Webhook failed', { 
      error: error.message, 
      messageId: payload.messageId 
    });
    // Don't throw - log and continue (webhook failures shouldn't crash app)
  }
}
```

### 4.2 Logging Format

```javascript
// Use structured logging
logger.info('Event description', {
  component: 'webhook',
  action: 'send',
  messageId: 'xxx',
  attempt: 1,
  duration: 250
});
```

### 4.3 Validation Approach

```javascript
// Validate early, fail fast
function validateWebhookConfig() {
  if (!config.WEBHOOK_ENABLED) return false;
  
  if (!config.WEBHOOK_URL || !isValidUrl(config.WEBHOOK_URL)) {
    logger.warn('Invalid WEBHOOK_URL, webhook disabled');
    return false;
  }
  
  if (!config.WEBHOOK_SECRET || config.WEBHOOK_SECRET.length < 32) {
    logger.error('WEBHOOK_SECRET must be at least 32 characters');
    process.exit(1); // Security critical
  }
  
  return true;
}
```

### 4.4 Testing Pattern

```javascript
// Mock external dependencies
jest.mock('axios');
jest.mock('../utils/logger');

describe('Webhook Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  it('should send webhook with correct payload', async () => {
    // Arrange
    const mockMessage = { ... };
    axios.post.mockResolvedValue({ status: 200 });
    
    // Act
    await webhookHandler.process(mockMessage);
    
    // Assert
    expect(axios.post).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ event: 'message.received' }),
      expect.any(Object)
    );
  });
});
```

---

## 5. Integration Points

### 5.1 Baileys Event Integration

**In `src/whatsapp/client.js`:**

```javascript
const webhookHandler = require('./webhookHandler');

// Add event listener after connection
sock.ev.on('messages.upsert', async ({ messages, type }) => {
  if (type !== 'notify') return; // Only process new messages
  
  for (const message of messages) {
    // Ignore own messages
    if (message.key.fromMe) continue;
    
    // Process incoming message
    await webhookHandler.handleIncomingMessage(message);
  }
});
```

### 5.2 Backward Compatibility

- Existing API endpoints unchanged
- Webhook is **opt-in** via `WEBHOOK_ENABLED=true`
- If webhook disabled, incoming messages are simply logged (no action)
- No breaking changes to current functionality

### 5.3 Configuration Migration

**For existing deployments:**

1. Add new env vars to `.env` (optional)
2. Restart service
3. If `WEBHOOK_ENABLED=false` or not set, behaves exactly as before

---

## 6. Acceptance Criteria

### Must Have (P0)

- [ ] Incoming text messages forwarded to webhook URL
- [ ] Incoming image messages forwarded with base64 data
- [ ] Webhook payload matches schema exactly
- [ ] HMAC signature generated correctly
- [ ] Message deduplication works (no duplicate webhooks)
- [ ] Webhook failures logged but don't crash app
- [ ] Retry mechanism works (3 attempts with backoff)
- [ ] Works with `WEBHOOK_ENABLED=false` (no-op)
- [ ] Existing send endpoints still work (no regression)
- [ ] Tests pass with >80% coverage

### Nice to Have (P1)

- [ ] Support video/audio/document in webhook
- [ ] Webhook queue if destination is down
- [ ] Webhook delivery status tracking

### Out of Scope

- Webhook authentication from receiver (they verify signature)
- Webhook UI dashboard (Phase 16)
- Webhook retry dashboard (Phase 14)

---

## 7. Testing Requirements

See: [TESTING_GUIDE.md](./TESTING_GUIDE.md)

---

## 8. Rollback Plan

### If Implementation Fails

**Safe Rollback Steps:**

1. Set `WEBHOOK_ENABLED=false` in `.env`
2. Restart service with `pm2 restart whatsapp-gateway`
3. Service works normally (outbound only)

**If Code Needs Revert:**

```bash
# Revert to before Phase 8
git log --oneline  # Find commit before Phase 8
git revert <commit-hash>
git push
pm2 restart whatsapp-gateway
```

### Safe Stop Points

1. After adding env config (non-breaking)
2. After creating webhook client (not used yet)
3. After adding event listener with `if (WEBHOOK_ENABLED)` check
4. After testing manually with webhook.site

Each stop point is **production safe** - can deploy and continue later.

---

**Next:** See [IMPLEMENTATION_STEPS.md](./IMPLEMENTATION_STEPS.md) for detailed step-by-step instructions.
