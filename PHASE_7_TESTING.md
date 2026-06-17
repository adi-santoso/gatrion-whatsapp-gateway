# PHASE 7: Testing & Optimization

**Objective:** Create comprehensive tests, performance benchmarks, dan optimizations

**Estimated Time:** 30 minutes  
**Dependencies:** PHASE_6_PRODUCTION.md (completed)  
**Next Phase:** None (Final Phase)

---

## 📋 Tasks Checklist

- [ ] API integration tests
- [ ] Connection lifecycle tests
- [ ] Memory profiling
- [ ] Performance benchmarking
- [ ] Load testing
- [ ] Error scenario tests
- [ ] Documentation of test results
- [ ] Optimization recommendations

---

## 🎯 Deliverables

### 1. tests/api.test.js

**Test Framework:** Node.js built-in test runner (no external deps)

**Test Suites:**

#### A. Health Check Tests
```javascript
// Test: GET /health returns 200
// Test: Health response has required fields
// Test: Memory usage is reasonable (<200 MB)
// Test: Uptime is positive number
```

#### B. Authentication Tests
```javascript
// Test: Protected routes require API key
// Test: Invalid API key returns 401
// Test: Valid API key allows access
// Test: Missing API key returns 401
```

#### C. QR Code Tests
```javascript
// Test: GET /qr returns QR when not connected
// Test: GET /qr returns status when connected
// Test: QR is valid base64 image
```

#### D. Status Tests
```javascript
// Test: GET /status returns connection state
// Test: Status response has required fields
// Test: Phone number present when connected
```

#### E. Send Text Tests
```javascript
// Test: POST /send-text requires 'to' field
// Test: POST /send-text requires 'message' field
// Test: Invalid phone number returns 400
// Test: Empty message returns 400
// Test: WhatsApp not connected returns 503
// Test: Valid request returns message ID (when connected)
// Test: Formatting characters preserved (*bold*, _italic_)
```

#### F. Send Image Tests
```javascript
// Test: POST /send-image requires image file
// Test: POST /send-image requires 'to' field
// Test: Invalid file type returns 400
// Test: File too large returns 400
// Test: Valid request returns message ID (when connected)
// Test: Caption with formatting works
```

#### G. Rate Limiting Tests
```javascript
// Test: 21st request returns 429
// Test: Rate limit resets after window
// Test: Different IPs have separate limits
```

#### H. Security Tests
```javascript
// Test: Security headers present
// Test: CORS headers present
// Test: No stack trace in production mode
```

### 2. tests/memory.test.js

**Memory Leak Detection:**
```javascript
// Test: Memory stable over 100 text messages
// Test: Memory stable over 20 image uploads
// Test: Memory returns to baseline after activity
// Test: No retained objects after disconnect
```

**Profiling:**
- Heap snapshots before/after operations
- Check for retained closures
- Verify event listeners cleaned up
- Monitor buffer disposal

### 3. tests/performance.test.js

**Benchmarks:**

#### Response Time Targets:
```javascript
// GET /health: < 10ms
// GET /status: < 50ms
// GET /qr: < 100ms
// POST /send-text: < 500ms
// POST /send-image (5MB): < 3000ms
```

#### Throughput Targets:
```javascript
// Text messages: 10+ per second
// Images: 2+ per second
```

### 4. tests/load.test.js

**Load Test Scenarios:**

#### Scenario 1: Sustained Text Messages
- Duration: 5 minutes
- Rate: 5 messages/second
- Expected: All delivered, no errors

#### Scenario 2: Burst Traffic
- Send 50 messages in 10 seconds
- Expected: Queue handles gracefully

#### Scenario 3: Mixed Load
- 50% text, 50% images
- Duration: 3 minutes
- Expected: No failures, stable memory

### 5. tests/error-scenarios.test.js

**Error Handling Tests:**
```javascript
// Test: Handle WhatsApp disconnection during send
// Test: Handle invalid JID
// Test: Handle unregistered number
// Test: Handle network timeout
// Test: Handle malformed request body
// Test: Handle corrupted image file
// Test: Handle rate limit exceeded
```

### 6. scripts/benchmark.js

