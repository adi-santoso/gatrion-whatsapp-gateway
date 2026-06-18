# Phase 16: Admin Dashboard (Web UI) - Blueprint

> **Objective:** Modern React-based admin dashboard for managing WhatsApp Gateway

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

**Phase 1-15:**
- ✅ Full API capabilities
- ❌ No visual interface
- ❌ CLI/API only
- ❌ Not user-friendly for non-technical users

### What Non-Technical Users Need

1. **QR Scan Interface:** Visual QR code, easy scanning
2. **Send Messages:** Form-based message sending
3. **Session Management:** Visual session list, status indicators
4. **Analytics Dashboard:** Charts, metrics, insights
5. **Template Management:** CRUD for templates
6. **Bulk Send:** Upload CSV, track progress
7. **Logs Viewer:** Real-time logs in browser

---

## 2. Technical Specification

### 2.1 Tech Stack

**Frontend:**
- **React 18** - UI library
- **Vite** - Build tool (fast, modern)
- **TailwindCSS** - Utility-first CSS
- **Shadcn/ui** - Component library (beautiful, accessible)
- **React Router** - Routing
- **TanStack Query** - Data fetching & caching
- **Recharts** - Charts & graphs
- **Lucide React** - Icons
- **Zustand** - State management (lightweight)

**Build Output:** Static SPA served by Express

### 2.2 Pages & Routes (Multi-Session Aware)

```
/                          → Dashboard (overview - all sessions)
/sessions                  → Session management (list all)
/sessions/new              → Create new session
/sessions/:id              → Session detail page
/sessions/:id/qr           → QR scan page (WebSocket real-time)
/send                      → Send message form (select session)
/send/bulk                 → Bulk send interface (per session)
/templates                 → Template CRUD (per session)
/templates/:sessionId      → Templates for specific session
/groups                    → Group management (per session)
/groups/:sessionId         → Groups for specific session
/analytics                 → Analytics & reports (filterable by session)
/analytics/:sessionId      → Session-specific analytics
/logs                      → Real-time logs viewer (filterable by session)
/settings                  → Global configuration
/settings/:sessionId       → Per-session settings
```

### 2.3 Dashboard Page (Multi-Session Overview)

**Components:**
- Session switcher dropdown (filter by session or "All Sessions")
- Connection status cards (per session grid)
- Today's metrics (aggregated or per-session)
- Quick send form (with session selector)
- Recent messages list (with session badges)
- System health (CPU, memory, uptime)

**Layout:**
```
┌────────────────────────────────────────┐
│  Header (Logo, Nav, Session Dropdown)  │
├────────────────────────────────────────┤
│  Session: [All Sessions ▼]            │
│                                        │
│  ┌──────────┐ ┌──────────┐ ┌────────┐│
│  │ Sent     │ │Delivered │ │ Failed ││
│  │  1,250   │ │  1,235   │ │   15   ││ ← Aggregated
│  └──────────┘ └──────────┘ └────────┘│
│                                        │
│  ┌────────────────────────────────┐  │
│  │  Messages Chart (24h)          │  │
│  │  [Multi-line per session]      │  │
│  └────────────────────────────────┘  │
│                                        │
│  Active Sessions (3/5)                │
│  ┌──────┐ ┌──────┐ ┌──────┐          │
│  │🟢Sales│ │🟢Sup.│ │🔴Mkt. │          │
│  │+6281..│ │+6281..│ │offline│          │
│  └──────┘ └──────┘ └──────┘          │
│                                        │
│  Recent Messages                      │
│  [Sales] Hello... • 2m ago            │
│  [Support] Issue resolved • 5m ago    │
└────────────────────────────────────────┘
```

### 2.4 Session Management Page

**Features:**
- List all sessions (card layout)
- Session status indicator (green/red)
- QR scan button
- Disconnect/Delete session
- Add new session

**Session Card:**
```
┌─────────────────────────────┐
│ 🟢 Sales Team               │
│ +62 812 3456 789            │
│ Connected • 2h ago          │
│                             │
│ [QR] [Disconnect] [Delete]  │
└─────────────────────────────┘
```

### 2.5 QR Scan Page (WebSocket Real-time)

**Features:**
- Large QR code display (auto-updated via WebSocket)
- Real-time connection status (no polling!)
- Success animation when connected
- Session name display

