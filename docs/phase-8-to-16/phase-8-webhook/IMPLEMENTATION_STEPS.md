# Phase 8: Implementation Steps

> **Step-by-step prescriptive implementation guide for sub-agent**

---

## Pre-Implementation Checklist

- [ ] Read `BLUEPRINT.md` completely
- [ ] Understand current codebase structure
- [ ] Node.js >= 20.0.0 installed
- [ ] Dependencies installed (`npm install`)
- [ ] Service running and tested (`npm run dev`)
- [ ] Git clean (no uncommitted changes)

---

## Step 1: Update Environment Configuration

### 1.1 Modify `.env.example`

**File:** `.env.example`  
**Action:** Add at the end of file

```env
# Webhook Configuration (Phase 8)
WEBHOOK_URL=https://webhook.site/your-unique-url
WEBHOOK_SECRET=your-webhook-secret-key-minimum-32-characters-long
WEBHOOK_RETRY_ATTEMPTS=3
WEBHOOK_TIMEOUT=10000
WEBHOOK_ENABLED=false
```

### 1.2 Modify `src/config/env.js`

**File:** `src/config/env.js`  
**Action:** Add webhook configuration section

**Find this section (near end of file):**
```javascript
module.exports = {
  PORT,
  NODE_ENV,
  API_KEY,
  WA_SESSION_PATH,
  // ... other exports
};
```

**Add BEFORE the module.exports:**

```javascript
// Webhook Configuration
const WEBHOOK_URL = process.env.WEBHOOK_URL || '';
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || '';
const WEBHOOK_RETRY_ATTEMPTS = parseInt(process.env.WEBHOOK_RETRY_ATTEMPTS) || 3;
const WEBHOOK_TIMEOUT = parseInt(process.env.WEBHOOK_TIMEOUT) || 10000;
const WEBHOOK_ENABLED = process.env.WEBHOOK_ENABLED === 'true';

// Validate webhook config if enabled
if (WEBHOOK_ENABLED) {
  if (!WEBHOOK_URL || !WEBHOOK_URL.startsWith('http')) {
    console.error('❌ WEBHOOK_URL must be a valid HTTP/HTTPS URL when WEBHOOK_ENABLED=true');
    process.exit(1);
  }
  
  if (!WEBHOOK_SECRET || WEBHOOK_SECRET.length < 32) {
    console.error('❌ WEBHOOK_SECRET must be at least 32 characters when WEBHOOK_ENABLED=true');
    process.exit(1);
  }
  
  console.log('✅ Webhook enabled:', WEBHOOK_URL);
}
```

**Then UPDATE module.exports to include:**

```javascript
module.exports = {
  PORT,
  NODE_ENV,
  API_KEY,
  WA_SESSION_PATH,
  // Webhook config
  WEBHOOK_URL,
  WEBHOOK_SECRET,
  WEBHOOK_RETRY_ATTEMPTS,
  WEBHOOK_TIMEOUT,
  WEBHOOK_ENABLED,
};
```

**Verification:**
```bash
node -e "console.log(require('./src/config/env.js').WEBHOOK_ENABLED)"
# Should output: false
```

---

## Step 2: Create Webhook Signature Utility

### 2.1 Create `src/middleware/webhookSignature.js`

**File:** `src/middleware/webhookSignature.js` (NEW)  
**Purpose:** Generate HMAC SHA256 signature for webhook payload

```javascript
const crypto = require('crypto');

/**
 * Generate HMAC SHA256 signature for webhook payload
 * @param {Object} payload - JSON payload to sign
 * @param {string} secret - Webhook secret key
 * @returns {string} - Signature in format: sha256=<hex>
 */
function generateSignature(payload, secret) {
  const payloadString = JSON.stringify(payload);
  
  const hmac = crypto
    .createHmac('sha256', secret)
    .update(payloadString)
    .digest('hex');
  
  return `sha256=${hmac}`;
}

/**
 * Verify webhook signature
 * @param {Object} payload - JSON payload
 * @param {string} signature - Signature from header
 * @param {string} secret - Webhook secret key
 * @returns {boolean} - True if valid
 */
function verifySignature(payload, signature, secret) {
  const expectedSignature = generateSignature(payload, secret);
  
  // Timing-safe comparison
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch (error) {
    return false;
  }
}

module.exports = {
  generateSignature,
  verifySignature,
};
```

**Verification:**
```bash
node -e "const s = require('./src/middleware/webhookSignature'); console.log(s.generateSignature({test: 1}, 'secret'))"
# Should output: sha256=<hex string>
```

---

## Step 3: Create Message Deduplicator

### 3.1 Create `src/utils/messageDeduplicator.js`

**File:** `src/utils/messageDeduplicator.js` (NEW)  
**Purpose:** Prevent sending duplicate webhooks for same message

