import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

export function useWebSocket(sessionId) {
  const [qrCode, setQrCode] = useState(null);
  const [status, setStatus] = useState('connecting');
  const [phone, setPhone] = useState(null);

  useEffect(() => {
    if (!sessionId) return;

    const socket = io('http://localhost:3000', {
      query: { sessionId }
    });

    socket.on('qr_ready', (data) => {
      setQrCode(data.qrCode);
      setStatus('qr_ready');
    });

    socket.on('session_connected', (data) => {
      setPhone(data.phone);
      setStatus('connected');
      setQrCode(null);
    });

    socket.on('session_disconnected', () => {
      setStatus('disconnected');
      setQrCode(null);
    });

    return () => socket.disconnect();
  }, [sessionId]);

  return { qrCode, status, phone };
}
