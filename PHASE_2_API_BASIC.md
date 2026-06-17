# PHASE 2: API Layer - Basic Endpoints

**Objective:** Create Express REST API with QR and Status endpoints

**Estimated Time:** 20 minutes  
**Dependencies:** PHASE_1_BAILEYS.md (completed)  
**Next Phase:** PHASE_3_SEND_TEXT.md

---

## 📋 Tasks Checklist

- [ ] Setup Express server
- [ ] Create GET /qr endpoint
- [ ] Create GET /status endpoint
- [ ] Create GET /health endpoint
- [ ] CORS configuration
- [ ] Basic error handling middleware
- [ ] Request logging
- [ ] Integrate with WhatsApp client

---

## 🎯 Deliverables

### 1. src/index.js (Entry Point)

**Requirements:**
- Initialize Express app
- Initialize WhatsApp client
- Setup middleware
- Start server
- Graceful shutdown handler

**Flow:**
```javascript
1. Load environment config
2. Initialize WhatsApp client
3. Setup Express app & routes
4. Start HTTP server
5. Listen for SIGTERM/SIGINT for graceful shutdown
```

### 2. src/api/routes.js

**Requirements:**
- Define all API routes
- Import controllers
- Export Express Router

**Routes:**
```javascript
GET  /health  → Health check (no auth required)
GET  /qr      → Get QR code (auth required)
GET  /status  → Get connection status (auth required)
```

### 3. src/api/controllers/qr.controller.js

**Endpoint:** `GET /qr`

**Response Success (200):**
```json
{
    "success": true,
    "data": {
        "qr": "data:image/png;base64,iVBORw0KGg...",
        "status": "qr_required",
        "message": "Scan QR code dengan WhatsApp"
    }
}
```

**Response Already Connected (200):**
```json
{
    "success": true,
    "data": {
        "qr": null,
        "status": "connected",
        "phone": "628123456789",
        "message": "WhatsApp sudah terhubung"
    }
}
```

**Response Error (500):**
```json
{
    "success": false,
    "error": "Failed to generate QR code",
    "message": "WhatsApp client not initialized"
}
```

### 4. src/api/controllers/status.controller.js

**Endpoint:** `GET /status`

**Response Success - Connected (200):**
```json
{
    "success": true,
    "data": {
        "connected": true,
        "state": "connected",
        "phone": "628123456789",
        "timestamp": "2026-06-17T10:30:00.000Z"
    }
}
```

**Response Success - Not Connected (200):**
```json
{
    "success": true,
    "data": {
        "connected": false,
        "state": "qr_required",
        "phone": null,
        "timestamp": "2026-06-17T10:30:00.000Z"
    }
}
```

### 5. src/middleware/error.middleware.js

**Requirements:**
- Global error handler
- Standardized error response format
- Log errors dengan Pino
- Handle async errors

**Error Response Format:**
```json
{
    "success": false,
    "error": "Error type",
    "message": "Human readable message",
    "timestamp": "2026-06-17T10:30:00.000Z"
}
```

**Common Error Types:**
```javascript
- ValidationError (400)
- UnauthorizedError (401)
- NotFoundError (404)
- InternalServerError (500)
```

### 6. Health Check Endpoint

**Endpoint:** `GET /health`

**Purpose:** Monitoring, uptime checks, load balancer

**Response (200):**
```json
{
    "success": true,
    "data": {
        "status": "healthy",
        "uptime": 12345,
        "timestamp": "2026-06-17T10:30:00.000Z",
        "memory": {
            "used": 150,
            "total": 512,
            "unit": "MB"
        }
    }
}
```

---

## 🔧 Middleware Stack

```javascript
Express App
  ↓
1. CORS
  ↓
2. JSON body parser
  ↓
3. Request logging (Pino)
  ↓
4. Routes
  ↓
5. 404 handler
  ↓
6. Error handler
```

---

## 🔒 CORS Configuration

**Allow:**
```javascript
{
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'x-api-key']
}
```

---

## ✅ Acceptance Criteria

