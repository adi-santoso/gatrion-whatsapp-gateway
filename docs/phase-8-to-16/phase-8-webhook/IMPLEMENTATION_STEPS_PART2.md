# Phase 8: Implementation Steps - Part 2

> **Continuation from IMPLEMENTATION_STEPS.md**

---

## Step 5: Create Webhook Handler

### 5.1 Create `src/whatsapp/webhookHandler.js`

**File:** `src/whatsapp/webhookHandler.js` (NEW)  
**Purpose:** Main webhook dispatcher - processes incoming messages and sends to webhook

```javascript
const config = require('../config/env');
const webhookClient = require('../utils/webhookClient').getInstance();
const messageDeduplicator = require('../utils/messageDeduplicator').getInstance();

/**
 * Webhook Handler
 * Processes incoming WhatsApp messages and forwards to webhook URL
 */
class WebhookHandler {
  
  /**
   * Handle incoming message from Baileys
   * @param {Object} message - Baileys message object
   */
  async handleIncomingMessage(message) {
    // Check if webhook is enabled
    if (!config.WEBHOOK_ENABLED) {
      return; // Silent no-op
    }
    
    try {
      // Extract message ID
      const messageId = message.key.id;
      
      // Check for duplicate
      if (messageDeduplicator.isDuplicate(messageId)) {
        console.log('⏭️  Duplicate message ignored:', messageId);
        return;
      }
      
      // Build webhook payload
      const payload = this.buildPayload(message);
      
      // Send to webhook
      await webhookClient.send(payload);
      
      // Mark as processed
      messageDeduplicator.markProcessed(messageId);
      
    } catch (error) {
      console.error('❌ Webhook handler error:', {
        error: error.message,
        messageId: message.key?.id,
      });
      
      // Don't throw - webhook failures shouldn't crash the app
      // Failures are logged for monitoring
    }
  }
  
  /**
   * Build webhook payload from Baileys message
   * @param {Object} message - Baileys message object
   * @returns {Object} - Webhook payload
   */
  buildPayload(message) {
    const messageId = message.key.id;
    const from = message.key.remoteJid;
    const fromNumber = from.replace('@s.whatsapp.net', '').replace('@g.us', '');
    const isGroup = from.endsWith('@g.us');
    const timestamp = new Date(message.messageTimestamp * 1000).toISOString();
    
    // Extract sender name
    const fromName = message.pushName || fromNumber;
    
    // Build base payload
    const payload = {
      event: 'message.received',
      timestamp,
      messageId,
      from,
      fromNumber,
      fromName,
      isGroup,
      groupId: isGroup ? from : null,
    };
    
    // Extract message content
    const messageContent = this.extractMessageContent(message);
    payload.message = messageContent;
    
    // Extract quoted message if exists
    if (message.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
      payload.quoted = this.extractQuotedMessage(message);
    }
    
    return payload;
  }
  
  /**
   * Extract message content based on type
   * @param {Object} message - Baileys message
   * @returns {Object} - Normalized message content
   */
  extractMessageContent(message) {
    const msg = message.message;
    
    if (!msg) {
      return { type: 'unknown', text: null };
    }
    
    // Text message
    if (msg.conversation) {
      return {
        type: 'text',
        text: msg.conversation,
      };
    }
    
    // Extended text (with mentions, links, etc)
    if (msg.extendedTextMessage) {
      return {
        type: 'text',
        text: msg.extendedTextMessage.text,
      };
    }
    
    // Image message
    if (msg.imageMessage) {
      return {
        type: 'image',
        caption: msg.imageMessage.caption || null,
        media: {
          mimetype: msg.imageMessage.mimetype,
          size: msg.imageMessage.fileLength,
          // Don't include actual media data for security/size reasons
          // Receiver can use messageId to download if needed
        },
      };
    }
    
    // Video message
    if (msg.videoMessage) {
      return {
        type: 'video',
        caption: msg.videoMessage.caption || null,
        media: {
          mimetype: msg.videoMessage.mimetype,
          size: msg.videoMessage.fileLength,
        },
      };
    }
    
    // Audio message
    if (msg.audioMessage) {
      return {
        type: 'audio',
        media: {
          mimetype: msg.audioMessage.mimetype,
          size: msg.audioMessage.fileLength,
          duration: msg.audioMessage.seconds,
        },
      };
    }
    
    // Document message
    if (msg.documentMessage) {
      return {
        type: 'document',
        caption: msg.documentMessage.caption || null,
        media: {
          mimetype: msg.documentMessage.mimetype,
          size: msg.documentMessage.fileLength,
          filename: msg.documentMessage.fileName,
        },
      };
    }
    
    // Sticker
    if (msg.stickerMessage) {
      return {
        type: 'sticker',
        media: {
          mimetype: msg.stickerMessage.mimetype,
        },
      };
    }
    
    // Location
    if (msg.locationMessage) {
      return {
        type: 'location',
        location: {
          latitude: msg.locationMessage.degreesLatitude,
          longitude: msg.locationMessage.degreesLongitude,
          address: msg.locationMessage.address || null,
          name: msg.locationMessage.name || null,
        },
      };
    }
    
    // Contact
    if (msg.contactMessage) {
      return {
        type: 'contact',
        contact: {
          displayName: msg.contactMessage.displayName,
          vcard: msg.contactMessage.vcard,
        },
      };
    }
    
    // Unknown message type
    return {
      type: 'unknown',
      text: null,
    };
  }
  
  /**
   * Extract quoted (replied-to) message
   * @param {Object} message - Baileys message
   * @returns {Object} - Quoted message info
   */
  extractQuotedMessage(message) {
    const contextInfo = message.message?.extendedTextMessage?.contextInfo;
    
    if (!contextInfo?.quotedMessage) {
      return null;
    }
    
    const quotedMsg = contextInfo.quotedMessage;
    
    return {
      messageId: contextInfo.stanzaId,
      participant: contextInfo.participant,
      text: quotedMsg.conversation || quotedMsg.extendedTextMessage?.text || null,
    };
  }
}

// Singleton instance
let instance = null;

function getInstance() {
  if (!instance) {
    instance = new WebhookHandler();
  }
  return instance;
}

module.exports = {
  getInstance,
  WebhookHandler, // Export class for testing
};
```

