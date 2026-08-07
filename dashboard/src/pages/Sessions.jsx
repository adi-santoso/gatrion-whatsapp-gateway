import { useState, useEffect } from 'react';
import { sessionApi } from '../api/client';
import { useNavigate } from 'react-router-dom';
import Icon from '../components/Icons.jsx';

export default function Sessions() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newSession, setNewSession] = useState({ name: '', webhookUrl: '', webhookSecret: '', webhookEnabled: false });
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadSessions();
    const interval = setInterval(loadSessions, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadSessions = async () => {
    try {
      const res = await sessionApi.list();
      setSessions(res.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const createSession = async () => {
    if (!newSession.name.trim()) {
      alert('Please enter session name');
      return;
    }
    setCreating(true);
    try {
      const payload = {
        name: newSession.name.trim(),
        ...(newSession.webhookUrl && {
          webhookUrl: newSession.webhookUrl.trim(),
          webhookSecret: newSession.webhookSecret.trim(),
          webhookEnabled: newSession.webhookEnabled
        })
      };
      const res = await sessionApi.create(payload);
      const sessionId = res.data.data.sessionId;
      setShowCreate(false);
      setNewSession({ name: '', webhookUrl: '', webhookSecret: '', webhookEnabled: false });
      navigate(`/qr/${sessionId}`);
    } catch (err) {
      alert('Failed to create session: ' + (err.response?.data?.error || err.message));
    } finally {
      setCreating(false);
    }
  };

  const deleteSession = async (id) => {
    if (!confirm('Delete this session? This will logout WhatsApp and remove all data.')) return;
    try {
      await sessionApi.delete(id);
      loadSessions();
    } catch (err) {
      alert('Failed to delete: ' + (err.response?.data?.error || err.message));
    }
  };

  const statusConfig = (status) => {
    switch (status) {
      case 'connected': return { dot: 'bg-emerald-500', label: 'Connected', text: 'text-emerald-600' };
      case 'connecting': return { dot: 'bg-amber-500', label: 'Connecting', text: 'text-amber-600' };
      case 'qr_ready': return { dot: 'bg-blue-500', label: 'QR Ready', text: 'text-blue-600' };
      case 'disconnected': return { dot: 'bg-slate-400', label: 'Disconnected', text: 'text-slate-500' };
      case 'failed': return { dot: 'bg-red-500', label: 'Failed', text: 'text-red-600' };
      default: return { dot: 'bg-slate-400', label: status, text: 'text-slate-500' };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <svg className="animate-spin w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  const connectedCount = sessions.filter(s => s.status === 'connected').length;

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Sessions</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage your WhatsApp connections</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          <Icon.Plus className="w-4 h-4" />
          New Session
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-6">
        <div className="card p-4">
          <p className="text-xs text-slate-500 font-medium">TOTAL</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{sessions.length}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-slate-500 font-medium">CONNECTED</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{connectedCount}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-slate-500 font-medium">OFFLINE</p>
          <p className="text-2xl font-bold text-slate-400 mt-1">{sessions.length - connectedCount}</p>
        </div>
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4" onClick={() => setShowCreate(false)}>
          <div className="card w-full max-w-md p-6 animate-fade-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-slate-900">New Session</h2>
              <button onClick={() => setShowCreate(false)} className="text-slate-400 hover:text-slate-600">
                <Icon.X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">SESSION NAME *</label>
                <input
                  type="text"
                  placeholder="e.g. Sales Department"
                  value={newSession.name}
                  onChange={e => setNewSession({ ...newSession, name: e.target.value })}
                  className="input-field"
                  autoFocus
                />
              </div>
              <div className="border-t border-slate-100 pt-4">
                <p className="text-xs font-medium text-slate-600 mb-3">WEBHOOK (OPTIONAL)</p>
                <div className="space-y-3">
                  <input
                    type="url"
                    placeholder="Webhook URL"
                    value={newSession.webhookUrl}
                    onChange={e => setNewSession({ ...newSession, webhookUrl: e.target.value })}
                    className="input-field"
                  />
                  <input
                    type="password"
                    placeholder="Webhook Secret"
                    value={newSession.webhookSecret}
                    onChange={e => setNewSession({ ...newSession, webhookSecret: e.target.value })}
                    className="input-field"
                  />
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newSession.webhookEnabled}
                      onChange={e => setNewSession({ ...newSession, webhookEnabled: e.target.checked })}
                      className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900/20"
                    />
                    <span className="text-sm text-slate-700">Enable webhook</span>
                  </label>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowCreate(false)} className="btn-secondary flex-1" disabled={creating}>Cancel</button>
                <button onClick={createSession} disabled={creating || !newSession.name.trim()} className="btn-primary flex-1">
                  {creating ? 'Creating...' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sessions grid */}
      {sessions.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="flex items-center justify-center w-14 h-14 bg-slate-50 rounded-xl mx-auto mb-4">
            <Icon.Chat className="w-7 h-7 text-slate-300" />
          </div>
          <h3 className="text-base font-semibold text-slate-900 mb-1">No sessions yet</h3>
          <p className="text-sm text-slate-500 mb-5">Create your first WhatsApp session to get started</p>
          <button onClick={() => setShowCreate(true)} className="btn-primary">
            <Icon.Plus className="w-4 h-4" />
            Create Session
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {sessions.map(session => {
            const sc = statusConfig(session.status);
            return (
              <div key={session.sessionId} className="card p-5 hover:border-slate-300 hover:shadow-sm transition">
                {/* Status */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${sc.dot} animate-pulse`} />
                    <span className={`text-xs font-medium ${sc.text}`}>{sc.label}</span>
                  </div>
                  {session.status === 'connected' && (
                    <Icon.Check className="w-4 h-4 text-emerald-500" />
                  )}
                </div>
                {/* Info */}
                <h3 className="text-base font-semibold text-slate-900 truncate mb-1">{session.name}</h3>
                <div className="flex items-center gap-1.5 text-sm text-slate-500 mb-1">
                  <Icon.Phone className="w-3.5 h-3.5" />
                  <span>{session.phone || 'Not connected'}</span>
                </div>
                <p className="text-xs text-slate-400 font-mono mb-4 truncate">{session.sessionId}</p>
                {/* Actions */}
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => navigate(`/qr/${session.sessionId}`)}
                    className="flex flex-col items-center justify-center gap-1 py-2.5 bg-slate-50 hover:bg-slate-100 rounded-lg transition"
                  >
                    <Icon.QrCode className="w-4 h-4 text-slate-600" />
                    <span className="text-xs font-medium text-slate-600">QR</span>
                  </button>
                  <button
                    onClick={() => navigate(`/send/${session.sessionId}`)}
                    disabled={session.status !== 'connected'}
                    className="flex flex-col items-center justify-center gap-1 py-2.5 bg-slate-50 hover:bg-slate-100 rounded-lg transition disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Icon.Send className="w-4 h-4 text-slate-600" />
                    <span className="text-xs font-medium text-slate-600">Send</span>
                  </button>
                  <button
                    onClick={() => deleteSession(session.sessionId)}
                    className="flex flex-col items-center justify-center gap-1 py-2.5 bg-red-50 hover:bg-red-100 rounded-lg transition"
                  >
                    <Icon.Trash className="w-4 h-4 text-red-500" />
                    <span className="text-xs font-medium text-red-500">Delete</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
