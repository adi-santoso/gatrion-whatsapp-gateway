import { useState, useEffect } from 'react';
import { analyticsApi } from '../api/client';
import Icon from '../components/Icons.jsx';

export default function Analytics() {
  const [aggregate, setAggregate] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [aggRes, sessRes] = await Promise.all([
          analyticsApi.getAggregate().catch(() => null),
          analyticsApi.getAll().catch(() => null)
        ]);
        if (aggRes) setAggregate(aggRes.data.data || aggRes.data);
        if (sessRes) setSessions(sessRes.data.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, []);

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

  const cards = [
    { label: 'SENT', value: aggregate?.totalSent ?? 0, icon: Icon.Send, color: 'text-blue-600' },
    { label: 'RECEIVED', value: aggregate?.totalReceived ?? 0, icon: Icon.Chat, color: 'text-emerald-600' },
    { label: 'SESSIONS', value: sessions.length, icon: Icon.Users, color: 'text-slate-700' },
    { label: 'ACTIVE', value: sessions.filter(s => s.status === 'connected').length, icon: Icon.Activity, color: 'text-amber-600' },
  ];

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Analytics</h1>
        <p className="text-sm text-slate-500 mt-0.5">Message statistics across all sessions</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        {cards.map(c => (
          <div key={c.label} className="card p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-slate-500 font-medium">{c.label}</p>
              <c.icon className={`w-4 h-4 ${c.color}`} />
            </div>
            <p className="text-2xl font-bold text-slate-900">{c.value}</p>
          </div>
        ))}
      </div>

      {/* Per-session table */}
      <div className="card overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-900">Per-Session Stats</h2>
        </div>
        {sessions.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm text-slate-400">No session data available</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left text-xs font-medium text-slate-500 uppercase px-5 py-2.5">Session</th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase px-5 py-2.5">Status</th>
                  <th className="text-right text-xs font-medium text-slate-500 uppercase px-5 py-2.5">Sent</th>
                  <th className="text-right text-xs font-medium text-slate-500 uppercase px-5 py-2.5">Received</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map(s => (
                  <tr key={s.sessionId || s.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition">
                    <td className="px-5 py-3">
                      <p className="text-sm font-medium text-slate-900">{s.name || s.sessionId}</p>
                      <p className="text-xs text-slate-400 font-mono">{s.sessionId}</p>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                        s.status === 'connected' ? 'text-emerald-600' : 'text-slate-400'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          s.status === 'connected' ? 'bg-emerald-500' : 'bg-slate-300'
                        }`} />
                        {s.status || 'unknown'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right text-sm text-slate-900 font-mono">{s.sent ?? s.messagesSent ?? 0}</td>
                    <td className="px-5 py-3 text-right text-sm text-slate-900 font-mono">{s.received ?? s.messagesReceived ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
