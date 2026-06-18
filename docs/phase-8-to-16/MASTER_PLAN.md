# WhatsApp Gateway - Phase 8-16 Master Plan

> **Orchestrated Development Plan**  
> Start: 2026-06-18 | Target: Production-Ready Enterprise Features

---

## Overview

Mengimplementasikan 9 fitur utama untuk mengubah WhatsApp Gateway dari basic messaging service menjadi **enterprise-grade platform** dengan webhook, persistent queue, multi-device, rich media, group management, analytics, dan admin dashboard.

---

## Development Principles

1. **Minimal Code**: Only essential code, no over-engineering
2. **Clean Architecture**: Separation of concerns, maintainable
3. **Modern Stack**: Latest stable versions, best practices
4. **Context Efficient**: Small, focused changes per phase
5. **Production Ready**: Each phase deployable independently
6. **Backward Compatible**: Existing API tetap berfungsi

---

## Phase Breakdown

### **Phase 8: Webhook (Incoming Messages)**
**Priority:** Critical | **Effort:** 3-4 hours | **LOC:** ~400

**Objective:** Enable 2-way communication dengan webhook for incoming messages

**Deliverables:**
- Webhook URL configuration
- Incoming message handler (text, image, audio, video, document)
- Retry mechanism with exponential backoff
- Message deduplication (prevent double webhook)
- Webhook signature verification (HMAC)

**Files:**
- `src/config/env.js` - Add WEBHOOK_URL, WEBHOOK_SECRET
- `src/whatsapp/webhookHandler.js` - Webhook dispatcher
- `src/utils/webhookClient.js` - HTTP client with retry
- `src/middleware/webhookSignature.js` - HMAC signature
- `tests/webhook.test.js` - Webhook tests
- `docs/phase-8/README.md` - Documentation

**Dependencies:** axios, crypto (built-in)

---

### **Phase 9: Persistent Queue (Redis/BullMQ)**
**Priority:** Critical | **Effort:** 4-5 hours | **LOC:** ~500

**Objective:** Replace in-memory queue dengan Redis-backed persistent queue

**Deliverables:**
- Redis integration with BullMQ
- Job persistence (survive restart)
- Failed job tracking & retry
- Priority queue (urgent, normal, low)
- Scheduled messages (send later)
- Queue monitoring endpoint

**Files:**
- `src/queue/messageQueue.js` - BullMQ implementation
- `src/queue/workers.js` - Job processors
- `src/api/controllers/queue.controller.js` - Queue management API
- `src/config/redis.js` - Redis connection
- `docker-compose.yml` - Add Redis service
- `tests/queue.test.js` - Queue tests
- `docs/phase-9/README.md` - Documentation

**Dependencies:** bullmq, ioredis

---

### **Phase 10: Rich Media Support**
**Priority:** High | **Effort:** 3-4 hours | **LOC:** ~350

**Objective:** Support video, document, audio, location, contact, sticker

**Deliverables:**
- `/api/send-video` endpoint
- `/api/send-document` endpoint
- `/api/send-audio` endpoint
- `/api/send-location` endpoint
- `/api/send-contact` endpoint
- `/api/send-sticker` endpoint
- File validation & size limits
- MIME type detection

**Files:**
- `src/api/controllers/media.controller.js` - All media endpoints
- `src/middleware/upload.middleware.js` - Update for multiple types
- `src/utils/mediaValidator.js` - Validation logic
- `tests/media.test.js` - Media tests
- `docs/phase-10/README.md` - Documentation

**Dependencies:** file-type, mime-types

---

### **Phase 11: Multi-Device Session**
**Priority:** High | **Effort:** 5-6 hours | **LOC:** ~600

**Objective:** Support multiple WhatsApp accounts (sessions)

**Deliverables:**
- Session management (create, list, delete)
- Isolated session storage per phone
- `/api/sessions` - List all sessions
- `/api/sessions/:id/qr` - Get QR per session
- `/api/sessions/:id/status` - Status per session
- Route messages by session ID
- Session health monitoring

**Files:**
- `src/whatsapp/sessionManager.js` - Session orchestrator
- `src/whatsapp/clientFactory.js` - Create isolated clients
- `src/api/controllers/session.controller.js` - Session API
- `src/middleware/sessionAuth.middleware.js` - Session-level auth
- `tests/session.test.js` - Multi-session tests
- `docs/phase-11/README.md` - Documentation

**Dependencies:** None (pure logic)

---

### **Phase 12: Group Management**
**Priority:** Medium | **Effort:** 3-4 hours | **LOC:** ~400

**Objective:** Full group messaging & management capabilities

**Deliverables:**
- `/api/groups` - List groups
- `/api/groups/:id` - Group details
- `/api/groups/:id/send` - Send to group
- `/api/groups/create` - Create group
- `/api/groups/:id/participants` - Add/remove members
- `/api/groups/:id/invite` - Get invite link
- `/api/groups/:id/leave` - Leave group

