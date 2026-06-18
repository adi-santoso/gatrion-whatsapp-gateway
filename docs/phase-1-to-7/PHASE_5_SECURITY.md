# PHASE 5: Security & Middleware

**Objective:** Implement API key authentication, rate limiting, dan enhanced security measures

**Estimated Time:** 25 minutes  
**Dependencies:** PHASE_4_SEND_IMAGE.md (completed)  
**Next Phase:** PHASE_6_PRODUCTION.md

---

## 📋 Tasks Checklist

- [ ] API key authentication middleware
- [ ] Rate limiting per IP/API key
- [ ] Request validation enhancement
- [ ] Security headers (helmet equivalent)
- [ ] CORS refinement
- [ ] Sanitize error responses (no stack trace in production)
- [ ] Logging enhancement (request/response)

---

## 🎯 Deliverables

### 1. src/middleware/auth.middleware.js

**Requirements:**
- Validate API key from header `x-api-key`
- Compare dengan environment variable `API_KEY`
- Constant-time comparison (prevent timing attacks)
- Return 401 jika tidak valid atau tidak ada

**Implementation:**
```javascript
export const requireAuth = (req, res, next) => {
    const apiKey = req.header('x-api-key')
    
    if (!apiKey) {
        return res.status(401).json({
            success: false,
            error: 'Unauthorized',
            message: 'API key is required'
        })
    }
    
    // Constant-time comparison
    if (!timingSafeEqual(Buffer.from(apiKey), Buffer.from(config.apiKey))) {
        return res.status(401).json({
            success: false,
            error: 'Unauthorized',
            message: 'Invalid API key'
        })
    }
    
    next()
}
```

**Timing-safe comparison:**
```javascript
import { timingSafeEqual } from 'crypto'

// Prevent timing attacks
// Both buffers must be same length
```

### 2. src/middleware/rateLimit.middleware.js

**Requirements:**
- Limit requests per IP address
- Sliding window: 20 requests per minute
- Store in memory (Map)
- Auto-cleanup old entries
- Return 429 jika limit exceeded

**Configuration:**
```javascript
const RATE_LIMIT = {
    windowMs: 60 * 1000,      // 1 minute
    maxRequests: 20,           // 20 requests per window
    message: 'Too many requests, please try again later'
}
```

**Response (429):**
```json
{
    "success": false,
    "error": "TooManyRequests",
    "message": "Too many requests, please try again later",
    "retryAfter": 45
}
```

**Storage Structure:**
```javascript
const rateLimitStore = new Map()
// Key: IP address
// Value: { count: 5, resetAt: Date }
```

### 3. src/middleware/security.middleware.js

**Security Headers:**
```javascript
export const securityHeaders = (req, res, next) => {
    // Prevent clickjacking
    res.setHeader('X-Frame-Options', 'DENY')
    
    // Prevent MIME sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff')
    
    // XSS protection
    res.setHeader('X-XSS-Protection', '1; mode=block')
    
    // Referrer policy
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
    
    // Content Security Policy
    res.setHeader('Content-Security-Policy', "default-src 'self'")
    
    next()
}
```

### 4. Update src/middleware/error.middleware.js

**Enhanced Error Handler:**

**Production Mode:**
- Hide stack traces
- Generic error messages
- Log full errors server-side

**Development Mode:**
- Show stack traces
- Detailed error messages
- Debug info

**Implementation:**
```javascript
export const errorHandler = (err, req, res, next) => {
    const isDevelopment = config.nodeEnv === 'development'
    
    // Log error (always)
    logger.error({
        error: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method
    })
    
    // Response
    const response = {
        success: false,
        error: err.name || 'InternalServerError',
        message: err.message
    }
    
    // Only include stack in development
    if (isDevelopment) {
        response.stack = err.stack
        response.details = err.details || {}
    }
    
    res.status(err.statusCode || 500).json(response)
}
```

### 5. Update src/api/routes.js

**Apply middleware to routes:**

```javascript
// Public routes (no auth)
router.get('/health', healthController)

// Protected routes (require auth)
router.get('/qr', requireAuth, qrController)
router.get('/status', requireAuth, statusController)
router.post('/send-text', requireAuth, rateLimit, validateSendText, sendTextController)
router.post('/send-image', requireAuth, rateLimit, uploadImage, sendImageController)
```

