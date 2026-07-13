import React from 'react';
import SnippetCard from './SnippetCard';

export default function SnippetsBoard({ snippets, loading }) {
  if (loading) {
    return (
      <div className="flex h-[calc(100vh-280px)] min-h-[600px] bg-[#181818] border border-white/10 rounded-xl overflow-hidden animate-pulse">
        <div className="flex-1 border-r border-white/5 p-4 space-y-4">
          <div className="h-6 bg-white/5 rounded w-1/2 mb-6"></div>
          {[...Array(3)].map((_, j) => (
            <div key={j} className="h-32 bg-white/5 rounded-xl"></div>
          ))}
        </div>
        <div className="flex-1 p-4 space-y-4">
          <div className="h-6 bg-white/5 rounded w-1/2 mb-6"></div>
          {[...Array(3)].map((_, j) => (
            <div key={j} className="h-32 bg-white/5 rounded-xl"></div>
          ))}
        </div>
      </div>
    );
  }

  // Filter snippets into Credit and Debit
  // Safe extraction (matching SnippetCard logic)
  const getDebit = (s) => Number(s?.debit_amount?.value ?? s?.debit ?? s?.debit_amount ?? 0);
  const getCredit = (s) => Number(s?.credit_amount?.value ?? s?.credit ?? s?.credit_amount ?? 0);

  const creditSnippets = snippets.filter(s => getCredit(s) > 0);
  const debitSnippets = snippets.filter(s => getDebit(s) > 0);

  return (
    <div className="flex h-[calc(100vh-280px)] min-h-[600px] bg-[#181818] border border-white/10 rounded-xl overflow-hidden">
      
      {/* Credit Column (Money In) */}
      <div className="flex-1 flex flex-col border-r border-white/5">
        <div className="p-4 border-b border-white/5 bg-[#111111] flex justify-between items-center z-10 sticky top-0">
          <h3 className="text-sm font-bold text-teal-400">Money In (Credit Snippets)</h3>
          <span className="text-xs font-semibold bg-teal-500/10 text-teal-400 px-2 py-0.5 rounded-full">
            {creditSnippets.length}
          </span>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          {creditSnippets.map((snippet, idx) => (
            <SnippetCard 
              key={`credit-${idx}`} 
              transaction={snippet} 
              sourceDocument={snippet.sourceDocument} 
            />
          ))}
          {creditSnippets.length === 0 && (
            <div className="text-center py-10 text-sm text-gray-500 font-medium">
              No credit snippets found.
            </div>
          )}
        </div>
      </div>

      {/* Debit Column (Money Out) */}
      <div className="flex-1 flex flex-col">
        <div className="p-4 border-b border-white/5 bg-[#111111] flex justify-between items-center z-10 sticky top-0">
          <h3 className="text-sm font-bold text-rose-400">Money Out (Debit Snippets)</h3>
          <span className="text-xs font-semibold bg-rose-500/10 text-rose-400 px-2 py-0.5 rounded-full">
            {debitSnippets.length}
          </span>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          {debitSnippets.map((snippet, idx) => (
            <SnippetCard 
              key={`debit-${idx}`} 
              transaction={snippet} 
              sourceDocument={snippet.sourceDocument} 
            />
          ))}
          {debitSnippets.length === 0 && (
            <div className="text-center py-10 text-sm text-gray-500 font-medium">
              No debit snippets found.
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
