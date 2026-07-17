import { useState, useEffect } from 'react';
import { Shield, Users, Banknote, TrendingUp, Award, Plus, Zap, Eye, X } from 'lucide-react';
import api from '../services/api';
import TableSkeleton from '../components/TableSkeleton';

export default function PFGratuity() {
  const [tab, setTab] = useState('pf'); // pf | gratuity
  const [pfAccounts, setPfAccounts] = useState([]);
  const [liabilityReport, setLiabilityReport] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isCreatePfOpen, setIsCreatePfOpen] = useState(false);
  const [isViewPfOpen, setIsViewPfOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [pfForm, setPfForm] = useState({ employee_id: '', uan_number: '', pf_number: '' });
  const [submitting, setSubmitting] = useState(false);

  const fetchPfAccounts = async () => {
    try {
      setLoading(true);
      const res = await api.get('/pf-gratuity/pf/accounts?limit=100');
      setPfAccounts(res.data || []);
    } catch { setPfAccounts([]); }
    finally { setLoading(false); }
  };

  const fetchLiability = async () => {
    try {
      setLoading(true);
      const res = await api.get('/pf-gratuity/gratuity/liability-report');
      setLiabilityReport(res.data);
    } catch { setLiabilityReport(null); }
    finally { setLoading(false); }
  };

  useEffect(() => { tab === 'pf' ? fetchPfAccounts() : fetchLiability(); }, [tab]);

  const fmt = (v) => `₹${Number(v || 0).toLocaleString('en-IN')}`;

  // ─── PF Actions ────────────────────────────────────────────────────────────

  const handleCreatePf = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/pf-gratuity/pf/accounts', {
        employee_id: parseInt(pfForm.employee_id),
        uan_number: pfForm.uan_number || null,
        pf_number: pfForm.pf_number || null,
      });
      setIsCreatePfOpen(false);
      fetchPfAccounts();
    } catch (err) { alert(err.message || 'Failed'); }
    finally { setSubmitting(false); }
  };

  const handleBatchPf = async () => {
    const month = prompt('Enter payroll month (YYYY-MM):', new Date().toISOString().slice(0, 7));
    if (!month) return;
    try {
      const res = await api.post('/pf-gratuity/pf/batch-process', { payroll_month: month });
      alert(`Processed: ${res.data.processed} | Skipped: ${res.data.skipped} | Errors: ${res.data.errors}`);
      fetchPfAccounts();
    } catch (err) { alert(err.message || 'Failed'); }
  };

  const openViewPf = async (empId) => {
    try {
      const [accRes, txnRes] = await Promise.all([
        api.get(`/pf-gratuity/pf/accounts/${empId}`),
        api.get(`/pf-gratuity/pf/transactions/${empId}?limit=24`),
      ]);
      setSelectedAccount(accRes.data);
      setTransactions(txnRes.data || []);
      setIsViewPfOpen(true);
    } catch (err) { alert('Failed to load PF details'); }
  };

  // ─── Gratuity Actions ─────────────────────────────────────────────────────

  const handleBatchAccrue = async () => {
    const month = prompt('Enter accrual month (YYYY-MM):', new Date().toISOString().slice(0, 7));
    if (!month) return;
    try {
      const res = await api.post('/pf-gratuity/gratuity/batch-accrue', { accrual_month: month });
      alert(`Processed: ${res.data.processed} | Skipped: ${res.data.skipped} | Errors: ${res.data.errors}`);
      fetchLiability();
    } catch (err) { alert(err.message || 'Failed'); }
  };

  return (
    <div className="space-y-6">
      {/* Header + Tabs */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Shield className="w-6 h-6 text-emerald-400" /> PF & Gratuity
          </h1>
          <p className="text-gray-400 mt-1">Provident Fund accounts and Gratuity liability management</p>
        </div>
        <div className="flex gap-2">
          {tab === 'pf' ? (
            <>
              <button onClick={handleBatchPf} className="flex items-center gap-2 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 px-4 py-2 rounded-lg border border-emerald-500/20">
                <Zap className="w-4 h-4" /> Batch Process PF
              </button>
              <button onClick={() => { setPfForm({ employee_id: '', uan_number: '', pf_number: '' }); setIsCreatePfOpen(true); }}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg">
                <Plus className="w-4 h-4" /> New PF Account
              </button>
            </>
          ) : (
            <button onClick={handleBatchAccrue} className="flex items-center gap-2 bg-purple-600/20 text-purple-400 hover:bg-purple-600/30 px-4 py-2 rounded-lg border border-purple-500/20">
              <TrendingUp className="w-4 h-4" /> Batch Accrue
            </button>
          )}
        </div>
      </div>

      <div className="flex bg-gray-800 rounded-lg p-1 w-fit">
        <button onClick={() => setTab('pf')} className={`px-6 py-2 rounded-lg text-sm transition-colors ${tab === 'pf' ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:text-white'}`}>
          <Shield className="w-4 h-4 inline mr-1" /> Provident Fund
        </button>
        <button onClick={() => setTab('gratuity')} className={`px-6 py-2 rounded-lg text-sm transition-colors ${tab === 'gratuity' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}>
          <Award className="w-4 h-4 inline mr-1" /> Gratuity
        </button>
      </div>

      {loading ? <TableSkeleton /> : tab === 'pf' ? (
        /* ═══ PF Accounts Tab ═══ */
        <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 border-b border-gray-700/50">
                  <th className="text-left p-4 font-medium">Employee</th>
                  <th className="text-left p-4 font-medium">UAN</th>
                  <th className="text-right p-4 font-medium">Employee Bal</th>
                  <th className="text-right p-4 font-medium">Employer Bal</th>
                  <th className="text-right p-4 font-medium">EPS</th>
                  <th className="text-right p-4 font-medium">Total</th>
                  <th className="text-right p-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pfAccounts.length === 0 ? (
                  <tr><td colSpan="7" className="p-8 text-center text-gray-500">No PF accounts found. Create one to get started.</td></tr>
                ) : pfAccounts.map(a => (
                  <tr key={a.id} className="border-b border-gray-700/30 hover:bg-gray-700/20 transition-colors">
                    <td className="p-4">
                      <div className="font-medium text-white">{a.full_name}</div>
                      <div className="text-xs text-gray-500">{a.designation} • {a.emp_code}</div>
                    </td>
                    <td className="p-4 text-gray-400 text-xs">{a.uan_number || '—'}</td>
                    <td className="p-4 text-right text-white">{fmt(a.employee_balance)}</td>
                    <td className="p-4 text-right text-gray-300">{fmt(a.employer_balance)}</td>
                    <td className="p-4 text-right text-gray-300">{fmt(a.eps_balance)}</td>
                    <td className="p-4 text-right font-bold text-emerald-400">{fmt(a.total_balance)}</td>
                    <td className="p-4 text-right">
                      <button onClick={() => openViewPf(a.employee_id)} className="p-1.5 rounded-lg hover:bg-gray-700 text-gray-400"><Eye className="w-4 h-4" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ═══ Gratuity Liability Tab ═══ */
        <div className="space-y-4">
          {liabilityReport && (
            <>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4 text-center">
                  <p className="text-gray-400 text-xs">Total Liability</p>
                  <p className="text-2xl font-bold text-purple-400">{fmt(liabilityReport.total_liability)}</p>
                </div>
                <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-4 text-center">
                  <p className="text-gray-400 text-xs">Total Employees</p>
                  <p className="text-2xl font-bold text-white">{liabilityReport.total_employees}</p>
                </div>
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-center">
                  <p className="text-gray-400 text-xs">Eligible (5+ yrs)</p>
                  <p className="text-2xl font-bold text-emerald-400">{liabilityReport.eligible_employees}</p>
                </div>
              </div>

              <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-400 border-b border-gray-700/50">
                      <th className="text-left p-4 font-medium">Employee</th>
                      <th className="text-center p-4 font-medium">Years</th>
                      <th className="text-center p-4 font-medium">Eligible</th>
                      <th className="text-right p-4 font-medium">Gratuity Liability</th>
                      <th className="text-right p-4 font-medium">Provisioned</th>
                      <th className="text-right p-4 font-medium">Gap</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(liabilityReport.employees || []).map(e => (
                      <tr key={e.id} className="border-b border-gray-700/30 hover:bg-gray-700/20">
                        <td className="p-4">
                          <div className="font-medium text-white">{e.full_name}</div>
                          <div className="text-xs text-gray-500">{e.designation}</div>
                        </td>
                        <td className="p-4 text-center text-white">{e.years_of_service}</td>
                        <td className="p-4 text-center">
                          {e.is_eligible
                            ? <span className="text-emerald-400 text-xs bg-emerald-500/10 px-2 py-0.5 rounded">Yes</span>
                            : <span className="text-gray-500 text-xs bg-gray-700/50 px-2 py-0.5 rounded">No</span>}
                        </td>
                        <td className="p-4 text-right text-white">{fmt(e.gratuity_liability)}</td>
                        <td className="p-4 text-right text-emerald-400">{fmt(e.provisioned)}</td>
                        <td className="p-4 text-right text-red-400">{fmt(e.gap)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* ═══ Create PF Modal ═══ */}
      {isCreatePfOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 w-full max-w-sm">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-white">New PF Account</h2>
              <button onClick={() => setIsCreatePfOpen(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleCreatePf} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Employee ID *</label>
                <input type="number" value={pfForm.employee_id} onChange={e => setPfForm({...pfForm, employee_id: e.target.value})} required
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">UAN Number</label>
                <input type="text" value={pfForm.uan_number} onChange={e => setPfForm({...pfForm, uan_number: e.target.value})}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">PF Number</label>
                <input type="text" value={pfForm.pf_number} onChange={e => setPfForm({...pfForm, pf_number: e.target.value})}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white" />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setIsCreatePfOpen(false)} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg">Cancel</button>
                <button type="submit" disabled={submitting} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg">
                  {submitting ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══ View PF Account Modal ═══ */}
      {isViewPfOpen && selectedAccount && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-0 w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
            <div className="p-4 border-b border-gray-700 flex justify-between items-center">
              <h2 className="text-lg font-bold text-white">{selectedAccount.full_name} — PF Account</h2>
              <button onClick={() => setIsViewPfOpen(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 overflow-y-auto space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-400">Total Balance</p>
                  <p className="text-xl font-bold text-emerald-400">{fmt(selectedAccount.total_balance)}</p>
                </div>
                <div className="bg-gray-900/50 border border-gray-700/50 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-400">Employee</p>
                  <p className="text-lg font-bold text-white">{fmt(selectedAccount.employee_balance)}</p>
                </div>
                <div className="bg-gray-900/50 border border-gray-700/50 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-400">Employer + EPS</p>
                  <p className="text-lg font-bold text-white">{fmt((selectedAccount.employer_balance || 0) + (selectedAccount.eps_balance || 0))}</p>
                </div>
              </div>
              <div className="bg-gray-900/50 rounded-lg p-3 grid grid-cols-3 gap-4 text-sm">
                <div><span className="text-gray-500">UAN:</span> <span className="text-white">{selectedAccount.uan_number || 'N/A'}</span></div>
                <div><span className="text-gray-500">PF No:</span> <span className="text-white">{selectedAccount.pf_number || 'N/A'}</span></div>
                <div><span className="text-gray-500">Interest:</span> <span className="text-white">{selectedAccount.interest_rate}%</span></div>
              </div>
              <h3 className="text-sm font-bold text-gray-300 border-b border-gray-700 pb-2">Recent Transactions</h3>
              {transactions.length === 0 ? (
                <p className="text-gray-500 text-sm">No transactions yet.</p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {transactions.map(t => (
                    <div key={t.id} className="flex items-center justify-between bg-gray-900/30 rounded-lg px-3 py-2 text-sm">
                      <div>
                        <span className="text-white font-medium">{t.payroll_month}</span>
                        <span className="text-gray-500 ml-2 text-xs capitalize">{t.transaction_type}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-emerald-400 font-medium">{fmt(t.total_amount)}</span>
                        <span className="text-gray-500 ml-2 text-xs">Bal: {fmt(t.running_balance)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="p-4 border-t border-gray-700">
              <button onClick={() => setIsViewPfOpen(false)} className="w-full bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
