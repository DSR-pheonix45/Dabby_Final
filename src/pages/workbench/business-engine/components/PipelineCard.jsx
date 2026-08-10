import React from 'react';
import { 
  BsFileEarmarkText, BsLightningCharge, BsArrowRightShort, 
  BsCheck2All, BsCashCoin, BsFileEarmarkMinus, BsLightningFill
} from 'react-icons/bs';
import { useWorkbench } from '../../../../context/WorkbenchContext';
import { formatCurrency } from '../../../../utils/currency';
import { financialRouting, ROUTING_TONE } from '../../../../utils/financialRouting';

export default function PipelineCard({ 
  card, 
  onDragStart, 
  onClick, 
  onOpenSettlement, 
  onOpenAdjustmentNote,
  onPostToLedger 
}) {
  const { activeWorkbench } = useWorkbench();
  const routing = financialRouting(card.type, card.eventType, card.party);

  const isSales = (card.type || "").toLowerCase().includes("sales") || (card.eventType || "").includes("CUSTOMER");
  const isSettled = card.settlement?.status === 'completed' || card.status === 'POSTED';
  const paidAmount = card.settlement?.paid || (isSettled ? card.amount : 0);
  const remainingDue = card.settlement?.difference ?? (isSettled ? 0 : card.amount);

  return (
    <div 
      draggable
      onDragStart={(e) => onDragStart(e, card.id)}
      onClick={() => onClick(card)}
      className="bg-[#181818] border border-white/10 hover:border-teal-500/50 rounded-xl p-4 mb-3 cursor-pointer shadow-sm hover:shadow-lg transition-all group relative overflow-hidden"
    >
      {/* Top Header */}
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 bg-white/5 rounded-md text-gray-400 group-hover:text-teal-400 transition-colors">
            <BsFileEarmarkText className="text-xs" />
          </div>
          <span className="text-[11px] font-bold text-gray-300 uppercase tracking-wider">
            {card.type?.replace(/_/g, " ")}
          </span>
        </div>

        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
          isSettled ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
          isSales ? 'bg-teal-500/10 text-teal-400 border-teal-500/30' : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
        }`}>
          {isSettled ? 'Settled & Posted' : (isSales ? 'Receivable' : 'Payable')}
        </span>
      </div>
      
      {/* Party & Amount */}
      <h4 className="text-sm font-bold text-white mb-0.5 line-clamp-1" title={card.party}>
        {card.party || "Unspecified Counterparty"}
      </h4>
      <p className="text-xl font-extrabold text-white mb-2">
        {formatCurrency(card.amount, activeWorkbench?.country)}
      </p>

      {/* COA Routing Tag */}
      <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-bold mb-3 ${ROUTING_TONE[routing.tone]}`} title={routing.hint}>
        <BsArrowRightShort className="text-sm -ml-1" />
        <span>{routing.label} ({routing.where})</span>
      </div>

      {/* Settlement Progress */}
      <div className="mb-3 p-2 bg-black/40 border border-white/5 rounded-lg">
        <div className="flex justify-between text-[10px] font-semibold mb-1">
          <span className="text-emerald-400">Paid: {formatCurrency(paidAmount, activeWorkbench?.country)}</span>
          <span className={remainingDue > 0.01 ? "text-amber-400 font-bold" : "text-gray-400"}>
            Due: {formatCurrency(remainingDue, activeWorkbench?.country)}
          </span>
        </div>
        <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${isSettled ? 'bg-emerald-400' : 'bg-amber-400'}`}
            style={{ width: `${Math.min(100, Math.max(0, card.amount ? (paidAmount / card.amount) * 100 : 0))}%` }}
          />
        </div>
      </div>

      {/* Action Buttons Toolbar */}
      <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-white/10" onClick={e => e.stopPropagation()}>
        <button
          type="button"
          onClick={() => onOpenSettlement(card)}
          className="py-1.5 px-1 bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 rounded text-[10px] font-bold flex items-center justify-center gap-1 transition-colors"
          title="Record Bank or Cash Payment"
        >
          <BsCashCoin size={11} />
          <span>+ Payment</span>
        </button>

        <button
          type="button"
          onClick={() => onOpenAdjustmentNote(card)}
          className="py-1.5 px-1 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded text-[10px] font-bold flex items-center justify-center gap-1 transition-colors"
          title="Issue Credit or Debit Note"
        >
          <BsFileEarmarkMinus size={11} />
          <span>+ Note</span>
        </button>

        <button
          type="button"
          onClick={() => onPostToLedger(card)}
          className="py-1.5 px-1 bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded text-[10px] font-bold flex items-center justify-center gap-1 transition-colors"
          title="Post to Chart of Accounts"
        >
          <BsLightningFill size={10} />
          <span>Post COA</span>
        </button>
      </div>

    </div>
  );
}
