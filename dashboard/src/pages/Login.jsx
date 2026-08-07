import { useState } from 'react';
import Icon from '../components/Icons.jsx';

export default function Login() {
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/sessions', {
        headers: { 'x-api-key': apiKey.trim() }
      });

      if (res.ok) {
        localStorage.setItem('apiKey', apiKey.trim());
        window.location.reload();
      } else if (res.status === 401 || res.status === 403) {
        setError('Invalid API key. Please check and try again.');
      } else {
        setError('Server error. Please try again.');
      }
    } catch {
      setError('Cannot connect to server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center justify-center w-12 h-12 bg-slate-900 rounded-xl mb-4">
            <Icon.Chat className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">WhatsApp Gateway</h1>
          <p className="text-sm text-slate-500 mt-1">Multi-session management</p>
        </div>

        {/* Card */}
        <div className="card p-6">
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                API KEY
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your API key"
                className="input-field"
                autoFocus
                required
                disabled={loading}
              />
            </div>

            {error && (
              <div className="flex items-start gap-2 px-3 py-2.5 bg-red-50 border border-red-100 rounded-lg text-red-600 text-sm">
                <Icon.Alert className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !apiKey.trim()}
              className="btn-primary w-full py-3"
            >
              {loading ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Verifying...
                </>
              ) : (
                'Login'
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          API key is stored in your browser's local storage
        </p>
      </div>
    </div>
  );
}