```javascript
/**
 * Message Deduplicator
 * Keeps track of processed message IDs to prevent duplicate webhooks
 * Uses in-memory Set with TTL cleanup
 */

class MessageDeduplicator {
  constructor(ttlMs = 60000) { // 1 minute default TTL
    this.processedMessages = new Map(); // messageId -> timestamp
    this.ttl = ttlMs;
    
    // Cleanup expired entries every 30 seconds
    this.cleanupInterval = setInterval(() => this.cleanup(), 30000);
  }
  
  /**
   * Check if message was already processed
   * @param {string} messageId - WhatsApp message ID
   * @returns {boolean} - True if already processed
   */
  isDuplicate(messageId) {
    return this.processedMessages.has(messageId);
  }
  
  /**
   * Mark message as processed
   * @param {string} messageId - WhatsApp message ID
   */
  markProcessed(messageId) {
    this.processedMessages.set(messageId, Date.now());
  }
  
  /**
   * Cleanup expired entries
   */
  cleanup() {
    const now = Date.now();
    const expired = [];
    
    for (const [messageId, timestamp] of this.processedMessages.entries()) {
      if (now - timestamp > this.ttl) {
        expired.push(messageId);
      }
    }
    
    expired.forEach(id => this.processedMessages.delete(id));
    
    if (expired.length > 0) {
      console.log(`🧹 Cleaned up ${expired.length} expired message IDs`);
    }
  }
  
  /**
   * Clear all tracked messages (for testing)
   */
  clear() {
    this.processedMessages.clear();
  }
  
  /**
   * Stop cleanup interval
   */
  destroy() {
    clearInterval(this.cleanupInterval);
    this.clear();
  }
  
  /**
   * Get current size (for monitoring)
   */
  size() {
    return this.processedMessages.size;
  }
}

// Singleton instance
let instance = null;

function getInstance() {
  if (!instance) {
    instance = new MessageDeduplicator();
  }
  return instance;
}

module.exports = {
  getInstance,
  MessageDeduplicator, // Export class for testing
};
```

**Verification:**
```bash
node -e "const d = require('./src/utils/messageDeduplicator').getInstance(); d.markProcessed('test'); console.log(d.isDuplicate('test'))"
# Should output: true
```

---

## Step 4: Create Webhook HTTP Client

### 4.1 Install axios (if not already installed)

```bash
npm list axios
# If not found:
npm install axios
```

### 4.2 Create `src/utils/webhookClient.js`

**File:** `src/utils/webhookClient.js` (NEW)  
**Purpose:** HTTP client with retry logic and timeout

```javascript
const axios = require('axios');
const config = require('../config/env');
const { generateSignature } = require('../middleware/webhookSignature');

/**
 * Webhook HTTP Client with retry logic
 */
class WebhookClient {
  constructor() {
    this.maxRetries = config.WEBHOOK_RETRY_ATTEMPTS;
    this.timeout = config.WEBHOOK_TIMEOUT;
  }
  
  /**
   * Send webhook with retry logic
   * @param {Object} payload - Webhook payload
   * @returns {Promise<Object>} - Response data
   */
  async send(payload) {
    const url = config.WEBHOOK_URL;
    const signature = generateSignature(payload, config.WEBHOOK_SECRET);
    
    let lastError = null;
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const startTime = Date.now();
        
        const response = await axios.post(url, payload, {
          headers: {
            'Content-Type': 'application/json',
            'x-webhook-signature': signature,
            'User-Agent': 'WhatsApp-Gateway-Webhook/1.0',
          },
          timeout: this.timeout,
        });
        
        const duration = Date.now() - startTime;
        
        console.log(`✅ Webhook sent successfully (attempt ${attempt}/${this.maxRetries}, ${duration}ms)`, {
          messageId: payload.messageId,
          status: response.status,
        });
        
        return response.data;
        
      } catch (error) {
        lastError = error;
        
        const isLastAttempt = attempt === this.maxRetries;
        const willRetry = !isLastAttempt;
        
        console.error(`❌ Webhook failed (attempt ${attempt}/${this.maxRetries})`, {
          messageId: payload.messageId,
          error: error.message,
          code: error.code,
          status: error.response?.status,
          willRetry,
        });
        
        // Don't retry on client errors (4xx)
        if (error.response?.status >= 400 && error.response?.status < 500) {
          console.error('⚠️  Client error (4xx), not retrying');
          throw error;
        }
        
        // Wait before retry (exponential backoff)
        if (willRetry) {
          const backoffMs = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
          console.log(`⏳ Retrying in ${backoffMs}ms...`);
          await this.sleep(backoffMs);
        }
      }
    }
    
    // All retries failed
    throw lastError;
  }
  
  /**
   * Sleep helper
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Singleton instance
let instance = null;

function getInstance() {
  if (!instance) {
    instance = new WebhookClient();
  }
  return instance;
}

module.exports = {
  getInstance,
  WebhookClient, // Export class for testing
};
```

**Verification:**
```bash
node -e "const w = require('./src/utils/webhookClient').getInstance(); console.log(w.maxRetries)"
# Should output: 3
```

---

**Continue to IMPLEMENTATION_STEPS_PART2.md for Steps 5-8**
