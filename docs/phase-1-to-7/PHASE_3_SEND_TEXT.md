# PHASE 3: Send Text Messages

**Objective:** Implement POST endpoint untuk mengirim text messages dengan WhatsApp formatting

**Estimated Time:** 25 minutes  
**Dependencies:** PHASE_2_API_BASIC.md (completed)  
**Next Phase:** PHASE_4_SEND_IMAGE.md

---

## 📋 Tasks Checklist

- [ ] Create POST /send-text endpoint
- [ ] Phone number validation & formatting
- [ ] WhatsApp text formatting support
- [ ] Message delivery handling
- [ ] Queue management untuk multiple messages
- [ ] Request validation middleware
- [ ] Error handling untuk failed messages

---

## 🎯 Deliverables

### 1. src/api/controllers/send.controller.js

**Endpoint:** `POST /send-text`

**Request Body:**
```json
{
    "to": "08123456789",
    "message": "*Bold text* _Italic text_ ~Strike~ ```Monospace```"
}
```

**Alternative formats supported:**
```json
{
    "to": "628123456789",
    "message": "Hello"
}

{
    "to": "+628123456789",
    "message": "Hello"
}

{
    "to": "628123456789@s.whatsapp.net",
    "message": "Hello"
}
```

**Response Success (200):**
```json
{
    "success": true,
    "data": {
        "messageId": "3EB0123456789ABCDEF",
        "to": "628123456789@s.whatsapp.net",
        "status": "sent",
        "timestamp": "2026-06-17T10:30:00.000Z"
    }
}
```

**Response Error - Not Connected (503):**
```json
{
    "success": false,
    "error": "ServiceUnavailable",
    "message": "WhatsApp not connected. Please scan QR code first."
}
```

**Response Error - Invalid Phone (400):**
```json
{
    "success": false,
    "error": "ValidationError",
    "message": "Invalid phone number format"
}
```

**Response Error - Failed to Send (500):**
```json
{
    "success": false,
    "error": "MessageSendError",
    "message": "Failed to send message: [error detail]"
}
```

### 2. WhatsApp Formatting Support

**Markdown-like syntax:**
```
*bold*          → Bold text
_italic_        → Italic text
~strikethrough~ → Strikethrough
```monospace```  → Monospace

Example:
"*Hello* _World_!" → "Hello World!" (dengan formatting)
```

**Implementation:**
- Baileys otomatis handle formatting ini
- No need untuk convert, kirim as-is
- WhatsApp client akan render dengan benar

### 3. src/middleware/validation.middleware.js

**Create validation middleware:**

```javascript
validateSendText(req, res, next)
```

**Validations:**
1. ✓ `to` field required
2. ✓ `to` is string
3. ✓ `message` field required
4. ✓ `message` is string
5. ✓ `message` tidak kosong (trim)
6. ✓ `message` max length 65536 chars (WhatsApp limit)

**Response jika validasi gagal (400):**
```json
{
    "success": false,
    "error": "ValidationError",
    "message": "Field 'message' is required",
    "field": "message"
}
```

### 4. Update src/whatsapp/client.js

**Add new method:**
```javascript
async sendTextMessage(to, message)
```

**Requirements:**
- Format phone number ke JID
- Check connection state
- Send message using Baileys
- Return message info (id, status)
- Handle errors (number not registered, etc.)

**Example Usage:**
```javascript
const result = await sendTextMessage('628123456789', 'Hello *World*')
// Returns: { id: '3EB0...', status: 'sent' }
```

### 5. Message Queue Handling

**Problem:** Multiple simultaneous requests
**Solution:** Internal queue dengan delay

**Implementation hints:**
- Simple array-based queue
- Process 1 message at a time
- Small delay between messages (100-200ms)
- Prevent rate limiting dari WhatsApp

---

## 🔄 Flow Diagram

```
POST /send-text
  ↓
Validation middleware
  ↓
Is WhatsApp connected?
  ├─ NO → Return 503 error
  └─ YES ↓
Format phone number
  ↓
Validate JID format
  ↓
Add to queue
  ↓
Process queue
  ↓
Send via Baileys
  ↓
Return message ID
```

---

## 🔍 Phone Number Validation

**Valid formats:**
```
08123456789        → 628123456789@s.whatsapp.net
628123456789       → 628123456789@s.whatsapp.net
+628123456789      → 628123456789@s.whatsapp.net
628123456789@s.whatsapp.net → 628123456789@s.whatsapp.net (no change)
```

**Invalid formats:**
```
123 (too short)
abc123 (contains letters)
+1234 (unknown country code)
```

**Validation rules:**
- Must start with country code (62 untuk Indonesia)
- Numeric only (setelah format)
- Length: 10-15 digits
- Auto-convert 08xxx to 628xxx

---

## ✅ Acceptance Criteria

