import { useState, useEffect } from 'react';
import { sessionApi } from '../api/client';
import { useNavigate } from 'react-router-dom';

export default function Sessions() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newSession, setNewSession] = useState({ name: '' });
  const navigate = useNavigate();

  useEffect(() => {
    loadSessions();
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
    try {
      const res = await sessionApi.create(newSession);
      const sessionId = res.data.data.sessionId;
      navigate(`/qr/${sessionId}`);
    } catch (err) {
      alert('Failed to create session');
    }
  };

  const deleteSession = async (id) => {
    if (!confirm('Delete this session?')) return;
    try {
      await sessionApi.delete(id);
      loadSessions();
    } catch (err) {
      alert('Failed to delete');
    }
  };

  const getStatusColor = (status) => {
    return status === 'connected' ? 'bg-green-500' : 'bg-red-500';
  };

  if (loading) return <div className="p-4">Loading...</div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Sessions</h1>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          + New Session
        </button>
      </div>

      {showCreate && (
        <div className="mb-6 p-4 bg-gray-50 rounded">
          <input
            type="text"
            placeholder="Session name"
            value={newSession.name}
            onChange={(e) => setNewSession({ name: e.target.value })}
            className="border p-2 rounded w-full mb-2"
          />
          <button
            onClick={createSession}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
          >
            Create
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sessions.map((session) => (
          <div key={session.sessionId} className="border rounded-lg p-4 shadow bg-white">
            <div className="flex items-center mb-2">
              <div className={`w-3 h-3 rounded-full ${getStatusColor(session.status)} mr-2`}></div>
              <h3 className="font-bold">{session.name}</h3>
            </div>
            <p className="text-sm text-gray-600">
              {session.phone || 'Not connected'}
            </p>
            <p className="text-xs text-gray-400">{session.status}</p>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => navigate(`/qr/${session.sessionId}`)}
                className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600"
              >
                QR
              </button>
              <button
                onClick={() => navigate(`/send/${session.sessionId}`)}
                className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600"
              >
                Send
              </button>
              <button
                onClick={() => deleteSession(session.sessionId)}
                className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {sessions.length === 0 && (
        <div className="text-center text-gray-500 mt-8">
          No sessions. Create one to get started.
        </div>
      )}
    </div>
  );
}
