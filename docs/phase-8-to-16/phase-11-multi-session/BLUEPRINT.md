# Phase 11: Multi-Device Session - Blueprint

> **Objective:** Support multiple WhatsApp accounts (sessions) running simultaneously with session isolation

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

### Current Implementation (Phase 1-10)

**Architecture:** Single WhatsApp account (singleton pattern)

```javascript
// src/whatsapp/client.js
let sock = null; // Single global instance

function getWhatsAppClient() {
  if (sock) return sock;
  // Create single Baileys client
}
```

**Problems:**
1. **Single Account Only:** Can't manage multiple WhatsApp numbers
2. **No Isolation:** All operations on one account
3. **No Session Management:** Can't list/add/remove sessions
4. **Scaling Limitation:** One instance = one number

### Real-World Use Cases

1. **Multi-Branch Business:** Each branch has own WhatsApp number
2. **Customer Service:** Multiple agents with different numbers
3. **Department Separation:** Sales, Support, Marketing each have own number
4. **Testing:** Production + Staging sessions

### What Will Change

- **Session Manager:** Orchestrates multiple Baileys clients
- **Session Storage:** Isolated auth folders per session
- **Session API:** CRUD operations for sessions
- **Routing:** Route messages to specific session
- **Session Health:** Monitor each session independently

---

## 2. Technical Specification

### 2.1 Architecture

**Before (Single Session):**
```
API Request → Single Baileys Client → WhatsApp
```

**After (Multi-Session):**
```
                    ┌─────────────────┐
                    │   Gateway API   │
                    └────────┬────────┘
                             │
          ┌──────────────────┼──────────────────┐
          │                  │                  │
    ┌─────▼─────┐      ┌─────▼─────┐     ┌─────▼─────┐
    │ Session 1 │      │ Session 2 │     │ Session N │
    │ Sales     │      │ Support   │     │ Marketing │
    │ Connected │      │ QR Ready  │     │ Connected │
    └─────┬─────┘      └─────┬─────┘     └─────┬─────┘
          │                  │                  │
          ▼                  ▼                  ▼
    WhatsApp A         WhatsApp B          WhatsApp N
```

**Session Lifecycle Flow:**
```
1. POST /api/sessions → Create session → Get sessionId
2. WebSocket connect → Listen for QR/status events
3. GET /api/sessions/:id/qr → Display QR
4. User scans QR → Session connected
5. POST /api/send-text (with sessionId) → Send message
```

### 2.2 Session Data Model

**In-Memory (Map):**
```javascript
{
  id: "session-abc123",
  name: "Sales Department",
  phone: "628123456789",           // null until connected
  status: "connected",             // connecting | qr_ready | connected | disconnected
  sock: WASocket,                  // Baileys client instance
  qr: "data:image/png;base64,...", // null if not qr_ready
  createdAt: Date,
  lastConnectedAt: Date,
  webhookUrl: "https://backend.com/webhook/sales",  // Per-session webhook
  webhookSecret: "secret-key",     // Per-session webhook secret
  webhookEnabled: true
}
```

**Database (SQLite):**
```sql
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  status TEXT DEFAULT 'disconnected',
  auth_path TEXT NOT NULL,
  webhook_url TEXT,                -- Per-session webhook URL
  webhook_secret TEXT,             -- Per-session webhook secret
  webhook_enabled INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_connected_at DATETIME
);
```

### 2.3 File Structure

