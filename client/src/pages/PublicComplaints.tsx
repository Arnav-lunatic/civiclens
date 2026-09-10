import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  MapPin,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Navigation,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  Eye,
  X,
  Building2,
  Globe,
  SlidersHorizontal,
  Compass,
  ArrowUpDown,
} from 'lucide-react';
import { API } from '../services/api';
import { fetchFallbackLocation } from '../services/geo';
import { Complaint } from '../types';
import { ComplaintImage } from '../components/ComplaintImage';
import { ImageModal } from '../components/ImageModal';

// Haversine formula: calculates distance in meters between two GPS coordinates
const calculateHaversine = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371000; // Earth radius in meters
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const formatDistance = (meters: number | null | undefined): string => {
  if (meters === null || meters === undefined) return 'Calculating...';
  if (meters < 1000) {
    return `${Math.round(meters)} m away`;
  }
  return `${(meters / 1000).toFixed(1)} km away`;
};

export const PublicComplaints: React.FC = () => {
  const [complaints, setComplaints] = useState<Complaint[]>(() => {
    try {
      const saved = sessionStorage.getItem('civiclens_cache_public_complaints');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [loading, setLoading] = useState<boolean>(() => complaints.length === 0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Visitor location state
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [locationType, setLocationType] = useState<'gps' | 'ip' | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState('');

  // Filters & Sorting
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Resolved' | 'Pending' | 'In Progress'>('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [sortBy, setSortBy] = useState<'nearest' | 'newest'>('nearest');

  // Image zoom modal
  const [previewImage, setPreviewImage] = useState<{ url: string; title?: string; subtitle?: string } | null>(null);

  useEffect(() => {
    loadComplaints();
    detectLocation();
  }, []);

  const loadComplaints = async (skipCache = false) => {
    if (complaints.length === 0) {
      setLoading(true);
    } else {
      setIsRefreshing(true);
    }
    try {
      const res = await API.request('/complaints/public?limit=100', 'GET', null, false, { skipCache });
      if (res.complaints) {
        setComplaints(res.complaints);
        try {
          sessionStorage.setItem('civiclens_cache_public_complaints', JSON.stringify(res.complaints));
        } catch {}
      }
    } catch (err: any) {
      console.error('Failed to load public complaints:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  // Location detection: Asks for GPS; if denied/unavailable, falls back to IP address location
  const detectLocation = () => {
    setLocationLoading(true);
    setLocationError('');

    if (!navigator.geolocation) {
      fallbackToIp('Geolocation not supported by browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLat(pos.coords.latitude);
        setUserLng(pos.coords.longitude);
        setLocationType('gps');
        setLocationLoading(false);
      },
      (err) => {
        console.warn('GPS prompt denied or unavailable, using IP address fallback for public view:', err.code, err.message);
        fallbackToIp(err.code === 1 ? 'GPS permission was denied.' : 'GPS unavailable on this device.');
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    );
  };

  const fallbackToIp = async (reason: string) => {
    try {
      const ipLoc = await fetchFallbackLocation();
      if (ipLoc) {
        setUserLat(ipLoc.lat);
        setUserLng(ipLoc.lng);
        setLocationType('ip');
        setLocationLoading(false);
        return;
      }
    } catch (e) {
      console.warn('IP fallback also failed:', e);
    }
    setLocationError(`${reason} Showing default feed.`);
    setLocationLoading(false);
  };

  // Compute distances & sort
  const complaintsWithDistance = useMemo(() => {
    return complaints.map((c) => {
      let distanceMeters: number | null = null;
      if (userLat !== null && userLng !== null && typeof c.latitude === 'number' && typeof c.longitude === 'number') {
        distanceMeters = calculateHaversine(userLat, userLng, c.latitude, c.longitude);
      }
      return {
        ...c,
        distanceMeters,
      };
    });
  }, [complaints, userLat, userLng]);

  // Filtered & Sorted complaints
  const processedComplaints = useMemo(() => {
    return complaintsWithDistance
      .filter((c) => {
        // Status filter
        if (statusFilter === 'Active') {
          if (c.status === 'Resolved' || c.status === 'Rejected') return false;
        } else if (statusFilter === 'Resolved') {
          if (c.status !== 'Resolved') return false;
        } else if (statusFilter !== 'All') {
          if (c.status !== statusFilter) return false;
        }

        // Category filter
        if (categoryFilter !== 'All' && c.category !== categoryFilter) {
          return false;
        }

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = c.title?.toLowerCase().includes(q);
          const matchDesc = c.description?.toLowerCase().includes(q);
          const matchAddr = c.address?.toLowerCase().includes(q);
          const matchPin = c.pincode?.includes(q);
          const matchDist = c.district?.toLowerCase().includes(q);
          const matchState = c.state?.toLowerCase().includes(q);
          if (!matchTitle && !matchDesc && !matchAddr && !matchPin && !matchDist && !matchState) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'nearest') {
          if (a.distanceMeters !== null && b.distanceMeters !== null) {
            return a.distanceMeters - b.distanceMeters;
          }
          if (a.distanceMeters !== null) return -1;
          if (b.distanceMeters !== null) return 1;
        }
        // Fallback or 'newest' sort
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [complaintsWithDistance, statusFilter, categoryFilter, searchQuery, sortBy]);

  const CATEGORIES = [
    'All',
    'Roads & Potholes',
    'Garbage & Sanitation',
    'Water Supply & Sewage',
    'Electricity & Streetlights',
    'Public Infrastructure',
    'Encroachment & Traffic',
    'Other',
  ];

  const totalCount = complaints.length;
  const resolvedCount = complaints.filter((c) => c.status === 'Resolved').length;
  const activeCount = complaints.filter((c) => c.status !== 'Resolved' && c.status !== 'Rejected').length;

  return (
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8 overflow-x-hidden">
      {/* ─── Top Hero Transparency Banner ─── */}
      <div className="relative bg-slate-950 text-white rounded-3xl p-6 sm:p-9 shadow-2xl overflow-hidden border border-slate-800">
        {/* Ambient glow */}
        <div className="absolute top-0 right-1/4 w-80 h-80 bg-sky-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative flex flex-col md:flex-row justify-between md:items-center gap-6 z-10">
          <div className="space-y-2.5">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-slate-900 text-sky-400 text-xs font-bold border border-slate-800 shadow-sm">
              <Globe className="w-4 h-4 text-sky-400" />
              <span>Nationwide Public Civic Transparency &bull; All States & Districts</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white">
              Open Public Grievance Feed
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-2xl font-normal leading-relaxed">
              Explore geotagged municipal complaints filed by citizens nationwide. Issues nearest to your physical coordinates are prioritized with verifiable Before & After resolution tracking.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5 w-full sm:w-auto shrink-0">
            <Link
              to="/report"
              className="w-full sm:w-auto px-5 py-3 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 text-white text-xs font-bold rounded-2xl shadow-lg shadow-sky-500/20 hover:shadow-sky-500/30 transition flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>File New Hazard</span>
            </Link>
            <button
              onClick={() => {
                loadComplaints(true);
                detectLocation();
              }}
              className="w-full sm:w-auto px-4 py-3 bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-bold rounded-2xl transition flex items-center justify-center gap-2 border border-slate-800 shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-sky-400 ${(loading || isRefreshing) ? 'animate-spin' : ''}`} />
              <span>Sync Feed</span>
            </button>
          </div>
        </div>
      </div>

      {/* ─── Metrics Summary Cards ─── */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-slate-900/80 backdrop-blur-md p-4 sm:p-6 rounded-3xl border border-slate-800/80 shadow-lg text-center sm:text-left space-y-1">
          <div className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider truncate">Total Complaints</div>
          <div className="text-2xl sm:text-4xl font-black font-mono text-white">{totalCount}</div>
        </div>
        <div className="bg-slate-900/80 backdrop-blur-md p-4 sm:p-6 rounded-3xl border border-slate-800/80 shadow-lg text-center sm:text-left space-y-1">
          <div className="text-[10px] sm:text-xs font-bold text-sky-400 uppercase tracking-wider truncate">Active Triage</div>
          <div className="text-2xl sm:text-4xl font-black font-mono text-sky-400">{activeCount}</div>
        </div>
        <div className="bg-slate-900/80 backdrop-blur-md p-4 sm:p-6 rounded-3xl border border-slate-800/80 shadow-lg text-center sm:text-left space-y-1">
          <div className="text-[10px] sm:text-xs font-bold text-emerald-400 uppercase tracking-wider truncate">Resolved &amp; Closed</div>
          <div className="text-2xl sm:text-4xl font-black font-mono text-emerald-400">{resolvedCount}</div>
        </div>
      </div>

      {/* ─── Verified Municipal Resolutions Spotlight ─── */}
      <div className="bg-slate-900/80 backdrop-blur-md rounded-3xl p-5 sm:p-7 border border-slate-800/80 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[11px] font-bold border border-emerald-500/20">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Verified On-Site Redressal Showcase</span>
            </div>
            <h2 className="text-base sm:text-xl font-black text-white mt-1">
              Real Impact: Verified Before &amp; After Resolutions
            </h2>
          </div>
          <p className="text-[11px] text-slate-400 max-w-sm">
            Sub-admins must reach the physical coordinates and capture a live matching photo to verify resolution.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Card 1: Streetlight Resolution */}
          <div className="border border-slate-800 rounded-3xl p-5 bg-slate-950/60 space-y-3.5 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-sky-400 bg-sky-500/10 px-2.5 py-1 rounded-lg border border-sky-500/20">
                  Street Lighting &bull; Kochi, Kerala
                </span>
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Resolved
                </span>
              </div>
              <h3 className="text-sm font-bold text-white">
                Venduruthy Bridge: Complete LED Illumination Restored
              </h3>
            </div>

            <div className="rounded-2xl overflow-hidden border border-slate-800 shadow-sm">
              <ComplaintImage
                src="/images/before_after1.jpeg"
                alt="Venduruthy Bridge Streetlight Before and After"
                heightClass="h-48 sm:h-52"
                onClick={() =>
                  setPreviewImage({
                    url: '/images/before_after1.jpeg',
                    title: 'Venduruthy Bridge, Cochin: Before & After Streetlight Illumination',
                    subtitle: 'Geotagged Hardware Proof | Verified by Cochin Municipal Corp',
                  })
                }
                topLeftBadge={
                  <span className="bg-slate-900/85 text-white text-[9px] font-bold px-2 py-0.5 rounded backdrop-blur-xs shadow">
                    BEFORE: Dark Bridge
                  </span>
                }
                bottomOverlay={
                  <div className="flex justify-end">
                    <span className="bg-emerald-600/90 text-white text-[9px] font-bold px-2 py-0.5 rounded backdrop-blur-xs flex items-center gap-1 shadow">
                      <CheckCircle2 className="w-3 h-3" />
                      AFTER: Full LED Lighting
                    </span>
                  </div>
                }
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
              <span className="flex items-center gap-1 text-sky-400">
                <MapPin className="w-3.5 h-3.5 text-sky-400" />
                <span>Geotagged Hardware Proof</span>
              </span>
              <span className="font-semibold text-slate-300">Verified by Cochin Municipal Corp</span>
            </div>
          </div>

          {/* Card 2: Electrical Hazard Resolution */}
          <div className="border border-slate-800 rounded-3xl p-5 bg-slate-950/60 space-y-3.5 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                  Public Safety &bull; Electrical Utility
                </span>
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Resolved
                </span>
              </div>
              <h3 className="text-sm font-bold text-white">
                Hazardous Leaning Utility Post Straightened &amp; Insulated
              </h3>
            </div>

            <div className="rounded-2xl overflow-hidden border border-slate-800 shadow-sm">
              <ComplaintImage
                src="/images/before_after2.jpeg"
                alt="Hazardous Leaning Utility Pole Before and After"
                heightClass="h-48 sm:h-52"
                onClick={() =>
                  setPreviewImage({
                    url: '/images/before_after2.jpeg',
                    title: 'Hazardous Leaning Utility Pole: Before & After Repair',
                    subtitle: 'Geotagged Hardware Proof | Public Safety Verification',
                  })
                }
                topLeftBadge={
                  <span className="bg-rose-600/90 text-white text-[9px] font-bold px-2 py-0.5 rounded backdrop-blur-xs shadow">
                    BEFORE: Leaning Danger
                  </span>
                }
                bottomOverlay={
                  <div className="flex justify-end">
                    <span className="bg-emerald-600/90 text-white text-[9px] font-bold px-2 py-0.5 rounded backdrop-blur-xs flex items-center gap-1 shadow">
                      <CheckCircle2 className="w-3 h-3" />
                      AFTER: Safely Replaced
                    </span>
                  </div>
                }
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
              <span className="flex items-center gap-1 text-emerald-400">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>On-Site Location Verified</span>
              </span>
              <span className="font-semibold text-slate-300">Verified by Electricity Board</span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Interactive Search & Filter Deck ─── */}
      <div className="bg-slate-900/80 backdrop-blur-md rounded-3xl p-5 border border-slate-800/80 shadow-lg space-y-4 overflow-hidden">
        {/* Row 1: Search Box */}
        <div className="relative w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title, PIN code, district name, or landmark..."
            className="w-full pl-11 pr-4 py-3 bg-slate-950/70 border border-slate-800 rounded-2xl text-xs text-white placeholder-slate-500 focus:bg-slate-950 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 focus:outline-none transition shadow-inner"
          />
        </div>

        {/* Row 2: Status Tabs & Sort Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full">
          {/* Status Segmented Control */}
          <div className="grid grid-cols-3 sm:flex gap-1 bg-slate-950/80 p-1 rounded-2xl w-full sm:w-auto border border-slate-800/80">
            {(['All', 'Active', 'Resolved'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`py-2 px-3 sm:px-4 rounded-xl text-xs font-bold transition text-center truncate ${
                  statusFilter === st
                    ? 'bg-gradient-to-r from-sky-600 to-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {st === 'Active' ? 'Active Issues' : st === 'Resolved' ? 'Resolved' : 'All Issues'}
              </button>
            ))}
          </div>

          {/* Sort Button */}
          <button
            onClick={() => setSortBy(sortBy === 'nearest' ? 'newest' : 'nearest')}
            className="w-full sm:w-auto px-4 py-2.5 bg-slate-950/80 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-bold rounded-2xl transition flex items-center justify-center gap-2 shrink-0 border border-slate-800"
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-sky-400" />
            <span>Sort: {sortBy === 'nearest' ? '📍 Nearest to Me' : '🕒 Newest First'}</span>
          </button>
        </div>

        {/* Category Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <span className="text-[11px] font-extrabold uppercase text-slate-400 shrink-0 mr-1 flex items-center gap-1">
            <SlidersHorizontal className="w-3 h-3 text-sky-400" />
            <span>Category:</span>
          </span>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition border ${
                categoryFilter === cat
                  ? 'bg-sky-600 text-white border-sky-500 shadow-sm'
                  : 'bg-slate-950/70 hover:bg-slate-800 text-slate-300 border-slate-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grievances Feed */}
      <div className="space-y-4">
        <div className="flex justify-between items-center text-xs text-slate-400">
          <div>
            Showing <strong className="text-white font-bold">{processedComplaints.length}</strong> of{' '}
            <strong className="text-white font-bold">{complaints.length}</strong> grievances
            {sortBy === 'nearest' && ' (ordered closest to your location)'}
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-400 space-y-2">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-sky-400" />
            <p className="text-xs">Loading public grievances across India...</p>
          </div>
        ) : processedComplaints.length === 0 ? (
          <div className="bg-slate-900/80 backdrop-blur-md rounded-3xl p-12 text-center border border-slate-800">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-white">No Complaints Found</h3>
            <p className="text-xs text-slate-400 mt-1">
              No grievances match your search criteria. Try removing filters or searching for another district/category.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {processedComplaints.map((item) => {
              const mainImg = item.images && item.images.length > 0 ? item.images[0].url : item.imageUrl;
              const hasResolvedImage = Boolean(item.resolvedImageUrl);

              return (
                <div
                  key={item._id}
                  className="bg-slate-900/80 backdrop-blur-md rounded-3xl border border-slate-800 shadow-lg overflow-hidden flex flex-col justify-between hover:border-slate-700 transition"
                >
                  <div>
                    {/* Photos Area: Before & (if resolved) After photo */}
                    <ComplaintImage
                      src={mainImg}
                      alt={item.title}
                      heightClass="h-56 sm:h-64"
                      onClick={() =>
                        setPreviewImage({
                          url: mainImg,
                          title: `Reported Issue: ${item.title}`,
                          subtitle: `Category: ${item.category} | PIN: ${item.pincode}`,
                        })
                      }
                      topRightBadge={
                        <span
                          className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase shadow ${
                            item.status === 'Resolved'
                              ? 'bg-emerald-500 text-white'
                              : item.status === 'In Progress'
                              ? 'bg-blue-600 text-white'
                              : item.status === 'Under Review'
                              ? 'bg-amber-500 text-white'
                              : 'bg-slate-700 text-white'
                          }`}
                        >
                          {item.status}
                        </span>
                      }
                      topLeftBadge={
                        <div className="flex flex-col gap-1 items-start">
                          {hasResolvedImage && (
                            <span className="px-2 py-0.5 rounded bg-rose-600/90 text-white text-[9px] font-bold shadow backdrop-blur-xs">
                              BEFORE: Reported Grievance
                            </span>
                          )}
                          {item.distanceMeters !== null && (
                            <div className="px-2.5 py-1 rounded-full bg-slate-900/85 backdrop-blur-md text-sky-400 text-[10px] font-bold flex items-center gap-1 shadow">
                              <MapPin className="w-3 h-3 text-sky-400" />
                              <span>{formatDistance(item.distanceMeters)}</span>
                            </div>
                          )}
                        </div>
                      }
                      bottomOverlay={
                        <div className="flex justify-between items-center text-[10px] font-mono font-bold text-white">
                          <span className="px-2 py-0.5 rounded-lg bg-slate-900/80 backdrop-blur-md">
                            PIN {item.pincode}
                          </span>
                          <span className="px-2 py-0.5 rounded-lg bg-blue-950/80 backdrop-blur-md text-blue-200">
                            {item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}
                          </span>
                        </div>
                      }
                    />

                    {/* Card Content */}
                    <div className="p-5 space-y-3">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-sky-400">{item.category}</span>
                        <span className="text-slate-400 text-[10px]">{new Date(item.createdAt).toLocaleDateString()}</span>
                      </div>

                      <h3 className="font-bold text-white text-base line-clamp-1">{item.title}</h3>
                      <p className="text-slate-300 text-xs leading-relaxed whitespace-pre-line break-words">{item.description}</p>

                      {/* Location Box */}
                      <div className="space-y-1 text-[11px] bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                        <div className="text-slate-200 font-semibold flex items-start gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />
                          <span className="line-clamp-2">{item.address || `District: ${item.district || 'N/A'}, PIN: ${item.pincode}`}</span>
                        </div>
                        <a
                          href={`https://www.google.com/maps?q=${item.latitude},${item.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sky-400 font-bold hover:text-sky-300 hover:underline pt-0.5 text-[10px]"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>View on Google Maps</span>
                        </a>
                      </div>

                      {/* Resolved Proof Box if available */}
                      {hasResolvedImage ? (
                        <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-2xl p-3.5 space-y-2.5 shadow-inner">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                              <span>Official Resolution Proof</span>
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                setPreviewImage({
                                  url: item.resolvedImageUrl!,
                                  title: `Official Resolution Proof: ${item.title}`,
                                  subtitle: `Resolved by ${item.assignedSubAdmin?.name || 'Municipal Officer'} | Category: ${item.category}`,
                                })
                              }
                              className="text-[10px] text-emerald-300 font-bold hover:underline flex items-center gap-1 bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/30"
                            >
                              <Eye className="w-3 h-3" />
                              <span>Enlarge Proof</span>
                            </button>
                          </div>
                          <div className="rounded-xl overflow-hidden border border-emerald-500/30 shadow-sm">
                            <ComplaintImage
                              src={item.resolvedImageUrl!}
                              alt={`Resolution proof for ${item.title}`}
                              heightClass="h-44 sm:h-48"
                              onClick={() =>
                                setPreviewImage({
                                  url: item.resolvedImageUrl!,
                                  title: `Official Resolution Proof: ${item.title}`,
                                  subtitle: `Resolved by ${item.assignedSubAdmin?.name || 'Municipal Officer'} | Category: ${item.category}`,
                                })
                              }
                              topLeftBadge={
                                <span className="bg-emerald-700/90 text-white text-[9px] font-bold px-2 py-0.5 rounded shadow">
                                  AFTER: Work Completed
                                </span>
                              }
                              bottomOverlay={
                                <div className="flex justify-between items-center text-[10px] font-mono text-white">
                                  <span className="bg-emerald-950/80 px-2 py-0.5 rounded backdrop-blur-xs">
                                    Verified On-Site
                                  </span>
                                  <span className="text-emerald-300 text-[9px] font-sans font-bold">
                                    Click to view full photo
                                  </span>
                                </div>
                              }
                            />
                          </div>
                          {item.resolutionNotes && (
                            <div className="p-2.5 bg-slate-950/80 rounded-xl border border-emerald-500/20 text-xs text-emerald-200">
                              <span className="font-bold text-emerald-400 text-[10px] uppercase block mb-0.5">Resolution Details:</span>
                              <p className="italic leading-relaxed text-[11px]">"{item.resolutionNotes}"</p>
                            </div>
                          )}
                        </div>
                      ) : item.status === 'Resolved' ? (
                        <div className="p-3 bg-emerald-950/30 rounded-xl border border-emerald-500/30 text-xs text-emerald-300 flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span className="font-semibold">Issue resolved and closed by municipal authorities.</span>
                        </div>
                      ) : null}

                      {/* Assigned Officer / Dept */}
                      {item.assignedSubAdmin && (
                        <div className="text-[11px] text-slate-400 bg-slate-950/60 px-3 py-2 rounded-xl flex items-center gap-1.5 border border-slate-800">
                          <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>
                            Assigned to: <strong className="text-slate-200">{item.assignedSubAdmin.name}</strong> ({item.assignedSubAdmin.department || 'Municipal Officer'})
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-5 pt-0">
                    <a
                      href={`https://www.google.com/maps?q=${item.latitude},${item.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2 bg-slate-950/80 hover:bg-slate-800 text-slate-300 hover:text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 border border-slate-800"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-sky-400" />
                      <span>Open Issue Location</span>
                    </a>
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
