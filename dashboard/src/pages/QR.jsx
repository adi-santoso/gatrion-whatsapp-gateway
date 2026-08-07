import { useParams, useNavigate } from 'react-router-dom';
import { useWebSocket } from '../hooks/useWebSocket';
import { useEffect, useState } from 'react';
import { sessionApi } from '../api/client';
import Icon from '../components/Icons.jsx';

export default function QR() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { qrCode, status, phone } = useWebSocket(sessionId);
  const [sessionInfo, setSessionInfo] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await sessionApi.get(sessionId);
        setSessionInfo(res.data.data);
      } catch (err) {
        console.error(err);
      }
    };
    load();
  }, [sessionId]);

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="flex items-center justify-center w-9 h-9 rounded-lg border border-slate-200 hover:bg-slate-50 transition"
          >
            <Icon.ArrowLeft className="w-4 h-4 text-slate-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{sessionInfo?.name || 'Session'}</h1>
            <p className="text-sm text-slate-500 font-mono">{sessionId}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg">
          <span className={`w-2 h-2 rounded-full ${
            status === 'connected' ? 'bg-emerald-500' :
            status === 'qr_ready' ? 'bg-blue-500' :
            status === 'connecting' ? 'bg-amber-500' :
            'bg-slate-400'
          } animate-pulse`} />
          <span className="text-sm font-medium text-slate-700 capitalize">{status.replace('_', ' ')}</span>
        </div>
      </div>

      {/* Main card */}
      <div className="card p-8 max-w-2xl mx-auto">
        <div className="text-center">
          {/* QR Ready */}
          {qrCode && status === 'qr_ready' && (
            <div className="animate-fade-in">
              <div className="inline-block p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
                <img src={qrCode} alt="QR Code" className="w-64 h-64 mx-auto" />
              </div>
              <div className="mt-6 p-4 bg-blue-50 border border-blue-100 rounded-lg text-left max-w-md mx-auto">
                <p className="text-sm font-medium text-blue-900 mb-2 flex items-center gap-2">
                  <Icon.Info className="w-4 h-4" />
                  How to scan
                </p>
                <ol className="text-sm text-blue-700 space-y-1.5 list-decimal list-inside">
                  <li>Open WhatsApp on your phone</li>
                  <li>Go to Settings → Linked Devices</li>
                  <li>Tap Link a Device</li>
                  <li>Point your phone at this QR code</li>
                </ol>
              </div>
              <p className="mt-4 text-xs text-slate-400 flex items-center justify-center gap-1.5">
                <Icon.Clock className="w-3.5 h-3.5" />
                QR expires after 60 seconds — auto-regenerates
              </p>
            </div>
          )}

          {/* Connecting */}
          {status === 'connecting' && (
            <div className="py-16">
              <svg className="animate-spin w-10 h-10 text-slate-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <p className="text-base font-medium text-slate-700">Initializing session...</p>
              <p className="text-sm text-slate-400 mt-1">This may take a few seconds</p>
            </div>
          )}

          {/* Connected */}
          {status === 'connected' && phone && (
            <div className="py-12 animate-fade-in">
              <div className="flex items-center justify-center w-16 h-16 bg-emerald-50 rounded-full mx-auto mb-5">
                <Icon.Check className="w-8 h-8 text-emerald-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">Connected!</h2>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-100 rounded-lg mb-2">
                <Icon.Phone className="w-4 h-4 text-emerald-600" />
                <span className="text-sm font-semibold text-emerald-700">{phone}</span>
              </div>
              <p className="text-sm text-slate-500 mb-6">Session is ready to send and receive messages</p>
              <button onClick={() => navigate(`/send/${sessionId}`)} className="btn-primary">
                <Icon.Send className="w-4 h-4" />
                Send Message
              </button>
            </div>
          )}

          {/* Disconnected */}
          {(status === 'disconnected' || status === 'failed') && (
            <div className="py-12">
              <div className="flex items-center justify-center w-16 h-16 bg-red-50 rounded-full mx-auto mb-5">
                <Icon.X className="w-8 h-8 text-red-500" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">
                {status === 'failed' ? 'Connection Failed' : 'Disconnected'}
              </h2>
              <p className="text-sm text-slate-500 mb-6 max-w-sm mx-auto">
                {status === 'failed'
                  ? 'Unable to establish connection. Please try again.'
                  : 'The session has been disconnected from WhatsApp.'}
              </p>
              <button onClick={() => window.location.reload()} className="btn-secondary">
                <Icon.Refresh className="w-4 h-4" />
                Retry
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="mt-4 max-w-2xl mx-auto p-4 bg-amber-50 border border-amber-100 rounded-lg">
        <div className="flex gap-2.5">
          <Icon.Alert className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-900 mb-1">Important</p>
            <ul className="text-xs text-amber-700 space-y-0.5">
              <li>Keep this window open while scanning the QR code</li>
              <li>Your phone must be connected to the internet</li>
              <li>Session data is stored securely on the server</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
