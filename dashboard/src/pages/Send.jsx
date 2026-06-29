import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { messageApi, sessionApi } from '../api/client';

export default function Send() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({ to: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [sessionInfo, setSessionInfo] = useState(null);
  const [sessionStatus, setSessionStatus] = useState(null);

  useEffect(() => {
    loadSessionInfo();
  }, [sessionId]);

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

    // Validate phone number format
    if (!/^\d+$/.test(form.to.trim())) {
      alert('Phone number must contain only digits (e.g., 628123456789)');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const res = await messageApi.sendText({
        sessionId,
        to: form.to.trim(),
        message: form.message.trim()
      });

      setResult({
        success: true,
        data: res.data,
        timestamp: new Date().toLocaleTimeString()
      });

      // Clear form on success
      setForm({ to: '', message: '' });
    } catch (err) {
      setResult({
        success: false,
        error: err.response?.data?.error || err.message,
        timestamp: new Date().toLocaleTimeString()
      });
    } finally {
      setLoading(false);
    }
  };

  const isConnected = sessionStatus?.status === 'connected';

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
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Send Message</h1>
            <p className="text-gray-600">
              {sessionInfo?.name || 'Session'} • {sessionStatus?.phone || sessionId}
            </p>
          </div>

          {/* Status Badge */}
          {sessionStatus && (
            <div className={`flex items-center space-x-2 px-4 py-2 rounded-lg border ${
              isConnected
                ? 'bg-green-50 border-green-200'
                : 'bg-red-50 border-red-200'
            }`}>
              <div className={`w-2.5 h-2.5 rounded-full ${
                isConnected ? 'bg-green-500' : 'bg-red-500'
              } animate-pulse`}></div>
              <span className={`text-sm font-semibold ${
                isConnected ? 'text-green-700' : 'text-red-700'
              }`}>
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Warning if not connected */}
      {!isConnected && sessionStatus && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl flex items-start space-x-3">
          <span className="text-2xl">⚠️</span>
          <div className="flex-1">
            <h4 className="font-semibold text-yellow-900 mb-1">Session Not Connected</h4>
            <p className="text-sm text-yellow-800 mb-3">
              This session is not connected to WhatsApp. Please scan the QR code first.
            </p>
            <button
              onClick={() => navigate(`/qr/${sessionId}`)}
              className="text-sm font-semibold text-yellow-900 hover:text-yellow-700 underline"
            >
              Go to QR Scanner →
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Send Form */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
            <div className="space-y-6">
              {/* Phone Number Input */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Recipient Phone Number
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <span className="text-gray-500">📱</span>
                  </div>
                  <input
                    type="tel"
                    placeholder="628123456789"
                    value={form.to}
                    onChange={(e) => setForm({ ...form, to: e.target.value })}
                    className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                    disabled={!isConnected}
                  />
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  Enter phone number with country code (e.g., 62 for Indonesia)
                </p>
              </div>

              {/* Message Input */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Message
                </label>
                <textarea
                  placeholder="Type your message here..."
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  rows="8"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition resize-none"
                  disabled={!isConnected}
                />
                <div className="flex justify-between items-center mt-2">
                  <p className="text-xs text-gray-500">
                    {form.message.length} characters
                  </p>
                  <p className="text-xs text-gray-500">
                    Max: 4096 characters
                  </p>
                </div>
              </div>

              {/* Send Button */}
              <button
                onClick={sendMessage}
                disabled={loading || !isConnected || !form.to.trim() || !form.message.trim()}
                className="w-full py-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-lg hover:shadow-xl flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                    <span>Send Message</span>
                  </>
                )}
              </button>
            </div>

            {/* Result Message */}
            {result && (
              <div className={`mt-6 p-4 rounded-lg border ${
                result.success
                  ? 'bg-green-50 border-green-200'
                  : 'bg-red-50 border-red-200'
              }`}>
                <div className="flex items-start space-x-3">
                  <span className="text-2xl">
                    {result.success ? '✅' : '❌'}
                  </span>
                  <div className="flex-1">
                    <h4 className={`font-semibold mb-1 ${
                      result.success ? 'text-green-900' : 'text-red-900'
                    }`}>
                      {result.success ? 'Message Sent!' : 'Send Failed'}
                    </h4>
                    {result.success ? (
                      <div className="text-sm text-green-800">
                        <p className="mb-1">Your message has been queued for delivery.</p>
                        {result.data?.data?.jobId && (
                          <p className="text-xs opacity-75">Job ID: {result.data.data.jobId}</p>
                        )}
                        {result.data?.data?.id && (
                          <p className="text-xs opacity-75">Message ID: {result.data.data.id}</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-red-800">{result.error}</p>
                    )}
                    <p className="text-xs opacity-60 mt-1">{result.timestamp}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Info Sidebar */}
        <div className="space-y-6">
          {/* Quick Tips */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
            <h3 className="font-semibold text-blue-900 mb-3 flex items-center space-x-2">
              <span>💡</span>
              <span>Quick Tips</span>
            </h3>
            <ul className="text-sm text-blue-800 space-y-2">
              <li className="flex items-start space-x-2">
                <span>•</span>
                <span>Use country code without + sign</span>
              </li>
              <li className="flex items-start space-x-2">
                <span>•</span>
                <span>Remove spaces and dashes from phone number</span>
              </li>
              <li className="flex items-start space-x-2">
                <span>•</span>
                <span>Session must be connected to send</span>
              </li>
              <li className="flex items-start space-x-2">
                <span>•</span>
                <span>Messages are queued for delivery</span>
              </li>
            </ul>
          </div>

          {/* Example */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center space-x-2">
              <span>📝</span>
              <span>Example</span>
            </h3>
            <div className="text-sm space-y-3">
              <div>
                <p className="text-gray-600 mb-1">Phone Number:</p>
                <code className="block px-3 py-2 bg-white border border-gray-300 rounded text-blue-600 font-mono">
                  628123456789
                </code>
              </div>
              <div>
                <p className="text-gray-600 mb-1">Message:</p>
                <code className="block px-3 py-2 bg-white border border-gray-300 rounded text-gray-700 font-mono text-xs whitespace-pre-wrap">
                  Hello! This is a test message from WhatsApp Gateway.
                </code>
              </div>
            </div>
          </div>

          {/* API Alternative */}
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-6">
            <h3 className="font-semibold text-purple-900 mb-2 flex items-center space-x-2">
              <span>🔌</span>
              <span>Use API Instead</span>
            </h3>
            <p className="text-xs text-purple-800 mb-3">
              For production use, call the API directly:
            </p>
            <code className="block px-3 py-2 bg-white border border-purple-300 rounded text-xs text-purple-900 font-mono overflow-x-auto">
              POST /api/send-text
            </code>
          </div>
        </div>
      </div>
    </div>
  );
}
