import React from 'react';
import { 
  BsXLg, BsGraphUpArrow, BsArrowDownRight, BsArrowUpRight, 
  BsCashCoin, BsFileEarmarkText, BsReceipt, BsBuilding, BsShieldCheck,
  BsPeopleFill, BsClockHistory, BsLightningCharge, BsDiagram3
} from 'react-icons/bs';

export default function PartyAnalyticsModal({ isOpen, onClose, party }) {
  if (!isOpen || !party) return null;

  const isOwner = party.party_type === 'internal';

  // Generate realistic-looking placeholder metrics based on the party name length
  const mockSeed = party.name.length;
  const avgDSO = isOwner ? 0 : 30 + (mockSeed % 20); // Days Sales Outstanding
  const avgDPO = isOwner ? 0 : 15 + (mockSeed % 30); // Days Payable Outstanding
  const retentionRate = 85 + (mockSeed % 15);
  const totalTrades = 42 + (mockSeed * 3);
  const totalRevenue = 150000 + (mockSeed * 12500);
  const receivables = 25000 + (mockSeed * 3000);
  
  const settlements = [
    { type: 'Payment Receipt', count: Math.floor(totalTrades * 0.4) },
    { type: 'Bank Statement Snippet', count: Math.floor(totalTrades * 0.45) },
    { type: 'Pending', count: Math.floor(totalTrades * 0.15) }
  ];

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity"
        onClick={onClose}
      />
      
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 pointer-events-none">
        <div className="w-full max-w-5xl bg-[#0F0F11] border border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] pointer-events-auto transform transition-all">
          
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/5 bg-[#141416] rounded-t-2xl shrink-0">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl border flex items-center justify-center
                ${isOwner ? 'border-yellow-500/30 text-yellow-500 bg-yellow-500/10' : 'border-teal-500/30 text-teal-400 bg-teal-500/10'}
              `}>
                {isOwner ? <BsShieldCheck size={24} /> : <BsBuilding size={24} />}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white tracking-tight">{party.name}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full border
                    ${isOwner ? 'border-yellow-500/30 text-yellow-500' : 'border-teal-500/30 text-teal-400'}
                  `}>
                    {isOwner ? "Self (Owner)" : "Business Relations"}
                  </span>
                  <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider">
                    Analytics Dashboard
                  </span>
                </div>
              </div>
            </div>
            
            <button 
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
            >
              <BsXLg size={16} />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
            
            {/* Top Metrics Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* DSO */}
              <div className="bg-[#18181A] border border-white/5 rounded-2xl p-5 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <BsClockHistory size={48} className="text-amber-500" />
                </div>
                <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1 flex items-center gap-1">
                  Avg DSO (Days)
                </div>
                <div className="text-3xl font-bold text-white mb-2">{avgDSO} <span className="text-sm font-normal text-gray-500">Days</span></div>
                <div className="flex items-center gap-1 text-xs font-bold text-green-500">
                  <BsArrowDownRight /> 12% vs last year
                </div>
              </div>

              {/* DPO */}
              <div className="bg-[#18181A] border border-white/5 rounded-2xl p-5 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <BsLightningCharge size={48} className="text-indigo-500" />
                </div>
                <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1 flex items-center gap-1">
                  Avg DPO (Days)
                </div>
                <div className="text-3xl font-bold text-white mb-2">{avgDPO} <span className="text-sm font-normal text-gray-500">Days</span></div>
                <div className="flex items-center gap-1 text-xs font-bold text-rose-500">
                  <BsArrowUpRight /> 5% vs last year
                </div>
              </div>

              {/* Retention */}
              <div className="bg-[#18181A] border border-white/5 rounded-2xl p-5 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <BsPeopleFill size={48} className="text-teal-500" />
                </div>
                <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1 flex items-center gap-1">
                  Retention Rate
                </div>
                <div className="text-3xl font-bold text-white mb-2">{retentionRate}%</div>
                <div className="flex items-center gap-1 text-xs font-bold text-green-500">
                  <BsArrowUpRight /> High Loyalty
                </div>
              </div>

              {/* Receivables Contribution */}
              <div className="bg-gradient-to-br from-teal-900/40 to-emerald-900/20 border border-teal-500/20 rounded-2xl p-5 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:opacity-30 transition-opacity">
                  <BsCashCoin size={48} className="text-teal-400" />
                </div>
                <div className="text-[10px] text-teal-300/70 font-bold uppercase tracking-widest mb-1 flex items-center gap-1">
                  Receivables Liability
                </div>
                <div className="text-3xl font-bold text-white mb-2">${receivables.toLocaleString()}</div>
                <div className="text-xs font-medium text-teal-400/80">
                  Total outstanding amounts
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* Left Column: Trade & Settlements */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
                    <BsDiagram3 className="text-teal-400" />
                    Trade Connections
                  </h3>
                  <div className="bg-[#18181A] border border-white/5 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <div className="text-3xl font-bold text-white">{totalTrades}</div>
                        <div className="text-xs font-semibold text-gray-500 uppercase tracking-widest mt-1">Total Linked Trades</div>
                      </div>
                      <div className="w-12 h-12 rounded-full bg-teal-500/10 flex items-center justify-center">
                        <BsGraphUpArrow className="text-teal-400 text-xl" />
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="text-xs font-bold text-gray-400 uppercase tracking-widest pb-2 border-b border-white/5">Settlement Proofs</div>
                      
                      {settlements.map((s, idx) => (
                        <div key={idx} className="flex items-center justify-between group">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-white/5 border border-white/10
                              ${s.type === 'Bank Statement Snippet' ? 'text-indigo-400' : s.type === 'Payment Receipt' ? 'text-teal-400' : 'text-amber-400'}
                            `}>
                              {s.type === 'Bank Statement Snippet' ? <BsFileEarmarkText /> : s.type === 'Payment Receipt' ? <BsReceipt /> : <BsClockHistory />}
                            </div>
                            <span className="text-sm font-semibold text-gray-300 group-hover:text-white transition-colors">{s.type}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-bold text-white">{s.count} Trades</span>
                            <div className="w-24 h-1.5 bg-white/5 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full ${s.type === 'Bank Statement Snippet' ? 'bg-indigo-500' : s.type === 'Payment Receipt' ? 'bg-teal-500' : 'bg-amber-500'}`}
                                style={{ width: `${(s.count / totalTrades) * 100}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Revenue Contribution */}
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
                  <BsCashCoin className="text-yellow-500" />
                  Revenue Contribution
                </h3>
                <div className="bg-[#18181A] border border-white/5 rounded-2xl p-6 h-full flex flex-col">
                  <div className="mb-8">
                    <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Total Lifetime Revenue</div>
                    <div className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-500 to-amber-300">
                      ${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                  </div>

                  <div className="flex-1 flex flex-col justify-end space-y-4">
                    <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">Revenue over time (Mock)</div>
                    <div className="flex items-end gap-2 h-32 w-full border-b border-white/5 pb-2">
                      {[40, 65, 45, 80, 55, 90, 75, 100].map((height, i) => (
                        <div key={i} className="flex-1 flex flex-col justify-end group">
                          <div 
                            className="w-full bg-yellow-500/20 group-hover:bg-yellow-500/40 border border-yellow-500/30 rounded-t-sm transition-all duration-300 relative"
                            style={{ height: `${height}%` }}
                          >
                            <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-bold text-yellow-400 opacity-0 group-hover:opacity-100 transition-opacity">
                              {height}k
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between text-[10px] font-bold text-gray-600 uppercase">
                      <span>Jan</span>
                      <span>Apr</span>
                      <span>Jul</span>
                      <span>Oct</span>
                    </div>
                  </div>
                  
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </>
  );
}
