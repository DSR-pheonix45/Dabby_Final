import React from 'react';
import PipelineCard from './PipelineCard';

export default function PipelineColumn({ 
  stage, 
  cards, 
  onDragStart, 
  onDrop, 
  onDragOver, 
  onCardClick,
  onOpenSettlement,
  onOpenAdjustmentNote,
  onPostToLedger
}) {
  return (
    <div 
      className="flex-1 min-w-[300px] max-w-[340px] flex flex-col bg-[#111319] border-r border-white/10 last:border-r-0 h-full"
      onDrop={(e) => onDrop(e, stage.id)}
      onDragOver={onDragOver}
    >
      {/* Stage Header */}
      <div className="p-4 border-b border-white/10 flex items-center justify-between sticky top-0 bg-[#141722] z-10">
        <h3 className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
          {stage.icon && <stage.icon className={`text-base ${stage.color || 'text-teal-400'}`} />}
          {stage.label}
        </h3>
        <span className="text-xs font-bold bg-white/10 text-white px-2.5 py-0.5 rounded-full border border-white/10">
          {cards.length}
        </span>
      </div>
      
      {/* Cards List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
        {cards.map(card => (
          <PipelineCard 
            key={card.id} 
            card={card} 
            onDragStart={onDragStart} 
            onClick={onCardClick}
            onOpenSettlement={onOpenSettlement}
            onOpenAdjustmentNote={onOpenAdjustmentNote}
            onPostToLedger={onPostToLedger}
          />
        ))}

        {cards.length === 0 && (
          <div className="h-32 border border-dashed border-white/10 rounded-xl flex flex-col items-center justify-center text-xs text-gray-500 gap-1">
            <stage.icon className="text-lg opacity-40" />
            <span>No documents in {stage.label}</span>
          </div>
        )}
      </div>
    </div>
  );
}
