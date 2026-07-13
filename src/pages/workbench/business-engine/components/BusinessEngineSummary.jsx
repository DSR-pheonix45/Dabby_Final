import React from 'react';
import { BsCheckCircle, BsEye, BsHourglassSplit, BsCheck2All } from 'react-icons/bs';

export default function BusinessEngineSummary({ kpis, loading }) {
  const cards = [
    { title: 'Ready to Post', value: kpis?.readyToPost || 0, icon: BsCheckCircle, color: 'text-teal-400', bg: 'bg-teal-500/10' },
    { title: 'Needs Review', value: kpis?.needsReview || 0, icon: BsEye, color: 'text-purple-400', bg: 'bg-purple-500/10' },
    { title: 'Partially Completed', value: kpis?.partiallyCompleted || 0, icon: BsHourglassSplit, color: 'text-amber-400', bg: 'bg-amber-500/10' },
    { title: 'Completed', value: kpis?.completed || 0, icon: BsCheck2All, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-[#181818] border border-white/10 rounded-xl p-5 h-24 animate-pulse"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div key={idx} className="bg-[#181818] border border-white/10 rounded-xl p-5 shadow-sm hover:border-white/20 transition-colors">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{card.title}</p>
                <h3 className="text-2xl font-bold text-white mt-2">{card.value}</h3>
              </div>
              <div className={`p-2.5 rounded-lg border border-white/5 ${card.bg} ${card.color}`}>
                <Icon className="text-lg" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