### Functional:
1. ✓ Text message terkirim dengan formatting correct
2. ✓ Phone number validation works untuk semua format
3. ✓ Error handling untuk WhatsApp not connected
4. ✓ Error handling untuk invalid phone number
5. ✓ Error handling untuk unregistered number
6. ✓ Message queue prevents rate limiting
7. ✓ Response includes message ID

### Technical:
1. ✓ Request validation comprehensive
2. ✓ No message loss during high load
3. ✓ Proper error messages
4. ✓ Logging untuk sent messages
5. ✓ No memory leaks dari queue

---

## 🧪 Testing Scenarios

```bash
# Test 1: Send simple text
curl -X POST http://localhost:3000/send-text \
  -H "Content-Type: application/json" \
  -d '{
    "to": "628123456789",
    "message": "Hello from WhatsApp Gateway!"
  }'
# Expected: 200 OK dengan message ID

# Test 2: Send formatted text
curl -X POST http://localhost:3000/send-text \
  -H "Content-Type: application/json" \
  -d '{
    "to": "08123456789",
    "message": "*Bold* _Italic_ ~Strike~"
  }'
# Expected: 200 OK, message diterima dengan formatting

# Test 3: Invalid phone
curl -X POST http://localhost:3000/send-text \
  -H "Content-Type: application/json" \
  -d '{
    "to": "123",
    "message": "Test"
  }'
# Expected: 400 ValidationError

# Test 4: Missing message
curl -X POST http://localhost:3000/send-text \
  -H "Content-Type: application/json" \
  -d '{
    "to": "628123456789"
  }'
# Expected: 400 ValidationError

# Test 5: Empty message
curl -X POST http://localhost:3000/send-text \
  -H "Content-Type: application/json" \
  -d '{
    "to": "628123456789",
    "message": ""
  }'
# Expected: 400 ValidationError

# Test 6: WhatsApp not connected
# (Disconnect WhatsApp terlebih dahulu)
curl -X POST http://localhost:3000/send-text \
  -H "Content-Type: application/json" \
  -d '{
    "to": "628123456789",
    "message": "Test"
  }'
# Expected: 503 ServiceUnavailable

# Test 7: Multiple messages (queue test)
# Send 5 requests simultaneously
# Expected: All delivered, no rate limit errors
```

---

## 🎤 Prompt for Sub-Agent

```
You are tasked with PHASE 3: Send Text Messages.

Context:
- PHASE 2 completed (API server running)
- Working directory: D:\working\gatrion\whatsapp
- WhatsApp client available from Phase 1

Your tasks:
1. Create src/api/controllers/send.controller.js
2. Create src/middleware/validation.middleware.js
3. Update src/whatsapp/client.js (add sendTextMessage method)
4. Update src/api/routes.js (add POST /send-text route)

Requirements:
- POST /send-text endpoint
- Request validation (to, message fields)
- Phone number formatting (08xxx, 628xxx, +628xxx → JID)
- WhatsApp text formatting support (*bold*, _italic_, ~strike~, ```mono```)
- Check connection before sending
- Message queue dengan delay (prevent rate limit)
- Return message ID in response
- Comprehensive error handling

Request Body:
{
  "to": "08123456789",
  "message": "Text with *formatting*"
}

Response (Success):
{
  "success": true,
  "data": {
    "messageId": "...",
    "to": "628xxx@s.whatsapp.net",
    "status": "sent",
    "timestamp": "..."
  }
}

Validations:
- to: required, string, valid phone format
- message: required, string, non-empty, max 65536 chars

Error Codes:
- 400: Validation error
- 503: WhatsApp not connected
- 500: Send failed

Phone Number Handling:
- 08xxx → 628xxx@s.whatsapp.net
- 628xxx → 628xxx@s.whatsapp.net
- +628xxx → 628xxx@s.whatsapp.net
- Already JID → no change

Message Queue:
- Process sequentially
- 100-200ms delay between messages
- Handle concurrent requests

Use Baileys sendMessage method:
await sock.sendMessage(jid, { text: message })

Output:
- Complete implementation
- Update existing files as needed
- Include error handling
- Add queue logic

Ready? Begin Phase 3.
```

---

## 🔍 Orchestrator Review Checklist

After sub-agent completes:
- [ ] All files created/updated
- [ ] POST /send-text endpoint works
- [ ] Phone validation comprehensive
- [ ] All phone formats supported
- [ ] WhatsApp formatting preserved
- [ ] Message queue implemented
- [ ] Error handling complete
- [ ] Request validation works
- [ ] Connection check works
- [ ] Message ID returned correctly
- [ ] No rate limiting issues
- [ ] Logging implemented

### Critical Points to Verify:
1. **Queue implementation:** Sequential processing dengan delay
2. **Phone formatting:** All formats convert correctly
3. **Error messages:** Clear dan actionable
4. **WhatsApp formatting:** Bold, italic, strike, mono work
5. **Message ID:** Actual Baileys message ID returned

**Approval Required Before Phase 4**

---

**Status:** Ready for Execution  
**Assigned To:** Sub-Agent  
**Orchestrator:** Will test message delivery & formatting thoroughly