**Files:**
- `src/api/controllers/group.controller.js` - Group API
- `src/whatsapp/groupManager.js` - Group operations
- `tests/group.test.js` - Group tests
- `docs/phase-12/README.md` - Documentation

**Dependencies:** None (Baileys built-in)

---

### **Phase 13: Message Templates & Bulk Send**
**Priority:** Medium | **Effort:** 3-4 hours | **LOC:** ~350

**Objective:** Template system & bulk messaging for campaigns

**Deliverables:**
- Template CRUD API (create, list, update, delete)
- Placeholder replacement ({{name}}, {{date}}, etc)
- `/api/bulk/send` - Bulk messaging endpoint
- CSV import for contacts
- Progress tracking
- Scheduled bulk send

**Files:**
- `src/api/controllers/template.controller.js` - Template API
- `src/api/controllers/bulk.controller.js` - Bulk send API
- `src/utils/templateEngine.js` - Simple template parser
- `src/utils/csvParser.js` - CSV import
- `tests/template.test.js` - Template tests
- `docs/phase-13/README.md` - Documentation

**Dependencies:** csv-parse

---

### **Phase 14: Analytics & Reporting**
**Priority:** Medium | **Effort:** 4-5 hours | **LOC:** ~450

**Objective:** Message tracking, delivery status, analytics dashboard

**Deliverables:**
- Message status tracking (sent, delivered, read, failed)
- Analytics endpoint (stats by date, recipient, type)
- Failed message tracking & logs
- Export to CSV/JSON
- Daily/weekly reports
- Dashboard metrics (total sent, success rate, avg response time)

**Files:**
- `src/analytics/tracker.js` - Event tracking
- `src/analytics/storage.js` - SQLite storage for stats
- `src/api/controllers/analytics.controller.js` - Analytics API
- `src/utils/reportGenerator.js` - CSV/JSON export
- `tests/analytics.test.js` - Analytics tests
- `docs/phase-14/README.md` - Documentation

**Dependencies:** better-sqlite3, json2csv

---

### **Phase 15: Structured Logging & Monitoring**
**Priority:** High | **Effort:** 3-4 hours | **LOC:** ~300

**Objective:** Production-grade logging & observability

**Deliverables:**
- Structured logging with Pino
- Log levels (trace, debug, info, warn, error, fatal)
- Log rotation (daily, max 7 days)
- Correlation IDs for request tracing
- Prometheus metrics endpoint
- Grafana dashboard JSON

**Files:**
- `src/utils/logger.js` - Pino logger setup
- `src/middleware/logging.middleware.js` - Request logging
- `src/metrics/prometheus.js` - Metrics collector
- `grafana/dashboard.json` - Grafana dashboard template
- `tests/logging.test.js` - Logger tests
- `docs/phase-15/README.md` - Documentation

**Dependencies:** pino, pino-pretty, prom-client

---

### **Phase 16: Admin Dashboard (Web UI)**
**Priority:** High | **Effort:** 8-10 hours | **LOC:** ~1200

**Objective:** Modern web UI for non-technical users

**Tech Stack:** React 18, Vite, TailwindCSS, Shadcn/ui, React Query

**Pages:**
1. **Dashboard** - Overview, stats, connection status
2. **QR Scan** - Multi-device QR scan interface
3. **Send Message** - Form to send text/image/media
4. **Sessions** - Manage multiple devices
5. **Analytics** - Charts & reports
6. **Logs** - Real-time log viewer
7. **Settings** - Configuration

**Deliverables:**
- Full SPA with routing
- Responsive design (mobile-friendly)
- Dark mode support
- Real-time updates (polling/SSE)
- Toast notifications
- Loading states & error handling
- API key input (localStorage)

**Files:**
- `dashboard/` - Full React app
- `dashboard/src/components/` - Reusable components
- `dashboard/src/pages/` - Page components
- `dashboard/src/hooks/` - Custom hooks
- `dashboard/src/api/` - API client
- `dashboard/src/lib/` - Utilities
- `src/index.js` - Serve dashboard static files
- `docs/phase-16/README.md` - Documentation

**Dependencies:** react, vite, tailwindcss, shadcn/ui, tanstack/react-query, recharts

---

## Context Management Strategy

### Per-Phase Context Budget
- **Context Size Target:** 15-20K tokens per phase
- **Approach:** Small, focused context with precise instructions
- **Handoff:** Each phase documented before next starts

### Orchestration Pattern
```
Main Agent (You)
    ├─> Phase N Sub-Agent
    │   ├─> Reads: Current codebase context
    │   ├─> Implements: Specific phase deliverables
    │   ├─> Tests: Verifies functionality
    │   └─> Documents: Phase completion report
    └─> Review & Integrate
```

