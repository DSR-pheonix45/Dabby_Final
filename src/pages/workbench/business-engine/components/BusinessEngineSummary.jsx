import React from 'react';
import { BsCloudUpload, BsCpu, BsEye, BsCheckCircle, BsExclamationTriangle } from 'react-icons/bs';

export default function BusinessEngineSummary({ kpis, loading }) {
  const cards = [
    { title: 'Documents Uploaded', value: kpis?.uploaded || 0, icon: BsCloudUpload, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { title: 'Processing', value: kpis?.processing || 0, icon: BsCpu, color: 'text-amber-400', bg: 'bg-amber-500/10' },
    { title: 'Awaiting Review', value: kpis?.awaitingReview || 0, icon: BsEye, color: 'text-purple-400', bg: 'bg-purple-500/10' },
    { title: 'Ready to Post', value: kpis?.readyToPost || 0, icon: BsCheckCircle, color: 'text-teal-400', bg: 'bg-teal-500/10' },
    { title: 'Failed', value: kpis?.failed || 0, icon: BsExclamationTriangle, color: 'text-rose-400', bg: 'bg-rose-500/10' },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-[#181818] border border-white/10 rounded-xl p-5 h-24 animate-pulse"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
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
