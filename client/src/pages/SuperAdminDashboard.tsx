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
} from 'lucide-react';
import { API } from '../services/api';
import { User, Complaint } from '../types';

export const SuperAdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const user = API.getUser('superadmin');
  const role = API.getRole('superadmin');
  const [subAdmins, setSubAdmins] = useState<User[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);

  // District oversight state
  const [selectedDistrict, setSelectedDistrict] = useState<string>('All');
  const [complaintStatusFilter, setComplaintStatusFilter] = useState<string>('All');
  const [complaintSearch, setComplaintSearch] = useState<string>('');
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);

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

  const loadData = async () => {
    setLoading(true);
    try {
      const [adminRes, statRes, compRes] = await Promise.all([
        API.request('/admin/subadmins'),
        API.request('/admin/stats'),
        API.request('/complaints/superadmin'),
      ]);
      setSubAdmins(adminRes.subAdmins || []);
      setStats(statRes.stats || null);
      setComplaints(compRes.complaints || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Top Banner */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 text-sky-400 text-xs font-bold mb-2">
            <ShieldCheck className="w-4 h-4" />
            <span>State Governance Master Console</span>
          </div>
          <h1 className="text-2xl font-black">{user?.name}</h1>
          <p className="text-xs text-slate-400 mt-0.5">Central state administrative oversight & officer creation</p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl shadow transition flex items-center gap-2"
        >
          <UserPlus className="w-4 h-4" />
          <span>Register District Sub-Admin</span>
        </button>
      </div>

      {/* Metrics Grid */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="text-xs font-bold text-slate-500 uppercase">Statewide Grievances</div>
            <div className="text-3xl font-black text-slate-900 mt-1">{stats.totalComplaints}</div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="text-xs font-bold text-emerald-600 uppercase">Resolved Rate</div>
            <div className="text-3xl font-black text-emerald-600 mt-1">
              {stats.resolutionRate ? `${stats.resolutionRate.toString().replace(/%/g, '')}%` : '0%'}
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="text-xs font-bold text-blue-600 uppercase">Active Citizens</div>
            <div className="text-3xl font-black text-blue-600 mt-1">{stats.totalCitizens}</div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="text-xs font-bold text-purple-600 uppercase">District Sub-Admins</div>
            <div className="text-3xl font-black text-purple-600 mt-1">{stats.totalSubAdmins}</div>
          </div>
        </div>
      )}

      {/* Sub-Admins Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-6">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold text-slate-900">Registered District Officers & Mapped PIN Codes</h2>
          <button onClick={loadData} className="text-xs font-bold text-sky-600 hover:underline flex items-center gap-1">
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>

        {loading ? (
          <div className="py-8 text-center text-slate-400">Loading officers...</div>
        ) : subAdmins.length === 0 ? (
          <div className="py-8 text-center text-slate-400">No district officers registered yet. Click "Register District Sub-Admin" above.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Officer Name</th>
                  <th className="py-3 px-4">Official Email</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">District</th>
                  <th className="py-3 px-4">Mapped Pincodes</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {subAdmins.map((admin) => (
                  <tr key={admin._id || admin.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-bold text-slate-900">{admin.name}</td>
                    <td className="py-3 px-4 text-slate-600">{admin.email}</td>
                    <td className="py-3 px-4 text-blue-700 font-semibold">{admin.department || 'General'}</td>
                    <td className="py-3 px-4 text-slate-700">{admin.assignedDistrict || 'All'}</td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1">
                        {admin.assignedPincodes?.map((pin) => (
                          <span key={pin} className="px-2 py-0.5 bg-slate-100 text-slate-700 font-mono rounded font-bold">
                            {pin}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setEmailingAdmin(admin);
                            setMailPassword('');
                          }}
                          className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-[11px] font-bold transition flex items-center gap-1 border border-emerald-200"
                        >
                          <Mail className="w-3 h-3" />
                          <span>Mail Info</span>
                        </button>
                        <button
                          onClick={() => openEditModal(admin)}
                          className="px-2.5 py-1 bg-sky-50 hover:bg-sky-100 text-sky-700 rounded-lg text-[11px] font-bold transition flex items-center gap-1 border border-sky-200"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => handleDeleteSubAdmin(admin)}
                          className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-[11px] font-bold transition flex items-center gap-1 border border-rose-200"
                        >
                          <Trash2 className="w-3 h-3" />
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

      {/* ─── District-Wise Civic Grievances Oversight ─── */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200 shadow-2xs mb-1">
              <Building2 className="w-3.5 h-3.5 text-blue-600" />
              <span>Statewide Territorial Grievance Division</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900">
              District-Wise Civic Grievance Triage
            </h2>
            <p className="text-xs text-slate-500">
              Click on any district card below to filter and inspect all civic complaints, assigned officers, and resolution status.
            </p>
          </div>
          <button
            onClick={loadData}
            className="text-xs font-bold text-sky-600 hover:underline flex items-center gap-1 self-start sm:self-auto"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Grievances</span>
          </button>
        </div>

        {/* District Selector Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* All Districts Master Card */}
          <button
            onClick={() => setSelectedDistrict('All')}
            className={`p-5 rounded-3xl border text-left transition flex flex-col justify-between space-y-3 ${
              selectedDistrict === 'All'
                ? 'bg-slate-900 text-white border-slate-900 shadow-lg scale-[1.01] ring-2 ring-sky-500'
                : 'bg-white hover:bg-slate-50 text-slate-900 border-slate-200 shadow-sm'
            }`}
          >
            <div className="flex justify-between items-start">
              <div>
                <span className={`text-[10px] font-extrabold uppercase tracking-wider ${
                  selectedDistrict === 'All' ? 'text-sky-400' : 'text-slate-400'
                }`}>
                  Statewide Aggregate
                </span>
                <h3 className="text-lg font-black mt-0.5">All Districts</h3>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-xs font-black font-mono ${
                selectedDistrict === 'All' ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30' : 'bg-slate-100 text-slate-800'
              }`}>
                {complaints.length} issues
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-200/40 text-center">
              <div>
                <div className="text-[10px] text-emerald-400 font-bold uppercase">Resolved</div>
                <div className="text-sm font-black font-mono mt-0.5">
                  {complaints.filter((c) => c.status === 'Resolved').length}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-sky-400 font-bold uppercase">In Progress</div>
                <div className="text-sm font-black font-mono mt-0.5">
                  {complaints.filter((c) => c.status === 'In Progress').length}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-amber-400 font-bold uppercase">Pending</div>
                <div className="text-sm font-black font-mono mt-0.5">
                  {complaints.filter((c) => c.status === 'Pending' || c.status === 'Under Review').length}
                </div>
              </div>
            </div>
          </button>

          {/* Individual District Cards */}
          {districtGroups.map((group) => {
            const isSelected = selectedDistrict.toLowerCase() === group.name.toLowerCase();
            const resolutionPercent = group.total > 0 ? Math.round((group.resolved / group.total) * 100) : 0;

            return (
              <button
                key={group.name}
                onClick={() => setSelectedDistrict(group.name)}
                className={`p-5 rounded-3xl border text-left transition flex flex-col justify-between space-y-3 ${
                  isSelected
                    ? 'bg-sky-600 text-white border-sky-600 shadow-lg scale-[1.01] ring-2 ring-sky-300'
                    : 'bg-white hover:bg-slate-50 text-slate-900 border-slate-200 shadow-sm'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="min-w-0">
                    <span className={`text-[10px] font-extrabold uppercase tracking-wider truncate block ${
                      isSelected ? 'text-sky-100' : 'text-slate-400'
                    }`}>
                      District Jurisdiction
                    </span>
                    <h3 className="text-base font-black mt-0.5 truncate">{group.name}</h3>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-black font-mono shrink-0 ml-2 ${
                    isSelected ? 'bg-white/20 text-white border border-white/30' : 'bg-slate-100 text-slate-800'
                  }`}>
                    {group.total}
                  </span>
                </div>

                {/* Mini Metrics Row */}
                <div className={`grid grid-cols-3 gap-1 pt-2 border-t text-center ${
                  isSelected ? 'border-sky-500/60' : 'border-slate-100'
                }`}>
                  <div>
                    <div className={`text-[9px] font-bold uppercase ${isSelected ? 'text-sky-100' : 'text-emerald-600'}`}>Resolved</div>
                    <div className="text-xs font-black font-mono">{group.resolved}</div>
                  </div>
                  <div>
                    <div className={`text-[9px] font-bold uppercase ${isSelected ? 'text-sky-100' : 'text-blue-600'}`}>Active</div>
                    <div className="text-xs font-black font-mono">{group.inProgress}</div>
                  </div>
                  <div>
                    <div className={`text-[9px] font-bold uppercase ${isSelected ? 'text-sky-100' : 'text-amber-600'}`}>Pending</div>
                    <div className="text-xs font-black font-mono">{group.pending}</div>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="space-y-1 pt-0.5">
                  <div className="flex justify-between text-[10px] font-semibold opacity-90">
                    <span>Resolution Rate</span>
                    <span>{resolutionPercent}%</span>
                  </div>
                  <div className={`h-1.5 w-full rounded-full overflow-hidden ${
                    isSelected ? 'bg-sky-700' : 'bg-slate-100'
                  }`}>
                    <div
                      className={`h-full rounded-full ${isSelected ? 'bg-white' : 'bg-emerald-500'}`}
                      style={{ width: `${resolutionPercent}%` }}
                    />
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected District Feed Panel */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-6">
          {/* Header Bar with District Stats */}
          <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-black text-slate-900">
                  {selectedDistrictMeta.name}
                </h3>
                <span className="px-3 py-0.5 rounded-full bg-sky-50 text-sky-700 text-xs font-bold border border-sky-200">
                  {displayedComplaints.length} issues shown
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Resolution Rate: <strong className="text-emerald-600 font-bold">{selectedDistrictMeta.resolutionRate}</strong>
                {selectedDistrictMeta.officers.length > 0 && (
                  <span> &bull; Designated Officers: <strong className="text-slate-700">{selectedDistrictMeta.officers.join(', ')}</strong></span>
                )}
              </p>
            </div>

            {/* Status Tabs */}
            <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-xl shrink-0">
              {(['All', 'Active', 'In Progress', 'Pending', 'Resolved'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setComplaintStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    complaintStatusFilter === st
                      ? 'bg-white text-slate-900 shadow-xs'
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
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
            />
          </div>

          {/* Grievances List */}
          {displayedComplaints.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
              <p className="text-sm font-bold text-slate-800">No Complaints Found</p>
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
                    className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between hover:shadow-md transition"
                  >
                    <div>
                      {/* Photos Area */}
                      <div className="relative aspect-video bg-slate-100 group">
                        <img
                          src={mainImg}
                          alt={item.title}
                          className="w-full h-full object-cover cursor-pointer"
                          onClick={() => setPreviewImage({ url: mainImg, title: `Complaint Photo: ${item.title}` })}
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

                        {/* Bottom Bar: GPS + PIN */}
                        <div className="absolute bottom-2 left-2 right-2 flex justify-between items-center text-[10px] font-mono font-bold text-white">
                          <span className="px-2 py-0.5 rounded-lg bg-slate-900/80 backdrop-blur-md">
                            PIN {item.pincode}
                          </span>
                          <span className="px-2 py-0.5 rounded-lg bg-blue-950/80 backdrop-blur-md text-blue-200">
                            {item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}
                          </span>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-5 space-y-3">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-blue-600">{item.category}</span>
                          <span className="text-slate-400 text-[10px]">{new Date(item.createdAt).toLocaleDateString()}</span>
                        </div>

                        <h4 className="font-bold text-slate-900 text-base line-clamp-1">{item.title}</h4>
                        <p className="text-slate-500 text-xs line-clamp-2 leading-relaxed">{item.description}</p>

                        {/* Location */}
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
                            <span>View GPS on Google Maps ({item.latitude.toFixed(4)}, {item.longitude.toFixed(4)})</span>
                          </a>
                        </div>

                        {/* Citizen details */}
                        {item.citizen && (
                          <div className="text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 space-y-0.5">
                            <div>Reported by: <strong className="text-slate-900">{item.citizen.name}</strong></div>
                            <div className="text-slate-500">{item.citizen.phone || item.citizen.email}</div>
                          </div>
                        )}

                        {/* Resolved Proof Box */}
                        {hasResolvedImage && (
                          <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-black uppercase text-emerald-800 flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Verified Resolution Photo</span>
                              </span>
                              <button
                                onClick={() => setPreviewImage({ url: item.resolvedImageUrl!, title: `Resolution Proof: ${item.title}` })}
                                className="text-[10px] text-emerald-700 font-bold hover:underline flex items-center gap-0.5"
                              >
                                <Eye className="w-3 h-3" />
                                <span>View</span>
                              </button>
                            </div>
                            <div
                              onClick={() => setPreviewImage({ url: item.resolvedImageUrl!, title: `Resolution Proof: ${item.title}` })}
                              className="relative aspect-video rounded-lg overflow-hidden cursor-pointer border border-emerald-300"
                            >
                              <img src={item.resolvedImageUrl} alt="Resolution proof" className="w-full h-full object-cover" />
                            </div>
                            {item.resolutionNotes && (
                              <p className="text-[10px] text-emerald-900 italic line-clamp-2">
                                "{item.resolutionNotes}"
                              </p>
                            )}
                          </div>
                        )}

                        {/* Officer Assignment */}
                        {item.assignedSubAdmin && (
                          <div className="text-[11px] text-slate-500 bg-slate-50 px-3 py-2 rounded-xl flex items-center gap-1.5 border border-slate-100">
                            <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>
                              Assigned: <strong className="text-slate-700">{item.assignedSubAdmin.name}</strong> ({item.assignedSubAdmin.department || 'Officer'})
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
                        <span>Inspect Location on Map</span>
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-5 shadow-2xl">
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
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
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
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
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
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Department</label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
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
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
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
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  All grievances submitted within these PIN codes will auto-route to this officer's dashboard.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-6 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl shadow transition"
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
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-5 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900">Edit Sub-Admin Officer Details</h3>

            <form onSubmit={handleUpdateSubAdmin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Officer Name *</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
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
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Reset Password (Optional)</label>
                  <input
                    type="password"
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    placeholder="Leave blank to keep current"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Department</label>
                  <select
                    value={editDepartment}
                    onChange={(e) => setEditDepartment(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
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
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
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
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingAdmin(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="px-6 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl shadow transition"
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
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-5 shadow-2xl">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Send Officer Credentials Email</h3>
                <p className="text-xs text-slate-500">Dispatch official login credentials & portal URL to officer's inbox</p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                <span className="font-bold text-slate-500 uppercase">Officer Name:</span>
                <span className="font-bold text-slate-900">{emailingAdmin.name}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                <span className="font-bold text-slate-500 uppercase">Official Email:</span>
                <span className="font-semibold text-slate-800">{emailingAdmin.email}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                <span className="font-bold text-slate-500 uppercase">Department:</span>
                <span className="font-semibold text-blue-700">{emailingAdmin.department || 'General Administration'}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                <span className="font-bold text-slate-500 uppercase">Assigned District:</span>
                <span className="font-bold text-sky-700">{emailingAdmin.assignedDistrict || 'State Jurisdiction'}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                <span className="font-bold text-slate-500 uppercase">Mapped Pincodes:</span>
                <span className="font-mono font-bold text-slate-900">
                  {emailingAdmin.assignedPincodes?.join(', ') || 'None'}
                </span>
              </div>
              <div className="flex justify-between pt-1">
                <span className="font-bold text-slate-500 uppercase">Admin Login URL:</span>
                <a
                  href="https://civiclens-yeq3.vercel.app/admin/login"
                  target="_blank"
                  rel="noreferrer"
                  className="font-bold text-sky-600 hover:underline flex items-center gap-1"
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
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none font-mono"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Leave blank if the officer already knows their current password.
                </p>
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEmailingAdmin(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sendingMail}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow flex items-center gap-2 disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span>{sendingMail ? 'Sending Email...' : 'Send Official Credentials Email'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Image Preview Modal */}
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
