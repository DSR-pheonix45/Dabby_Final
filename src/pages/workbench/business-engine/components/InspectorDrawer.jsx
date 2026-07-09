import React from 'react';
import { BsXLg, BsFileEarmarkText, BsLightningCharge, BsDiagram3 } from 'react-icons/bs';

export default function InspectorDrawer({ isOpen, onClose, data }) {
  if (!isOpen || !data) return null;

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/50 z-40 transition-opacity" 
        onClick={onClose}
      />
      <div 
        className={`fixed top-0 right-0 h-full w-[400px] max-w-full bg-[#111111] border-l border-white/10 z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        } flex flex-col`}
      >
        <div className="flex items-center justify-between p-6 border-b border-white/10 bg-[#181818]">
          <h2 className="text-lg font-bold text-white flex items-center">
            <BsEye className="mr-2 text-teal-400" /> Inspector
          </h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <BsXLg />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          
          {/* Document Header */}
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center space-x-2 mb-1">
                <BsFileEarmarkText className="text-gray-400 text-sm" />
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{data.type}</span>
              </div>
              <h3 className="text-xl font-bold text-white">{data.party}</h3>
            </div>
            <div className="text-right">
              <span className={`px-2 py-1 rounded text-xs font-bold ${data.confidence >= 90 ? 'bg-teal-500/10 text-teal-400' : 'bg-amber-500/10 text-amber-400'}`}>
                {data.confidence}% Conf.
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/5 p-3 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Amount</p>
              <p className="text-lg font-bold text-white">${data.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            </div>
            <div className="bg-white/5 p-3 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Processing Time</p>
              <p className="text-sm font-semibold text-gray-300 flex items-center">
                <BsLightningCharge className="mr-1 text-teal-400" /> {data.time || 'N/A'}
              </p>
            </div>
          </div>

          {/* Analysis Summary */}
          {data.analysis && (
            <div>
              <h4 className="text-sm font-bold text-white border-b border-white/10 pb-2 mb-3">AI Analysis Summary</h4>
              <p className="text-sm text-gray-400 leading-relaxed mb-3">{data.analysis.summary}</p>
              <div className="flex flex-wrap gap-2">
                {data.analysis.tags.map(tag => (
                  <span key={tag} className="px-2 py-1 bg-[#181818] border border-white/10 rounded text-xs text-gray-300">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Proposed Journal */}
          <div>
            <h4 className="text-sm font-bold text-white border-b border-white/10 pb-2 mb-3 flex items-center">
              <BsDiagram3 className="mr-2 text-teal-400" /> Proposed Journal
            </h4>
            {data.journal ? (
              <div className="bg-[#181818] border border-white/10 rounded-lg overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#111111]/50 border-b border-white/10 text-gray-500">
                    <tr>
                      <th className="px-3 py-2 font-medium">Account</th>
                      <th className="px-3 py-2 font-medium text-right">Debit</th>
                      <th className="px-3 py-2 font-medium text-right">Credit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {data.journal.map((entry, idx) => (
                      <tr key={idx} className="hover:bg-white/5">
                        <td className="px-3 py-2 text-gray-300">{entry.account}</td>
                        <td className="px-3 py-2 text-right font-medium text-gray-300">
                          {entry.type === 'debit' ? `$${entry.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '-'}
                        </td>
                        <td className="px-3 py-2 text-right font-medium text-gray-300">
                          {entry.type === 'credit' ? `$${entry.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic">No journal proposed at this stage.</p>
            )}
          </div>

          <div className="pt-4 border-t border-white/10 flex justify-end space-x-3">
            <button className="px-4 py-2 border border-white/10 hover:border-white/20 rounded-lg text-sm text-gray-300 transition-colors">
              View Evidence
            </button>
            <button className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-black font-bold rounded-lg text-sm transition-colors">
              Approve Post
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