**Automated Benchmark Script:**
```javascript
// Run all performance tests
// Generate report
// Compare with baseline
// Flag regressions
```

**Output:**
```
WhatsApp Gateway Benchmark Results
===================================
Health Check:        8ms    ✓
Status Check:       42ms    ✓
QR Generation:      87ms    ✓
Send Text:         234ms    ✓
Send Image (5MB): 2156ms    ✓

Memory Usage:
Initial:     95 MB
Peak:       187 MB
Final:      102 MB   ✓

Throughput:
Text:   12 msg/s     ✓
Image:   3 msg/s     ✓
```

### 7. PERFORMANCE.md

**Document:**
- Benchmark methodology
- Test environment specs
- Baseline results
- Performance tips
- Known bottlenecks
- Optimization opportunities

---

## 🧪 Test Execution

### Run All Tests:
```bash
npm test
```

### Run Specific Suite:
```bash
node tests/api.test.js
node tests/memory.test.js
node tests/performance.test.js
```

### Memory Profiling:
```bash
node --expose-gc --inspect tests/memory.test.js
# Open chrome://inspect in Chrome
# Take heap snapshots
```

### Load Testing:
```bash
# Option 1: Custom script
node tests/load.test.js

# Option 2: External tool (optional)
# Install: npm install -g autocannon
autocannon -c 10 -d 60 -m POST \
  -H "x-api-key: your-key" \
  -H "Content-Type: application/json" \
  -b '{"to":"628xxx","message":"Test"}' \
  http://localhost:3000/send-text
```

---

## 📊 Performance Baselines

### Response Times (Target vs Acceptable)

| Endpoint         | Target  | Acceptable | Critical |
|------------------|---------|------------|----------|
| GET /health      | < 10ms  | < 20ms     | < 50ms   |
| GET /status      | < 50ms  | < 100ms    | < 200ms  |
| GET /qr          | < 100ms | < 200ms    | < 500ms  |
| POST /send-text  | < 500ms | < 1000ms   | < 2000ms |
| POST /send-image | < 3s    | < 5s       | < 10s    |

### Memory Usage

| State               | Target   | Acceptable | Critical |
|---------------------|----------|------------|----------|
| Idle (connected)    | 80-100MB | < 150MB    | < 200MB  |
| Active (sending)    | 100-150MB| < 200MB    | < 300MB  |
| Peak (image upload) | 150-200MB| < 300MB    | < 400MB  |

### Throughput

| Operation    | Target | Acceptable | Notes                    |
|--------------|--------|------------|--------------------------|
| Text msgs/s  | 10+    | 5+         | With queue delay         |
| Images/s     | 2+     | 1+         | 5MB images               |
| Concurrent   | 20     | 10         | Active connections       |

---

## 🔍 Optimization Opportunities

### 1. Message Queue
**Current:** Simple array with delay
**Optimization:** Bull queue with Redis (future)
**Benefit:** Persistence, better scaling

### 2. Session Storage
**Current:** File-based
**Optimization:** Redis-based (future)
**Benefit:** Multi-instance support

### 3. Image Processing
**Current:** Direct buffer upload
**Optimization:** Image compression before send
**Benefit:** Faster upload, less bandwidth

### 4. Connection Pool
**Current:** Single connection
**Optimization:** Multiple accounts (future)
**Benefit:** Higher throughput

### 5. Caching
**Current:** None
**Optimization:** Cache connection state
**Benefit:** Faster status checks

---

## ✅ Acceptance Criteria

### Testing:
1. ✓ All API endpoints have tests
2. ✓ Error scenarios covered
3. ✓ Memory profiling done
4. ✓ Performance benchmarks run
5. ✓ Load tests pass
6. ✓ All tests documented

### Performance:
1. ✓ Response times within targets
2. ✓ Memory usage stable
3. ✓ No memory leaks detected
4. ✓ Throughput meets requirements
5. ✓ Rate limiting works under load

### Quality:
1. ✓ 90%+ test coverage (critical paths)
2. ✓ No regressions from optimizations
3. ✓ Documented bottlenecks
4. ✓ Clear performance baseline