### Context Handoff Structure
Each sub-agent receives:
1. **Project context** - Current architecture, key files
2. **Phase objective** - Clear goal & deliverables
3. **Technical constraints** - Dependencies, patterns to follow
4. **Acceptance criteria** - Definition of done
5. **Testing requirements** - How to verify

---

## Implementation Order & Dependencies

```
Phase 8 (Webhook)
    ├─> Independent, can start immediately
    └─> Enables: 2-way communication use cases

Phase 9 (Redis Queue)
    ├─> Independent, can run parallel with Phase 8
    └─> Enables: Phase 13 (Bulk send needs persistent queue)

Phase 10 (Rich Media)
    ├─> Depends: None
    └─> Can run parallel with Phase 8-9

Phase 11 (Multi-Session)
    ├─> Depends: Phase 8 (webhook per session)
    └─> Must complete before: Phase 12, 13

Phase 12 (Groups)
    ├─> Depends: Phase 11 (session isolation)
    └─> Independent feature

Phase 13 (Templates/Bulk)
    ├─> Depends: Phase 9 (persistent queue)
    └─> Independent feature

Phase 14 (Analytics)
    ├─> Depends: Phase 9 (track queue jobs)
    └─> Independent storage

Phase 15 (Logging)
    ├─> Independent, can run parallel
    └─> Should complete before Phase 16 (dashboard needs logs)

Phase 16 (Dashboard)
    ├─> Depends: All previous phases (UI for all features)
    └─> Final integration
```

**Optimal Execution Order:**
1. **Phase 8, 9, 10** (Parallel) - Core capabilities
2. **Phase 11** - Multi-session foundation
3. **Phase 12, 13, 15** (Parallel) - Independent features
4. **Phase 14** - Analytics (needs queue data)
5. **Phase 16** - Dashboard (integrates everything)

---

## Testing Strategy

### Per-Phase Testing
- **Unit Tests** - Core logic (80%+ coverage)
- **Integration Tests** - API endpoints
- **Manual Testing** - QA checklist per phase

### Regression Testing
- Run full test suite after each phase
- Verify existing features still work
- Performance benchmarks (no degradation)

---

## Documentation Per Phase

Each phase folder (`docs/phase-N/`) contains:

1. **README.md** - Feature overview, usage guide
2. **IMPLEMENTATION.md** - Technical details, architecture decisions
3. **API_REFERENCE.md** - New endpoints documentation
4. **TESTING.md** - Test results, QA checklist
5. **CHANGELOG.md** - What changed, breaking changes

---

## Quality Gates

Before marking phase as complete:

- [ ] All deliverables implemented
- [ ] Tests passing (new + existing)
- [ ] Documentation complete
- [ ] Code review passed (clean, maintainable)
- [ ] Performance acceptable (benchmarks)
- [ ] Backward compatible (existing API works)
- [ ] Production deployable (PM2 restart works)
- [ ] Git commit & push

---

## Estimated Timeline

| Phase | Effort | Dependencies | Start After |
|-------|--------|--------------|-------------|
| 8 | 3-4h | None | Immediate |
| 9 | 4-5h | None | Immediate |
| 10 | 3-4h | None | Immediate |
| 11 | 5-6h | Phase 8 | +4h |
| 12 | 3-4h | Phase 11 | +10h |
| 13 | 3-4h | Phase 9 | +5h |
| 14 | 4-5h | Phase 9 | +9h |
| 15 | 3-4h | None | +4h |
| 16 | 8-10h | All | +30h |

**Total Effort:** ~40-45 hours  
**With Parallelization:** ~20-25 hours actual time

---

## Success Metrics

### Technical Metrics
- **Test Coverage:** >80% for new code
- **Response Time:** <200ms (p95) for API endpoints
- **Queue Throughput:** >100 msg/sec
- **Memory Usage:** <300MB per session
- **Uptime:** 99.9%+

### Feature Metrics
- **Webhook Reliability:** >99% delivery success
- **Queue Zero Loss:** No message lost on restart
- **Multi-Session:** Support 10+ concurrent sessions
- **Analytics:** Real-time stats with <1min delay
- **Dashboard:** Load time <2s, mobile responsive

---

## Risk Mitigation

### Technical Risks
1. **Redis dependency** → Fallback to in-memory queue if Redis down
2. **Multi-session memory** → Monitor & limit max sessions
3. **Webhook failures** → Retry + DLQ for failed deliveries
4. **Dashboard performance** → Pagination, lazy loading, caching

### Backward Compatibility
- Existing endpoints unchanged
- New features opt-in via config
- Graceful degradation if optional deps missing

---

## Next Steps

1. **Review & Approve** this master plan
2. **Start Phase 8** (Webhook) - highest priority
3. **Execute phases** with sub-agent orchestration
4. **Iterate** based on learnings

---

**Status:** 📋 Planning Complete - Awaiting Approval  
**Author:** Orchestrator Agent  
**Date:** 2026-06-18  
**Version:** 1.0