```
project/
├── sessions/                     # Session storage root
│   ├── session-abc123/          # Session 1 auth data
│   │   └── creds.json
│   ├── session-def456/          # Session 2 auth data
│   │   └── creds.json
│   └── session-xyz789/          # Session 3 auth data
│       └── creds.json
├── data/
│   └── sessions.db              # [NEW] SQLite session metadata
├── src/
│   ├── whatsapp/
│   │   ├── sessionManager.js    # [NEW] Session orchestrator (Map-based)
│   │   ├── client.js            # [MODIFY] Use sessionManager
│   │   └── handlers.js          # [MODIFY] Session-aware handlers
│   ├── websocket/
│   │   └── server.js            # [NEW] WebSocket server with room isolation
│   ├── api/
│   │   └── controllers/
│   │       ├── session.controller.js # [NEW] Session CRUD API
│   │       └── send.controller.js    # [MODIFY] Require sessionId (strict)
│   ├── middleware/
│   │   └── sessionValidator.js  # [NEW] Validate sessionId in requests
│   ├── storage/
│   │   └── sessionDb.js         # [NEW] SQLite operations
│   └── utils/
│       └── deduplicator.js      # [NEW] Message deduplication with TTL
```

### 2.4 Environment Variables

**Add to `.env.example`:**

```env
# Multi-Session Configuration (Phase 11)
SESSIONS_DIR=./sessions
MAX_SESSIONS=10
SESSION_DB_PATH=./data/sessions.db

# WebSocket Configuration
WS_PORT=3000
WS_ENABLED=true
```

### 2.5 Session Storage

**Use SQLite for session metadata:**

```sql
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  status TEXT DEFAULT 'disconnected',
  auth_path TEXT NOT NULL,
  webhook_url TEXT,
  webhook_secret TEXT,
  webhook_enabled INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_connected_at DATETIME
);

CREATE INDEX idx_sessions_status ON sessions(status);
CREATE INDEX idx_sessions_phone ON sessions(phone);
```

**Dependencies:**
```json
{
  "better-sqlite3": "^9.0.0",
  "uuid": "^9.0.0",
  "ws": "^8.14.0"
}
```

### 2.6 New API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `POST /api/sessions` | POST | Create new session (returns sessionId) |
| `GET /api/sessions` | GET | List all sessions |
| `GET /api/sessions/:id` | GET | Get session details |
| `GET /api/sessions/:id/qr` | GET | Get QR for session (polling) |
| `GET /api/sessions/:id/status` | GET | Get session connection status |
| `PATCH /api/sessions/:id/webhook` | PATCH | Update webhook config for session |
| `GET /api/sessions/:id/webhook` | GET | Get webhook config |
| `POST /api/sessions/:id/webhook/test` | POST | Test webhook (send test payload) |
| `POST /api/sessions/:id/logout` | POST | Logout session (keep metadata) |
| `DELETE /api/sessions/:id` | DELETE | Delete session (logout + remove) |

**WebSocket Endpoint:**
```
ws://localhost:3000?sessionId=session-abc123
```

### 2.7 Updated Send Endpoints

**`sessionId` is now REQUIRED (strict mode):**

```javascript
// Before (Phase 1-10)
POST /api/send-text
{
  "to": "628123456789",
  "message": "Hello"
}

// After (Phase 11) - sessionId REQUIRED
POST /api/send-text
{
  "sessionId": "session-abc123",  // ← REQUIRED
  "to": "628123456789",
  "message": "Hello"
}

// Error if missing sessionId
{
  "error": "sessionId is required",
  "message": "Create a session first at POST /api/sessions"
}
```

**All send endpoints require `sessionId`:**
- `/api/send-text`
- `/api/send-image`
- `/api/send-video` (Phase 10)
- `/api/send-audio` (Phase 10)
- `/api/send-document` (Phase 10)
- `/api/send-location` (Phase 10)
- `/api/send-contact` (Phase 10)
- `/api/send-sticker` (Phase 10)

### 2.8 WebSocket Events

**Client connects with sessionId:**
```javascript
const ws = new WebSocket('ws://localhost:3000?sessionId=session-abc123');
```

**Server → Client Events:**

