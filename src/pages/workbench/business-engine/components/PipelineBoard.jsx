import React from 'react';
import PipelineColumn from './PipelineColumn';
import { BsEye, BsCheckCircle, BsHourglassSplit, BsCheck2All, BsDiagram3 } from 'react-icons/bs';

// A document flows: draft (Needs Review / Ready to Post) -> Approve & Post ->
// settlement decides completion. Once posted, we compare the invoice value against
// the sum of matched payment snippets: paid < invoice -> Partially Completed
// (difference shown); paid == invoice -> Completed. Posting updates the ledger.
const STAGES = [
  { id: 'ready_to_post', label: 'Draft · Ready to Post', icon: BsCheckCircle },
  { id: 'needs_review', label: 'Needs Review', icon: BsEye },
  { id: 'linked_snippet', label: 'Linked Snippet', icon: BsDiagram3 },
  { id: 'partially_completed', label: 'Partially Completed', icon: BsHourglassSplit },
  { id: 'completed', label: 'Completed', icon: BsCheck2All }
];

export default function PipelineBoard({ cards, loading, onMoveCard, onCardClick }) {
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
      <div className="flex h-[600px] bg-[#181818] border border-white/10 rounded-xl overflow-hidden animate-pulse">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex-1 min-w-[280px] border-r border-white/5 p-4 space-y-4">
            <div className="h-6 bg-white/5 rounded w-1/2 mb-6"></div>
            {[...Array(3)].map((_, j) => (
              <div key={j} className="h-24 bg-white/5 rounded-xl"></div>
            ))}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-280px)] min-h-[600px] bg-[#181818] border border-white/10 rounded-xl overflow-x-auto overflow-y-hidden custom-scrollbar snap-x">
      {STAGES.map(stage => (
        <div key={stage.id} className="snap-start h-full">
          <PipelineColumn 
            stage={stage} 
            cards={cards.filter(c => c.stage === stage.id)}
            onDragStart={handleDragStart}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onCardClick={onCardClick}
          />
        </div>
      ))}
    </div>
  );
}
