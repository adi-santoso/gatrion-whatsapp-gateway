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
API Request → Session Router → Session Manager
                                    ├─> Session 1 (Client A) → WhatsApp Account A
                                    ├─> Session 2 (Client B) → WhatsApp Account B
                                    └─> Session N (Client N) → WhatsApp Account N
```

### 2.2 Session Data Model

```javascript
{
  id: "session-uuid",              // Unique session ID
  name: "Sales Department",        // Human-readable name
  phone: "628123456789",           // WhatsApp number (after connected)
  status: "connected",             // connected | disconnected | qr_required | connecting
  createdAt: "2026-06-18T10:00:00Z",
  lastConnectedAt: "2026-06-18T10:30:00Z",
  authPath: "./sessions/session-uuid", // Auth storage path
  qrCode: null,                    // Current QR code (if qr_required)
  connectionState: {
    connection: "open",
    lastDisconnect: null,
    qr: null,
  }
}
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
├── src/
│   ├── whatsapp/
│   │   ├── sessionManager.js    # [NEW] Session orchestrator
│   │   ├── clientFactory.js     # [NEW] Create isolated clients
│   │   ├── client.js            # [MODIFY] Use factory pattern
│   │   └── handlers.js          # [MODIFY] Session-aware handlers
│   ├── api/
│   │   └── controllers/
│   │       ├── session.controller.js # [NEW] Session CRUD API
│   │       └── send.controller.js    # [MODIFY] Session routing
│   ├── middleware/
│   │   └── sessionAuth.middleware.js # [NEW] Session validation
│   └── storage/
│       └── sessionStorage.js    # [NEW] Persist session metadata
```

### 2.4 Environment Variables

**Add to `.env.example`:**

```env
# Multi-Session Configuration (Phase 11)
SESSIONS_DIR=./sessions
MAX_SESSIONS=10
DEFAULT_SESSION=
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
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_connected_at DATETIME,
  metadata TEXT
);
```

### 2.6 New API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `GET /api/sessions` | GET | List all sessions |
| `POST /api/sessions` | POST | Create new session |
| `GET /api/sessions/:id` | GET | Get session details |
| `GET /api/sessions/:id/qr` | GET | Get QR for session |
| `GET /api/sessions/:id/status` | GET | Get session status |
| `DELETE /api/sessions/:id` | DELETE | Delete session |
| `POST /api/sessions/:id/logout` | POST | Logout session |

### 2.7 Updated Send Endpoints

**Add `sessionId` parameter (optional, uses default if not provided):**

```javascript
// Before (Phase 1-10)
POST /api/send-text
{
  "to": "628123456789",
  "message": "Hello"
}

// After (Phase 11)
POST /api/send-text
{
  "sessionId": "session-abc123",  // Optional: specify session
  "to": "628123456789",
  "message": "Hello"
}
```

If `sessionId` not provided, uses `DEFAULT_SESSION` from env.

### 2.8 Dependencies

```json
{
  "better-sqlite3": "^9.0.0",
  "uuid": "^9.0.0"
}
```

---

## 3. Implementation Steps

See: [IMPLEMENTATION_STEPS.md](./IMPLEMENTATION_STEPS.md)

---

## 4. Code Standards & Patterns

### 4.1 Session Manager Pattern

```javascript
class SessionManager {
  constructor() {
    this.sessions = new Map(); // sessionId -> BaileysClient
  }
  
  async createSession(name) {
    const id = uuid();
    const authPath = path.join(SESSIONS_DIR, id);
    
    // Create isolated client
    const client = await createWhatsAppClient(id, authPath);
    
    this.sessions.set(id, client);
    
    // Persist metadata
    await sessionStorage.create({ id, name, authPath });
    
    return { id, name, status: 'connecting' };
  }
  
  getSession(id) {
    return this.sessions.get(id);
  }
  
  async deleteSession(id) {
    const client = this.sessions.get(id);
    if (client) {
      await client.logout();
      this.sessions.delete(id);
    }
    
    await sessionStorage.delete(id);
    await fs.rm(path.join(SESSIONS_DIR, id), { recursive: true });
  }
}
```

### 4.2 Client Factory Pattern

```javascript
async function createWhatsAppClient(sessionId, authPath) {
  const { state, saveCreds } = await useMultiFileAuthState(authPath);
  
  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: false, // Disable for multi-session
    browser: ['WhatsApp Gateway', 'Chrome', '1.0.0'],
    logger: pino({ level: 'silent' }),
  });
  
  // Session-specific event handlers
  sock.ev.on('connection.update', (update) => {
    handleConnectionUpdate(sessionId, update);
  });
  
  sock.ev.on('creds.update', saveCreds);
  
  return sock;
}
```

### 4.3 Session Routing Pattern

```javascript
async function sendTextMessage(sessionId, to, message) {
  // Get session or use default
  const sid = sessionId || getDefaultSession();
  
  if (!sid) {
    throw new Error('No session specified and no default session set');
  }
  
  const client = sessionManager.getSession(sid);
  
  if (!client) {
    throw new Error(`Session not found: ${sid}`);
  }
  
  if (client.connectionState !== 'open') {
    throw new Error(`Session not connected: ${sid}`);
  }
  
  // Send via specific session
  return await client.sendMessage(to, { text: message });
}
```

### 4.4 Graceful Degradation

```javascript
// Backward compatibility: single session mode
function getDefaultSession() {
  const envDefault = config.DEFAULT_SESSION;
  
  if (envDefault) {
    return envDefault;
  }
  
  // Auto-select if only one session
  const sessions = sessionManager.listSessions();
  if (sessions.length === 1) {
    return sessions[0].id;
  }
  
  return null;
}
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

**Update webhook payload to include sessionId:**

```javascript
{
  event: "message.received",
  sessionId: "session-abc123",
  sessionName: "Sales Department",
  sessionPhone: "628111222333",
  // ... rest of payload
}
```

### 5.3 Backward Compatibility

**Phase 1-10 behavior preserved:**

- If no `sessionId` in request, uses `DEFAULT_SESSION`
- If `DEFAULT_SESSION` not set, auto-uses first/only session
- Single-session deployments work exactly as before

**Migration path:**

1. Existing deployment continues to work (single session)
2. Set `DEFAULT_SESSION=legacy` in env
3. Existing session becomes "legacy" session
4. Add new sessions as needed

---

## 6. Acceptance Criteria

### Must Have (P0)

- [ ] Create session API works
- [ ] List sessions API works
- [ ] Get session QR works
- [ ] Delete session works
- [ ] Send message with sessionId works
- [ ] Multiple sessions run simultaneously
- [ ] Session isolation (no cross-talk)
- [ ] Webhook includes sessionId
- [ ] Queue jobs include sessionId
- [ ] Backward compatible (single session mode)
- [ ] Tests pass with >80% coverage

### Nice to Have (P1)

- [ ] Session health monitoring
- [ ] Auto-reconnect per session
- [ ] Session logs separated
- [ ] Max sessions limit enforced

---

## 7. Testing Requirements

See: [TESTING_GUIDE.md](./TESTING_GUIDE.md)

---

## 8. Rollback Plan

### Rollback to Single Session

1. Set `MAX_SESSIONS=1` in `.env`
2. Set `DEFAULT_SESSION=<session-id>` to existing session
3. Delete other sessions via API
4. Restart service

### Full Rollback

```bash
git revert <commit-hash>
git push
pm2 restart whatsapp-gateway
```

Old auth folder (`./auth_info_baileys`) still works.

---

**Next:** See [IMPLEMENTATION_STEPS.md](./IMPLEMENTATION_STEPS.md)