**Middleware order:**
```
1. Security headers (all routes)
2. CORS (all routes)
3. Body parser (all routes)
4. Request logging (all routes)
5. Auth (protected routes)
6. Rate limit (send endpoints)
7. Validation (specific routes)
8. Controller
```

### 6. Update src/config/env.js

**Add security config:**
```javascript
export default {
    // ... existing config
    security: {
        apiKey: process.env.API_KEY || generateSecureDefault(),
        rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW) || 60000,
        rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX) || 20,
        corsOrigin: process.env.CORS_ORIGIN || '*'
    }
}

function generateSecureDefault() {
    if (process.env.NODE_ENV === 'production') {
        throw new Error('API_KEY must be set in production')
    }
    return 'dev-key-' + Math.random().toString(36).substring(7)
}
```

### 7. Update .env.example

**Add security variables:**
```env
# API Security
API_KEY=your-secure-random-api-key-here-min-32-chars

# Rate Limiting
RATE_LIMIT_WINDOW=60000
RATE_LIMIT_MAX=20

# CORS
CORS_ORIGIN=*
# Production: CORS_ORIGIN=https://yourdomain.com
```

---

## 🔒 Security Best Practices Applied

1. ✅ **API Key Authentication**
   - Constant-time comparison
   - Required for all protected routes
   - Not logged in responses

2. ✅ **Rate Limiting**
   - Prevent abuse
   - Per-IP tracking
   - Sliding window

3. ✅ **Security Headers**
   - Prevent XSS
   - Prevent clickjacking
   - CSP policy

4. ✅ **Error Handling**
   - No stack traces in production
   - Generic error messages
   - Server-side logging only

5. ✅ **CORS**
   - Configurable origins
   - Whitelist in production

6. ✅ **Input Validation**
   - Sanitize all inputs
   - Strict type checking
   - Length limits

---

## 🔄 Middleware Stack (Final)

```
Request
  ↓
1. Security Headers
  ↓
2. CORS
  ↓
3. JSON Body Parser
  ↓
4. Request Logging
  ↓
5. Route Matching
  ↓
6. Authentication (protected routes)
  ↓
7. Rate Limiting (send routes)
  ↓
8. Validation (specific routes)
  ↓
9. Upload (image route)
  ↓
10. Controller
  ↓
11. Response
  ↓
12. Error Handler (if error)
```

---

## ✅ Acceptance Criteria

### Functional:
1. ✓ API key required untuk protected routes
2. ✓ Invalid API key returns 401
3. ✓ Rate limit enforced (429 after limit)
4. ✓ Security headers present in response
5. ✓ CORS configured correctly
6. ✓ Errors sanitized in production
7. ✓ /health endpoint remains public

### Security:
1. ✓ No timing attacks on API key check
2. ✓ No stack traces in production
3. ✓ All security headers present
4. ✓ Rate limiting per IP works
5. ✓ CORS whitelist in production

### Performance:
1. ✓ Middleware overhead < 5ms
2. ✓ Rate limit store cleanup works
3. ✓ No memory leaks from rate limit store

---

## 🧪 Testing Scenarios

```bash
# Test 1: Request without API key
curl http://localhost:3000/status
# Expected: 401 Unauthorized

# Test 2: Request with invalid API key
curl -H "x-api-key: invalid" http://localhost:3000/status
# Expected: 401 Unauthorized

# Test 3: Request with valid API key
curl -H "x-api-key: your-api-key" http://localhost:3000/status
# Expected: 200 OK

# Test 4: Health check (public)
curl http://localhost:3000/health
# Expected: 200 OK (no auth required)

# Test 5: Rate limiting
# Send 25 requests quickly
for i in {1..25}; do
  curl -H "x-api-key: your-api-key" \
       -X POST http://localhost:3000/send-text \
       -H "Content-Type: application/json" \
       -d '{"to":"628123456789","message":"Test '$i'"}'
done
# Expected: First 20 succeed, then 429 Too Many Requests

# Test 6: Security headers
curl -I http://localhost:3000/health
# Expected: X-Frame-Options, X-Content-Type-Options, etc. present

# Test 7: CORS preflight
curl -X OPTIONS http://localhost:3000/status \
  -H "Origin: https://example.com" \
  -H "Access-Control-Request-Method: GET"
# Expected: CORS headers present

# Test 8: Error in production mode
# Set NODE_ENV=production
# Trigger error
# Expected: No stack trace in response
```