**Verification:**
```bash
node -e "const w = require('./src/whatsapp/webhookHandler').getInstance(); console.log(typeof w.handleIncomingMessage)"
# Should output: function
```

---

## Step 6: Integrate Webhook with Baileys Client

### 6.1 Modify `src/whatsapp/client.js`

**File:** `src/whatsapp/client.js`  
**Action:** Add event listener for incoming messages

**Find this section (look for event handlers setup):**

```javascript
// Example: somewhere after makeWASocket()
sock.ev.on('connection.update', (update) => {
  // ... existing code
});
```

**Add AFTER existing event handlers:**

```javascript
// Webhook: Handle incoming messages (Phase 8)
const config = require('../config/env');
const webhookHandler = require('./webhookHandler').getInstance();

sock.ev.on('messages.upsert', async ({ messages, type }) => {
  // Only process 'notify' type (new incoming messages)
  if (type !== 'notify') return;
  
  for (const message of messages) {
    // Ignore own messages (sent by this account)
    if (message.key.fromMe) continue;
    
    // Log incoming message
    const from = message.key.remoteJid;
    const msgType = Object.keys(message.message || {})[0] || 'unknown';
    
    console.log('📥 Incoming message:', {
      from,
      type: msgType,
      messageId: message.key.id,
    });
    
    // Forward to webhook (if enabled)
    if (config.WEBHOOK_ENABLED) {
      await webhookHandler.handleIncomingMessage(message);
    }
  }
});
```

**Verification:**
- Code compiles without errors
- Service starts without issues: `npm run dev`

---

## Step 7: Update Documentation

### 7.1 Add Webhook Section to Main README

**File:** `README.md`  
**Action:** Add webhook documentation section

**Find the section:** `## API Endpoints`

**Add NEW section BEFORE it:**

