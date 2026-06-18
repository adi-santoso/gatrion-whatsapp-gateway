import qrcode from 'qrcode-terminal';
import QRCode from 'qrcode';
import { DisconnectReason } from '@whiskeysockets/baileys';

let connectionState = {
  state: 'disconnected',
  qr: null,
  phone: null,
  timestamp: null
};

/**
 * Get current connection state
 * @returns {object} Connection state
 */
export function getConnectionState() {
  return { ...connectionState };
}

/**
 * Update connection state
 * @param {object} updates - State updates
 */
function updateConnectionState(updates) {
  connectionState = {
    ...connectionState,
    ...updates,
    timestamp: Date.now()
  };
}

/**
 * Setup connection event handlers
 * @param {object} sock - Baileys socket instance
 * @param {function} saveCreds - Save credentials function
 * @param {function} reconnectCallback - Callback to reinitialize client
 */
export function setupConnectionHandlers(sock, saveCreds, reconnectCallback) {
  // Handle connection updates
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;
    
    // QR code required
    if (qr) {
      console.log('QR Code received, scan to authenticate:');
      qrcode.generate(qr, { small: true });
      
      // Generate base64 QR code
      try {
        const qrBase64 = await QRCode.toDataURL(qr);
        updateConnectionState({
          state: 'qr_required',
          qr: qrBase64
        });
      } catch (err) {
        console.error('Failed to generate QR base64:', err);
      }
    }
    
    // Connection opened
    if (connection === 'open') {
      const phoneNumber = sock.user?.id?.split(':')[0];
      console.log('✓ WhatsApp connected:', phoneNumber);
      updateConnectionState({
        state: 'connected',
        phone: phoneNumber,
        qr: null
      });
    }
    
    // Connection closed
    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      
      console.log('Connection closed. Reconnect:', shouldReconnect);
      updateConnectionState({
        state: 'disconnected',
        qr: null
      });
      
      if (shouldReconnect) {
        console.log('Reconnecting in 3 seconds...');
        setTimeout(() => {
          if (reconnectCallback) {
            reconnectCallback();
          }
        }, 3000);
      }
    }
    
    // Connecting state
    if (connection === 'connecting') {
      updateConnectionState({ state: 'connecting' });
    }
  });
  
  // Auto-save credentials
  sock.ev.on('creds.update', saveCreds);
}
