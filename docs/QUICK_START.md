# Quick Start Integration Guide

Get started with WhatsApp Gateway Socket.IO integration in 5 minutes.

## Prerequisites

- Node.js >= 20.0.0
- WhatsApp Gateway running (see main [README](../README.md))
- Valid API key

## Step 1: Install Socket.IO Client

```bash
npm install socket.io-client
```

## Step 2: Connect to Gateway

```javascript
import { io } from 'socket.io-client';

const socket = io('https://chat.gatrion.my.id', {
  auth: {
    key: 'your-api-key',
    clientType: 'my-app'
  },
  transports: ['websocket']
});

socket.on('connect', () => {
  console.log('Connected to Gateway');
});
```

## Step 3: Create WhatsApp Session

```javascript
// Using HTTP API
const response = await fetch('https://chat.gatrion.my.id/api/sessions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': 'your-api-key'
  },
  body: JSON.stringify({
    name: 'My Bot Session'
  })
});

const { sessionId } = (await response.json()).data;
console.log('Session created:', sessionId);
```

## Step 4: Join Session Room

```javascript
socket.emit('join-session', sessionId);

socket.on('joined-session', (data) => {
  console.log('Joined room:', data.room);
});
```

## Step 5: Scan QR Code

```javascript
socket.on('qr_ready', (data) => {
  console.log('Scan this QR code:');
  console.log(data.qrCode); // Base64 PNG image
  
  // Display QR code in your UI
  // Example: <img src="${data.qrCode}" />
});

socket.on('session_connected', (data) => {
  console.log('WhatsApp connected:', data.phone);
});
```

## Step 6: Receive Messages

```javascript
socket.on('whatsapp:message', (data) => {
  console.log('Message from:', data.from);
  console.log('Text:', data.message);
  console.log('Type:', data.type);
  
  // Process message...
});
```

## Step 7: Send Messages

```javascript
socket.emit('send:message', {
  sessionId: sessionId,
  to: '628123456789',
  message: 'Hello from my app!'
});

// Listen for confirmation
socket.on('message:sent', (data) => {
  console.log('Message sent to:', data.to);
});

socket.on('message:error', (data) => {
  console.error('Error:', data.error);
});
```

## Complete Example

```javascript
import { io } from 'socket.io-client';

const API_URL = 'https://chat.gatrion.my.id/api';
const API_KEY = 'your-api-key';

// Step 1: Connect Socket.IO
const socket = io('https://chat.gatrion.my.id', {
  auth: {
    key: API_KEY,
    clientType: 'my-chatbot'
  }
});

// Step 2: Create session
async function initialize() {
  const response = await fetch(`${API_URL}/sessions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY
    },
    body: JSON.stringify({ name: 'Chatbot Session' })
  });
  
  const { sessionId } = (await response.json()).data;
  
  // Step 3: Join room
  socket.emit('join-session', sessionId);
  
  return sessionId;
}

// Step 4: Setup event listeners
let sessionId;

socket.on('connect', async () => {
  console.log('Connected to Gateway');
  sessionId = await initialize();
});

socket.on('qr_ready', (data) => {
  console.log('Scan QR code:');
  console.log(data.qrCode);
});

socket.on('session_connected', (data) => {
  console.log('WhatsApp connected:', data.phone);
});

socket.on('whatsapp:message', (data) => {
  console.log('Received:', data.message);
  
  // Echo bot example
  socket.emit('send:message', {
    sessionId: data.sessionId,
    to: data.from,
    message: `You said: ${data.message}`
  });
});

socket.on('message:sent', (data) => {
  console.log('Sent to:', data.to);
});

socket.on('message:error', (data) => {
  console.error('Error:', data.error);
});
```

## Simple Chatbot Example

```javascript
import { io } from 'socket.io-client';

const socket = io('https://chat.gatrion.my.id', {
  auth: { key: 'your-api-key', clientType: 'chatbot' }
});

let sessionId = 'session-xxx'; // Your session ID

// Join session
socket.emit('join-session', sessionId);

// Handle incoming messages
socket.on('whatsapp:message', async (data) => {
  const userMessage = data.message.toLowerCase();
  let response = '';
  
  // Simple command handling
  if (userMessage.includes('hello')) {
    response = 'Hello! How can I help you?';
  } else if (userMessage.includes('help')) {
    response = 'Available commands:\n- hello\n- help\n- time';
  } else if (userMessage.includes('time')) {
    response = `Current time: ${new Date().toLocaleString()}`;
  } else {
    response = "I don't understand. Type 'help' for commands.";
  }
  
  // Send response
  socket.emit('send:message', {
    sessionId: data.sessionId,
    to: data.from,
    message: response
  });
});
```

## AI Integration Example (Claude/GPT)

```javascript
import { io } from 'socket.io-client';
import Anthropic from '@anthropic-ai/sdk';

const claude = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY
});

