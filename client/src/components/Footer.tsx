import React from 'react';
import { Link } from 'react-router-dom';
import { Camera, ShieldCheck, MapPin, CheckCircle2, Lock, FileText, Globe } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-white border-t border-slate-200 mt-16 text-slate-600">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          {/* Brand & Mission */}
          <div className="md:col-span-1 space-y-3">
            <Link to="/" className="flex items-center space-x-2 shrink-0 group">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-600 to-blue-600 flex items-center justify-center text-white text-base font-bold shadow-sm group-hover:scale-105 transition">
                <Camera className="w-4 h-4" />
              </div>
              <span className="text-lg font-bold text-slate-900 tracking-tight">
                Civic<span className="text-sky-600">Lens</span>
              </span>
            </Link>
            <p className="text-xs text-slate-500 leading-relaxed">
              AI-powered geotagged municipal grievance redressal system. Verified GPS coordinates, Groq Vision AI hazard detection, and 100-meter anti-tamper geofencing.
            </p>
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 w-fit">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Verified Municipal Redressal Protocol</span>
            </div>
          </div>

          {/* Quick Platform Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Platform</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/explore" className="hover:text-sky-600 transition flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-slate-400" />
                  <span>Public Grievance Feed</span>
                </Link>
              </li>
              <li>
                <Link to="/report" className="hover:text-sky-600 transition flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-slate-400" />
                  <span>Report Infrastructure Hazard</span>
                </Link>
              </li>
              <li>
                <Link to="/dashboard" className="hover:text-sky-600 transition flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>My Reported Complaints</span>
                </Link>
              </li>
              <li>
                <Link to="/login" className="hover:text-sky-600 transition flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Citizen Sign In / Register</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Policies & Legal (Requested by user) */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Policies &amp; Legal</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/privacy" className="hover:text-sky-600 transition flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-sky-600" />
                  <span className="font-semibold text-slate-800 hover:text-sky-600">Privacy Policy</span>
                </Link>
              </li>
              <li>
                <Link to="/terms" className="hover:text-sky-600 transition flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-sky-600" />
                  <span className="font-semibold text-slate-800 hover:text-sky-600">Terms of Service</span>
                </Link>
              </li>
              <li>
                <Link to="/grievance-policy" className="hover:text-sky-600 transition flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="font-semibold text-slate-800 hover:text-sky-600">Citizen Charter &amp; SLAs</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Security & Verification Standards */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Compliance &amp; Standards</h4>
            <div className="space-y-2 text-[11px] text-slate-500">
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <div className="font-bold text-slate-700">100m Haversine Geofence</div>
                <p className="text-[10px] text-slate-500 leading-tight">
                  Field officers must be within 100m of damage coordinates to close grievances.
                </p>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <div className="font-bold text-slate-700">Live Hardware Watermark</div>
                <p className="text-[10px] text-slate-500 leading-tight">
                  GPS telemetry is permanently stamped onto canvas bytes to prevent image tampering.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar: Copyright & Policy Links (No Admin Portal Links) */}
        <div className="border-t border-slate-200 pt-6 flex flex-col sm:flex-row justify-between items-center text-xs text-slate-500 gap-3">
          <div>
            &copy; 2026 CivicLens &bull; Transparent Municipal Grievance Redressal System.
          </div>
          <div className="flex items-center space-x-5 text-[11px]">
            <Link to="/privacy" className="hover:text-sky-600 transition">
              Privacy Policy
            </Link>
            <span>&bull;</span>
            <Link to="/terms" className="hover:text-sky-600 transition">
              Terms of Service
            </Link>
            <span>&bull;</span>
            <Link to="/grievance-policy" className="hover:text-sky-600 transition">
              Citizen Charter
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
