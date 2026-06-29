import { useState, useEffect } from 'react';
import { sessionApi } from '../api/client';
import { useNavigate } from 'react-router-dom';

export default function Sessions() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newSession, setNewSession] = useState({
    name: '',
    webhookUrl: '',
    webhookSecret: '',
    webhookEnabled: false
  });
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadSessions();
    const interval = setInterval(loadSessions, 5000); // Refresh every 5s
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

  const getStatusColor = (status) => {
    switch (status) {
      case 'connected':
        return 'bg-green-500';
      case 'connecting':
      case 'qr_ready':
        return 'bg-yellow-500';
      case 'disconnected':
      case 'failed':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'connected':
        return 'Connected';
      case 'connecting':
        return 'Connecting...';
      case 'qr_ready':
        return 'QR Ready';
      case 'disconnected':
        return 'Disconnected';
      case 'failed':
        return 'Failed';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading sessions...</p>
        </div>
      </div>
    );
  }

  const connectedCount = sessions.filter(s => s.status === 'connected').length;

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Session Management</h1>
            <p className="text-gray-600">Manage your WhatsApp sessions and connections</p>
          </div>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-indigo-700 transition shadow-lg hover:shadow-xl"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            <span>New Session</span>
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Sessions</p>
                <p className="text-3xl font-bold text-gray-900">{sessions.length}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">📱</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Connected</p>
                <p className="text-3xl font-bold text-green-600">{connectedCount}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">✅</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Disconnected</p>
                <p className="text-3xl font-bold text-red-600">{sessions.length - connectedCount}</p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">❌</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Create Session Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Create New Session</h2>
              <button
                onClick={() => setShowCreate(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Session Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Sales Department"
                  value={newSession.name}
                  onChange={(e) => setNewSession({ ...newSession, name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>

              <div className="border-t pt-4">
                <p className="text-sm font-semibold text-gray-700 mb-3">Webhook Configuration (Optional)</p>

                <div className="space-y-3">
                  <input
                    type="url"
                    placeholder="Webhook URL"
                    value={newSession.webhookUrl}
                    onChange={(e) => setNewSession({ ...newSession, webhookUrl: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                  />

                  <input
                    type="password"
                    placeholder="Webhook Secret"
                    value={newSession.webhookSecret}
                    onChange={(e) => setNewSession({ ...newSession, webhookSecret: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                  />

                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={newSession.webhookEnabled}
                      onChange={(e) => setNewSession({ ...newSession, webhookEnabled: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Enable webhook</span>
                  </label>
                </div>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  onClick={() => setShowCreate(false)}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition"
                  disabled={creating}
                >
                  Cancel
                </button>
                <button
                  onClick={createSession}
                  disabled={creating || !newSession.name.trim()}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  {creating ? 'Creating...' : 'Create Session'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sessions Grid */}
      {sessions.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl">📱</span>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No sessions yet</h3>
          <p className="text-gray-600 mb-6">Create your first WhatsApp session to get started</p>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-indigo-700 transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            <span>Create First Session</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sessions.map((session) => (
            <div
              key={session.sessionId}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition"
            >
              {/* Status Badge */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${getStatusColor(session.status)} animate-pulse`}></div>
                  <span className="text-xs font-semibold text-gray-600 uppercase">
                    {getStatusLabel(session.status)}
                  </span>
                </div>
                {session.status === 'connected' && (
                  <span className="text-lg">✅</span>
                )}
              </div>

              {/* Session Info */}
              <h3 className="text-xl font-bold text-gray-900 mb-2 truncate">{session.name}</h3>
              <p className="text-sm text-gray-600 mb-1">
                {session.phone ? `📞 ${session.phone}` : '⚠️ Not connected'}
              </p>
              <p className="text-xs text-gray-400 mb-4">ID: {session.sessionId}</p>

              {/* Actions */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => navigate(`/qr/${session.sessionId}`)}
                  className="flex flex-col items-center justify-center p-3 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition"
                  title="Scan QR Code"
                >
                  <svg className="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                  </svg>
                  <span className="text-xs font-semibold">QR</span>
                </button>

                <button
                  onClick={() => navigate(`/send/${session.sessionId}`)}
                  className="flex flex-col items-center justify-center p-3 bg-green-50 hover:bg-green-100 text-green-600 rounded-lg transition"
                  title="Send Message"
                  disabled={session.status !== 'connected'}
                >
                  <svg className="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <span className="text-xs font-semibold">Send</span>
                </button>

                <button
                  onClick={() => deleteSession(session.sessionId)}
                  className="flex flex-col items-center justify-center p-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition"
                  title="Delete Session"
                >
                  <svg className="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  <span className="text-xs font-semibold">Delete</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
