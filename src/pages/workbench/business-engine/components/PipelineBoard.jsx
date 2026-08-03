import React from 'react';
import PipelineColumn from './PipelineColumn';
import { BsFileEarmarkText, BsHourglassSplit, BsCheck2All, BsReceiptCutoff } from 'react-icons/bs';

const STAGES = [
  { 
    id: 'quotes_pos', 
    label: '1. Quotes & Purchase Orders', 
    icon: BsFileEarmarkText,
    color: 'text-blue-400'
  },
  { 
    id: 'proformas_bills', 
    label: '2. Proformas & Pending Bills', 
    icon: BsHourglassSplit,
    color: 'text-purple-400'
  },
  { 
    id: 'unsettled_invoices', 
    label: '3. Invoices Awaiting Settlement', 
    icon: BsReceiptCutoff,
    color: 'text-amber-400'
  },
  { 
    id: 'settled_posted', 
    label: '4. Settled & Posted to COA', 
    icon: BsCheck2All,
    color: 'text-emerald-400'
  }
];

export default function PipelineBoard({ 
  cards, 
  loading, 
  onMoveCard, 
  onCardClick,
  onOpenSettlement,
  onOpenAdjustmentNote,
  onPostToLedger 
}) {
  const handleDragStart = (e, cardId) => {
    e.dataTransfer.setData('cardId', cardId);
  };

  const handleDrop = (e, targetStageId) => {
    e.preventDefault();
    const cardId = e.dataTransfer.getData('cardId');
    if (cardId && onMoveCard) {
      onMoveCard(cardId, targetStageId);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  if (loading) {
    return (
      <div className="flex h-[600px] bg-[#141722] border border-white/10 rounded-2xl overflow-hidden animate-pulse">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex-1 min-w-[300px] border-r border-white/5 p-4 space-y-4">
            <div className="h-6 bg-white/5 rounded w-1/2 mb-6"></div>
            {[...Array(3)].map((_, j) => (
              <div key={j} className="h-32 bg-white/5 rounded-xl"></div>
            ))}
          </div>
        ))}
      </div>
    );
  }

  // Helper to map card to stage deterministically
  const getCardStageId = (card) => {
    const isSettled = card.settlement?.status === 'completed' || card.status === 'POSTED' || card.stage === 'completed';
    if (isSettled) return 'settled_posted';

    const t = (card.type || '').toLowerCase();
    if (t.includes('quote') || t.includes('quotation') || t.includes('purchase_order') || t.includes('sales_order')) {
      return 'quotes_pos';
    }
    if (t.includes('proforma') || t.includes('bill')) {
      return 'proformas_bills';
    }
    return 'unsettled_invoices';
  };

  return (
    <div className="flex h-[calc(100vh-280px)] min-h-[600px] bg-[#12141C] border border-white/10 rounded-2xl overflow-x-auto overflow-y-hidden custom-scrollbar snap-x">
      {STAGES.map(stage => {
        const stageCards = cards.filter(c => getCardStageId(c) === stage.id || c.stage === stage.id);
        
        return (
          <div key={stage.id} className="snap-start h-full flex-1">
            <PipelineColumn 
              stage={stage} 
              cards={stageCards}
              onDragStart={handleDragStart}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onCardClick={onCardClick}
              onOpenSettlement={onOpenSettlement}
              onOpenAdjustmentNote={onOpenAdjustmentNote}
              onPostToLedger={onPostToLedger}
            />
          </div>
        );
      })}
    </div>
  );
}
