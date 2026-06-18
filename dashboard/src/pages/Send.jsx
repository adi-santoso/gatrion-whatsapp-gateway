import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { messageApi } from '../api/client';

export default function Send() {
  const { sessionId } = useParams();
  const [form, setForm] = useState({ to: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const sendMessage = async () => {
    if (!form.to || !form.message) {
      alert('Please fill all fields');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const res = await messageApi.sendText({ sessionId, ...form });
      setResult({ success: true, data: res.data });
      setForm({ to: '', message: '' });
    } catch (err) {
      setResult({ success: false, error: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Send Message</h1>

      <div className="bg-white border rounded-lg p-6 shadow">
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">To (Phone Number)</label>
          <input
            type="text"
            placeholder="628123456789"
            value={form.to}
            onChange={(e) => setForm({ ...form, to: e.target.value })}
            className="border p-2 rounded w-full"
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Message</label>
          <textarea
            placeholder="Enter your message..."
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
            rows="6"
            className="border p-2 rounded w-full"
          />
        </div>

        <button
          onClick={sendMessage}
          disabled={loading}
          className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600 disabled:bg-gray-400 w-full"
        >
          {loading ? 'Sending...' : 'Send Message'}
        </button>

        {result && (
          <div className={`mt-4 p-4 rounded ${result.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
            {result.success ? (
              <div>
                <p className="font-bold">✅ Message queued!</p>
                <p className="text-sm">Job ID: {result.data.data.jobId}</p>
              </div>
            ) : (
              <p>❌ Failed: {result.error}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
