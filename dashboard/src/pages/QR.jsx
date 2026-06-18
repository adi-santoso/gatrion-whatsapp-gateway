import { useParams } from 'react-router-dom';
import { useWebSocket } from '../hooks/useWebSocket';

export default function QR() {
  const { sessionId } = useParams();
  const { qrCode, status, phone } = useWebSocket(sessionId);

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Scan QR Code</h1>
      
      <div className="bg-white border rounded-lg p-8 text-center shadow">
        <div className="mb-4">
          <span className={`px-3 py-1 rounded-full text-sm ${
            status === 'connected' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
          }`}>
            {status}
          </span>
        </div>

        {qrCode && (
          <div className="mb-4">
            <img src={qrCode} alt="QR Code" className="mx-auto border p-4 max-w-md" />
            <p className="text-sm text-gray-600 mt-4">
              Scan this QR code with WhatsApp to connect
            </p>
          </div>
        )}

        {status === 'connected' && phone && (
          <div className="text-center">
            <div className="text-6xl mb-4">✅</div>
            <h2 className="text-2xl font-bold text-green-600 mb-2">Connected!</h2>
            <p className="text-gray-600">Phone: {phone}</p>
          </div>
        )}

        {status === 'connecting' && (
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Waiting for QR code...</p>
          </div>
        )}

        {status === 'disconnected' && (
          <div className="text-center">
            <div className="text-6xl mb-4">❌</div>
            <h2 className="text-2xl font-bold text-red-600 mb-2">Disconnected</h2>
            <p className="text-gray-600">Session disconnected</p>
          </div>
        )}
      </div>
    </div>
  );
}
