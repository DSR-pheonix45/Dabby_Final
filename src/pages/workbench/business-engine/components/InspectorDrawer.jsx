import React, { useState, useEffect } from 'react';
import { BsXLg, BsFileEarmarkText, BsLightningCharge, BsDiagram3, BsEye } from 'react-icons/bs';
import { toast } from 'react-hot-toast';
import { useWorkbench } from '../../../../context/WorkbenchContext';
import { formatCurrency } from '../../../../utils/currency';
import { diService } from '../../../../services/diService';
import { financialRouting, ROUTING_TONE } from '../../../../utils/financialRouting';
import AddSettlementModal from './AddSettlementModal';

const lineDesc = (li, i) => li.description || li.desc || li.narration || li.particulars || li.name || `Line ${i + 1}`;
const lineAmt = (li) => Number(li.amount ?? li.total ?? li.line_total ?? li.credit ?? li.debit ?? li.value ?? 0);

export default function InspectorDrawer({ isOpen, onClose, data, onPosted }) {
  const { activeWorkbench } = useWorkbench();
  const [posting, setPosting] = useState(false);
  const [posted, setPosted] = useState(null); // { status, debits, credits, entries }
  const [showSettlementModal, setShowSettlementModal] = useState(false);

  useEffect(() => { setPosted(null); }, [data?.id]);

  const handlePost = async () => {
    if (!data?.id) return;
    setPosting(true);
    try {
      const r = await diService.postDocumentToLedger(data.id);
      const ledger = r.ledger || {};
      if (ledger.status === 'compiled') {
        setPosted(ledger);
        toast.success(`Posted to ledger — balanced ${formatCurrency(ledger.debits, activeWorkbench?.country)}`);
        onPosted?.();
      } else if (ledger.status === 'already_compiled') {
        toast('Already posted to the ledger.', { icon: '✅' });
        onPosted?.();
      } else if (ledger.status === 'no_entry') {
        toast('This document type does not post to the ledger.', { icon: 'ℹ️' });
      } else if (ledger.status === 'skipped') {
        toast.error(`Skipped: ${ledger.reason || 'no amount on document'}`);
      } else {
        toast.success('Business event created.');
        onPosted?.();
      }
    } catch (e) {
      toast.error(e.message || 'Failed to post to ledger');
    } finally {
      setPosting(false);
    }
  };

  if (!isOpen || !data) return null;

  const routing = financialRouting(data.type, data.eventType);

  // Prefer freshly-posted entries; fall back to any card-provided journal
  const journalEntries = posted?.entries
    ? posted.entries.map((e) => ({ account: e.role, type: e.direction, amount: e.amount }))
    : data.journal;

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/50 z-40 transition-opacity" 
        onClick={onClose}
      />
      <div 
        className={`fixed top-0 right-0 h-full w-[400px] max-w-full bg-[#111111] border-l border-white/10 z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        } flex flex-col`}
      >
        <div className="flex items-center justify-between p-6 border-b border-white/10 bg-[#181818]">
          <h2 className="text-lg font-bold text-white flex items-center">
            <BsEye className="mr-2 text-teal-400" /> Inspector
          </h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <BsXLg />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          
          {/* Document Header */}
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center space-x-2 mb-1">
                <BsFileEarmarkText className="text-gray-400 text-sm" />
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{data.type}</span>
              </div>
              <h3 className="text-xl font-bold text-white">{data.party}</h3>
            </div>
            <div className="text-right">
              <span className={`px-2 py-1 rounded text-xs font-bold ${data.confidence >= 90 ? 'bg-teal-500/10 text-teal-400' : 'bg-amber-500/10 text-amber-400'}`}>
                {data.confidence}% Conf.
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/5 p-3 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Amount</p>
              <p className="text-lg font-bold text-white">{formatCurrency(data.amount, activeWorkbench?.country)}</p>
            </div>
            <div className="bg-white/5 p-3 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Processing Time</p>
              <p className="text-sm font-semibold text-gray-300 flex items-center">
                <BsLightningCharge className="mr-1 text-teal-400" /> {data.time || 'N/A'}
              </p>
            </div>
          </div>

          {/* Where this document lands (OPS / ledger routing) */}
          <div className={`flex flex-col space-y-2 p-3 rounded-lg border ${ROUTING_TONE[routing.tone]}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-wider opacity-70 font-bold">Posts to Ledger</p>
                <p className="text-sm font-bold">{routing.where}</p>
              </div>
              <div className="text-right">
                <span className="px-2 py-0.5 rounded text-xs font-bold border border-current/30">{routing.label}</span>
              </div>
            </div>

            {/* COA Target Account Dropdown Selector */}
            <div className="pt-2 border-t border-current/20">
              <label className="text-[10px] uppercase font-bold text-gray-300 block mb-1">Target COA Account</label>
              <select
                value={data.targetAccount || "default"}
                onChange={(e) => toast.success(`Mapped doc value to ${e.target.value}`)}
                className="w-full bg-[#1e1e1e] text-xs text-white border border-white/20 rounded p-1.5 font-mono"
              >
                <option value="default">Auto-select COA Account ({routing.where})</option>
                <option value="1100">1100 - Accounts Receivable (Asset)</option>
                <option value="2100">2100 - Accounts Payable (Liability)</option>
                <option value="4000">4000 - Sales Revenue (Income)</option>
                <option value="5000">5000 - Cost of Goods Sold (COGS)</option>
                <option value="5100">5100 - Travel Allowance & Fuel (OPEX)</option>
                <option value="5200">5200 - Rent & Utilities (OPEX)</option>
                <option value="1020">1020 - Petty Cash Bucket (Asset)</option>
              </select>
            </div>
          </div>

          {/* Original Linked Document in Doc Vault */}
          <div className="bg-[#181818] border border-white/10 p-3 rounded-lg flex items-center justify-between text-xs">
            <div>
              <p className="text-[10px] text-gray-500 uppercase font-bold">Linked Document Proof</p>
              <p className="text-white font-semibold flex items-center mt-0.5">
                <BsFileEarmarkText className="mr-1.5 text-teal-400" />
                {data.document_id ? `Doc Vault Ref: #${data.document_id.slice(0, 12)}` : "Generated PDF Proof Stored in Vault"}
              </p>
            </div>
            <button 
              onClick={() => toast("Opening Document Proof in Doc Vault...", { icon: "📄" })}
              className="px-2.5 py-1 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 rounded text-[11px] font-bold"
            >
              View Proof
            </button>
          </div>

          {/* Settlement status (posted invoices): invoice value vs matched snippets */}
          {data.settlement && (
            <div className="bg-[#181818] border border-white/10 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-gray-300">Settlement</span>
                {data.settlement.status === 'completed' ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400">Completed</span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400">Partially Completed</span>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-[10px] text-gray-500">Invoice</p>
                  <p className="text-sm font-bold text-gray-200">{formatCurrency(data.settlement.invoiceValue, activeWorkbench?.country)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-500">Paid</p>
                  <p className="text-sm font-bold text-emerald-400">{formatCurrency(data.settlement.paid, activeWorkbench?.country)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-500">Difference</p>
                  <p className={`text-sm font-bold ${data.settlement.difference > 0.01 ? 'text-amber-400' : 'text-gray-400'}`}>
                    {formatCurrency(data.settlement.difference, activeWorkbench?.country)}
                  </p>
                </div>
              </div>
              
              {data.settlement.status !== 'completed' && (
                <button 
                  onClick={() => setShowSettlementModal(true)}
                  className="w-full mt-3 py-1.5 text-[11px] font-bold text-teal-400 border border-teal-500/30 rounded hover:bg-teal-500/10 transition-colors uppercase tracking-wider"
                >
                  + Add Settlement
                </button>
              )}
            </div>
          )}

          {/* Analysis Summary */}
          {data.analysis && (
            <div>
              <h4 className="text-sm font-bold text-white border-b border-white/10 pb-2 mb-3">AI Analysis Summary</h4>
              <p className="text-sm text-gray-400 leading-relaxed mb-3">{data.analysis.summary}</p>
              <div className="flex flex-wrap gap-2">
                {data.analysis.tags.map(tag => (
                  <span key={tag} className="px-2 py-1 bg-[#181818] border border-white/10 rounded text-xs text-gray-300">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}


          {/* Extracted line items (UFO evidence) */}
          <div>
            <h4 className="text-sm font-bold text-white border-b border-white/10 pb-2 mb-3 flex items-center justify-between">
              <span className="flex items-center">
                <BsFileEarmarkText className="mr-2 text-teal-400" /> Extracted Line Items
              </span>
              {data.ufo?.line_items?.length > 0 && (
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{data.ufo.line_items.length} rows</span>
              )}
            </h4>

            {data.ufo?.line_items?.length > 0 ? (
              <div className="bg-[#181818] border border-white/10 rounded-lg divide-y divide-white/5 max-h-56 overflow-y-auto">
                {data.ufo.line_items.slice(0, 10).map((li, i) => (
                  <div key={i} className="flex justify-between items-center px-3 py-2 text-xs">
                    <span className="text-gray-300 truncate mr-2">{lineDesc(li, i)}</span>
                    <span className="text-gray-400 font-medium whitespace-nowrap">{formatCurrency(lineAmt(li), activeWorkbench?.country)}</span>
                  </div>
                ))}
                {data.ufo.line_items.length > 10 && (
                  <div className="px-3 py-2 text-[11px] text-gray-600">+{data.ufo.line_items.length - 10} more…</div>
                )}
              </div>
            ) : (
              <div className="border border-dashed border-white/10 rounded-xl p-6 text-center bg-white/5 flex flex-col items-center justify-center">
                <BsFileEarmarkText className="text-gray-500 mb-2" size={24} />
                <p className="text-sm text-gray-400 font-medium">No line items extracted yet.</p>
                <p className="text-xs text-gray-600 mt-1">Run the document through analysis to populate the UFO.</p>
              </div>
            )}
          </div>

          {/* Proposed Journal */}
          <div>
            <h4 className="text-sm font-bold text-white border-b border-white/10 pb-2 mb-3 flex items-center">
              <BsDiagram3 className="mr-2 text-teal-400" /> {posted ? 'Posted Journal' : 'Proposed Journal'}
            </h4>
            {journalEntries ? (
              <div className="bg-[#181818] border border-white/10 rounded-lg overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#111111]/50 border-b border-white/10 text-gray-500">
                    <tr>
                      <th className="px-3 py-2 font-medium">Account</th>
                      <th className="px-3 py-2 font-medium text-right">Debit</th>
                      <th className="px-3 py-2 font-medium text-right">Credit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {journalEntries.map((entry, idx) => (
                      <tr key={idx} className="hover:bg-white/5">
                        <td className="px-3 py-2 text-gray-300">{entry.account}</td>
                        <td className="px-3 py-2 text-right font-medium text-gray-300">
                          {entry.type === 'debit' ? formatCurrency(entry.amount, activeWorkbench?.country) : '-'}
                        </td>
                        <td className="px-3 py-2 text-right font-medium text-gray-300">
                          {entry.type === 'credit' ? formatCurrency(entry.amount, activeWorkbench?.country) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="border border-dashed border-white/10 rounded-lg p-4 text-center bg-white/5">
                <p className="text-sm text-gray-400 font-medium">No journal proposed yet</p>
                <p className="text-xs text-gray-600 mt-1">Debits &amp; credits are generated by the Accounting Rule Engine once this document is promoted to a Business Event.</p>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-white/10 flex justify-end space-x-3">
            <button className="px-4 py-2 border border-white/10 hover:border-white/20 rounded-lg text-sm text-gray-300 transition-colors">
              View Evidence
            </button>
            <button
              onClick={handlePost}
              disabled={posting || !!posted}
              className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-black font-bold rounded-lg text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {posting ? 'Posting…' : posted ? 'Posted ✓' : 'Approve & Post'}
            </button>
          </div>
        </div>
      </div>
      
      <AddSettlementModal 
        isOpen={showSettlementModal} 
        onClose={() => setShowSettlementModal(false)} 
        data={data}
      />
    </>
  );
}
