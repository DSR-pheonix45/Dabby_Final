import React from 'react';
import { BsFileEarmarkText, BsLightningCharge, BsClock, BsLink45Deg, BsDiagram3 } from 'react-icons/bs';
import { useWorkbench } from '../../../../context/WorkbenchContext';
import { formatCurrency } from '../../../../utils/currency';

export default function PipelineCard({ card, onDragStart, onClick }) {
  const { activeWorkbench } = useWorkbench();

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
      <p className="text-lg font-bold text-gray-200 mb-3">{formatCurrency(card.amount, activeWorkbench?.country)}</p>
      
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
