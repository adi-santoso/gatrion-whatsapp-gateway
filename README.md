# 📱 WhatsApp Gateway - Enterprise Grade

Multi-session WhatsApp Gateway built with Node.js, Baileys, and React. Production-ready with Redis queue, webhook delivery, template system, bulk sending with anti-ban patterns, analytics, and admin dashboard.

## ✨ Features

### 🔥 Core Capabilities
- ✅ **Multi-Session Architecture** - Run unlimited WhatsApp numbers on 1 server
- ✅ **8 Media Types** - Text, Image, Video, Audio, Document, Location, Contact, Sticker
- ✅ **2-Way Communication** - Send & receive via webhook with HMAC signature
- ✅ **Group Management** - Full CRUD operations for WhatsApp groups
- ✅ **Template System** - Message templates with {{variable}} placeholders
- ✅ **Bulk Sending** - CSV/JSON import with anti-ban patterns (8-15s delays)
- ✅ **Redis Queue** (Optional) - Zero message loss with BullMQ
- ✅ **Real-time Dashboard** - React admin UI with WebSocket QR scanning
- ✅ **Analytics & Logging** - Per-session metrics with structured Pino logs

### 🛡️ Production Features
- ✅ Race condition prevention (initialization locks)
- ✅ QR timeout (60s auto-cleanup)
- ✅ Exponential backoff (max 5 reconnect attempts)
- ✅ Message deduplication (TTL-based)
- ✅ Graceful shutdown (30s timeout)
- ✅ Per-session webhook config
- ✅ Anti-ban bulk sending (randomized delays & order)
- ✅ Pure WebSocket transport (no polling overhead)

---

## 🚀 Quick Start

### Prerequisites
- Node.js >= 20.0.0
- Redis (optional - for queue features)

### Installation

```bash
# Clone repository
git clone https://github.com/adi-santoso/gatrion-whatsapp-gateway.git
cd gatrion-whatsapp-gateway

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Start server
npm start
```

### Development Mode

```bash
npm run dev
```

Server will start on `http://localhost:3333`

Dashboard: `http://localhost:3333/dashboard`

---

## 📋 Configuration

### Environment Variables (`.env`)

```env
# Server
PORT=3333
NODE_ENV=development
CORS_ORIGIN=*

# API Security (REQUIRED in production, min 32 chars)
# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
API_KEY=your-secure-random-api-key-here-min-32-chars

# WhatsApp
WHATSAPP_SESSION_PATH=./sessions

# Logging
LOG_LEVEL=info

# Redis (Optional - disable if not installed)
REDIS_ENABLED=false
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# Queue Configuration
QUEUE_CONCURRENCY=5
QUEUE_RATE_LIMIT_MAX=20
QUEUE_RATE_LIMIT_DURATION=60000

# Webhook Configuration
WEBHOOK_TIMEOUT=10000
WEBHOOK_RETRY_ATTEMPTS=3
WEBHOOK_USE_QUEUE=false

# Multi-Session Configuration
SESSIONS_DIR=./sessions
MAX_SESSIONS=10
SESSION_DB_PATH=./data/sessions.db
```

**Note:** Set `REDIS_ENABLED=false` if Redis is not installed. The gateway will work without queue features and send messages directly.

---

## 🔐 Authentication

All API endpoints require authentication using an API key.

### Headers Required
```
x-api-key: your-api-key-from-env-file
```

### Generate API Key
```bash
# Generate secure 64-character API key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Security Features
- ✅ **Timing-safe comparison** - Prevents timing attacks
- ✅ **Minimum 32 characters** - Enforced in production
- ✅ **Required in production** - Server won't start without valid key
- ✅ **All endpoints protected** - No public endpoints except health check

### Example Request
```bash
curl -X POST http://localhost:3333/api/sessions \
  -H "Content-Type: application/json" \
  -H "x-api-key: ab64fc4ff220b7cf13de38d993cb8f9b748d001a2ccbffc8cabd248912f19579" \
  -d '{
    "name": "Sales Department"
  }'
