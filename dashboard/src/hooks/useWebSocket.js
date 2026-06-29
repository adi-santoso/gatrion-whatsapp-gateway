import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

export function useWebSocket(sessionId) {
  const [qrCode, setQrCode] = useState(null);
  const [status, setStatus] = useState('connecting');
  const [phone, setPhone] = useState(null);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (!sessionId) {
      console.log('[useWebSocket] No sessionId provided');
      return;
    }

    console.log('[useWebSocket] Initializing for sessionId:', sessionId);

    const apiKey = localStorage.getItem('apiKey');
    console.log('[useWebSocket] API Key:', apiKey ? 'exists' : 'missing');

    // Use relative URL for production compatibility
    const newSocket = io(window.location.origin, {
      transports: ['websocket'],
      auth: {
        apiKey: apiKey
      }
    });

    newSocket.on('connect', () => {
      console.log('[useWebSocket] Socket connected, ID:', newSocket.id);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('[useWebSocket] Socket disconnected, reason:', reason);
    });

    newSocket.on('connect_error', (error) => {
      console.error('[useWebSocket] Connection error:', error);
    });

    setSocket(newSocket);

    // Join session room
    console.log('[useWebSocket] Joining session room:', sessionId);
    newSocket.emit('join-session', sessionId);

    // Listen for QR code (backend emits 'qr_ready')
    newSocket.on('qr_ready', (data) => {
      console.log('[useWebSocket] Received qr_ready event:', data);
      if (data.sessionId === sessionId) {
        console.log('[useWebSocket] QR Code received for this session');
        setQrCode(data.qrCode);
        setStatus('qr_ready');
      } else {
        console.log('[useWebSocket] QR Code is for different session:', data.sessionId);
      }
    });

    // Listen for session connected
    newSocket.on('session_connected', (data) => {
      console.log('[useWebSocket] Received session_connected event:', data);
      if (data.sessionId === sessionId) {
        console.log('[useWebSocket] Session connected with phone:', data.phone);
        setPhone(data.phone);
        setStatus('connected');
        setQrCode(null);
      }
    });

    // Listen for session disconnected
    newSocket.on('session_disconnected', (data) => {
      console.log('[useWebSocket] Received session_disconnected event:', data);
      if (data.sessionId === sessionId) {
        console.log('[useWebSocket] Session disconnected');
        setStatus('disconnected');
        setQrCode(null);
      }
    });

    // Listen for errors
    newSocket.on('error', (data) => {
      console.error('[useWebSocket] Error event:', data);
      if (data.sessionId === sessionId) {
        console.error('[useWebSocket] Error for this session');
        setStatus('failed');
      }
    });

    return () => {
      console.log('[useWebSocket] Cleanup - leaving session:', sessionId);
      if (newSocket) {
        newSocket.emit('leave-session', sessionId);
        newSocket.disconnect();
      }
    };
  }, [sessionId]);

  return { qrCode, status, phone, socket };
}
