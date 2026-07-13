# Socket.IO Integration

Gateway WhatsApp supports Socket.IO for real-time integration with external applications.

## Connection

Connect to Gateway Socket.IO server:

```javascript
import { io } from 'socket.io-client';

const socket = io('https://chat.gatrion.my.id', {
  auth: {
    key: 'your-auth-key',
    clientType: 'your-app-name'
  },
  transports: ['websocket', 'polling']
});
```

## Incoming Events (Gateway → Client)

### 1. whatsapp:message

Received whenever a WhatsApp message arrives.

**Event:** `whatsapp:message`

**Room:** `session-${sessionId}`

**Data:**
```javascript
{
  from: '628123456789',           // Phone number of sender
  message: 'Message text',         // Text content
  sessionId: 'session-xxx',        // Session ID
  timestamp: 1234567890,           // Unix timestamp
  messageId: 'xxx',                // WhatsApp message ID
  type: 'text'                     // Message type: text, image, video, audio, document
}
```

**Example:**
```javascript
socket.on('whatsapp:message', (data) => {
  console.log('Received message from:', data.from);
  console.log('Message:', data.message);
  
  // Process message...
});
```

### 2. qr_ready

QR code generated for new session.

**Event:** `qr_ready`

**Data:**
```javascript
{
  sessionId: 'session-xxx',
  qrCode: 'data:image/png;base64,...'
}
```

### 3. session_connected

WhatsApp session successfully connected.

**Event:** `session_connected`

**Data:**
```javascript
{
  sessionId: 'session-xxx',
  phone: '628123456789'
}
```

### 4. session_disconnected

WhatsApp session disconnected.

**Event:** `session_disconnected`

**Data:**
```javascript
{
  sessionId: 'session-xxx'
}
```

## Outgoing Events (Client → Gateway)

### 1. send:message

Send WhatsApp message via Gateway.

**Event:** `send:message`

**Data:**
```javascript
{
  sessionId: 'session-xxx',        // Session ID (required)
  to: '628123456789',              // Phone number destination (required)
  message: 'Text to send',         // Message text (required)
  timestamp: Date.now()            // Timestamp (optional)
}
```

**Example:**
```javascript
socket.emit('send:message', {
  sessionId: 'session-9f26af0f7c98556d',
  to: '628123456789',
  message: 'Hello from my app!',
  timestamp: Date.now()
});
```

### 2. join-session

Join session room to listen for messages.

**Event:** `join-session`

**Data:** `sessionId` (string)

**Example:**
```javascript
socket.emit('join-session', 'session-xxx');
```

**Response:** `joined-session` event
```javascript
socket.on('joined-session', (data) => {
  console.log('Joined:', data.room);
  // { sessionId: 'session-xxx', room: 'session-xxx' }
});
```

### 3. leave-session

Leave session room.

**Event:** `leave-session`

**Data:** `sessionId` (string)

**Example:**
```javascript
socket.emit('leave-session', 'session-xxx');
```

## Confirmation Events

### message:sent

Message successfully sent.

**Event:** `message:sent`

**Data:**
```javascript
{
  sessionId: 'session-xxx',
  to: '628123456789',
  success: true,
  timestamp: 1234567890
}
```

### message:error

Error sending message.

**Event:** `message:error`

**Data:**
```javascript
{
  sessionId: 'session-xxx',
  error: 'Error message',
  timestamp: 1234567890
}
```

## Complete Integration Example

```javascript
import { io } from 'socket.io-client';

// Connect
const socket = io('https://chat.gatrion.my.id', {
  auth: {
    key: 'your-auth-key',
    clientType: 'my-app'
  }
});

// Join session room
socket.emit('join-session', 'session-9f26af0f7c98556d');

// Confirm room join
socket.on('joined-session', (data) => {
  console.log('Successfully joined room:', data.room);
});

// Listen for incoming messages
socket.on('whatsapp:message', async (data) => {
  console.log('Received:', data.message);
  
  // Process message...
  const response = await processMessage(data.message);
  
  // Send response
  socket.emit('send:message', {
    sessionId: data.sessionId,
    to: data.from,
    message: response,
    timestamp: Date.now()
  });
});

// Listen for confirmations
socket.on('message:sent', (data) => {
  console.log('Message delivered:', data);
});

socket.on('message:error', (data) => {
  console.error('Failed to send:', data.error);
});

// Handle disconnection
socket.on('disconnect', (reason) => {
  console.log('Disconnected:', reason);
});
```

## Use Cases

1. **Chatbot Integration** - Build chatbots that respond to WhatsApp messages
2. **AI Assistant** - Integrate with Claude, GPT, or other AI services
3. **Automation** - Automate WhatsApp responses based on keywords or patterns
4. **Multi-platform** - Connect WhatsApp with other platforms (Telegram, Discord, Slack)
5. **Analytics** - Track and analyze WhatsApp conversations in real-time
6. **Customer Support** - Build custom support systems with routing and assignment
7. **Notifications** - Send automated notifications and alerts via WhatsApp

