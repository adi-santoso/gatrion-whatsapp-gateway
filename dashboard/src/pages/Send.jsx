import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { messageApi, sessionApi } from '../api/client';
import Icon from '../components/Icons.jsx';

export default function Send() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({ to: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [sessionInfo, setSessionInfo] = useState(null);
  const [sessionStatus, setSessionStatus] = useState(null);

  useEffect(() => { loadSessionInfo(); }, [sessionId]);

  const loadSessionInfo = async () => {
    try {
      const [sessionRes, statusRes] = await Promise.all([
        sessionApi.get(sessionId),
        fetch(`/api/sessions/${sessionId}/status`, {
          headers: { 'x-api-key': localStorage.getItem('apiKey') }
        }).then(r => r.json())
      ]);
      setSessionInfo(sessionRes.data.data);
      setSessionStatus(statusRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  const sendMessage = async () => {
    if (!form.to.trim() || !form.message.trim()) {
      alert('Please fill all fields');
      return;
    }
    if (!/^\d+$/.test(form.to.trim())) {
      alert('Phone number must contain only digits (e.g., 628123456789)');
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const res = await messageApi.sendText({ sessionId, to: form.to.trim(), message: form.message.trim() });
      setResult({ success: true, data: res.data, timestamp: new Date().toLocaleTimeString() });
      setForm({ to: '', message: '' });
    } catch (err) {
      setResult({ success: false, error: err.response?.data?.error || err.message, timestamp: new Date().toLocaleTimeString() });
    } finally {
      setLoading(false);
    }
  };

  const isConnected = sessionStatus?.status === 'connected';

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
            <h1 className="text-2xl font-bold text-slate-900">Send Message</h1>
            <p className="text-sm text-slate-500">
              {sessionInfo?.name || 'Session'} · {sessionStatus?.phone || sessionId}
            </p>
          </div>
        </div>
        {sessionStatus && (
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${
            isConnected ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'
          }`}>
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-red-500'} animate-pulse`} />
            <span className={`text-sm font-medium ${isConnected ? 'text-emerald-700' : 'text-red-700'}`}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        )}
      </div>

      {/* Warning */}
      {!isConnected && sessionStatus && (
        <div className="mb-4 p-4 bg-amber-50 border border-amber-100 rounded-lg flex gap-2.5">
          <Icon.Alert className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-900">Session not connected</p>
            <p className="text-xs text-amber-700 mt-0.5 mb-2">Scan the QR code first to connect.</p>
            <button onClick={() => navigate(`/qr/${sessionId}`)} className="text-xs font-semibold text-amber-900 underline hover:text-amber-700">
              Go to QR Scanner →
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Form */}
        <div className="lg:col-span-2">
          <div className="card p-6">
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">RECIPIENT PHONE</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Icon.Phone className="w-4 h-4 text-slate-400" />
                  </div>
                  <input
                    type="tel"
                    placeholder="628123456789"
                    value={form.to}
                    onChange={e => setForm({ ...form, to: e.target.value })}
                    className="input-field pl-10"
                    disabled={!isConnected}
                  />
                </div>
                <p className="mt-1.5 text-xs text-slate-400">Include country code without + (e.g. 62 for Indonesia)</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">MESSAGE</label>
                <textarea
                  placeholder="Type your message here..."
                  value={form.message}
                  onChange={e => setForm({ ...form, message: e.target.value })}
                  rows="6"
                  className="input-field resize-none"
                  disabled={!isConnected}
                />
                <div className="flex justify-between mt-1.5">
                  <span className="text-xs text-slate-400">{form.message.length} chars</span>
                  <span className="text-xs text-slate-400">Max: 4096</span>
                </div>
              </div>

              <button
                onClick={sendMessage}
                disabled={loading || !isConnected || !form.to.trim() || !form.message.trim()}
                className="btn-primary w-full py-3"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Sending...
                  </>
                ) : (
                  <>
                    <Icon.Send className="w-4 h-4" />
                    Send Message
                  </>
                )}
              </button>
            </div>

            {/* Result */}
            {result && (
              <div className={`mt-4 p-3.5 rounded-lg border flex gap-2.5 ${
                result.success ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'
              }`}>
                <span className={`shrink-0 ${result.success ? 'text-emerald-600' : 'text-red-500'}`}>
                  {result.success ? <Icon.Check className="w-4 h-4 mt-0.5" /> : <Icon.X className="w-4 h-4 mt-0.5" />}
                </span>
                <div className="flex-1">
                  <p className={`text-sm font-semibold ${result.success ? 'text-emerald-900' : 'text-red-900'}`}>
                    {result.success ? 'Message Sent' : 'Send Failed'}
                  </p>
                  {result.success ? (
                    <div className="text-xs text-emerald-700 mt-0.5">
                      <p>Queued for delivery.</p>
                      {result.data?.data?.jobId && <p className="opacity-75 mt-0.5">Job ID: {result.data.data.jobId}</p>}
                      {result.data?.data?.id && <p className="opacity-75 mt-0.5">Message ID: {result.data.data.id}</p>}
                    </div>
                  ) : (
                    <p className="text-xs text-red-700 mt-0.5">{result.error}</p>
                  )}
                  <p className="text-xs opacity-50 mt-1">{result.timestamp}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Side info */}
        <div className="space-y-4">
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <Icon.Info className="w-4 h-4 text-slate-500" />
              Quick Tips
            </h3>
            <ul className="text-xs text-slate-600 space-y-2">
              <li className="flex gap-1.5"><span className="text-slate-300">·</span>Use country code without + sign</li>
              <li className="flex gap-1.5"><span className="text-slate-300">·</span>Remove spaces and dashes</li>
              <li className="flex gap-1.5"><span className="text-slate-300">·</span>Session must be connected</li>
              <li className="flex gap-1.5"><span className="text-slate-300">·</span>Messages are queued for delivery</li>
            </ul>
          </div>
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <Icon.Hash className="w-4 h-4 text-slate-500" />
              Example
            </h3>
            <div className="space-y-2 text-xs">
              <div>
                <p className="text-slate-400 mb-1">Phone:</p>
                <code className="block px-2.5 py-1.5 bg-slate-50 border border-slate-100 rounded font-mono text-blue-600">628123456789</code>
              </div>
              <div>
                <p className="text-slate-400 mb-1">Message:</p>
                <code className="block px-2.5 py-1.5 bg-slate-50 border border-slate-100 rounded font-mono text-slate-700 whitespace-pre-wrap">Hello from Gateway.</code>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
