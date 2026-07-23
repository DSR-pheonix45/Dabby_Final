import React, { useState } from 'react';
import { BsLightningCharge, BsArrowRightCircle, BsCheck2All, BsArrowRightShort } from 'react-icons/bs';
import { diService } from '../../../../services/diService';
import { toast } from 'react-hot-toast';
import { useWorkbench } from '../../../../context/WorkbenchContext';
import { formatCurrency } from '../../../../utils/currency';
import { financialRouting, ROUTING_TONE } from '../../../../utils/financialRouting';

export default function FinancialImpactTab({ doc, onUpdate }) {
  const [approving, setApproving] = useState(false);
  const { activeWorkbench } = useWorkbench();
  const note = doc.di_analysis_notes?.[0];

  if (!note) {
    return <div className="p-8 text-center text-gray-500 text-sm">No analysis available. Run the document through analysis first.</div>;
  }

  // Canonical UFO (flattened columns) with legacy extracted_data fallback
  const legacy = note.extracted_data || {};
  const docType = note.document_type || note.classification_type || legacy.document_type || '';
  const money = note.money || {};
  const taxes = note.taxes || {};
  const total = Number(money.total_amount ?? money.subtotal ?? 0);
  const tax = Number(taxes.total_tax ?? 0);
  const parties = note.parties || {};
  const partyName = parties.issuer?.name || legacy.parties?.vendor?.value || legacy.parties?.vendor_name || '';
  const routing = financialRouting(docType, null, partyName);

  const legacyImpact = legacy.financial_impact || [];
  const legacyEvents = legacy.business_events || [];
  const legacyJournal = legacy.expected_journal || [];

  const isPosted = doc.derivedStatus === 'Posted';

  const handleApprove = async () => {
    setApproving(true);
    try {
      const r = await diService.postDocumentToLedger(doc.id);
      const ledger = r.ledger || {};
      if (ledger.status === 'compiled') {
        toast.success(`Posted to ${routing.where} — balanced ${formatCurrency(ledger.debits, activeWorkbench?.country)}`);
      } else if (ledger.status === 'already_compiled') {
        toast('Already posted to the ledger.', { icon: '✅' });
      } else if (ledger.status === 'no_entry') {
        toast('This document type does not post to the ledger.', { icon: 'ℹ️' });
      } else if (ledger.status === 'skipped') {
        toast.error(`Skipped: ${ledger.reason || 'no amount on document'}`);
      } else {
        toast.success('Business event created.');
      }
      if (onUpdate) onUpdate();
    } catch (err) {
      toast.error(err.message || 'Failed to post document.');
    } finally {
      setApproving(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#111111]">
      <div className="flex-1 overflow-y-auto p-8 space-y-8">

        {/* Where this document lands in OPS / the ledger */}
        <section>
          <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">Routing</h3>
          <div className={`flex items-center justify-between rounded-xl border p-5 ${ROUTING_TONE[routing.tone]}`}>
            <div>
              <p className="text-[10px] uppercase tracking-wider opacity-70 font-bold mb-1">Posts to</p>
              <p className="text-lg font-bold flex items-center gap-1">
                <BsArrowRightShort className="text-xl -ml-1" />
                {routing.where}
              </p>
              <p className="text-xs opacity-70 mt-0.5">{routing.hint}</p>
            </div>
            <div className="text-right">
              <span className="px-2.5 py-1 rounded-lg text-xs font-bold border border-current/30">{routing.label}</span>
              <p className="text-lg font-bold mt-2">{formatCurrency(total, activeWorkbench?.country)}</p>
            </div>
          </div>
        </section>

        {/* GST breakdown when present */}
        {tax > 0 && (
          <section>
            <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">Amount Breakdown</h3>
            <div className="bg-[#161616] border border-white/5 rounded-xl divide-y divide-white/5">
              <div className="flex justify-between px-5 py-3 text-sm">
                <span className="text-gray-400">Taxable value</span>
                <span className="text-gray-200 font-semibold">{formatCurrency(net, activeWorkbench?.country)}</span>
              </div>
              <div className="flex justify-between px-5 py-3 text-sm">
                <span className="text-gray-400">Tax (GST)</span>
                <span className="text-gray-200 font-semibold">{formatCurrency(tax, activeWorkbench?.country)}</span>
              </div>
              <div className="flex justify-between px-5 py-3 text-sm bg-white/[0.02]">
                <span className="text-gray-300 font-bold">Total</span>
                <span className="text-white font-bold">{formatCurrency(total, activeWorkbench?.country)}</span>
              </div>
            </div>
          </section>
        )}

        {/* Legacy analysis (only for older extracted_data docs) */}
        {legacyImpact.length > 0 && (
          <section>
            <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">Financial Impact</h3>
            <div className="grid grid-cols-2 gap-4">
              {legacyImpact.map((impact, idx) => (
                <div key={idx} className="bg-[#161616] border border-white/5 rounded-xl p-4 flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-300">{impact.account}</span>
                  <div className={`text-sm font-bold ${impact.type === 'increase' ? 'text-teal-400' : 'text-rose-400'}`}>
                    {impact.type === 'increase' ? '+' : '-'} {formatCurrency(impact.amount, activeWorkbench?.country)}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {legacyEvents.length > 0 && (
          <section>
            <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">Business Events Triggered</h3>
            <div className="flex flex-wrap gap-2">
              {legacyEvents.map((event, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 px-3 py-1.5 rounded-lg text-xs font-bold">
                  <BsLightningCharge />
                  {event}
                </div>
              ))}
            </div>
          </section>
        )}

        {legacyJournal.length > 0 && (
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
                  {legacyJournal.map((entry, idx) => (
                    <tr key={idx} className="text-gray-300">
                      <td className={`p-3 font-medium ${entry.type === 'credit' ? 'pl-8 text-gray-400' : ''}`}>{entry.account}</td>
                      <td className="p-3 text-right font-mono">{entry.type === 'debit' ? formatCurrency(entry.amount, activeWorkbench?.country) : ''}</td>
                      <td className="p-3 text-right font-mono">{entry.type === 'credit' ? formatCurrency(entry.amount, activeWorkbench?.country) : ''}</td>
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
              Posted to {routing.where}
            </>
          ) : approving ? (
            'Posting...'
          ) : (
            <>
              Approve &amp; Post to {routing.label}
              <BsArrowRightCircle className="text-lg" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