---

## 🎤 Prompt for Sub-Agent

```
You are tasked with PHASE 5: Security & Middleware.

Context:
- PHASE 4 completed (send image working)
- Working directory: D:\working\gatrion\whatsapp
- All endpoints functional, now add security

Your tasks:
1. Create src/middleware/auth.middleware.js
2. Create src/middleware/rateLimit.middleware.js
3. Create src/middleware/security.middleware.js
4. Update src/middleware/error.middleware.js
5. Update src/api/routes.js (apply middleware)
6. Update src/config/env.js (add security config)
7. Update .env.example (add security vars)

Requirements:

API Key Authentication:
- Header: x-api-key
- Constant-time comparison (crypto.timingSafeEqual)
- 401 if missing or invalid
- Apply to: /qr, /status, /send-text, /send-image
- /health remains public

Rate Limiting:
- 20 requests per minute per IP
- Store in Map (in-memory)
- Auto-cleanup old entries
- 429 Too Many Requests with retryAfter
- Apply to: /send-text, /send-image

Security Headers:
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- X-XSS-Protection: 1; mode=block
- Referrer-Policy: strict-origin-when-cross-origin
- Content-Security-Policy: default-src 'self'
- Apply to all routes

Error Handler Enhancement:
- Production: hide stack traces
- Development: show stack traces
- Always log full error server-side
- Generic messages in production

Route Protection:
Public:
- GET /health

Protected (auth required):
- GET /qr
- GET /status
- POST /send-text (auth + rate limit)
- POST /send-image (auth + rate limit)

Middleware Order:
1. Security headers
2. CORS
3. Body parser
4. Request logging
5. Routes
   - Auth (if protected)
   - Rate limit (if send endpoint)
   - Validation
   - Controller
6. Error handler

Configuration:
Add to env.js:
- security.apiKey
- security.rateLimitWindow (60000)
- security.rateLimitMax (20)
- security.corsOrigin

Add to .env.example:
- API_KEY
- RATE_LIMIT_WINDOW
- RATE_LIMIT_MAX
- CORS_ORIGIN

Key Implementations:
1. Timing-safe comparison:
   import { timingSafeEqual } from 'crypto'

2. Rate limit storage:
   const store = new Map()
   // Key: IP, Value: { count, resetAt }

3. Error handling:
   if (process.env.NODE_ENV === 'production') {
       delete response.stack
   }

Output:
- Complete implementation
- Apply middleware in correct order
- Test protection works
- No breaking changes to existing functionality

Ready? Begin Phase 5.
```

---

## 🔍 Orchestrator Review Checklist

After sub-agent completes:
- [ ] All files created/updated
- [ ] API key auth works
- [ ] Timing-safe comparison used
- [ ] Rate limiting works
- [ ] Rate limit cleanup works
- [ ] Security headers present
- [ ] Error handler enhanced
- [ ] Production mode hides sensitive data
- [ ] /health remains public
- [ ] All protected routes require auth
- [ ] Middleware order correct
- [ ] No performance degradation
- [ ] Rate limit store doesn't leak memory

### Critical Points to Verify:
1. **API Key Comparison:** MUST use `timingSafeEqual`
2. **Rate Limit Cleanup:** Store must cleanup old entries
3. **Error Sanitization:** No stack traces in production
4. **Middleware Order:** Correct sequence applied
5. **Public Endpoints:** /health accessible without auth

### Security Audit:
```bash
# Check headers
curl -I http://localhost:3000/health | grep "X-"

# Timing attack test (should take same time)
time curl -H "x-api-key: wrong" http://localhost:3000/status
time curl -H "x-api-key: correct" http://localhost:3000/status

# Rate limit test
# Should block after 20 requests
```

**Approval Required Before Phase 6**

---

**Status:** Ready for Execution  
**Assigned To:** Sub-Agent  
**Orchestrator:** Will audit security measures thoroughly
