import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  UserPlus,
  Users,
  Building,
  Activity,
  RefreshCw,
  Edit3,
  Trash2,
  Mail,
  Send,
  ExternalLink,
  MapPin,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Building2,
  Search,
  SlidersHorizontal,
  Eye,
  X,
  Map,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  Filter,
} from 'lucide-react';
import { API } from '../services/api';
import { User, Complaint } from '../types';
import { ComplaintImage } from '../components/ComplaintImage';
import { ImageModal } from '../components/ImageModal';

export const SuperAdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const user = API.getUser('superadmin');
  const role = API.getRole('superadmin');
  const [subAdmins, setSubAdmins] = useState<User[]>(() => {
    try {
      const saved = sessionStorage.getItem('civiclens_cache_super_subadmins');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [stats, setStats] = useState<any>(() => {
    try {
      const saved = sessionStorage.getItem('civiclens_cache_super_stats');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [complaints, setComplaints] = useState<Complaint[]>(() => {
    try {
      const saved = sessionStorage.getItem('civiclens_cache_super_complaints');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [loading, setLoading] = useState<boolean>(() => complaints.length === 0 && subAdmins.length === 0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // View switch: 'districts' (filter & view specific district) vs 'officers' (all registered officers list)
  const [activeTab, setActiveTab] = useState<'districts' | 'officers'>('districts');
  const [officerSearch, setOfficerSearch] = useState<string>('');

  // District oversight state
  const [selectedDistrict, setSelectedDistrict] = useState<string>('All');
  const [complaintStatusFilter, setComplaintStatusFilter] = useState<string>('All');
  const [complaintSearch, setComplaintSearch] = useState<string>('');
  const [previewImage, setPreviewImage] = useState<{ url: string; title?: string; subtitle?: string } | null>(null);

  // New subadmin modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState('All Departments');
  const [assignedDistrict, setAssignedDistrict] = useState('');
  const [assignedPincodes, setAssignedPincodes] = useState('');
  const [creating, setCreating] = useState(false);

  // Edit subadmin modal
  const [editingAdmin, setEditingAdmin] = useState<User | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editDepartment, setEditDepartment] = useState('All Departments');
  const [editDistrict, setEditDistrict] = useState('');
  const [editPincodes, setEditPincodes] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [updating, setUpdating] = useState(false);

  // Mail credentials modal
  const [emailingAdmin, setEmailingAdmin] = useState<User | null>(null);
  const [mailPassword, setMailPassword] = useState('');
  const [sendingMail, setSendingMail] = useState(false);

  useEffect(() => {
    if (!user || role !== 'superadmin') {
      navigate('/superadmin/login');
      return;
    }
    loadData();
  }, []);

  const loadData = async (skipCache = false) => {
    if (complaints.length === 0 && subAdmins.length === 0) {
      setLoading(true);
    } else {
      setIsRefreshing(true);
    }
    try {
      const [adminRes, statRes, compRes] = await Promise.all([
        API.request('/admin/subadmins', 'GET', null, false, { skipCache }),
        API.request('/admin/stats', 'GET', null, false, { skipCache }),
        API.request('/complaints/superadmin', 'GET', null, false, { skipCache }),
      ]);
      if (adminRes.subAdmins) {
        setSubAdmins(adminRes.subAdmins);
        try { sessionStorage.setItem('civiclens_cache_super_subadmins', JSON.stringify(adminRes.subAdmins)); } catch {}
      }
      if (statRes.stats) {
        setStats(statRes.stats);
        try { sessionStorage.setItem('civiclens_cache_super_stats', JSON.stringify(statRes.stats)); } catch {}
      }
      if (compRes.complaints) {
        setComplaints(compRes.complaints);
        try { sessionStorage.setItem('civiclens_cache_super_complaints', JSON.stringify(compRes.complaints)); } catch {}
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  // Group complaints by District with comprehensive metrics
  interface DistrictGroup {
    name: string;
    total: number;
    resolved: number;
    inProgress: number;
    pending: number;
    rejected: number;
    resolutionRate?: string;
    officers: string[];
  }

  const districtGroups: DistrictGroup[] = useMemo(() => {
    const map: Record<string, DistrictGroup> = {};

    // 1. Seed districts from registered officers
    subAdmins.forEach((admin) => {
      const dist = (admin.assignedDistrict || '').trim();
      if (dist && dist !== 'All' && dist !== 'State Jurisdiction') {
        if (!map[dist]) {
          map[dist] = {
            name: dist,
            total: 0,
            resolved: 0,
            inProgress: 0,
            pending: 0,
            rejected: 0,
            officers: [admin.name],
          };
        } else {
          if (!map[dist].officers.includes(admin.name)) {
            map[dist].officers.push(admin.name);
          }
        }
      }
    });

    // 2. Aggregate complaints per district
    complaints.forEach((comp) => {
      const dist = (comp.district || (comp as any).assignedSubAdmin?.assignedDistrict || 'Central / Unassigned').trim();
      if (!map[dist]) {
        map[dist] = {
          name: dist,
          total: 0,
          resolved: 0,
          inProgress: 0,
          pending: 0,
          rejected: 0,
          officers: [],
        };
      }
      map[dist].total += 1;
      if (comp.status === 'Resolved') map[dist].resolved += 1;
      else if (comp.status === 'In Progress') map[dist].inProgress += 1;
      else if (comp.status === 'Rejected') map[dist].rejected += 1;
      else map[dist].pending += 1;
    });

    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [complaints, subAdmins]);

  // Filtered sub-admins for the Registered Officers tab
  const filteredSubAdmins = useMemo(() => {
    if (!officerSearch.trim()) return subAdmins;
    const q = officerSearch.toLowerCase();
    return subAdmins.filter(
      (admin) =>
        admin.name?.toLowerCase().includes(q) ||
        admin.email?.toLowerCase().includes(q) ||
        admin.department?.toLowerCase().includes(q) ||
        admin.assignedDistrict?.toLowerCase().includes(q) ||
        admin.assignedPincodes?.some((pin) => pin.toLowerCase().includes(q))
    );
  }, [subAdmins, officerSearch]);

  // Alphabetically sorted district groups for clean dropdown selection
  const sortedDistrictOptions = useMemo(() => {
    return [...districtGroups].sort((a, b) => a.name.localeCompare(b.name));
  }, [districtGroups]);

  // Filtered complaints for the active selected district
  const displayedComplaints = useMemo(() => {
    return complaints.filter((c) => {
      // District match
      if (selectedDistrict !== 'All') {
        const dist = (c.district || (c as any).assignedSubAdmin?.assignedDistrict || 'Central / Unassigned').trim();
        if (dist.toLowerCase() !== selectedDistrict.toLowerCase()) {
          return false;
        }
      }

      // Status filter
      if (complaintStatusFilter === 'Active') {
        if (c.status === 'Resolved' || c.status === 'Rejected') return false;
      } else if (complaintStatusFilter !== 'All') {
        if (c.status !== complaintStatusFilter) return false;
      }

      // Search filter
      if (complaintSearch.trim()) {
        const q = complaintSearch.toLowerCase();
        const matchTitle = c.title?.toLowerCase().includes(q);
        const matchDesc = c.description?.toLowerCase().includes(q);
        const matchPin = c.pincode?.includes(q);
        const matchCat = c.category?.toLowerCase().includes(q);
        const matchCit = (c as any).citizen?.name?.toLowerCase().includes(q);
        const matchOff = (c as any).assignedSubAdmin?.name?.toLowerCase().includes(q);
        if (!matchTitle && !matchDesc && !matchPin && !matchCat && !matchCit && !matchOff) {
          return false;
        }
      }

      return true;
    });
  }, [complaints, selectedDistrict, complaintStatusFilter, complaintSearch]);

  // Selected district metrics
  const selectedDistrictMeta: DistrictGroup = useMemo(() => {
    if (selectedDistrict === 'All') {
      const total = complaints.length;
      const resolved = complaints.filter((c) => c.status === 'Resolved').length;
      const inProgress = complaints.filter((c) => c.status === 'In Progress').length;
      const pending = complaints.filter((c) => c.status === 'Pending' || c.status === 'Under Review').length;
      return {
        name: 'All Statewide Districts',
        total,
        resolved,
        inProgress,
        pending,
        rejected: complaints.filter((c) => c.status === 'Rejected').length,
        resolutionRate: total > 0 ? `${Math.round((resolved / total) * 100)}%` : '0%',
        officers: subAdmins.map((a) => a.name),
      };
    }
    const found = districtGroups.find((g) => g.name.toLowerCase() === selectedDistrict.toLowerCase());
    if (found) {
      return {
        ...found,
        resolutionRate: found.total > 0 ? `${Math.round((found.resolved / found.total) * 100)}%` : '0%',
        officers: found.officers || [],
      };
    }
    return {
      name: selectedDistrict,
      total: 0,
      resolved: 0,
      inProgress: 0,
      pending: 0,
      rejected: 0,
      resolutionRate: '0%',
      officers: [],
    };
  }, [selectedDistrict, complaints, districtGroups, subAdmins]);

  const handleCreateSubAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      const res = await API.request('/admin/subadmins', 'POST', {
        name,
        email,
        password,
        phone,
        department,
        assignedDistrict,
        assignedPincodes,
      });
      alert(res.message || `District Sub-Admin ${name} registered successfully & credentials email dispatched to ${email}!`);
      setIsModalOpen(false);
      setName('');
      setEmail('');
      setPassword('');
      setAssignedPincodes('');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to create sub-admin');
    } finally {
      setCreating(false);
    }
  };

  const openEditModal = (admin: User) => {
    setEditingAdmin(admin);
    setEditName(admin.name || '');
    setEditEmail(admin.email || '');
    setEditPhone(admin.phone || '');
    setEditDepartment(admin.department || 'All Departments');
    setEditDistrict(admin.assignedDistrict || '');
    setEditPincodes(admin.assignedPincodes ? admin.assignedPincodes.join(', ') : '');
    setEditPassword('');
  };

  const handleUpdateSubAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAdmin) return;
    setUpdating(true);

    try {
      const adminId = editingAdmin._id || editingAdmin.id;
      await API.request(`/admin/subadmins/${adminId}`, 'PUT', {
        name: editName,
        email: editEmail,
        phone: editPhone,
        department: editDepartment,
        assignedDistrict: editDistrict,
        assignedPincodes: editPincodes,
        ...(editPassword ? { password: editPassword } : {}),
      });
      alert('Sub-Admin details updated successfully!');
      setEditingAdmin(null);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to update sub-admin');
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteSubAdmin = async (admin: User) => {
    const adminId = admin._id || admin.id;
    if (!window.confirm(`Are you sure you want to delete sub-admin ${admin.name}?`)) return;

    try {
      await API.request(`/admin/subadmins/${adminId}`, 'DELETE');
      alert(`Officer ${admin.name} deleted.`);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete sub-admin');
    }
  };

  const handleSendCredentialsEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailingAdmin) return;
    setSendingMail(true);

    try {
      const adminId = emailingAdmin._id || emailingAdmin.id;
      const res = await API.request(`/admin/subadmins/${adminId}/send-email`, 'POST', {
        password: mailPassword,
      });
      alert(res.message || `Credentials email dispatched to ${emailingAdmin.email}!`);
      setEmailingAdmin(null);
      setMailPassword('');
    } catch (err: any) {
      alert(err.message || 'Failed to send credentials email.');
    } finally {
      setSendingMail(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8 text-slate-800">
      {/* State Master Command Deck Banner */}
      <div className="relative bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-950 text-white rounded-3xl p-6 sm:p-9 shadow-xl border border-slate-800 flex flex-col md:flex-row justify-between md:items-center gap-6 overflow-hidden">
        <div className="absolute top-0 right-1/4 w-80 h-80 bg-sky-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative space-y-2.5 z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/10 text-sky-200 text-xs font-bold border border-white/20 shadow-2xs">
            <ShieldCheck className="w-4 h-4 text-sky-300" />
            <span>State Governance Master Console</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">{user?.name || 'State Central Admin'}</h1>
          <p className="text-xs text-slate-300 font-normal">
            Statewide municipal oversight, officer provisioning, and cross-district grievance auditing.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="relative z-10 px-6 py-3.5 bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 text-white font-bold text-xs rounded-2xl shadow-lg shadow-sky-500/20 hover:shadow-sky-500/30 transition flex items-center gap-2 self-start md:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          <span>Register District Sub-Admin</span>
        </button>
      </div>

      {/* Metrics Grid */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-sm space-y-1">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">Statewide Grievances</div>
            <div className="text-3xl font-black font-mono text-slate-900">{stats.totalComplaints}</div>
          </div>
          <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-sm space-y-1">
            <div className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider font-mono">State Resolution Rate</div>
            <div className="text-3xl font-black font-mono text-emerald-600">
              {stats.resolutionRate ? `${stats.resolutionRate.toString().replace(/%/g, '')}%` : '0%'}
            </div>
          </div>
          <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-sm space-y-1">
            <div className="text-[11px] font-bold text-sky-700 uppercase tracking-wider font-mono">Active Citizens</div>
            <div className="text-3xl font-black font-mono text-sky-600">{stats.totalCitizens}</div>
          </div>
          <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-sm space-y-1">
            <div className="text-[11px] font-bold text-purple-700 uppercase tracking-wider font-mono">District Sub-Admins</div>
            <div className="text-3xl font-black font-mono text-purple-600">{stats.totalSubAdmins}</div>
          </div>
        </div>
      )}

      {/* ─── Main Navigation / View Switcher Tabs ─── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-2.5 rounded-2xl border border-slate-200/90 shadow-xs">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('districts')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition ${
              activeTab === 'districts'
                ? 'bg-gradient-to-r from-sky-600 to-blue-700 text-white shadow-md shadow-sky-500/20'
                : 'bg-slate-100 hover:bg-slate-200/80 text-slate-700'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>District Grievance Data</span>
          </button>
          <button
            onClick={() => setActiveTab('officers')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition ${
              activeTab === 'officers'
                ? 'bg-gradient-to-r from-sky-600 to-blue-700 text-white shadow-md shadow-sky-500/20'
                : 'bg-slate-100 hover:bg-slate-200/80 text-slate-700'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Registered Officers ({subAdmins.length})</span>
          </button>
        </div>

        <button
          onClick={() => loadData(true)}
          className="text-xs font-bold text-sky-700 hover:text-sky-800 flex items-center justify-center gap-1.5 transition bg-sky-50 hover:bg-sky-100 px-3.5 py-2 rounded-xl border border-sky-200 shadow-2xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${(loading || isRefreshing) ? 'animate-spin' : ''}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* ─── OPTION 1: DISTRICT FILTER & CIVIC GRIEVANCES DATA ────────── */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {activeTab === 'districts' && (
        <div className="space-y-6">
          {/* District Filter Control Bar */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="flex items-center gap-2 text-xs font-black text-slate-800 shrink-0">
                <Filter className="w-4 h-4 text-sky-600" />
                <span>Filter District:</span>
              </div>

              {/* District Filter Select Dropdown */}
              <div className="relative flex-1">
                <select
                  value={selectedDistrict}
                  onChange={(e) => setSelectedDistrict(e.target.value)}
                  className="w-full appearance-none pl-4 pr-10 py-2.5 bg-slate-50 hover:bg-slate-100/80 focus:bg-white text-xs font-bold text-slate-900 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-sky-500/30 cursor-pointer transition shadow-2xs"
                >
                  <option value="All">🏛️ Statewide (All Districts) &bull; {complaints.length} issues total</option>
                  {sortedDistrictOptions.map((g) => (
                    <option key={g.name} value={g.name}>
                      📍 {g.name} &bull; {g.total} issues ({g.resolved} resolved)
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <div className="flex items-center gap-2 justify-end">
              {selectedDistrict !== 'All' && (
                <button
                  onClick={() => setSelectedDistrict('All')}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
                >
                  Reset to All Districts
                </button>
              )}
            </div>
          </div>

          {/* Selected District Overview & Metric Summary Card */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white rounded-3xl p-6 sm:p-7 shadow-md border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 pb-3 border-b border-slate-800">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-sky-400">
                  Active Territorial Scope
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2 mt-0.5">
                  <MapPin className="w-5 h-5 text-sky-400 shrink-0" />
                  <span>{selectedDistrictMeta.name}</span>
                </h3>
              </div>
              <div>
                {selectedDistrictMeta.officers.length > 0 ? (
                  <div className="text-xs text-slate-200 flex items-center gap-2 bg-white/10 px-3.5 py-1.5 rounded-xl border border-white/15">
                    <Users className="w-3.5 h-3.5 text-sky-300" />
                    <span>
                      Officer(s): <strong className="text-white font-bold">{selectedDistrictMeta.officers.join(', ')}</strong>
                    </span>
                  </div>
                ) : (
                  <div className="text-xs text-amber-300 bg-amber-500/15 px-3.5 py-1.5 rounded-xl border border-amber-500/25">
                    No officer assigned directly to this district
                  </div>
                )}
              </div>
            </div>

            {/* 4-Metrics Grid for Selected District */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 space-y-0.5">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Complaints</div>
                <div className="text-2xl font-black font-mono text-white">{selectedDistrictMeta.total}</div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 space-y-0.5">
                <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Resolved</div>
                <div className="text-2xl font-black font-mono text-emerald-400">{selectedDistrictMeta.resolved}</div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 space-y-0.5">
                <div className="text-[10px] font-bold text-sky-400 uppercase tracking-wider">In Progress</div>
                <div className="text-2xl font-black font-mono text-sky-300">{selectedDistrictMeta.inProgress}</div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 space-y-0.5">
                <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Pending / Review</div>
                <div className="text-2xl font-black font-mono text-amber-300">{selectedDistrictMeta.pending}</div>
              </div>
            </div>

            {/* Resolution Rate Bar */}
            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between text-xs font-bold text-slate-300">
                <span>Territorial Resolution Rate</span>
                <span className="text-emerald-400 font-mono font-bold">{selectedDistrictMeta.resolutionRate || '0%'}</span>
              </div>
              <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-300"
                  style={{ width: `${(selectedDistrictMeta.resolutionRate || '0%').replace('%', '')}%` }}
                />
              </div>
            </div>
          </div>

          {/* Selected District Feed Panel */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 space-y-6">
            {/* Header Bar with District Stats */}
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 pb-4 border-b border-slate-200">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-black text-slate-900">
                    {selectedDistrictMeta.name} Complaints
                  </h3>
                  <span className="px-3 py-0.5 rounded-full bg-sky-50 text-sky-700 text-xs font-bold border border-sky-200">
                    {displayedComplaints.length} issues shown
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Resolution Rate: <strong className="text-emerald-600 font-bold">{selectedDistrictMeta.resolutionRate}</strong>
                </p>
              </div>

              {/* Status Tabs */}
              <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-xl shrink-0 border border-slate-200">
                {(['All', 'Active', 'In Progress', 'Pending', 'Resolved'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setComplaintStatusFilter(st)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                      complaintStatusFilter === st
                        ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={complaintSearch}
                onChange={(e) => setComplaintSearch(e.target.value)}
                placeholder={`Search within ${selectedDistrictMeta.name} by title, citizen, category, or PIN...`}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 focus:outline-none transition"
              />
            </div>

            {/* Grievances List */}
            {displayedComplaints.length === 0 ? (
              <div className="py-12 text-center text-slate-500 space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                <p className="text-sm font-bold text-slate-900">No Complaints Found</p>
                <p className="text-xs">No grievances matching this filter in {selectedDistrictMeta.name}.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {displayedComplaints.map((item) => {
                  const mainImg = item.images && item.images.length > 0 ? item.images[0].url : item.imageUrl;
                  const hasResolvedImage = Boolean(item.resolvedImageUrl);

                  return (
                    <div
                      key={item._id}
                      className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden flex flex-col justify-between hover:shadow-md hover:border-slate-300 transition"
                    >
                      <div>
                        {/* Photos Area */}
                        <ComplaintImage
                          src={mainImg}
                          alt={item.title}
                          heightClass="h-56 sm:h-64"
                          onClick={() =>
                            setPreviewImage({
                              url: mainImg,
                              title: `Complaint Photo: ${item.title}`,
                              subtitle: `Category: ${item.category} | District: ${item.district || 'N/A'} | PIN: ${item.pincode}`,
                            })
                          }
                          topRightBadge={
                            <span
                              className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase shadow ${
                                item.status === 'Resolved'
                                  ? 'bg-emerald-600 text-white'
                                  : item.status === 'In Progress'
                                  ? 'bg-sky-600 text-white'
                                  : item.status === 'Under Review'
                                  ? 'bg-amber-500 text-white'
                                  : 'bg-slate-700 text-white'
                              }`}
                            >
                              {item.status}
                            </span>
                          }
                          bottomOverlay={
                            <div className="flex justify-between items-center text-[10px] font-mono font-bold text-white">
                              <span className="px-2 py-0.5 rounded-lg bg-slate-900/90 backdrop-blur-md">
                                PIN {item.pincode}
                              </span>
                              <span className="px-2 py-0.5 rounded-lg bg-sky-950/90 backdrop-blur-md text-sky-300">
                                {item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}
                              </span>
                            </div>
                          }
                        />

                        {/* Content */}
                        <div className="p-5 space-y-3">
                          <div className="space-y-1">
                            <span className="text-[10px] font-bold text-sky-700 uppercase tracking-wider">
                              {item.category}
                            </span>
                            <h4 className="text-base font-bold text-slate-900 leading-tight">
                              {item.title}
                            </h4>
                            <p className="text-xs text-slate-600 line-clamp-2">
                              {item.description}
                            </p>
                          </div>

                          {/* Address & District Tag */}
                          <div className="space-y-1 text-xs text-slate-600 pt-2 border-t border-slate-100">
                            <div className="flex items-start gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                              <span className="line-clamp-1">{item.address || 'Address not specified'}</span>
                            </div>
                            <div className="flex items-center gap-2 pl-5 text-[11px] text-slate-500">
                              <span>District: <strong className="text-slate-700">{item.district || (item as any).assignedSubAdmin?.assignedDistrict || 'N/A'}</strong></span>
                              <span>&bull;</span>
                              <span>PIN: <strong className="font-mono text-slate-700">{item.pincode}</strong></span>
                            </div>
                          </div>

                          {/* AI Verification */}
                          {item.aiValidation && (
                            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                              <div className="flex justify-between items-center">
                                <span className="font-bold text-slate-700">AI Verification</span>
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    item.aiValidation.isValid ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                                  }`}
                                >
                                  {item.aiValidation.isValid ? 'Valid' : 'Suspect'}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-600 leading-relaxed">
                                {item.aiValidation.summary}
                              </p>
                            </div>
                          )}

                          {/* Resolution Image */}
                          {hasResolvedImage && (
                            <div className="pt-2 border-t border-slate-100">
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  Resolution Proof Photo
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono">Completed</span>
                              </div>
                              <ComplaintImage
                                src={item.resolvedImageUrl!}
                                alt={`Resolution for ${item.title}`}
                                heightClass="h-28"
                                className="rounded-xl"
                                onClick={() =>
                                  setPreviewImage({
                                    url: item.resolvedImageUrl!,
                                    title: `Resolution Proof: ${item.title}`,
                                    subtitle: `Resolved by ${item.assignedSubAdmin?.name || 'Assigned Officer'}`,
                                  })
                                }
                              />
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Card Footer */}
                      <div className="p-4 bg-slate-50 border-t border-slate-100 rounded-b-3xl flex justify-between items-center text-xs">
                        <div>
                          <div className="font-semibold text-slate-900">
                            {item.citizen?.name || 'Citizen'}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {new Date(item.createdAt).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </div>
                        </div>
                        <a
                          href={`https://maps.google.com/?q=${item.latitude},${item.longitude}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold border border-slate-200 transition flex items-center gap-1 shadow-2xs"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Map</span>
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* ─── OPTION 2: REGISTERED OFFICERS TAB ───────────────────────── */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {activeTab === 'officers' && (
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden space-y-5 p-6 sm:p-7">
          {/* Officers Header & Quick Actions */}
          <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 pb-4 border-b border-slate-200">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-50 text-sky-700 text-xs font-bold border border-sky-200 shadow-2xs mb-1">
                <Users className="w-3.5 h-3.5 text-sky-600" />
                <span>Personnel Oversight ({subAdmins.length} Officers Registered)</span>
              </div>
              <h2 className="text-xl font-black text-slate-900">Registered District Officers &amp; Mappings</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage officer accounts, departmental jurisdictions, and territorial PIN code allocations.
              </p>
            </div>

            <button
              onClick={() => setIsModalOpen(true)}
              className="px-5 py-2.5 bg-gradient-to-r from-sky-600 to-blue-700 hover:from-sky-700 hover:to-blue-800 text-white font-bold text-xs rounded-xl shadow-md shadow-sky-500/20 transition flex items-center gap-2 self-start md:self-auto"
            >
              <UserPlus className="w-4 h-4" />
              <span>Register District Sub-Admin</span>
            </button>
          </div>

          {/* Search Officer Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search registered officers by name, email, department, district, or PIN code..."
              value={officerSearch}
              onChange={(e) => setOfficerSearch(e.target.value)}
              className="w-full pl-10 pr-9 py-2.5 bg-slate-50 hover:bg-slate-100/70 focus:bg-white text-xs font-medium text-slate-900 placeholder:text-slate-400 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-sky-500/30 transition"
            />
            {officerSearch && (
              <button
                onClick={() => setOfficerSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Officers Table */}
          {loading ? (
            <div className="py-12 text-center text-slate-500">Loading officers...</div>
          ) : filteredSubAdmins.length === 0 ? (
            <div className="py-12 text-center text-slate-500 space-y-2">
              <Users className="w-10 h-10 text-slate-400 mx-auto" />
              <p className="text-sm font-bold text-slate-800">
                {officerSearch ? `No officers matching "${officerSearch}"` : 'No district officers registered yet.'}
              </p>
              <p className="text-xs">
                {officerSearch ? 'Try a different search term or clear the filter.' : 'Click "Register District Sub-Admin" to add one.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 uppercase font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-3.5 px-4">Officer Name</th>
                    <th className="py-3.5 px-4">Official Email</th>
                    <th className="py-3.5 px-4">Department</th>
                    <th className="py-3.5 px-4">Assigned District</th>
                    <th className="py-3.5 px-4">Mapped Pincodes</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredSubAdmins.map((admin) => (
                    <tr key={admin._id || admin.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4 font-bold text-slate-900">{admin.name}</td>
                      <td className="py-3.5 px-4 text-slate-600 font-mono">{admin.email}</td>
                      <td className="py-3.5 px-4 text-sky-700 font-bold">{admin.department || 'General'}</td>
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => {
                            setSelectedDistrict(admin.assignedDistrict || 'All');
                            setActiveTab('districts');
                          }}
                          className="inline-flex items-center gap-1 text-slate-800 hover:text-sky-700 font-bold hover:underline"
                          title="Click to view this district's grievance data"
                        >
                          <MapPin className="w-3 h-3 text-sky-600" />
                          <span>{admin.assignedDistrict || 'All'}</span>
                        </button>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1">
                          {admin.assignedPincodes?.map((pin) => (
                            <span key={pin} className="px-2 py-0.5 bg-sky-50 text-sky-700 font-mono rounded font-bold border border-sky-200 text-[11px]">
                              {pin}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setEmailingAdmin(admin);
                              setMailPassword('');
                            }}
                            className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-[11px] font-bold transition flex items-center gap-1 border border-emerald-200 shadow-2xs"
                          >
                            <Mail className="w-3 h-3 text-emerald-600" />
                            <span>Mail Info</span>
                          </button>
                          <button
                            onClick={() => openEditModal(admin)}
                            className="px-2.5 py-1 bg-sky-50 hover:bg-sky-100 text-sky-700 rounded-lg text-[11px] font-bold transition flex items-center gap-1 border border-sky-200 shadow-2xs"
                          >
                            <Edit3 className="w-3 h-3 text-sky-600" />
                            <span>Edit</span>
                          </button>
                          <button
                            onClick={() => handleDeleteSubAdmin(admin)}
                            className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-[11px] font-bold transition flex items-center gap-1 border border-rose-200 shadow-2xs"
                          >
                            <Trash2 className="w-3 h-3 text-rose-600" />
                            <span>Delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-5 shadow-2xl text-slate-800">
            <h3 className="text-lg font-bold text-slate-900">Register District Sub-Admin</h3>

            <form onSubmit={handleCreateSubAdmin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Officer Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Officer Rajesh Kumar"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Official Email *</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="rajesh@civiclens.gov.in"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Set Password *</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Department</label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  >
                    <option value="All Departments">All Departments</option>
                    <option value="Roads & Potholes">Roads & Potholes (PWD)</option>
                    <option value="Garbage & Sanitation">Garbage & Sanitation</option>
                    <option value="Water Supply & Sewage">Water Supply & Sewage</option>
                    <option value="Electricity & Streetlights">Electricity & Streetlights</option>
                    <option value="Public Infrastructure">Public Infrastructure</option>
                    <option value="Encroachment & Traffic">Encroachment & Traffic</option>
                    <option value="General Administration">General Administration</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">District Name</label>
                  <input
                    type="text"
                    value={assignedDistrict}
                    onChange={(e) => setAssignedDistrict(e.target.value)}
                    placeholder="e.g. South Delhi"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Assigned Postal Pincodes (Comma separated) *
                </label>
                <input
                  type="text"
                  required
                  value={assignedPincodes}
                  onChange={(e) => setAssignedPincodes(e.target.value)}
                  placeholder="110001, 110002, 110003"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-sky-700 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  All grievances submitted within these PIN codes will auto-route to this officer's dashboard.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-6 py-2.5 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-sky-500/20 transition disabled:opacity-50"
                >
                  {creating ? 'Registering...' : 'Register & Assign Jurisdiction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingAdmin && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-5 shadow-2xl text-slate-800">
            <h3 className="text-lg font-bold text-slate-900">Edit Sub-Admin Officer Details</h3>

            <form onSubmit={handleUpdateSubAdmin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Officer Name *</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Official Email *</label>
                  <input
                    type="email"
                    required
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    placeholder="officer@civiclens.gov.in"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Reset Password (Optional)</label>
                  <input
                    type="password"
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    placeholder="Leave blank to keep current"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Department</label>
                  <select
                    value={editDepartment}
                    onChange={(e) => setEditDepartment(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  >
                    <option value="All Departments">All Departments</option>
                    <option value="Roads & Potholes">Roads & Potholes (PWD)</option>
                    <option value="Garbage & Sanitation">Garbage & Sanitation</option>
                    <option value="Water Supply & Sewage">Water Supply & Sewage</option>
                    <option value="Electricity & Streetlights">Electricity & Streetlights</option>
                    <option value="Public Infrastructure">Public Infrastructure</option>
                    <option value="Encroachment & Traffic">Encroachment & Traffic</option>
                    <option value="General Administration">General Administration</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">District Name</label>
                  <input
                    type="text"
                    value={editDistrict}
                    onChange={(e) => setEditDistrict(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Assigned Postal Pincodes (Comma separated) *
                </label>
                <input
                  type="text"
                  required
                  value={editPincodes}
                  onChange={(e) => setEditPincodes(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-sky-700 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingAdmin(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="px-6 py-2.5 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-sky-500/20 transition disabled:opacity-50"
                >
                  {updating ? 'Updating...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mail Credentials Modal */}
      {emailingAdmin && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-5 shadow-2xl text-slate-800">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold border border-emerald-200">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Send Officer Credentials Email</h3>
                <p className="text-xs text-slate-500">Dispatch official login credentials & portal URL to officer's inbox</p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between border-b border-slate-200 pb-1.5">
                <span className="font-bold text-slate-500 uppercase">Officer Name:</span>
                <span className="font-bold text-slate-900">{emailingAdmin.name}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-1.5">
                <span className="font-bold text-slate-500 uppercase">Official Email:</span>
                <span className="font-semibold text-slate-700 font-mono">{emailingAdmin.email}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-1.5">
                <span className="font-bold text-slate-500 uppercase">Department:</span>
                <span className="font-semibold text-sky-700">{emailingAdmin.department || 'General Administration'}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-1.5">
                <span className="font-bold text-slate-500 uppercase">Assigned District:</span>
                <span className="font-bold text-sky-800">{emailingAdmin.assignedDistrict || 'State Jurisdiction'}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-1.5">
                <span className="font-bold text-slate-500 uppercase">Mapped Pincodes:</span>
                <span className="font-mono font-bold text-sky-700">
                  {emailingAdmin.assignedPincodes?.join(', ') || 'None'}
                </span>
              </div>
              <div className="flex justify-between pt-1">
                <span className="font-bold text-slate-500 uppercase">Admin Login URL:</span>
                <a
                  href="https://civiclens-yeq3.vercel.app/admin/login"
                  target="_blank"
                  rel="noreferrer"
                  className="font-bold text-sky-600 hover:text-sky-700 hover:underline flex items-center gap-1"
                >
                  <span>civiclens.../admin/login</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            <form onSubmit={handleSendCredentialsEmail} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Include / Reset Password (Optional)
                </label>
                <input
                  type="text"
                  value={mailPassword}
                  onChange={(e) => setMailPassword(e.target.value)}
                  placeholder="Enter password to include in email (e.g. OfficerPass@123)"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none font-mono"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Leave blank if the officer already knows their current password.
                </p>
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEmailingAdmin(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition border border-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sendingMail}
                  className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/20 flex items-center gap-2 disabled:opacity-50 transition"
                >
                  <Send className="w-4 h-4" />
                  <span>{sendingMail ? 'Sending Email...' : 'Send Official Credentials Email'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
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
