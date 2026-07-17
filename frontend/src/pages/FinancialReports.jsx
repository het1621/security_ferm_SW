import { useState, useEffect } from 'react';
import { TrendingUp, DollarSign, BarChart3, PieChart, ArrowUpRight, ArrowDownRight, Zap, Plus, X } from 'lucide-react';
import api from '../services/api';
import TableSkeleton from '../components/TableSkeleton';

export default function FinancialReports() {
  const [tab, setTab] = useState('kpis'); // kpis | cashflow | budgets
  const [snapshots, setSnapshots] = useState([]);
  const [cashFlow, setCashFlow] = useState(null);
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createBudget, setCreateBudget] = useState(false);
  const [budgetForm, setBudgetForm] = useState({ name: '', financial_year: '2025-26', budget_type: 'annual', notes: '' });

  const fmt = (v) => `₹${Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 0 })}`;

  const fetchSnapshots = async () => {
    try { setLoading(true); const r = await api.get('/financial-reports/snapshots?financial_year=2025-26'); setSnapshots(r.data || []); }
    catch {} finally { setLoading(false); }
  };

  const fetchBudgets = async () => {
    try { setLoading(true); const r = await api.get('/financial-reports/budgets'); setBudgets(r.data || []); }
    catch {} finally { setLoading(false); }
  };

  useEffect(() => {
    if (tab === 'kpis') fetchSnapshots();
    else if (tab === 'budgets') fetchBudgets();
    else setLoading(false);
  }, [tab]);

  const generateSnapshot = async () => {
    const month = prompt('Enter month (YYYY-MM):', new Date().toISOString().slice(0, 7));
    if (!month) return;
    try {
      await api.post('/financial-reports/snapshots/generate', { month });
      alert('Snapshot generated!');
      fetchSnapshots();
    } catch (err) { alert(err.message || 'Failed'); }
  };

  const generateCashFlow = async () => {
    const start = prompt('Start date (YYYY-MM-DD):', `${new Date().getFullYear()}-04-01`);
    if (!start) return;
    const end = prompt('End date (YYYY-MM-DD):', new Date().toISOString().split('T')[0]);
    if (!end) return;
    try {
      setLoading(true);
      const r = await api.post('/financial-reports/cash-flow', { start_date: start, end_date: end });
      setCashFlow(r.data);
    } catch (err) { alert(err.message || 'Failed'); }
    finally { setLoading(false); }
  };

  const handleCreateBudget = async (e) => {
    e.preventDefault();
    try {
      await api.post('/financial-reports/budgets', budgetForm);
      setCreateBudget(false);
      fetchBudgets();
    } catch (err) { alert(err.message || 'Failed'); }
  };

  // ─── KPI Cards ─────────────────────────────────────────────────────────────
  const latestSnapshot = snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-cyan-400" /> Financial Reports
          </h1>
          <p className="text-gray-400 mt-1">Cash flow, KPIs, budgets & variance analysis</p>
        </div>
        <div className="flex gap-2">
          {tab === 'kpis' && (
            <button onClick={generateSnapshot} className="flex items-center gap-2 bg-cyan-600/20 text-cyan-400 hover:bg-cyan-600/30 px-4 py-2 rounded-lg border border-cyan-500/20">
              <Zap className="w-4 h-4" /> Generate Snapshot
            </button>
          )}
          {tab === 'cashflow' && (
            <button onClick={generateCashFlow} className="flex items-center gap-2 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 px-4 py-2 rounded-lg border border-emerald-500/20">
              <Zap className="w-4 h-4" /> Generate Cash Flow
            </button>
          )}
          {tab === 'budgets' && (
            <button onClick={() => setCreateBudget(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg">
              <Plus className="w-4 h-4" /> New Budget
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-gray-800 rounded-lg p-1 w-fit">
        {[
          { id: 'kpis', label: 'KPI Dashboard', icon: TrendingUp },
          { id: 'cashflow', label: 'Cash Flow', icon: DollarSign },
          { id: 'budgets', label: 'Budgets', icon: PieChart },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`px-5 py-2 rounded-lg text-sm transition-colors flex items-center gap-1.5 ${tab === t.id ? 'bg-cyan-600 text-white' : 'text-gray-400 hover:text-white'}`}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {/* ═══ KPI Dashboard Tab ═══ */}
      {tab === 'kpis' && (loading ? <TableSkeleton /> : (
        <div className="space-y-6">
          {latestSnapshot ? (
            <>
              <div className="grid grid-cols-4 gap-4">
                {[
                  { label: 'Revenue', value: fmt(latestSnapshot.total_revenue), color: 'cyan', icon: DollarSign },
                  { label: 'Net Profit', value: fmt(latestSnapshot.net_profit), color: latestSnapshot.net_profit >= 0 ? 'emerald' : 'red', icon: latestSnapshot.net_profit >= 0 ? ArrowUpRight : ArrowDownRight },
                  { label: 'Gross Margin', value: `${latestSnapshot.gross_margin}%`, color: 'blue', icon: TrendingUp },
                  { label: 'Net Margin', value: `${latestSnapshot.net_margin}%`, color: 'purple', icon: TrendingUp },
                ].map((kpi, i) => (
                  <div key={i} className={`bg-${kpi.color}-500/10 border border-${kpi.color}-500/20 rounded-xl p-5`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-400 text-xs">{kpi.label}</span>
                      <kpi.icon className={`w-4 h-4 text-${kpi.color}-400`} />
                    </div>
                    <p className={`text-2xl font-bold text-${kpi.color}-400`}>{kpi.value}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-4 gap-4">
                {[
                  { label: 'DSO (Days Sales Outstanding)', value: `${latestSnapshot.dso} days` },
                  { label: 'Current Ratio', value: latestSnapshot.current_ratio },
                  { label: 'Employee Count', value: latestSnapshot.employee_count },
                  { label: 'Revenue/Employee', value: fmt(latestSnapshot.revenue_per_employee) },
                ].map((kpi, i) => (
                  <div key={i} className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-4 text-center">
                    <p className="text-xs text-gray-500 mb-1">{kpi.label}</p>
                    <p className="text-xl font-bold text-white">{kpi.value}</p>
                  </div>
                ))}
              </div>

              <p className="text-xs text-gray-500 text-right">Latest snapshot: {latestSnapshot.snapshot_month}</p>
            </>
          ) : (
            <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-12 text-center text-gray-500">
              No snapshots generated yet. Click "Generate Snapshot" to create one.
            </div>
          )}

          {/* Snapshot History */}
          {snapshots.length > 0 && (
            <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl overflow-hidden">
              <h3 className="text-sm font-bold text-gray-300 p-4 border-b border-gray-700/50">Monthly Trend</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-400 border-b border-gray-700/50">
                    <th className="text-left p-3 font-medium">Month</th>
                    <th className="text-right p-3 font-medium">Revenue</th>
                    <th className="text-right p-3 font-medium">Expenses</th>
                    <th className="text-right p-3 font-medium">Net Profit</th>
                    <th className="text-right p-3 font-medium">Margin</th>
                    <th className="text-right p-3 font-medium">DSO</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshots.map(s => (
                    <tr key={s.id} className="border-b border-gray-700/30 hover:bg-gray-700/20">
                      <td className="p-3 text-white font-medium">{s.snapshot_month}</td>
                      <td className="p-3 text-right text-white">{fmt(s.total_revenue)}</td>
                      <td className="p-3 text-right text-red-400">{fmt(s.total_expenses)}</td>
                      <td className={`p-3 text-right font-medium ${s.net_profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fmt(s.net_profit)}</td>
                      <td className="p-3 text-right text-gray-300">{s.net_margin}%</td>
                      <td className="p-3 text-right text-gray-300">{s.dso}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ))}

      {/* ═══ Cash Flow Tab ═══ */}
      {tab === 'cashflow' && (loading ? <TableSkeleton /> : (
        <div className="space-y-4">
          {cashFlow ? (
            <>
              <div className="text-xs text-gray-500 mb-2">Period: {cashFlow.period.start} to {cashFlow.period.end}</div>
              {/* Operating */}
              <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-5">
                <h3 className="text-sm font-bold text-emerald-400 mb-3">A. Cash Flow from Operating Activities</h3>
                <div className="space-y-2 text-sm">
                  {[
                    ['Cash from Customers', cashFlow.operating_activities.cash_from_customers, true],
                    ['Cash Paid to Suppliers', cashFlow.operating_activities.cash_paid_to_suppliers],
                    ['Cash Paid to Employees', cashFlow.operating_activities.cash_paid_to_employees],
                    ['Change in Receivables', cashFlow.operating_activities.change_in_receivables],
                  ].map(([label, val], i) => (
                    <div key={i} className="flex justify-between">
                      <span className="text-gray-400">{label}</span>
                      <span className={val >= 0 ? 'text-emerald-400' : 'text-red-400'}>{fmt(val)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between border-t border-gray-700 pt-2 font-bold">
                    <span className="text-white">Net Operating Cash Flow</span>
                    <span className={cashFlow.operating_activities.net_operating_cash_flow >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                      {fmt(cashFlow.operating_activities.net_operating_cash_flow)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Investing */}
              <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-5">
                <h3 className="text-sm font-bold text-blue-400 mb-3">B. Cash Flow from Investing Activities</h3>
                <div className="flex justify-between text-sm font-bold">
                  <span className="text-white">Net Investing Cash Flow</span>
                  <span className="text-gray-400">{fmt(cashFlow.investing_activities.net_investing_cash_flow)}</span>
                </div>
              </div>

              {/* Financing */}
              <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-5">
                <h3 className="text-sm font-bold text-purple-400 mb-3">C. Cash Flow from Financing Activities</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">PF Deposits</span>
                    <span className="text-red-400">{fmt(cashFlow.financing_activities.pf_deposits)}</span>
                  </div>
                  <div className="flex justify-between border-t border-gray-700 pt-2 font-bold">
                    <span className="text-white">Net Financing Cash Flow</span>
                    <span className={cashFlow.financing_activities.net_financing_cash_flow >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                      {fmt(cashFlow.financing_activities.net_financing_cash_flow)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Net */}
              <div className={`rounded-xl p-5 text-center border ${cashFlow.net_cash_flow >= 0 ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                <p className="text-sm text-gray-400 mb-1">Net Cash Flow (A + B + C)</p>
                <p className={`text-3xl font-bold ${cashFlow.net_cash_flow >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fmt(cashFlow.net_cash_flow)}</p>
              </div>
            </>
          ) : (
            <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-12 text-center text-gray-500">
              Click "Generate Cash Flow" to create a cash flow statement for any period.
            </div>
          )}
        </div>
      ))}

      {/* ═══ Budgets Tab ═══ */}
      {tab === 'budgets' && (loading ? <TableSkeleton /> : (
        <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-400 border-b border-gray-700/50">
                <th className="text-left p-4 font-medium">Name</th>
                <th className="text-left p-4 font-medium">FY</th>
                <th className="text-left p-4 font-medium">Type</th>
                <th className="text-right p-4 font-medium">Revenue Budget</th>
                <th className="text-right p-4 font-medium">Expense Budget</th>
                <th className="text-center p-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {budgets.length === 0 ? (
                <tr><td colSpan="6" className="p-8 text-center text-gray-500">No budgets created yet.</td></tr>
              ) : budgets.map(b => (
                <tr key={b.id} className="border-b border-gray-700/30 hover:bg-gray-700/20">
                  <td className="p-4 text-white font-medium">{b.name}</td>
                  <td className="p-4 text-gray-300">{b.financial_year}</td>
                  <td className="p-4"><span className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded capitalize">{b.budget_type}</span></td>
                  <td className="p-4 text-right text-white">{fmt(b.total_revenue_budget)}</td>
                  <td className="p-4 text-right text-gray-300">{fmt(b.total_expense_budget)}</td>
                  <td className="p-4 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      b.status === 'approved' ? 'bg-emerald-500/20 text-emerald-400' :
                      b.status === 'active' ? 'bg-blue-500/20 text-blue-400' :
                      'bg-gray-700 text-gray-400'
                    } capitalize`}>{b.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      {/* ═══ Create Budget Modal ═══ */}
      {createBudget && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 w-full max-w-sm">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-white">New Budget</h2>
              <button onClick={() => setCreateBudget(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleCreateBudget} className="space-y-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Name *</label>
                <input type="text" value={budgetForm.name} onChange={e => setBudgetForm({...budgetForm, name: e.target.value})} required
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white" placeholder="FY 2025-26 Annual Budget" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Financial Year *</label>
                  <input type="text" value={budgetForm.financial_year} onChange={e => setBudgetForm({...budgetForm, financial_year: e.target.value})} required
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Type</label>
                  <select value={budgetForm.budget_type} onChange={e => setBudgetForm({...budgetForm, budget_type: e.target.value})}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white">
                    <option value="annual">Annual</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Notes</label>
                <textarea value={budgetForm.notes} onChange={e => setBudgetForm({...budgetForm, notes: e.target.value})} rows={2}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white" />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setCreateBudget(false)} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg">Cancel</button>
                <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
