import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, CheckCircle2, Shield, RefreshCw, PenSquare, MapPin, ExternalLink, Camera, Loader2, AlertTriangle, X, Bot, Sparkles, Lock, Unlock, Navigation } from 'lucide-react';
import { API } from '../services/api';
import { Complaint, User } from '../types';
import { ResolutionCameraModal } from '../components/ResolutionCameraModal';
import { ComplaintImage } from '../components/ComplaintImage';
import { ImageModal } from '../components/ImageModal';
import { AdminResolutionMap } from '../components/AdminResolutionMap';

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const user = API.getUser('subadmin') || API.getUser('superadmin');
  const role = API.getRole('subadmin') || API.getRole('superadmin');
  const [complaints, setComplaints] = useState<Complaint[]>(() => {
    try {
      const saved = sessionStorage.getItem('civiclens_cache_admin_complaints');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [loading, setLoading] = useState<boolean>(() => complaints.length === 0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [previewImage, setPreviewImage] = useState<{ url: string; title?: string; subtitle?: string } | null>(null);

  // Status update modal
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [newStatus, setNewStatus] = useState('In Progress');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [updating, setUpdating] = useState(false);

  // Location verification state
  const [locationVerified, setLocationVerified] = useState(false);
  const [locationCheckLoading, setLocationCheckLoading] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [locationDistance, setLocationDistance] = useState<number | null>(null);
  const [subadminLat, setSubadminLat] = useState<number | null>(null);
  const [subadminLng, setSubadminLng] = useState<number | null>(null);

  // Resolution camera state
  const [showResolutionCamera, setShowResolutionCamera] = useState(false);
  const [resolutionPhotoFile, setResolutionPhotoFile] = useState<File | null>(null);
  const [resolutionPhotoPreview, setResolutionPhotoPreview] = useState('');
  const [resolutionPhotoLat, setResolutionPhotoLat] = useState<number | null>(null);
  const [resolutionPhotoLng, setResolutionPhotoLng] = useState<number | null>(null);

  // Groq AI resolution verification state
  const [analyzingResolutionAi, setAnalyzingResolutionAi] = useState(false);
  const [aiResolutionResult, setAiResolutionResult] = useState<{
    isResolvedCorrectly: boolean | null;
    confidence?: string;
    resolutionStatus?: string;
    analysis?: string;
    rejectionReason?: string;
    isFallback?: boolean;
    missingApiKey?: boolean;
  } | null>(null);
  const [aiResolutionError, setAiResolutionError] = useState('');

  const [currentUser, setCurrentUser] = useState<User | null>(user);

  useEffect(() => {
    if (!user || (role !== 'subadmin' && role !== 'superadmin')) {
      navigate('/admin/login');
      return;
    }
    API.request('/auth/me')
      .then((res) => {
        if (res.user) {
          setCurrentUser(res.user);
          API.setAuth(API.getToken('subadmin') || '', res.user, 'subadmin');
        }
      })
      .catch(console.error);

    loadComplaints();
  }, []);

  const loadComplaints = async (skipCache = false) => {
    if (complaints.length === 0) {
      setLoading(true);
    } else {
      setIsRefreshing(true);
    }
    setLoadError('');
    try {
      const res = await API.request('/complaints/subadmin', 'GET', null, false, { skipCache });
      if (res.complaints) {
        setComplaints(res.complaints);
        try {
          sessionStorage.setItem('civiclens_cache_admin_complaints', JSON.stringify(res.complaints));
        } catch {}
      }
    } catch (err: any) {
      console.error('Failed to load complaints:', err);
      setLoadError(err.message || 'Failed to load complaints. Please try re-logging in.');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  // Haversine distance (meters) for client-side location check
  const haversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const R = 6371000;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const MAX_DISTANCE = 500; // meters

  const handleVerifyLocation = (targetComplaint?: Complaint) => {
    const comp = targetComplaint || selectedComplaint;
    if (!comp) return;
    setLocationCheckLoading(true);
    setLocationError('');
    setLocationVerified(false);
    setLocationDistance(null);

    const onLocationSuccess = (lat: number, lng: number) => {
      setSubadminLat(lat);
      setSubadminLng(lng);

      const distance = haversineDistance(lat, lng, comp.latitude, comp.longitude);
      const distMeters = Math.round(distance);
      setLocationDistance(distMeters);

      if (distMeters <= MAX_DISTANCE) {
        setLocationVerified(true);
        setLocationError('');
      } else {
        setLocationVerified(false);
        const distStr = distMeters >= 1000 ? `${(distMeters / 1000).toFixed(2)} km` : `${distMeters}m`;
        setLocationError(`GPS Mismatch: You are ${distStr} away from the grievance location (${comp.latitude.toFixed(5)}, ${comp.longitude.toFixed(5)}). All actions are locked until you are within 500m.`);
      }
      setLocationCheckLoading(false);
    };

    const onLocationFailure = (err: any) => {
      console.warn('[Admin GPS Sensor Error]:', err);
      let msg = 'Unable to acquire accurate GPS fix.';
      if (err?.code === 1) {
        msg = 'Location permission denied. Please enable location access in your browser and Mac/device settings (System Settings -> Privacy & Security -> Location Services).';
      } else if (err?.code === 2) {
        msg = 'GPS signal unavailable. Please ensure your device Location Services or Wi-Fi are active.';
      } else if (err?.code === 3) {
        msg = 'GPS request timed out. Click "Verify My GPS" to try again.';
      }
      setLocationError(msg);
      setLocationCheckLoading(false);
    };

    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser.');
      setLocationCheckLoading(false);
      return;
    }

    // Hardware GPS & Wi-Fi Triangulation (no IP fallback to prevent wrong city spoofing)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        onLocationSuccess(position.coords.latitude, position.coords.longitude);
      },
      (err1) => {
        console.warn('[High-accuracy GPS query timed out, trying standard sensor]:', err1);
        navigator.geolocation.getCurrentPosition(
          (position2) => {
            onLocationSuccess(position2.coords.latitude, position2.coords.longitude);
          },
          (err2) => {
            onLocationFailure(err2 || err1);
          },
          { enableHighAccuracy: false, timeout: 15000, maximumAge: 0 }
        );
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const analyzeResolutionWithAi = async (file: File, dataUrl: string) => {
    if (!selectedComplaint) return;
    setAnalyzingResolutionAi(true);
    setAiResolutionError('');
    setAiResolutionResult(null);

    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('imageBase64', dataUrl);
      formData.append('complaintId', selectedComplaint._id);
      formData.append('category', selectedComplaint.category);
      formData.append('title', selectedComplaint.title);
      formData.append('description', selectedComplaint.description);

      const res = await API.request('/complaints/analyze-resolution', 'POST', formData, true);
      if (res) {
        setAiResolutionResult({
          isResolvedCorrectly: res.isResolvedCorrectly,
          confidence: res.confidence || 'High',
          resolutionStatus: res.resolutionStatus || (res.isResolvedCorrectly ? 'Resolution Verified' : 'Issue Still Unresolved'),
          analysis: res.analysis || '',
          rejectionReason: res.rejectionReason || '',
          isFallback: res.isFallback,
          missingApiKey: res.missingApiKey,
        });
      }
    } catch (err: any) {
      console.warn('Groq AI Resolution Analysis Error:', err);
      setAiResolutionError(err.message || 'AI resolution verification check could not be completed.');
    } finally {
      setAnalyzingResolutionAi(false);
    }
  };

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComplaint) return;

    // 1. Strict GPS location matching requirement
    if (!locationVerified || subadminLat === null || subadminLng === null) {
      alert('⚠️ Strict on-site GPS verification is required. You must verify your location within 500m of the reported issue before saving and publishing updates.');
      return;
    }

    // 2. Strict Resolution proof photo requirement if resolving
    if (newStatus === 'Resolved') {
      if (!resolutionPhotoFile && !resolutionPhotoPreview) {
        alert('⚠️ A live on-site resolution proof photo is required to mark this grievance as Resolved.');
        return;
      }

      if (aiResolutionResult && aiResolutionResult.isResolvedCorrectly === false) {
        alert(`❌ Resolution proof was rejected by Groq AI:\n\n${aiResolutionResult.rejectionReason || 'The photo does not verify that the issue has been resolved.'}\n\nPlease take a valid photo of the completed repair work before saving.`);
        return;
      }
    }

    setUpdating(true);

    const formData = new FormData();
    formData.append('status', newStatus);
    formData.append('resolutionNotes', resolutionNotes);
    formData.append('adminLat', subadminLat.toString());
    formData.append('adminLng', subadminLng.toString());

    if (resolutionPhotoFile) {
      formData.append('resolvedImage', resolutionPhotoFile);
      formData.append('resolutionLat', (resolutionPhotoLat ?? subadminLat).toString());
      formData.append('resolutionLng', (resolutionPhotoLng ?? subadminLng).toString());
    }

    try {
      await API.request(`/complaints/${selectedComplaint._id}/status`, 'PUT', formData, true);
      alert('Grievance status updated successfully!');
      resetModal();
      loadComplaints();
    } catch (err: any) {
      alert(err.message || 'Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  const resetModal = () => {
    setSelectedComplaint(null);
    setLocationVerified(false);
    setLocationCheckLoading(false);
    setLocationError('');
    setLocationDistance(null);
    setSubadminLat(null);
    setSubadminLng(null);
    setShowResolutionCamera(false);
    setResolutionPhotoFile(null);
    setResolutionPhotoPreview('');
    setResolutionPhotoLat(null);
    setResolutionPhotoLng(null);
    setAnalyzingResolutionAi(false);
    setAiResolutionResult(null);
    setAiResolutionError('');
  };

  const [selectedDepartment, setSelectedDepartment] = useState<string>('All');

  const isAllDepartments = !user?.department || user.department === 'All Departments' || user.department === 'All';

  const DEPARTMENTS = [
    'All',
    'Roads & Potholes',
    'Garbage & Sanitation',
    'Water Supply & Sewage',
    'Electricity & Streetlights',
    'Public Infrastructure',
    'Encroachment & Traffic',
    'Other',
  ];

  const filteredComplaints = complaints.filter((c) => {
    if (selectedDepartment === 'All') return true;
    if (selectedDepartment === 'Other') {
      return !['Roads & Potholes', 'Garbage & Sanitation', 'Water Supply & Sewage', 'Electricity & Streetlights', 'Public Infrastructure', 'Encroachment & Traffic'].includes(c.category);
    }
    return c.category === selectedDepartment;
  });

  const total = complaints.length;
  const pending = complaints.filter((c) => c.status === 'Pending' || c.status === 'Under Review').length;
  const inProgress = complaints.filter((c) => c.status === 'In Progress').length;
  const resolved = complaints.filter((c) => c.status === 'Resolved').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Officer Scope Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between md:items-center gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-100 shadow-2xs">
            <Shield className="w-4 h-4 text-blue-600" />
            <span>{role === 'superadmin' ? 'State Governance Super Admin' : 'District Admin Console'}</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
              {role === 'superadmin' ? (currentUser?.name || 'State Central Admin') : (currentUser?.name === 'State Central Admin' ? 'District Admin' : (currentUser?.name || 'District Admin'))}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-bold text-[11px]">
              {role === 'superadmin' ? 'Super Admin' : 'District Admin'}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 pt-0.5">
            <div className="flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-blue-600" />
              <span>District: <strong className="text-slate-900 font-bold">{currentUser?.assignedDistrict || 'Central District'}</strong></span>
            </div>
            <span>&bull;</span>
            <div>
              <span>Department: <strong className="text-slate-900 font-bold">{currentUser?.department || 'General Administration'}</strong></span>
            </div>
            {currentUser?.officialId && (
              <>
                <span>&bull;</span>
                <div>
                  <span>Official ID: <strong className="text-slate-900 font-mono font-bold">{currentUser.officialId}</strong></span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Assigned Pincodes Badge Box */}
        <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200 space-y-2 md:min-w-[260px]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Assigned Pincodes:</span>
            <MapPin className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {currentUser?.assignedPincodes && currentUser.assignedPincodes.length > 0 ? (
              currentUser.assignedPincodes.map((p: string) => (
                <span key={p} className="px-2.5 py-1 bg-white border border-blue-200 rounded-lg text-xs font-mono font-bold text-blue-700 shadow-2xs">
                  PIN {p}
                </span>
              ))
            ) : (
              <span className="text-xs font-bold text-blue-700 bg-blue-100/60 px-3 py-1 rounded-lg">
                Statewide / All Pincodes
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {loadError && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3">
          <span className="text-red-600 font-bold text-sm">⚠️ {loadError}</span>
          <button onClick={() => loadComplaints(true)} className="ml-auto px-3 py-1 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700">
            Retry
          </button>
        </div>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs font-bold text-slate-500 uppercase">Assigned In District</div>
          <div className="text-3xl font-black text-slate-900 mt-1">{total}</div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs font-bold text-amber-600 uppercase">Action Required</div>
          <div className="text-3xl font-black text-amber-600 mt-1">{pending}</div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs font-bold text-blue-600 uppercase">In Progress</div>
          <div className="text-3xl font-black text-blue-600 mt-1">{inProgress}</div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs font-bold text-emerald-600 uppercase">Resolved & Closed</div>
          <div className="text-3xl font-black text-emerald-600 mt-1">{resolved}</div>
        </div>
      </div>

      {/* Section-Wise Department Summary Cards (Visible when managing All Departments or as Quick Overview) */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-sm">
        <div className="flex justify-between items-center">
          <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-600" />
            <span>Section-Wise Department Breakdown</span>
          </h2>
          <span className="text-xs text-slate-500">Click any department to filter feed</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {DEPARTMENTS.map((dept) => {
            const count = dept === 'All'
              ? complaints.length
              : complaints.filter((c) => {
                  if (dept === 'Other') {
                    return !['Roads & Potholes', 'Garbage & Sanitation', 'Water Supply & Sewage', 'Electricity & Streetlights', 'Public Infrastructure', 'Encroachment & Traffic'].includes(c.category);
                  }
                  return c.category === dept;
                }).length;

            const isSelected = selectedDepartment === dept;

            return (
              <button
                key={dept}
                onClick={() => setSelectedDepartment(dept)}
                className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between ${
                  isSelected
                    ? 'bg-blue-600 text-white border-blue-600 shadow-md scale-[1.02]'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                <span className={`text-[10px] font-bold truncate ${isSelected ? 'text-blue-100' : 'text-slate-500'}`}>
                  {dept}
                </span>
                <div className="flex items-baseline justify-between mt-2">
                  <span className={`text-xl font-black font-mono ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                    {count}
                  </span>
                  <span className={`text-[9px] font-bold uppercase ${isSelected ? 'text-blue-200' : 'text-slate-400'}`}>
                    issues
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Grievance Feed Header & Department Filter Bar */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              District Grievance Triage Feed
              {selectedDepartment !== 'All' && (
                <span className="ml-2 text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
                  {selectedDepartment} ({filteredComplaints.length})
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-500">
              Showing {filteredComplaints.length} of {complaints.length} assigned grievances
            </p>
          </div>
          <button
            onClick={() => loadComplaints(true)}
            className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1.5 self-start sm:self-auto transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${(loading || isRefreshing) ? 'animate-spin' : ''}`} />
            <span>Refresh List</span>
          </button>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-400 space-y-2">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-500" />
            <p className="text-xs">Fetching grievances from municipal database...</p>
          </div>
        ) : filteredComplaints.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-900">No Complaints Found</h3>
            <p className="text-xs text-slate-500 mt-1">
              {selectedDepartment === 'All'
                ? 'No pending civic complaints in your assigned district.'
                : `No complaints found for "${selectedDepartment}".`}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredComplaints.map((item) => {
              const mainImg = item.images && item.images.length > 0 ? item.images[0].url : item.imageUrl;

              return (
                <div key={item._id} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between hover:shadow-md transition">
                  <div>
                    <ComplaintImage
                      src={mainImg}
                      alt={item.title}
                      heightClass="h-56 sm:h-64"
                      onClick={() =>
                        setPreviewImage({
                          url: mainImg,
                          title: item.title,
                          subtitle: `Status: ${item.status} | Category: ${item.category} | District: ${item.district || 'N/A'} | PIN: ${item.pincode}`,
                        })
                      }
                      topRightBadge={
                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase shadow ${
                          item.status === 'Resolved' ? 'bg-emerald-500 text-white' :
                          item.status === 'In Progress' ? 'bg-blue-600 text-white' :
                          item.status === 'Under Review' ? 'bg-amber-500 text-white' : 'bg-slate-700 text-white'
                        }`}>
                          {item.status}
                        </span>
                      }
                      bottomOverlay={
                        <div className="flex gap-1.5 items-center">
                          <span className="px-2.5 py-1 rounded-lg bg-slate-900/80 backdrop-blur-md text-white text-[10px] font-mono font-bold">
                            PIN {item.pincode}
                          </span>
                          <span className="px-2.5 py-1 rounded-lg bg-blue-900/80 backdrop-blur-md text-blue-200 text-[10px] font-mono font-bold">
                            GPS: {item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}
                          </span>
                        </div>
                      }
                    />

                    <div className="p-5 space-y-3">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-blue-600">{item.category}</span>
                        <span className="text-slate-400 text-[10px]">{new Date(item.createdAt).toLocaleDateString()}</span>
                      </div>
                      <h3 className="font-bold text-slate-900 text-base line-clamp-1">{item.title}</h3>
                      <p className="text-slate-600 text-xs leading-relaxed whitespace-pre-line break-words">{item.description}</p>
                      <div className="space-y-1.5 text-[11px] bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <div className="text-slate-700 font-semibold flex items-start gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-blue-600 flex-shrink-0 mt-0.5" />
                          <span className="line-clamp-2">{item.address || `District: ${item.district || 'N/A'}, PIN: ${item.pincode}`}</span>
                        </div>
                        <a
                          href={`https://www.google.com/maps?q=${item.latitude},${item.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sky-600 font-bold hover:text-sky-700 hover:underline pt-0.5"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>View Location on Google Maps ({item.latitude.toFixed(5)}, {item.longitude.toFixed(5)})</span>
                        </a>
                      </div>
                      {item.citizen && (
                        <div className="text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                          Reported by: <strong className="text-slate-900">{item.citizen.name}</strong> ({item.citizen.phone || item.citizen.email})
                        </div>
                      )}
                      {item.resolvedImageUrl && (
                        <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase text-emerald-800 flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Resolution Proof Captured</span>
                            </span>
                            <span className="text-[10px] text-emerald-700 font-bold">Click to view</span>
                          </div>
                          <div className="rounded-xl overflow-hidden border border-emerald-300 shadow-2xs">
                            <ComplaintImage
                              src={item.resolvedImageUrl}
                              alt="Resolution proof"
                              heightClass="h-40 sm:h-44"
                              onClick={() =>
                                setPreviewImage({
                                  url: item.resolvedImageUrl!,
                                  title: `Official Resolution Proof: ${item.title}`,
                                  subtitle: `Status: ${item.status} | PIN: ${item.pincode}`,
                                })
                              }
                              bottomOverlay={
                                <div className="flex justify-end">
                                  <span className="px-2 py-0.5 bg-emerald-900/85 text-emerald-100 text-[9px] font-bold rounded">
                                    Work Completed
                                  </span>
                                </div>
                              }
                            />
                          </div>
                          {item.resolutionNotes && (
                            <p className="text-[10px] text-emerald-900 italic line-clamp-2">
                              "{item.resolutionNotes}"
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-5 pt-0">
                    <button
                      onClick={() => {
                        setSelectedComplaint(item);
                        setNewStatus(item.status);
                        setResolutionNotes(item.resolutionNotes || '');
                        setLocationVerified(false);
                        setLocationCheckLoading(false);
                        setLocationError('');
                        setLocationDistance(null);
                        setSubadminLat(null);
                        setSubadminLng(null);
                        setResolutionPhotoFile(null);
                        setResolutionPhotoPreview('');
                        setResolutionPhotoLat(null);
                        setResolutionPhotoLng(null);
                        setAnalyzingResolutionAi(false);
                        setAiResolutionResult(null);
                        setAiResolutionError('');
                        handleVerifyLocation(item);
                      }}
                      className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow transition flex items-center justify-center gap-1.5"
                    >
                      <PenSquare className="w-3.5 h-3.5" />
                      <span>Update Status & Resolution Proof</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Update Modal */}
      {selectedComplaint && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 max-w-xl w-full space-y-5 shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <PenSquare className="w-5 h-5 text-blue-600" />
                <span>Update Grievance Status</span>
              </h3>
              <button
                type="button"
                onClick={resetModal}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Real Issue Image & Grievance Context */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-blue-600">{selectedComplaint.category}</span>
                <span className="text-slate-400 text-[10px]">{new Date(selectedComplaint.createdAt).toLocaleDateString()}</span>
              </div>
              <h4 className="font-bold text-slate-900 text-sm">{selectedComplaint.title}</h4>
              <p className="text-slate-600 text-xs leading-relaxed whitespace-pre-line break-words">{selectedComplaint.description}</p>
              
              <div className="rounded-xl overflow-hidden border border-slate-200">
                <ComplaintImage
                  src={selectedComplaint.images && selectedComplaint.images.length > 0 ? selectedComplaint.images[0].url : selectedComplaint.imageUrl}
                  alt={selectedComplaint.title}
                  heightClass="h-44 sm:h-48"
                  onClick={() =>
                    setPreviewImage({
                      url: selectedComplaint.images && selectedComplaint.images.length > 0 ? selectedComplaint.images[0].url : selectedComplaint.imageUrl,
                      title: `Reported Grievance: ${selectedComplaint.title}`,
                      subtitle: `Reported by ${selectedComplaint.citizen?.name || 'Citizen'} | PIN: ${selectedComplaint.pincode}`,
                    })
                  }
                  bottomOverlay={
                    <div className="flex justify-between items-center text-[10px] font-mono font-bold text-white">
                      <span className="px-2 py-0.5 rounded-lg bg-slate-900/80 backdrop-blur-md">
                        PIN {selectedComplaint.pincode}
                      </span>
                      <span className="px-2 py-0.5 rounded-lg bg-blue-950/80 backdrop-blur-md text-blue-200">
                        {selectedComplaint.latitude.toFixed(4)}, {selectedComplaint.longitude.toFixed(4)}
                      </span>
                    </div>
                  }
                />
              </div>
            </div>

            {/* ─── Step 1: On-Site GPS & Map Verification ─── */}
            <div className="space-y-3 border border-slate-200 rounded-2xl p-4 bg-slate-50/70">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center ${locationVerified ? 'bg-emerald-600 text-white' : 'bg-blue-600 text-white'}`}>
                    1
                  </span>
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                    Live On-Site GPS Verification &amp; Map
                  </span>
                </div>
                {locationVerified ? (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold flex items-center gap-1 border border-emerald-300">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>Unlocked (On-Site)</span>
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold flex items-center gap-1 border border-rose-300">
                    <Lock className="w-3 h-3 text-rose-600" />
                    <span>Locked (Verify Location)</span>
                  </span>
                )}
              </div>

              {/* Live Interactive Map with Dual Locations */}
              <div className="space-y-1.5">
                <AdminResolutionMap
                  issueLat={selectedComplaint.latitude}
                  issueLng={selectedComplaint.longitude}
                  issueTitle={selectedComplaint.title}
                  adminLat={subadminLat}
                  adminLng={subadminLng}
                  distance={locationDistance}
                  isMatched={locationVerified}
                />
                <p className="text-[10px] text-slate-400 text-center">
                  Red Pin = Reported Grievance Location &bull; 500m allowable boundary circle &bull; Green/Blue Pin = Your Live Detected GPS
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleVerifyLocation()}
                disabled={locationCheckLoading}
                className={`w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition shadow-sm ${
                  locationVerified
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {locationCheckLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Acquiring Hardware GPS Location...</span>
                  </>
                ) : locationVerified ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>✅ Location Verified! ({locationDistance}m away) — Click to Re-check GPS</span>
                  </>
                ) : (
                  <>
                    <Navigation className="w-3.5 h-3.5" />
                    <span>📍 Verify / Refresh My Live GPS Location</span>
                  </>
                )}
              </button>

              {locationError && (
                <div className="space-y-1.5 bg-red-50 border border-red-300 rounded-xl p-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <span className="text-[11px] text-red-800 font-semibold">{locationError}</span>
                  </div>
                  {subadminLat !== null && subadminLng !== null && (
                    <div className="text-[10px] text-red-700 pl-6 space-y-0.5 font-mono">
                      <div>Your Detected GPS: {subadminLat.toFixed(5)}, {subadminLng.toFixed(5)}</div>
                      <div>Complaint Issue GPS: {selectedComplaint.latitude.toFixed(5)}, {selectedComplaint.longitude.toFixed(5)}</div>
                    </div>
                  )}
                </div>
              )}

              {locationVerified && (
                <div className="flex items-start gap-2 bg-emerald-50 border border-emerald-300 rounded-xl p-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="text-[11px] text-emerald-800">
                    <span className="font-bold">Location Matched!</span> You are <strong>{locationDistance}m</strong> from the issue site (within the 500m geofence). Resolution tools below are now <strong>unlocked</strong>.
                  </div>
                </div>
              )}
            </div>

            {/* Lock Notice if Location is not matched */}
            {!locationVerified && (
              <div className="bg-rose-50 border-2 border-rose-300 rounded-2xl p-4 flex items-start gap-3 shadow-xs">
                <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                  <Lock className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-black text-rose-900 uppercase tracking-wider flex items-center gap-1.5">
                    <span>All Resolution Actions Locked</span>
                  </div>
                  <p className="text-[11px] text-rose-700 leading-relaxed font-medium">
                    CivicLens strictly requires physical presence on-site. Because your detected location does not match the issue location (within 500m), modifying status, writing notes, capturing resolution proof, and publishing updates are completely disabled until you are on-site.
                  </p>
                </div>
              </div>
            )}

            <form onSubmit={handleUpdateStatus} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1 flex items-center justify-between">
                  <span>New Status</span>
                  {!locationVerified && <span className="text-[10px] text-rose-500 font-semibold flex items-center gap-1"><Lock className="w-3 h-3" /> Locked</span>}
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  disabled={!locationVerified}
                  className={`w-full px-4 py-2.5 border rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none transition ${
                    locationVerified
                      ? 'bg-slate-50 border-slate-200 focus:bg-white text-slate-900'
                      : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <option value="Under Review">Under Review</option>
                  <option value="In Progress">In Progress (Field Team Dispatched)</option>
                  <option value="Resolved">Resolved (Work Completed)</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1 flex items-center justify-between">
                  <span>Resolution Notes</span>
                  {!locationVerified && <span className="text-[10px] text-rose-500 font-semibold flex items-center gap-1"><Lock className="w-3 h-3" /> Locked</span>}
                </label>
                <textarea
                  rows={3}
                  required
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  disabled={!locationVerified}
                  placeholder={
                    locationVerified
                      ? 'Describe action taken, contractor assigned, or completion details...'
                      : '🔒 Locked: Verify location in Step 1 to enter resolution notes...'
                  }
                  className={`w-full px-4 py-2.5 border rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none transition ${
                    locationVerified
                      ? 'bg-slate-50 border-slate-200 focus:bg-white text-slate-900'
                      : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                />
              </div>

              {/* ─── Step 2: Take Resolution Photo ─── */}
              <div className={`space-y-3 border rounded-2xl p-4 transition ${locationVerified ? 'border-slate-200 bg-white' : 'border-slate-200 bg-slate-50/50 opacity-60'}`}>
                <div className="flex items-center gap-2">
                  <span className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center ${locationVerified ? 'bg-blue-600 text-white' : 'bg-slate-300 text-slate-500'}`}>
                    2
                  </span>
                  <span className="text-xs font-bold text-slate-700 uppercase">
                    Take Resolution Photo {newStatus === 'Resolved' && <span className="text-red-500">* (Mandatory for Resolution)</span>}
                  </span>
                  {!locationVerified && (
                    <span className="text-[10px] text-rose-500 font-semibold ml-auto flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Locked (Verify location first)
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setShowResolutionCamera(true)}
                  disabled={!locationVerified}
                  className={`w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition shadow-sm ${
                    locationVerified
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>{resolutionPhotoFile ? '📸 Retake Live Photo' : '📸 Take Live Photo'}</span>
                </button>

                {resolutionPhotoPreview && (
                  <div className="space-y-2.5 pt-1">
                    <div className="relative rounded-xl overflow-hidden border border-slate-200 shadow-sm">
                      <ComplaintImage
                        src={resolutionPhotoPreview}
                        alt="Resolution proof"
                        heightClass="h-48"
                        onClick={() =>
                          setPreviewImage({
                            url: resolutionPhotoPreview,
                            title: 'Resolution Proof Captured',
                            subtitle: `GPS: ${resolutionPhotoLat?.toFixed(5)}, ${resolutionPhotoLng?.toFixed(5)} | ${new Date().toLocaleString('en-IN')}`,
                          })
                        }
                        bottomOverlay={
                          <div className="bg-black/75 backdrop-blur-sm p-1.5 rounded text-[10px] text-white font-mono flex justify-between items-center">
                            <span>GPS: {resolutionPhotoLat?.toFixed(5)}, {resolutionPhotoLng?.toFixed(5)}</span>
                            <span>{new Date().toLocaleTimeString('en-IN')}</span>
                          </div>
                        }
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setResolutionPhotoFile(null);
                          setResolutionPhotoPreview('');
                          setResolutionPhotoLat(null);
                          setResolutionPhotoLng(null);
                          setAiResolutionResult(null);
                          setAiResolutionError('');
                        }}
                        className="absolute top-2 right-2 w-7 h-7 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow z-30"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Groq AI Vision Resolution Audit Feedback */}
                    {analyzingResolutionAi && (
                      <div className="bg-gradient-to-r from-purple-50 via-sky-50 to-indigo-50 border border-purple-200 rounded-xl p-3 flex items-center gap-2.5 text-xs text-purple-900 shadow-xs animate-pulse">
                        <Loader2 className="w-4 h-4 animate-spin text-purple-600 shrink-0" />
                        <div className="flex-1">
                          <div className="font-bold flex items-center gap-1.5 text-purple-800">
                            <Bot className="w-4 h-4 text-purple-600" />
                            <span>Groq AI Vision is auditing resolution proof...</span>
                          </div>
                          <p className="text-[10px] text-purple-600 font-normal">
                            Analyzing image to verify work completion against "{selectedComplaint.title}"
                          </p>
                        </div>
                      </div>
                    )}

                    {!analyzingResolutionAi && aiResolutionResult && (
                      <div
                        className={`p-3.5 rounded-xl border space-y-1.5 shadow-2xs ${
                          aiResolutionResult.isResolvedCorrectly
                            ? 'bg-emerald-50/90 border-emerald-300 text-emerald-900'
                            : 'bg-red-50 border-red-300 text-red-900'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 font-bold text-xs">
                            {aiResolutionResult.isResolvedCorrectly ? (
                              <>
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                <span className="text-emerald-800">Groq AI Verified: {aiResolutionResult.resolutionStatus || 'Resolution Confirmed'}</span>
                              </>
                            ) : (
                              <>
                                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                                <span className="text-red-800">Groq AI Rejected: {aiResolutionResult.resolutionStatus || 'Work Incomplete / Invalid'}</span>
                              </>
                            )}
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              aiResolutionResult.isResolvedCorrectly
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            Confidence: {aiResolutionResult.confidence || 'High'}
                          </span>
                        </div>

                        {aiResolutionResult.analysis && (
                          <p className="text-[11px] leading-relaxed">
                            {aiResolutionResult.analysis}
                          </p>
                        )}

                        {!aiResolutionResult.isResolvedCorrectly && aiResolutionResult.rejectionReason && (
                          <p className="text-[11px] font-bold text-red-700 bg-red-100/70 p-2 rounded-lg border border-red-200">
                            ⚠️ {aiResolutionResult.rejectionReason}
                          </p>
                        )}

                        <div className="flex justify-end pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              if (resolutionPhotoFile && resolutionPhotoPreview) {
                                analyzeResolutionWithAi(resolutionPhotoFile, resolutionPhotoPreview);
                              }
                            }}
                            className="text-[10px] font-bold text-slate-600 hover:text-slate-900 underline flex items-center gap-1"
                          >
                            <Sparkles className="w-3 h-3 text-purple-500" />
                            <span>Re-run Groq AI Audit</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {!analyzingResolutionAi && aiResolutionError && (
                      <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>{aiResolutionError}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Requirement Helper Banner */}
              {!locationVerified ? (
                <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-xs text-rose-800 flex items-center gap-2 font-medium">
                  <Lock className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>GPS verification required: Verify your location in Step 1 within 500m of the issue to unlock updating &amp; saving.</span>
                </div>
              ) : newStatus === 'Resolved' && !resolutionPhotoPreview ? (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-2 font-medium">
                  <Camera className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Resolution photo required: Take a live photo (Step 2) to mark this issue as Resolved.</span>
                </div>
              ) : newStatus === 'Resolved' && aiResolutionResult?.isResolvedCorrectly === false ? (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-center gap-2 font-semibold">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>Resolution proof rejected by AI. Please retake a photo showing the completed repair work.</span>
                </div>
              ) : (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2 font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>On-site GPS matched ({locationDistance}m). Ready to save and publish update.</span>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={resetModal}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    updating ||
                    !locationVerified ||
                    analyzingResolutionAi ||
                    (newStatus === 'Resolved' && (!resolutionPhotoPreview || aiResolutionResult?.isResolvedCorrectly === false))
                  }
                  className={`px-6 py-2.5 font-bold text-xs rounded-xl shadow transition flex items-center gap-2 ${
                    !locationVerified ||
                    updating ||
                    analyzingResolutionAi ||
                    (newStatus === 'Resolved' && (!resolutionPhotoPreview || aiResolutionResult?.isResolvedCorrectly === false))
                      ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                      : 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'
                  }`}
                >
                  {updating ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving Update...</span>
                    </>
                  ) : !locationVerified ? (
                    <>
                      <Lock className="w-3.5 h-3.5" />
                      <span>Locked (Out of Range)</span>
                    </>
                  ) : (
                    <span>Save &amp; Publish Update</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Resolution Camera Modal */}
      {selectedComplaint && subadminLat !== null && subadminLng !== null && (
        <ResolutionCameraModal
          isOpen={showResolutionCamera}
          onClose={() => setShowResolutionCamera(false)}
          onCapture={(file, dataUrl, lat, lng) => {
            setResolutionPhotoFile(file);
            setResolutionPhotoPreview(dataUrl);
            setResolutionPhotoLat(lat);
            setResolutionPhotoLng(lng);
            analyzeResolutionWithAi(file, dataUrl);
          }}
          currentLat={subadminLat}
          currentLng={subadminLng}
          complaintLat={selectedComplaint.latitude}
          complaintLng={selectedComplaint.longitude}
        />
      )}

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
