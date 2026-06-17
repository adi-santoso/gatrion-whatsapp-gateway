# WhatsApp Gateway Service

A lightweight WhatsApp Gateway API built with Baileys v7 and Express. Single instance implementation with file-based session storage.

## Requirements

- Node.js >= 20.0.0
- npm or yarn

## Installation

1. Clone the repository
2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

4. Edit `.env` and configure your settings:
   - Set `API_KEY` for authentication
   - Configure `PORT` (default: 3000)
   - Adjust other settings as needed

## Running the Application

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

### Run Tests
```bash
npm test
```

## API Endpoints (Preview)

- `GET /health` - Health check
- `GET /qr` - Get QR code for WhatsApp authentication
- `GET /status` - Check connection status
- `POST /send-message` - Send text message
- `POST /send-media` - Send media (image, video, document)

Full API documentation will be available after deployment.

## Project Structure

```
whatsapp-gateway/
├── src/
│   ├── config/          # Configuration files
│   ├── whatsapp/        # WhatsApp connection logic
│   ├── api/
│   │   └── controllers/ # API route controllers
│   ├── middleware/      # Express middleware
│   └── utils/           # Utility functions
├── auth_info_baileys/   # Session storage (auto-generated)
├── logs/                # Application logs
├── tests/               # Test files
└── scripts/             # Utility scripts
```

## Production Deployment

### Prerequisites

- Node.js >= 20.0.0
- PM2 (process manager)
- Linux server (recommended)

### Setup

1. Install PM2 globally:
```bash
npm install -g pm2
```

2. Clone and configure:
```bash
git clone <repository-url>
cd whatsapp-gateway
cp .env.example .env
```

3. Edit `.env` with production settings:
   - Set `API_KEY` (minimum 32 characters)
   - Set `NODE_ENV=production`
   - Configure other variables as needed

### Start/Stop

**Linux/macOS:**
```bash
# Start
chmod +x scripts/start.sh
./scripts/start.sh

# Stop
chmod +x scripts/stop.sh
./scripts/stop.sh
```

**Manual PM2 commands:**
```bash
# Start
pm2 start ecosystem.config.js --env production

# Stop
pm2 stop whatsapp-gateway

# Restart
pm2 restart whatsapp-gateway

# Delete from PM2
pm2 delete whatsapp-gateway
```

### Monitoring

```bash
# View logs
pm2 logs whatsapp-gateway

# Check status
pm2 status

# Monitor resources
pm2 monit

# Health check endpoint
curl http://localhost:3000/api/health
```

### Health Check

The `/api/health` endpoint returns:
- Service status
- Uptime
- Memory usage (used, total, external, rss in MB)
- WhatsApp connection state
- Node.js version
- Platform and PID

### Session Backup

⚠️ **Important**: Backup the `auth_info_baileys/` directory regularly to preserve your WhatsApp session. Loss of this directory will require re-authentication.

### Resource Usage

- **Memory**: ~100-150 MB RAM under normal load
- **CPU**: Low (~1-5% idle, spikes during message processing)
- **Disk**: ~50 MB + session data

### Important Notes

- **Single Instance Only**: WhatsApp client does not support multiple instances. PM2 is configured with `instances: 1` and `exec_mode: 'fork'`
- **Session Persistence**: Session data is stored in `auth_info_baileys/`
- **Graceful Shutdown**: The application handles SIGTERM/SIGINT gracefully

## License

ISC