const socket = io('https://chat.gatrion.my.id', {
  auth: { key: 'your-api-key', clientType: 'ai-assistant' }
});

let sessionId = 'session-xxx';

socket.emit('join-session', sessionId);

socket.on('whatsapp:message', async (data) => {
  try {
    // Get AI response
    const message = await claude.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: data.message
      }]
    });
    
    const aiResponse = message.content[0].text;
    
    // Send AI response back to WhatsApp
    socket.emit('send:message', {
      sessionId: data.sessionId,
      to: data.from,
      message: aiResponse
    });
    
  } catch (error) {
    console.error('AI Error:', error);
    socket.emit('send:message', {
      sessionId: data.sessionId,
      to: data.from,
      message: 'Sorry, I encountered an error. Please try again.'
    });
  }
});
```

## Multi-platform Bridge Example

Bridge WhatsApp with Telegram:

```javascript
import { io } from 'socket.io-client';
import TelegramBot from 'node-telegram-bot-api';

const whatsapp = io('https://chat.gatrion.my.id', {
  auth: { key: 'your-api-key', clientType: 'bridge' }
});

const telegram = new TelegramBot('YOUR_TELEGRAM_TOKEN', { polling: true });

const sessionId = 'session-xxx';
whatsapp.emit('join-session', sessionId);

// WhatsApp → Telegram
whatsapp.on('whatsapp:message', (data) => {
  telegram.sendMessage(TELEGRAM_CHAT_ID, 
    `From ${data.from}:\n${data.message}`
  );
});

// Telegram → WhatsApp
telegram.on('message', (msg) => {
  whatsapp.emit('send:message', {
    sessionId: sessionId,
    to: '628123456789', // Target WhatsApp number
    message: `From Telegram:\n${msg.text}`
  });
});
```

## TypeScript Example

```typescript
import { io, Socket } from 'socket.io-client';

interface WhatsAppMessage {
  from: string;
  message: string;
  sessionId: string;
  timestamp: number;
  messageId: string;
  type: 'text' | 'image' | 'video' | 'audio' | 'document';
}

const socket: Socket = io('https://chat.gatrion.my.id', {
  auth: {
    key: 'your-api-key',
    clientType: 'typescript-app'
  }
});

const sessionId = 'session-xxx';

socket.emit('join-session', sessionId);

socket.on('whatsapp:message', (data: WhatsAppMessage) => {
  console.log(`Message from ${data.from}: ${data.message}`);
  
  socket.emit('send:message', {
    sessionId: data.sessionId,
    to: data.from,
    message: 'Message received!'
  });
});
```

## Error Handling

```javascript
socket.on('connect_error', (error) => {
  console.error('Connection error:', error.message);
});

socket.on('disconnect', (reason) => {
  console.log('Disconnected:', reason);
  
  if (reason === 'io server disconnect') {
    // Manually reconnect
    socket.connect();
  }
});

socket.on('message:error', (data) => {
  console.error('Message error:', data.error);
  
  // Handle specific errors
  if (data.error.includes('Session not found')) {
    // Recreate session
  }
});
```

## Best Practices

1. **Always join rooms** before expecting messages
2. **Handle reconnections** - rejoin rooms after reconnect
3. **Validate incoming data** before processing
4. **Implement rate limiting** on your side
5. **Log errors** for debugging
6. **Use environment variables** for secrets
7. **Test with small groups** before production

## Common Issues

### Not Receiving Messages

```javascript
// Solution: Make sure you joined the room
socket.emit('join-session', sessionId);

// Verify join
socket.on('joined-session', (data) => {
  console.log('Successfully joined:', data.room);
});
```

### Messages Not Sending

```javascript
// Solution: Check session is connected
const response = await fetch(`${API_URL}/sessions/${sessionId}/status`, {
  headers: { 'x-api-key': API_KEY }
});
const { status } = (await response.json()).data;

if (status !== 'connected') {
  console.log('Session not connected. Status:', status);
}
```

### Connection Drops

```javascript
// Solution: Implement auto-reconnect
socket.on('connect', () => {
  console.log('Reconnected!');
  // Rejoin all rooms
  socket.emit('join-session', sessionId);
});
```

## Next Steps

- Read [Socket.IO Integration Guide](SOCKETIO_INTEGRATION.md) for complete documentation
- Check [API Reference](API_REFERENCE.md) for all endpoints
- Review [Architecture Documentation](ARCHITECTURE.md) for system design

## Production Checklist

- [ ] Use HTTPS/WSS (not HTTP/WS)
- [ ] Implement error handling
- [ ] Add logging
- [ ] Set up monitoring
- [ ] Configure rate limiting
- [ ] Use environment variables
- [ ] Test reconnection logic
- [ ] Implement retry mechanism
- [ ] Add health checks
- [ ] Document your integration

---

Need help? Check the [complete documentation](SOCKETIO_INTEGRATION.md) or [create an issue](https://github.com/adi-santoso/gatrion-whatsapp-gateway/issues).
