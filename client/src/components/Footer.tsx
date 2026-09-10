import React from 'react';
import { Link } from 'react-router-dom';
import { Camera, ShieldCheck, MapPin, CheckCircle2, Lock, FileText, Globe, Cpu, ArrowUpRight } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="relative bg-white text-slate-600 mt-20 border-t border-slate-200/90 overflow-hidden shadow-sm">
      {/* Background ambient lighting */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-sky-500/5 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 mb-12">
          {/* Brand & Mission (Col 1-4) */}
          <div className="md:col-span-4 space-y-4">
            <Link to="/" className="flex items-center space-x-2.5 shrink-0 group">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-sky-500 to-blue-600 flex items-center justify-center text-white shadow-md shadow-sky-500/20 group-hover:scale-105 transition">
                <Camera className="w-5 h-5" />
              </div>
              <span className="text-xl font-black text-slate-900 tracking-tight">
                Civic<span className="text-sky-600">Lens</span>
              </span>
            </Link>
            <p className="text-xs text-slate-600 leading-relaxed font-normal">
              AI-powered geotagged municipal grievance redressal system. Verified real-time GPS coordinates, Groq Vision AI hazard detection, and on-site anti-tamper geofencing for rapid public resolution.
            </p>
            <div className="flex items-center gap-2 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200/80 w-fit">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              <span>Protocol v2.6 &bull; Production Active</span>
            </div>
          </div>

          {/* Quick Platform Links (Col 5-6) */}
          <div className="md:col-span-2 space-y-3.5">
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">Platform</h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <Link to="/explore" className="text-slate-600 hover:text-sky-600 transition flex items-center gap-1.5 group">
                  <Globe className="w-3.5 h-3.5 text-slate-400 group-hover:text-sky-600 transition" />
                  <span>Public Grievances</span>
                </Link>
              </li>
              <li>
                <Link to="/report" className="text-slate-600 hover:text-sky-600 transition flex items-center gap-1.5 group">
                  <Camera className="w-3.5 h-3.5 text-slate-400 group-hover:text-sky-600 transition" />
                  <span>Report Hazard</span>
                </Link>
              </li>
              <li>
                <Link to="/dashboard" className="text-slate-600 hover:text-sky-600 transition flex items-center gap-1.5 group">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 group-hover:text-sky-600 transition" />
                  <span>Track Status</span>
                </Link>
              </li>
              <li>
                <Link to="/login" className="text-slate-600 hover:text-sky-600 transition flex items-center gap-1.5 group">
                  <Lock className="w-3.5 h-3.5 text-slate-400 group-hover:text-sky-600 transition" />
                  <span>Citizen Sign In</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Policies & Legal (Col 7-8) */}
          <div className="md:col-span-2 space-y-3.5">
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">Governance</h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <Link to="/privacy" className="text-slate-600 hover:text-sky-600 transition flex items-center gap-1.5 group">
                  <ShieldCheck className="w-3.5 h-3.5 text-sky-600/80 group-hover:text-sky-600" />
                  <span>Privacy Policy</span>
                </Link>
              </li>
              <li>
                <Link to="/terms" className="text-slate-600 hover:text-sky-600 transition flex items-center gap-1.5 group">
                  <FileText className="w-3.5 h-3.5 text-sky-600/80 group-hover:text-sky-600" />
                  <span>Terms of Service</span>
                </Link>
              </li>
              <li>
                <Link to="/grievance-policy" className="text-slate-600 hover:text-sky-600 transition flex items-center gap-1.5 group">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600/80 group-hover:text-emerald-600" />
                  <span>Citizen Charter</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Security & Verification Standards (Col 9-12) */}
          <div className="md:col-span-4 space-y-3.5">
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">Integrity Standards</h4>
            <div className="space-y-2.5 text-[11px]">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-sky-600" />
                  <span>500m Anti-Tamper Geofence</span>
                </div>
                <p className="text-[10px] text-slate-500 leading-tight">
                  District officers must be physically present at reported GPS coordinates to verify & resolve grievances.
                </p>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Groq AI Vision Categorization</span>
                </div>
                <p className="text-[10px] text-slate-500 leading-tight">
                  Instant visual triage detects fake or non-civic photos and auto-assigns severity levels.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-slate-200/90 pt-8 flex flex-col sm:flex-row justify-between items-center text-xs text-slate-500 gap-4">
          <div>
            &copy; 2026 CivicLens &bull; Smart Geotagged Grievance Redressal Architecture.
          </div>
          <div className="flex items-center space-x-6 text-[11px]">
            <Link to="/privacy" className="hover:text-sky-600 transition">
              Privacy Policy
            </Link>
            <span>&bull;</span>
            <Link to="/terms" className="hover:text-sky-600 transition">
              Terms of Service
            </Link>
            <span>&bull;</span>
            <Link to="/grievance-policy" className="hover:text-sky-600 transition">
              Citizen Charter &amp; SLAs
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

