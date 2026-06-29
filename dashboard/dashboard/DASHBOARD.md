# Dashboard Modern - WhatsApp Gateway

Dashboard React modern dengan login authentication, session management lengkap, dan real-time WebSocket integration.

## 🎨 Features

### ✅ Implemented
- **Login Page** - API key authentication dengan UI modern
- **Session Management** - Create, list, delete sessions dengan stats
- **Real-time QR Scanner** - WebSocket integration untuk QR code
- **Send Message Interface** - Form kirim pesan dengan validation
- **Modern UI** - TailwindCSS 3, gradient, shadows, animations
- **Responsive Design** - Mobile-friendly layout
- **Status Indicators** - Real-time status dengan color coding
- **Auto-refresh** - Session list auto-refresh setiap 5 detik

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd dashboard
npm install
```

### 2. Build Dashboard
```bash
npm run build
```

Output akan di-generate ke `dashboard/dist/`

### 3. Start Server
```bash
cd ..
npm start
```

Dashboard tersedia di: `http://localhost:3333/dashboard`

## 🛠️ Development

### Dev Mode (Hot Reload)
```bash
cd dashboard
npm run dev
```

Vite dev server akan berjalan di `http://localhost:5173`

**Note:** Untuk dev mode, API calls akan ke `http://localhost:3333` (Express server harus running).

### Build untuk Production
```bash
npm run build
```

## 📁 Structure

```
dashboard/
├── src/
│   ├── main.jsx              # Entry point (React + Router)
│   ├── App.jsx               # Main app dengan navigation
│   ├── pages/
│   │   ├── Login.jsx         # Login page dengan API key auth
│   │   ├── Sessions.jsx      # Session management page
│   │   ├── QR.jsx            # QR scanner dengan WebSocket
│   │   └── Send.jsx          # Send message form
│   ├── hooks/
│   │   └── useWebSocket.js   # WebSocket hook (fixed event names)
│   ├── api/
│   │   └── client.js         # Axios client dengan auth interceptor
│   └── index.css             # Tailwind + custom animations
├── dist/                     # Built files (served by Express)
├── index.html                # HTML entry point
├── vite.config.js            # Vite configuration
├── tailwind.config.js        # Tailwind configuration
└── package.json              # Dependencies
```

## 🔧 Key Changes dari Old Dashboard

### 1. Entry Point
**Old:** `app.ts` (Vanilla TypeScript)
```html
<script type="module" src="/src/app.ts"></script>
```

**New:** `main.jsx` (React)
```html
<script type="module" src="/src/main.jsx"></script>
```

### 2. Authentication
**Old:** Login page terpisah, tidak terintegrasi dengan React

**New:** Login component yang check localStorage, auto-reload ke App jika authenticated

### 3. WebSocket Events (FIXED)
**Old Hook:**
```js
socket.on('qr_ready', ...)         // ❌ Wrong event name
socket.on('session_connected', ...)  // ❌ Wrong event name
```

**New Hook:**
```js
socket.on('qr', (data) => ...)     // ✅ Correct (backend emits this)
socket.on('status', (data) => ...) // ✅ Correct
socket.on('ready', (data) => ...)  // ✅ Correct
```

### 4. API Client
**Old:**
```js
// Hardcoded base URL
const API_BASE = 'http://localhost:3000/api';

// No auth header
```

**New:**
```js
// Dynamic base URL (works in production)
const API_BASE = window.location.origin + '/api';

// Auth interceptor (auto-adds x-api-key header)
api.interceptors.request.use((config) => {
  const apiKey = localStorage.getItem('apiKey');
  if (apiKey) {
    config.headers['x-api-key'] = apiKey;
  }
  return config;
});

// Auto-logout on 401
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('apiKey');
      window.location.reload();
    }
    return Promise.reject(error);
  }
);
```

### 5. UI/UX Improvements
- **Gradient backgrounds** - Modern blue/indigo gradients
- **Card shadows** - Elevated cards dengan hover effects
- **Status badges** - Color-coded dengan animated pulse dots
- **Empty states** - Helpful empty states dengan CTA buttons
- **Loading states** - Spinner animations
- **Error handling** - User-friendly error messages
- **Responsive grid** - Auto-adapting layout untuk mobile/tablet/desktop
- **Modal dialogs** - Create session modal dengan backdrop

## 🎯 Login Flow

