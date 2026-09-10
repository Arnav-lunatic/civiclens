import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Camera, LogOut, User as UserIcon, Globe, Sparkles, Shield, Activity } from 'lucide-react';
import { API } from '../services/api';

export const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const isSuperAdminPath = location.pathname.startsWith('/superadmin');
  const isAdminPath = location.pathname.startsWith('/admin');

  const activeRole = isSuperAdminPath ? 'superadmin' : isAdminPath ? 'subadmin' : 'citizen';
  const user = API.getUser(activeRole);
  const role = API.getRole(activeRole);

  const handleLogout = () => {
    API.logout(activeRole);
    if (activeRole === 'superadmin') {
      navigate('/superadmin/login');
    } else if (activeRole === 'subadmin') {
      navigate('/admin/login');
    } else {
      navigate('/login');
    }
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#090d16]/80 border-b border-white/[0.08] transition-all duration-200 shadow-lg shadow-black/20">
      <div className="max-w-7xl mx-auto px-3.5 sm:px-6 h-16 flex justify-between items-center gap-2 sm:gap-4">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center space-x-2.5 shrink-0 group">
          <div className="relative">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-sky-500 via-blue-600 to-teal-400 flex items-center justify-center text-white shadow-md shadow-sky-500/25 group-hover:shadow-lg group-hover:shadow-sky-500/40 group-hover:scale-105 transition-all duration-300">
              <Camera className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-[#090d16] animate-pulse"></span>
          </div>
          <div className="flex flex-col">
            <span className="text-base sm:text-lg font-black text-white tracking-tight flex items-center gap-1">
              Civic<span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-teal-300 to-cyan-400">Lens</span>
            </span>
            <span className="hidden sm:inline text-[9px] font-bold text-slate-400 -mt-1 tracking-wider uppercase font-mono">
              AI Redressal Engine
            </span>
          </div>
        </Link>

        {/* Center/Right Navigation Actions */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {!isAdminPath && !isSuperAdminPath && (
            <>
              <Link
                to="/explore"
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  isActive('/explore') || isActive('/public-complaints')
                    ? 'bg-sky-500/15 text-sky-300 border border-sky-500/30 shadow-sm shadow-sky-500/10'
                    : 'text-slate-300 hover:text-white hover:bg-white/5 border border-transparent'
                }`}
              >
                <Globe className="w-3.5 h-3.5 text-sky-400" />
                <span className="hidden sm:inline">Public </span>
                <span>Feed</span>
              </Link>
              
              <Link
                to="/report"
                className="relative group px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-gradient-to-r from-sky-500 via-teal-500 to-emerald-500 hover:from-sky-400 hover:to-emerald-400 text-white text-xs font-bold shadow-lg shadow-sky-500/25 active:scale-95 transition-all duration-300 flex items-center gap-1.5 overflow-hidden"
              >
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                <Camera className="w-3.5 h-3.5 relative z-10" />
                <span className="relative z-10 font-bold">Report</span>
                <span className="hidden sm:inline relative z-10 font-bold"> Issue</span>
              </Link>
            </>
          )}

          {user ? (
            <div className="flex items-center gap-1.5 sm:gap-2.5 pl-2 border-l border-white/10">
              <Link
                to={
                  activeRole === 'superadmin'
                    ? '/superadmin/dashboard'
                    : activeRole === 'subadmin'
                    ? '/admin/dashboard'
                    : '/dashboard'
                }
                className="px-2.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 hover:text-white text-xs font-bold transition flex items-center gap-1.5 border border-white/10 shadow-sm"
              >
                <div className="w-5 h-5 rounded-lg bg-gradient-to-tr from-sky-500 to-teal-400 text-slate-950 text-[10px] font-black flex items-center justify-center">
                  {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <span className="hidden md:inline max-w-[90px] truncate">{user.name || 'Account'}</span>
                <span className="md:hidden">
                  {activeRole === 'citizen' ? 'Issues' : 'Console'}
                </span>
              </Link>
              <button
                onClick={handleLogout}
                className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition text-xs font-semibold flex items-center gap-1"
                title="Logout"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Exit</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1 pl-2 border-l border-white/10">
              {!isAdminPath && !isSuperAdminPath && (
                <Link
                  to="/login"
                  className="px-2.5 sm:px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-white/5 transition flex items-center gap-1.5 border border-white/10"
                >
                  <UserIcon className="w-3.5 h-3.5 text-sky-400" />
                  <span className="hidden sm:inline">Citizen </span>
                  <span>Sign In</span>
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

