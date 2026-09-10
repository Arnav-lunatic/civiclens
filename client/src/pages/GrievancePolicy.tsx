import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Clock, MapPin, Building2, Shield, ArrowLeft, AlertCircle, Sparkles, Navigation } from 'lucide-react';

export const GrievancePolicy: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#090d16] text-slate-200 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none -z-10" />

      <div className="max-w-4xl mx-auto space-y-8 relative">
        {/* Navigation Breadcrumb */}
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-sky-400 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </Link>

        {/* Hero Header */}
        <div className="bg-slate-900/80 backdrop-blur-xl rounded-3xl p-8 sm:p-10 border border-slate-800 shadow-2xl space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Citizen Charter &amp; Grievance Redressal Policy
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Service Standards &bull; Municipal Resolution SLAs &bull; Anti-Fraud Geofencing Protocols
            </p>
          </div>
          <p className="text-sm text-slate-300 leading-relaxed">
            The CivicLens Citizen Charter outlines our commitment to timely, transparent, and accountable municipal grievance resolution. This policy defines the standard workflow, expected resolution timelines (SLAs), and technological verification requirements governing all reported grievances.
          </p>
        </div>

        {/* Policy Sections */}
        <div className="bg-slate-900/80 backdrop-blur-xl rounded-3xl p-8 sm:p-10 border border-slate-800 shadow-2xl space-y-8 text-sm text-slate-300 leading-relaxed">
          {/* Section 1: Standard Grievance Lifecycle */}
          <section className="space-y-4">
            <div className="flex items-center gap-2.5 text-white font-bold text-base">
              <Sparkles className="w-5 h-5 text-sky-400 shrink-0" />
              <h2>1. Five-Stage Grievance Resolution Lifecycle</h2>
            </div>
            <p>
              Every grievance submitted via CivicLens undergoes a rigorous five-stage accountability process:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/80 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-bold text-sky-400 uppercase">
                  <span className="w-5 h-5 rounded-full bg-sky-500 text-slate-950 font-black flex items-center justify-center text-[10px]">1</span>
                  <span>On-Site AI Validation</span>
                </div>
                <p className="text-xs text-slate-400">
                  Citizen captures photo with live camera. Vision AI validates municipal authenticity, assigns category, and sets severity priority in under 2 seconds.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/80 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-bold text-blue-400 uppercase">
                  <span className="w-5 h-5 rounded-full bg-blue-500 text-white font-black flex items-center justify-center text-[10px]">2</span>
                  <span>Jurisdiction Dispatch</span>
                </div>
                <p className="text-xs text-slate-400">
                  Complaint is automatically routed to the designated District Sub-Admin officer matching the location's postal PIN code and municipal ward.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/80 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase">
                  <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 font-black flex items-center justify-center text-[10px]">3</span>
                  <span>Field Team Action</span>
                </div>
                <p className="text-xs text-slate-400">
                  District officer reviews report, marks ticket as "In Progress", and dispatches municipal field teams, contractors, or emergency repair squads.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/80 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase">
                  <span className="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 font-black flex items-center justify-center text-[10px]">4</span>
                  <span>100m Geofenced Proof</span>
                </div>
                <p className="text-xs text-slate-400">
                  Officer must be physically present within 100 meters of the issue GPS location to take a live resolution photo before marking "Resolved".
                </p>
              </div>
            </div>
          </section>

          <hr className="border-slate-800" />

          {/* Section 2: Service Level Agreements (SLAs) */}
          <section className="space-y-4">
            <div className="flex items-center gap-2.5 text-white font-bold text-base">
              <Clock className="w-5 h-5 text-sky-400 shrink-0" />
              <h2>2. Service Level Agreements (SLAs) by Priority</h2>
            </div>
            <p>
              Resolution target timelines are strictly governed by AI-assigned priority ratings:
            </p>

            <div className="overflow-x-auto rounded-2xl border border-slate-800">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-800/80 text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-3.5">Priority Level</th>
                    <th className="py-3 px-3.5">Examples of Hazard</th>
                    <th className="py-3 px-3.5">Target Response Time</th>
                    <th className="py-3 px-3.5">Target Resolution SLA</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 text-slate-300">
                  <tr className="bg-rose-500/10">
                    <td className="py-3.5 px-3.5 font-bold text-rose-400">Critical</td>
                    <td className="py-3.5 px-3.5 text-slate-300">Dangling live electrical wires, major roadway sinkhole, gas/chemical hazard</td>
                    <td className="py-3.5 px-3.5 font-semibold text-rose-300">&lt; 4 Hours</td>
                    <td className="py-3.5 px-3.5 font-black text-rose-400 font-mono">24 – 48 Hours</td>
                  </tr>
                  <tr className="bg-amber-500/10">
                    <td className="py-3.5 px-3.5 font-bold text-amber-400">High</td>
                    <td className="py-3.5 px-3.5 text-slate-300">Large water-filled potholes, open sewage manhole, major street water pipeline burst</td>
                    <td className="py-3.5 px-3.5 font-semibold text-amber-300">&lt; 12 Hours</td>
                    <td className="py-3.5 px-3.5 font-black text-amber-400 font-mono">48 – 72 Hours</td>
                  </tr>
                  <tr className="bg-blue-500/10">
                    <td className="py-3.5 px-3.5 font-bold text-blue-400">Medium</td>
                    <td className="py-3.5 px-3.5 text-slate-300">Broken streetlight pole, overflowing public community dustbin, sidewalk damage</td>
                    <td className="py-3.5 px-3.5 font-semibold text-blue-300">&lt; 24 Hours</td>
                    <td className="py-3.5 px-3.5 font-black text-blue-400 font-mono">3 – 5 Working Days</td>
                  </tr>
                  <tr className="bg-slate-800/40">
                    <td className="py-3.5 px-3.5 font-bold text-slate-400">Low</td>
                    <td className="py-3.5 px-3.5 text-slate-400">Faded pedestrian crosswalk paint, minor park bench damage, non-blocking debris</td>
                    <td className="py-3.5 px-3.5 font-semibold text-slate-300">&lt; 48 Hours</td>
                    <td className="py-3.5 px-3.5 font-black text-slate-300 font-mono">7 Working Days</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <hr className="border-slate-800" />

          {/* Section 3: Anti-Fraud Geofencing Protocol */}
          <section className="space-y-3">
            <div className="flex items-center gap-2.5 text-white font-bold text-base">
              <Navigation className="w-5 h-5 text-emerald-400 shrink-0" />
              <h2>3. Strict 100-Meter Geofencing Redressal Protocol</h2>
            </div>
            <p>
              To eliminate false resolutions, "desk-closing" of tickets, or contractor fraud, CivicLens enforces our patented <strong className="text-emerald-400 font-semibold">Haversine Geofenced Verification Protocol</strong>:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-400 text-xs sm:text-sm">
              <li>
                <strong className="text-slate-200">Hardware Sensor Locking:</strong> When an officer attempts to mark a ticket as Resolved, their device sensor GPS coordinates are measured against the original citizen geotag using the Haversine spherical distance formula.
              </li>
              <li>
                <strong className="text-slate-200">100m Perimeter Enforcement:</strong> If the officer is farther than 100 meters from the site, resolution photo submission is automatically disabled by the platform.
              </li>
              <li>
                <strong className="text-slate-200">Mandatory "After" Photo:</strong> A live, unalterable camera snapshot of the completed work must be submitted, which is permanently displayed alongside the original "Before" photo on the public transparency feed.
              </li>
            </ul>
          </section>

          <hr className="border-slate-800" />

          {/* Section 4: Citizen Rights & Escalation */}
          <section className="space-y-3">
            <div className="flex items-center gap-2.5 text-white font-bold text-base">
              <Building2 className="w-5 h-5 text-sky-400 shrink-0" />
              <h2>4. Escalation &amp; Appeal to State Super-Admin</h2>
            </div>
            <p>
              If a municipal grievance is not redressed within the specified SLA timeline or if a citizen disputes the quality of work demonstrated in the resolution photo:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-400 text-xs sm:text-sm">
              <li>The ticket is automatically flagged on the <strong className="text-slate-200">State Governance Super-Admin Dashboard</strong> as an SLA Breach.</li>
              <li>Super-Admins hold jurisdictional authority to re-open closed complaints, reassign district field officers, and penalize contractor negligence.</li>
              <li>Citizens may contact the state grievance escalation desk directly at <strong className="text-sky-400">escalations@civiclens.gov.in</strong> quoting their ticket ID.</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
};
