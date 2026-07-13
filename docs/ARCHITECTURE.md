# Architecture Documentation

WhatsApp Gateway architecture and design patterns.

## Table of Contents

- [System Overview](#system-overview)
- [Architecture Diagram](#architecture-diagram)
- [Core Components](#core-components)
- [Data Flow](#data-flow)
- [Socket.IO Integration](#socketio-integration)
- [Design Patterns](#design-patterns)
- [Scalability](#scalability)

---

## System Overview

WhatsApp Gateway is a multi-session Node.js application that bridges WhatsApp Web (via Baileys) with external applications through HTTP REST API and Socket.IO real-time events.

### Key Features

1. **Multi-session Support** - Run multiple WhatsApp numbers on one server
2. **Dual Interface** - HTTP REST API + Socket.IO WebSocket
3. **Real-time Events** - Bidirectional communication via Socket.IO
4. **Queue System** - Redis-based message queue (optional)
5. **Webhook Integration** - HMAC-secured webhooks for external systems
6. **Session Persistence** - SQLite database for session management

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        External Applications                     │
│  (Chatbots, AI Assistants, CRM, Analytics, etc.)                │
└─────────────────────────────────────────────────────────────────┘
                      ▲                        ▲
                      │ HTTP REST API          │ Socket.IO
                      │                        │ Real-time Events
                      ▼                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                       WhatsApp Gateway                           │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  API Layer (Express.js)                                  │   │
│  │  - Session Management                                    │   │
│  │  - Messaging Endpoints                                   │   │
│  │  - Group Management                                      │   │
│  │  - Templates & Bulk                                      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  WebSocket Server (Socket.IO)                           │   │
│  │  - Real-time Events                                      │   │
│  │  - Room-based Routing                                    │   │
│  │  - Bidirectional Messaging                               │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Session Manager                                         │   │
│  │  - WhatsApp Connection Management                        │   │
│  │  - Multi-session Orchestration                           │   │
│  │  - Event Handling & Routing                              │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Baileys Library (WhatsApp Web API)                     │   │
│  │  - WebSocket Connection to WhatsApp                      │   │
│  │  - Message Encoding/Decoding                             │   │
│  │  - Media Handling                                        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │  SQLite DB   │  │  Redis Queue │  │  File Storage│         │
│  │  (Sessions)  │  │  (Messages)  │  │  (Media/Auth)│         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      WhatsApp Servers                            │
└─────────────────────────────────────────────────────────────────┘
```

---

## Core Components

### 1. API Layer (`src/api/`)

Express.js HTTP REST API for session management and messaging.

**Responsibilities:**
- Authentication & authorization (API key)
- Request validation
- Route handling
- Response formatting
- Error handling

**Key Files:**
- `routes.js` - API route definitions
- `controllers/` - Business logic handlers
- `middleware/` - Authentication, error handling

---

### 2. WebSocket Server (`src/websocket/server.js`)

Socket.IO server for real-time bidirectional communication.

**Responsibilities:**
- Client connection management
- Room-based message routing
- Event emission (Gateway → Client)
- Event listening (Client → Gateway)
- Session Manager integration

**Key Features:**
- Pure WebSocket transport (no polling)
- Automatic reconnection
- Room isolation per session
- Connection error handling

**Event Protocol:**
```javascript
// Incoming (Gateway → Client)
- whatsapp:message    // New WhatsApp message
- qr_ready            // QR code generated
- session_connected   // Session connected
- session_disconnected // Session disconnected

// Outgoing (Client → Gateway)
- send:message        // Send WhatsApp message
- join-session        // Join session room
- leave-session       // Leave session room

// Confirmations
- message:sent        // Message sent successfully
- message:error       // Error sending message
- joined-session      // Confirmed room join
```

---

### 3. Session Manager (`src/whatsapp/sessionManager.js`)

Manages multiple WhatsApp sessions and Baileys connections.

**Responsibilities:**
- Session lifecycle (create, connect, disconnect, delete)
- WhatsApp event handling (messages, status, QR)
- Multi-session orchestration
- WebSocket integration
- Webhook delivery
- Message deduplication

**Key Features:**
- Race condition prevention (initialization locks)
- QR timeout & regeneration (60s)
- Exponential backoff (max 5 reconnect attempts)
- Message deduplication (TTL-based)
- Per-session webhook config

**Session Object Structure:**
```javascript
{
  id: 'session-xxx',
  name: 'Session Name',
  phone: '628123456789',
  status: 'connected',  // connecting, qr_ready, connected, disconnected
  sock: BaileysSocket,
  qr: 'data:image/png;base64,...',
  webhookUrl: 'https://...',
  webhookSecret: 'xxx',
  webhookEnabled: true,
  reconnectAttempts: 0,
  createdAt: Date,
  lastConnectedAt: Date
}
```

---

### 4. Baileys Integration (`src/whatsapp/`)

WhatsApp Web API client library.

**Responsibilities:**
- WebSocket connection to WhatsApp servers
- Message encoding/decoding
- Media file handling
- Authentication state management
- Protocol implementation

**Key Features:**
- Multi-file auth state (encrypted credentials)
- Automatic reconnection
- Message queueing
- Binary protocol support

---

### 5. Storage Layer

#### SQLite Database (`src/storage/sessionDb.js`)

Persistent session storage.

**Schema:**
```sql
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  name TEXT,
  phone TEXT,
  status TEXT,
  auth_path TEXT,
  webhook_url TEXT,
  webhook_secret TEXT,
  webhook_enabled INTEGER,
  created_at DATETIME,
  last_connected_at DATETIME
);
```

**Responsibilities:**
- Session metadata persistence
- Status tracking
- Webhook config storage
- Session restoration on restart

#### Redis Queue (`src/queue/`)

Optional message queue system.

**Responsibilities:**
- Message queueing
- Rate limiting
- Retry mechanism
- Job tracking

**Queue Flow:**
```
HTTP Request → Queue Job → Worker → Baileys → WhatsApp
```

#### File Storage (`sessions/`, `public/`)

Local file system storage.

**Structure:**
```
sessions/
├── session-abc123/
│   ├── creds.json           # Encrypted auth
│   ├── app-state-sync-*.json
│   └── ...
public/
└── media/
    ├── images/
    ├── videos/
    └── documents/
```

---

## Data Flow

### 1. Outgoing Message Flow (Client → WhatsApp)

```
┌──────────────┐
│ HTTP Request │ POST /api/send-text
│ or           │ OR
│ Socket.IO    │ socket.emit('send:message', ...)
└──────┬───────┘
       │
       ▼
┌──────────────────┐
│ API Layer /      │ Validate request
│ WebSocket Server │ Check authentication
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│ Session Manager  │ Get session
│                  │ Check if connected
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│ Baileys          │ Encode message
│                  │ Send to WhatsApp
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│ WhatsApp Servers │
└──────────────────┘
```

### 2. Incoming Message Flow (WhatsApp → Client)

```
┌──────────────────┐
│ WhatsApp Servers │
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│ Baileys          │ Receive & decode
│                  │ Emit 'messages.upsert'
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│ Session Manager  │ Handle event
│                  │ Extract message data
│                  │ Check deduplication
└──────┬───────────┘
       │
       ├─────────────────────┬─────────────────────┐
       ▼                     ▼                     ▼
┌──────────────┐  ┌──────────────────┐  ┌──────────────┐
│ WebSocket    │  │ Webhook Service  │  │ Analytics    │
│ Emit event   │  │ HTTP POST        │  │ Track stats  │
└──────────────┘  └──────────────────┘  └──────────────┘
       │
       ▼
┌──────────────────┐
│ Socket.IO Clients│ Receive 'whatsapp:message'
└──────────────────┘
```

---

## Socket.IO Integration

### Design Philosophy

The Socket.IO integration is designed to be **application-agnostic** - it provides a generic protocol that any external application can use, not tied to specific use cases like CodeBridge.

### Room-based Architecture

```
Session Room: session-{sessionId}
├── Client A (Chatbot)
├── Client B (Dashboard)
└── Client C (Analytics)

Each client:
1. Connects to Gateway
2. Joins session room: socket.emit('join-session', sessionId)
3. Receives all messages for that session
4. Can send messages to that session
```

**Benefits:**
- Multiple clients can monitor one session
- Clean message isolation between sessions
- Scalable architecture
- Easy debugging (one room per session)

### Event Injection Points

#### In SessionManager (`src/whatsapp/sessionManager.js`)

```javascript
// When WhatsApp message arrives
sock.ev.on('messages.upsert', async ({ messages }) => {
  // ... process message ...
  
  // Emit to Socket.IO
  if (this.wsServer) {
    this.wsServer.emitToSession(sessionId, 'whatsapp:message', {
      from: phoneNumber,
      message: messageText,
      sessionId: sessionId,
      timestamp: Date.now(),
      messageId: message.key.id,
      type: messageType
    });
  }
});
```

#### In WebSocket Server (`src/websocket/server.js`)

```javascript
// Listen for send requests from clients
socket.on('send:message', async (data) => {
  const { sessionId, message, to } = data;
  
  // Send via SessionManager
  await this.sessionManager.sendTextMessage(sessionId, to, message);
  
  // Emit confirmation
  socket.emit('message:sent', {
    sessionId,
    to,
    success: true,
    timestamp: Date.now()
  });
});
```

### Protocol Versioning

Current version: `v1.0`

**Future considerations:**
- Add `protocol_version` field to events
- Support multiple protocol versions
- Deprecation notices for old versions

---

## Design Patterns

### 1. Dependency Injection

SessionManager is injected into WebSocketServer:

```javascript
// src/index.js
const sessionManager = new SessionManager(config);
const wsServer = new WebSocketServer(httpServer);

// Inject dependency
wsServer.setSessionManager(sessionManager);
sessionManager.setWebSocketServer(wsServer);
```

**Benefits:**
- Loose coupling
- Easy testing (mock injection)
- Clear dependencies

---

### 2. Event-driven Architecture

All components communicate via events:

```javascript
// Baileys events
sock.ev.on('connection.update', ...)
sock.ev.on('messages.upsert', ...)
sock.ev.on('creds.update', ...)

// Socket.IO events
socket.on('whatsapp:message', ...)
socket.emit('send:message', ...)
```

**Benefits:**
- Decoupled components
- Easy to extend
- Scalable architecture

---

### 3. Observer Pattern

Socket.IO rooms implement Observer pattern:

```javascript
// Subject: Session
// Observers: Multiple Socket.IO clients

// Notify all observers
this.io.to(`session-${sessionId}`).emit('whatsapp:message', data);
```

**Benefits:**
- One-to-many communication
- Dynamic observer registration
- Clean separation of concerns

---

### 4. Singleton Pattern

Core services use Singleton pattern:

```javascript
// src/services/webhookService.js
export const webhookService = new WebhookService();

// src/services/analyticsService.js
export const analyticsService = new AnalyticsService();
```

**Benefits:**
- Single source of truth
- Shared state management
- Resource efficiency

---

## Scalability

### Horizontal Scaling

Current limitations:
- Sessions tied to single server (in-memory state)
- No session migration between servers

**Future improvements:**
```
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│  Gateway 1  │  │  Gateway 2  │  │  Gateway 3  │
└──────┬──────┘  └──────┬──────┘  └──────┬──────┘
       │                │                │
       └────────────────┴────────────────┘
                        │
                        ▼
              ┌──────────────────┐
              │  Redis Cluster   │
              │  (Shared State)  │
              └──────────────────┘
```

---

### Load Balancing

Recommended setup:

```
                ┌──────────────┐
                │ Load Balancer│
                │  (Sticky)    │
                └──────┬───────┘
                       │
         ┌─────────────┼─────────────┐
         ▼             ▼             ▼
    ┌────────┐   ┌────────┐   ┌────────┐
    │Gateway │   │Gateway │   │Gateway │
    │   1    │   │   2    │   │   3    │
    └────────┘   └────────┘   └────────┘
```

**Requirements:**
- Sticky sessions (session affinity)
- Health checks
- Graceful shutdown

---

### Performance Optimization

#### 1. Connection Pooling

```javascript
// Reuse Socket.IO connections
const socket = io(url, {
  transports: ['websocket']  // Skip polling
});
```

#### 2. Message Deduplication

```javascript
// Prevent duplicate message processing
const deduplicationKey = `${sessionId}:${messageId}`;
if (this.deduplicationMap.has(deduplicationKey)) {
  return; // Already processed
}
this.deduplicationMap.set(deduplicationKey, true);
```

#### 3. Room Optimization

```javascript
// Use room-based routing instead of broadcast
this.io.to(`session-${sessionId}`).emit(event, data);
// vs
this.io.emit(event, data); // Don't do this
```

---

## Security Considerations

### 1. Authentication

- API key validation on all endpoints
- Socket.IO authentication via `auth` option
- Minimum 32-character API key requirement

### 2. Webhook Security

- HMAC SHA256 signature verification
- Timing-safe comparison
- Per-session webhook secrets

### 3. Input Validation

- Phone number format validation
- Message length limits
- File size limits
- SQL injection prevention

### 4. Rate Limiting

- Per-session rate limits
- Global rate limits
- Anti-ban delays for bulk sending

---

## Monitoring & Logging

### 1. Structured Logging

```javascript
loggerService.info(sessionId, 'Message sent', {
  to: recipient,
  messageId: msg.key.id
});
```

### 2. Analytics

```javascript
analyticsService.trackMessageSent(sessionId);
analyticsService.trackMessageReceived(sessionId);
```

### 3. Health Checks

```bash
GET /health
{
  "status": "ok",
  "uptime": 3600,
  "sessions": 5
}
```

---

## Future Enhancements

1. **Redis Session Store** - Shared session state across servers
2. **Message Queue Persistence** - Durable message queue
3. **Session Migration** - Move sessions between servers
4. **Advanced Analytics** - Real-time dashboards
5. **Multi-device Support** - WhatsApp multi-device API
6. **Message Templates** - Rich message templates
7. **File Storage** - Cloud storage integration (S3, GCS)
8. **Monitoring** - Prometheus metrics, Grafana dashboards

---

For implementation details, see:
- [Socket.IO Integration Guide](SOCKETIO_INTEGRATION.md)
- [API Reference](API_REFERENCE.md)
- [README](../README.md)
