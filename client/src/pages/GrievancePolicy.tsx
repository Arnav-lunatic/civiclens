import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Clock, MapPin, Building2, Shield, ArrowLeft, AlertCircle, Sparkles, Navigation } from 'lucide-react';

export const GrievancePolicy: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Navigation Breadcrumb */}
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-sky-600 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </Link>

        {/* Hero Header */}
        <div className="bg-white rounded-3xl p-8 sm:p-10 border border-slate-200 shadow-sm space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Citizen Charter &amp; Grievance Redressal Policy
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Service Standards &bull; Municipal Resolution SLAs &bull; Anti-Fraud Geofencing Protocols
            </p>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">
            The CivicLens Citizen Charter outlines our commitment to timely, transparent, and accountable municipal grievance resolution. This policy defines the standard workflow, expected resolution timelines (SLAs), and technological verification requirements governing all reported grievances.
          </p>
        </div>

        {/* Policy Sections */}
        <div className="bg-white rounded-3xl p-8 sm:p-10 border border-slate-200 shadow-sm space-y-8 text-sm text-slate-700 leading-relaxed">
          {/* Section 1: Standard Grievance Lifecycle */}
          <section className="space-y-4">
            <div className="flex items-center gap-2.5 text-slate-900 font-bold text-base">
              <Sparkles className="w-5 h-5 text-sky-600 shrink-0" />
              <h2>1. Five-Stage Grievance Resolution Lifecycle</h2>
            </div>
            <p>
              Every grievance submitted via CivicLens undergoes a rigorous five-stage accountability process:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-bold text-sky-700 uppercase">
                  <span className="w-5 h-5 rounded-full bg-sky-600 text-white flex items-center justify-center text-[10px]">1</span>
                  <span>On-Site AI Validation</span>
                </div>
                <p className="text-xs text-slate-600">
                  Citizen captures photo with live camera. Vision AI validates municipal authenticity, assigns category, and sets severity priority in under 2 seconds.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-bold text-blue-700 uppercase">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">2</span>
                  <span>Jurisdiction Dispatch</span>
                </div>
                <p className="text-xs text-slate-600">
                  Complaint is automatically routed to the designated District Sub-Admin officer matching the location's postal PIN code and municipal ward.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-700 uppercase">
                  <span className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center text-[10px]">3</span>
                  <span>Field Team Action</span>
                </div>
                <p className="text-xs text-slate-600">
                  District officer reviews report, marks ticket as "In Progress", and dispatches municipal field teams, contractors, or emergency repair squads.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 uppercase">
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">4</span>
                  <span>100m Geofenced Proof</span>
                </div>
                <p className="text-xs text-slate-600">
                  Officer must be physically present within 100 meters of the issue GPS location to take a live resolution photo before marking "Resolved".
                </p>
              </div>
            </div>
          </section>

          <hr className="border-slate-100" />

          {/* Section 2: Service Level Agreements (SLAs) */}
          <section className="space-y-4">
            <div className="flex items-center gap-2.5 text-slate-900 font-bold text-base">
              <Clock className="w-5 h-5 text-sky-600 shrink-0" />
              <h2>2. Service Level Agreements (SLAs) by Priority</h2>
            </div>
            <p>
              Resolution target timelines are strictly governed by AI-assigned priority ratings:
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider">
                    <th className="py-2.5 px-3">Priority Level</th>
                    <th className="py-2.5 px-3">Examples of Hazard</th>
                    <th className="py-2.5 px-3">Target Response Time</th>
                    <th className="py-2.5 px-3">Target Resolution SLA</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  <tr className="bg-rose-50/50">
                    <td className="py-3 px-3 font-bold text-rose-700">Critical</td>
                    <td className="py-3 px-3">Dangling live electrical wires, major roadway sinkhole, gas/chemical hazard</td>
                    <td className="py-3 px-3 font-semibold text-rose-800">&lt; 4 Hours</td>
                    <td className="py-3 px-3 font-black text-rose-900">24 – 48 Hours</td>
                  </tr>
                  <tr className="bg-amber-50/50">
                    <td className="py-3 px-3 font-bold text-amber-700">High</td>
                    <td className="py-3 px-3">Large water-filled potholes, open sewage manhole, major street water pipeline burst</td>
                    <td className="py-3 px-3 font-semibold text-amber-800">&lt; 12 Hours</td>
                    <td className="py-3 px-3 font-black text-amber-900">48 – 72 Hours</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-3 font-bold text-blue-700">Medium</td>
                    <td className="py-3 px-3">Broken streetlight pole, overflowing public community dustbin, sidewalk damage</td>
                    <td className="py-3 px-3 font-semibold text-blue-800">&lt; 24 Hours</td>
                    <td className="py-3 px-3 font-black text-blue-900">3 – 5 Working Days</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-3 font-bold text-slate-700">Low</td>
                    <td className="py-3 px-3">Faded pedestrian crosswalk paint, minor park bench damage, non-blocking debris</td>
                    <td className="py-3 px-3 font-semibold text-slate-800">&lt; 48 Hours</td>
                    <td className="py-3 px-3 font-black text-slate-900">7 Working Days</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <hr className="border-slate-100" />

          {/* Section 3: Anti-Fraud Geofencing Protocol */}
          <section className="space-y-3">
            <div className="flex items-center gap-2.5 text-slate-900 font-bold text-base">
              <Navigation className="w-5 h-5 text-emerald-600 shrink-0" />
              <h2>3. Strict 100-Meter Geofencing Redressal Protocol</h2>
            </div>
            <p>
              To eliminate false resolutions, "desk-closing" of tickets, or contractor fraud, CivicLens enforces our patented <strong>Haversine Geofenced Verification Protocol</strong>:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-600 text-xs sm:text-sm">
              <li>
                <strong>Hardware Sensor Locking:</strong> When an officer attempts to mark a ticket as Resolved, their device sensor GPS coordinates are measured against the original citizen geotag using the Haversine spherical distance formula.
              </li>
              <li>
                <strong>100m Perimeter Enforcement:</strong> If the officer is farther than 100 meters from the site, resolution photo submission is automatically disabled by the platform.
              </li>
              <li>
                <strong>Mandatory "After" Photo:</strong> A live, unalterable camera snapshot of the completed work must be submitted, which is permanently displayed alongside the original "Before" photo on the public transparency feed.
              </li>
            </ul>
          </section>

          <hr className="border-slate-100" />

          {/* Section 4: Citizen Rights & Escalation */}
          <section className="space-y-3">
            <div className="flex items-center gap-2.5 text-slate-900 font-bold text-base">
              <Building2 className="w-5 h-5 text-sky-600 shrink-0" />
              <h2>4. Escalation &amp; Appeal to State Super-Admin</h2>
            </div>
            <p>
              If a municipal grievance is not redressed within the specified SLA timeline or if a citizen disputes the quality of work demonstrated in the resolution photo:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-600 text-xs sm:text-sm">
              <li>The ticket is automatically flagged on the <strong>State Governance Super-Admin Dashboard</strong> as an SLA Breach.</li>
              <li>Super-Admins hold jurisdictional authority to re-open closed complaints, reassign district field officers, and penalize contractor negligence.</li>
              <li>Citizens may contact the state grievance escalation desk directly at <strong>escalations@civiclens.gov.in</strong> quoting their ticket ID.</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
};
