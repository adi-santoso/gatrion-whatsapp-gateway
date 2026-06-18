# WhatsApp Gateway Service

> Production-ready WhatsApp Gateway API menggunakan Baileys v7 dan Express. Single instance dengan file-based session persistence.

[![Node.js](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-ISC-blue.svg)](LICENSE)

---

## Daftar Isi

- [Fitur](#fitur)
- [Requirements](#requirements)
- [Quick Start](#quick-start)
- [Cara Penggunaan](#cara-penggunaan)
- [API Endpoints](#api-endpoints)
- [Production Deployment](#production-deployment)
- [Troubleshooting](#troubleshooting)

---

## Fitur

- **QR Code Authentication** - Scan sekali, session tersimpan otomatis
- **Send Text Messages** - Dengan WhatsApp formatting (*bold*, _italic_, ~strike~)
- **Send Images** - Stream-based upload, tanpa menyimpan ke disk
- **Auto-Reconnect** - Otomatis reconnect setelah restart
- **API Key Authentication** - Secure dengan timing-safe comparison
- **Rate Limiting** - 20 requests per menit per IP
- **Message Queue** - Mencegah rate limiting dari WhatsApp
- **Production Ready** - PM2 config, graceful shutdown, monitoring

---

## Requirements

- **Node.js** >= 20.0.0 ([Download](https://nodejs.org/))
- **npm** atau **yarn**
- **PM2** (untuk production) - `npm install -g pm2`

---

## Quick Start

### 1. Clone & Install

```bash
# Clone repository
git clone https://github.com/adi-santoso/gatrion-whatsapp-gateway.git
cd gatrion-whatsapp-gateway

# Install dependencies
npm install
```

### 2. Setup Environment

```bash
# Copy environment template
cp .env.example .env
```

**Edit `.env`:**
```env
PORT=3000
NODE_ENV=development
API_KEY=your-secret-api-key-minimum-32-characters-long
WA_SESSION_PATH=./auth_info_baileys
```

> **PENTING:** `API_KEY` harus minimal **32 karakter** di production!

### 3. Start Server

```bash
# Development mode (auto-reload)
npm run dev
```

Server akan berjalan di `http://localhost:3000`

### 4. Scan QR Code

**Cara 1: Via Terminal**
- QR code akan muncul di terminal
- Scan dengan WhatsApp: **Linked Devices** > **Link a Device**

**Cara 2: Via API**
```bash
curl http://localhost:3000/api/qr
```
Response:
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

Copy URL `qr` dan buka di browser, lalu scan dengan WhatsApp.

### 5. Cek Status Koneksi

```bash
curl http://localhost:3000/api/status
```

Response saat connected:
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

---

## Cara Penggunaan

### Authentication

Semua endpoint (kecuali `/api/health`) memerlukan **API Key** di header:

```bash
-H "x-api-key: your-secret-api-key"
```

### 1. Send Text Message

**Endpoint:** `POST /api/send-text`

**Request:**
```bash
curl -X POST http://localhost:3000/api/send-text \
  -H "x-api-key: your-secret-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "628123456789",
    "message": "Hello, ini pesan dari WhatsApp Gateway!"
  }'
```

**Dengan WhatsApp Formatting:**
```bash
curl -X POST http://localhost:3000/api/send-text \
  -H "x-api-key: your-secret-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "08123456789",
    "message": "*Bold* _Italic_ ~Strike~ ```Mono``` Normal text"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "messageId": "3EB0ABC123...",
    "to": "628123456789@s.whatsapp.net",
    "status": "sent",
    "timestamp": "2026-06-17T10:30:00.000Z"
  }
}
```

**Format Nomor yang Didukung:**
- `08123456789` -> otomatis convert ke `628123456789`
- `628123456789` -> langsung digunakan
- `+628123456789` -> strip `+`
- `628123456789@s.whatsapp.net` -> langsung digunakan

### 2. Send Image

**Endpoint:** `POST /api/send-image`

**Request:**
```bash
curl -X POST http://localhost:3000/api/send-image \
  -H "x-api-key: your-secret-api-key" \
  -F "image=@/path/to/photo.jpg" \
  -F "to=628123456789" \
  -F "caption=Lihat foto ini! *Amazing*"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "messageId": "3EB0XYZ789...",
    "to": "628123456789@s.whatsapp.net",
    "type": "image",
    "caption": "Lihat foto ini! *Amazing*",
    "size": 1048576,
    "mimeType": "image/jpeg",
    "status": "sent",
    "timestamp": "2026-06-17T10:30:00.000Z"
  }
}
```

**Supported Image Types:**
- JPEG (`.jpg`, `.jpeg`)
- PNG (`.png`)
- GIF (`.gif`)
- WebP (`.webp`)

**Max File Size:** 10 MB

### 3. Check Connection Status

**Endpoint:** `GET /api/status`

```bash
curl -H "x-api-key: your-secret-api-key" \
  http://localhost:3000/api/status
```

### 4. Get QR Code

**Endpoint:** `GET /api/qr`

```bash
curl -H "x-api-key: your-secret-api-key" \
  http://localhost:3000/api/qr
```

Jika sudah connected:
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

---

## API Endpoints

### Public (No Auth Required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check & system metrics |

### Protected (Require `x-api-key`)

| Method | Endpoint | Description | Rate Limited |
|--------|----------|-------------|--------------|
| GET | `/api/qr` | Get QR code atau status | No |
| GET | `/api/status` | Connection status | No |
| POST | `/api/send-text` | Send text message | Yes (20/min) |
| POST | `/api/send-image` | Send image dengan caption | Yes (20/min) |

### Request & Response Examples

#### Health Check
```bash
curl http://localhost:3000/api/health
```
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "uptime": 12345,
    "memory": { "used": 120, "total": 512, "unit": "MB" },
    "whatsapp": { "connected": true, "state": "connected" },
    "nodeVersion": "v20.0.0",
    "platform": "linux",
    "pid": 12345
  }
}
```

#### Send Text - Body Parameters
```json
{
  "to": "628123456789",        // Required: phone number
  "message": "Your message"    // Required: text message (max 65536 chars)
}
```

#### Send Image - Form Data
```
image: [file]                  // Required: image file
to: "628123456789"            // Required: phone number
caption: "Optional caption"    // Optional: image caption with formatting
```

### Error Responses

**401 Unauthorized** (Missing/Invalid API Key)
```json
{
  "success": false,
  "error": "Unauthorized",
  "message": "API key is required"
}
```

**400 Validation Error**
```json
{
  "success": false,
  "error": "ValidationError",
  "message": "Field 'to' is required",
  "field": "to"
}
```

**429 Too Many Requests**
```json
{
  "success": false,
  "error": "TooManyRequests",
  "message": "Too many requests, please try again later",
  "retryAfter": 45
}
```

**503 Service Unavailable** (WhatsApp Not Connected)
```json
{
  "success": false,
  "error": "ServiceUnavailable",
  "message": "WhatsApp not connected. Please scan QR code first."
}
```

---

## Testing

### Run Tests
```bash
# All tests
npm test

# API tests only
npm run test:api

# Integration tests only
npm run test:integration

# Performance benchmark
npm run benchmark
```

---

## Production Deployment

### Prerequisites

- Node.js >= 20.0.0
- PM2: `npm install -g pm2`
- Server Linux/Windows dengan minimal **1 GB RAM**
- Firewall configured (port 3000 atau sesuai `.env`)

### Setup Steps

**1. Clone & Install**
```bash
git clone https://github.com/adi-santoso/gatrion-whatsapp-gateway.git
cd gatrion-whatsapp-gateway
npm install
```

**2. Configure Environment**
```bash
cp .env.example .env
nano .env  # atau editor lain
```

**Production `.env`:**
```env
NODE_ENV=production
PORT=3000
API_KEY=generate-secure-random-32-characters-minimum
WA_SESSION_PATH=./auth_info_baileys
LOG_LEVEL=info
RATE_LIMIT_WINDOW=60000
RATE_LIMIT_MAX=20
CORS_ORIGIN=https://your-frontend-domain.com
```

> **Security:** Generate API key dengan: `openssl rand -base64 32`

**3. Start with PM2**

**Linux/macOS:**
```bash
chmod +x scripts/start.sh
./scripts/start.sh
```

**Windows/Manual:**
```bash
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup  # Auto-start on reboot
```

### PM2 Management

```bash
# Status
pm2 status

# Logs (real-time)
pm2 logs whatsapp-gateway

# Logs (last 100 lines)
pm2 logs whatsapp-gateway --lines 100

# Monitor (dashboard)
pm2 monit

# Restart
pm2 restart whatsapp-gateway

# Stop
pm2 stop whatsapp-gateway

# Remove from PM2
pm2 delete whatsapp-gateway
```

### First-Time Setup (Production)

**1. Start server**
```bash
pm2 start ecosystem.config.js --env production
pm2 logs  # Watch logs
```

**2. Get QR Code**
```bash
curl -H "x-api-key: your-api-key" \
  http://localhost:3000/api/qr
```

**3. Scan QR dengan WhatsApp**
- Buka WhatsApp di HP
- Settings > Linked Devices > Link a Device
- Scan QR code dari response API atau terminal

**4. Verify Connection**
```bash
curl -H "x-api-key: your-api-key" \
  http://localhost:3000/api/status
```

Should return: `"connected": true`

**5. Test Send Message**
```bash
curl -X POST http://localhost:3000/api/send-text \
  -H "x-api-key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{"to":"your-phone-number","message":"Test from production!"}'
```

### Reverse Proxy (Recommended)

**Nginx Example:**
```nginx
server {
    listen 80;
    server_name whatsapp-api.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**Dengan SSL (Certbot):**
```bash
sudo certbot --nginx -d whatsapp-api.yourdomain.com
```

### Session Backup

**PENTING:** Backup `auth_info_baileys/` secara berkala!

```bash
# Backup (daily cron recommended)
tar -czf wa-session-$(date +%Y%m%d).tar.gz auth_info_baileys/

# Restore
tar -xzf wa-session-20260617.tar.gz
```

**Cron Job (Backup Otomatis):**
```bash
crontab -e
# Add:
0 2 * * * cd /path/to/whatsapp-gateway && tar -czf backups/wa-session-$(date +\%Y\%m\%d).tar.gz auth_info_baileys/
```

### Monitoring & Alerts

**1. Health Check Monitor**
```bash
# Cron every 5 minutes
*/5 * * * * curl -s http://localhost:3000/api/health | grep "healthy" || echo "Service down!"
```

**2. PM2 Plus (Optional)**
```bash
pm2 plus  # Dashboard & monitoring
```

**3. Log Monitoring**
```bash
# Watch error logs
tail -f logs/error.log
```

### Resource Monitoring

```bash
# Memory usage
pm2 status  # Check memory column

# Detailed monitoring
pm2 monit  # Real-time dashboard

# System resources
htop  # or top
```

**Expected Usage:**
- **Memory:** 100-150 MB (normal), 200 MB (peak)
- **CPU:** < 5% (idle), 10-20% (active sending)
- **Disk:** ~50 MB + session (~10 MB)

---

## Security Checklist

- [ ] API_KEY minimal 32 karakter dan random
- [ ] NODE_ENV=production di `.env`
- [ ] CORS_ORIGIN restricted (bukan `*`)
- [ ] Firewall configured (only allow port 80/443)
- [ ] SSL/TLS enabled (HTTPS)
- [ ] `auth_info_baileys/` di-backup secara berkala
- [ ] Logs di-monitor untuk error/unusual activity
- [ ] PM2 auto-restart enabled
- [ ] Server updated & patched

---

## Troubleshooting

### WhatsApp Not Connecting

**Problem:** Status tetap `disconnected` atau `qr_required`

**Solution:**
1. Cek logs: `pm2 logs whatsapp-gateway`
2. Delete session: `rm -rf auth_info_baileys/*`
3. Restart: `pm2 restart whatsapp-gateway`
4. Scan QR lagi

### Session Lost After Restart

**Problem:** Harus scan QR setiap restart

**Solution:**
1. Cek `auth_info_baileys/` ada isinya: `ls -la auth_info_baileys/`
2. Cek permissions: `chmod -R 755 auth_info_baileys/`
3. Cek WA_SESSION_PATH di `.env` benar
4. Restore dari backup jika ada

### Rate Limit 429 Error

**Problem:** Dapat error "Too many requests"

**Solution:**
1. Wait 60 seconds untuk reset
2. Turunkan request rate dari aplikasi caller
3. Adjust `RATE_LIMIT_MAX` di `.env` jika perlu (hati-hati WhatsApp ban)

### Memory Leak

**Problem:** Memory terus naik

**Solution:**
1. Check logs untuk error: `pm2 logs`
2. Restart: `pm2 restart whatsapp-gateway`
3. Update ke versi terbaru
4. Report issue dengan logs

### 503 Service Unavailable

**Problem:** API return "WhatsApp not connected"

**Solution:**
1. Check status: `curl localhost:3000/api/status`
2. Check WhatsApp di HP masih linked
3. Restart dan scan QR jika perlu

### Port Already in Use

**Problem:** `Error: listen EADDRINUSE`

**Solution:**
```bash
# Find process using port
lsof -i :3000  # Linux/macOS
netstat -ano | findstr :3000  # Windows

# Kill process
kill -9 <PID>  # Linux/macOS
taskkill /PID <PID> /F  # Windows
```

---

## Integration Example

### Node.js / JavaScript

```javascript
const axios = require('axios');

const API_URL = 'http://localhost:3000/api';
const API_KEY = 'your-secret-api-key';

async function sendWhatsAppMessage(to, message) {
  try {
    const response = await axios.post(`${API_URL}/send-text`, {
      to: to,
      message: message
    }, {
      headers: {
        'x-api-key': API_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Message sent:', response.data);
    return response.data;
  } catch (error) {
    if (error.response?.status === 503) {
      console.error('WhatsApp not connected. Please scan QR code.');
    } else if (error.response?.status === 429) {
      console.error('Rate limit exceeded. Wait and retry.');
    } else {
      console.error('Error:', error.response?.data || error.message);
    }
    throw error;
  }
}

// Usage
sendWhatsAppMessage('628123456789', 'Hello from Node.js!');
```

### PHP

```php
<?php
function sendWhatsAppMessage($to, $message) {
    $apiUrl = 'http://localhost:3000/api/send-text';
    $apiKey = 'your-secret-api-key';
    
    $data = json_encode([
        'to' => $to,
        'message' => $message
    ]);
    
    $ch = curl_init($apiUrl);
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $data);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'x-api-key: ' . $apiKey
    ]);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($httpCode === 200) {
        return json_decode($response, true);
    } else {
        throw new Exception("Failed to send message: HTTP $httpCode");
    }
}

// Usage
try {
    $result = sendWhatsAppMessage('628123456789', 'Hello from PHP!');
    echo "Message sent: " . $result['data']['messageId'];
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
?>
```

### Python

```python
import requests

API_URL = 'http://localhost:3000/api'
API_KEY = 'your-secret-api-key'

def send_whatsapp_message(to, message):
    response = requests.post(
        f'{API_URL}/send-text',
        json={'to': to, 'message': message},
        headers={'x-api-key': API_KEY}
    )
    
    if response.status_code == 200:
        return response.json()
    elif response.status_code == 503:
        raise Exception('WhatsApp not connected')
    elif response.status_code == 429:
        raise Exception('Rate limit exceeded')
    else:
        raise Exception(f'Error: {response.text}')

# Usage
try:
    result = send_whatsapp_message('628123456789', 'Hello from Python!')
    print(f"Message sent: {result['data']['messageId']}")
except Exception as e:
    print(f"Error: {e}")
```

---

## Project Structure

```
whatsapp-gateway/
├── src/
│   ├── config/
│   │   └── env.js                    # Environment configuration
│   ├── whatsapp/
│   │   ├── client.js                 # Baileys client (singleton)
│   │   ├── handlers.js               # Connection event handlers
│   │   └── utils.js                  # Phone formatting utilities
│   ├── api/
│   │   ├── routes.js                 # Route definitions
│   │   └── controllers/
│   │       ├── qr.controller.js      # QR code endpoint
│   │       ├── status.controller.js  # Status & health endpoints
│   │       └── send.controller.js    # Send text & image endpoints
│   ├── middleware/
│   │   ├── auth.middleware.js        # API key authentication
│   │   ├── rateLimit.middleware.js   # Rate limiting (20 req/min)
│   │   ├── security.middleware.js    # Security headers
│   │   ├── validation.middleware.js  # Request validation
│   │   ├── upload.middleware.js      # Multer config (memory)
│   │   └── error.middleware.js       # Error handler
│   ├── utils/
│   │   └── validateEnv.js            # Environment validation
│   └── index.js                      # Entry point
├── tests/
│   ├── api.test.js                   # API endpoint tests
│   └── integration.test.js           # Integration tests
├── scripts/
│   ├── start.sh                      # Production startup script
│   ├── stop.sh                       # Stop script
│   └── benchmark.js                  # Performance benchmark
├── auth_info_baileys/                # Session storage (auto-generated)
├── logs/                             # PM2 logs (auto-generated)
├── ecosystem.config.js               # PM2 configuration
├── package.json                      # Dependencies & scripts
├── .env.example                      # Environment template
└── README.md                         # This file
```

---

## Links & Resources

- **Baileys Documentation:** [GitHub - WhiskeySockets/Baileys](https://github.com/WhiskeySockets/Baileys)
- **Performance Benchmarks:** See `PERFORMANCE.md`
- **Project Master Plan:** See `PROJECT_MASTER_PLAN.md`
- **Completion Report:** See `PROJECT_COMPLETION_REPORT.md`

---

## Important Notes

### WhatsApp Limitations
- **Single Instance Only:** Satu nomor WhatsApp hanya bisa connect ke 1 instance
- **Rate Limiting:** WhatsApp membatasi jumlah pesan per waktu (handled by queue)
- **Session Expiry:** Session bisa expire jika tidak aktif lama atau logout dari HP

### Best Practices
- Backup `auth_info_baileys/` secara berkala
- Monitor logs untuk error & unusual activity
- Gunakan HTTPS dengan reverse proxy (nginx)
- Set CORS_ORIGIN ke domain specific (production)
- Generate API_KEY yang strong (min 32 chars random)
- Monitor memory usage dengan PM2
- Setup health check monitoring (uptime service)

### Known Limitations
- Tidak support cluster mode (WhatsApp limitation)
- Queue di-memory (lost on restart, tapi messages aman)
- Rate limiting per-instance (tidak shared)
- Tidak support send video/document/audio (yet - future improvement)

---

## Contributing

Contributions are welcome! Please:
1. Fork repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

---

## License

ISC License - see LICENSE file for details.

---

## Author & Support

Developed using orchestrated AI development methodology.

**Need Help?**
- Check [Troubleshooting](#troubleshooting) section
- Report issues on GitHub
- Discussion forum

---

## Performance

- **Response Time:** < 1s (text), < 5s (image)
- **Memory Usage:** ~100-150 MB
- **Throughput:** 10+ messages/second
- **Uptime:** 99%+ with PM2

Full benchmarks available in `PERFORMANCE.md`

---

**Last Updated:** 2026-06-17  
**Version:** 1.0.0  
**Status:** Production Ready
