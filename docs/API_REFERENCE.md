# API Reference

Complete reference for WhatsApp Gateway HTTP REST API and Socket.IO events.

## Table of Contents

- [HTTP REST API](#http-rest-api)
  - [Authentication](#authentication)
  - [Session Management](#session-management)
  - [Messaging](#messaging)
  - [Group Management](#group-management)
  - [Templates & Bulk](#templates--bulk)
  - [Analytics](#analytics)
- [Socket.IO Events](#socketio-events)
  - [Connection](#connection)
  - [Incoming Events](#incoming-events)
  - [Outgoing Events](#outgoing-events)
  - [Confirmation Events](#confirmation-events)

---

## HTTP REST API

### Base URL

```
https://chat.gatrion.my.id/api
```

For local development:
```
http://localhost:3333/api
```

### Authentication

All API endpoints require authentication via API key.

**Header:**
```
x-api-key: your-api-key-here
```

**Example:**
```bash
curl -X GET https://chat.gatrion.my.id/api/sessions \
  -H "x-api-key: your-api-key-here"
```

**Error Response (401 Unauthorized):**
```json
{
  "success": false,
  "error": "Unauthorized",
  "message": "API key is required"
}
```

---

## Session Management

### Create Session

Create a new WhatsApp session.

**Endpoint:** `POST /api/sessions`

**Request Body:**
```json
{
  "name": "Sales Department",
  "webhookUrl": "https://your-backend.com/webhook",
  "webhookSecret": "your-secret-key",
  "webhookEnabled": true
}
```

**Response (201 Created):**
```json
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

---

### List Sessions

Get all active sessions.

**Endpoint:** `GET /api/sessions`

**Response (200 OK):**
```json
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

---

### Get Session Status

Get status of a specific session.

**Endpoint:** `GET /api/sessions/:id/status`

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "sessionId": "session-abc123",
    "sessionName": "Sales Department",
    "status": "connected",
    "phone": "628123456789"
  }
}
```

**Status Values:**
- `connecting` - Initializing session
- `qr_ready` - QR code ready to scan
- `connected` - Successfully authenticated
- `disconnected` - Connection lost

---

### Get Session QR Code

Get QR code for session authentication.

**Endpoint:** `GET /api/sessions/:id/qr`

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "qr": "data:image/png;base64,...",
    "status": "qr_ready"
  }
}
```

**Error Response (404):**
```json
{
  "success": false,
  "error": "QR code not available yet"
}
```

---

### Update Webhook Config

Update webhook configuration for a session.

**Endpoint:** `PUT /api/sessions/:id/webhook`

**Request Body:**
```json
{
  "webhookUrl": "https://new-backend.com/webhook",
  "webhookSecret": "new-secret-key",
  "webhookEnabled": true
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Webhook configuration updated"
}
```

---

### Logout Session

Logout a session (keeps session data).

**Endpoint:** `POST /api/sessions/:id/logout`

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Session logged out successfully"
}
```

---

### Delete Session

Permanently delete a session.

**Endpoint:** `DELETE /api/sessions/:id`

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Session deleted successfully"
}
```

---

## Messaging

### Send Text Message

Send a text message.

**Endpoint:** `POST /api/send-text`

**Request Body:**
```json
{
  "sessionId": "session-abc123",
  "to": "628123456789",
  "message": "Hello from WhatsApp Gateway!"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "3EB0ABC123...",
    "status": "sent"
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Session not connected",
  "message": "Please scan QR code first"
}
```

---

### Send Image

Send an image with optional caption.

**Endpoint:** `POST /api/send-image`

**Request:** `multipart/form-data`

**Fields:**
- `sessionId` (string, required)
- `to` (string, required)
- `caption` (string, optional)
- `image` (file, required)

**Example (JavaScript):**
```javascript
const formData = new FormData();
formData.append('sessionId', 'session-abc123');
formData.append('to', '628123456789');
formData.append('caption', 'Photo caption');
formData.append('image', fileInput.files[0]);

const response = await fetch('/api/send-image', {
  method: 'POST',
  headers: {
    'x-api-key': 'your-api-key'
  },
  body: formData
});
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "3EB0ABC456...",
    "status": "sent"
  }
}
```

---

### Send Video

Send a video with optional caption.

**Endpoint:** `POST /api/send-video`

**Request:** `multipart/form-data`

**Fields:**
- `sessionId` (string, required)
- `to` (string, required)
- `caption` (string, optional)
- `video` (file, required, max 50MB)

---

### Send Audio

Send audio or voice note.

**Endpoint:** `POST /api/send-audio`

**Request:** `multipart/form-data`

**Fields:**
- `sessionId` (string, required)
- `to` (string, required)
- `ptt` (boolean, optional, default: false) - Set to `true` for voice note
- `audio` (file, required, max 16MB)

---

### Send Document

Send a document file.

**Endpoint:** `POST /api/send-document`

**Request:** `multipart/form-data`

**Fields:**
- `sessionId` (string, required)
- `to` (string, required)
- `filename` (string, optional)
- `caption` (string, optional)
- `document` (file, required, max 100MB)

---

### Send Location

Send location coordinates.

**Endpoint:** `POST /api/send-location`

**Request Body:**
```json
{
  "sessionId": "session-abc123",
  "to": "628123456789",
  "latitude": -6.2088,
  "longitude": 106.8456,
  "name": "Office",
  "address": "Jakarta"
}
```

---

### Send Contact

Send a contact card.

**Endpoint:** `POST /api/send-contact`

**Request Body:**
```json
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

---

### Send Sticker

Send a sticker (WebP format).

**Endpoint:** `POST /api/send-sticker`

**Request:** `multipart/form-data`

**Fields:**
- `sessionId` (string, required)
- `to` (string, required)
- `sticker` (file, required, WebP format, max 1MB)

---

## Group Management

### List Groups

Get all groups for a session.

**Endpoint:** `GET /api/groups?sessionId=session-abc123`

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "120363123456789012@g.us",
      "subject": "Sales Team",
      "owner": "628123456789@s.whatsapp.net",
      "size": 15,
      "creation": 1623456789
    }
  ]
}
```

---

### Get Group Details

Get detailed information about a group.

**Endpoint:** `GET /api/groups/:groupId?sessionId=session-abc123`

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "120363123456789012@g.us",
    "subject": "Sales Team",
    "owner": "628123456789@s.whatsapp.net",
    "desc": "Team collaboration group",
    "participants": [
      {
        "id": "628123456789@s.whatsapp.net",
        "admin": "superadmin"
      }
    ],
    "size": 15,
    "creation": 1623456789
  }
}
```

---

### Create Group

Create a new WhatsApp group.

**Endpoint:** `POST /api/groups/create`

**Request Body:**
```json
{
  "sessionId": "session-abc123",
  "name": "Sales Team",
  "participants": ["628111222333", "628999888777"]
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "120363123456789012@g.us",
    "subject": "Sales Team",
    "participants": 2
  }
}
```

---

### Send to Group

Send a message to a group.

**Endpoint:** `POST /api/groups/:groupId/send`

**Request Body:**
```json
{
  "sessionId": "session-abc123",
  "message": "Team announcement!",
  "mentions": ["628111222333"]
}
```

---

### Add Participants

Add participants to a group.

**Endpoint:** `POST /api/groups/:groupId/participants`

**Request Body:**
```json
{
  "sessionId": "session-abc123",
  "participants": ["628111222333"]
}
```

---

### Remove Participants

Remove participants from a group.

**Endpoint:** `DELETE /api/groups/:groupId/participants`

**Request Body:**
```json
{
  "sessionId": "session-abc123",
  "participants": ["628111222333"]
}
```

---

## Templates & Bulk

### Create Template

Create a message template with variables.

**Endpoint:** `POST /api/templates`

**Request Body:**
```json
{
  "sessionId": "session-abc123",
  "name": "payment_reminder",
  "category": "transactional",
  "content": "Hi {{name}}, your payment of {{amount}} is due on {{date}}."
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "template-xyz789",
    "variables": ["name", "amount", "date"]
  }
}
```

---

### List Templates

Get all templates for a session.

**Endpoint:** `GET /api/templates?sessionId=session-abc123`

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "template-xyz789",
      "name": "payment_reminder",
      "category": "transactional",
      "content": "Hi {{name}}, your payment of {{amount}} is due on {{date}}.",
      "variables": ["name", "amount", "date"],
      "createdAt": "2026-06-18T10:00:00.000Z"
    }
  ]
}
```

---

### Bulk Send

Send messages to multiple recipients using a template.

**Endpoint:** `POST /api/bulk/send`

**Request Body:**
```json
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
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "bulkJobId": "bulk-abc123",
    "total": 2,
    "status": "processing"
  }
}
```

---

### Get Bulk Progress

Check progress of a bulk sending job.

**Endpoint:** `GET /api/bulk/:jobId/progress`

**Response (200 OK):**
```json
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

---

## Analytics

### Get Session Analytics

Get analytics for a specific session.

**Endpoint:** `GET /api/analytics?sessionId=session-abc123`

**Response (200 OK):**
```json
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

---

### Get Aggregate Analytics

Get analytics across all sessions.

**Endpoint:** `GET /api/analytics/aggregate`

**Response (200 OK):**
```json
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

## Socket.IO Events

### Connection

Connect to Socket.IO server:

```javascript
import { io } from 'socket.io-client';

const socket = io('https://chat.gatrion.my.id', {
  auth: {
    key: 'your-api-key',
    clientType: 'your-app-name'
  },
  transports: ['websocket', 'polling']
});
```

---

### Incoming Events

Events emitted from Gateway to clients.

#### whatsapp:message

New WhatsApp message received.

**Event:** `whatsapp:message`

**Data:**
```javascript
{
  from: '628123456789',
  message: 'Message text',
  sessionId: 'session-xxx',
  timestamp: 1234567890,
  messageId: 'xxx',
  type: 'text'  // text, image, video, audio, document
}
```

**Example:**
```javascript
socket.on('whatsapp:message', (data) => {
  console.log('From:', data.from);
  console.log('Message:', data.message);
});
```

---

#### qr_ready

QR code generated for session.

**Event:** `qr_ready`

**Data:**
```javascript
{
  sessionId: 'session-xxx',
  qrCode: 'data:image/png;base64,...'
}
```

---

#### session_connected

Session successfully connected.

**Event:** `session_connected`

**Data:**
```javascript
{
  sessionId: 'session-xxx',
  phone: '628123456789'
}
```

---

#### session_disconnected

Session disconnected.

**Event:** `session_disconnected`

**Data:**
```javascript
{
  sessionId: 'session-xxx'
}
```

---

### Outgoing Events

Events sent from clients to Gateway.

#### send:message

Send a WhatsApp message.

**Event:** `send:message`

**Data:**
```javascript
{
  sessionId: 'session-xxx',
  to: '628123456789',
  message: 'Hello!',
  timestamp: Date.now()  // optional
}
```

**Example:**
```javascript
socket.emit('send:message', {
  sessionId: 'session-xxx',
  to: '628123456789',
  message: 'Hello from Socket.IO!'
});
```

---

#### join-session

Join a session room to receive messages.

**Event:** `join-session`

**Data:** `sessionId` (string)

**Example:**
```javascript
socket.emit('join-session', 'session-xxx');
```

**Response:** `joined-session`
```javascript
socket.on('joined-session', (data) => {
  console.log(data);
  // { sessionId: 'session-xxx', room: 'session-xxx' }
});
```

---

#### leave-session

Leave a session room.

**Event:** `leave-session`

**Data:** `sessionId` (string)

**Example:**
```javascript
socket.emit('leave-session', 'session-xxx');
```

---

### Confirmation Events

#### message:sent

Message successfully sent.

**Event:** `message:sent`

**Data:**
```javascript
{
  sessionId: 'session-xxx',
  to: '628123456789',
  success: true,
  timestamp: 1234567890
}
```

---

#### message:error

Error sending message.

**Event:** `message:error`

**Data:**
```javascript
{
  sessionId: 'session-xxx',
  error: 'Error message',
  timestamp: 1234567890
}
```

**Common Errors:**
- `"Missing required fields: sessionId, message, or to"`
- `"SessionManager not initialized"`
- `"Session not found"`
- `"Failed to send message"`

---

## Complete Example

Full integration example with HTTP API and Socket.IO:

```javascript
import { io } from 'socket.io-client';

const API_URL = 'https://chat.gatrion.my.id/api';
const API_KEY = 'your-api-key';

// 1. Create session (HTTP API)
const createSession = async () => {
  const response = await fetch(`${API_URL}/sessions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY
    },
    body: JSON.stringify({
      name: 'My Bot Session',
      webhookEnabled: false
    })
  });
  
  const data = await response.json();
  return data.data.sessionId;
};

// 2. Connect Socket.IO
const socket = io('https://chat.gatrion.my.id', {
  auth: {
    key: API_KEY,
    clientType: 'my-bot'
  }
});

// 3. Setup session
const sessionId = await createSession();
socket.emit('join-session', sessionId);

// 4. Listen for QR code
socket.on('qr_ready', (data) => {
  console.log('Scan QR:', data.qrCode);
  // Display QR to user
});

// 5. Wait for connection
socket.on('session_connected', (data) => {
  console.log('Connected:', data.phone);
});

// 6. Handle incoming messages
socket.on('whatsapp:message', async (data) => {
  console.log('Message from:', data.from);
  
  // Process message
  const response = processMessage(data.message);
  
  // Send reply
  socket.emit('send:message', {
    sessionId: data.sessionId,
    to: data.from,
    message: response
  });
});

// 7. Handle confirmations
socket.on('message:sent', (data) => {
  console.log('Sent to:', data.to);
});

socket.on('message:error', (data) => {
  console.error('Error:', data.error);
});
```

---

## Rate Limits

Current rate limits (configurable):

- **Messages:** 20 per minute per session
- **Bulk sending:** Built-in delays (8-15 seconds between messages)
- **API requests:** No hard limit, but please be reasonable

---

## Phone Number Format

Always use international format without `+` or spaces:

✅ **Correct:**
- `628123456789` (Indonesia)
- `14155552671` (USA)
- `447911123456` (UK)

❌ **Incorrect:**
- `+62 812 3456 789`
- `0812 3456 789`
- `+62-812-3456-789`

---

## Error Codes

Common HTTP status codes:

- `200` - Success
- `201` - Created
- `400` - Bad Request (invalid parameters)
- `401` - Unauthorized (invalid API key)
- `404` - Not Found
- `500` - Internal Server Error

---

## Webhook Integration

See [SOCKETIO_INTEGRATION.md](SOCKETIO_INTEGRATION.md) for webhook configuration and HMAC signature verification.

---

For more information, see:
- [Socket.IO Integration Guide](SOCKETIO_INTEGRATION.md)
- [README.md](../README.md)