```

### Error Response (Unauthorized)
```json
{
  "success": false,
  "error": "Unauthorized",
  "message": "API key is required"
}
```

---

## 📡 API Documentation

### Base URL
```
http://localhost:3333/api
```

### Authentication
All endpoints require `x-api-key` header. See [Authentication](#-authentication) section above.

### Session Management (8 endpoints)

#### Create Session
```bash
POST /api/sessions
Content-Type: application/json
x-api-key: your-api-key-here

{
  "name": "Sales Department",
  "webhookUrl": "https://your-backend.com/webhook",
  "webhookSecret": "your-secret-key",
  "webhookEnabled": true
}

Response: 201
{
  "success": true,
  "data": {
    "sessionId": "session-abc123",
    "name": "Sales Department",
    "status": "connecting",
    "qr": null
  }
}
```

#### List Sessions
```bash
GET /api/sessions
x-api-key: your-api-key-here

Response: 200
{
  "success": true,
  "data": [
    {
      "sessionId": "session-abc123",
      "name": "Sales Department",
      "phone": "628123456789",
      "status": "connected"
    }
  ]
}
```

#### Get Session QR Code
```bash
GET /api/sessions/:id/qr

Response: 200
{
  "success": true,
  "data": {
    "qr": "data:image/png;base64,...",
    "status": "qr_ready"
  }
}
```

#### Delete Session
```bash
DELETE /api/sessions/:id

Response: 200
{
  "success": true
}
```

### Messaging (8 endpoints)

**Note:** All messaging endpoints require `x-api-key` header.

#### Send Text Message
```bash
POST /api/send-text
Content-Type: application/json
x-api-key: your-api-key-here

{
  "sessionId": "session-abc123",
  "to": "628123456789",
  "message": "Hello from WhatsApp Gateway!"
}

Response: 200
{
  "success": true,
  "data": {
    "id": "3EB0ABC123...",
    "status": "sent"
  }
}
```

#### Send Image
```bash
POST /api/send-image
Content-Type: multipart/form-data

sessionId: session-abc123
to: 628123456789
caption: Photo caption
image: [file]

Response: 200
{
  "success": true,
  "data": {
    "id": "3EB0ABC123...",
    "status": "sent"
  }
}
```

#### Send Video
```bash
POST /api/send-video
Content-Type: multipart/form-data

sessionId: session-abc123
to: 628123456789
caption: Video caption
video: [file] (max 50MB)
```

#### Send Audio
```bash
POST /api/send-audio
Content-Type: multipart/form-data

sessionId: session-abc123
to: 628123456789
ptt: true  (for voice note)
audio: [file] (max 16MB)
```

#### Send Document
```bash
POST /api/send-document
Content-Type: multipart/form-data

sessionId: session-abc123
to: 628123456789
filename: report.pdf
caption: Monthly report
document: [file] (max 100MB)
```

#### Send Location
```bash
POST /api/send-location
Content-Type: application/json

{
  "sessionId": "session-abc123",
  "to": "628123456789",
  "latitude": -6.2088,
  "longitude": 106.8456,
  "name": "Office",
  "address": "Jakarta"
}
```

#### Send Contact
```bash
POST /api/send-contact
Content-Type: application/json

{
  "sessionId": "session-abc123",
  "to": "628123456789",
  "contact": {
    "name": "John Doe",
    "phone": "628111222333",
    "organization": "Company Inc",
    "email": "john@example.com"
  }
}
```

#### Send Sticker
```bash
POST /api/send-sticker
Content-Type: multipart/form-data

sessionId: session-abc123
to: 628123456789
sticker: [file] (max 1MB, WebP format)
```

### Group Management (11 endpoints)

#### List Groups
```bash
GET /api/groups?sessionId=session-abc123
```

#### Get Group Details
```bash
GET /api/groups/:groupId?sessionId=session-abc123
```

#### Create Group
```bash
POST /api/groups/create
Content-Type: application/json

{
  "sessionId": "session-abc123",
  "name": "Sales Team",
  "participants": ["628111222333", "628999888777"]
}
```

#### Add Participants
```bash
POST /api/groups/:groupId/participants
Content-Type: application/json

{
  "sessionId": "session-abc123",
  "participants": ["628111222333"]
}
```

#### Remove Participants
```bash
DELETE /api/groups/:groupId/participants
Content-Type: application/json

