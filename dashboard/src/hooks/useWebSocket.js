import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { sessionApi } from '../api/client';

export function useWebSocket(sessionId) {
  const [qrCode, setQrCode] = useState(null);
  const [status, setStatus] = useState('connecting');
  const [phone, setPhone] = useState(null);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (!sessionId) return;

    // Fetch existing QR/status immediately on mount
    sessionApi.getQR(sessionId).then(res => {
      const d = res.data.data;
      if (d?.qr) {
        setQrCode(d.qr);
        setStatus(d.status || 'qr_ready');
      } else if (d?.status) {
        setStatus(d.status);
      }
    }).catch(() => {});

    const apiKey = localStorage.getItem('apiKey');
    const newSocket = io(window.location.origin, {
      transports: ['websocket'],
      auth: { apiKey }
    });

    setSocket(newSocket);
    newSocket.emit('join-session', sessionId);

    newSocket.on('qr_ready', (data) => {
      if (data.sessionId === sessionId || data.sessionId === `session-${sessionId}`) {
        setQrCode(data.qrCode);
        setStatus('qr_ready');
      }
    });

    newSocket.on('session_connected', (data) => {
      if (data.sessionId === sessionId || data.sessionId === `session-${sessionId}`) {
        setPhone(data.phone);
        setStatus('connected');
        setQrCode(null);
      }
    });

    newSocket.on('session_disconnected', (data) => {
      if (data.sessionId === sessionId || data.sessionId === `session-${sessionId}`) {
        setStatus('disconnected');
        setQrCode(null);
      }
    });

    newSocket.on('error', (data) => {
      if (data.sessionId === sessionId || data.sessionId === `session-${sessionId}`) {
        setStatus('failed');
      }
    });

    return () => {
      if (newSocket) {
        newSocket.emit('leave-session', sessionId);
        newSocket.disconnect();
      }
    };
  }, [sessionId]);

  return { qrCode, status, phone, socket };
}
