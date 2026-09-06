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
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);

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
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);

  useEffect(() => {
    loadComplaints();
    detectLocation();
  }, []);

  const loadComplaints = async () => {
    setLoading(true);
    try {
      const res = await API.request('/complaints/public?limit=all');
      setComplaints(res.complaints || []);
    } catch (err: any) {
      console.error('Failed to load public complaints:', err);
    } finally {
      setLoading(false);
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
      {/* Top Hero Banner */}
      <div className="bg-slate-900 text-white rounded-2xl sm:rounded-3xl p-5 sm:p-8 shadow-xl flex flex-col md:flex-row justify-between md:items-center gap-5 sm:gap-6 overflow-hidden">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 text-sky-400 text-xs font-bold shadow-xs">
            <Globe className="w-4 h-4 text-sky-400" />
            <span>Public Civic Transparency &bull; All States & Districts</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Nationwide Public Grievance Feed
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-2xl font-normal leading-relaxed">
            Browse geotagged civic grievances reported by citizens across India. Issues closest to your location are shown first, with real-time before & after resolution tracking.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5 w-full sm:w-auto">
          <Link
            to="/report"
            className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 text-white text-xs font-bold rounded-xl shadow transition flex items-center justify-center gap-2"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>File New Issue</span>
          </Link>
          <button
            onClick={() => {
              loadComplaints();
              detectLocation();
            }}
            className="w-full sm:w-auto px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 border border-slate-700"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Feed</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <div className="bg-white p-3 sm:p-5 rounded-2xl border border-slate-200 shadow-sm text-center sm:text-left">
          <div className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase truncate">Total Issues</div>
          <div className="text-xl sm:text-3xl font-black text-slate-900 mt-0.5 sm:mt-1">{totalCount}</div>
        </div>
        <div className="bg-white p-3 sm:p-5 rounded-2xl border border-slate-200 shadow-sm text-center sm:text-left">
          <div className="text-[10px] sm:text-xs font-bold text-blue-600 uppercase truncate">Active Issues</div>
          <div className="text-xl sm:text-3xl font-black text-blue-600 mt-0.5 sm:mt-1">{activeCount}</div>
        </div>
        <div className="bg-white p-3 sm:p-5 rounded-2xl border border-slate-200 shadow-sm text-center sm:text-left">
          <div className="text-[10px] sm:text-xs font-bold text-emerald-600 uppercase truncate">Resolved</div>
          <div className="text-xl sm:text-3xl font-black text-emerald-600 mt-0.5 sm:mt-1">{resolvedCount}</div>
        </div>
      </div>

      {/* Verified Municipal Resolutions Spotlight (before_after1.jpeg & before_after2.jpeg) */}
      <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Verified On-Site Redressal Showcase</span>
            </div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 mt-1">
              Real Impact: Verified Before &amp; After Resolutions
            </h2>
          </div>
          <p className="text-[11px] text-slate-500 max-w-sm">
            Sub-admins must reach the physical coordinates and capture a live matching photo to verify resolution.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Card 1: Streetlight Resolution (Venduruthy Bridge, Cochin) */}
          <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 space-y-3 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-sky-700 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200">
                  Street Lighting &bull; Kochi, Kerala
                </span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Resolved
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-900">
                Venduruthy Bridge: Complete LED Illumination Restored
              </h3>
            </div>

            <div
              onClick={() =>
                setPreviewImage({
                  url: '/images/before_after1.jpeg',
                  title: 'Venduruthy Bridge, Cochin: Before & After Streetlight Illumination',
                })
              }
              className="relative rounded-xl overflow-hidden border border-slate-200 cursor-pointer group shadow-xs"
            >
              <img
                src="/images/before_after1.jpeg"
                alt="Venduruthy Bridge Streetlight Before and After"
                className="w-full h-44 sm:h-48 object-cover group-hover:scale-102 transition duration-300"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-slate-900/10 group-hover:bg-transparent transition"></div>
              <div className="absolute top-2 left-2 bg-slate-900/80 text-white text-[9px] font-bold px-2 py-0.5 rounded backdrop-blur-xs">
                BEFORE: Dark Bridge
              </div>
              <div className="absolute bottom-2 right-2 bg-emerald-600/90 text-white text-[9px] font-bold px-2 py-0.5 rounded backdrop-blur-xs flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                AFTER: Full LED Lighting
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-sky-600" />
                <span>Geotagged Hardware Proof</span>
              </span>
              <span className="font-semibold text-slate-700">Verified by Cochin Municipal Corp</span>
            </div>
          </div>

          {/* Card 2: Electrical Hazard Resolution (Utility Pole Replaced) */}
          <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 space-y-3 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                  Public Safety &bull; Electrical Utility
                </span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Resolved
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-900">
                Hazardous Leaning Utility Post Straightened &amp; Insulated
              </h3>
            </div>

            <div
              onClick={() =>
                setPreviewImage({
                  url: '/images/before_after2.jpeg',
                  title: 'Hazardous Leaning Utility Pole: Before & After Repair',
                })
              }
              className="relative rounded-xl overflow-hidden border border-slate-200 cursor-pointer group shadow-xs"
            >
              <img
                src="/images/before_after2.jpeg"
                alt="Hazardous Leaning Utility Pole Before and After"
                className="w-full h-44 sm:h-48 object-cover group-hover:scale-102 transition duration-300"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-slate-900/10 group-hover:bg-transparent transition"></div>
              <div className="absolute top-2 left-2 bg-rose-600/90 text-white text-[9px] font-bold px-2 py-0.5 rounded backdrop-blur-xs">
                BEFORE: Leaning Danger
              </div>
              <div className="absolute bottom-2 right-2 bg-emerald-600/90 text-white text-[9px] font-bold px-2 py-0.5 rounded backdrop-blur-xs flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                AFTER: Safely Replaced
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>On-Site Location Verified</span>
              </span>
              <span className="font-semibold text-slate-700">Verified by Electricity Board</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm space-y-3.5 overflow-hidden">
        {/* Row 1: Search Box */}
        <div className="relative w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title, pincode, district, or landmark..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
          />
        </div>

        {/* Row 2: Status Tabs & Sort Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 w-full">
          {/* Status Segmented Control (full-width on mobile, auto on desktop) */}
          <div className="grid grid-cols-3 sm:flex gap-1 bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
            {(['All', 'Active', 'Resolved'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`py-1.5 px-2 sm:px-3.5 rounded-lg text-xs font-bold transition text-center truncate ${
                  statusFilter === st
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {st === 'Active' ? 'Active' : st === 'Resolved' ? 'Resolved' : 'All Issues'}
              </button>
            ))}
          </div>

          {/* Sort Button (full-width on mobile, auto on desktop) */}
          <button
            onClick={() => setSortBy(sortBy === 'nearest' ? 'newest' : 'nearest')}
            className="w-full sm:w-auto px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 shrink-0"
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
            <span>Sort: {sortBy === 'nearest' ? 'Nearest First' : 'Newest First'}</span>
          </button>
        </div>

        {/* Category Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <span className="text-[11px] font-extrabold uppercase text-slate-400 shrink-0 mr-1 flex items-center gap-1">
            <SlidersHorizontal className="w-3 h-3" />
            <span>Category:</span>
          </span>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition border ${
                categoryFilter === cat
                  ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grievances Feed */}
      <div className="space-y-4">
        <div className="flex justify-between items-center text-xs text-slate-500">
          <div>
            Showing <strong className="text-slate-900 font-bold">{processedComplaints.length}</strong> of{' '}
            <strong className="text-slate-900 font-bold">{complaints.length}</strong> grievances
            {sortBy === 'nearest' && ' (ordered closest to your location)'}
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-400 space-y-2">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-sky-500" />
            <p className="text-xs">Loading public grievances across India...</p>
          </div>
        ) : processedComplaints.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-900">No Complaints Found</h3>
            <p className="text-xs text-slate-500 mt-1">
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
                  className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between hover:shadow-md transition"
                >
                  <div>
                    {/* Photos Area: Before & (if resolved) After photo */}
                    <div className="relative aspect-video bg-slate-100 group">
                      <img
                        src={mainImg}
                        alt={item.title}
                        className="w-full h-full object-cover cursor-pointer"
                        onClick={() => setPreviewImage({ url: mainImg, title: `Reported Issue: ${item.title}` })}
                      />

                      {/* Status Tag */}
                      <span
                        className={`absolute top-3 right-3 px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase shadow ${
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

                      {/* Distance Badge (Nearest highlighted) */}
                      {item.distanceMeters !== null && (
                        <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-slate-900/85 backdrop-blur-md text-sky-400 text-[10px] font-bold flex items-center gap-1 shadow">
                          <MapPin className="w-3 h-3 text-sky-400" />
                          <span>{formatDistance(item.distanceMeters)}</span>
                        </div>
                      )}

                      {/* Bottom Image Overlay: GPS + PIN */}
                      <div className="absolute bottom-2 left-2 right-2 flex justify-between items-center text-[10px] font-mono font-bold text-white">
                        <span className="px-2 py-0.5 rounded-lg bg-slate-900/80 backdrop-blur-md">
                          PIN {item.pincode}
                        </span>
                        <span className="px-2 py-0.5 rounded-lg bg-blue-950/80 backdrop-blur-md text-blue-200">
                          {item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}
                        </span>
                      </div>
                    </div>

                    {/* Card Content */}
                    <div className="p-5 space-y-3">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-blue-600">{item.category}</span>
                        <span className="text-slate-400 text-[10px]">{new Date(item.createdAt).toLocaleDateString()}</span>
                      </div>

                      <h3 className="font-bold text-slate-900 text-base line-clamp-1">{item.title}</h3>
                      <p className="text-slate-500 text-xs line-clamp-2 leading-relaxed">{item.description}</p>

                      {/* Location Box */}
                      <div className="space-y-1 text-[11px] bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <div className="text-slate-700 font-semibold flex items-start gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                          <span className="line-clamp-2">{item.address || `District: ${item.district || 'N/A'}, PIN: ${item.pincode}`}</span>
                        </div>
                        <a
                          href={`https://www.google.com/maps?q=${item.latitude},${item.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sky-600 font-bold hover:text-sky-700 hover:underline pt-0.5 text-[10px]"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>View on Google Maps</span>
                        </a>
                      </div>

                      {/* Resolved Proof Box if available */}
                      {hasResolvedImage && (
                        <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase text-emerald-800 flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Verified Resolution Proof</span>
                            </span>
                            <button
                              onClick={() => setPreviewImage({ url: item.resolvedImageUrl!, title: `Resolution Proof: ${item.title}` })}
                              className="text-[10px] text-emerald-700 font-bold hover:underline flex items-center gap-0.5"
                            >
                              <Eye className="w-3 h-3" />
                              <span>Enlarge</span>
                            </button>
                          </div>
                          <div
                            onClick={() => setPreviewImage({ url: item.resolvedImageUrl!, title: `Resolution Proof: ${item.title}` })}
                            className="relative aspect-video rounded-lg overflow-hidden cursor-pointer border border-emerald-300 shadow-2xs"
                          >
                            <img src={item.resolvedImageUrl} alt="Resolution proof" className="w-full h-full object-cover" />
                            <span className="absolute bottom-1 right-1 px-2 py-0.5 bg-emerald-900/85 text-emerald-100 text-[9px] font-bold rounded">
                              Work Completed
                            </span>
                          </div>
                          {item.resolutionNotes && (
                            <p className="text-[10px] text-emerald-900 italic line-clamp-2">
                              "{item.resolutionNotes}"
                            </p>
                          )}
                        </div>
                      )}

                      {/* Assigned Officer / Dept */}
                      {item.assignedSubAdmin && (
                        <div className="text-[11px] text-slate-500 bg-slate-50 px-3 py-2 rounded-xl flex items-center gap-1.5 border border-slate-100">
                          <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>
                            Assigned to: <strong className="text-slate-700">{item.assignedSubAdmin.name}</strong> ({item.assignedSubAdmin.department || 'Municipal Officer'})
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
                      className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Open Issue Location</span>
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Image Zoom Modal */}
      {previewImage && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl space-y-3 p-4 border border-slate-200">
            <div className="flex justify-between items-center px-2">
              <h3 className="text-xs font-bold text-slate-900 truncate">{previewImage.title}</h3>
              <button
                onClick={() => setPreviewImage(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="max-h-[75vh] overflow-hidden rounded-2xl bg-black flex items-center justify-center">
              <img src={previewImage.url} alt="Zoom preview" className="max-h-[75vh] w-auto object-contain" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