### Functional:
1. ✓ Server starts on configured port
2. ✓ `/health` returns 200 tanpa auth
3. ✓ `/qr` returns QR code saat belum connect
4. ✓ `/qr` returns connected info jika sudah connect
5. ✓ `/status` returns accurate connection state
6. ✓ CORS headers present di response
7. ✓ 404 untuk route tidak ada
8. ✓ Errors handled dengan format konsisten

### Technical:
1. ✓ Request/response logged dengan Pino
2. ✓ Memory usage di health check accurate
3. ✓ No memory leaks
4. ✓ Graceful shutdown implemented

---

## 🧪 Testing Scenarios

**Test via curl/Postman:**

```bash
# Test 1: Health check (no auth)
curl http://localhost:3000/health
# Expected: 200 OK dengan status healthy

# Test 2: QR endpoint (sebelum connect)
curl http://localhost:3000/qr
# Expected: 200 OK dengan base64 QR code

# Test 3: Scan QR dengan WhatsApp
# Expected: Connection established

# Test 4: QR endpoint (setelah connect)
curl http://localhost:3000/qr
# Expected: 200 OK dengan status connected + phone number

# Test 5: Status endpoint
curl http://localhost:3000/status
# Expected: 200 OK dengan connected: true + phone

# Test 6: Invalid route
curl http://localhost:3000/invalid
# Expected: 404 Not Found

# Test 7: CORS preflight
curl -X OPTIONS http://localhost:3000/status
# Expected: CORS headers present
```

---

## 🎤 Prompt for Sub-Agent

```
You are tasked with PHASE 2: API Layer - Basic Endpoints.

Context:
- PHASE 1 completed (WhatsApp client ready)
- Working directory: D:\working\gatrion\whatsapp
- WhatsApp client exports: initializeClient(), getConnectionState(), getQRCode(), isConnected()

Your tasks:
1. Create src/index.js (entry point + Express setup)
2. Create src/api/routes.js (route definitions)
3. Create src/api/controllers/qr.controller.js
4. Create src/api/controllers/status.controller.js
5. Create src/middleware/error.middleware.js

Requirements:
- Use ES modules (import/export)
- Initialize WhatsApp client before starting server
- Implement graceful shutdown (SIGTERM/SIGINT)
- CORS enabled for all origins
- Request logging with Pino
- Standardized JSON responses
- Error handling middleware
- Health check endpoint (no auth)

API Endpoints:
1. GET /health → Server health (uptime, memory)
2. GET /qr → QR code (base64) atau connection status
3. GET /status → Connection state

Response Format (Success):
{
  "success": true,
  "data": { ... }
}

Response Format (Error):
{
  "success": false,
  "error": "ErrorType",
  "message": "Human readable message"
}

DO NOT implement authentication yet (Phase 5).
DO NOT implement send message endpoints (Phase 3).

Focus on:
- Clean Express setup
- Proper error handling
- Integration dengan WhatsApp client dari Phase 1
- Health monitoring

Output:
- Complete code for all 5 files
- Use async/await for async operations
- Include error try/catch blocks
- Export proper functions

Ready? Begin Phase 2.
```

---

## 🔍 Orchestrator Review Checklist

After sub-agent completes:
- [ ] All 5 files created correctly
- [ ] Express server starts successfully
- [ ] WhatsApp client initialized before server start
- [ ] All endpoints respond correctly
- [ ] Error handling works for all scenarios
- [ ] CORS configured properly
- [ ] Logging works (Pino)
- [ ] Graceful shutdown implemented
- [ ] Health check returns accurate data
- [ ] QR endpoint integration correct
- [ ] Status endpoint reflects real state
- [ ] 404 handling works
- [ ] Memory usage tracking accurate

### Critical Points to Verify:
1. **Initialization order:** WhatsApp client BEFORE Express server
2. **Error boundaries:** All async operations wrapped
3. **Response consistency:** All responses use standard format
4. **Graceful shutdown:** Disconnect WhatsApp, close server properly

**Approval Required Before Phase 3**

---

**Status:** Ready for Execution  
**Assigned To:** Sub-Agent  
**Orchestrator:** Will review API design & error handling patterns
