import React, { useState } from 'react';
import { BsCheckCircleFill, BsBank, BsArrowRightShort, BsLink45Deg, BsXLg } from 'react-icons/bs';
import { useWorkbench } from '../../../../context/WorkbenchContext';
import { formatCurrency } from '../../../../utils/currency';

export default function SnippetCard({ transaction, sourceDocument }) {
  const { activeWorkbench } = useWorkbench();
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [linkedDoc, setLinkedDoc] = useState(null);
  
  const date = transaction?.date?.value ?? transaction?.date ?? 'N/A';
  const rawParticulars = transaction?.raw_particulars?.value ?? transaction?.raw_particulars ?? transaction?.description?.value ?? transaction?.description ?? 'Unknown Transaction';
  const partyName = transaction?.beneficiary_name?.value ?? transaction?.beneficiary_name ?? 'Unknown Entity';
  const debit = transaction?.debit_amount?.value ?? transaction?.debit ?? transaction?.debit_amount ?? 0;
  const credit = transaction?.credit_amount?.value ?? transaction?.credit ?? transaction?.credit_amount ?? 0;
  const mode = transaction?.payment_mode?.value ?? transaction?.payment_mode ?? 'Transfer';
  
  const amount = debit > 0 ? debit : credit;
  const type = debit > 0 ? 'Debit' : 'Credit';
  
  const isUnknown = partyName.toLowerCase().includes('unknown');
  const borderClass = isUnknown 
    ? "border-amber-500/50 shadow-[0_0_10px_rgba(245,158,11,0.1)] hover:border-amber-400" 
    : "border-[#2A2A2E] hover:border-teal-500/30";

  return (
    <>
      <div className={`bg-[#121214] border ${borderClass} rounded-xl overflow-hidden shadow-lg transition-all group`}>
        
        {/* Header Ribbon */}
        <div className={`px-4 py-2 border-b border-[#2A2A2E] flex justify-between items-center ${isUnknown ? 'bg-amber-950/20' : 'bg-[#18181B]'}`}>
          <div className="flex items-center gap-2">
            <div className={isUnknown ? "bg-amber-500/10 text-amber-400 p-1.5 rounded-md" : "bg-teal-500/10 text-teal-400 p-1.5 rounded-md"}>
              <BsBank size={12} />
            </div>
            <span className={`text-[10px] font-bold uppercase tracking-widest ${isUnknown ? 'text-amber-500' : 'text-gray-400'}`}>
              {isUnknown ? 'Needs Review' : 'Verified Bank Snippet'}
            </span>
          </div>
          {!isUnknown && (
            <div className="flex items-center gap-1 text-green-500 bg-green-500/10 px-2 py-0.5 rounded text-[9px] font-bold">
              <BsCheckCircleFill size={9} /> Match
            </div>
          )}
        </div>
        
        {/* Body */}
        <div className="p-4 space-y-4">
          <div className="flex justify-between items-start">
            <div className="pr-4">
              <h4 className={`text-sm font-bold mb-1 leading-tight line-clamp-1 ${isUnknown ? 'text-amber-400' : 'text-indigo-300'}`} title={partyName}>
                {partyName}
              </h4>
              <p className="text-[11px] text-gray-400 mb-2 leading-tight line-clamp-2" title={rawParticulars}>
                {rawParticulars}
              </p>
              <p className="text-[10px] font-semibold text-gray-500">{date} • {mode}</p>
            </div>
            <div className="text-right whitespace-nowrap">
              <span className={`text-xs font-bold px-2 py-0.5 rounded border ${type === 'Credit' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
                {type}
              </span>
              <p className="text-base font-extrabold text-white mt-1">
                {formatCurrency(amount, activeWorkbench?.country)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
