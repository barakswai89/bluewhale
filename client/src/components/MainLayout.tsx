// FILE: client/src/components/MainLayout.tsx
// FIXED (mobile):
//   1. Mobile drawer now has a user section + Logout button at the bottom —
//      previously the drawer only contained nav items; logout was unreachable
//   2. Mobile drawer <aside> given flex flex-col h-full so the user/logout
//      section correctly anchors to the bottom
//   3. Mobile drawer <nav> given flex-1 overflow-y-auto to fill remaining space
//   4. Header right side gets a direct logout icon button on mobile (xs screens)
//      so logout is one tap away even without opening the drawer
//   5. All desktop layout, animations, and styles remain 100% intact

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Filter, Star, FileText, Sparkles,
  CreditCard, LogOut, Search, Bell, Menu, X
} from 'lucide-react';

interface MainLayoutProps { children: React.ReactNode; }

export default function MainLayout({ children }: MainLayoutProps) {
  const navigate  = useNavigate();
  const location  = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled,       setScrolled]       = useState(false);

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard'  },
    { id: 'screener',  label: 'Screener',  icon: Filter,          path: '/screener'   },
    { id: 'watchlist', label: 'Watchlist', icon: Star,            path: '/watchlist'  },
    { id: 'reports',   label: 'Reports',   icon: FileText,        path: '/reports'    },
    { id: 'ai-hub',    label: 'AI Hub',    icon: Sparkles,        path: '/ai-hub'     },
    { id: 'subscribe', label: 'Subscribe', icon: CreditCard,      path: '/subscribe'  },
  ];

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close drawer on route change (e.g. back button)
  useEffect(() => { setMobileMenuOpen(false); }, [location.pathname]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path;

  const userInitials = `${user.firstName?.[0] || 'U'}${user.lastName?.[0] || ''}`;
  const userName     = `${user.firstName || 'User'} ${user.lastName || ''}`.trim();
  const userPlan     = user.subscription?.toLowerCase() || 'free';

  return (
    <div className="min-h-screen bg-slate-950 text-white flex">

      {/* ── Desktop Sidebar ─────────────────────────────────────────────────── */}
      <aside className="hidden lg:flex w-64 bg-slate-900/95 backdrop-blur-xl border-r border-slate-800/50 flex-col fixed h-full z-30 shadow-2xl">
        {/* Logo */}
        <div className="p-6 border-b border-slate-800/50">
          <div className="flex items-center space-x-3 group cursor-pointer hover:scale-105 transition-transform duration-300">
            <div className="relative">
              <svg className="w-12 h-12 text-cyan-400 group-hover:text-cyan-300 transition-colors duration-300" viewBox="0 0 100 100" fill="currentColor">
                <path d="M20,50 Q10,40 15,30 T25,25 L30,30 Q35,25 40,30 L45,35 Q50,30 55,35 C60,40 65,35 70,40 Q75,45 80,35 L85,30 Q88,35 90,45 L92,55 Q90,65 85,70 L80,72 Q75,70 72,65 L68,60 Q65,58 62,60 L58,62 Q55,60 52,58 L48,55 Q45,58 42,60 L38,58 Q35,55 32,58 L28,62 Q25,60 22,58 L20,50 Z" />
              </svg>
              <div className="absolute inset-0 bg-cyan-400/20 rounded-full blur-xl group-hover:bg-cyan-400/30 transition-all duration-300" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">BlueWhale</h1>
              <p className="text-xs text-cyan-400 font-medium">Terminal</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item, index) => {
            const Icon   = item.icon;
            const active = isActive(item.path);
            return (
              <button
                key={item.id}
                onClick={() => navigate(item.path)}
                style={{ animationDelay: `${index * 50}ms` }}
                className={`
                  w-full flex items-center space-x-3 px-4 py-3 rounded-xl
                  transition-all duration-300 group relative overflow-hidden animate-fadeIn
                  ${active
                    ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-400 shadow-lg shadow-cyan-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}
                `}
              >
                {active && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-cyan-400 to-blue-500 rounded-r-full animate-slideIn" />}
                <div className={`p-2 rounded-lg transition-all duration-300 ${active ? 'bg-cyan-500/20 shadow-lg shadow-cyan-500/30' : 'group-hover:bg-slate-700/50'}`}>
                  <Icon className={`w-5 h-5 transition-transform duration-300 ${active ? 'scale-110' : 'group-hover:scale-110'}`} />
                </div>
                <span className="font-medium">{item.label}</span>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
              </button>
            );
          })}
        </nav>

        {/* User + Logout */}
        <div className="p-4 border-t border-slate-800/50">
          <div className="mb-3 p-3 bg-slate-800/30 rounded-xl backdrop-blur-sm">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center text-sm font-bold shadow-lg">
                {userInitials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{userName}</p>
                <p className="text-xs text-cyan-400 capitalize">{userPlan} Plan</p>
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-300 group"
          >
            <div className="p-2 rounded-lg group-hover:bg-red-500/20 transition-all duration-300">
              <LogOut className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
            </div>
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* ── Mobile Drawer ────────────────────────────────────────────────────── */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40 animate-fadeIn"
          onClick={() => setMobileMenuOpen(false)}
        >
          {/* ✅ FIX: flex flex-col h-full so user/logout section anchors to bottom */}
          <aside
            className="w-72 bg-slate-900/98 backdrop-blur-xl h-full shadow-2xl animate-slideInLeft flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* Drawer header */}
            <div className="p-5 border-b border-slate-800/50 flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-3">
                <svg className="w-10 h-10 text-cyan-400" viewBox="0 0 100 100" fill="currentColor">
                  <path d="M20,50 Q10,40 15,30 T25,25 L30,30 Q35,25 40,30 L45,35 Q50,30 55,35 C60,40 65,35 70,40 Q75,45 80,35 L85,30 Q88,35 90,45 L92,55 Q90,65 85,70 L80,72 Q75,70 72,65 L68,60 Q65,58 62,60 L58,62 Q55,60 52,58 L48,55 Q45,58 42,60 L38,58 Q35,55 32,58 L28,62 Q25,60 22,58 L20,50 Z" />
                </svg>
                <div>
                  <h1 className="text-lg font-bold">BlueWhale</h1>
                  <p className="text-xs text-cyan-400">Terminal</p>
                </div>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 hover:bg-slate-800 rounded-lg transition-colors active:scale-95"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* ✅ FIX: flex-1 overflow-y-auto pushes user section to bottom */}
            <nav className="flex-1 overflow-y-auto p-4 space-y-1">
              {navItems.map(item => {
                const Icon   = item.icon;
                const active = isActive(item.path);
                return (
                  <button
                    key={item.id}
                    onClick={() => { navigate(item.path); setMobileMenuOpen(false); }}
                    className={`
                      w-full flex items-center space-x-3 px-4 py-3.5 rounded-xl
                      transition-all duration-200 active:scale-98
                      ${active
                        ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-400'
                        : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'}
                    `}
                  >
                    <div className={`p-2 rounded-lg ${active ? 'bg-cyan-500/20' : ''}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="font-medium text-base">{item.label}</span>
                    {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-cyan-400" />}
                  </button>
                );
              })}
            </nav>

            {/* ✅ FIX: User section + Logout — was completely missing from mobile drawer */}
            <div className="p-4 border-t border-slate-800/50 shrink-0">
              <div className="mb-3 p-3 bg-slate-800/40 rounded-xl">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center text-sm font-bold shadow-lg shrink-0">
                    {userInitials}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{userName}</p>
                    <p className="text-xs text-cyan-400 capitalize">{userPlan} Plan</p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => { setMobileMenuOpen(false); handleLogout(); }}
                className="w-full flex items-center space-x-3 px-4 py-3.5 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 active:bg-red-500/20 transition-all duration-200 group"
              >
                <div className="p-2 rounded-lg group-hover:bg-red-500/20 transition-all duration-200">
                  <LogOut className="w-5 h-5" />
                </div>
                <span className="font-medium text-base">Logout</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* ── Main Content ─────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col lg:ml-64 min-h-screen">

        {/* Header */}
        <header className={`
          h-16 bg-slate-900/95 backdrop-blur-xl border-b border-slate-800/50
          flex items-center justify-between px-4 lg:px-6 sticky top-0 z-20
          transition-all duration-300
          ${scrolled ? 'shadow-2xl shadow-black/20' : ''}
        `}>
          <div className="flex items-center space-x-3">
            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 hover:bg-slate-800/50 rounded-lg transition-all duration-300 active:scale-95"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Search */}
            <div className="relative hidden sm:block group">
              <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-cyan-400 transition-colors duration-300" />
              <input
                type="text"
                placeholder="Search companies, tickers..."
                className="w-48 md:w-64 lg:w-96 bg-slate-800/50 border border-slate-700/50 rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 focus:bg-slate-800 transition-all duration-300"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2 lg:space-x-3">
            {/* Notifications */}
            <button className="relative p-2 hover:bg-slate-800/50 rounded-xl transition-all duration-300 group active:scale-95">
              <Bell className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-cyan-400 rounded-full animate-ping" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-cyan-400 rounded-full" />
            </button>

            {/* ✅ FIX: Logout button visible directly in header on mobile
                Gives users a second logout path without needing to open the drawer */}
            <button
              onClick={handleLogout}
              className="lg:hidden p-2 hover:bg-red-500/10 rounded-xl text-slate-400 hover:text-red-400 transition-all duration-300 active:scale-95"
              aria-label="Logout"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>

            {/* User chip — desktop only shows name */}
            <div className="flex items-center space-x-2 lg:space-x-3 px-2 lg:px-3 py-2 bg-slate-800/50 rounded-xl hover:bg-slate-800 transition-all duration-300 cursor-pointer group">
              <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center text-sm font-bold shadow-lg group-hover:scale-110 transition-transform duration-300">
                {userInitials}
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-medium">{userName}</p>
                <p className="text-xs text-cyan-400 capitalize">{userPlan}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 bg-slate-950 overflow-auto">
          <div className="animate-fadeIn">
            {children}
          </div>
        </main>
      </div>

      {/* Animations + scrollbar */}
      <style>{`
        @keyframes fadeIn      { from { opacity: 0; }           to { opacity: 1; }           }
        @keyframes slideIn     { from { height: 0; opacity: 0; } to { height: 2rem; opacity: 1; } }
        @keyframes slideInLeft { from { transform: translateX(-100%); } to { transform: translateX(0); } }
        .animate-fadeIn    { animation: fadeIn 0.3s ease-out; }
        .animate-slideIn   { animation: slideIn 0.3s ease-out; }
        .animate-slideInLeft { animation: slideInLeft 0.3s ease-out; }
        * { scroll-behavior: smooth; }
        ::-webkit-scrollbar       { width: 8px; height: 8px; }
        ::-webkit-scrollbar-track { background: rgb(15 23 42); }
        ::-webkit-scrollbar-thumb { background: rgb(51 65 85); border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: rgb(71 85 105); }
      `}</style>
    </div>
  );
}
