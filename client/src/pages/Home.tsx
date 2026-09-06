import React from 'react';
import { Link } from 'react-router-dom';
import { Camera, MapPin, ShieldCheck, ArrowRight, CheckCircle2, Clock, Users, Building2, Globe } from 'lucide-react';

export const Home: React.FC = () => {
  return (
    <div className="space-y-16 py-8 px-4 sm:px-6 max-w-7xl mx-auto">
      {/* Hero Section */}
      <section className="pt-4 pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Column: Headline, Mobile Hero Image, & Action Buttons */}
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky-50 text-sky-700 text-xs font-bold border border-sky-200 shadow-xs">
              <ShieldCheck className="w-4 h-4 text-sky-600" />
              <span>Verified Citizen Governance &bull; Smart Geotagged Redressal</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.1]">
              Report Civic Issues in <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-600 to-blue-600">30 Seconds</span>
            </h1>

            <p className="text-slate-600 text-sm sm:text-base max-w-xl mx-auto lg:mx-0 font-normal leading-relaxed">
              Potholes, broken streetlights, sewage leaks, or illegal garbage dumps? CivicLens uses verified real-time GPS & live camera photos to route grievances directly to your designated district officer.
            </p>

            {/* Mobile-Only Hero Showcase Image (Positioned right before File Grievance) */}
            <div className="block lg:hidden my-5">
              <div className="relative mx-auto max-w-md">
                <div className="absolute -inset-1.5 bg-gradient-to-r from-sky-400/20 via-blue-500/20 to-indigo-400/20 rounded-3xl blur-md opacity-70"></div>
                <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden border border-slate-200 bg-white shadow-xl">
                  <img
                    src="/images/s.jpeg"
                    alt="CivicLens in Action: Citizens identifying broken streetlights, potholes, and garbage on city streets with AI"
                    className="w-full h-auto object-cover max-h-[300px] sm:max-h-[360px]"
                    loading="eager"
                  />
                  <div className="absolute top-2.5 left-2.5 bg-slate-900/80 backdrop-blur-md text-white px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1.5 shadow border border-white/10">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>AI Ground Vision Active</span>
                  </div>
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-950/90 via-slate-950/60 to-transparent p-3 text-white text-left">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-slate-200">On-Site Real-Time Reporting</span>
                      <span className="px-1.5 py-0.5 rounded bg-sky-500/30 text-sky-300 font-mono text-[9px] font-bold border border-sky-400/30">
                        GPS LOCKED
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-300 mt-0.5 leading-tight">
                      Identifies broken streetlights, potholes &amp; garbage dumps directly from live camera.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 pt-2">
              <Link
                to="/report"
                className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 text-white font-bold text-sm shadow-lg shadow-sky-500/25 hover:shadow-xl transition flex items-center justify-center gap-2 group"
              >
                <Camera className="w-5 h-5 group-hover:scale-110 transition" />
                <span>File Grievance</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/explore"
                className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 font-bold text-sm shadow-xs transition flex items-center justify-center gap-2"
              >
                <Globe className="w-4 h-4 text-sky-600" />
                <span>Explore Public Issues</span>
              </Link>
              <Link
                to="/dashboard"
                className="w-full sm:w-auto px-5 py-3.5 rounded-2xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold text-sm shadow-xs transition flex items-center justify-center gap-2"
              >
                <span>Track Status</span>
              </Link>
            </div>

            {/* Quick trust metrics */}
            <div className="pt-2 flex flex-wrap items-center justify-center lg:justify-start gap-4 text-xs text-slate-500 font-medium">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>AI Vision Categorization</span>
              </div>
              <div className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-sky-500" />
                <span>Strict Hardware GPS</span>
              </div>
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-blue-500" />
                <span>Anti-Spoof Watermark</span>
              </div>
            </div>
          </div>

          {/* Desktop-Only Right Column: Hero Image Showcase (s.jpeg) */}
          <div className="hidden lg:block lg:col-span-5 relative">
            <div className="relative mx-auto max-w-lg lg:max-w-none">
              {/* Background ambient glow */}
              <div className="absolute -inset-2 bg-gradient-to-r from-sky-400/20 via-blue-500/20 to-indigo-400/20 rounded-3xl blur-xl opacity-70"></div>

              {/* Main Image Frame */}
              <div className="relative rounded-3xl overflow-hidden border border-slate-200/80 bg-white shadow-2xl">
                <img
                  src="/images/s.jpeg"
                  alt="CivicLens in Action: Citizens identifying broken streetlights, potholes, and garbage on city streets with AI"
                  className="w-full h-auto object-cover max-h-[380px] sm:max-h-[440px]"
                  loading="eager"
                />

                {/* Floating Telemetry Overlays */}
                <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-md text-white px-3 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-2 shadow-md border border-white/10">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>AI Ground Vision Active</span>
                </div>

                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-950/90 via-slate-950/60 to-transparent p-4 text-white">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-200">On-Site Real-Time Reporting</span>
                    <span className="px-2 py-0.5 rounded-md bg-sky-500/30 text-sky-300 font-mono text-[10px] font-bold border border-sky-400/30">
                      GPS LOCKED
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    CivicLens app detects broken streetlights, potholes &amp; garbage dumps directly from smartphone camera feeds.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3 Step Workflow */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold text-lg">
            <MapPin className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">1. Real-Time GPS Pin</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Your physical GPS sensor locks the exact geographic coordinates without manual spoofing.
          </p>
        </div>

        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg">
            <Camera className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">2. Live Watermarked Camera</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Capture on-site photos with verified GPS coordinates and timestamp watermarks burned onto the image.
          </p>
        </div>

        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-lg">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">3. Direct Municipal Routing</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Auto-assigned to the local District Sub-Admin mapped to your postal PIN code with real-time status tracking.
          </p>
        </div>
      </section>

      {/* Verified Ground Impact: Pothole & Road Restoration (before_after3.jpeg) */}
      <section className="bg-gradient-to-br from-slate-50 via-white to-sky-50/50 border border-slate-200/90 rounded-3xl p-6 sm:p-10 shadow-sm">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Text */}
          <div className="lg:col-span-6 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Proven Municipal Transformation</span>
            </div>
            
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              From Citizen Complaint to Smooth Asphalt
            </h2>

            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Every complaint filed with CivicLens is backed by verifiable on-site evidence. When waterlogged craters and severe potholes were reported on this transit corridor, the local municipal engineering division mobilized heavy paving crews to completely reconstruct the roadway.
            </p>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-2xs">
                <div className="text-[10px] uppercase font-bold text-slate-400">Resolution SLA</div>
                <div className="text-lg font-black text-emerald-600">48 Hours</div>
                <div className="text-[11px] text-slate-500">From Report to Completion</div>
              </div>
              <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-2xs">
                <div className="text-[10px] uppercase font-bold text-slate-400">On-Site Verification</div>
                <div className="text-lg font-black text-sky-600">100% Geotagged</div>
                <div className="text-[11px] text-slate-500">Live GPS Verified</div>
              </div>
            </div>

            <div className="pt-2">
              <Link
                to="/explore"
                className="inline-flex items-center gap-2 text-xs font-bold text-sky-600 hover:text-sky-700 hover:underline"
              >
                <span>View more resolved community grievances</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Right Image Display */}
          <div className="lg:col-span-6">
            <div className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-lg bg-white">
              <img
                src="/images/before_after3.jpeg"
                alt="Before and After: Muddy cratered road paved into brand new smooth asphalt"
                className="w-full h-auto object-cover"
                loading="lazy"
              />
              <div className="absolute top-3 left-3 bg-rose-600/90 backdrop-blur-xs text-white px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider shadow">
                Before: Waterlogged Craters
              </div>
              <div className="absolute bottom-3 right-3 bg-emerald-600/90 backdrop-blur-xs text-white px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider shadow flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>After: Smooth Paved Asphalt</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-slate-900 text-white rounded-3xl p-8 sm:p-12 shadow-xl grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
        <div>
          <div className="text-3xl sm:text-4xl font-black text-sky-400">100%</div>
          <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider mt-1">Geotagged Proof</div>
        </div>
        <div>
          <div className="text-3xl sm:text-4xl font-black text-emerald-400">&lt; 24h</div>
          <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider mt-1">SLA Triage</div>
        </div>
        <div>
          <div className="text-3xl sm:text-4xl font-black text-amber-400">PIN-Code</div>
          <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider mt-1">Auto-Routing</div>
        </div>
        <div>
          <div className="text-3xl sm:text-4xl font-black text-purple-400">Live</div>
          <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider mt-1">Resolution Audit</div>
        </div>
      </section>

      {/* Community Grievances Showcase Section */}
      <section className="bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-50 border border-sky-100 rounded-3xl p-8 sm:p-10 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2 max-w-xl text-center md:text-left">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white text-sky-700 text-xs font-bold border border-sky-200 shadow-2xs">
            <Globe className="w-3.5 h-3.5 text-sky-600" />
            <span>Open Public Transparency</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
            Explore Grievances Across All States
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
            No login required. Explore active & resolved issues reported by citizens nationwide, sorted automatically to show the civic complaints nearest to your current location first.
          </p>
        </div>

        <Link
          to="/explore"
          className="px-6 py-3.5 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-2xl shadow-md shadow-sky-600/20 transition flex items-center gap-2 shrink-0 group"
        >
          <span>View Nearest Grievances</span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
        </Link>
      </section>

      {/* Footer Navigation */}
      <footer className="border-t border-slate-200 pt-8 pb-12 flex flex-col sm:flex-row justify-between items-center text-xs text-slate-500 gap-4">
        <div>&copy; 2026 CivicLens &bull; Smart Grievance Redressal System</div>
        <div className="flex items-center space-x-6">
          <Link to="/admin/login" className="hover:text-blue-600 font-semibold">
            District Sub-Admin Portal
          </Link>
          <Link to="/superadmin/login" className="hover:text-sky-700 font-semibold">
            State Governance Super Admin
          </Link>
        </div>
      </footer>
    </div>
  );
};
