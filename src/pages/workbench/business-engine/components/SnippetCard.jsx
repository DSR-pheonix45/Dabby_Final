import React, { useState } from 'react';
import { BsCheckCircleFill, BsFileEarmarkText, BsBank, BsArrowRightShort, BsArrowsAngleExpand, BsLink45Deg, BsXLg, BsSearch } from 'react-icons/bs';
import PartyAnalyticsModal from '../../PartyAnalyticsModal';

export default function SnippetCard({ transaction, sourceDocument }) {
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [linkedDoc, setLinkedDoc] = useState(null);
  
  // Safe extraction of nested transaction properties
  const date = transaction?.date?.value || 'N/A';
  const desc = transaction?.description?.value || 'Unknown Transaction';
  const debit = transaction?.debit_amount?.value || 0;
  const credit = transaction?.credit_amount?.value || 0;
  const mode = transaction?.payment_mode?.value || 'Transfer';
  
  const amount = debit > 0 ? debit : credit;
  const type = debit > 0 ? 'Debit' : 'Credit';
  
  // Create a mock party object to pass to the modal for demonstration
  const mockParty = {
    id: 'mock-snippet-party',
    name: desc.split('/')[0] || 'Unknown Counterparty',
    party_type: 'customer' // default mock
  };

  return (
    <>
      <div className="bg-[#121214] border border-[#2A2A2E] rounded-xl overflow-hidden shadow-lg transition-all hover:border-teal-500/30 group">
        
        {/* Header Ribbon */}
        <div className="bg-[#18181B] px-4 py-2 border-b border-[#2A2A2E] flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="bg-teal-500/10 text-teal-400 p-1.5 rounded-md">
              <BsBank size={12} />
            </div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              Verified Bank Snippet
            </span>
          </div>
          <div className="flex items-center gap-1 text-green-500 bg-green-500/10 px-2 py-0.5 rounded text-[9px] font-bold">
            <BsCheckCircleFill size={9} /> Match
          </div>
        </div>
        
        {/* Body */}
        <div className="p-4 space-y-4">
          
          <div className="flex justify-between items-start">
            <div className="pr-4">
              <h4 className="text-sm font-bold text-gray-200 mb-1 leading-tight line-clamp-2" title={desc}>
                {desc}
              </h4>
              <p className="text-xs text-gray-500">{date} • {mode}</p>
            </div>
            <div className="text-right shrink-0">
              <div className={`text-lg font-bold ${type === 'Credit' ? 'text-teal-400' : 'text-rose-400'}`}>
                {type === 'Credit' ? '+' : '-'}${amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mt-1">
                {type}
              </div>
            </div>
          </div>
          
          {/* Source Document Context */}
          {sourceDocument && (
            <div className="bg-white/[0.03] border border-white/5 rounded-lg p-2.5 flex items-center gap-3">
              <BsFileEarmarkText className="text-gray-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-gray-400 truncate">{sourceDocument.filename || 'Source Document'}</p>
              </div>
              <div className="text-[9px] text-gray-600 font-semibold uppercase shrink-0">
                Extracted
              </div>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="px-4 py-3 bg-[#0F0F11] border-t border-[#2A2A2E] flex justify-between items-center">
          <div className="flex gap-4">
            <button 
              onClick={(e) => { e.stopPropagation(); setIsAnalyticsOpen(true); }}
              className="text-xs font-semibold text-teal-500 hover:text-teal-400 flex items-center gap-1 transition-colors"
            >
              <BsArrowsAngleExpand size={10} /> View Analytics
            </button>

            {!linkedDoc ? (
              <button 
                onClick={(e) => { e.stopPropagation(); setIsLinkModalOpen(true); }}
                className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
              >
                <BsLink45Deg size={14} /> Link Document
              </button>
            ) : (
              <div className="text-xs font-bold text-gray-400 flex items-center gap-1 bg-white/5 px-2 py-0.5 rounded-full border border-white/5">
                <BsLink45Deg className="text-indigo-400" /> Linked to {linkedDoc}
              </div>
            )}
          </div>
          
          <button className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:bg-white/10 hover:text-white transition-colors">
            <BsArrowRightShort size={16} />
          </button>
        </div>

      </div>

      <PartyAnalyticsModal 
        isOpen={isAnalyticsOpen}
        onClose={() => setIsAnalyticsOpen(false)}
        party={mockParty}
      />

      {/* Mock Linking Modal */}
      {isLinkModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#18181A] border border-white/10 rounded-2xl shadow-2xl p-6 relative">
            <button 
              onClick={() => setIsLinkModalOpen(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-white"
            >
              <BsXLg />
            </button>
            <h3 className="text-lg font-bold text-white mb-4">Link Document</h3>
            <p className="text-xs text-gray-400 mb-6">Search for an invoice or bill to link this transaction snippet to.</p>
            
            <div className="relative mb-4">
              <BsSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input 
                type="text" 
                placeholder="Search by Invoice ID or Party..." 
                className="w-full bg-[#111] border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white focus:border-teal-500 focus:outline-none"
              />
            </div>
            
            <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-2">
              {['INV-2024-089', 'BILL-AWS-07', 'INV-WW-892'].map(id => (
                <div 
                  key={id}
                  onClick={() => { setLinkedDoc(id); setIsLinkModalOpen(false); }}
                  className="bg-white/5 hover:bg-white/10 p-3 rounded-xl border border-transparent hover:border-white/10 cursor-pointer transition-colors flex justify-between items-center"
                >
                  <span className="text-sm font-bold text-gray-300">{id}</span>
                  <span className="text-[10px] bg-teal-500/10 text-teal-400 px-2 py-0.5 rounded-full font-bold">Pending Settlement</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
