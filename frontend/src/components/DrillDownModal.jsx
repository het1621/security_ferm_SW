import { X, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function DrillDownModal({ isOpen, onClose, title, data, columns, type }) {
  if (!isOpen) return null;

  const handleExport = () => {
    const wb = XLSX.utils.book_new();
    const wsData = [];
    
    wsData.push([title]);
    wsData.push([]); // blank row
    
    // Headers
    wsData.push(columns.map(c => c.label));
    
    // Data
    data.forEach(row => {
      wsData.push(columns.map(c => row[c.key]));
    });

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, 'DrillDown');
    XLSX.writeFile(wb, `DrillDown_${type}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h2 className="text-xl font-bold text-slate-800">{title}</h2>
            <p className="text-sm text-slate-500 mt-1">{data?.length || 0} records found</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium text-sm shadow-sm"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6 bg-slate-50/30">
          {data && data.length > 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      {columns.map((col, idx) => (
                        <th key={idx} className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                        {columns.map((col, cIdx) => (
                          <td key={cIdx} className="p-4 text-sm text-slate-700 whitespace-nowrap">
                            {col.format ? col.format(row[col.key]) : (row[col.key] || '-')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full py-12 text-slate-400">
              <p className="text-lg font-medium">No detailed records found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