```markdown
---

## Webhook (Incoming Messages)

### Overview

WhatsApp Gateway dapat mengirim incoming messages ke webhook URL eksternal untuk mendukung 2-way communication (chatbot, auto-reply, OTP verification, etc).

### Configuration

**Enable webhook di `.env`:**

```env
WEBHOOK_ENABLED=true
WEBHOOK_URL=https://your-backend.com/webhook/whatsapp
WEBHOOK_SECRET=your-webhook-secret-key-minimum-32-characters-long
WEBHOOK_RETRY_ATTEMPTS=3
WEBHOOK_TIMEOUT=10000
```

**Generate secure webhook secret:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Webhook Payload

**Request yang dikirim ke webhook URL:**

```json
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
    "type": "text",
    "text": "Hello!"
  }
}
```

**Webhook endpoint harus return:**

```json
{
  "success": true,
  "message": "Webhook received"
}
```

### Security

**Verify HMAC signature:**

Header: `x-webhook-signature: sha256=<hex>`

```javascript
const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const expectedSignature = 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}
```

### Message Types Supported

- **text** - Plain text messages
- **image** - Images with optional caption
- **video** - Videos with optional caption
- **audio** - Audio messages / voice notes
- **document** - Documents (PDF, DOCX, etc)
- **location** - Location sharing
- **contact** - Contact card
- **sticker** - Stickers

### Retry Logic

- **Max attempts:** 3 (configurable)
- **Backoff:** Exponential (1s, 2s, 4s)
- **Timeout:** 10 seconds per attempt
- **4xx errors:** No retry (client error)
- **5xx errors:** Retry with backoff

### Testing Webhook

**Use webhook.site for testing:**

1. Go to https://webhook.site
2. Copy your unique URL
3. Set `WEBHOOK_URL=https://webhook.site/<your-id>`
4. Set `WEBHOOK_ENABLED=true`
5. Restart service
6. Send message to WhatsApp number
7. See incoming webhook on webhook.site

---
```

### 7.2 Create Phase 8 Completion Report

**File:** `docs/phase-8-to-16/phase-8-webhook/COMPLETION_REPORT.md`  
**(Will be created after testing passes)**

---

## Step 8: Testing

### 8.1 Unit Tests

**Create:** `tests/webhook.test.js`

```javascript
const { WebhookHandler } = require('../src/whatsapp/webhookHandler');
const { MessageDeduplicator } = require('../src/utils/messageDeduplicator');
const { generateSignature, verifySignature } = require('../src/middleware/webhookSignature');

