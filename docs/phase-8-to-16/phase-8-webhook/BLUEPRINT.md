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

**NOTE:** Phase 11 introduces per-session webhook configuration stored in database.
Global webhook config is deprecated in favor of per-session webhook URLs.

**Optional Global Defaults (can be overridden per session):**

```env
# Webhook Configuration (Global Defaults - Optional)
WEBHOOK_RETRY_ATTEMPTS=3
WEBHOOK_TIMEOUT=10000
```

**Per-Session Webhook Config (stored in SQLite `sessions` table):**
- `webhook_url` - Per-session webhook URL
- `webhook_secret` - Per-session webhook secret (min 32 chars)
- `webhook_enabled` - Enable/disable per session

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

**Webhook Payload Schema (Multi-Session):**

```javascript
{
  "event": "message.received",
  "sessionId": "session-abc123",         // ← Session identifier
  "sessionName": "Sales Department",     // ← Human-readable name
  "sessionPhone": "628123456789",        // ← WhatsApp number
  "timestamp": "2026-06-18T10:30:00.000Z",
  "messageId": "3EB0ABC123...",
  "from": "628999999999@s.whatsapp.net",
  "fromNumber": "628999999999",
  "fromName": "Customer Name",
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

### 2.4 Webhook Signature (Per-Session Secret)

**HMAC SHA256 signature in header:**

```
x-webhook-signature: sha256=abc123def456...
x-session-id: session-abc123
```

**Calculation (uses session-specific secret):**
```javascript
const crypto = require('crypto');

// Get session webhook config from database
const session = await db.getSession(sessionId);
const webhookSecret = session.webhook_secret;

// Generate signature with session secret
const signature = crypto
  .createHmac('sha256', webhookSecret)
  .update(JSON.stringify(payload))
  .digest('hex');

// Backend verification (per session)
const receivedSig = req.headers['x-webhook-signature'].replace('sha256=', '');
const sessionId = req.headers['x-session-id'];
const session = await db.getSession(sessionId);
const expectedSig = crypto
  .createHmac('sha256', session.webhook_secret)
  .update(JSON.stringify(req.body))
  .digest('hex');

if (receivedSig !== expectedSig) {
  return res.status(401).json({ error: 'Invalid signature' });
}
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

### 5.1 Baileys Event Integration (Multi-Session)

**In `src/whatsapp/sessionManager.js`:**

```javascript
const webhookHandler = require('./webhookHandler');

// Setup event handlers per session
setupEventHandlers(sessionId, sock, saveCreds) {
  sock.ev.on('creds.update', saveCreds);
  sock.ev.on('connection.update', (update) => this.handleConnectionUpdate(sessionId, update));
  
  // Incoming messages with sessionId context
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    
    for (const message of messages) {
      if (message.key.fromMe) continue;
      
      // Get session context
      const session = this.sessions.get(sessionId);
      
      // Send webhook with session info
      await webhookHandler.send(sessionId, message, {
        sessionName: session.name,
        sessionPhone: session.phone,
        webhookUrl: session.webhookUrl,
        webhookSecret: session.webhookSecret,
        webhookEnabled: session.webhookEnabled
      });
    }
  });
}
```
    // Process incoming message
    await webhookHandler.handleIncomingMessage(message);
  }
});
```

### 5.2 Per-Session Webhook Management

**Configure webhook per session:**

```javascript
// Create session with webhook config
POST /api/sessions
{
  "name": "Sales Department",
  "webhookUrl": "https://backend.com/webhook/sales",
  "webhookSecret": "sales-secret-key-min-32-chars",
  "webhookEnabled": true
}

// Update webhook config for existing session
PATCH /api/sessions/:sessionId/webhook
{
  "webhookUrl": "https://new-url.com/webhook",
  "webhookSecret": "new-secret",
  "webhookEnabled": true
}

// Test webhook
POST /api/sessions/:sessionId/webhook/test
// Sends test payload to webhook URL
```

**Webhook Handler Logic:**

```javascript
// src/whatsapp/webhookHandler.js
async function send(sessionId, message, sessionContext) {
  const { webhookUrl, webhookSecret, webhookEnabled } = sessionContext;
  
  // Skip if disabled or no URL
  if (!webhookEnabled || !webhookUrl) {
    console.log(`Webhook disabled for session ${sessionId}`);
    return;
  }
  
  // Build payload
  const payload = {
    event: 'message.received',
    sessionId,
    sessionName: sessionContext.sessionName,
    sessionPhone: sessionContext.sessionPhone,
    timestamp: new Date().toISOString(),
    messageId: message.key.id,
    from: message.key.remoteJid,
    message: extractMessage(message)
  };
  
  // Generate signature with session-specific secret
  const signature = crypto
    .createHmac('sha256', webhookSecret)
    .update(JSON.stringify(payload))
    .digest('hex');
  
  // Send to session-specific webhook URL
  try {
    await axios.post(webhookUrl, payload, {
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': `sha256=${signature}`,
        'X-Session-Id': sessionId
      },
      timeout: 10000
    });
    console.log(`Webhook sent for ${sessionId}`);
  } catch (error) {
    console.error(`Webhook failed for ${sessionId}:`, error.message);
    // Retry logic via Phase 9 queue integration
  }
}
```

---

## 6. Acceptance Criteria

### Must Have (P0)

- [ ] Per-session webhook URL configuration via API
- [ ] Per-session webhook secret (min 32 chars)
- [ ] Webhook enabled/disabled per session
- [ ] Incoming messages forwarded to session-specific webhook URL
- [ ] Webhook payload includes sessionId, sessionName, sessionPhone
- [ ] HMAC signature using session-specific secret
- [ ] Message deduplication (no duplicate webhooks)
- [ ] Webhook failures logged but don't crash session
- [ ] Retry mechanism (3 attempts via Phase 9 queue)
- [ ] Test webhook endpoint works
- [ ] Sessions without webhook config work normally
- [ ] Tests pass with >80% coverage

### Nice to Have (P1)

- [ ] Webhook delivery status tracking per session
- [ ] Webhook history/logs per session
- [ ] Webhook rate limiting per session

### Out of Scope

- Global webhook URL (deprecated in favor of per-session)
- Webhook UI dashboard (Phase 16)
- Webhook analytics (Phase 14)

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
