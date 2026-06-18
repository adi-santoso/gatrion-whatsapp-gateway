import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import Sessions from './pages/Sessions';
import QR from './pages/QR';
import Send from './pages/Send';

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-100">
        <nav className="bg-white shadow-md p-4 mb-6">
          <div className="container mx-auto flex gap-6">
            <Link to="/" className="font-bold text-xl text-blue-600 hover:text-blue-800">
              📱 WhatsApp Gateway
            </Link>
            <Link to="/" className="text-gray-600 hover:text-gray-800 pt-1">
              Sessions
            </Link>
          </div>
        </nav>

        <div className="container mx-auto">
          <Routes>
            <Route path="/" element={<Sessions />} />
            <Route path="/qr/:sessionId" element={<QR />} />
            <Route path="/send/:sessionId" element={<Send />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}
