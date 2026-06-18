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
  try {
    // Reset existing connection if any
    if (sock) {
      console.log('Resetting existing client...');
      sock = null;
      authState = null;
    }
    
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
    
    // Setup event handlers with reconnect callback
    setupConnectionHandlers(sock, saveCreds, () => {
      initializeClient().catch(err => {
        console.error('Auto-reconnect failed:', err);
      });
    });
    
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

// Message queue
const messageQueue = [];
let isProcessingQueue = false;

/**
 * Process message queue with delay
 */
async function processQueue() {
  if (isProcessingQueue || messageQueue.length === 0) return;
  
  isProcessingQueue = true;
  
  while (messageQueue.length > 0) {
    const { jid, content, resolve, reject } = messageQueue.shift();
    
    try {
      if (!sock) {
        throw new Error('WhatsApp client not initialized');
      }
      
      const result = await sock.sendMessage(jid, content);
      resolve({ id: result.key.id, status: 'sent' });
    } catch (error) {
      reject(error);
    }
    
    // Delay between messages
    if (messageQueue.length > 0) {
      await new Promise(resolve => setTimeout(resolve, 150));
    }
  }
  
  isProcessingQueue = false;
}

/**
 * Send text message
 * @param {string} to - Phone number or JID
 * @param {string} message - Text message
 * @returns {Promise<object>} Message result
 */
export async function sendTextMessage(to, message) {
  return new Promise((resolve, reject) => {
    if (!sock) {
      return reject(new Error('WhatsApp client not initialized'));
    }
    
    if (!isConnected()) {
      return reject(new Error('WhatsApp not connected'));
    }
    
    const jid = to.includes('@s.whatsapp.net') ? to : `${to}@s.whatsapp.net`;
    
    messageQueue.push({ jid, content: { text: message }, resolve, reject });
    processQueue();
  });
}

/**
 * Send image message
 * @param {string} to - Phone number or JID
 * @param {Buffer} imageBuffer - Image buffer
 * @param {object} options - Options { caption, mimetype }
 * @returns {Promise<object>} Message result
 */
export async function sendImageMessage(to, imageBuffer, options = {}) {
  return new Promise((resolve, reject) => {
    if (!sock) {
      return reject(new Error('WhatsApp client not initialized'));
    }
    
    if (!isConnected()) {
      return reject(new Error('WhatsApp not connected'));
    }
    
    const jid = to.includes('@s.whatsapp.net') ? to : `${to}@s.whatsapp.net`;
    
    const content = {
      image: imageBuffer,
      caption: options.caption || '',
      mimetype: options.mimetype
    };
    
    messageQueue.push({ jid, content, resolve, reject });
    processQueue();
  });
}
