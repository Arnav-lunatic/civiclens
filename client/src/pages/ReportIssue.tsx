import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, MapPin, Satellite, ShieldCheck, Trash2, Send, CheckCircle2, Activity, RefreshCw, AlertCircle, AlertTriangle, Loader2, Lock, Info } from 'lucide-react';
import { API } from '../services/api';
import { GeoService, FusedPosition } from '../services/geo';
import { CameraModal } from '../components/CameraModal';
import { OtpModal } from '../components/OtpModal';
import { MapView } from '../components/MapView';
import { ComplaintImage } from '../components/ComplaintImage';
import { ImageModal } from '../components/ImageModal';

interface PhotoItem {
  file: File;
  dataUrl: string;
  lat: number;
  lng: number;
}

export const ReportIssue: React.FC = () => {
  const navigate = useNavigate();
  const [user] = useState(API.getUser('citizen'));
  const [previewImage, setPreviewImage] = useState<{ url: string; title?: string; subtitle?: string } | null>(null);

  // Form states
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Roads & Potholes');
  const [priority, setPriority] = useState('Medium');

  // Real-Time Live Sensor Telemetry (Strict Hardware Sensor)
  const [liveLat, setLiveLat] = useState<number | null>(null);
  const [liveLng, setLiveLng] = useState<number | null>(null);
  const [accuracy, setAccuracy] = useState<number>(0);
  const [updateCount, setUpdateCount] = useState<number>(0);
  const [pincode, setPincode] = useState('');
  const [district, setDistrict] = useState('');
  const [address, setAddress] = useState('');
  const [landmark, setLandmark] = useState('');
  const [gpsDenied, setGpsDenied] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isLatPulsing, setIsLatPulsing] = useState(false);
  const [isLngPulsing, setIsLngPulsing] = useState(false);

  const prevLatRef = useRef<number | null>(null);
  const prevLngRef = useRef<number | null>(null);
  const watchIdRef = useRef<number | null>(null);

  // Photos, AI & Modals
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isOtpOpen, setIsOtpOpen] = useState(false);
  const [devOtp, setDevOtp] = useState<string | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);

  // Groq AI Vision States
  const [analyzingAi, setAnalyzingAi] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiSuccessBadge, setAiSuccessBadge] = useState<string | null>(null);
  const [isValidCivicIssue, setIsValidCivicIssue] = useState<boolean | null>(null);

  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    startGpsTracking();

    return () => {
      if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  const startGpsTracking = () => {
    setGpsLoading(true);
    setGpsDenied(false);
    setErrorMessage('');

    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    const { watchId } = GeoService.startLiveTracking(
      (pos: FusedPosition) => {
        handleNewPosition(pos.lat, pos.lng, pos.accuracy);
      },
      (err: GeolocationPositionError) => {
        console.warn('GPS hardware error:', err);
        setGpsLoading(false);
        if (err.code === 1) {
          setGpsDenied(true);
          setErrorMessage('Location permission denied. Please allow location access in your browser / Mac settings.');
        } else if (err.code === 2) {
          setErrorMessage('GPS position unavailable. Please ensure Wi-Fi or Location Services are enabled on your device.');
        } else if (err.code === 3) {
          setErrorMessage('GPS query timed out. Please click "Sync / Refresh GPS" to retry.');
        }
      }
    );

    watchIdRef.current = watchId;

    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    pollIntervalRef.current = setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          handleNewPosition(pos.coords.latitude, pos.coords.longitude, Math.round(pos.coords.accuracy || 5));
        },
        () => {},
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 10000 }
      );
    }, 3000);
  };

  const handleNewPosition = async (lat: number, lng: number, acc: number) => {
    if (prevLatRef.current !== null && prevLatRef.current !== lat) {
      setIsLatPulsing(true);
      setTimeout(() => setIsLatPulsing(false), 500);
    }
    if (prevLngRef.current !== null && prevLngRef.current !== lng) {
      setIsLngPulsing(true);
      setTimeout(() => setIsLngPulsing(false), 500);
    }

    prevLatRef.current = lat;
    prevLngRef.current = lng;

    setLiveLat(lat);
    setLiveLng(lng);
    setAccuracy(acc);
    setGpsLoading(false);
    setGpsDenied(false);
    setErrorMessage('');
    setUpdateCount((prev) => prev + 1);

    const geo = await GeoService.reverseGeocode(lat, lng);
    if (geo.pincode) setPincode(geo.pincode);
    if (geo.district) setDistrict(geo.district);
    if (geo.address) setAddress(geo.address);
    if (geo.landmark) setLandmark(geo.landmark);
  };

  const handlePhotoCaptured = async (file: File, dataUrl: string, lat: number, lng: number) => {
    // If the previous photo was invalid or rejected, replace it with the new one!
    setPhotos((prev) => (isValidCivicIssue === false ? [{ file, dataUrl, lat, lng }] : [...prev, { file, dataUrl, lat, lng }]));
    analyzePhotoWithGroq(file, dataUrl);
  };

  const analyzePhotoWithGroq = async (file: File, dataUrl: string) => {
    setAnalyzingAi(true);
    setAiError('');
    setAiSuccessBadge(null);

    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('imageBase64', dataUrl);

      const res = await API.request('/complaints/analyze-image', 'POST', formData, true);

      if (res.isValidCivicIssue === false) {
        setIsValidCivicIssue(false);
        setAiError(res.rejectionReason || 'Image does not depict a public civic infrastructure problem.');
        setTitle('');
        setDescription('');
      } else if (res.isValidCivicIssue === true) {
        setIsValidCivicIssue(true);
        if (res.title) setTitle(res.title);
        if (res.category) setCategory(res.category);
        if (res.priority) setPriority(res.priority);
        if (res.description) setDescription(res.description);

        if (res.isFallback) {
          setAiSuccessBadge('✨ Auto-filled civic grievance details for review (Editable below)');
        } else {
          setAiSuccessBadge(`✨ Auto-detected by Groq AI Vision: ${res.category} (Severity: ${res.priority})`);
        }
      } else {
        // AI returned unverified or API key missing
        setIsValidCivicIssue(null);
        if (res.missingApiKey) {
          setAiError(res.message || 'GROQ_API_KEY is not configured on server. Live AI verification is offline.');
        }
      }
    } catch (err: any) {
      console.warn('Groq AI Vision Error:', err);
      setIsValidCivicIssue(null);
      setAiError(err.message || 'AI vision service check could not be completed.');
    } finally {
      setAnalyzingAi(false);
    }
  };

  const handleRemovePhoto = (index: number) => {
    const updated = photos.filter((_, i) => i !== index);
    setPhotos(updated);
    if (updated.length === 0) {
      setIsValidCivicIssue(null);
      setAiError('');
      setAiSuccessBadge(null);
      setTitle('');
      setDescription('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (liveLat === null || liveLng === null) {
      alert('Strict Hardware GPS Location is mandatory! Please enable location access.');
      startGpsTracking();
      return;
    }

    if (photos.length === 0) {
      alert('Please capture at least one live camera photo.');
      return;
    }

    if (isValidCivicIssue === false) {
      alert('Image does not show any civic issue. Please capture or upload a clear photo of a public civic problem to submit.');
      return;
    }

    if (!user) {
      setSubmitting(true);
      try {
        const res = await API.request('/auth/send-otp', 'POST', { email, purpose: 'Grievance Submission' });
        if (res.devOtp) setDevOtp(res.devOtp);
        setIsOtpOpen(true);
      } catch (err: any) {
        alert(err.message || 'Failed to dispatch email OTP');
      } finally {
        setSubmitting(false);
      }
    } else {
      submitComplaintDirect();
    }
  };

  const submitComplaintDirect = async () => {
    setSubmitting(true);
    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', description);
    formData.append('category', category);
    formData.append('priority', priority);
    formData.append('pincode', pincode);
    formData.append('district', district);
    formData.append('address', address);
    formData.append('latitude', liveLat!.toString());
    formData.append('longitude', liveLng!.toString());

    photos.forEach((p) => formData.append('images', p.file));

    try {
      await API.request('/complaints', 'POST', formData, true);
      alert('Geotagged grievance lodged successfully!');
      navigate('/dashboard');
    } catch (err: any) {
      alert(err.message || 'Failed to submit grievance');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyOtp = async (otpCode: string) => {
    const formData = new FormData();
    formData.append('name', name);
    formData.append('email', email);
    formData.append('otp', otpCode);
    formData.append('title', title);
    formData.append('description', description);
    formData.append('category', category);
    formData.append('priority', priority);
    formData.append('pincode', pincode);
    formData.append('district', district);
    formData.append('address', address);
    formData.append('latitude', liveLat!.toString());
    formData.append('longitude', liveLng!.toString());

    photos.forEach((p) => formData.append('images', p.file));

    const res = await API.request('/complaints/submit-with-otp', 'POST', formData, true);
    API.setAuth(res.token, res.user, 'citizen');
    setIsOtpOpen(false);
    alert('Email verified & grievance lodged!');
    navigate('/dashboard');
  };

  const handleResendOtp = async () => {
    const res = await API.request('/auth/send-otp', 'POST', { email, purpose: 'Grievance Submission' });
    if (res.devOtp) setDevOtp(res.devOtp);
    alert('New OTP sent to email!');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8 text-slate-800">
      {/* ─── Step Indicator Progress Bar ─── */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-sm">
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="flex items-center justify-center gap-2 p-2 rounded-xl bg-sky-50 text-sky-700 font-bold border border-sky-200">
            <span className="w-5 h-5 rounded-full bg-sky-600 text-white text-[10px] flex items-center justify-center font-mono">1</span>
            <span className="hidden sm:inline">Hardware </span>GPS Lock
          </div>
          <div className={`flex items-center justify-center gap-2 p-2 rounded-xl font-bold transition ${
            photos.length > 0
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-slate-50 text-slate-400 border border-slate-200'
          }`}>
            <span className={`w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-mono ${
              photos.length > 0 ? 'bg-emerald-600 text-white' : 'bg-slate-300 text-slate-600'
            }`}>2</span>
            <span>Camera Proof</span>
          </div>
          <div className={`flex items-center justify-center gap-2 p-2 rounded-xl font-bold transition ${
            title && description && isValidCivicIssue
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-slate-50 text-slate-400 border border-slate-200'
          }`}>
            <span className={`w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-mono ${
              title && description && isValidCivicIssue ? 'bg-emerald-600 text-white' : 'bg-slate-300 text-slate-600'
            }`}>3</span>
            <span>Redressal</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-6 sm:p-10 shadow-sm border border-slate-200/90 space-y-8">
        {/* Header */}
        <div className="border-b border-slate-100 pb-6 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold mb-2 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              <span>Strict Hardware Sensor GPS &bull; Live Dynamic Stream</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Report a Civic Hazard</h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Coordinates and time are burned into photo canvas bytes via physical device sensors.
            </p>
          </div>
        </div>

        {/* Critical Civic Hazard Protocol Banner (img1.jpeg) */}
        <div className="bg-gradient-to-r from-amber-50 via-orange-50 to-rose-50 border border-amber-200 rounded-2xl p-4 sm:p-5 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            {/* Image Preview */}
            <div className="md:col-span-4 rounded-xl overflow-hidden border border-amber-200 shadow-sm">
              <ComplaintImage
                src="/images/img1.jpeg"
                alt="Critical civic emergency: massive fallen tree blocking roadway and powerlines"
                heightClass="h-36 sm:h-40"
                onClick={() =>
                  setPreviewImage({
                    url: '/images/img1.jpeg',
                    title: 'Critical Civic Emergency Protocol Example',
                    subtitle: 'Roadway blocked & powerline hazard example photo',
                  })
                }
                topLeftBadge={
                  <div className="bg-rose-600 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-md flex items-center gap-1 shadow">
                    <AlertTriangle className="w-3 h-3" />
                    <span>Urgent Road Hazard</span>
                  </div>
                }
              />
            </div>

            {/* Explanatory Guidance */}
            <div className="md:col-span-8 space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold text-amber-800 uppercase tracking-wide">
                  Critical Emergency Protocol &bull; 2-Hour SLA
                </span>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed">
                Reporting severe civic blockages like fallen trees, open manholes, or live snapped cables? Select <strong className="font-semibold text-rose-600">"High" Priority</strong> below. Your live hardware GPS coordinates instantly alert the municipal emergency disaster cell for rapid road clearance.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Citizen Details Card */}
          <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Citizen Details</span>
              {user ? (
                <span className="text-[11px] px-2.5 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Verified Citizen
                </span>
              ) : (
                <span className="text-[11px] px-2.5 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800 border border-amber-200">
                  Guest (Email OTP verification on submit)
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Aarav Sharma"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none transition shadow-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  readOnly={!!user}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="aarav@gmail.com"
                  className={`w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-sky-500 focus:outline-none transition shadow-sm ${
                    user ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-white focus:bg-white'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* ─── LIVE GPS TELEMETRY HUD ─── */}
          <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-xl border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                  </span>
                  <h3 className="text-sm font-extrabold uppercase tracking-wider text-white">
                    Step 1: Live Hardware GPS Sensor
                  </h3>
                </div>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  {gpsLoading && liveLat === null
                    ? 'Acquiring physical satellite telemetry fix...'
                    : `Live sensor telemetry connected &bull; Telemetry ping #${updateCount}`}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={startGpsTracking}
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-sm"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-sky-400 ${gpsLoading ? 'animate-spin' : ''}`} />
                  <span>Sync / Refresh GPS</span>
                </button>
              </div>
            </div>

            {/* GPS Error Alert */}
            {errorMessage && (
              <div className="p-4 bg-rose-950/80 border border-rose-800 rounded-2xl flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                <div className="flex items-center gap-2.5 text-xs text-rose-200 font-medium">
                  <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
                  <span>{errorMessage}</span>
                </div>
                <button
                  type="button"
                  onClick={startGpsTracking}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow transition whitespace-nowrap"
                >
                  Retry Sensor Connection
                </button>
              </div>
            )}

            {/* DIGITAL HUD COORDINATE READOUTS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Latitude Card */}
              <div className={`p-4 rounded-2xl border transition-all duration-300 ${
                isLatPulsing
                  ? 'bg-slate-800 border-sky-400 shadow-glow-sky'
                  : 'bg-slate-950/90 border-slate-800'
              }`}>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex justify-between">
                  <span>Current Latitude</span>
                  <span className="text-sky-400 font-mono text-[9px] font-bold">
                    {liveLat !== null ? (isLatPulsing ? '↑ UPDATING' : 'LIVE STREAMING') : 'SENSOR WAIT'}
                  </span>
                </div>
                <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-white mt-1 flex items-center gap-2">
                  {liveLat !== null ? (
                    liveLat.toFixed(6)
                  ) : (
                    <span className="text-sm font-sans text-slate-400 font-medium flex items-center gap-1.5">
                      <Loader2 className="w-4 h-4 animate-spin text-sky-400" />
                      <span>Reading Sensor...</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Longitude Card */}
              <div className={`p-4 rounded-2xl border transition-all duration-300 ${
                isLngPulsing
                  ? 'bg-slate-800 border-sky-400 shadow-glow-sky'
                  : 'bg-slate-950/90 border-slate-800'
              }`}>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex justify-between">
                  <span>Current Longitude</span>
                  <span className="text-sky-400 font-mono text-[9px] font-bold">
                    {liveLng !== null ? (isLngPulsing ? '↑ UPDATING' : 'LIVE STREAMING') : 'SENSOR WAIT'}
                  </span>
                </div>
                <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-white mt-1 flex items-center gap-2">
                  {liveLng !== null ? (
                    liveLng.toFixed(6)
                  ) : (
                    <span className="text-sm font-sans text-slate-400 font-medium flex items-center gap-1.5">
                      <Loader2 className="w-4 h-4 animate-spin text-sky-400" />
                      <span>Reading Sensor...</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Precision & Postal Area Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800 space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">GPS Precision</span>
                <span className="text-xs font-mono font-bold text-emerald-400 flex items-center gap-1">
                  <Activity className="w-3.5 h-3.5" />
                  <span>{liveLat !== null ? `±${accuracy} meters` : 'Acquiring...'}</span>
                </span>
              </div>

              <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800 space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">PIN Code</span>
                <span className="text-xs font-mono font-bold text-sky-400">
                  {pincode || 'Resolving PIN...'}
                </span>
              </div>

              <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800 space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">District / City</span>
                <span className="text-xs font-bold text-slate-200 truncate block">
                  {district || 'Resolving District...'}
                </span>
              </div>
            </div>

            {/* Read-Only Street Address */}
            <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800 space-y-1 text-xs">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">Street Landmark</span>
              <div className="text-slate-300 font-medium">
                {address || 'Resolving exact street address from live sensor GPS...'}
              </div>
            </div>

            {/* Live Map with Accuracy Radius */}
            {liveLat && liveLng ? (
              <MapView lat={liveLat} lng={liveLng} accuracy={accuracy} />
            ) : (
              <div className="h-44 rounded-2xl border border-dashed border-slate-800 bg-slate-950/50 flex flex-col items-center justify-center text-slate-400 text-xs space-y-2">
                <MapPin className="w-6 h-6 text-sky-400 animate-bounce" />
                <span>Map will render strictly when hardware sensor GPS connects</span>
              </div>
            )}
          </div>

          {/* ─── LIVE CAMERA & GROQ AI VISION CAPTURE ─── */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <div>
                <label className="block text-xs font-bold text-slate-900 uppercase">
                  Step 2: Live Camera Proof &amp; AI Analysis *
                </label>
                <p className="text-[11px] text-slate-500">
                  Captures on-site photo with hardware watermark and runs real-time Groq AI vision inspection.
                </p>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-sky-50 text-sky-700 border border-sky-200">
                {photos.length} / 5 Photos Taken
              </span>
            </div>

            <button
              type="button"
              disabled={liveLat === null || liveLng === null || photos.length >= 5}
              onClick={() => setIsCameraOpen(true)}
              className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-sky-600 hover:from-emerald-700 hover:to-sky-700 text-white font-bold text-sm shadow-md shadow-emerald-500/20 hover:shadow-lg transition flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Camera className="w-5 h-5" />
              <span>
                {liveLat === null ? 'GPS Sensor Required to Enable Camera' : 'Open Live Camera (Real-Time Watermark)'}
              </span>
            </button>

            {/* Photo Gallery */}
            {photos.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                {photos.map((p, idx) => (
                  <div key={idx} className="relative rounded-2xl overflow-hidden border border-slate-200 group">
                    <ComplaintImage
                      src={p.dataUrl}
                      alt={`Captured civic hazard proof ${idx + 1}`}
                      heightClass="h-40 sm:h-44"
                      onClick={() =>
                        setPreviewImage({
                          url: p.dataUrl,
                          title: `Captured Photo Evidence #${idx + 1}`,
                          subtitle: `Watermarked GPS: ${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}`,
                        })
                      }
                      topRightBadge={
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemovePhoto(idx);
                          }}
                          className="w-7 h-7 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow transition pointer-events-auto"
                          title="Remove photo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      }
                      bottomOverlay={
                        <div className="bg-slate-900/85 text-[10px] text-emerald-300 font-mono p-1 rounded backdrop-blur-xs truncate">
                          GPS: {p.lat.toFixed(5)}, {p.lng.toFixed(5)}
                        </div>
                      }
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Groq AI Vision Analysis Status Card */}
          {analyzingAi && (
            <div className="p-4 bg-sky-50 border border-sky-200 rounded-2xl flex items-center gap-3 text-sky-800 text-xs font-bold animate-pulse">
              <Loader2 className="w-5 h-5 animate-spin text-sky-600 flex-shrink-0" />
              <span>🤖 Groq AI Vision is analyzing photo for category, title & severity...</span>
            </div>
          )}

          {isValidCivicIssue === false && !analyzingAi && (
            <div className="p-5 bg-rose-50 border border-rose-200 rounded-2xl space-y-3 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center flex-shrink-0 shadow-sm mt-0.5 border border-rose-200">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-black text-sm text-rose-900 uppercase tracking-wide flex items-center gap-1.5">
                      <span>Invalid Image Detected</span>
                    </h4>
                    <span className="px-2.5 py-0.5 bg-rose-200 text-rose-800 text-[10px] font-black rounded-md uppercase border border-rose-300">
                      Rejected by AI
                    </span>
                  </div>
                  <p className="text-xs text-rose-800 font-semibold mt-1.5 leading-relaxed">
                    {aiError || 'Groq AI Vision system detected that this photo does not depict a public civic infrastructure problem.'}
                  </p>
                  <p className="text-[11px] text-rose-700 mt-1 font-medium">
                    ⚠️ <strong>Step 3 (Grievance Details)</strong> and submission are completely locked. Please retake or upload a photo of a valid civic issue to continue.
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-rose-200 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsCameraOpen(true)}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-sm"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Retake Photo with Camera</span>
                </button>
                {photos.length > 0 && (
                  <button
                    type="button"
                    onClick={() => handleRemovePhoto(photos.length - 1)}
                    className="px-4 py-2 bg-white hover:bg-slate-100 text-rose-700 border border-rose-300 text-xs font-bold rounded-xl transition flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Discard Rejected Photo</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {aiSuccessBadge && isValidCivicIssue === true && !analyzingAi && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2.5 text-emerald-800 text-xs font-bold shadow-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>{aiSuccessBadge}</span>
            </div>
          )}

          {/* ─── STEP 3: ISSUE DETAILS & REDRESSAL SPECIFICATION ─── */}
          <fieldset
            disabled={photos.length === 0 || isValidCivicIssue === false || analyzingAi}
            className={`space-y-6 transition-all duration-200 ${
              photos.length === 0 || isValidCivicIssue === false || analyzingAi
                ? 'opacity-40 cursor-not-allowed select-none pointer-events-none'
                : ''
            }`}
          >
            {photos.length === 0 && (
              <div className="p-3.5 bg-sky-50 border border-sky-200 rounded-xl flex items-center gap-2.5 text-sky-800 text-xs font-bold">
                <Info className="w-4 h-4 text-sky-600 flex-shrink-0" />
                <span>Step 3 Locked: Please capture a live photo of the civic issue in Step 2 above to unlock grievance details and trigger AI analysis.</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Step 3: Issue Title *</label>
              <input
                type="text"
                required
                disabled={photos.length === 0 || isValidCivicIssue === false || analyzingAi}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Hazardous open manhole & broken road"
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed shadow-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Category *</label>
                <select
                  disabled={photos.length === 0 || isValidCivicIssue === false || analyzingAi}
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed shadow-sm font-medium"
                >
                  <option value="Roads & Potholes">Roads & Potholes (PWD)</option>
                  <option value="Garbage & Sanitation">Garbage & Sanitation (Waste Board)</option>
                  <option value="Water Supply & Sewage">Water Supply & Sewage (Jal Board)</option>
                  <option value="Electricity & Streetlights">Electricity & Streetlights</option>
                  <option value="Public Infrastructure">Public Infrastructure</option>
                  <option value="Encroachment & Traffic">Encroachment & Traffic</option>
                  <option value="Other">Other Issues</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Severity / Priority</label>
                <select
                  disabled={photos.length === 0 || isValidCivicIssue === false || analyzingAi}
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed shadow-sm font-medium"
                >
                  <option value="Medium">Medium (Standard SLA)</option>
                  <option value="High">High (Urgent Redressal)</option>
                  <option value="Critical">Critical Emergency</option>
                  <option value="Low">Low</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Description *</label>
              <textarea
                rows={3}
                required
                disabled={photos.length === 0 || isValidCivicIssue === false || analyzingAi}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the civic hazard and exact landmark..."
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed shadow-sm resize-none"
              />
            </div>
          </fieldset>

          <button
            type="submit"
            disabled={submitting || analyzingAi || photos.length === 0 || isValidCivicIssue === false}
            className={`w-full py-4 rounded-2xl font-bold text-sm shadow-md transition flex items-center justify-center gap-2 ${
              isValidCivicIssue === false
                ? 'bg-rose-600 hover:bg-rose-600 text-white cursor-not-allowed opacity-90'
                : photos.length === 0
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
                : 'bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 text-white shadow-sky-500/25 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed'
            }`}
          >
            {isValidCivicIssue === false ? <Lock className="w-4 h-4" /> : <Send className="w-4 h-4" />}
            <span>
              {submitting
                ? 'Submitting Grievance...'
                : analyzingAi
                ? 'Groq AI Analyzing Photo...'
                : isValidCivicIssue === false
                ? 'Submission Locked (Invalid Civic Photo)'
                : photos.length === 0
                ? 'Capture Photo in Step 2 to Continue'
                : 'Submit Live Geotagged Grievance'}
            </span>
          </button>
        </form>
      </div>

      {/* Camera Modal */}
      <CameraModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapture={handlePhotoCaptured}
        currentLat={liveLat}
        currentLng={liveLng}
        pincode={pincode}
        address={address}
      />

      {/* OTP Modal */}
      <OtpModal
        isOpen={isOtpOpen}
        onClose={() => setIsOtpOpen(false)}
        email={email}
        devOtp={devOtp}
        onVerify={handleVerifyOtp}
        onResend={handleResendOtp}
      />

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