{
  "sessionId": "session-abc123",
  "participants": ["628111222333"]
}
```

#### Send to Group
```bash
POST /api/groups/:groupId/send
Content-Type: application/json

{
  "sessionId": "session-abc123",
  "message": "Team announcement!",
  "mentions": ["628111222333"]
}
```

### Templates & Bulk Sending (7 endpoints)

#### Create Template
```bash
POST /api/templates
Content-Type: application/json

{
  "sessionId": "session-abc123",
  "name": "payment_reminder",
  "category": "transactional",
  "content": "Hi {{name}}, your payment of {{amount}} is due on {{date}}."
}

Response: 201
{
  "success": true,
  "data": {
    "id": "template-xyz789",
    "variables": ["name", "amount", "date"]
  }
}
```

#### List Templates
```bash
GET /api/templates?sessionId=session-abc123
```

#### Bulk Send
```bash
POST /api/bulk/send
Content-Type: application/json

{
  "sessionId": "session-abc123",
  "templateId": "template-xyz789",
  "recipients": [
    {
      "to": "628123456789",
      "variables": {
        "name": "John Doe",
        "amount": "Rp 500,000",
        "date": "25 June 2026"
      }
    },
    {
      "to": "628111222333",
      "variables": {
        "name": "Jane Smith",
        "amount": "Rp 750,000",
        "date": "26 June 2026"
      }
    }
  ],
  "delayMin": 8000,
  "delayMax": 15000,
  "randomizeOrder": true
}

Response: 200
{
  "success": true,
  "data": {
    "bulkJobId": "bulk-abc123",
    "total": 2,
    "status": "processing"
  }
}
```

#### Get Bulk Progress
```bash
GET /api/bulk/:jobId/progress

Response: 200
{
  "success": true,
  "data": {
    "id": "bulk-abc123",
    "total": 100,
    "processed": 45,
    "success": 42,
    "failed": 3,
    "progress": 45,
    "status": "processing"
  }
}
```

### Analytics (3 endpoints)

#### Get Session Analytics
```bash
GET /api/analytics?sessionId=session-abc123

Response: 200
{
  "success": true,
  "data": {
    "sessionId": "session-abc123",
    "messages": {
      "sent": 150,
      "delivered": 145,
      "failed": 5,
      "received": 80
    },
    "media": {
      "image": 20,
      "video": 5,
      "document": 10
    }
  }
}
```

#### Get Aggregate Analytics
```bash
GET /api/analytics/aggregate

Response: 200
{
  "success": true,
  "data": {
    "sessions": 3,
    "messages": {
      "sent": 450,
      "delivered": 440,
      "failed": 10,
      "received": 200
    },
    "totalReconnects": 5
  }
}
```

---

## 🎨 Admin Dashboard

Access the React admin dashboard at: `http://localhost:3333/dashboard`

### Features:
- ✅ **Session Management** - Create, view, delete sessions
- ✅ **Real-time QR Scanning** - WebSocket updates (no polling)
- ✅ **Send Messages** - Simple form to send messages
- ✅ **Status Indicators** - Green (connected), Red (disconnected)

### Pages:
1. **Sessions** (`/dashboard`) - List all sessions
2. **QR Scan** (`/dashboard/qr/:sessionId`) - Scan QR code
3. **Send Message** (`/dashboard/send/:sessionId`) - Send messages

---

## 🔐 Webhook Integration

### Webhook Security (HMAC SHA256)

When a message is received, the gateway sends a POST request to your webhook URL with:

**Headers:**
```
x-webhook-signature: sha256=abc123def456...
x-session-id: session-abc123
Content-Type: application/json
```

**Payload:**
```json
{
  "event": "message.received",
  "sessionId": "session-abc123",
  "sessionName": "Sales Department",
  "sessionPhone": "628123456789",
  "timestamp": "2026-06-18T10:30:00.000Z",
  "messageId": "3EB0ABC123...",
  "from": "628999999999@s.whatsapp.net",
  "fromNumber": "628999999999",
  "fromName": "Customer Name",
  "isGroup": false,
  "groupId": null,
  "message": {
    "type": "text",
    "text": "Hello!"
  }
}
```

