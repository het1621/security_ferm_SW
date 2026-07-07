import { useState, useEffect, useCallback } from 'react';
import { X, Maximize2 } from 'lucide-react';

/**
 * ExpandableChart — click a chart to pop it up fullscreen, click again to close.
 * 
 * Usage:
 *   <ExpandableChart title="Revenue by Society">
 *     <ResponsiveContainer ...>
 *       <PieChart>...</PieChart>
 *     </ResponsiveContainer>
 *   </ExpandableChart>
 */
export default function ExpandableChart({ children, title }) {
  const [expanded, setExpanded] = useState(false);

  // Close on Escape key
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') setExpanded(false);
  }, []);

  useEffect(() => {
    if (expanded) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [expanded, handleKeyDown]);

  return (
    <>
      {/* Normal (inline) view */}
      <div className="relative group/expand">
        {children}
        {/* Expand icon button */}
        <button 
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(true);
          }}
          className="absolute top-2 right-2 p-1.5 bg-white/80 hover:bg-teal-100 text-slate-500 hover:text-teal-700 rounded-full backdrop-blur-sm transition-all z-20 opacity-0 group-hover/expand:opacity-100 shadow-md no-print"
          title="Click to expand chart"
        >
          <Maximize2 className="w-5 h-5" />
        </button>
      </div>

      {/* Fullscreen overlay */}
      {expanded && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center animate-fade-in"
          onClick={() => setExpanded(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm" />

          {/* Expanded chart card */}
          <div
            className="relative z-10 bg-white rounded-2xl shadow-2xl w-[92vw] h-[88vh] p-8 flex flex-col animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4 shrink-0">
              {title && (
                <h2 className="text-2xl font-bold text-slate-800">{title}</h2>
              )}
              <button
                onClick={() => setExpanded(false)}
                className="p-2 bg-slate-100 hover:bg-red-100 text-slate-500 hover:text-red-600 rounded-full transition-all"
                title="Close (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Chart area — force Recharts containers to fill all available space */}
            <div className="flex-1 min-h-0 w-full expanded-chart-container">
              {children}
            </div>

            {/* Footer hint */}
            <p className="text-xs text-slate-400 text-center mt-3 shrink-0">
              Click outside or press <kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-500 font-mono text-[10px]">Esc</kbd> to close
            </p>
          </div>
        </div>
      )}
    </>
  );
}
