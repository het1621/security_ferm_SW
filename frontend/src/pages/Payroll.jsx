import { useState, useEffect } from 'react';
import { Banknote, Calculator, Download, CheckCircle, Search, AlertCircle, X } from 'lucide-react';
import api from '../services/api';
import Pagination from '../components/Pagination';
import TableSkeleton from '../components/TableSkeleton';
import { format } from 'date-fns';

export default function Payroll() {
  const [payroll, setPayroll] = useState([]);
  const [loading, setLoading] = useState(true);
  const [monthFilter, setMonthFilter] = useState(format(new Date(), 'yyyy-MM'));
  const [submitting, setSubmitting] = useState(false);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [selectedPayroll, setSelectedPayroll] = useState(null);
  const [payForm, setPayForm] = useState({
    payment_date: format(new Date(), 'yyyy-MM-dd'),
    payment_method: 'bank_transfer',
    transaction_reference: ''
  });
  const [error, setError] = useState('');
  const [runResult, setRunResult] = useState(null);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);

  const fetchPayroll = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/payroll?month=${monthFilter}&page=${page}&limit=25`);
      setPayroll(response.data || []);
      if (response.pagination) setPagination(response.pagination);
    } catch (err) {
      console.error('Failed to fetch payroll', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPayroll(); }, [monthFilter, page]);

  useEffect(() => { setPage(1); }, [monthFilter]);

  const handleRunPayroll = async () => {
    setSubmitting(true);
    setRunResult(null);
    try {
      const month = `${monthFilter}-01`;
      const response = await api.post('/payroll/calculate', { month });
      const msg = response.message || `Payroll calculated for ${(response.data || []).length} employees`;
      const errCount = (response.errors || []).length;
      setRunResult({
        success: true,
        message: errCount > 0 ? `${msg}. ${errCount} error(s) occurred.` : msg,
        errors: response.errors
      });
      fetchPayroll();
    } catch (err) {
      setRunResult({ success: false, message: err.message || 'Failed to calculate payroll' });
    } finally {
      setSubmitting(false);
    }
  };

  const openPayModal = (pay) => {
    setSelectedPayroll(pay);
    setPayForm({
      payment_date: format(new Date(), 'yyyy-MM-dd'),
      payment_method: 'bank_transfer',
      transaction_reference: ''
    });
    setError('');
    setIsPayModalOpen(true);
  };

  const handleMarkPaid = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await api.put(`/payroll/${selectedPayroll.id}/mark-paid`, payForm);
      setIsPayModalOpen(false);
      setSelectedPayroll(null);
      fetchPayroll();
    } catch (err) {
      setError(err.message || 'Failed to mark as paid');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadPDF = async (pay) => {
    try {
      setLoading(true);
      const response = await api.get(`/payroll/${pay.id}/pdf`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Payslip-${pay.employee_name.replace(/\s+/g, '_')}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error(err);
      alert('Failed to download Payslip PDF from server');
    } finally {
      setLoading(false);
    }
  };

  const inputCls = "w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm";

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Banknote className="w-6 h-6 text-teal-600" />
            Payroll Processing
          </h1>
          <p className="text-slate-500 text-sm mt-1">Generate salary slips and manage employee payouts.</p>
        </div>
        <div className="flex items-center gap-3">
          <input type="month" value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:ring-2 focus:ring-teal-500 outline-none" />
          <button onClick={handleRunPayroll} disabled={submitting}
            className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50">
            <Calculator className="w-4 h-4" />
            {submitting ? 'Processing...' : 'Run Payroll for Month'}
          </button>
        </div>
      </div>

      {runResult && (
        <div className={`p-4 rounded-lg text-sm border ${runResult.success ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
          <div className="font-medium">{runResult.message}</div>
          {runResult.errors && runResult.errors.length > 0 && (
            <ul className="mt-2 list-disc list-inside text-xs space-y-1">
              {runResult.errors.map((err, i) => (
                <li key={i}>{err.error}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 font-semibold">Employee</th>
                <th className="px-6 py-4 font-semibold">Attendance</th>
                <th className="px-6 py-4 font-semibold">Gross Salary</th>
                <th className="px-6 py-4 font-semibold">Deductions (PF/ESI)</th>
                <th className="px-6 py-4 font-semibold text-right">Net Payable</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="7">
                    <TableSkeleton columns={7} rows={10} />
                  </td>
                </tr>
              ) : payroll.length === 0 ? (
                <tr><td colSpan="7" className="px-6 py-12 text-center text-slate-500">
                  <div className="flex justify-center mb-3"><Banknote className="w-10 h-10 text-slate-300" /></div>
                  <p className="font-medium text-slate-600 mb-1">No payroll generated for {monthFilter}</p>
                  <p className="text-xs">Click "Run Payroll" to generate salary data based on attendance.</p>
                </td></tr>
              ) : (
                payroll.map((pay) => (
                  <tr key={pay.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900">{pay.employee_name}</div>
                      <div className="text-slate-500 text-xs mt-0.5">{pay.emp_id}</div>
                    </td>
                    <td className="px-6 py-4 text-xs">
                      <div className="font-medium text-slate-700">{pay.days_worked} Days Worked</div>
                      <div className="text-slate-500">of {pay.days_in_month} Days</div>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-800">
                      ₹{parseFloat(pay.gross_salary).toLocaleString('en-IN')}
                    </td>
                    <td className="px-6 py-4 text-red-600 font-medium text-xs">
                      -₹{parseFloat(pay.total_deductions).toLocaleString('en-IN')}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="font-bold text-teal-700 text-base">₹{parseFloat(pay.net_salary).toLocaleString('en-IN')}</div>
                    </td>
                    <td className="px-6 py-4">
                      {pay.payment_status === 'paid' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                          <CheckCircle className="w-3.5 h-3.5" /> Paid
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                          <AlertCircle className="w-3.5 h-3.5" /> Pending
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => handleDownloadPDF(pay)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Download Payslip">
                          <Download className="w-4 h-4" />
                        </button>
                        {pay.payment_status === 'pending' && (
                          <button onClick={() => openPayModal(pay)}
                            className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Mark as Paid">
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination pagination={pagination} onPageChange={setPage} />
      </div>

      {/* Mark as Paid Modal */}
      {isPayModalOpen && selectedPayroll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-slide-up">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-600" /> Mark Salary as Paid
              </h3>
              <button onClick={() => setIsPayModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleMarkPaid} className="p-6">
              {error && <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg">{error}</div>}
              <div className="mb-4 p-3 bg-slate-50 rounded-lg text-sm">
                <p className="font-medium text-slate-800">{selectedPayroll.employee_name} ({selectedPayroll.emp_id})</p>
                <p className="text-teal-700 font-bold mt-1">Net Payable: ₹{parseFloat(selectedPayroll.net_salary).toLocaleString('en-IN')}</p>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Payment Date</label>
                  <input type="date" value={payForm.payment_date} onChange={(e) => setPayForm({ ...payForm, payment_date: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Payment Method</label>
                  <select value={payForm.payment_method} onChange={(e) => setPayForm({ ...payForm, payment_method: e.target.value })} className={inputCls}>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="upi">UPI</option>
                    <option value="cash">Cash</option>
                    <option value="cheque">Cheque</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Transaction Reference</label>
                  <input type="text" value={payForm.transaction_reference} onChange={(e) => setPayForm({ ...payForm, transaction_reference: e.target.value })} className={inputCls} placeholder="e.g., UTR number or cheque no." />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 mt-4 border-t border-slate-100">
                <button type="button" onClick={() => setIsPayModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={submitting} className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 shadow-sm disabled:opacity-50">
                  {submitting ? 'Processing...' : 'Mark as Paid'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
