import React from 'react';
import { BsEye } from 'react-icons/bs';

export default function TimelineTable({ data, loading, onRowClick }) {
  if (loading) {
    return (
      <div className="animate-pulse flex flex-col space-y-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="h-12 bg-[#181818] rounded-xl border border-white/5"></div>
        ))}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-[#181818] rounded-xl border border-dashed border-white/10 text-center">
        <p className="text-gray-400 font-medium">No timeline data found.</p>
      </div>
    );
  }

  return (
    <div className="bg-[#181818] border border-white/10 rounded-xl overflow-x-auto shadow-sm">
      <table className="w-full text-sm text-left">
        <thead className="text-xs text-gray-400 uppercase bg-[#111111]/50 border-b border-white/10">
          <tr>
            <th className="px-6 py-4 font-semibold">Timestamp</th>
            <th className="px-6 py-4 font-semibold">Document</th>
            <th className="px-6 py-4 font-semibold">Stage</th>
            <th className="px-6 py-4 font-semibold">Status</th>
            <th className="px-6 py-4 font-semibold text-right">Duration</th>
            <th className="px-6 py-4 font-semibold">User</th>
            <th className="px-6 py-4 font-semibold text-right">AI Conf.</th>
            <th className="px-6 py-4 font-semibold text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {data.map((row) => (
            <tr 
              key={row.id} 
              onClick={() => onRowClick(row)}
              className="hover:bg-white/[0.03] transition-colors cursor-pointer group"
            >
              <td className="px-6 py-4 text-gray-400">{row.timestamp}</td>
              <td className="px-6 py-4 font-medium text-white">{row.document}</td>
              <td className="px-6 py-4">
                <span className="px-2 py-1 rounded bg-white/5 text-gray-300 text-xs uppercase tracking-wider">{row.stage.replace(/_/g, ' ')}</span>
              </td>
              <td className="px-6 py-4">
                <span className={`px-2 py-1 rounded text-xs font-semibold ${
                  row.status === 'Success' ? 'bg-teal-500/10 text-teal-400' : 'bg-amber-500/10 text-amber-400'
                }`}>
                  {row.status}
                </span>
              </td>
              <td className="px-6 py-4 text-right text-gray-400">{row.duration}</td>
              <td className="px-6 py-4 text-gray-300">{row.user}</td>
              <td className="px-6 py-4 text-right">
                <span className={`font-semibold ${row.confidence >= 90 ? 'text-teal-400' : 'text-amber-400'}`}>
                  {row.confidence}%
                </span>
              </td>
              <td className="px-6 py-4 text-right">
                <button className="text-gray-500 hover:text-teal-400 p-1 rounded transition-colors group-hover:bg-white/10">
                  <BsEye />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
