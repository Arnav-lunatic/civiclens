import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, CheckCircle2, Shield, RefreshCw, PenSquare, MapPin, ExternalLink, Camera, Loader2, AlertTriangle, X } from 'lucide-react';
import { API } from '../services/api';
import { Complaint, User } from '../types';
import { ResolutionCameraModal } from '../components/ResolutionCameraModal';
import { fetchFallbackLocation } from '../services/geo';
import { ComplaintImage } from '../components/ComplaintImage';
import { ImageModal } from '../components/ImageModal';

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const user = API.getUser('subadmin') || API.getUser('superadmin');
  const role = API.getRole('subadmin') || API.getRole('superadmin');
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
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
    setLoading(true);
    setLoadError('');
    try {
      const res = await API.request('/complaints/subadmin', 'GET', null, false, { skipCache });
      setComplaints(res.complaints || []);
    } catch (err: any) {
      console.error('Failed to load complaints:', err);
      setLoadError(err.message || 'Failed to load complaints. Please try re-logging in.');
    } finally {
      setLoading(false);
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

  const handleVerifyLocation = () => {
    if (!selectedComplaint) return;
    setLocationCheckLoading(true);
    setLocationError('');
    setLocationVerified(false);
    setLocationDistance(null);

    const onLocationSuccess = (lat: number, lng: number) => {
      setSubadminLat(lat);
      setSubadminLng(lng);

      const distance = haversineDistance(lat, lng, selectedComplaint.latitude, selectedComplaint.longitude);
      setLocationDistance(Math.round(distance));

      if (distance <= MAX_DISTANCE) {
        setLocationVerified(true);
        setLocationError('');
      } else {
        setLocationVerified(false);
        const distStr = distance >= 1000 ? `${(distance / 1000).toFixed(1)} km` : `${Math.round(distance)}m`;
        setLocationError(`Location not matched. You are ${distStr} away. Reach the location to take photo.`);
      }
      setLocationCheckLoading(false);
    };

    const tryStandardAccuracy = () => {
      if (!navigator.geolocation) {
        tryIpFallback();
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (position) => {
          onLocationSuccess(position.coords.latitude, position.coords.longitude);
        },
        (error2) => {
          console.warn('Standard location query failed on laptop, attempting IP fallback:', error2);
          tryIpFallback(error2);
        },
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
      );
    };

    const tryIpFallback = async (originalErr?: any) => {
      try {
        const fallback = await fetchFallbackLocation();
        if (fallback) {
          onLocationSuccess(fallback.lat, fallback.lng);
          return;
        }
      } catch (e) {
        console.warn('IP fallback error:', e);
      }

      if (originalErr && originalErr.code === 1) {
        setLocationError('Location permission denied. Please allow location access in your browser / Mac settings.');
      } else {
        setLocationError('Unable to get your location. Please ensure Wi-Fi or Location Services are enabled on your device.');
      }
      setLocationCheckLoading(false);
    };

    if (!navigator.geolocation) {
      tryIpFallback();
      return;
    }

    // 1. Try High-Accuracy GPS (ideal for smartphones with GPS hardware)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        onLocationSuccess(position.coords.latitude, position.coords.longitude);
      },
      (error) => {
        console.warn('High-accuracy GPS query unavailable (common on laptops without GPS hardware). Falling back to network/Wi-Fi positioning:', error);
        tryStandardAccuracy();
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  };

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComplaint) return;
    setUpdating(true);

    const formData = new FormData();
    formData.append('status', newStatus);
    formData.append('resolutionNotes', resolutionNotes);
    if (resolutionPhotoFile) {
      formData.append('resolvedImage', resolutionPhotoFile);
      if (resolutionPhotoLat !== null) formData.append('resolutionLat', resolutionPhotoLat.toString());
      if (resolutionPhotoLng !== null) formData.append('resolutionLng', resolutionPhotoLng.toString());
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
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
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
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-slate-900">Update Grievance Status</h3>

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

            <form onSubmit={handleUpdateStatus} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">New Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="Under Review">Under Review</option>
                  <option value="In Progress">In Progress (Field Team Dispatched)</option>
                  <option value="Resolved">Resolved (Work Completed)</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Resolution Notes</label>
                <textarea
                  rows={3}
                  required
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Describe action taken, contractor assigned, or completion details..."
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* ─── Step 1: Verify Location ─── */}
              <div className="space-y-2.5 border border-slate-200 rounded-2xl p-4 bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">1</span>
                  <span className="text-xs font-bold text-slate-700 uppercase">Verify Your Location</span>
                </div>

                <p className="text-[11px] text-slate-500">
                  Issue Location: <strong className="text-slate-700">{selectedComplaint.latitude.toFixed(5)}, {selectedComplaint.longitude.toFixed(5)}</strong>
                </p>

                <button
                  type="button"
                  onClick={handleVerifyLocation}
                  disabled={locationCheckLoading}
                  className={`w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition shadow-sm ${
                    locationVerified
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  {locationCheckLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Acquiring GPS Location...</span>
                    </>
                  ) : locationVerified ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Location Verified! ({locationDistance}m away) — Re-verify</span>
                    </>
                  ) : (
                    <>
                      <MapPin className="w-3.5 h-3.5" />
                      <span>📍 Verify My Location</span>
                    </>
                  )}
                </button>

                {locationError && (
                  <div className="space-y-1.5 bg-red-50 border border-red-200 rounded-xl p-3">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                      <span className="text-[11px] text-red-700 font-semibold">{locationError}</span>
                    </div>
                    {subadminLat !== null && subadminLng !== null && (
                      <div className="text-[10px] text-red-600 pl-6 space-y-0.5 font-mono">
                        <div>Your Detected GPS: {subadminLat.toFixed(5)}, {subadminLng.toFixed(5)}</div>
                        <div>Complaint Issue GPS: {selectedComplaint.latitude.toFixed(5)}, {selectedComplaint.longitude.toFixed(5)}</div>
                      </div>
                    )}
                  </div>
                )}

                {locationVerified && (
                  <div className="flex items-start gap-2 bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <div className="text-[11px] text-emerald-700">
                      <span className="font-bold">Location verified!</span> You are <strong>{locationDistance}m</strong> from the issue location. You can now take the resolution photo.
                    </div>
                  </div>
                )}
              </div>

              {/* ─── Step 2: Take Resolution Photo ─── */}
              <div className={`space-y-2.5 border rounded-2xl p-4 ${locationVerified ? 'border-slate-200 bg-white' : 'border-slate-100 bg-slate-50/30 opacity-60'}`}>
                <div className="flex items-center gap-2">
                  <span className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center ${locationVerified ? 'bg-blue-600 text-white' : 'bg-slate-300 text-slate-500'}`}>2</span>
                  <span className="text-xs font-bold text-slate-700 uppercase">Take Resolution Photo</span>
                  {!locationVerified && (
                    <span className="text-[10px] text-slate-400 font-semibold ml-auto">🔒 Verify location first</span>
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
                      }}
                      className="absolute top-2 right-2 w-7 h-7 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow z-30"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={resetModal}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow transition"
                >
                  {updating ? 'Saving...' : 'Save & Publish Update'}
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