**WebSocket Integration:**
```javascript
// Frontend connects to specific session
const ws = new WebSocket(`ws://localhost:3000?sessionId=${sessionId}`);

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  switch (data.event) {
    case 'qr_ready':
      setQrCode(data.qrCode);
      setStatus('Scan QR code with your phone');
      break;
    case 'session_connected':
      setStatus(`Connected: ${data.phone}`);
      showSuccessAnimation();
      break;
    case 'session_disconnected':
      setStatus('Disconnected');
      break;
  }
};
```

**Layout:**
```
┌─────────────────────────────┐
│  Sales Department           │
│  Scan QR Code               │
│                             │
│    ┌─────────────┐          │
│    │             │          │
│    │  [QR CODE]  │          │
│    │             │          │
│    └─────────────┘          │
│                             │
│  Status: Waiting for scan   │
│  🔴 ● Connected via WebSocket│
└─────────────────────────────┘
```

### 2.6 Send Message Page

**Form Fields:**
- Session select (dropdown)
- Recipient (phone number input)
- Message type (text, image, video, etc)
- Message content (textarea with WhatsApp formatting hints)
- File upload (for media)
- Preview section

**WhatsApp Formatting Helper:**
```
*Bold* _Italic_ ~Strikethrough~ `Code`
```

### 2.7 Analytics Page

**Charts:**
1. Messages over time (line chart)
2. Success rate (pie chart)
3. Messages by type (bar chart)
4. Session comparison (grouped bar)

**Filters:**
- Date range picker
- Session filter
- Export button (CSV)

### 2.8 Templates Page

**Features:**
- Template list (table)
- Create template form
- Edit template modal
- Delete confirmation
- Preview with sample data

**Template Form:**
```
Name: payment_reminder
Category: [Transactional ▼]
Content:
┌─────────────────────────────┐
│ Hi {{name}}, your payment   │
│ of {{amount}} is due on     │
│ {{date}}.                   │
└─────────────────────────────┘

Variables detected: name, amount, date
[Save] [Cancel]
```

### 2.9 Bulk Send Page

**Steps:**
1. Select template
2. Upload CSV or paste JSON
3. Preview (first 5 rows)
4. Configure (delay, schedule)
5. Confirm & send
6. Progress tracker (real-time)

**Progress Tracker:**
```
Sending... 45% (450/1000)

[████████████░░░░░] 

✅ Success: 445
❌ Failed: 5
⏳ Remaining: 550

[Pause] [Cancel]
```

### 2.10 File Structure

```
dashboard/
├── public/
│   ├── favicon.ico
│   └── logo.png
├── src/
│   ├── components/
│   │   ├── ui/                  # Shadcn components
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── input.tsx
│   │   │   └── ...
│   │   ├── layout/
│   │   │   ├── Header.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── Layout.tsx
│   │   ├── dashboard/
│   │   │   ├── MetricCard.tsx
│   │   │   ├── MessagesChart.tsx
│   │   │   └── RecentMessages.tsx
│   │   ├── sessions/
│   │   │   ├── SessionCard.tsx
│   │   │   └── QRDisplay.tsx
│   │   ├── send/
│   │   │   └── SendMessageForm.tsx
│   │   └── analytics/
│   │       └── AnalyticsCharts.tsx
│   ├── pages/
│   │   ├── Dashboard.tsx
│   │   ├── Sessions.tsx
│   │   ├── QRScan.tsx
│   │   ├── Send.tsx
│   │   ├── BulkSend.tsx
│   │   ├── Templates.tsx
│   │   ├── Groups.tsx
│   │   ├── Analytics.tsx
│   │   ├── Logs.tsx
│   │   └── Settings.tsx
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useSessions.ts
│   │   └── useAnalytics.ts
│   ├── lib/
│   │   ├── api.ts               # API client
│   │   ├── utils.ts
│   │   └── constants.ts
│   ├── store/
│   │   └── authStore.ts         # Zustand store
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── package.json
├── vite.config.ts
├── tailwind.config.js
└── tsconfig.json
```

### 2.11 API Client

```typescript
// src/lib/api.ts
class WhatsAppAPI {
  private baseURL: string;
  private apiKey: string;
  
  constructor() {
    this.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    this.apiKey = localStorage.getItem('apiKey') || '';
  }
  
  async getSessions() {
    const response = await fetch(`${this.baseURL}/api/sessions`, {
      headers: { 'x-api-key': this.apiKey }
    });
    return response.json();
  }
  
  async getQR(sessionId: string) {
    const response = await fetch(`${this.baseURL}/api/sessions/${sessionId}/qr`, {
      headers: { 'x-api-key': this.apiKey }
    });
    return response.json();
  }
  
  // ... other methods
}