```javascript
// 1. QR Code Ready
{
  "event": "qr_ready",
  "sessionId": "session-abc123",
  "qrCode": "data:image/png;base64,iVBORw0KGgo..."
}

// 2. Session Connected
{
  "event": "session_connected",
  "sessionId": "session-abc123",
  "phone": "628123456789",
  "name": "Sales Department"
}

// 3. Session Disconnected
{
  "event": "session_disconnected",
  "sessionId": "session-abc123",
  "reason": "logged_out"
}

// 4. Connection State Change
{
  "event": "connection_update",
  "sessionId": "session-abc123",
  "status": "connecting"  // connecting | qr_ready | connected | disconnected
}

// 5. Incoming Message (Phase 8 integration)
{
  "event": "message_received",
  "sessionId": "session-abc123",
  "from": "628999999999",
  "message": {...}
}

// 6. Message Status Update
{
  "event": "message_status",
  "sessionId": "session-abc123",
  "messageId": "3EB0ABC123...",
  "status": "delivered"  // sent | delivered | read
}
```

---

## 3. Implementation Steps

See: [IMPLEMENTATION_STEPS.md](./IMPLEMENTATION_STEPS.md)

**Key Implementation Patterns from engine-whatsapp Analysis:**

1. ✅ **Race Condition Prevention:** Use initialization lock (Set) to prevent duplicate sessions
2. ✅ **QR Timeout:** Auto-cleanup sessions stuck in `qr_ready` after 60 seconds
3. ✅ **Exponential Backoff:** Reconnection with increasing delays (max 5 attempts)
4. ✅ **Message Deduplication:** Track processed message IDs with TTL cleanup
5. ✅ **Memory Leak Prevention:** Clear event listeners before logout
6. ✅ **Graceful Shutdown:** Close all sessions on SIGTERM/SIGINT

---

## 4. Code Standards & Patterns

### 4.1 Session Manager Pattern (Map-Based)

```javascript
// src/whatsapp/sessionManager.js
import { v4 as uuidv4 } from 'uuid';

class SessionManager {
  constructor() {
    this.sessions = new Map();           // sessionId → SessionData
    this.initializingLock = new Set();   // Prevent race conditions
    this.qrTimeouts = new Map();         // sessionId → timeout handle
    this.reconnectAttempts = new Map();  // sessionId → attempt count
    this.processedMessages = new Map();  // msgId → timestamp (dedup)
  }
  
  async createSession(name, webhookConfig = {}) {
    const sessionId = `session-${uuidv4()}`;
    
    // Race condition prevention
    if (this.initializingLock.has(sessionId)) {
      throw new Error('Session already initializing');
    }
    this.initializingLock.add(sessionId);
    
    try {
      const authPath = `./sessions/${sessionId}`;
      const { state, saveCreds } = await useMultiFileAuthState(authPath);
      
      const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: 'silent' }),
        browser: ['WhatsApp Gateway', 'Chrome', '1.0.0']
      });
      
      // Store in Map
      this.sessions.set(sessionId, {
        id: sessionId,
        name,
        phone: null,
        status: 'connecting',
        sock,
        qr: null,
        createdAt: new Date(),
        lastConnectedAt: null,
        webhookUrl: webhookConfig.url || null,
        webhookSecret: webhookConfig.secret || null,
        webhookEnabled: webhookConfig.enabled !== false
      });
      
      // Setup event handlers
      this.setupEventHandlers(sessionId, sock, saveCreds);
      
      // Save to database
      await db.insertSession({
        id: sessionId,
        name,
        auth_path: authPath,
        webhook_url: webhookConfig.url,
        webhook_secret: webhookConfig.secret,
        webhook_enabled: webhookConfig.enabled !== false
      });
      
      return this.sessions.get(sessionId);
    } finally {
      this.initializingLock.delete(sessionId);
    }
  }
  
  setupEventHandlers(sessionId, sock, saveCreds) {
    sock.ev.on('creds.update', saveCreds);
    sock.ev.on('connection.update', (update) => this.handleConnectionUpdate(sessionId, update));
    sock.ev.on('messages.upsert', (m) => this.handleIncomingMessages(sessionId, m));
  }
}

export const sessionManager = new SessionManager();
```

