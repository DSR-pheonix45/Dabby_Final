import React, { useState } from 'react';
import { BsCheckCircle, BsLightningCharge, BsArrowRightCircle, BsCheck2All } from 'react-icons/bs';
import { diService } from '../../../../services/diService';
import { toast } from 'react-hot-toast';
import { useWorkbench } from '../../context/WorkbenchContext';
import { formatCurrency } from '../../utils/currency';

export default function FinancialImpactTab({ doc, onUpdate }) {
  const [approving, setApproving] = useState(false);
  const { activeWorkbench } = useWorkbench();
  const note = doc.di_analysis_notes?.[0];
  const data = note?.extracted_data;

  if (!data) {
    return <div className="p-8 text-center text-gray-500 text-sm">No analysis available.</div>;
  }

  const analysis = data.analysis;
  const financialImpact = data.financial_impact || [];
  const businessEvents = data.business_events || [];
  const expectedJournal = data.expected_journal || [];

  const handleApprove = async () => {
    setApproving(true);
    try {
      await diService.approveDocument(doc.id);
      toast.success("Document approved and posted!");
      if (onUpdate) onUpdate();
    } catch (err) {
      toast.error("Failed to approve document.");
    } finally {
      setApproving(false);
    }
  };

  const isPosted = doc.derivedStatus === 'Posted';

  return (
    <div className="flex flex-col h-full bg-[#111111]">
      <div className="flex-1 overflow-y-auto p-8 space-y-10">
        
        {/* Analysis */}
        {analysis && (
          <section>
            <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">AI Analysis</h3>
            <div className="bg-[#161616] border border-white/5 rounded-xl p-5">
              <p className="text-gray-300 text-sm leading-relaxed">{analysis}</p>
            </div>
          </section>
        )}

        {/* Financial Impact */}
        {financialImpact.length > 0 && (
          <section>
            <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">Financial Impact</h3>
            <div className="grid grid-cols-2 gap-4">
              {financialImpact.map((impact, idx) => (
                <div key={idx} className="bg-[#161616] border border-white/5 rounded-xl p-4 flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-300">{impact.account}</span>
                  <div className={`text-sm font-bold flex items-center gap-1 ${impact.type === 'increase' ? 'text-teal-400' : 'text-rose-400'}`}>
                    {impact.type === 'increase' ? '+' : '-'} {formatCurrency(impact.amount, activeWorkbench?.country)}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Business Events */}
        {businessEvents.length > 0 && (
          <section>
            <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">Business Events Triggered</h3>
            <div className="flex flex-wrap gap-2">
              {businessEvents.map((event, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 px-3 py-1.5 rounded-lg text-xs font-bold">
                  <BsLightningCharge />
                  {event}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Expected Journal */}
        {expectedJournal.length > 0 && (
          <section>
            <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">Expected Journal Entry</h3>
            <div className="bg-[#161616] border border-white/5 rounded-xl overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/5 text-[10px] font-bold text-gray-500 uppercase tracking-widest bg-white/[0.02]">
                    <th className="p-3">Account</th>
                    <th className="p-3 text-right">Debit</th>
                    <th className="p-3 text-right">Credit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {expectedJournal.map((entry, idx) => (
                    <tr key={idx} className="text-gray-300">
                      <td className={`p-3 font-medium ${entry.type === 'credit' ? 'pl-8 text-gray-400' : ''}`}>
                        {entry.account}
                      </td>
                      <td className="p-3 text-right font-mono">
                        {entry.type === 'debit' ? formatCurrency(entry.amount, activeWorkbench?.country) : ''}
                      </td>
                      <td className="p-3 text-right font-mono">
                        {entry.type === 'credit' ? formatCurrency(entry.amount, activeWorkbench?.country) : ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>

      {/* Footer Action */}
      <div className="p-6 border-t border-white/5 bg-[#0A0A0A] shrink-0">
        <button
          onClick={handleApprove}
          disabled={approving || isPosted}
          className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all duration-300 ${
            isPosted 
              ? 'bg-teal-500/20 text-teal-400 border border-teal-500/20 cursor-not-allowed'
              : approving
                ? 'bg-white/10 text-gray-400 cursor-wait'
                : 'bg-teal-500 text-teal-950 hover:bg-teal-400 hover:shadow-[0_0_20px_rgba(45,212,191,0.3)]'
          }`}
        >
          {isPosted ? (
            <>
              <BsCheck2All className="text-xl" />
              Posted to Ledger
            </>
          ) : approving ? (
            'Processing...'
          ) : (
            <>
              Approve & Post
              <BsArrowRightCircle className="text-lg" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
