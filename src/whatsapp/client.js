import makeWASocket, { useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys';
import pino from 'pino';
import { config } from '../config/env.js';
import { setupConnectionHandlers, getConnectionState } from './handlers.js';

// Singleton instance
let sock = null;
let authState = null;

/**
 * Initialize WhatsApp client
 * @returns {Promise<object>} Socket instance
 */
export async function initializeClient() {
  if (sock) {
    console.log('Client already initialized');
    return sock;
  }
  
  try {
    // Load auth state
    const { state, saveCreds } = await useMultiFileAuthState(config.whatsapp.sessionPath);
    authState = state;
    
    // Create socket
    sock = makeWASocket({
      auth: state,
      printQRInTerminal: true,
      syncFullHistory: false,
      markOnlineOnConnect: false,
      generateHighQualityLinkPreview: false,
      browser: ['WhatsApp Gateway', 'Chrome', '10.0'],
      logger: pino({ level: config.logging.level })
    });
    
    // Setup event handlers
    setupConnectionHandlers(sock, saveCreds);
    
    console.log('WhatsApp client initialized');
    return sock;
    
  } catch (error) {
    console.error('Failed to initialize client:', error);
    throw error;
  }
}

/**
 * Get current connection state
 * @returns {object} Connection state
 */
export function getClientConnectionState() {
  return getConnectionState();
}

/**
 * Get QR code (base64)
 * @returns {string|null} Base64 QR code or null
 */
export function getQRCode() {
  const state = getConnectionState();
  return state.qr;
}

/**
 * Check if client is connected
 * @returns {boolean}
 */
export function isConnected() {
  const state = getConnectionState();
  return state.state === 'connected';
}

/**
 * Disconnect client gracefully
 */
export async function disconnect() {
  if (!sock) {
    console.log('Client not initialized');
    return;
  }
  
  try {
    await sock.logout();
    sock = null;
    authState = null;
    console.log('Client disconnected');
  } catch (error) {
    console.error('Error during disconnect:', error);
    sock = null;
    authState = null;
  }
}

/**
 * Get socket instance (for advanced use)
 * @returns {object|null} Socket instance
 */
export function getSocket() {
  return sock;
}
