import React from 'react';
import { BsFileEarmarkText, BsLightningCharge, BsArrowRightShort, BsCheck2All } from 'react-icons/bs';
import { useWorkbench } from '../../../../context/WorkbenchContext';
import { formatCurrency } from '../../../../utils/currency';
import { financialRouting, ROUTING_TONE } from '../../../../utils/financialRouting';

export default function PipelineCard({ card, onDragStart, onClick }) {
  const { activeWorkbench } = useWorkbench();
  const routing = financialRouting(card.type, card.eventType, card.party);

  const getConfidenceColor = (conf) => {
    if (conf >= 90) return 'text-teal-400 bg-teal-500/10';
    if (conf >= 75) return 'text-amber-400 bg-amber-500/10';
    return 'text-rose-400 bg-rose-500/10';
  };

  return (
    <div 
      draggable
      onDragStart={(e) => onDragStart(e, card.id)}
      onClick={() => onClick(card)}
      className="bg-[#181818] border border-white/10 hover:border-teal-500/50 rounded-xl p-4 mb-3 cursor-pointer shadow-sm hover:shadow-md transition-all group"
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 bg-white/5 rounded-md text-gray-400 group-hover:text-teal-400 transition-colors">
            <BsFileEarmarkText className="text-xs" />
          </div>
          <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">{card.type}</span>
        </div>
        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getConfidenceColor(card.confidence)}`}>
          {card.confidence}%
        </span>
      </div>
      
      <h4 className="text-xs font-semibold text-gray-400 mb-1 line-clamp-1" title={card.party}>{card.party}</h4>
      <p className="text-lg font-bold text-gray-200 mb-2">{formatCurrency(card.amount, activeWorkbench?.country)}</p>

      {/* Where this document lands in OPS / the ledger */}
      <div className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md border text-[10px] font-bold mb-2 ${ROUTING_TONE[routing.tone]}`} title={routing.hint}>
        <BsArrowRightShort className="text-sm -ml-1" />
        {routing.label}
      </div>

      {/* Settlement view (posted): invoice vs matched payment snippets */}
      {card.settlement && (
        card.settlement.status === 'completed' ? (
          <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 mb-1">
            <BsCheck2All /> Fully settled
          </div>
        ) : (
          <div className="mb-1">
            <div className="flex justify-between text-[10px] font-semibold text-gray-400 mb-1">
              <span>Paid {formatCurrency(card.settlement.paid, activeWorkbench?.country)}</span>
              <span className="text-amber-400">Due {formatCurrency(card.settlement.difference, activeWorkbench?.country)}</span>
            </div>
            <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-400 rounded-full"
                style={{ width: `${Math.min(100, Math.max(0, card.settlement.invoiceValue ? (card.settlement.paid / card.settlement.invoiceValue) * 100 : 0))}%` }}
              />
            </div>
          </div>
        )
      )}

      <div className="flex items-center justify-between text-[10px] text-gray-500 font-semibold mt-auto pt-3 border-t border-white/5">
        <span className="flex items-center">
          <BsLightningCharge className="mr-1" />
          {card.time}
        </span>
        
        {card.reviewer !== 'Unassigned' && (
          <span className="flex items-center px-2 py-0.5 bg-white/5 rounded text-gray-400">
            {card.reviewer}
          </span>
        )}
      </div>
    </div>
  );
}
