import React from 'react';
import PipelineCard from './PipelineCard';

export default function PipelineColumn({ stage, cards, onDragStart, onDrop, onDragOver, onCardClick }) {
  return (
    <div 
      className="flex-1 min-w-[280px] max-w-[320px] flex flex-col bg-[#111111] border-r border-white/5 last:border-r-0 h-full"
      onDrop={(e) => onDrop(e, stage.id)}
      onDragOver={onDragOver}
    >
      <div className="p-4 border-b border-white/5 flex items-center justify-between sticky top-0 bg-[#111111] z-10">
        <h3 className="text-sm font-bold text-gray-300 flex items-center">
          {stage.icon && <stage.icon className="mr-2 text-gray-500" />}
          {stage.label}
        </h3>
        <span className="text-xs font-semibold bg-white/5 text-gray-400 px-2 py-0.5 rounded-full">
          {cards.length}
        </span>
      </div>
      
      <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
        {cards.map(card => (
          <PipelineCard 
            key={card.id} 
            card={card} 
            onDragStart={onDragStart} 
            onClick={onCardClick}
          />
        ))}
        {cards.length === 0 && (
          <div className="h-24 border border-dashed border-white/10 rounded-xl flex items-center justify-center text-xs text-gray-500">
            Drop items here
          </div>
        )}
      </div>
    </div>
  );
}
