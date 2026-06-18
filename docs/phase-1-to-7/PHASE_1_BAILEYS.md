# PHASE 1: Baileys Core Integration

**Objective:** Implement WhatsApp client using Baileys with file-based authentication and session management

**Estimated Time:** 30 minutes  
**Dependencies:** PHASE_0_SETUP.md (completed)  
**Next Phase:** PHASE_2_API_BASIC.md

---

## 📋 Tasks Checklist

- [ ] Create Baileys client initialization
- [ ] Implement file-based auth state
- [ ] QR code generation (terminal + base64)
- [ ] Connection lifecycle handlers
- [ ] Auto-reconnect logic
- [ ] Session persistence
- [ ] Basic event logging

---

## 🎯 Deliverables

### 1. src/whatsapp/client.js

**Requirements:**
- Initialize Baileys socket with `useMultiFileAuthState`
- QR code generation (terminal + store base64 for API)
- Connection state management (connecting, connected, disconnected)
- Event emitter for connection events
- Singleton pattern (hanya 1 instance)

**Key Features:**
```javascript
- initializeClient() // Start WhatsApp client
- getConnectionState() // Return current state
- getQRCode() // Get QR as base64 image
- isConnected() // Boolean check
- disconnect() // Graceful shutdown
```

**Configuration:**
```javascript
const sock = makeWASocket({
    auth: state,
    printQRInTerminal: true,
    syncFullHistory: false,          // Memory optimization
    markOnlineOnConnect: false,       // Stealth mode
    generateHighQualityLinkPreview: false,
    browser: ['WhatsApp Gateway', 'Chrome', '10.0'],
    logger: pino({ level: 'info' })
})
```

### 2. src/whatsapp/handlers.js

**Requirements:**
- Handle `connection.update` event
  - QR generation
  - Connection open
  - Connection close
  - Reconnect logic
- Handle `creds.update` event (auto-save)
- Handle `messages.upsert` (untuk logging, optional)

**Connection States:**
```javascript
{
    state: 'connecting' | 'connected' | 'disconnected' | 'qr_required',
    qr: 'base64-string' | null,
    phone: '628xxx' | null,
    timestamp: Date
}
```

### 3. src/whatsapp/utils.js

**Helper Functions:**
```javascript
- formatPhoneNumber(phone) // Convert ke format WhatsApp JID
- validatePhoneNumber(phone) // Validasi format nomor
- isValidJid(jid) // Cek JID valid
```

**Format examples:**
```
Input: "08123456789" → Output: "628123456789@s.whatsapp.net"
Input: "628123456789" → Output: "628123456789@s.whatsapp.net"
Input: "+628123456789" → Output: "628123456789@s.whatsapp.net"
```

### 4. src/config/env.js

**Requirements:**
```javascript
import dotenv from 'dotenv'
dotenv.config()

export default {
    port: process.env.PORT || 3000,
    nodeEnv: process.env.NODE_ENV || 'development',
    apiKey: process.env.API_KEY,
    whatsapp: {
        sessionPath: process.env.WA_SESSION_PATH || './auth_info_baileys',
        phoneNumber: process.env.WA_PHONE_NUMBER || ''
    },
    logging: {
        level: process.env.LOG_LEVEL || 'info'
    }
}
```

---

## 🔄 Flow Diagram

```
START
  ↓
initializeClient()
  ↓
Load auth state (file-based)
  ↓
Is session valid? 
  ├─ YES → Connect (skip QR)
  └─ NO → Generate QR
         ↓
      Wait for scan
         ↓
      Save creds
         ↓
      Connected
         ↓
      Ready to send messages
```

---

## ✅ Acceptance Criteria

### Functional:
1. ✓ QR code muncul di terminal saat pertama kali run
2. ✓ QR code tersedia sebagai base64 untuk API
3. ✓ Setelah scan, session tersimpan di `auth_info_baileys/`
4. ✓ Restart aplikasi → auto-connect tanpa QR
5. ✓ Connection state dapat diquery kapan saja
6. ✓ Graceful disconnect saat aplikasi shutdown

### Technical:
1. ✓ No memory leaks (proper event listener cleanup)
2. ✓ Error handling untuk network issues
3. ✓ Retry logic untuk connection failures
4. ✓ Logging dengan Pino (structured logs)

---

## 🧪 Testing Scenarios

**Manual Test:**
```bash
# Test 1: First run (no session)
npm run dev
# Expected: QR code muncul di terminal

# Test 2: Scan QR dengan WhatsApp
# Expected: "Connection opened" log, files muncul di auth_info_baileys/

# Test 3: Restart aplikasi
npm run dev
# Expected: Auto-connect tanpa QR, langsung "Connected"

# Test 4: Check connection state
# Expected: State object dengan phone number
```

---

## 🎤 Prompt for Sub-Agent

```
You are tasked with PHASE 1: Baileys Core Integration.

Context:
- PHASE 0 completed (project structure ready)
- Working directory: D:\working\gatrion\whatsapp
- Package.json already has Baileys v7.0.0-rc13

Your tasks:
1. Create src/config/env.js for environment configuration
2. Create src/whatsapp/client.js with Baileys initialization
3. Create src/whatsapp/handlers.js for connection events
4. Create src/whatsapp/utils.js for phone number formatting

Requirements:
- Use ES modules (import/export)
- File-based auth with useMultiFileAuthState
- QR code: terminal + base64 storage
- Singleton pattern for client
- Connection state management
- Auto-reconnect on disconnect
- Memory optimization (syncFullHistory: false)
- Proper error handling
- Structured logging with Pino

Key Features:
- initializeClient() → Start WhatsApp
- getConnectionState() → Return { state, qr, phone }
- getQRCode() → Return base64 QR image
- isConnected() → Boolean
- disconnect() → Cleanup

Phone formatting:
- Support: 08xxx, 628xxx, +628xxx
- Output: 628xxx@s.whatsapp.net

DO NOT create Express server yet (that's Phase 2).
Focus ONLY on WhatsApp client core functionality.

Output:
- Complete code for all 4 files
- Include inline comments for critical parts
- Export proper functions/objects

Ready? Begin Phase 1.
```

---

## 🔍 Orchestrator Review Checklist

After sub-agent completes:
- [ ] All 4 files created
- [ ] Baileys client initializes correctly
- [ ] QR code generation works (both terminal & base64)
- [ ] Session persistence functional
- [ ] Auto-reconnect implemented
- [ ] Phone number formatting correct
- [ ] Error handling comprehensive
- [ ] No hardcoded values (use env config)
- [ ] Singleton pattern properly implemented
- [ ] Memory optimizations in place

### Critical Points to Verify:
1. **Session path** matches .env configuration
2. **QR refresh** setiap 60 detik jika tidak di-scan
3. **Credentials save** otomatis di `creds.update`
4. **Event cleanup** saat disconnect untuk avoid memory leak

**Approval Required Before Phase 2**

---

**Status:** Ready for Execution  
**Assigned To:** Sub-Agent  
**Orchestrator:** Will review connection logic & session handling
