import React from 'react';
import { Link } from 'react-router-dom';
import { FileText, AlertTriangle, ShieldCheck, Scale, CheckCircle2, ArrowLeft, Ban, Flame } from 'lucide-react';

export const TermsOfService: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -z-10" />

      <div className="max-w-4xl mx-auto space-y-8 relative">
        {/* Navigation Breadcrumb */}
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-sky-600 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </Link>

        {/* Hero Header */}
        <div className="bg-white rounded-3xl p-8 sm:p-10 border border-slate-200/90 shadow-sm space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center">
            <Scale className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Terms of Service &amp; Code of Conduct
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Effective Date: September 2026 &bull; CivicLens Municipal Infrastructure Platform
            </p>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">
            Welcome to CivicLens. By accessing our platform, reporting public grievances, or reviewing municipal resolution records, you agree to comply with these Terms of Service. Please review these terms carefully before submitting any geotagged grievances.
          </p>
        </div>

        {/* Policy Sections */}
        <div className="bg-white rounded-3xl p-8 sm:p-10 border border-slate-200/90 shadow-sm space-y-8 text-sm text-slate-700 leading-relaxed">
          {/* Section 1: Non-Emergency Notice */}
          <section className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-2">
            <div className="flex items-center gap-2 text-amber-800 font-bold text-sm">
              <Flame className="w-4 h-4 text-amber-600 shrink-0" />
              <span>CRITICAL: Not an Emergency Response Service</span>
            </div>
            <p className="text-xs text-amber-900 leading-relaxed">
              CivicLens is dedicated strictly to non-emergency municipal infrastructure maintenance (potholes, garbage accumulation, sewage leaks, broken streetlights). For immediate life-safety emergencies, crimes in progress, fires, or medical crises, please dial your official emergency helpline directly (<strong className="text-amber-950 font-bold">112</strong> for Police/Disaster, <strong className="text-amber-950 font-bold">101</strong> for Fire, <strong className="text-amber-950 font-bold">108</strong> for Ambulance).
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-3">
            <div className="flex items-center gap-2.5 text-slate-900 font-bold text-base">
              <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0" />
              <h2>1. Scope of Acceptable Grievance Reporting</h2>
            </div>
            <p>
              CivicLens is designed solely for reporting observable, outdoor public municipal infrastructure hazards:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-600 text-xs sm:text-sm">
              <li><strong className="text-slate-900">Roads &amp; Potholes:</strong> Surface craters, collapsed asphalt, missing paving slabs, broken sidewalks.</li>
              <li><strong className="text-slate-900">Garbage &amp; Sanitation:</strong> Overflowing community bins, unauthorized roadside dumps, unsanitary waste heaps.</li>
              <li><strong className="text-slate-900">Water Supply &amp; Sewage:</strong> Broken public municipal pipelines, overflowing manholes, open stormwater drains.</li>
              <li><strong className="text-slate-900">Electricity &amp; Streetlights:</strong> Non-functional municipal streetlights, damaged electric poles, hazardous dangling live wires outdoors.</li>
              <li><strong className="text-slate-900">Public Infrastructure:</strong> Damaged public bus shelters, broken park equipment, municipal barrier damages.</li>
            </ul>
          </section>

          <hr className="border-slate-100" />

          {/* Section 3 */}
          <section className="space-y-3">
            <div className="flex items-center gap-2.5 text-slate-900 font-bold text-base">
              <Ban className="w-5 h-5 text-rose-600 shrink-0" />
              <h2>2. Strictly Prohibited Content &amp; Actions</h2>
            </div>
            <p>
              CivicLens operates automated Computer Vision AI filters and manual audit procedures. Submitting any of the following will result in instant rejection and permanent account revocation:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-600 text-xs sm:text-sm">
              <li><strong className="text-slate-900">Personal Portraits &amp; Selfies:</strong> Studio photos, passport photos, individual portraits, or human face pictures. Municipal authorities do not process personal portraits.</li>
              <li><strong className="text-slate-900">Personal Electronics &amp; Domestic Interiors:</strong> Photos of laptops, computer monitors, phone screens, bedroom furniture, or private domestic interiors.</li>
              <li><strong className="text-slate-900">Obscene, NSFW &amp; Vulgar Imagery:</strong> Any sexually explicit, obscene, offensive, or defamatory content is strictly forbidden and subject to legal referral.</li>
              <li><strong className="text-slate-900">GPS Mocking &amp; False Telemetry:</strong> Using mock location emulators, fake coordinate injection, or tampered hardware GPS signals.</li>
              <li><strong className="text-slate-900">Frivolous or Malicious Reports:</strong> Filing repeated duplicate or fictitious complaints intended to harass municipal staff or waste public resources.</li>
            </ul>
          </section>

          <hr className="border-slate-100" />

          {/* Section 4 */}
          <section className="space-y-3">
            <div className="flex items-center gap-2.5 text-slate-900 font-bold text-base">
              <FileText className="w-5 h-5 text-blue-600 shrink-0" />
              <h2>3. Live Camera Sensor &amp; Verification Protocol</h2>
            </div>
            <p>
              To protect the integrity of public municipal grievance records:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-600 text-xs sm:text-sm">
              <li>Citizens agree to capture real-time photographs on-site using the platform's live camera interface.</li>
              <li>Citizens consent to embedding unalterable GPS coordinates, accuracy margins, and timestamps onto the captured image canvas.</li>
              <li>District Sub-Admins agree to be physically present within 100 meters of the recorded grievance coordinates to submit live photographic resolution proof before tickets can be marked as Resolved.</li>
            </ul>
          </section>

          <hr className="border-slate-100" />

          {/* Section 5 */}
          <section className="space-y-3">
            <div className="flex items-center gap-2.5 text-slate-900 font-bold text-base">
              <Scale className="w-5 h-5 text-blue-600 shrink-0" />
              <h2>4. Public Domain License for Civic Imagery</h2>
            </div>
            <p>
              By capturing and submitting photographs of public municipal infrastructure through CivicLens, you grant the platform and relevant municipal government authorities a perpetual, royalty-free license to use, reproduce, display, and archive the imagery for public inspection, repair coordination, and municipal performance metrics.
            </p>
          </section>

          <hr className="border-slate-100" />

          {/* Section 6 */}
          <section className="space-y-3">
            <div className="flex items-center gap-2.5 text-slate-900 font-bold text-base">
              <AlertTriangle className="w-5 h-5 text-slate-500 shrink-0" />
              <h2>5. Limitation of Liability &amp; Repair Disclaimers</h2>
            </div>
            <p>
              CivicLens is a civic-technology bridge facilitating direct geotagged communication between citizens and authorized local government bodies. While the platform routes and tracks all grievances with high transparency:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-600 text-xs sm:text-sm">
              <li>Physical execution of road paving, pipeline maintenance, electrical repairs, and waste collection remains the operational responsibility of local municipal corporations and contracted agencies.</li>
              <li>CivicLens does not assume liability for physical injuries, vehicular damage, or property losses arising from municipal road or electrical hazards prior to government repair.</li>
            </ul>
          </section>

          <hr className="border-slate-100" />

          {/* Section 7 */}
          <section className="space-y-3">
            <div className="flex items-center gap-2.5 text-slate-900 font-bold text-base">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <h2>6. Modifications to Terms</h2>
            </div>
            <p>
              CivicLens reserves the right to revise these Terms of Service periodically to reflect evolving municipal regulations and security standards. Continued use of the platform constitutes acceptance of any updated guidelines.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};
