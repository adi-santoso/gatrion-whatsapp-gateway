# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Multi-session WhatsApp Gateway built with Node.js, Baileys v7, Express, and React. Production-ready with Redis queue, webhook delivery, template system, bulk sending with anti-ban patterns, and real-time dashboard.

**Key Capabilities:**
- Multi-session architecture: Run unlimited WhatsApp numbers on one server
- 8 media types support (text, image, video, audio, document, location, contact, sticker)
- Bidirectional messaging with webhook delivery (HMAC signatures)
- Group management (full CRUD)
- Template system with variable substitution
- Bulk sending with anti-ban delays (8-15s randomized)
- Real-time WebSocket dashboard
- Per-session analytics

## Commands

### Development
```bash
# Start dev server with nodemon (watches src/**/*.js and .env)
npm run dev

# Start production server
npm start

# Run all tests
npm test

# Run specific test suite
npm run test:api
npm run test:integration

# Run benchmark
npm run benchmark
```

### Dashboard
```bash
cd dashboard
npm install
npm run dev      # Start Vite dev server
npm run build    # Build for production (outputs to dashboard/dist)
```

## Architecture

### Multi-Session Management

**Core class:** `SessionManager` (`src/whatsapp/sessionManager.js`)
- Manages lifecycle of multiple WhatsApp sessions in memory (`Map`)
- Each session has isolated Baileys socket, QR code, status, and webhook config
- Prevents race conditions with initialization locks (`Set`)
- Message deduplication per session (TTL-based `Map`)
- Automatic session restoration on startup from SQLite DB
- Graceful shutdown with 30s timeout

**Session lifecycle:**
1. `createSession()` → Creates Baileys socket + auth state
2. `setupEventHandlers()` → Attaches connection/message listeners
3. QR generation (60s timeout) or authentication
4. `ready` event → Session can send messages
5. Stores session metadata in SQLite (`sessionDb.js`)

### Database Layer

**SQLite via sql.js** (no native binaries):
- `SessionDB` (`src/storage/sessionDb.js`): Stores session metadata, auth paths, webhook configs
- `TemplateDB` (`src/storage/templateDb.js`): Stores message templates with variable placeholders

Both databases:
- Initialize asynchronously, use `waitReady()` before queries
- Auto-save to disk after every write
- Thread-safe (single-process)

### Webhook System

**Service:** `webhookService` (`src/services/webhookService.js`)
- HMAC SHA256 signature verification (`x-webhook-signature` header)
- Per-session webhook config (URL, secret, enabled flag)
- Retry with exponential backoff (3 attempts, 10s timeout)
- Delivered events: `message.received`, `status.changed`
- Queue-based delivery if Redis enabled, direct HTTP POST otherwise

### Queue System (Optional)

**BullMQ + Redis** (`src/queue/`):
- `messageQueue.js`: Queue creation and job management
- `workers.js`: Worker that processes message send jobs
- Only active if `REDIS_ENABLED=true` in `.env`
- Concurrency: 5 (configurable via `QUEUE_CONCURRENCY`)
- Rate limiting: 20 req/60s (configurable)

**Fallback:** If Redis disabled, messages send directly via Baileys (no queue tracking).

### API Structure

**Routes** (`src/api/routes.js`):
- 48+ endpoints organized by domain:
  - Session management (8): create, list, QR, status, logout, delete, webhook update
  - Messaging (8): send text/image/video/audio/document/location/contact/sticker
  - Group management (11): list, create, add/remove participants, promote/demote, leave, invite
  - Templates & Bulk (7): CRUD templates, bulk send with anti-ban, progress tracking
  - Analytics (3): per-session and aggregate stats

**Controllers** (`src/api/controllers/`):
- Each domain has dedicated controller (session, media, group, template, analytics)
- Controllers interact with `sessionManager` singleton (imported from `src/index.js`)

**Middleware** (`src/middleware/`):
- `auth.middleware.js`: API key validation (timing-safe comparison, min 32 chars in production)
- `rateLimit.middleware.js`: In-memory rate limiting per IP
- `upload.middleware.js`: Multer file upload handlers for each media type
- `validation.middleware.js`: Request body validation
- `error.middleware.js`: Global error handler