## Room-based Routing

Gateway uses room-based routing for message isolation:

- **Format:** `session-${sessionId}`
- Clients must join rooms to receive messages
- Multiple clients can join the same room
- Messages broadcast to all clients in the room
- Automatic cleanup when clients disconnect

**Example:**
```javascript
// Session ID: 9f26af0f7c98556d
// Room name: session-9f26af0f7c98556d

socket.emit('join-session', '9f26af0f7c98556d');
// OR with full prefix
socket.emit('join-session', 'session-9f26af0f7c98556d');
```

Both formats work - the Gateway automatically handles the `session-` prefix.

## Error Handling

Always handle errors when sending messages:

```javascript
socket.on('message:error', (data) => {
  console.error('Error:', data.error);
  
  // Common errors:
  // - "Missing required fields: sessionId, message, or to"
  // - "SessionManager not initialized"
  // - "Session not found"
  // - "Failed to send message"
  
  // Implement retry logic if needed
  if (data.error.includes('Session not found')) {
    // Session might be disconnected, handle reconnection
  }
});
```

## Best Practices

1. **Always join rooms** - You won't receive messages unless you join the session room
2. **Handle reconnections** - Socket.IO automatically reconnects, but you need to rejoin rooms
3. **Validate data** - Always validate incoming message data before processing
4. **Error handling** - Listen for `message:error` events and handle appropriately
5. **Clean up** - Leave rooms when done to reduce server load
6. **Rate limiting** - Implement rate limiting on your side to avoid overwhelming the Gateway
7. **Timeouts** - Set reasonable timeouts for message responses

## Connection Options

```javascript
const socket = io('https://chat.gatrion.my.id', {
  // Use WebSocket only (recommended for production)
  transports: ['websocket'],
  
  // Fallback to polling if WebSocket fails
  // transports: ['websocket', 'polling'],
  
  // Reconnection settings
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  
  // Timeout settings
  timeout: 20000,
  
  // Authentication
  auth: {
    key: 'your-auth-key',
    clientType: 'your-app-name'
  }
});
```

## Auto-reconnect Handler

```javascript
let currentSessionId = 'session-xxx';

socket.on('connect', () => {
  console.log('Connected to Gateway');
  
  // Rejoin room after reconnection
  socket.emit('join-session', currentSessionId);
});

socket.on('disconnect', (reason) => {
  console.log('Disconnected:', reason);
  
  if (reason === 'io server disconnect') {
    // Server forcefully disconnected, manually reconnect
    socket.connect();
  }
  // else: automatic reconnection will be attempted
});
```

## TypeScript Support

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

interface SendMessageData {
  sessionId: string;
  to: string;
  message: string;
  timestamp?: number;
}

interface MessageSent {
  sessionId: string;
  to: string;
  success: boolean;
  timestamp: number;
}

interface MessageError {
  sessionId: string;
  error: string;
  timestamp: number;
}

const socket: Socket = io('https://chat.gatrion.my.id', {
  auth: {
    key: 'your-auth-key',
    clientType: 'my-app'
  }
});

socket.on('whatsapp:message', (data: WhatsAppMessage) => {
  console.log(data.message);
});

socket.emit('send:message', {
  sessionId: 'session-xxx',
  to: '628123456789',
  message: 'Hello'
} as SendMessageData);
```

## Security Considerations

1. **Authentication** - Always use the `auth` option with a valid API key
2. **Validate origins** - Configure CORS properly on the Gateway server
3. **Encrypt connections** - Use WSS (WebSocket Secure) in production
4. **Rate limiting** - Implement rate limiting to prevent abuse
5. **Message validation** - Validate all incoming messages before processing
6. **Secret management** - Never hardcode API keys, use environment variables

## Troubleshooting

### Not Receiving Messages

1. Check if you joined the room: `socket.emit('join-session', sessionId)`
2. Verify session ID is correct
3. Check if WhatsApp session is connected
4. Verify Socket.IO connection: `socket.connected` should be `true`

### Messages Not Sending

1. Check if SessionManager is initialized
2. Verify session ID exists and is connected
3. Check phone number format (should be: `628xxx` without `+` or spaces)
4. Listen for `message:error` events for specific error messages

### Connection Issues

1. Check network connectivity
2. Verify Gateway URL is correct
3. Check if API key is valid
4. Try using both `websocket` and `polling` transports
5. Check browser console / server logs for errors

## Performance Tips

1. **WebSocket only** - Use `transports: ['websocket']` for better performance
2. **Room management** - Leave rooms when not needed
3. **Batch operations** - Group multiple operations when possible
4. **Connection pooling** - Reuse Socket.IO connections
5. **Message queuing** - Queue messages on client side if rate limited
