import { useState } from 'react';
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import Icon from './Icons.jsx';
import Sessions from '../pages/Sessions.jsx';
import QR from '../pages/QR.jsx';
import Send from '../pages/Send.jsx';
import Analytics from '../pages/Analytics.jsx';

const navItems = [
  { to: '/', label: 'Sessions', icon: Icon.Chat },
  { to: '/analytics', label: 'Analytics', icon: Icon.BarChart },
];

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleLogout = () => {
    if (confirm('Log out?')) {
      localStorage.removeItem('apiKey');
      window.location.reload();
    }
  };

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-40
          w-64 bg-white border-r border-slate-200 flex flex-col
          transition-transform duration-200 ease-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-5 border-b border-slate-100">
          <Link to="/" className="flex items-center gap-2.5" onClick={() => setSidebarOpen(false)}>
            <div className="flex items-center justify-center w-9 h-9 bg-slate-900 rounded-lg">
              <Icon.Chat className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="block text-sm font-bold text-slate-900 leading-tight">Gateway</span>
              <span className="block text-[11px] text-slate-400 leading-tight">WhatsApp</span>
            </div>
          </Link>
          <button
            className="lg:hidden text-slate-400 hover:text-slate-600"
            onClick={() => setSidebarOpen(false)}
          >
            <Icon.X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const active = isActive(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setSidebarOpen(false)}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition
                  ${active
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }
                `}
              >
                <item.icon className="w-[18px] h-[18px]" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div className="px-3 py-4 border-t border-slate-100">
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-50 transition"
            >
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-200 text-slate-600 text-xs font-semibold">
                AD
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium text-slate-900 leading-tight">Admin</p>
                <p className="text-[11px] text-slate-400 leading-tight">API Key active</p>
              </div>
              <Icon.Settings className="w-4 h-4 text-slate-400" />
            </button>
            {showUserMenu && (
              <div className="absolute bottom-full left-0 right-0 mb-1 mx-0 bg-white border border-slate-200 rounded-lg shadow-lg py-1">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition"
                >
                  <Icon.LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center justify-between h-14 px-4 bg-white border-b border-slate-200 shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-slate-500 hover:text-slate-900"
          >
            <Icon.Menu className="w-6 h-6" />
          </button>
          <span className="text-sm font-semibold text-slate-900">WhatsApp Gateway</span>
          <div className="w-6" />
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
            <Routes>
              <Route path="/" element={<Sessions />} />
              <Route path="/qr/:sessionId" element={<QR />} />
              <Route path="/send/:sessionId" element={<Send />} />
              <Route path="/analytics" element={<Analytics />} />
            </Routes>
          </div>
        </main>
      </div>
    </div>
  );
}