describe('Webhook Handler - Unit Tests', () => {
  
  describe('generateSignature', () => {
    it('should generate valid HMAC signature', () => {
      const payload = { test: 'data' };
      const secret = 'test-secret-key-minimum-32-chars-long';
      
      const signature = generateSignature(payload, secret);
      
      expect(signature).toMatch(/^sha256=[a-f0-9]{64}$/);
    });
    
    it('should generate consistent signatures', () => {
      const payload = { test: 'data' };
      const secret = 'test-secret-key-minimum-32-chars-long';
      
      const sig1 = generateSignature(payload, secret);
      const sig2 = generateSignature(payload, secret);
      
      expect(sig1).toBe(sig2);
    });
  });
  
  describe('verifySignature', () => {
    it('should verify valid signature', () => {
      const payload = { test: 'data' };
      const secret = 'test-secret-key-minimum-32-chars-long';
      
      const signature = generateSignature(payload, secret);
      const isValid = verifySignature(payload, signature, secret);
      
      expect(isValid).toBe(true);
    });
    
    it('should reject invalid signature', () => {
      const payload = { test: 'data' };
      const secret = 'test-secret-key-minimum-32-chars-long';
      
      const isValid = verifySignature(payload, 'sha256=invalid', secret);
      
      expect(isValid).toBe(false);
    });
  });
  
  describe('MessageDeduplicator', () => {
    let deduplicator;
    
    beforeEach(() => {
      deduplicator = new MessageDeduplicator(1000); // 1 second TTL
    });
    
    afterEach(() => {
      deduplicator.destroy();
    });
    
    it('should detect duplicate messages', () => {
      const messageId = 'test-message-123';
      
      expect(deduplicator.isDuplicate(messageId)).toBe(false);
      
      deduplicator.markProcessed(messageId);
      
      expect(deduplicator.isDuplicate(messageId)).toBe(true);
    });
    
    it('should cleanup expired messages', async () => {
      const messageId = 'test-message-456';
      
      deduplicator.markProcessed(messageId);
      expect(deduplicator.size()).toBe(1);
      
      // Wait for expiry
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      deduplicator.cleanup();
      expect(deduplicator.size()).toBe(0);
    });
  });
  
  describe('WebhookHandler.buildPayload', () => {
    let handler;
    
    beforeEach(() => {
      handler = new WebhookHandler();
    });
    
    it('should build payload for text message', () => {
      const mockMessage = {
        key: {
          id: 'msg123',
          remoteJid: '628123456789@s.whatsapp.net',
          fromMe: false,
        },
        messageTimestamp: Math.floor(Date.now() / 1000),
        pushName: 'John Doe',
        message: {
          conversation: 'Hello World',
        },
      };
      
      const payload = handler.buildPayload(mockMessage);
      
      expect(payload.event).toBe('message.received');
      expect(payload.messageId).toBe('msg123');
      expect(payload.fromNumber).toBe('628123456789');
      expect(payload.fromName).toBe('John Doe');
      expect(payload.isGroup).toBe(false);
      expect(payload.message.type).toBe('text');
      expect(payload.message.text).toBe('Hello World');
    });
    
    it('should build payload for group message', () => {
      const mockMessage = {
        key: {
          id: 'msg456',
          remoteJid: '123456789@g.us',
          fromMe: false,
        },
        messageTimestamp: Math.floor(Date.now() / 1000),
        pushName: 'Jane Doe',
        message: {
          conversation: 'Group message',
        },
      };
      
      const payload = handler.buildPayload(mockMessage);
      
      expect(payload.isGroup).toBe(true);
      expect(payload.groupId).toBe('123456789@g.us');
    });
    
    it('should build payload for image message', () => {
      const mockMessage = {
        key: {
          id: 'msg789',
          remoteJid: '628123456789@s.whatsapp.net',
          fromMe: false,
        },
        messageTimestamp: Math.floor(Date.now() / 1000),
        pushName: 'Test User',
        message: {
          imageMessage: {
            caption: 'Check this out!',
            mimetype: 'image/jpeg',
            fileLength: 102400,
          },
        },
      };
      
      const payload = handler.buildPayload(mockMessage);
      
      expect(payload.message.type).toBe('image');
      expect(payload.message.caption).toBe('Check this out!');
      expect(payload.message.media.mimetype).toBe('image/jpeg');
      expect(payload.message.media.size).toBe(102400);
    });
  });
});
```

**Run tests:**
```bash
npm test -- tests/webhook.test.js
```

**Expected:** All tests pass ✅

### 8.2 Integration Test

See: [TESTING_GUIDE.md](./TESTING_GUIDE.md) for manual integration testing steps

---

## Step 9: Commit Changes

### 9.1 Verify All Changes

```bash
# Check status
git status

# Review changes
git diff

# Run all tests
npm test
```

### 9.2 Commit

```bash
git add .
git commit -m "feat(phase-8): implement webhook for incoming messages

- Add webhook configuration in .env
- Add HMAC signature generation & verification
- Add message deduplicator to prevent duplicates
- Add webhook HTTP client with retry logic
- Add webhook handler for incoming messages
- Integrate with Baileys event listeners
- Add comprehensive unit tests
- Update README with webhook documentation

Closes: Phase 8 - Webhook Implementation"

git push origin main
```

---

## Post-Implementation Checklist

- [ ] All files created successfully
- [ ] Code compiles without errors
- [ ] Service starts without issues (`npm run dev`)
- [ ] Unit tests pass (>80% coverage)
- [ ] Manual integration test successful
- [ ] Documentation updated (README.md)
- [ ] Changes committed and pushed
- [ ] No regression (existing endpoints work)
- [ ] Performance acceptable (no memory leaks)

---

**Next:** [TESTING_GUIDE.md](./TESTING_GUIDE.md) - Manual integration testing