---

## 🎤 Prompt for Sub-Agent

```
You are tasked with PHASE 7: Testing & Optimization (FINAL PHASE).

Context:
- PHASE 6 completed (production ready)
- Working directory: D:\working\gatrion\whatsapp
- All features implemented, now test thoroughly

Your tasks:
1. Create tests/api.test.js (comprehensive API tests)
2. Create tests/memory.test.js (memory leak detection)
3. Create tests/performance.test.js (benchmarks)
4. Create tests/load.test.js (load testing)
5. Create tests/error-scenarios.test.js (error handling)
6. Create scripts/benchmark.js (automated benchmarking)
7. Create PERFORMANCE.md (documentation)
8. Update package.json (add test scripts)

Requirements:

Use Node.js built-in test runner (no Jest/Mocha):
import { test, describe } from 'node:test'
import assert from 'node:assert'

Test Coverage:
- All endpoints (health, qr, status, send-text, send-image)
- Authentication & authorization
- Rate limiting
- Input validation
- Error handling
- Connection lifecycle
- Memory stability
- Performance benchmarks

Memory Tests:
- Run 100 text messages, check memory delta
- Run 20 image uploads, check memory delta
- Baseline vs peak vs return
- Flag leaks if memory doesn't return to ±20MB baseline

Performance Tests:
Target response times:
- /health: < 10ms
- /status: < 50ms
- /qr: < 100ms
- /send-text: < 500ms
- /send-image: < 3000ms

Load Tests:
- Sustained: 5 msg/s for 5 minutes
- Burst: 50 messages in 10 seconds
- Mixed: Text + images for 3 minutes

Error Scenarios:
- WhatsApp disconnected during send
- Invalid phone numbers
- Malformed requests
- File type/size violations
- Network timeouts
- Rate limit exceeded

Benchmark Script:
Run all tests, generate report:
- Response times
- Memory usage
- Throughput
- Pass/fail status
- Comparison with baseline

PERFORMANCE.md:
Document:
- Test methodology
- Environment specs
- Baseline results
- Bottleneck analysis
- Optimization suggestions

Package.json Scripts:
"test": "node --test tests/*.test.js"
"test:api": "node tests/api.test.js"
"test:memory": "node --expose-gc tests/memory.test.js"
"test:performance": "node tests/performance.test.js"
"test:load": "node tests/load.test.js"
"benchmark": "node scripts/benchmark.js"

Key Points:
- Use native Node.js test runner
- No external test frameworks
- Async/await for all async operations
- Clear test descriptions
- Helpful error messages
- Document all findings

Output:
- Complete test suite
- Benchmark script
- Performance documentation
- Test results summary
- Optimization recommendations

Ready? Begin Phase 7 (FINAL PHASE).
```

---

## 🔍 Orchestrator Review Checklist

After sub-agent completes:
- [ ] All test files created
- [ ] Tests run successfully
- [ ] API coverage comprehensive
- [ ] Memory tests detect leaks
- [ ] Performance benchmarks complete
- [ ] Load tests pass
- [ ] Error scenarios covered
- [ ] Benchmark script works
- [ ] PERFORMANCE.md complete
- [ ] Package.json scripts added
- [ ] Test results documented
- [ ] Optimization recommendations clear

### Critical Points to Verify:
1. **Memory Tests:** Actually detect leaks (verify with intentional leak)
2. **Performance Tests:** Realistic timing (not mocked)
3. **Load Tests:** Run for full duration
4. **Error Tests:** Cover all failure modes
5. **Documentation:** Clear and actionable

### Final Validation:
```bash
# Run full test suite
npm test

# Run benchmark
npm run benchmark

# Check memory under load
node --expose-gc tests/memory.test.js

# Verify no regressions
# Compare results with baselines
```

### Success Criteria:
- ✓ All tests pass
- ✓ No memory leaks detected
- ✓ Performance within targets
- ✓ Load tests successful
- ✓ Documentation complete

**Final Approval: Project Complete ✅**

---

**Status:** Ready for Execution  
**Assigned To:** Sub-Agent  
**Orchestrator:** Will conduct final quality review & project sign-off