### WebSocket Server

**Class:** `WebSocketServer` (`src/websocket/server.js`)
- Socket.IO server with pure WebSocket transport (no polling)
- API key authentication via `socket.handshake.auth.apiKey`
- Room-based broadcasting: Join session rooms to receive session-specific events
- Emitted events: `qr`, `status`, `ready`, `message`, `error`
- Integrated with `sessionManager` for real-time updates

### Frontend Dashboard

**Tech stack:** React + Vite + TypeScript + TailwindCSS v4
- Served statically from `dashboard/dist` at `/dashboard`
- SPA routing with React Router
- Real-time QR code display via Socket.IO
- Pages: Sessions list, QR scan, Send message
- API client in `dashboard/src/api/`

## Configuration

**Environment variables** (`.env`):
- `API_KEY`: Required in production, min 32 chars (timing-safe comparison)
- `PORT`: Default 3333
- `REDIS_ENABLED`: Set to `false` to run without Redis (direct message sending)
- `NODE_ENV`: `development` or `production`
- Session storage: `WHATSAPP_SESSION_PATH` (default `./sessions`)
- Queue config: `QUEUE_CONCURRENCY`, `QUEUE_RATE_LIMIT_MAX`, `QUEUE_RATE_LIMIT_DURATION`
- Webhook config: `WEBHOOK_TIMEOUT`, `WEBHOOK_RETRY_ATTEMPTS`

**Critical for tests:** Most tests require valid `API_KEY` in `.env` or will fail authentication.

## Anti-Ban Implementation

Bulk sending (`src/services/bulkService.js`):
- Randomizes recipient order (prevents pattern detection)
- Delays between messages: 8000-15000ms (configurable `delayMin`/`delayMax`)
- Template variable substitution before sending
- Progress tracking via in-memory store

## Important Patterns

### Accessing session manager
```javascript
import { sessionManager } from '../index.js';

const session = sessionManager.sessions.get(sessionId);
if (!session || session.status !== 'connected') {
  throw new Error('Session not ready');
}
```

### Sending messages
```javascript
await session.sock.sendMessage(jid, messageContent);
analyticsService.incrementSent(sessionId);
```

### Phone number formatting
WhatsApp JIDs: `628123456789@s.whatsapp.net` (individual), `120363...@g.us` (group)
Use `formatPhoneNumber()` from `src/whatsapp/utils.js` to ensure `@s.whatsapp.net` suffix.

### Database writes
Always check if database is ready:
```javascript
await this.db.waitReady();
this.db.insertSession({...});
```

## Testing Strategy

- Uses Node.js built-in test runner (`node --test`)
- Tests in `tests/` directory
- Most endpoints need valid `API_KEY` header
- Integration tests start real server on random port
- Mock Baileys socket for WhatsApp operations

## Common Pitfalls

1. **Session not restored**: Ensure `sessionManager.restoreAllSessions()` called before accepting requests
2. **QR timeout**: QR codes expire after 60s, auto-regenerate until scanned
3. **Redis disabled**: Set `REDIS_ENABLED=false` explicitly, don't just omit Redis connection details
4. **Race conditions**: Use `sessionManager.initializingLock` when creating sessions
5. **Message deduplication**: Same message can arrive multiple times from Baileys, check `deduplicationMap`
6. **Graceful shutdown**: Always await `sessionManager.shutdownAll()` to properly close sockets
7. **Webhook signatures**: Verify HMAC before processing webhook deliveries
8. **Phone number format**: Always append `@s.whatsapp.net` for individual chats

## File Upload Limits

Configured in `src/middleware/upload.middleware.js`:
- Image: 10MB
- Video: 50MB
- Audio: 16MB
- Document: 100MB
- Sticker: 1MB (WebP only)

## Logging

Structured logging via Pino (`src/services/loggerService.js`):
- Console output with `pino-pretty` in development
- JSON logs in production
- Per-session context included in all logs
- Baileys logger set to `silent` to reduce noise