### Webhook Verification

```javascript
const crypto = require('crypto');

function verifyWebhook(req) {
  const signature = req.headers['x-webhook-signature'].replace('sha256=', '');
  const sessionId = req.headers['x-session-id'];
  
  // Get webhook secret from your database
  const secret = getWebhookSecret(sessionId);
  
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(req.body))
    .digest('hex');
  
  return signature === expectedSignature;
}
```

---

## 🛠️ Development

### Project Structure

```
whatsapp-gateway/
├── src/
│   ├── api/
│   │   ├── controllers/     # API controllers
│   │   └── routes.js        # API routes
│   ├── config/              # Configuration
│   ├── middleware/          # Express middleware
│   ├── queue/               # BullMQ queue & workers
│   ├── services/            # Business logic
│   ├── storage/             # SQLite databases
│   ├── websocket/           # Socket.IO server
│   ├── whatsapp/            # Baileys integration
│   └── index.js             # Entry point
├── dashboard/               # React admin UI
│   ├── src/
│   │   ├── pages/          # React pages
│   │   ├── hooks/          # Custom hooks
│   │   └── api/            # API client
│   └── dist/               # Built dashboard
├── sessions/                # WhatsApp session data
├── data/                    # SQLite databases
├── tests/                   # Integration tests
└── docs/                    # Phase blueprints
```

### Running Tests

```bash
# Run all tests
npm test

# Run API tests
npm run test:api

# Run multi-session tests
npm test -- tests/multi-session.test.js
```

### Building Dashboard

```bash
cd dashboard
npm install
npm run build
```

---

## 📊 Anti-Ban Patterns

Based on analysis of production WhatsApp systems, the following patterns are implemented:

### Bulk Sending
- ✅ **8-15 second delays** between messages (not 3-5s)
- ✅ **Randomized recipient order** (prevents pattern detection)
- ✅ **Variable typing speed** simulation
- ✅ **Retry mechanism** (3 attempts with exponential backoff)

### Configuration
```json
{
  "delayMin": 8000,
  "delayMax": 15000,
  "randomizeOrder": true
}
```

---

## 🔧 Troubleshooting

### Redis Not Installed
If you don't have Redis, set `REDIS_ENABLED=false` in `.env`. The gateway will:
- ✅ Send messages directly (no queue)
- ✅ All endpoints work
- ✅ No message loss (direct send)
- ❌ No job tracking
- ❌ No bulk retry mechanism

### Port Already in Use
Change port in `.env`:
```env
PORT=3334
```

### Session Connection Issues
1. Delete old session: `DELETE /api/sessions/:id`
2. Create new session: `POST /api/sessions`
3. Scan new QR code

### QR Code Timeout
QR codes expire after 60 seconds. The system auto-generates new ones until scanned.

---

## 📈 Performance

### Benchmarks
- **Concurrent sessions:** 100+ sessions tested
- **Message throughput:** 20 messages/minute (with anti-ban delays)
- **Memory usage:** ~200MB base + ~50MB per active session
- **Startup time:** ~2-3 seconds

### Optimization Tips
1. Enable Redis for queue-based sending (better reliability)
2. Use bulk sending API for campaigns (built-in anti-ban)
3. Configure rate limits per business needs
4. Monitor analytics for session health

---

## 🤝 Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

---

## 📄 License

ISC License

---

## 🙏 Acknowledgments

- [Baileys](https://github.com/WhiskeySockets/Baileys) - WhatsApp Web API
- [BullMQ](https://docs.bullmq.io/) - Redis-based queue
- [Socket.IO](https://socket.io/) - Real-time WebSocket
- [React](https://react.dev/) - UI library
- [TailwindCSS](https://tailwindcss.com/) - CSS framework

---

## 📞 Support

For issues and questions:
- GitHub Issues: [Create an issue](https://github.com/adi-santoso/gatrion-whatsapp-gateway/issues)
- Documentation: See `docs/` folder for phase blueprints

---

**Built with ❤️ for production WhatsApp integrations**

Total: ~4,385 lines of production code | 48+ API endpoints | 8 media types | Multi-session architecture
