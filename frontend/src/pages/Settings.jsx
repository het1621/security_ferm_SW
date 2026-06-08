import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { format } from 'date-fns';
import {
  Settings as SettingsIcon, Banknote, Users, Building2,
  Plus, Edit2, Trash2, X, CheckCircle2, AlertCircle,
  Shield, ShieldCheck, ShieldOff, Eye, EyeOff, RotateCcw,
  IndianRupee, Percent, Clock, UserPlus, Key
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────
// Tab definitions
// ─────────────────────────────────────────────────────────────
const TABS = [
  { id: 'salary', label: 'Salary Structures', icon: Banknote },
  { id: 'team',   label: 'Team Management',   icon: Users },
  { id: 'agency', label: 'Agency Profile',     icon: Building2 },
];

const inputCls = 'w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-shadow';

export default function Settings() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('salary');

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <SettingsIcon className="w-6 h-6 text-teal-600" />
          Settings & Administration
        </h1>
        <p className="text-slate-500 text-sm mt-1">Manage salary structures, team accounts, and agency profile.</p>
      </div>

      {/* Tab Bar */}
      <div className="flex space-x-1 bg-slate-100 rounded-xl p-1 w-fit">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-white text-teal-700 shadow-sm border border-slate-200'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'salary' && <SalaryStructuresTab />}
      {activeTab === 'team'   && <TeamManagementTab />}
      {activeTab === 'agency' && <AgencyProfileTab />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TAB 1: SALARY STRUCTURES
// ═══════════════════════════════════════════════════════════════
function SalaryStructuresTab() {
  const [structures, setStructures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');
  const [fetchError, setFetchError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const emptyForm = {
    name: '', base_salary: '', dearness_allowance: '0', house_rent_allowance: '0',
    other_allowances: '0', pf_percentage: '12', esi_applicable: false,
    income_tax_applicable: false, effective_from: format(new Date(), 'yyyy-MM-dd')
  };
  const [formData, setFormData] = useState({ ...emptyForm });

  const fetchStructures = async () => {
    try {
      setLoading(true);
      setFetchError('');
      const res = await api.get('/settings/salary-structures');
      setStructures(res.data || []);
    } catch (err) {
      setFetchError(err.message || 'Failed to load salary structures');
      console.error('Failed to fetch salary structures', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStructures(); }, []);

  const openCreate = () => {
    setEditing(null);
    setFormData({ ...emptyForm });
    setError('');
    setIsModalOpen(true);
  };

  const openEdit = (ss) => {
    setEditing(ss);
    setFormData({
      name: ss.name || '',
      base_salary: ss.base_salary || '',
      dearness_allowance: ss.dearness_allowance || '0',
      house_rent_allowance: ss.house_rent_allowance || '0',
      other_allowances: ss.other_allowances || '0',
      pf_percentage: ss.pf_percentage || '12',
      esi_applicable: ss.esi_applicable || false,
      income_tax_applicable: ss.income_tax_applicable || false,
      effective_from: ss.effective_from ? ss.effective_from.substring(0, 10) : format(new Date(), 'yyyy-MM-dd'),
    });
    setError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        base_salary: parseFloat(formData.base_salary),
        dearness_allowance: parseFloat(formData.dearness_allowance) || 0,
        house_rent_allowance: parseFloat(formData.house_rent_allowance) || 0,
        other_allowances: parseFloat(formData.other_allowances) || 0,
        pf_percentage: parseFloat(formData.pf_percentage) || 0,
      };
      if (editing) {
        await api.put(`/settings/salary-structures/${editing.id}`, payload);
      } else {
        await api.post('/settings/salary-structures', payload);
      }
      setIsModalOpen(false);
      fetchStructures();
    } catch (err) {
      setError(err.message || 'Failed to save salary structure');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/settings/salary-structures/${id}`);
      setConfirmDelete(null);
      fetchStructures();
    } catch (err) {
      alert(err.message || 'Failed to deactivate');
      setConfirmDelete(null);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({ ...formData, [name]: type === 'checkbox' ? checked : value });
  };

  const computeGross = () => {
    const base = parseFloat(formData.base_salary) || 0;
    const da = parseFloat(formData.dearness_allowance) || 0;
    const hra = parseFloat(formData.house_rent_allowance) || 0;
    const oth = parseFloat(formData.other_allowances) || 0;
    return base + da + hra + oth;
  };

  const computeNet = () => {
    const gross = computeGross();
    const pfPct = parseFloat(formData.pf_percentage) || 0;
    const pfDeduction = (gross * pfPct) / 100;
    return gross - pfDeduction;
  };

  return (
    <>
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <IndianRupee className="w-5 h-5 text-emerald-600" />
              Salary Structures
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Define pay scales used when onboarding guards</p>
          </div>
          <button onClick={openCreate} className="flex items-center gap-2 bg-teal-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-teal-700 transition-colors shadow-sm">
            <Plus className="w-4 h-4" /> New Structure
          </button>
        </div>

        {fetchError && (
          <div className="mx-6 mt-4 p-4 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm flex items-start gap-2">
            <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
            <div>
              <p className="font-bold">Error loading data</p>
              <p>{fetchError}</p>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {['Name', 'Base Salary', 'DA', 'HRA', 'Allowances', 'PF %', 'ESI', 'Gross', 'Effective', 'Guards', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={12} className="px-6 py-12 text-center text-slate-500">
                  <div className="flex justify-center mb-2"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-teal-500"></div></div>
                  Loading...
                </td></tr>
              ) : structures.length === 0 ? (
                <tr><td colSpan={12} className="px-6 py-12 text-center text-slate-500">
                  <Banknote className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                  <p className="font-medium text-slate-600 mb-1">No salary structures defined</p>
                  <p className="text-xs">Create one to start onboarding guards.</p>
                </td></tr>
              ) : structures.map(ss => {
                const base = parseFloat(ss.base_salary) || 0;
                const da = parseFloat(ss.dearness_allowance) || 0;
                const hra = parseFloat(ss.house_rent_allowance) || 0;
                const oth = parseFloat(ss.other_allowances) || 0;
                const gross = base + da + hra + oth;
                return (
                  <tr key={ss.id} className={`hover:bg-slate-50 transition-colors ${!ss.is_active ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-3 font-semibold text-slate-800">{ss.name}</td>
                    <td className="px-4 py-3 font-mono text-slate-700">₹{base.toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3 text-slate-500">₹{da.toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3 text-slate-500">₹{hra.toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3 text-slate-500">₹{oth.toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3 font-medium text-slate-600">{ss.pf_percentage}%</td>
                    <td className="px-4 py-3">{ss.esi_applicable ? <span className="text-emerald-600 text-xs font-bold">Yes</span> : <span className="text-slate-400 text-xs">No</span>}</td>
                    <td className="px-4 py-3 font-black text-emerald-700">₹{gross.toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{ss.effective_from?.substring(0, 10)}</td>
                    <td className="px-4 py-3">
                      <span className="inline-block bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">{ss.active_guards}</span>
                    </td>
                    <td className="px-4 py-3">
                      {ss.is_active ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" /> Active
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">Inactive</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button onClick={() => openEdit(ss)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {ss.is_active && (
                          <button onClick={() => setConfirmDelete(ss.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Deactivate">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirm Deactivate */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 animate-slide-up">
            <h3 className="text-lg font-bold text-slate-800 mb-2">Deactivate Structure?</h3>
            <p className="text-sm text-slate-600 mb-6">Guards already assigned to it will keep their pay. New assignments won't be allowed.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmDelete(null)} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50">Cancel</button>
              <button onClick={() => handleDelete(confirmDelete)} className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 shadow-sm">Deactivate</button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-slide-up max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Banknote className="w-5 h-5 text-teal-600" />
                {editing ? 'Edit Salary Structure' : 'New Salary Structure'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
              {error && (
                <div className="p-3 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> {error}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Structure Name *</label>
                  <input name="name" value={formData.name} onChange={handleChange} required placeholder="e.g. Day Guard, Night Guard" className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Base Salary (₹) *</label>
                  <input name="base_salary" type="number" step="0.01" min="1" value={formData.base_salary} onChange={handleChange} required className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Dearness Allowance (₹)</label>
                  <input name="dearness_allowance" type="number" step="0.01" min="0" value={formData.dearness_allowance} onChange={handleChange} className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">HRA (₹)</label>
                  <input name="house_rent_allowance" type="number" step="0.01" min="0" value={formData.house_rent_allowance} onChange={handleChange} className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Other Allowances (₹)</label>
                  <input name="other_allowances" type="number" step="0.01" min="0" value={formData.other_allowances} onChange={handleChange} className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">PF Percentage (%)</label>
                  <input name="pf_percentage" type="number" step="0.01" min="0" max="100" value={formData.pf_percentage} onChange={handleChange} className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Effective From</label>
                  <input name="effective_from" type="date" value={formData.effective_from} onChange={handleChange} className={inputCls} />
                </div>
              </div>

              <div className="flex gap-6 mt-2">
                <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                  <input type="checkbox" name="esi_applicable" checked={formData.esi_applicable} onChange={handleChange} className="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500" />
                  ESI Applicable
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                  <input type="checkbox" name="income_tax_applicable" checked={formData.income_tax_applicable} onChange={handleChange} className="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500" />
                  Income Tax Applicable
                </label>
              </div>

              {/* Live Preview */}
              <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Live Preview</p>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Gross Salary:</span>
                  <span className="font-black text-emerald-700">₹{computeGross().toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-slate-600">PF Deduction ({formData.pf_percentage}%):</span>
                  <span className="font-bold text-red-500">- ₹{((computeGross() * (parseFloat(formData.pf_percentage) || 0)) / 100).toLocaleString('en-IN')}</span>
                </div>
                <hr className="my-2 border-slate-200" />
                <div className="flex justify-between text-sm">
                  <span className="text-slate-700 font-bold">Approx Net Salary:</span>
                  <span className="font-black text-blue-700">₹{computeNet().toLocaleString('en-IN')}</span>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={submitting} className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 shadow-sm disabled:opacity-50 flex items-center gap-2">
                  {submitting ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> : <CheckCircle2 className="w-4 h-4" />}
                  {editing ? 'Save Changes' : 'Create Structure'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
// TAB 2: TEAM MANAGEMENT
// ═══════════════════════════════════════════════════════════════
function TeamManagementTab() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isResetOpen, setIsResetOpen] = useState(null);
  const [error, setError] = useState('');
  const [fetchError, setFetchError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [addForm, setAddForm] = useState({
    full_name: '', email: '', password: '', role: 'manager', phone: ''
  });
  const [resetPwd, setResetPwd] = useState('');

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setFetchError('');
      const res = await api.get('/auth/users');
      setUsers(res.data || []);
    } catch (err) {
      setFetchError(err.message || 'Failed to load team members');
      console.error('Failed to fetch users', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleAddUser = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await api.post('/auth/users', addForm);
      setIsAddOpen(false);
      setAddForm({ full_name: '', email: '', password: '', role: 'manager', phone: '' });
      fetchUsers();
    } catch (err) {
      setError(err.message || 'Failed to create user');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleUser = async (id) => {
    try {
      await api.patch(`/settings/users/${id}/toggle`);
      fetchUsers();
    } catch (err) {
      alert(err.message || 'Failed to toggle user');
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await api.post(`/settings/users/${isResetOpen}/reset-password`, { new_password: resetPwd });
      setIsResetOpen(null);
      setResetPwd('');
      alert('Password reset successfully');
    } catch (err) {
      setError(err.message || 'Failed to reset password');
    } finally {
      setSubmitting(false);
    }
  };

  const roleColors = {
    admin:      'bg-red-100 text-red-700 border-red-200',
    manager:    'bg-blue-100 text-blue-700 border-blue-200',
    accountant: 'bg-violet-100 text-violet-700 border-violet-200',
    employee:   'bg-slate-100 text-slate-700 border-slate-200',
  };

  return (
    <>
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Shield className="w-5 h-5 text-indigo-600" />
              Team Members
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Invite managers, accountants, and staff to SecurManage</p>
          </div>
          <button onClick={() => { setIsAddOpen(true); setError(''); }} className="flex items-center gap-2 bg-teal-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-teal-700 transition-colors shadow-sm">
            <UserPlus className="w-4 h-4" /> Add Team Member
          </button>
        </div>

        {fetchError && (
          <div className="mx-6 mt-4 p-4 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm flex items-start gap-2">
            <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
            <div>
              <p className="font-bold">Error loading team members</p>
              <p>{fetchError}</p>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {['Name', 'Email', 'Role', 'Phone', 'Last Login', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                  <div className="flex justify-center mb-2"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-teal-500"></div></div>
                  Loading team...
                </td></tr>
              ) : users.map(u => (
                <tr key={u.id} className={`hover:bg-slate-50 transition-colors ${!u.is_active ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-400 to-blue-500 flex items-center justify-center text-white font-bold text-xs">
                        {u.full_name?.charAt(0)?.toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800">{u.full_name}</p>
                        {u.id === currentUser?.id && <span className="text-[10px] text-teal-600 font-bold">(You)</span>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold border capitalize ${roleColors[u.role] || roleColors.employee}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{u.phone || '—'}</td>
                  <td className="px-4 py-3 text-xs text-slate-400">{u.last_login ? format(new Date(u.last_login), 'dd MMM yyyy HH:mm') : 'Never'}</td>
                  <td className="px-4 py-3">
                    {u.is_active ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700"><ShieldCheck className="w-3.5 h-3.5" /> Active</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-400"><ShieldOff className="w-3.5 h-3.5" /> Disabled</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {u.id !== currentUser?.id && (
                      <div className="flex gap-1">
                        <button onClick={() => toggleUser(u.id)} className={`p-1.5 rounded-lg transition-colors ${u.is_active ? 'text-slate-400 hover:text-red-600 hover:bg-red-50' : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'}`} title={u.is_active ? 'Disable' : 'Enable'}>
                          {u.is_active ? <ShieldOff className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                        </button>
                        <button onClick={() => { setIsResetOpen(u.id); setResetPwd(''); setError(''); }} className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" title="Reset Password">
                          <Key className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 animate-slide-up">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><UserPlus className="w-5 h-5 text-teal-600" /> Add Team Member</h3>
              <button onClick={() => setIsAddOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>

            {error && <div className="mb-4 p-3 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm flex items-start gap-2"><AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> {error}</div>}

            <form onSubmit={handleAddUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name *</label>
                <input required value={addForm.full_name} onChange={e => setAddForm({...addForm, full_name: e.target.value})} className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
                <input type="email" required value={addForm.email} onChange={e => setAddForm({...addForm, email: e.target.value})} className={inputCls} />
              </div>
              <div className="relative">
                <label className="block text-sm font-medium text-slate-700 mb-1">Password *</label>
                <input type={showPassword ? 'text' : 'password'} required minLength={6} value={addForm.password} onChange={e => setAddForm({...addForm, password: e.target.value})} className={inputCls} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-8 text-slate-400 hover:text-slate-600">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Role *</label>
                  <select value={addForm.role} onChange={e => setAddForm({...addForm, role: e.target.value})} className={inputCls}>
                    <option value="manager">Manager</option>
                    <option value="accountant">Accountant</option>
                    <option value="employee">Employee</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                  <input value={addForm.phone} onChange={e => setAddForm({...addForm, phone: e.target.value})} className={inputCls} />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setIsAddOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={submitting} className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 shadow-sm disabled:opacity-50 flex items-center gap-2">
                  {submitting ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> : <CheckCircle2 className="w-4 h-4" />}
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {isResetOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 animate-slide-up">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Key className="w-5 h-5 text-amber-600" /> Reset Password</h3>
              <button onClick={() => setIsResetOpen(null)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>

            {error && <div className="mb-4 p-3 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm flex items-start gap-2"><AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> {error}</div>}

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">New Password *</label>
                <input type="password" required minLength={6} value={resetPwd} onChange={e => setResetPwd(e.target.value)} placeholder="Min 6 characters" className={inputCls} />
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setIsResetOpen(null)} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={submitting} className="px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 shadow-sm disabled:opacity-50 flex items-center gap-2">
                  {submitting ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> : <RotateCcw className="w-4 h-4" />}
                  Reset Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
// TAB 3: AGENCY PROFILE & DEFAULTS
// ═══════════════════════════════════════════════════════════════
function AgencyProfileTab() {
  const { user } = useAuth();
  const [saved, setSaved] = useState(false);
  const [changePwd, setChangePwd] = useState(false);
  const [pwdForm, setPwdForm] = useState({ current_password: '', new_password: '', confirm: '' });
  const [pwdError, setPwdError] = useState('');
  const [pwdSuccess, setPwdSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Agency settings stored in localStorage (no backend table needed for MVP)
  const [agencySettings, setAgencySettings] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('agencySettings')) || {
        agency_name: 'SecurManage',
        agency_address: '',
        agency_phone: '',
        agency_email: '',
        gst_number: '',
        default_tax_rate: '18',
        invoice_prefix: 'INV',
        currency: 'INR',
      };
    } catch { return {}; }
  });

  const handleSaveAgency = () => {
    localStorage.setItem('agencySettings', JSON.stringify(agencySettings));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwdError('');
    setPwdSuccess('');

    if (pwdForm.new_password !== pwdForm.confirm) {
      setPwdError('New passwords do not match');
      return;
    }
    if (pwdForm.new_password.length < 6) {
      setPwdError('Password must be at least 6 characters');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/auth/change-password', {
        current_password: pwdForm.current_password,
        new_password: pwdForm.new_password,
      });
      setPwdSuccess('Password changed successfully!');
      setPwdForm({ current_password: '', new_password: '', confirm: '' });
    } catch (err) {
      setPwdError(err.message || 'Failed to change password');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Agency Details */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-5">
          <Building2 className="w-5 h-5 text-teal-600" />
          Agency Details
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Agency Name</label>
            <input value={agencySettings.agency_name} onChange={e => setAgencySettings({...agencySettings, agency_name: e.target.value})} className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
            <textarea rows={2} value={agencySettings.agency_address} onChange={e => setAgencySettings({...agencySettings, agency_address: e.target.value})} className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
              <input value={agencySettings.agency_phone} onChange={e => setAgencySettings({...agencySettings, agency_phone: e.target.value})} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input type="email" value={agencySettings.agency_email} onChange={e => setAgencySettings({...agencySettings, agency_email: e.target.value})} className={inputCls} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">GST Number</label>
              <input value={agencySettings.gst_number} onChange={e => setAgencySettings({...agencySettings, gst_number: e.target.value})} placeholder="e.g. 24AABCT1332E1ZH" className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Default Tax Rate (%)</label>
              <input type="number" min="0" max="100" step="0.5" value={agencySettings.default_tax_rate} onChange={e => setAgencySettings({...agencySettings, default_tax_rate: e.target.value})} className={inputCls} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Invoice Prefix</label>
            <input value={agencySettings.invoice_prefix} onChange={e => setAgencySettings({...agencySettings, invoice_prefix: e.target.value})} className={inputCls} />
          </div>

          <button onClick={handleSaveAgency} className="w-full mt-2 px-4 py-2.5 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 shadow-sm transition-colors flex items-center justify-center gap-2">
            {saved ? <><CheckCircle2 className="w-4 h-4" /> Saved!</> : 'Save Settings'}
          </button>
        </div>
      </div>

      {/* Your Account */}
      <div className="space-y-6">
        {/* Profile Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-5">
            <Shield className="w-5 h-5 text-indigo-600" />
            Your Account
          </h3>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-teal-400 to-blue-500 flex items-center justify-center text-white font-black text-xl shadow-lg">
              {user?.full_name?.charAt(0)?.toUpperCase()}
            </div>
            <div>
              <p className="text-lg font-bold text-slate-800">{user?.full_name}</p>
              <p className="text-sm text-slate-500">{user?.email}</p>
              <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700 capitalize">{user?.role}</span>
            </div>
          </div>
        </div>

        {/* Change Password */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Key className="w-5 h-5 text-amber-600" />
              Change Password
            </h3>
            <button onClick={() => setChangePwd(!changePwd)} className="text-sm text-teal-600 hover:text-teal-700 font-medium">
              {changePwd ? 'Cancel' : 'Change'}
            </button>
          </div>

          {changePwd && (
            <form onSubmit={handleChangePassword} className="space-y-3">
              {pwdError && <div className="p-3 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm flex items-start gap-2"><AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> {pwdError}</div>}
              {pwdSuccess && <div className="p-3 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-lg text-sm flex items-start gap-2"><CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" /> {pwdSuccess}</div>}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Current Password</label>
                <input type="password" required value={pwdForm.current_password} onChange={e => setPwdForm({...pwdForm, current_password: e.target.value})} className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
                <input type="password" required minLength={6} value={pwdForm.new_password} onChange={e => setPwdForm({...pwdForm, new_password: e.target.value})} className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Confirm New Password</label>
                <input type="password" required value={pwdForm.confirm} onChange={e => setPwdForm({...pwdForm, confirm: e.target.value})} className={inputCls} />
              </div>
              <button type="submit" disabled={submitting} className="w-full px-4 py-2.5 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 shadow-sm disabled:opacity-50 flex items-center justify-center gap-2">
                {submitting ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> : <RotateCcw className="w-4 h-4" />}
                Update Password
              </button>
            </form>
          )}
          {!changePwd && <p className="text-sm text-slate-400">Click "Change" above to update your login password.</p>}
        </div>
      </div>
    </div>
  );
}