1. User buka `/dashboard`
2. `main.jsx` check `localStorage.getItem('apiKey')`
3. Jika tidak ada → Show `<Login />` component
4. User input API key → Hit `/api/sessions` untuk verify
5. Jika valid → Save ke localStorage → Reload page
6. `main.jsx` detect API key → Show `<App />` (authenticated)

## 📱 Pages

### 1. Sessions Page (`/`)
- **Stats cards** - Total, Connected, Disconnected
- **Session grid** - Cards dengan status indicator
- **Create button** - Modal untuk create session dengan webhook config
- **Actions per session:**
  - QR - Navigate ke QR scanner
  - Send - Navigate ke send message
  - Delete - Confirm delete dengan warning
- **Auto-refresh** - Setiap 5 detik

### 2. QR Scanner (`/qr/:sessionId`)
- **Real-time QR display** - WebSocket update
- **Status indicator** - Connecting, QR Ready, Connected, Disconnected
- **Instructions** - Step-by-step cara scan QR
- **Connected state** - Show phone number + "Send Message" CTA
- **Error handling** - Retry button jika failed

### 3. Send Message (`/send/:sessionId`)
- **Session status check** - Warning jika tidak connected
- **Phone input** - Dengan validation (digits only)
- **Message textarea** - Character counter (max 4096)
- **Result display** - Success/error dengan Job ID
- **Sidebar:**
  - Quick tips
  - Example phone number & message
  - API alternative info

## 🔐 Security

- **API key stored in localStorage** - Tidak di-commit ke git
- **Auto-logout on 401** - Interceptor handle expired key
- **No sensitive data in code** - API key dari user input
- **CORS handled by backend** - Express CORS middleware

## 🐛 Troubleshooting

### Build Error: "Cannot find module '@tailwindcss/postcss'"
**Fix:** Update `postcss.config.js`:
```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

### WebSocket not connecting
**Check:**
1. Backend server running di `http://localhost:3333`
2. WebSocket server initialized di `src/index.js`
3. API key valid (check console errors)

### API calls return 401
**Check:**
1. API key di localStorage: `localStorage.getItem('apiKey')`
2. Header `x-api-key` di Network tab
3. Backend `.env` API_KEY match

### Session not showing QR code
**Check:**
1. Session status via `/api/sessions/:id/status`
2. WebSocket events di console: `qr`, `status`, `ready`
3. Backend logs untuk QR generation

## 📦 Dependencies

### Production
- `react` ^18.3.1
- `react-dom` ^18.3.1
- `react-router-dom` ^6.26.0
- `axios` ^1.7.2
- `socket.io-client` ^4.8.3

### Development
- `vite` ^6.0.7
- `@vitejs/plugin-react` ^4.3.4
- `tailwindcss` ^3.4.16
- `autoprefixer` ^10.4.20
- `postcss` ^8.5.15

## 🎨 UI Components

### Color Palette
- **Primary:** Blue 500 → Indigo 600 (gradients)
- **Success:** Green 500/600
- **Warning:** Yellow 500/600
- **Error:** Red 500/600
- **Gray:** 50-900 scale

### Typography
- **Headings:** Bold, gradient text untuk titles
- **Body:** Gray 600/700/800
- **Small:** Gray 500 untuk secondary text

### Spacing
- **Cards:** p-6 atau p-8
- **Sections:** mb-6 atau mb-8
- **Grid gap:** gap-4 atau gap-6

## ✅ Checklist Implementation

- [x] Login page dengan API key auth
- [x] Session list dengan stats
- [x] Create session modal dengan webhook config
- [x] Delete session dengan confirmation
- [x] QR scanner dengan WebSocket real-time
- [x] Send message form dengan validation
- [x] Status indicators dengan colors
- [x] Auto-refresh session list
- [x] Responsive design
- [x] Error handling & user feedback
- [x] Navigation dengan React Router
- [x] API client dengan interceptors
- [x] Logout functionality
- [x] Modern UI dengan Tailwind
- [x] Animations & transitions
- [x] Empty states

## 🚀 Next Steps (Optional Enhancements)

- [ ] Analytics dashboard page
- [ ] Message history per session
- [ ] Bulk send interface
- [ ] Template management UI
- [ ] Group management page
- [ ] Webhook logs viewer
- [ ] Session settings page
- [ ] Dark mode toggle
- [ ] Export session data
- [ ] Search & filter sessions

---

Built with ❤️ using React + Vite + TailwindCSS
