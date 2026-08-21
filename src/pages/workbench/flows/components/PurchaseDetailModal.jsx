import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BsX, 
  BsShop, 
  BsReceipt, 
  BsCashCoin, 
  BsFileEarmarkText, 
  BsJournalText, 
  BsBoxSeam, 
  BsCheckCircleFill, 
  BsClockHistory, 
  BsGraphUpArrow,
  BsLightningCharge,
  BsArrowRight,
  BsEye
} from 'react-icons/bs';
import { diService } from '../../../../services/diService';
import { extractDocLineItems } from '../../../../services/salesService';
import { classifyDocumentParties } from '../../../../utils/docPartyClassifier';
import { toast } from 'react-hot-toast';

export default function PurchaseDetailModal({ isOpen, onClose, workbenchId, activeWorkbench, doc, onUpdate }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [isPostingToCoa, setIsPostingToCoa] = useState(false);
  const [isSettling, setIsSettling] = useState(false);

  if (!isOpen || !doc) return null;

  const note = doc.di_analysis_notes?.[0] || {};
  const data = note.extracted_data || {};
  const classified = classifyDocumentParties(doc, activeWorkbench);

  const vendorName = classified.externalParty?.name || note.parties?.vendor?.name || data.parties?.vendor?.value || "Vendor";
  const refNo = data.document?.reference_number?.value || doc.original_filename || `BILL-${doc.id.slice(0, 6)}`;
  const docDate = doc.created_at ? doc.created_at.split('T')[0] : new Date().toISOString().split('T')[0];

  const totalAmt = note.money?.total_amount !== undefined ? Number(note.money?.total_amount) : (Number(data.financials?.total_amount?.value) || 0);
  const taxAmt = note.taxes?.total_tax !== undefined ? Number(note.taxes?.total_tax) : (Number(data.financials?.total_tax?.value) || 0);
  const subtotalAmt = Math.max(0, totalAmt - taxAmt);

  const logs = doc.di_document_processing_logs || [];
  const isSettled = logs.some(l => l.stage === 'post' && l.status === 'success');
  const isPostedToCoa = isSettled || doc.is_posted;

  // Extract actual service/product line items using shared AI extractor
  const lineItems = extractDocLineItems(doc);

  const handlePushToCoa = async () => {
    if (isPostedToCoa || isPostingToCoa) return;
    setIsPostingToCoa(true);
    try {
      if (doc.id) {
        await diService.postDocumentToLedger(doc.id);
      } else {
        const narration = `Vendor Bill #${refNo} from ${vendorName} for ₹${totalAmt.toLocaleString()} [Dr Expense / Cr Accounts Payable]`;
        await diService.createTransfer(workbenchId, {
          transfer_type: 'bank_to_bank',
          from_account: 'Accounts Payable (AP)',
          to_account: `Operating Expenses (${vendorName})`,
          amount: totalAmt,
          transfer_date: docDate,
          reference_number: refNo,
          narration
        });
      }
      toast.success(`Posted Purchase Bill #${refNo} to COA Ledger!`, { icon: '⚡' });
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('ledger:updated'));
      }
      if (onUpdate) onUpdate();
    } catch (err) {
      toast.error(err.message || 'Failed to post purchase bill to COA ledger');
    } finally {
      setIsPostingToCoa(false);
    }
  };

  const handleSettleBill = async () => {
    if (isSettling) return;
    setIsSettling(true);
    try {
      await diService.postDocumentToLedger(doc.id);
      toast.success(`Bill #${refNo} marked as Paid & Settled!`, { icon: '✅' });
      if (onUpdate) onUpdate();
    } catch (err) {
      toast.error(err.message || 'Failed to mark bill as settled');
    } finally {
      setIsSettling(false);
    }
  };

  // Derive smart expense category based on vendor name
  const getExpenseCategory = () => {
    const nameLower = vendorName.toLowerCase();
    if (nameLower.includes('dlf') || nameLower.includes('space') || nameLower.includes('realty') || nameLower.includes('rent')) {
      return 'Office Rent & Facilities Expense';
    }
    if (nameLower.includes('aws') || nameLower.includes('amazon') || nameLower.includes('cloud') || nameLower.includes('google') || nameLower.includes('azure')) {
      return 'Cloud Infrastructure & Software Expense';
    }
    if (nameLower.includes('telecom') || nameLower.includes('airtel') || nameLower.includes('jio')) {
      return 'Utilities & Communication Expense';
    }
    return 'General Operating Expense (OPEX)';
  };

  const expenseCategory = getExpenseCategory();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/70 backdrop-blur-sm transition-opacity">
      <div className="w-full max-w-3xl h-full bg-[#18181A] border-l border-white/10 flex flex-col font-dm-sans text-gray-200 shadow-2xl animate-in slide-in-from-right duration-200">
        {/* Header Bar */}
        <div className="px-6 py-4 border-b border-white/10 bg-[#111111] flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl">
              <BsShop className="text-xl" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-bold text-white tracking-tight">{vendorName}</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  Vendor Bill / Expense
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">Reference: <span className="font-mono text-gray-300">{refNo}</span> • Date: {docDate}</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors">
              <BsX className="text-2xl" />
            </button>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="px-6 py-3 bg-[#141416] border-b border-white/5 flex items-center justify-between gap-3 overflow-x-auto shrink-0">
          <div className="flex items-center space-x-2">
            {!isSettled ? (
              <button
                onClick={handleSettleBill}
                disabled={isSettling}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black rounded-lg text-xs font-bold transition-all shadow-md"
              >
                <BsCashCoin />
                <span>{isSettling ? 'Settling...' : 'Settle & Mark Paid'}</span>
              </button>
            ) : (
              <div className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-bold">
                <BsCheckCircleFill className="text-emerald-400" />
                <span>Settled & Paid</span>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={() => navigate('/dashboard/workbench/ops', { state: { tab: 'ap' } })}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-indigo-300 border border-white/10 rounded-lg text-xs font-semibold transition-colors"
            >
              <BsGraphUpArrow />
              <span>View AP in OPS</span>
            </button>

            {isPostedToCoa ? (
              <div className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-bold shadow-sm">
                <BsCheckCircleFill className="text-emerald-400" />
                <span>Posted to COA Ledger</span>
              </div>
            ) : (
              <button
                onClick={handlePushToCoa}
                disabled={isPostingToCoa}
                title="Post double-entry financial transaction to COA Ledger"
                className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-gradient-to-r from-indigo-500/20 to-emerald-500/20 hover:from-indigo-500/30 hover:to-emerald-500/30 text-indigo-300 border border-indigo-500/40 rounded-lg text-xs font-extrabold transition-all shadow-md shadow-indigo-500/10 cursor-pointer active:scale-95"
              >
                {isPostingToCoa ? (
                  <>
                    <BsClockHistory className="animate-spin text-indigo-400" />
                    <span>Posting to COA...</span>
                  </>
                ) : (
                  <>
                    <BsLightningCharge className="text-indigo-400 text-sm animate-pulse" />
                    <span>Push to COA Ledger</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Tab Selection Bar */}
        <div className="px-6 border-b border-white/10 bg-[#18181A] shrink-0">
          <div className="flex space-x-6">
            {['overview', 'items', 'payments', 'documents', 'accounting'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors ${
                  activeTab === tab 
                    ? 'border-indigo-500 text-indigo-400' 
                    : 'border-transparent text-gray-400 hover:text-white'
                }`}
              >
                {tab === 'items' ? 'Purchased Items / Services' : tab}
              </button>
            ))}
          </div>
        </div>

        {/* Drawer Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Vendor & Status Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-[#111111] border border-white/5 rounded-xl space-y-1">
                  <div className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Vendor / Counterparty</div>
                  <div className="text-base font-bold text-white flex items-center gap-2">
                    <BsShop className="text-indigo-400" />
                    <span>{vendorName}</span>
                  </div>
                  {data.parties?.vendor?.gstin?.value && (
                    <div className="text-xs font-mono text-gray-400">GSTIN: {data.parties.vendor.gstin.value}</div>
                  )}
                </div>

                <div className="p-4 bg-[#111111] border border-white/5 rounded-xl space-y-1">
                  <div className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">AP Status & Classification</div>
                  <div className="flex items-center space-x-2 pt-1">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider border ${
                      isSettled ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                    }`}>
                      {isSettled ? 'Settled' : 'Pending AP'}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold text-gray-400 bg-white/5 border border-white/10">
                      {expenseCategory}
                    </span>
                  </div>
                </div>
              </div>

              {/* Financial KPI Breakdown */}
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-[#111111] border border-white/5 rounded-xl text-center">
                  <div className="text-[10px] text-gray-500 uppercase font-bold">Subtotal (Pre-Tax)</div>
                  <div className="text-lg font-bold text-white mt-1">₹{subtotalAmt.toLocaleString()}</div>
                </div>
                <div className="p-4 bg-[#111111] border border-white/5 rounded-xl text-center">
                  <div className="text-[10px] text-indigo-400 uppercase font-bold">GST Input Tax Credit</div>
                  <div className="text-lg font-bold text-indigo-300 mt-1">₹{taxAmt.toLocaleString()}</div>
                </div>
                <div className="p-4 bg-[#111111] border border-white/5 rounded-xl text-center">
                  <div className="text-[10px] text-emerald-400 uppercase font-bold">Total Bill Payable</div>
                  <div className="text-lg font-bold text-emerald-400 mt-1">₹{totalAmt.toLocaleString()}</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'items' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">Purchased Items & Services Details</h3>
                <span className="text-[10px] text-indigo-400 font-semibold bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                  AI Extracted Line Items ({lineItems.length})
                </span>
              </div>
              <div className="bg-[#111111] border border-white/5 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#18181A] text-gray-400 font-semibold border-b border-white/5">
                    <tr>
                      <th className="p-3">Item / Service Description</th>
                      <th className="p-3 text-center">Qty</th>
                      <th className="p-3 text-right">Rate</th>
                      <th className="p-3 text-right">Tax</th>
                      <th className="p-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {lineItems.map((item, i) => (
                      <tr key={i} className="hover:bg-white/[0.02]">
                        <td className="p-3 font-semibold text-white">{item.name}</td>
                        <td className="p-3 text-center text-gray-300">{item.quantity}</td>
                        <td className="p-3 text-right text-gray-300">₹{(item.rate || 0).toLocaleString()}</td>
                        <td className="p-3 text-right text-gray-400">₹{(item.tax || 0).toLocaleString()}</td>
                        <td className="p-3 text-right font-bold text-indigo-400">₹{(item.total || 0).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'payments' && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">Settlement & Outflow Timeline</h3>
              {!isSettled ? (
                <div className="p-8 text-center space-y-3 bg-[#111111] border border-white/5 rounded-xl">
                  <div className="text-xs text-amber-400 font-semibold">Payment Pending in Accounts Payable (AP)</div>
                  <p className="text-[11px] text-gray-400 max-w-md mx-auto">
                    This bill of ₹{totalAmt.toLocaleString()} is currently outstanding. Click "Settle & Mark Paid" above when payment is processed from your bank.
                  </p>
                </div>
              ) : (
                <div className="p-4 bg-[#111111] border border-white/5 rounded-xl flex items-center justify-between text-xs">
                  <div className="space-y-0.5">
                    <div className="font-bold text-white flex items-center gap-2">
                      <BsCashCoin className="text-emerald-400" />
                      <span>Bank Outflow / Direct Settlement</span>
                    </div>
                    <div className="text-[10px] text-gray-500 font-mono">Ref: {refNo} • Date: {docDate}</div>
                  </div>
                  <div className="text-base font-bold text-emerald-400">
                    -₹{totalAmt.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'documents' && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">Linked Source Document in Doc Vault</h3>
              <div className="p-4 bg-[#111111] border border-white/5 rounded-xl flex items-center justify-between text-xs">
                <div className="flex items-center space-x-3">
                  <BsFileEarmarkText className="text-indigo-400 text-xl" />
                  <div>
                    <div className="font-bold text-white">{doc.original_filename}</div>
                    <div className="text-[10px] text-gray-500 font-mono">Doc Vault ID: {doc.id}</div>
                  </div>
                </div>
                <button
                  onClick={() => navigate('/dashboard/workbench/doc-vault')}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-indigo-300 rounded-lg text-xs font-semibold transition-colors"
                >
                  <BsEye />
                  <span>Open in Doc Vault</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'accounting' && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400">Chart of Accounts (COA) Double-Entry Journal</h3>
              <div className="bg-[#111111] border border-white/5 rounded-xl p-4 space-y-3 font-mono text-xs">
                <div className="p-3 bg-[#18181A] border border-white/5 rounded-lg flex items-center justify-between">
                  <div>
                    <div className="text-indigo-400 font-bold">Dr {expenseCategory}</div>
                    <div className="text-gray-400 pl-4 mt-0.5">Cr Accounts Payable — {vendorName}</div>
                    <div className="text-[10px] text-gray-500 mt-1">Vendor Bill Ingestion (Pre-Tax Subtotal)</div>
                  </div>
                  <div className="text-sm font-bold text-white">
                    ₹{subtotalAmt.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                </div>

                {taxAmt > 0 && (
                  <div className="p-3 bg-[#18181A] border border-white/5 rounded-lg flex items-center justify-between">
                    <div>
                      <div className="text-indigo-400 font-bold">Dr GST Input Tax Credit (ITC)</div>
                      <div className="text-gray-400 pl-4 mt-0.5">Cr Accounts Payable — {vendorName}</div>
                      <div className="text-[10px] text-gray-500 mt-1">Input Tax Claimable</div>
                    </div>
                    <div className="text-sm font-bold text-white">
                      ₹{taxAmt.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
