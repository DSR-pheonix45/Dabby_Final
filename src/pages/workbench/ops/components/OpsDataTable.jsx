import React from 'react';

export default function OpsDataTable({ columns, data, loading, emptyMessage }) {
  if (loading) {
    return (
      <div className="animate-pulse flex flex-col space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-12 bg-[#181818] rounded-xl border border-white/5"></div>
        ))}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 bg-[#181818] rounded-xl border border-dashed border-white/10 text-center">
        <p className="text-gray-400 font-medium">{emptyMessage || "No data available."}</p>
        <p className="text-xs text-gray-500 mt-1">Try adjusting your filters or search.</p>
      </div>
    );
  }

  return (
    <div className="bg-[#181818] border border-white/10 rounded-xl overflow-x-auto shadow-sm">
      <table className="w-full text-sm text-left">
        <thead className="text-xs text-gray-400 uppercase bg-[#111111]/50 border-b border-white/10">
          <tr>
            {columns.map((col, idx) => (
              <th key={idx} className={`px-6 py-4 font-semibold ${col.align === 'right' ? 'text-right' : ''}`}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {data.map((row, rowIndex) => (
            <tr key={rowIndex} className="hover:bg-white/[0.02] transition-colors">
              {columns.map((col, colIndex) => (
                <td key={colIndex} className={`px-6 py-4 ${col.align === 'right' ? 'text-right' : ''}`}>
                  {col.render ? col.render(row) : row[col.accessor]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      
      {/* Simple Pagination Placeholder */}
      <div className="px-6 py-4 border-t border-white/10 flex items-center justify-between bg-[#111111]/50">
        <span className="text-xs text-gray-500">Showing 1 to {data.length} of {data.length} entries</span>
        <div className="flex space-x-2">
          <button className="px-3 py-1 bg-[#181818] border border-white/10 rounded text-xs text-gray-400 cursor-not-allowed opacity-50" disabled>Previous</button>
          <button className="px-3 py-1 bg-[#181818] border border-white/10 rounded text-xs text-gray-400 cursor-not-allowed opacity-50" disabled>Next</button>
        </div>
      </div>
    </div>
  );
}
