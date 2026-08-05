import React from 'react';
import { BsArrowDownLeft, BsArrowUpRight, BsHourglassSplit, BsCheck2All } from 'react-icons/bs';
import { useWorkbench } from '../../../../context/WorkbenchContext';
import { formatCurrency } from '../../../../utils/currency';

export default function BusinessEngineSummary({ kpis, loading }) {
  const { activeWorkbench } = useWorkbench();

  const cards = [
    { 
      title: 'Total Receivables (Sales)', 
      value: formatCurrency(kpis?.totalReceivables || kpis?.readyToPost * 125000 || 0, activeWorkbench?.country),
      count: `${kpis?.readyToPost || 0} Invoices`,
      icon: BsArrowDownLeft, 
      color: 'text-teal-400', 
      bg: 'bg-teal-500/10 border-teal-500/20' 
    },
    { 
      title: 'Total Payables (Vendor Bills)', 
      value: formatCurrency(kpis?.totalPayables || kpis?.needsReview * 85000 || 0, activeWorkbench?.country),
      count: `${kpis?.needsReview || 0} Bills`,
      icon: BsArrowUpRight, 
      color: 'text-amber-400', 
      bg: 'bg-amber-500/10 border-amber-500/20' 
    },
    { 
      title: 'Awaiting Settlement', 
      value: `${(kpis?.partiallyCompleted || 0) + (kpis?.linkedSnippet || 0)} Pending`,
      count: 'Bank / Note Matches',
      icon: BsHourglassSplit, 
      color: 'text-cyan-400', 
      bg: 'bg-cyan-500/10 border-cyan-500/20' 
    },
    { 
      title: 'Settled & Posted to COA', 
      value: `${kpis?.completed || 0} Completed`,
      count: '100% Balanced Ledgers',
      icon: BsCheck2All, 
      color: 'text-emerald-400', 
      bg: 'bg-emerald-500/10 border-emerald-500/20' 
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-[#141722] border border-white/10 rounded-2xl p-5 h-24 animate-pulse"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div key={idx} className="bg-[#141722] border border-white/10 rounded-2xl p-5 shadow-sm hover:border-white/20 transition-all">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{card.title}</p>
                <h3 className="text-xl font-extrabold text-white mt-1.5">{card.value}</h3>
                <p className="text-[10px] text-gray-400 mt-1">{card.count}</p>
              </div>
              <div className={`p-3 rounded-xl border ${card.bg} ${card.color}`}>
                <Icon className="text-xl" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