### 4.2 Connection Handler with Edge Cases

```javascript
handleConnectionUpdate(sessionId, update) {
  const session = this.sessions.get(sessionId);
  if (!session) return;
  
  const { connection, qr, lastDisconnect } = update;
  
  // QR Code Ready
  if (qr) {
    session.qr = qr;
    session.status = 'qr_ready';
    
    // Clear old timeout
    if (this.qrTimeouts.has(sessionId)) {
      clearTimeout(this.qrTimeouts.get(sessionId));
    }
    
    // QR Timeout (60 seconds)
    const timeout = setTimeout(() => {
      const s = this.sessions.get(sessionId);
      if (s?.status === 'qr_ready') {
        console.log(`QR timeout for ${sessionId}`);
        this.deleteSession(sessionId);
      }
    }, 60000);
    this.qrTimeouts.set(sessionId, timeout);
    
    // Emit via WebSocket
    wsServer.emitToSession(sessionId, 'qr_ready', { sessionId, qrCode: qr });
  }
  
  // Connected
  if (connection === 'open') {
    session.status = 'connected';
    session.phone = session.sock.user.id.split(':')[0];
    session.lastConnectedAt = new Date();
    session.qr = null;
    
    // Clear QR timeout
    if (this.qrTimeouts.has(sessionId)) {
      clearTimeout(this.qrTimeouts.get(sessionId));
      this.qrTimeouts.delete(sessionId);
    }
    
    // Reset reconnect attempts
    this.reconnectAttempts.delete(sessionId);
    
    // Update database
    db.updateSession(sessionId, { 
      status: 'connected', 
      phone: session.phone,
      last_connected_at: new Date()
    });
    
    // Emit via WebSocket
    wsServer.emitToSession(sessionId, 'session_connected', {
      sessionId,
      phone: session.phone,
      name: session.name
    });
  }
  
  // Disconnected
  if (connection === 'close') {
    const shouldReconnect = 
      lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
    
    session.status = 'disconnected';
    
    if (shouldReconnect) {
      // Exponential backoff
      const attempts = (this.reconnectAttempts.get(sessionId) || 0) + 1;
      this.reconnectAttempts.set(sessionId, attempts);
      
      if (attempts > 5) {
        console.error(`Max reconnect attempts for ${sessionId}`);
        this.deleteSession(sessionId);
        return;
      }
      
      const delay = Math.min(5000 * attempts, 30000);
      console.log(`Reconnecting ${sessionId} in ${delay}ms (attempt ${attempts})`);
      
      setTimeout(() => this.restoreSession(sessionId), delay);
    } else {
      // Permanent logout
      this.deleteSession(sessionId);
    }
  }
}
```

### 4.3 Session Routing Pattern (Strict Mode)

```javascript
// Middleware: src/middleware/sessionValidator.js
export function validateSession(req, res, next) {
  const sessionId = req.body.sessionId || req.query.sessionId || req.headers['x-session-id'];
  
  // Strict: sessionId is REQUIRED
  if (!sessionId) {
    return res.status(400).json({ 
      error: 'sessionId is required',
      message: 'Create a session first at POST /api/sessions'
    });
  }
  
  // Validate session exists
  const session = sessionManager.getSession(sessionId);
  if (!session) {
    return res.status(404).json({ 
      error: 'Session not found',
      sessionId 
    });
  }
  
  // Validate session is connected
  if (session.status !== 'connected') {
    return res.status(503).json({ 
      error: 'Session not connected',
      sessionId,
      status: session.status,
      message: session.status === 'qr_ready' 
        ? 'Please scan QR code first' 
        : 'Session is not ready'
    });
  }
  
  // Attach to request
  req.session = session;
  req.sessionId = sessionId;
  next();
}

// Apply to all send endpoints
router.post('/send-text', validateSession, sendTextController);
router.post('/send-image', validateSession, sendImageController);
```

