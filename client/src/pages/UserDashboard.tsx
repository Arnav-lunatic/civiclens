import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Camera, CheckCircle2, Clock, AlertTriangle, RefreshCw, MapPin, ExternalLink } from 'lucide-react';
import { API } from '../services/api';
import { Complaint } from '../types';
import { ComplaintImage } from '../components/ComplaintImage';
import { ImageModal } from '../components/ImageModal';

export const UserDashboard: React.FC = () => {
  const navigate = useNavigate();
  const user = API.getUser('citizen');
  const [complaints, setComplaints] = useState<Complaint[]>(() => {
    try {
      const saved = sessionStorage.getItem('civiclens_cache_user_complaints');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [loading, setLoading] = useState<boolean>(() => complaints.length === 0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [previewImage, setPreviewImage] = useState<{ url: string; title?: string; subtitle?: string } | null>(null);

  useEffect(() => {
    if (!user || API.getRole('citizen') !== 'citizen') {
      navigate('/login');
      return;
    }
    loadComplaints();
  }, []);

  const loadComplaints = async (skipCache = false) => {
    if (complaints.length === 0) {
      setLoading(true);
    } else {
      setIsRefreshing(true);
    }
    try {
      const res = await API.request('/complaints/my', 'GET', null, false, { skipCache });
      if (res.complaints) {
        setComplaints(res.complaints);
        try {
          sessionStorage.setItem('civiclens_cache_user_complaints', JSON.stringify(res.complaints));
        } catch {}
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const total = complaints.length;
  const pending = complaints.filter((c) => c.status === 'Pending').length;
  const inProgress = complaints.filter((c) => c.status === 'In Progress' || c.status === 'Under Review').length;
  const resolved = complaints.filter((c) => c.status === 'Resolved').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8 text-slate-800">
      {/* Citizen Command Header */}
      <div className="relative bg-gradient-to-br from-sky-900 via-blue-900 to-indigo-950 text-white rounded-3xl p-6 sm:p-8 border border-blue-800/50 shadow-xl flex flex-col sm:flex-row justify-between sm:items-center gap-5 overflow-hidden">
        <div className="absolute top-0 right-1/3 w-64 h-64 bg-sky-400/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative flex items-center space-x-4 z-10">
          <div className="w-14 h-14 rounded-2xl bg-white text-slate-900 flex items-center justify-center text-xl font-black shadow-md">
            {user?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-white">{user?.name}</h1>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-bold">
                Verified Citizen
              </span>
            </div>
            <p className="text-xs text-slate-200 mt-0.5 font-mono">{user?.email}</p>
          </div>
        </div>

        <Link
          to="/report"
          className="relative z-10 px-5 py-3 bg-white text-slate-900 hover:bg-slate-100 font-bold text-xs rounded-2xl shadow-lg hover:shadow-xl transition flex items-center gap-2 self-start sm:self-auto"
        >
          <Camera className="w-4 h-4 text-sky-600" />
          <span>File Geotagged Grievance</span>
        </Link>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-sm space-y-1">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">Total Reported</div>
          <div className="text-3xl font-black font-mono text-slate-900">{total}</div>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-sm space-y-1">
          <div className="text-[11px] font-bold text-amber-700 uppercase tracking-wider font-mono">Under Triage</div>
          <div className="text-3xl font-black font-mono text-amber-600">{pending}</div>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-sm space-y-1">
          <div className="text-[11px] font-bold text-sky-700 uppercase tracking-wider font-mono">In Progress</div>
          <div className="text-3xl font-black font-mono text-sky-600">{inProgress}</div>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-sm space-y-1">
          <div className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider font-mono">Resolved</div>
          <div className="text-3xl font-black font-mono text-emerald-600">{resolved}</div>
        </div>
      </div>

      {/* Grievance Feed */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-black text-slate-900">My Reported Issues</h2>
            <p className="text-xs text-slate-500">Track real-time resolution progress and officer status</p>
          </div>
          <button
            onClick={() => loadComplaints(true)}
            className="text-xs font-bold text-sky-600 hover:text-sky-700 flex items-center gap-1.5 transition bg-sky-50 hover:bg-sky-100 px-3 py-1.5 rounded-xl border border-sky-200"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${(loading || isRefreshing) ? 'animate-spin' : ''}`} />
            <span>Sync</span>
          </button>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-500 space-y-2">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-sky-600" />
            <p className="text-xs">Fetching your reported grievances from municipal database...</p>
          </div>
        ) : complaints.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm space-y-3">
            <CheckCircle2 className="w-12 h-12 text-sky-600 mx-auto" />
            <h3 className="text-lg font-bold text-slate-900">No Complaints Lodged Yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">Spotted a civic hazard? Report it with live geotagged proof in seconds.</p>
            <Link
              to="/report"
              className="inline-block mt-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-sky-500 to-teal-500 text-white text-xs font-bold shadow-md shadow-sky-500/20 hover:from-sky-400 hover:to-teal-400 transition"
            >
              Report Hazard Now
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {complaints.map((item) => {
              const mainImg = item.images && item.images.length > 0 ? item.images[0].url : item.imageUrl;
              const photosCount = item.images?.length || 1;

              return (
                <div
                  key={item._id}
                  className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden flex flex-col justify-between hover:shadow-md transition"
                >
                  <div>
                    <ComplaintImage
                      src={mainImg}
                      alt={item.title}
                      heightClass="h-56 sm:h-64"
                      onClick={() =>
                        setPreviewImage({
                          url: mainImg,
                          title: item.title,
                          subtitle: `Status: ${item.status} | Category: ${item.category} | PIN: ${item.pincode}`,
                        })
                      }
                      topRightBadge={
                        <span
                          className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase shadow-md ${
                            item.status === 'Resolved'
                              ? 'bg-emerald-600 text-white'
                              : item.status === 'In Progress'
                              ? 'bg-blue-600 text-white'
                              : item.status === 'Under Review'
                              ? 'bg-amber-600 text-white'
                              : 'bg-slate-700 text-white'
                          }`}
                        >
                          {item.status}
                        </span>
                      }
                      topLeftBadge={
                        item.resolvedImageUrl ? (
                          <span className="px-2 py-0.5 rounded bg-rose-600 text-white text-[9px] font-bold shadow backdrop-blur-xs">
                            BEFORE: Reported Issue
                          </span>
                        ) : undefined
                      }
                      bottomOverlay={
                        <div className="flex gap-1.5 items-center">
                          <span className="px-2 py-0.5 rounded-lg bg-slate-900/90 backdrop-blur-md text-white text-[10px] font-mono font-bold">
                            PIN {item.pincode}
                          </span>
                          <span className="px-2 py-0.5 rounded-lg bg-sky-950/90 backdrop-blur-md text-sky-300 text-[10px] font-mono">
                            GPS: {item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}
                          </span>
                          {photosCount > 1 && (
                            <span className="px-2 py-0.5 rounded-lg bg-slate-900/90 text-white text-[10px] font-bold">
                              +{photosCount - 1} Photos
                            </span>
                          )}
                        </div>
                      }
                    />

                    <div className="p-5 space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-sky-600">{item.category}</span>
                        {item.district && (
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-bold rounded-md border border-slate-200">
                            District: {item.district}
                          </span>
                        )}
                      </div>
                      <h3 className="font-bold text-slate-900 text-base line-clamp-1">{item.title}</h3>
                      <p className="text-slate-600 text-xs leading-relaxed whitespace-pre-line break-words">{item.description}</p>
                      
                      <div className="space-y-1.5 pt-1">
                        <div className="text-[11px] text-slate-500 flex items-start gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                          <span className="leading-tight">{item.address || 'Geotagged location'} (PIN: {item.pincode || 'N/A'})</span>
                        </div>
                        <a
                          href={`https://www.google.com/maps?q=${item.latitude},${item.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-sky-600 hover:text-sky-700 font-bold text-[11px] bg-sky-50 hover:bg-sky-100 px-2.5 py-1 rounded-lg border border-sky-200 transition"
                        >
                          <MapPin className="w-3.5 h-3.5 text-sky-600" />
                          <span>📍 View Location on Google Maps</span>
                          <ExternalLink className="w-3 h-3 ml-0.5" />
                        </a>
                      </div>
                    </div>
                  </div>

                  <div className="p-5 pt-0 border-t border-slate-100 mt-3 pt-3 space-y-2">
                    <div className="text-[11px] text-slate-500 flex justify-between items-center">
                      <span>Assigned District Officer:</span>
                      <span className="font-bold text-slate-800">
                        {item.assignedSubAdmin ? item.assignedSubAdmin.name : 'District Routing Pending'}
                      </span>
                    </div>

                    {item.resolvedImageUrl ? (
                      <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-200 space-y-2.5 shadow-sm">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-[11px] font-black uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>Official Resolution Proof</span>
                          </span>
                          <span className="text-[10px] text-emerald-800 font-bold bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200">
                            Geofence Verified
                          </span>
                        </div>
                        <ComplaintImage
                          src={item.resolvedImageUrl}
                          alt={`Resolution Proof for ${item.title}`}
                          heightClass="h-44"
                          onClick={() =>
                            setPreviewImage({
                              url: item.resolvedImageUrl!,
                              title: `Official Resolution Proof: ${item.title}`,
                              subtitle: `Grievance Resolved | Category: ${item.category} | PIN: ${item.pincode}`,
                            })
                          }
                          topLeftBadge={
                            <span className="px-2 py-0.5 rounded bg-emerald-700 text-white text-[9px] font-bold shadow backdrop-blur-xs">
                              AFTER: Work Done
                            </span>
                          }
                        />
                        {item.resolutionNotes && (
                          <div className="p-2.5 bg-white rounded-xl border border-emerald-200 text-xs text-emerald-900">
                            <span className="font-bold text-emerald-800 text-[10px] uppercase block mb-0.5">Officer Resolution Note:</span>
                            <p className="italic leading-relaxed text-[11px]">"{item.resolutionNotes}"</p>
                          </div>
                        )}
                        {item.resolvedAt && (
                          <div className="text-[10px] text-emerald-700 flex items-center gap-1 font-mono">
                            <Clock className="w-3 h-3" />
                            <span>Resolved on: {new Date(item.resolvedAt).toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                    ) : item.status === 'Resolved' ? (
                      <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="font-semibold">Issue marked as Resolved by municipal authorities.</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>Reported: {new Date(item.createdAt).toLocaleDateString()}</span>
                        </span>
                        <span className="font-bold text-amber-700">Resolution in Progress</span>
                      </div>
                    )}

                    <div className="text-[10px] text-slate-400 text-right font-mono">
                      Ticket #{item._id.slice(-6).toUpperCase()}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* High-Resolution Uncropped Image Modal */}
      <ImageModal
        isOpen={Boolean(previewImage)}
        onClose={() => setPreviewImage(null)}
        imageUrl={previewImage?.url || ''}
        title={previewImage?.title}
        subtitle={previewImage?.subtitle}
      />
    </div>
  );
};
