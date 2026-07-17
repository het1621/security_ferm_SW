import { useState, useEffect } from 'react';
import { FileText, Settings, Layers, Download, Eye, X, Plus, Zap, ChevronRight } from 'lucide-react';
import api from '../services/api';
import TableSkeleton from '../components/TableSkeleton';

export default function GSTCompliance() {
  const [tab, setTab] = useState('returns'); // returns | hsn | config
  const [filings, setFilings] = useState([]);
  const [hsnCodes, setHsnCodes] = useState([]);
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewFiling, setViewFiling] = useState(null);

  // Config form
  const [configForm, setConfigForm] = useState({
    gstin: '', legal_name: '', trade_name: '', state_code: '24', state_name: 'Gujarat',
    registration_type: 'regular', default_tax_rate: 18, financial_year: '2025-26',
  });

  const fetchFilings = async () => { try { setLoading(true); const r = await api.get('/gst/filings?limit=24'); setFilings(r.data || []); } catch {} finally { setLoading(false); } };
  const fetchHSN = async () => { try { setLoading(true); const r = await api.get('/gst/hsn-sac'); setHsnCodes(r.data || []); } catch {} finally { setLoading(false); } };
  const fetchConfig = async () => { try { const r = await api.get('/gst/config'); setConfig(r.data); if (r.data) setConfigForm(r.data); } catch {} };

  useEffect(() => {
    fetchConfig();
    if (tab === 'returns') fetchFilings();
    else if (tab === 'hsn') fetchHSN();
  }, [tab]);

  const fmt = (v) => `₹${Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

  // ─── Generate Returns ──────────────────────────────────────────────────────
  const generateReturn = async (type) => {
    const period = prompt('Enter return period (YYYY-MM):', new Date().toISOString().slice(0, 7));
    if (!period) return;
    try {
      const endpoint = type === 'GSTR1' ? '/gst/gstr1/generate' : '/gst/gstr3b/generate';
      const res = await api.post(endpoint, { return_period: period });
      alert(`${type} generated! ${res.data.summary?.total_invoices || 0} invoices processed.`);
      fetchFilings();
    } catch (err) { alert(err.message || 'Generation failed'); }
  };

  const saveConfig = async (e) => {
    e.preventDefault();
    try {
      await api.post('/gst/config', configForm);
      alert('GST configuration saved!');
      fetchConfig();
    } catch (err) { alert(err.message || 'Failed to save'); }
  };

  const openFiling = async (id) => {
    try {
      const r = await api.get(`/gst/filings/${id}`);
      setViewFiling(r.data);
    } catch { alert('Failed to load filing'); }
  };

  const downloadFiling = (id) => {
    window.open(`/api/gst/filings/${id}/download`, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <FileText className="w-6 h-6 text-indigo-400" /> GST Compliance
          </h1>
          <p className="text-gray-400 mt-1">GSTR-1, GSTR-3B Returns & HSN/SAC Codes</p>
        </div>
        {tab === 'returns' && (
          <div className="flex gap-2">
            <button onClick={() => generateReturn('GSTR1')} className="flex items-center gap-2 bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600/30 px-4 py-2 rounded-lg border border-indigo-500/20">
              <Zap className="w-4 h-4" /> Generate GSTR-1
            </button>
            <button onClick={() => generateReturn('GSTR3B')} className="flex items-center gap-2 bg-purple-600/20 text-purple-400 hover:bg-purple-600/30 px-4 py-2 rounded-lg border border-purple-500/20">
              <Zap className="w-4 h-4" /> Generate GSTR-3B
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex bg-gray-800 rounded-lg p-1 w-fit">
        {[
          { id: 'returns', label: 'GST Returns', icon: FileText },
          { id: 'hsn', label: 'HSN/SAC Codes', icon: Layers },
          { id: 'config', label: 'Configuration', icon: Settings },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`px-5 py-2 rounded-lg text-sm transition-colors flex items-center gap-1.5 ${tab === t.id ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {/* ═══ Returns Tab ═══ */}
      {tab === 'returns' && (loading ? <TableSkeleton /> : (
        <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-400 border-b border-gray-700/50">
                <th className="text-left p-4 font-medium">Return</th>
                <th className="text-left p-4 font-medium">Period</th>
                <th className="text-right p-4 font-medium">Taxable Value</th>
                <th className="text-right p-4 font-medium">CGST</th>
                <th className="text-right p-4 font-medium">SGST</th>
                <th className="text-right p-4 font-medium">IGST</th>
                <th className="text-center p-4 font-medium">Invoices</th>
                <th className="text-center p-4 font-medium">Status</th>
                <th className="text-right p-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filings.length === 0 ? (
                <tr><td colSpan="9" className="p-8 text-center text-gray-500">No filings yet. Generate a GSTR-1 or GSTR-3B to get started.</td></tr>
              ) : filings.map(f => (
                <tr key={f.id} className="border-b border-gray-700/30 hover:bg-gray-700/20 transition-colors">
                  <td className="p-4">
                    <span className={`text-xs font-bold px-2 py-1 rounded ${f.return_type === 'GSTR1' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-purple-500/20 text-purple-400'}`}>
                      {f.return_type}
                    </span>
                  </td>
                  <td className="p-4 text-white font-medium">{f.return_period}</td>
                  <td className="p-4 text-right text-white">{fmt(f.total_taxable_value)}</td>
                  <td className="p-4 text-right text-gray-300">{fmt(f.total_cgst)}</td>
                  <td className="p-4 text-right text-gray-300">{fmt(f.total_sgst)}</td>
                  <td className="p-4 text-right text-gray-300">{fmt(f.total_igst)}</td>
                  <td className="p-4 text-center text-white">{f.total_invoices}</td>
                  <td className="p-4 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      f.status === 'filed' ? 'bg-emerald-500/20 text-emerald-400' :
                      f.status === 'generated' ? 'bg-amber-500/20 text-amber-400' :
                      'bg-gray-700 text-gray-400'
                    }`}>{f.status}</span>
                  </td>
                  <td className="p-4 text-right flex gap-1 justify-end">
                    <button onClick={() => openFiling(f.id)} className="p-1.5 rounded-lg hover:bg-gray-700 text-gray-400" title="View"><Eye className="w-4 h-4" /></button>
                    <button onClick={() => downloadFiling(f.id)} className="p-1.5 rounded-lg hover:bg-gray-700 text-gray-400" title="Download JSON"><Download className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      {/* ═══ HSN/SAC Tab ═══ */}
      {tab === 'hsn' && (loading ? <TableSkeleton /> : (
        <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-400 border-b border-gray-700/50">
                <th className="text-left p-4 font-medium">Code</th>
                <th className="text-left p-4 font-medium">Type</th>
                <th className="text-left p-4 font-medium">Description</th>
                <th className="text-right p-4 font-medium">GST Rate</th>
                <th className="text-right p-4 font-medium">CGST</th>
                <th className="text-right p-4 font-medium">SGST</th>
                <th className="text-right p-4 font-medium">IGST</th>
              </tr>
            </thead>
            <tbody>
              {hsnCodes.map(c => (
                <tr key={c.id} className="border-b border-gray-700/30 hover:bg-gray-700/20">
                  <td className="p-4 font-mono text-indigo-400 font-bold">{c.code}</td>
                  <td className="p-4"><span className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded">{c.type}</span></td>
                  <td className="p-4 text-white">{c.description}</td>
                  <td className="p-4 text-right text-white font-medium">{c.gst_rate}%</td>
                  <td className="p-4 text-right text-gray-400">{c.cgst_rate}%</td>
                  <td className="p-4 text-right text-gray-400">{c.sgst_rate}%</td>
                  <td className="p-4 text-right text-gray-400">{c.igst_rate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      {/* ═══ Config Tab ═══ */}
      {tab === 'config' && (
        <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-6 max-w-2xl">
          <h2 className="text-sm font-bold text-gray-300 border-b border-gray-700 pb-2 mb-4">GST Registration Details</h2>
          <form onSubmit={saveConfig} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">GSTIN *</label>
                <input type="text" value={configForm.gstin} onChange={e => setConfigForm({...configForm, gstin: e.target.value})} maxLength={15} required
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white font-mono" placeholder="24AAAAA0000A1Z5" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Financial Year *</label>
                <input type="text" value={configForm.financial_year} onChange={e => setConfigForm({...configForm, financial_year: e.target.value})} required
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white" placeholder="2025-26" />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Legal Name *</label>
              <input type="text" value={configForm.legal_name} onChange={e => setConfigForm({...configForm, legal_name: e.target.value})} required
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Trade Name</label>
              <input type="text" value={configForm.trade_name || ''} onChange={e => setConfigForm({...configForm, trade_name: e.target.value})}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white" />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">State Code *</label>
                <input type="text" value={configForm.state_code} onChange={e => setConfigForm({...configForm, state_code: e.target.value})} maxLength={2} required
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white font-mono" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">State Name *</label>
                <input type="text" value={configForm.state_name} onChange={e => setConfigForm({...configForm, state_name: e.target.value})} required
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Default GST Rate</label>
                <select value={configForm.default_tax_rate} onChange={e => setConfigForm({...configForm, default_tax_rate: parseFloat(e.target.value)})}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white">
                  <option value={5}>5%</option>
                  <option value={12}>12%</option>
                  <option value={18}>18%</option>
                  <option value={28}>28%</option>
                </select>
              </div>
            </div>
            <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg">Save Configuration</button>
          </form>
        </div>
      )}

      {/* ═══ Filing Detail Modal ═══ */}
      {viewFiling && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden">
            <div className="p-4 border-b border-gray-700 flex justify-between items-center">
              <h2 className="text-lg font-bold text-white">
                {viewFiling.return_type} — {viewFiling.return_period}
              </h2>
              <button onClick={() => setViewFiling(null)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 overflow-y-auto space-y-4">
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-gray-900/50 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-500">Taxable Value</p>
                  <p className="text-lg font-bold text-white">{fmt(viewFiling.total_taxable_value)}</p>
                </div>
                <div className="bg-gray-900/50 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-500">CGST</p>
                  <p className="text-lg font-bold text-blue-400">{fmt(viewFiling.total_cgst)}</p>
                </div>
                <div className="bg-gray-900/50 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-500">SGST</p>
                  <p className="text-lg font-bold text-blue-400">{fmt(viewFiling.total_sgst)}</p>
                </div>
                <div className="bg-gray-900/50 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-500">IGST</p>
                  <p className="text-lg font-bold text-orange-400">{fmt(viewFiling.total_igst)}</p>
                </div>
              </div>
              {viewFiling.json && (
                <div>
                  <h3 className="text-sm font-bold text-gray-300 mb-2">JSON Data</h3>
                  <pre className="bg-gray-900 border border-gray-700 rounded-lg p-4 text-xs text-gray-300 overflow-auto max-h-64 font-mono">
                    {JSON.stringify(viewFiling.json, null, 2)}
                  </pre>
                </div>
              )}
            </div>
            <div className="p-4 border-t border-gray-700 flex gap-3">
              <button onClick={() => downloadFiling(viewFiling.id)} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg">
                <Download className="w-4 h-4" /> Download JSON
              </button>
              <button onClick={() => setViewFiling(null)} className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