### 4.4 Message Deduplication (Prevent Duplicates)

```javascript
// src/utils/deduplicator.js
class MessageDeduplicator {
  constructor() {
    this.processedMessages = new Map(); // msgId → timestamp
    
    // Cleanup every 10 minutes
    setInterval(() => this.cleanup(), 600000);
  }
  
  isDuplicate(messageId) {
    if (this.processedMessages.has(messageId)) {
      const age = Date.now() - this.processedMessages.get(messageId);
      if (age < 300000) { // 5 minutes
        return true; // Duplicate
      }
    }
    
    this.processedMessages.set(messageId, Date.now());
    return false;
  }
  
  cleanup() {
    const cutoff = Date.now() - 600000; // 10 minutes
    for (const [msgId, timestamp] of this.processedMessages.entries()) {
      if (timestamp < cutoff) {
        this.processedMessages.delete(msgId);
      }
    }
    console.log(`Dedup cleanup: ${this.processedMessages.size} entries remaining`);
  }
}

export const deduplicator = new MessageDeduplicator();

// Usage in sessionManager
handleIncomingMessages(sessionId, m) {
  if (m.type !== 'notify') return;
  
  for (const msg of m.messages) {
    const msgId = msg.key.id;
    if (deduplicator.isDuplicate(msgId)) {
      continue; // Skip duplicate
    }
    
    // Process message
    this.processMessage(sessionId, msg);
  }
}
```

### 4.5 Graceful Shutdown

```javascript
// src/index.js
async function gracefulShutdown(signal) {
  console.log(`\n${signal} received, shutting down gracefully...`);
  
  // Stop accepting new requests
  server.close(async () => {
    console.log('HTTP server closed');
    
    // Disconnect all WhatsApp sessions
    const sessions = sessionManager.listSessions();
    console.log(`Closing ${sessions.length} sessions...`);
    
    for (const session of sessions) {
      try {
        console.log(`Closing ${session.id}...`);
        const s = sessionManager.getSession(session.id);
        if (s) {
          s.sock.ev.removeAllListeners(); // Prevent memory leaks
          s.sock.end(undefined);
        }
      } catch (err) {
        console.error(`Error closing ${session.id}:`, err.message);
      }
    }
    
    // Close database
    db.close();
    console.log('Database closed');
    
    process.exit(0);
  });
  
  // Force exit after 30 seconds
  setTimeout(() => {
    console.error('Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
```

---

## 5. Integration Points

### 5.1 Queue Integration (Phase 9)

**Update job data to include sessionId:**

```javascript
await addJob(JOB_TYPES.SEND_TEXT, {
  sessionId: 'session-abc123',
  to: '628123456789',
  message: 'Hello',
});
```

### 5.2 Webhook Integration (Phase 8)

**Per-session webhook configuration:**

```javascript
// Webhook payload now includes session context
{
  event: "message.received",
  sessionId: "session-abc123",
  sessionName: "Sales Department",
  sessionPhone: "628111222333",
  webhookUrl: "https://backend.com/webhook/sales", // Session-specific
  timestamp: "2026-06-18T10:30:00Z",
  messageId: "3EB0ABC123...",
  from: "628999999999",
  message: {...}
}

// Each session can have different webhook URL
// Webhook sent with session-specific secret for signature
```

### 5.3 WebSocket Integration (Phase 16)

**Room-based isolation:**

```javascript
// Client connects with sessionId
const ws = new WebSocket('ws://localhost:3000?sessionId=session-abc123');

// Server isolates events per session
wsServer.on('connection', (socket, req) => {
  const sessionId = new URL(req.url, 'http://localhost').searchParams.get('sessionId');
  
  // Join room for this session
  socket.join(sessionId);
  
  // Only receive events for this session
});

// Emit to specific session room only
wsServer.emitToSession(sessionId, 'qr_ready', { ... });
```

