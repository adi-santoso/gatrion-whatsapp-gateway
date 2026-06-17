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

## License

ISC
