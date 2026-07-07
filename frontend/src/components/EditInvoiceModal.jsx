import React, { useState, useEffect } from 'react';
import { X, FileEdit } from 'lucide-react';
import api from '../services/api';

export default function EditInvoiceModal({ isOpen, onClose, onSuccess, invoice }) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({
    amount_subtotal: '',
    discount_amount: '0',
    tax_type: 'none',
    is_rcm_applicable: false,
    due_date: '',
    notes: ''
  });

  useEffect(() => {
    if (invoice) {
      setForm({
        amount_subtotal: invoice.amount_subtotal || '',
        discount_amount: invoice.discount_amount || '0',
        tax_type: invoice.tax_type || 'none',
        is_rcm_applicable: Boolean(invoice.is_rcm_applicable),
        due_date: invoice.due_date ? new Date(invoice.due_date).toISOString().split('T')[0] : '',
        notes: invoice.notes || ''
      });
    }
  }, [invoice]);

  if (!isOpen || !invoice) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api.put(`/invoices/${invoice.id}`, form);
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update invoice');
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls = "w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all text-sm";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-slide-up">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <FileEdit className="w-5 h-5 text-teal-600" /> Edit Invoice
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {error && <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg">{error}</div>}

          <div className="mb-4 p-3 bg-slate-50 rounded-lg text-sm">
            <p className="font-medium text-slate-800">{invoice.invoice_number}</p>
            <p className="text-slate-500 mt-1">{invoice.client_name}</p>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Subtotal Amount *</label>
                <input required type="number" step="0.01" min="0" value={form.amount_subtotal} onChange={e => setForm({...form, amount_subtotal: e.target.value})} className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Discount Amount</label>
                <input type="number" step="0.01" min="0" value={form.discount_amount} onChange={e => setForm({...form, discount_amount: e.target.value})} className={inputCls} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tax Type</label>
                <select value={form.tax_type} onChange={e => setForm({...form, tax_type: e.target.value})} className={inputCls}>
                  <option value="none">No Tax</option>
                  <option value="cgst_sgst">CGST + SGST (18%)</option>
                  <option value="igst">IGST (18%)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Due Date</label>
                <input required type="date" value={form.due_date} onChange={e => setForm({...form, due_date: e.target.value})} className={inputCls} />
              </div>
            </div>

            <div className="flex items-center p-3 bg-amber-50 rounded-lg border border-amber-100 mt-2">
              <input type="checkbox" id="edit_rcm" checked={form.is_rcm_applicable} onChange={e => setForm({...form, is_rcm_applicable: e.target.checked})} className="h-4 w-4 text-amber-600 focus:ring-amber-500 rounded border-amber-300" />
              <label htmlFor="edit_rcm" className="ml-2 block text-sm font-medium text-amber-900 cursor-pointer">
                Apply RCM (Reverse Charge Mechanism)
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Notes / Particulars</label>
              <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} rows="2" className={inputCls} placeholder="Optional notes for the invoice..." />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-5 mt-5 border-t border-slate-100">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 shadow-sm disabled:opacity-50 transition-all">
              {submitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
