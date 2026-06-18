# Phase 13: Templates & Bulk Send - Blueprint

> **Objective:** Template system and bulk messaging for marketing campaigns and mass notifications

---

## Table of Contents

1. [Context & Current State](#1-context--current-state)
2. [Technical Specification](#2-technical-specification)
3. [Implementation Steps](#3-implementation-steps)
4. [Code Standards & Patterns](#4-code-standards--patterns)
5. [Integration Points](#5-integration-points)
6. [Acceptance Criteria](#6-acceptance-criteria)
7. [Testing Requirements](#7-testing-requirements)
8. [Rollback Plan](#8-rollback-plan)

---

## 1. Context & Current State

### Current Limitations

**Phase 1-12:**
- ✅ Can send individual messages
- ❌ No message templates
- ❌ No bulk sending
- ❌ No CSV import
- ❌ No progress tracking for bulk operations

### Real-World Use Cases

1. **Marketing Campaigns:** Send personalized offers to 1000+ customers
2. **Notifications:** Send appointment reminders with custom data
3. **Event Invites:** Bulk invite with personalized details
4. **Payment Reminders:** Send billing reminders with amount/date
5. **Customer Onboarding:** Welcome messages with personalized info

### What Will Change

- Template CRUD API
- Placeholder system (`{{name}}`, `{{date}}`, etc)
- Bulk send endpoint (array of recipients)
- CSV import for contacts
- Progress tracking
- Scheduled bulk send

---

## 2. Technical Specification

### 2.1 New API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `GET /api/templates` | GET | List all templates |
| `GET /api/templates/:id` | GET | Get template by ID |
| `POST /api/templates` | POST | Create new template |
| `PUT /api/templates/:id` | PUT | Update template |
| `DELETE /api/templates/:id` | DELETE | Delete template |
| `POST /api/bulk/send` | POST | Bulk send with template |
| `POST /api/bulk/csv` | POST | Bulk send from CSV |
| `GET /api/bulk/:jobId/progress` | GET | Get bulk send progress |

### 2.2 Data Models

**Template:**

```javascript
{
  id: "template-uuid",
  name: "welcome_message",
  category: "marketing",           // marketing, notification, transactional
  content: "Hello {{name}}! Welcome to {{company}}. Your account ID is {{account_id}}.",
  variables: ["name", "company", "account_id"],
  language: "id",
  createdAt: "2026-06-18T10:00:00Z",
  updatedAt: "2026-06-18T10:00:00Z",
  usageCount: 150
}
```

**Bulk Job:**

```javascript
{
  id: "bulk-job-uuid",
  sessionId: "session-123",
  templateId: "template-uuid",
  status: "processing",            // queued, processing, completed, failed, paused
  total: 1000,
  processed: 450,
  success: 445,
  failed: 5,
  progress: 45,                    // percentage
  createdAt: "2026-06-18T10:00:00Z",
  startedAt: "2026-06-18T10:01:00Z",
  completedAt: null,
  estimatedCompletion: "2026-06-18T10:15:00Z",
  failedRecipients: [
    {
      to: "628999888777",
      error: "Invalid number",
      timestamp: "2026-06-18T10:05:00Z"
    }
  ]
}
```

### 2.3 Request/Response Schemas

**Create Template:**

```javascript
// POST /api/templates
{
  name: "payment_reminder",
  category: "transactional",
  content: "Hi {{customer_name}}, your payment of {{amount}} is due on {{due_date}}. Pay here: {{payment_link}}"
}

// Response
{
  success: true,
  data: {
    id: "template-abc123",
    name: "payment_reminder",
    variables: ["customer_name", "amount", "due_date", "payment_link"],
    createdAt: "2026-06-18T10:00:00Z"
  }
}
```

**Bulk Send (JSON):**

```javascript
// POST /api/bulk/send
{
  sessionId: "session-123",       // Optional
  templateId: "template-abc123",
  recipients: [
    {
      to: "628123456789",
      variables: {
        customer_name: "John Doe",
        amount: "Rp 500,000",
        due_date: "25 June 2026",
        payment_link: "https://pay.example.com/inv123"
      }
    },
    {
      to: "628111222333",
      variables: {
        customer_name: "Jane Smith",
        amount: "Rp 750,000",
        due_date: "26 June 2026",
        payment_link: "https://pay.example.com/inv124"
      }
    }
  ],
  delay: 2000,                    // Delay between messages (ms)
  scheduleAt: null                // Optional: schedule for later
}

// Response
{
  success: true,
  data: {
    bulkJobId: "bulk-job-xyz789",
    total: 2,
    status: "queued",
    estimatedCompletion: "2026-06-18T10:05:00Z"
  }
}
```

**Bulk Send (CSV):**

```javascript
// POST /api/bulk/csv
// Form-data:
// - csv: File
// - templateId: "template-abc123"
// - sessionId: "session-123" (optional)
// - delay: 2000 (optional)

// CSV Format:
// to,customer_name,amount,due_date,payment_link
// 628123456789,John Doe,Rp 500000,25 June 2026,https://pay.example.com/inv123
// 628111222333,Jane Smith,Rp 750000,26 June 2026,https://pay.example.com/inv124

// Response
{
  success: true,
  data: {
    bulkJobId: "bulk-job-xyz789",
    total: 2,
    status: "queued"
  }
}
```

**Get Bulk Progress:**

```javascript
// GET /api/bulk/bulk-job-xyz789/progress

// Response
{
  success: true,
  data: {
    id: "bulk-job-xyz789",
    status: "processing",
    total: 1000,
    processed: 450,
    success: 445,
    failed: 5,
    progress: 45,
    estimatedCompletion: "2026-06-18T10:15:00Z"
  }
}
```

### 2.4 Template Placeholder System

**Supported Syntax:**

- `{{variable_name}}` - Simple replacement
- `{{variable_name|default:value}}` - Default value if missing
- No complex logic (keep it simple)

**Example:**

```javascript
Template: "Hello {{name}}! Your order {{order_id|default:N/A}} is ready."

Variables: { name: "John", order_id: "12345" }
Result: "Hello John! Your order 12345 is ready."

Variables: { name: "John" }
Result: "Hello John! Your order N/A is ready."
```

### 2.5 File Structure

```
src/
├── api/
│   └── controllers/
│       ├── template.controller.js   # [NEW] Template CRUD
│       └── bulk.controller.js       # [NEW] Bulk send operations
├── templates/
│   ├── templateEngine.js            # [NEW] Placeholder replacement
│   └── templateStorage.js           # [NEW] SQLite template storage
├── bulk/
│   ├── bulkProcessor.js             # [NEW] Bulk job processor
│   ├── csvParser.js                 # [NEW] CSV import
│   └── progressTracker.js           # [NEW] Track bulk progress
└── queue/
    └── types.js                     # [MODIFY] Add bulk job types
```

### 2.6 Database Schema (SQLite)

**Templates Table:**

```sql
CREATE TABLE templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  category TEXT DEFAULT 'marketing',
  content TEXT NOT NULL,
  variables TEXT,              -- JSON array
  language TEXT DEFAULT 'id',
  usage_count INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Bulk Jobs Table:**

```sql
CREATE TABLE bulk_jobs (
  id TEXT PRIMARY KEY,
  session_id TEXT,
  template_id TEXT,
  status TEXT DEFAULT 'queued',
  total INTEGER DEFAULT 0,
  processed INTEGER DEFAULT 0,
  success INTEGER DEFAULT 0,
  failed INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  started_at DATETIME,
  completed_at DATETIME,
  metadata TEXT                -- JSON: failed recipients, etc
);
```

### 2.7 Dependencies

```json
{
  "csv-parse": "^5.5.0",
  "better-sqlite3": "^9.0.0"
}
```

---

## 3. Implementation Steps

See: [IMPLEMENTATION_STEPS.md](./IMPLEMENTATION_STEPS.md)

---

## 4. Code Standards & Patterns

### 4.1 Template Engine Pattern

```javascript
class TemplateEngine {
  render(template, variables) {
    return template.replace(/\{\{(\w+)(?:\|default:([^}]+))?\}\}/g, (match, key, defaultValue) => {
      if (variables.hasOwnProperty(key)) {
        return variables[key];
      }
      return defaultValue || match;
    });
  }
  
  extractVariables(template) {
    const matches = template.match(/\{\{(\w+)(?:\|default:[^}]+)?\}\}/g) || [];
    return matches.map(m => m.match(/\{\{(\w+)/)[1]);
  }
}
```

### 4.2 Bulk Processing Pattern

```javascript
async function processBulkJob(bulkJobId) {
  const job = await getBulkJob(bulkJobId);
  const template = await getTemplate(job.templateId);
  
  for (const recipient of job.recipients) {
    try {
      // Render template
      const message = templateEngine.render(template.content, recipient.variables);
      
      // Add to queue
      await addJob(JOB_TYPES.SEND_TEXT, {
        sessionId: job.sessionId,
        to: recipient.to,
        message,
      });
      
      // Update progress
      await updateBulkProgress(bulkJobId, { processed: 1, success: 1 });
      
      // Delay between sends
      await sleep(job.delay || 2000);
      
    } catch (error) {
      await updateBulkProgress(bulkJobId, { 
        processed: 1, 
        failed: 1,
        failedRecipient: { to: recipient.to, error: error.message }
      });
    }
  }
  
  await markBulkJobCompleted(bulkJobId);
}
```

### 4.3 CSV Parsing Pattern

```javascript
const { parse } = require('csv-parse/sync');

function parseCSV(buffer) {
  const records = parse(buffer, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });
  
  return records.map(record => ({
    to: record.to,
    variables: { ...record, to: undefined }
  }));
}
```

### 4.4 Rate Limiting for Bulk

```javascript
// Respect WhatsApp rate limits
const BULK_DELAY_MIN = 2000;  // 2 seconds minimum
const BULK_DELAY_MAX = 5000;  // 5 seconds maximum

function calculateDelay(recipientCount) {
  if (recipientCount > 1000) {
    return BULK_DELAY_MAX;
  }
  return BULK_DELAY_MIN;
}
```

---

## 5. Integration Points

### 5.1 Queue Integration (Phase 9)

Bulk messages use queue for reliability:

```javascript
// Each recipient becomes a queue job
for (const recipient of recipients) {
  await addJob(JOB_TYPES.SEND_TEXT, {
    sessionId,
    to: recipient.to,
    message: renderedMessage,
    bulkJobId,  // Track which bulk job this belongs to
  });
}
```

### 5.2 Multi-Session Integration (Phase 11)

Bulk jobs can specify sessionId:

```javascript
await processBulkJob(bulkJobId, sessionId);
```

### 5.3 Analytics Integration (Phase 14)

Track template usage and bulk job success rates.

---

## 6. Acceptance Criteria

### Must Have (P0)

- [ ] Create template API works
- [ ] List templates API works
- [ ] Template placeholder replacement works
- [ ] Bulk send (JSON) works
- [ ] Bulk send (CSV) works
- [ ] Progress tracking works
- [ ] Failed recipients logged
- [ ] Rate limiting respected (delay between sends)
- [ ] Queue integration works
- [ ] Tests pass with >80% coverage

### Nice to Have (P1)

- [ ] Scheduled bulk send (send later)
- [ ] Pause/resume bulk job
- [ ] Template categories/tags
- [ ] Template preview API
- [ ] Bulk send with media (image template)

---

## 7. Testing Requirements

See: [TESTING_GUIDE.md](./TESTING_GUIDE.md)

---

## 8. Rollback Plan

Additive feature. To rollback:

```bash
git revert <commit-hash>
pm2 restart whatsapp-gateway
```

Database tables can be dropped if needed.

---

**Next:** See [IMPLEMENTATION_STEPS.md](./IMPLEMENTATION_STEPS.md)
