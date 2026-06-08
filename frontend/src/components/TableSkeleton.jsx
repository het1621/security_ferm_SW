export default function TableSkeleton({ columns = 5, rows = 5 }) {
  return (
    <div className="animate-pulse">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="border-b border-slate-700/50 py-4 px-6 flex items-center gap-4">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <div 
              key={colIndex} 
              className={`h-4 bg-slate-700/50 rounded ${colIndex === 0 ? 'w-1/4' : 'w-1/6'} flex-1`}
            ></div>
          ))}
          <div className="h-8 w-16 bg-slate-700/50 rounded ml-auto"></div>
        </div>
      ))}
    </div>
  );
}
