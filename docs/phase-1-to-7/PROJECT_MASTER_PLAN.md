# WhatsApp Gateway Service - Master Plan

**Project Name:** WhatsApp Gateway Service with Baileys v7  
**Created:** 2026-06-17  
**Single Instance - Minimal Feature Set**

## 🎯 Project Goals

Membuat WhatsApp Gateway Service yang:
1. ✅ Scan QR Code untuk authentication
2. ✅ Send text messages dengan WhatsApp formatting
3. ✅ Send images tanpa menyimpan di server (stream-based)
4. ✅ Session persist (auto-reconnect setelah restart)
5. ✅ RESTful API untuk integrasi
6. ✅ Resource efficient (~100-150 MB RAM)

## 📋 Tech Stack

- **Runtime:** Node.js 20+
- **WhatsApp Client:** Baileys v7.0.0-rc13
- **API Framework:** Express.js
- **Session Storage:** File-based (useMultiFileAuthState)
- **Image Handling:** Multer (memory storage)
- **Logging:** Pino
- **QR Code:** qrcode-terminal + qrcode (base64)
- **Process Manager:** PM2 (production)

## 🏗️ Architecture

```
┌─────────────────────────────────────────┐
│       WhatsApp Gateway Service          │
│  ┌───────────────────────────────────┐  │
│  │      Express REST API             │  │
│  │  - QR Endpoint                    │  │
│  │  - Status Check                   │  │
│  │  - Send Text                      │  │
│  │  - Send Image                     │  │
│  └──────────────┬────────────────────┘  │
│                 │                        │
│  ┌──────────────▼────────────────────┐  │
│  │    Baileys WhatsApp Client        │  │
│  │  - Connection Manager             │  │
│  │  - Event Handlers                 │  │
│  │  - Message Processor              │  │
│  └──────────────┬────────────────────┘  │
│                 │                        │
│  ┌──────────────▼────────────────────┐  │
│  │    File-based Session Storage     │  │
│  │  ./auth_info_baileys/             │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

## 📂 Project Structure

```
whatsapp-gateway/
├── src/
│   ├── index.js                 # Entry point
│   ├── config/
│   │   └── env.js              # Environment configuration
│   ├── whatsapp/
│   │   ├── client.js           # Baileys client initialization
│   │   ├── handlers.js         # Event handlers
│   │   └── utils.js            # Helper functions
│   ├── api/
│   │   ├── routes.js           # Route definitions
│   │   └── controllers/
│   │       ├── qr.controller.js
│   │       ├── status.controller.js
│   │       └── send.controller.js
│   └── middleware/
│       ├── auth.middleware.js   # API key validation
│       ├── error.middleware.js  # Error handling
│       └── upload.middleware.js # Multer config
├── auth_info_baileys/          # Session storage (gitignore)
├── logs/                       # Application logs (gitignore)
├── tests/
│   └── api.test.js
├── .env.example
├── .env                        # gitignore
├── .gitignore
├── package.json
├── ecosystem.config.js         # PM2 config
└── README.md
```

## 🎬 Development Phases

### **PHASE 0: Project Setup** ✓
- Initialize project structure
- Setup package.json
- Create folder structure
- Configure .gitignore & environment

### **PHASE 1: Baileys Core Integration**
- Initialize Baileys client with file-based auth
- Implement QR code generation
- Handle connection lifecycle
- Implement auto-reconnect
- Session persistence

### **PHASE 2: API Layer - Basic**
- Setup Express server
- Create QR endpoint (GET /qr)
- Create status endpoint (GET /status)
- Basic error handling
- CORS configuration

### **PHASE 3: Send Messages**
- Send text endpoint (POST /send-text)
- WhatsApp formatting support (*bold*, _italic_, ~strike~)
- Phone number validation & formatting
- Message queue handling

### **PHASE 4: Send Images**
- Send image endpoint (POST /send-image)
- Multer memory storage setup
- Stream-based upload (no disk write)
- Image with caption support
- File type validation

### **PHASE 5: Security & Middleware**
- API key authentication
- Rate limiting
- Request validation
- Enhanced error handling
- Logging middleware

### **PHASE 6: Production Ready**
- PM2 configuration
- Graceful shutdown
- Health check endpoint
- Performance monitoring
- Documentation

### **PHASE 7: Testing & Optimization**
- API integration tests
- Memory profiling
- Performance optimization
- Load testing

## 🔄 Phase Execution Protocol

Setiap fase memiliki file prompt terpisah:
- `PHASE_0_SETUP.md` → Project initialization
- `PHASE_1_BAILEYS.md` → WhatsApp client core
- `PHASE_2_API_BASIC.md` → Basic API endpoints
- `PHASE_3_SEND_TEXT.md` → Text messaging
- `PHASE_4_SEND_IMAGE.md` → Image messaging
- `PHASE_5_SECURITY.md` → Security & middleware
- `PHASE_6_PRODUCTION.md` → Production preparation
- `PHASE_7_TESTING.md` → Testing & optimization

## 📊 Success Criteria

### Functional Requirements
- [x] QR code dapat di-generate dan di-scan
- [x] Session tersimpan dan auto-reconnect
- [x] Text message terkirim dengan formatting
- [x] Image terkirim tanpa save ke disk
- [x] API documented dan easy to use

### Non-Functional Requirements
- [x] RAM usage ≤ 150 MB (normal operation)
- [x] Response time < 500ms (text), < 2s (image)
- [x] Uptime > 99% (dengan PM2)
- [x] Secure API dengan authentication
- [x] Proper error handling & logging

## 🚀 How to Execute

**Orchestrator (You) will:**
1. Review master plan
2. Delegate each phase to sub-agent dengan prompt file
3. Review hasil setiap fase
4. Approve atau request revision
5. Handle critical points & integration issues
6. Final quality check

**Sub-Agent will:**
1. Receive phase prompt file
2. Execute implementation sesuai spec
3. Return completed code
4. Wait for orchestrator review

## 📝 Notes

- Each phase builds upon previous phase
- No phase can start until previous is approved
- Orchestrator has final say on all implementations
- Critical security & performance checks by orchestrator only

---

**Status:** Ready for Phase 0 Execution  
**Next Action:** Create PHASE_0_SETUP.md and delegate to sub-agent