### 5.4 Auto-Restore Sessions on Startup

```javascript
// src/whatsapp/sessionManager.js
async init() {
  console.log('🔄 Restoring sessions from filesystem...');
  
  const sessionsDir = './sessions';
  if (!fs.existsSync(sessionsDir)) {
    fs.mkdirSync(sessionsDir, { recursive: true });
    console.log('✓ Created sessions directory');
    return;
  }
  
  const folders = fs.readdirSync(sessionsDir);
  console.log(`Found ${folders.length} sessions to restore`);
  
  for (const sessionId of folders) {
    try {
      // Load metadata from database
      const metadata = await db.getSession(sessionId);
      if (!metadata) {
        console.log(`⚠️  No metadata for ${sessionId}, skipping`);
        continue;
      }
      
      // Check if session folder corrupted
      const credsPath = `${sessionsDir}/${sessionId}/creds.json`;
      if (!fs.existsSync(credsPath)) {
        console.log(`⚠️  Corrupted session ${sessionId}, cleaning up`);
        fs.rmSync(`${sessionsDir}/${sessionId}`, { recursive: true, force: true });
        continue;
      }
      
      console.log(`📱 Restoring: ${metadata.name} (${sessionId})`);
      await this.restoreSession(sessionId, metadata);
      
      // Throttle to avoid WhatsApp rate limit
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (err) {
      console.error(`❌ Failed to restore ${sessionId}:`, err.message);
    }
  }
  
  console.log(`✓ Restored ${this.sessions.size} sessions`);
}

// Call on server start
// src/index.js
app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  await sessionManager.init(); // Auto-restore all sessions
});
```

---

## 6. Acceptance Criteria

### Must Have (P0)

- [ ] Create session API returns `sessionId`
- [ ] List sessions API works
- [ ] Get session QR works (polling)
- [ ] WebSocket emits QR events (real-time)
- [ ] Delete session works (logout + cleanup)
- [ ] Send message with `sessionId` works (strict validation)
- [ ] Request without `sessionId` returns 400 error
- [ ] Multiple sessions run simultaneously (up to MAX_SESSIONS)
- [ ] Session isolation (no cross-talk between sessions)
- [ ] Per-session webhook URL configuration
- [ ] Webhook payload includes `sessionId`
- [ ] Queue jobs include `sessionId`
- [ ] Auto-restore sessions on server restart
- [ ] QR timeout after 60 seconds
- [ ] Exponential backoff reconnection (max 5 attempts)
- [ ] Message deduplication with TTL cleanup
- [ ] Graceful shutdown closes all sessions
- [ ] Tests pass with >80% coverage

### Nice to Have (P1)

- [ ] Session health monitoring dashboard
- [ ] Webhook test endpoint per session
- [ ] Session logs separated by sessionId
- [ ] Max sessions limit enforced with clear error
- [ ] Session reconnect history tracking

---

## 7. Testing Requirements

See: [TESTING_GUIDE.md](./TESTING_GUIDE.md)

---

## 8. Rollback Plan

### Emergency Rollback

**If multi-session causes critical issues:**

1. Revert to Phase 0-7 commit:
```bash
git revert <phase-11-commit-hash>
git push
pm2 restart whatsapp-gateway
```

2. Single session mode works out-of-box (Phase 0-7 architecture)

### Data Preservation

**Session data is preserved:**
- `./sessions/` folder remains intact
- `./data/sessions.db` can be backed up
- No data loss on rollback (can re-enable multi-session later)

### Migration Back to Single Session

**Not recommended, but possible:**

1. Export one session credentials
2. Copy `./sessions/session-abc123/*` to `./auth_info_baileys/`
3. Rollback code
4. Restart

---

**Phase 11 Blueprint Revision Complete!** ✅

**Next:** Revisi Phase 8, 9, 10, 12-16
