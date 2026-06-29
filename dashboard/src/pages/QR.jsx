import { useParams, useNavigate } from 'react-router-dom';
import { useWebSocket } from '../hooks/useWebSocket';
import { useEffect, useState } from 'react';
import { sessionApi } from '../api/client';

export default function QR() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { qrCode, status, phone } = useWebSocket(sessionId);
  const [sessionInfo, setSessionInfo] = useState(null);

  // Debug logs
  useEffect(() => {
    console.log('[QR Page] Mounted with sessionId:', sessionId);
  }, []);

  useEffect(() => {
    console.log('[QR Page] State changed:', { qrCode: qrCode ? 'exists' : 'null', status, phone });
  }, [qrCode, status, phone]);

  useEffect(() => {
    // Load session info
    const loadSession = async () => {
      try {
        console.log('[QR Page] Loading session info for:', sessionId);
        const res = await sessionApi.get(sessionId);
        console.log('[QR Page] Session info loaded:', res.data.data);
        setSessionInfo(res.data.data);
      } catch (err) {
        console.error('[QR Page] Failed to load session:', err);
      }
    };
    loadSession();
  }, [sessionId]);

  const getStatusInfo = () => {
    switch (status) {
      case 'connected':
        return {
          color: 'bg-green-500',
          text: 'Connected',
          icon: '✅',
          description: 'Your WhatsApp session is active and ready to use'
        };
      case 'qr_ready':
        return {
          color: 'bg-blue-500',
          text: 'QR Ready',
          icon: '📱',
          description: 'Scan the QR code with WhatsApp to connect'
        };
      case 'connecting':
        return {
          color: 'bg-yellow-500',
          text: 'Connecting...',
          icon: '⏳',
          description: 'Initializing connection, please wait'
        };
      case 'disconnected':
        return {
          color: 'bg-red-500',
          text: 'Disconnected',
          icon: '❌',
          description: 'Session is not connected. Refresh to generate QR code'
        };
      case 'failed':
        return {
          color: 'bg-red-500',
          text: 'Failed',
          icon: '⚠️',
          description: 'Connection failed. Please try again'
        };
      default:
        return {
          color: 'bg-gray-500',
          text: status,
          icon: '⚪',
          description: 'Unknown status'
        };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/')}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>Back to Sessions</span>
        </button>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {sessionInfo?.name || 'Session'}
            </h1>
            <p className="text-gray-600">Session ID: {sessionId}</p>
          </div>

          {/* Status Badge */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 px-4 py-2 bg-white rounded-lg border border-gray-200">
              <div className={`w-2.5 h-2.5 rounded-full ${statusInfo.color} animate-pulse`}></div>
              <span className="text-sm font-semibold text-gray-700">{statusInfo.text}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Card */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
        <div className="text-center">
          {/* Status Icon */}
          <div className="mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
              <span className="text-4xl">{statusInfo.icon}</span>
            </div>
            <p className="text-gray-600">{statusInfo.description}</p>
          </div>

          {/* QR Code Display */}
          {qrCode && status === 'qr_ready' && (
            <div className="mb-6 animate-fade-in">
              <div className="inline-block p-6 bg-white border-4 border-gray-200 rounded-2xl shadow-xl">
                <img
                  src={qrCode}
                  alt="QR Code"
                  className="w-64 h-64 mx-auto"
                />
              </div>

              {/* Instructions */}
              <div className="mt-8 p-6 bg-blue-50 rounded-xl border border-blue-200">
                <h3 className="font-semibold text-blue-900 mb-3 flex items-center justify-center space-x-2">
                  <span>📱</span>
                  <span>How to scan</span>
                </h3>
                <ol className="text-left text-sm text-blue-800 space-y-2 max-w-md mx-auto">
                  <li className="flex items-start space-x-2">
                    <span className="font-bold">1.</span>
                    <span>Open WhatsApp on your phone</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="font-bold">2.</span>
                    <span>Go to <strong>Settings → Linked Devices</strong></span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="font-bold">3.</span>
                    <span>Tap <strong>Link a Device</strong></span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="font-bold">4.</span>
                    <span>Point your phone at this screen to scan the code</span>
                  </li>
                </ol>
              </div>

              {/* QR Timeout Warning */}
              <div className="mt-4 text-xs text-gray-500">
                ⏱️ QR code expires after 60 seconds. A new one will be generated automatically.
              </div>
            </div>
          )}

          {/* Connecting State */}
          {status === 'connecting' && (
            <div className="py-12">
              <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-6"></div>
              <p className="text-lg font-semibold text-gray-700 mb-2">Initializing session...</p>
              <p className="text-sm text-gray-500">This may take a few seconds</p>
            </div>
          )}

          {/* Connected State */}
          {status === 'connected' && phone && (
            <div className="py-12">
              <div className="w-24 h-24 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                <span className="text-5xl">✅</span>
              </div>
              <h2 className="text-2xl font-bold text-green-700 mb-4">Successfully Connected!</h2>
              <div className="inline-flex items-center space-x-2 px-6 py-3 bg-green-50 rounded-lg border border-green-200 mb-6">
                <span className="text-2xl">📱</span>
                <span className="text-lg font-semibold text-green-800">{phone}</span>
              </div>
              <p className="text-gray-600 mb-8">Your session is ready to send and receive messages</p>

              <button
                onClick={() => navigate(`/send/${sessionId}`)}
                className="inline-flex items-center space-x-2 px-8 py-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-indigo-700 transition shadow-lg hover:shadow-xl"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <span>Send Message</span>
              </button>
            </div>
          )}

          {/* Disconnected State */}
          {(status === 'disconnected' || status === 'failed') && (
            <div className="py-12">
              <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-5xl">❌</span>
              </div>
              <h2 className="text-2xl font-bold text-red-700 mb-4">
                {status === 'failed' ? 'Connection Failed' : 'Session Disconnected'}
              </h2>
              <p className="text-gray-600 mb-8">
                {status === 'failed'
                  ? 'Unable to establish connection. Please try again.'
                  : 'The session has been disconnected from WhatsApp.'}
              </p>

              <button
                onClick={() => window.location.reload()}
                className="inline-flex items-center space-x-2 px-6 py-3 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Retry Connection</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Info Box */}
      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
        <div className="flex items-start space-x-3">
          <span className="text-2xl">💡</span>
          <div className="flex-1">
            <h4 className="font-semibold text-yellow-900 mb-1">Important Notes</h4>
            <ul className="text-sm text-yellow-800 space-y-1">
              <li>• Keep this window open while scanning the QR code</li>
              <li>• You can only link one device per WhatsApp number</li>
              <li>• Your phone must be connected to the internet</li>
              <li>• Session data is stored securely on the server</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
