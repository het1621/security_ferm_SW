import { useState, useEffect } from 'react';
import { FileText, CheckCircle, XCircle, Zap, Clock, Banknote, Search, CheckSquare, X, Eye } from 'lucide-react';
import api from '../services/api';
import Pagination from '../components/Pagination';
import TableSkeleton from '../components/TableSkeleton';
import { format } from 'date-fns';

const STATUS_STYLES = {
  draft: 'bg-gray-500/20 text-gray-400 border border-gray-500/30',
  pending: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
  approved: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
  paid: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
  cancelled: 'bg-red-500/20 text-red-400 border border-red-500/30',
};

export default function SalarySlips() {
  const [slips, setSlips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [filterMonth, setFilterMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [filterStatus, setFilterStatus] = useState('');
  
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isPayOpen, setIsPayOpen] = useState(false);
  const [selectedSlip, setSelectedSlip] = useState(null);
  
  const [generating, setGenerating] = useState(false);
  const [payForm, setPayForm] = useState({ payment_method: 'bank_transfer', transaction_reference: '' });

  const fetchSlips = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page, limit: 20 });
      if (filterMonth) params.append('payroll_month', filterMonth);
      if (filterStatus) params.append('status', filterStatus);
      
      const res = await api.get(`/salary-slips?${params}`);
      setSlips(res.data || []);
      if (res.summary) setSummary(res.summary);
      if (res.pagination) setPagination(res.pagination);
    } catch (err) {
      console.error('Failed to fetch salary slips', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSlips(); }, [page, filterMonth, filterStatus]);

  // ─── Actions ─────────────────────────────────────────────────────────────────

  const handleBatchGenerate = async () => {
    if (!window.confirm(`Generate all missing salary slips for ${filterMonth}?`)) return;
    setGenerating(true);
    try {
      const res = await api.post('/salary-slips/batch-generate', { payroll_month: filterMonth });
      alert(`Generated: ${res.data.generated}\nSkipped (exists): ${res.data.skipped}\nErrors: ${res.data.errors}`);
      fetchSlips();
    } catch (err) {
      alert(err.message || 'Failed to generate');
    } finally {
      setGenerating(false);
    }
  };

  const handleBulkApprove = async () => {
    if (!window.confirm(`Approve ALL pending salary slips for ${filterMonth}?`)) return;
    try {
      const res = await api.post('/salary-slips/bulk-approve', { payroll_month: filterMonth });
      alert(`Approved ${res.data.approved} slips.`);
      fetchSlips();
    } catch (err) {
      alert(err.message || 'Failed to approve');
    }
  };

  const handleAction = async (id, action) => {
    try {
      await api.post(`/salary-slips/${id}/${action}`);
      fetchSlips();
      if (isViewOpen && selectedSlip?.id === id) {
        const res = await api.get(`/salary-slips/${id}`);
        setSelectedSlip(res.data);
      }
    } catch (err) {
      alert(err.message || `Failed to ${action}`);
    }
  };

  const handlePay = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/salary-slips/${selectedSlip.id}/pay`, payForm);
      setIsPayOpen(false);
      fetchSlips();
      if (isViewOpen) {
        const res = await api.get(`/salary-slips/${selectedSlip.id}`);
        setSelectedSlip(res.data);
      }
    } catch (err) {
      alert(err.message || 'Failed to mark as paid');
    }
  };

  const openView = async (id) => {
    try {
      const res = await api.get(`/salary-slips/${id}`);
      setSelectedSlip(res.data);
      setIsViewOpen(true);
    } catch (err) {
      alert('Failed to load slip details');
    }
  };

  const openPay = (slip) => {
    setSelectedSlip(slip);
    setPayForm({ payment_method: 'bank_transfer', transaction_reference: '' });
    setIsPayOpen(true);
  };

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-400" /> Salary Slips
          </h1>
          <p className="text-gray-400 mt-1">Manage payroll generation, approvals, and payouts</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleBulkApprove} className="flex items-center gap-2 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 px-4 py-2 rounded-lg transition-colors border border-emerald-500/20">
            <CheckSquare className="w-4 h-4" /> Bulk Approve
          </button>
          <button onClick={handleBatchGenerate} disabled={generating} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white px-4 py-2 rounded-lg transition-colors">
            <Zap className="w-4 h-4" /> {generating ? 'Generating...' : 'Batch Generate'}
          </button>
        </div>
      </div>

      {/* Filters & Stats */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-gray-800/30 p-4 rounded-xl border border-gray-700/50">
        <div className="flex gap-3">
          <input type="month" value={filterMonth} onChange={e => { setFilterMonth(e.target.value); setPage(1); }}
            className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" />
          <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
            className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm">
            <option value="">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="pending">Pending Approval</option>
            <option value="approved">Approved</option>
            <option value="paid">Paid</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {summary && (
          <div className="flex gap-6 text-sm">
            <div className="text-center">
              <div className="text-gray-400 text-xs">Total Net Payout</div>
              <div className="font-bold text-white">₹{Number(summary.sum_net || 0).toLocaleString('en-IN')}</div>
            </div>
            <div className="flex gap-3">
              <div className="bg-amber-500/10 text-amber-400 px-3 py-1 rounded-lg border border-amber-500/20">
                <span className="font-bold">{summary.pending_count || 0}</span> Pending
              </div>
              <div className="bg-blue-500/10 text-blue-400 px-3 py-1 rounded-lg border border-blue-500/20">
                <span className="font-bold">{summary.approved_count || 0}</span> Approved
              </div>
              <div className="bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-lg border border-emerald-500/20">
                <span className="font-bold">{summary.paid_count || 0}</span> Paid
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      {loading ? <TableSkeleton /> : (
        <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 border-b border-gray-700/50">
                  <th className="text-left p-4 font-medium">Employee</th>
                  <th className="text-center p-4 font-medium">Structure</th>
                  <th className="text-center p-4 font-medium">Days</th>
                  <th className="text-right p-4 font-medium">Gross</th>
                  <th className="text-right p-4 font-medium">Deductions</th>
                  <th className="text-right p-4 font-medium">Net Pay</th>
                  <th className="text-center p-4 font-medium">Status</th>
                  <th className="text-right p-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {slips.length === 0 ? (
                  <tr><td colSpan="8" className="p-8 text-center text-gray-500">No salary slips found for {filterMonth}.</td></tr>
                ) : slips.map(s => (
                  <tr key={s.id} className="border-b border-gray-700/30 hover:bg-gray-700/20 transition-colors">
                    <td className="p-4">
                      <div className="font-medium text-white">{s.employee_name}</div>
                      <div className="text-xs text-gray-500">{s.designation} • {s.emp_code}</div>
                    </td>
                    <td className="p-4 text-center text-gray-400 text-xs">{s.structure_name || 'Legacy'}</td>
                    <td className="p-4 text-center">
                      <span className="text-white">{s.days_worked}</span>
                      <span className="text-gray-500 text-xs">/{s.days_in_month}</span>
                    </td>
                    <td className="p-4 text-right text-gray-300">₹{Number(s.total_earnings).toLocaleString('en-IN')}</td>
                    <td className="p-4 text-right text-red-400/80">₹{Number(s.total_deductions).toLocaleString('en-IN')}</td>
                    <td className="p-4 text-right font-bold text-emerald-400">₹{Number(s.net_salary).toLocaleString('en-IN')}</td>
                    <td className="p-4 text-center">
                      <span className={`px-2.5 py-1 rounded text-xs font-medium capitalize ${STATUS_STYLES[s.status]}`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openView(s.id)} title="View Detail" className="p-1.5 rounded-lg hover:bg-gray-700 text-gray-400 transition-colors"><Eye className="w-4 h-4" /></button>
                        
                        {s.status === 'draft' && (
                          <button onClick={() => handleAction(s.id, 'submit')} title="Submit for Approval" className="p-1.5 rounded-lg hover:bg-amber-500/20 text-amber-400"><Clock className="w-4 h-4" /></button>
                        )}
                        {s.status === 'pending' && (
                          <button onClick={() => handleAction(s.id, 'approve')} title="Approve" className="p-1.5 rounded-lg hover:bg-blue-500/20 text-blue-400"><CheckCircle className="w-4 h-4" /></button>
                        )}
                        {s.status === 'approved' && (
                          <button onClick={() => openPay(s)} title="Mark Paid" className="p-1.5 rounded-lg hover:bg-emerald-500/20 text-emerald-400"><Banknote className="w-4 h-4" /></button>
                        )}
                        {(s.status === 'draft' || s.status === 'pending') && (
                          <button onClick={() => handleAction(s.id, 'cancel')} title="Cancel" className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-400"><XCircle className="w-4 h-4" /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {pagination && pagination.total > 20 && (
            <Pagination pagination={pagination} page={page} setPage={setPage} />
          )}
        </div>
      )}

      {/* ─── View Modal ────────────────────────────────────────────────────────── */}
      {isViewOpen && selectedSlip && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-0 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-gray-800/80">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-400" /> Salary Slip - {selectedSlip.payroll_month}
              </h2>
              <div className="flex items-center gap-3">
                <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${STATUS_STYLES[selectedSlip.status]}`}>
                  {selectedSlip.status}
                </span>
                <button onClick={() => setIsViewOpen(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-6">
              {/* Employee Info Box */}
              <div className="bg-gray-900/50 border border-gray-700/50 rounded-xl p-4 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500 text-xs mb-1">Employee</p>
                  <p className="text-white font-medium">{selectedSlip.employee_name}</p>
                  <p className="text-gray-400 text-xs">{selectedSlip.designation} ({selectedSlip.emp_code})</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs mb-1">Attendance</p>
                  <p className="text-white font-medium">{selectedSlip.days_worked} <span className="text-gray-500 text-xs font-normal">/ {selectedSlip.days_in_month} days</span></p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs mb-1">Bank Details</p>
                  <p className="text-white">{selectedSlip.bank_name || 'N/A'}</p>
                  <p className="text-gray-400 text-xs">{selectedSlip.bank_account_number ? `A/c: ${selectedSlip.bank_account_number}` : ''}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs mb-1">Tax / Legal</p>
                  <p className="text-white text-xs">PAN: {selectedSlip.pan_number || 'N/A'}</p>
                  <p className="text-gray-400 text-xs">Aadhar: {selectedSlip.aadhar_number || 'N/A'}</p>
                </div>
              </div>

              {/* Earnings & Deductions Split */}
              <div className="grid grid-cols-2 gap-6">
                {/* Earnings */}
                <div>
                  <h3 className="text-sm font-bold text-gray-300 mb-3 border-b border-gray-700 pb-2">Earnings</h3>
                  <div className="space-y-2">
                    {selectedSlip.earnings?.map(e => (
                      <div key={e.id} className="flex justify-between text-sm">
                        <span className="text-gray-400">{e.component_name}</span>
                        <span className="text-white font-medium">₹{Number(e.amount).toLocaleString('en-IN')}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between text-sm font-bold text-white mt-4 pt-3 border-t border-gray-700/50">
                    <span>Gross Salary</span>
                    <span>₹{Number(selectedSlip.total_earnings).toLocaleString('en-IN')}</span>
                  </div>
                </div>

                {/* Deductions */}
                <div>
                  <h3 className="text-sm font-bold text-gray-300 mb-3 border-b border-gray-700 pb-2">Deductions</h3>
                  <div className="space-y-2">
                    {selectedSlip.deductions?.length === 0 ? (
                      <div className="text-gray-500 text-sm italic">No deductions</div>
                    ) : selectedSlip.deductions?.map(d => (
                      <div key={d.id} className="flex justify-between text-sm">
                        <span className="text-gray-400">{d.component_name}</span>
                        <span className="text-red-400">₹{Number(d.amount).toLocaleString('en-IN')}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between text-sm font-bold text-red-400 mt-4 pt-3 border-t border-gray-700/50">
                    <span>Total Deductions</span>
                    <span>₹{Number(selectedSlip.total_deductions).toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>

              {/* Net Pay Highlight */}
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 flex justify-between items-center">
                <span className="text-emerald-400 font-medium">Net Payable</span>
                <span className="text-2xl font-bold text-emerald-400">₹{Number(selectedSlip.net_salary).toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* Modal Actions Footer */}
            <div className="p-4 border-t border-gray-700 bg-gray-800/80 flex justify-end gap-3">
              {selectedSlip.status === 'draft' && (
                <button onClick={() => handleAction(selectedSlip.id, 'submit')} className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg text-sm transition-colors">Submit for Approval</button>
              )}
              {selectedSlip.status === 'pending' && (
                <button onClick={() => handleAction(selectedSlip.id, 'approve')} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition-colors">Approve</button>
              )}
              {selectedSlip.status === 'approved' && (
                <button onClick={() => openPay(selectedSlip)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm transition-colors">Mark as Paid</button>
              )}
              <button onClick={() => setIsViewOpen(false)} className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm transition-colors">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Pay Modal ─────────────────────────────────────────────────────────── */}
      {isPayOpen && selectedSlip && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 w-full max-w-sm">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4"><Banknote className="w-5 h-5 text-emerald-400" /> Mark as Paid</h2>
            <div className="mb-4 p-3 bg-gray-900/50 rounded-lg text-sm">
              <div className="text-gray-400">Paying <span className="text-white font-medium">{selectedSlip.employee_name}</span></div>
              <div className="text-emerald-400 font-bold text-xl mt-1">₹{Number(selectedSlip.net_salary).toLocaleString('en-IN')}</div>
            </div>
            <form onSubmit={handlePay} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Payment Method</label>
                <select value={payForm.payment_method} onChange={e => setPayForm({...payForm, payment_method: e.target.value})} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white">
                  <option value="bank_transfer">Bank Transfer (NEFT/RTGS)</option>
                  <option value="upi">UPI</option>
                  <option value="cheque">Cheque</option>
                  <option value="cash">Cash</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Transaction Ref (optional)</label>
                <input type="text" value={payForm.transaction_reference} onChange={e => setPayForm({...payForm, transaction_reference: e.target.value})} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white" placeholder="UTR / Cheque No." />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setIsPayOpen(false)} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg">Cancel</button>
                <button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-lg">Confirm Pay</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