export const api = new WhatsAppAPI();
```

### 2.12 Environment Variables

**Dashboard `.env`:**
```env
VITE_API_URL=http://localhost:3000
VITE_APP_NAME=WhatsApp Gateway
```

**Backend (serve dashboard):**

```javascript
// src/index.js
const path = require('path');

// Serve dashboard static files
app.use(express.static(path.join(__dirname, '../dashboard/dist')));

// SPA fallback
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'Not found' });
  }
  res.sendFile(path.join(__dirname, '../dashboard/dist/index.html'));
});
```

---

## 3. Implementation Steps

See: [IMPLEMENTATION_STEPS.md](./IMPLEMENTATION_STEPS.md)

---

## 4. Code Standards & Patterns

### 4.1 Component Pattern

```tsx
// components/dashboard/MetricCard.tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface MetricCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  trend?: number;
}

export function MetricCard({ title, value, icon, trend }: MetricCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {trend && (
          <p className="text-xs text-muted-foreground">
            {trend > 0 ? '+' : ''}{trend}% from yesterday
          </p>
        )}
      </CardContent>
    </Card>
  );
}
```

### 4.2 Data Fetching Pattern

```tsx
// hooks/useSessions.ts
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useSessions() {
  return useQuery({
    queryKey: ['sessions'],
    queryFn: () => api.getSessions(),
    refetchInterval: 30000, // Refetch every 30s
  });
}

// Usage in component
function Sessions() {
  const { data, isLoading, error } = useSessions();
  
  if (isLoading) return <Loading />;
  if (error) return <Error message={error.message} />;
  
  return (
    <div>
      {data.sessions.map(session => (
        <SessionCard key={session.id} session={session} />
      ))}
    </div>
  );
}
```

### 4.3 Form Pattern

```tsx
// components/send/SendMessageForm.tsx
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';

export function SendMessageForm() {
  const { register, handleSubmit } = useForm();
  
  const sendMessage = useMutation({
    mutationFn: (data) => api.sendText(data),
    onSuccess: () => {
      toast({ title: 'Message sent!' });
    },
  });
  
  const onSubmit = (data) => {
    sendMessage.mutate(data);
  };
  
  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Input {...register('to')} placeholder="Phone number" />
      <Textarea {...register('message')} placeholder="Message" />
      <Button type="submit">Send</Button>
    </form>
  );
}
```

### 4.4 Dark Mode Pattern

```tsx
// Use Shadcn dark mode
import { ThemeProvider } from '@/components/theme-provider';

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="whatsapp-theme">
      <Router>
        {/* ... */}
      </Router>
    </ThemeProvider>
  );
}
```

---

## 5. Integration Points

### 5.1 Backend API

Dashboard calls all Phase 1-15 APIs. No new backend code needed.

### 5.2 Authentication

API key stored in localStorage:

```typescript
// On login page
localStorage.setItem('apiKey', userInputKey);

// API client reads from localStorage
const apiKey = localStorage.getItem('apiKey');
```

### 5.3 Real-time Updates

**Option 1: Polling (Simple)**
```typescript
useQuery({
  queryKey: ['qr', sessionId],
  queryFn: () => api.getQR(sessionId),
  refetchInterval: 5000, // Poll every 5s
});
```

**Option 2: Server-Sent Events (Advanced)**
```typescript
const eventSource = new EventSource(`/api/sessions/${id}/events`);
eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  // Update UI
};
```

---

## 6. Acceptance Criteria

### Must Have (P0)

- [ ] Dashboard page shows metrics
- [ ] Session management page works
- [ ] QR scan page displays QR and updates status
- [ ] Send message form works (text)
- [ ] Analytics page shows charts
- [ ] Template CRUD works
- [ ] Responsive design (mobile-friendly)
- [ ] Dark mode support
- [ ] API key authentication
- [ ] Build & deployment works

### Nice to Have (P1)

- [ ] Real-time log streaming
- [ ] Bulk send progress (live updates)
- [ ] Notifications/toasts
- [ ] Keyboard shortcuts
- [ ] Export functionality

---

## 7. Testing Requirements

See: [TESTING_GUIDE.md](./TESTING_GUIDE.md)

---

## 8. Rollback Plan

Dashboard is optional. To disable:

```javascript
// Comment out static serve in src/index.js
// app.use(express.static(...));
```

To rollback:

```bash
git revert <commit-hash>
pm2 restart whatsapp-gateway
```

---

**Next:** See [IMPLEMENTATION_STEPS.md](./IMPLEMENTATION_STEPS.md)
