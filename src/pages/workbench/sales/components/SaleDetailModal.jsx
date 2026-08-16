import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BsX, 
  BsBuilding, 
  BsReceipt, 
  BsCashCoin, 
  BsFileEarmarkText, 
  BsJournalText, 
  BsBoxSeam, 
  BsArrowReturnLeft, 
  BsCheckCircleFill, 
  BsClockHistory, 
  BsGraphUpArrow,
  BsLightningCharge
} from 'react-icons/bs';
import RecordPaymentModal from './RecordPaymentModal';
import CreateReturnModal from './CreateReturnModal';
import { diService } from '../../../../services/diService';
import { salesService } from '../../../../services/salesService';
import { toast } from 'react-hot-toast';

export default function SaleDetailModal({ isOpen, onClose, workbenchId, sale, onUpdate }) {
  const navigate = useNavigate();
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [isPostingToCoa, setIsPostingToCoa] = useState(false);
  const [isPostedToCoa, setIsPostedToCoa] = useState(sale?.status === 'Posted' || sale?.is_posted);

  if (!isOpen || !sale) return null;

  const handlePushToCoa = async () => {
    if (isPostedToCoa || isPostingToCoa) return;
    setIsPostingToCoa(true);
    try {
      salesService.markAsPosted(workbenchId, sale.id);

      if (sale.document_id) {
        await diService.postDocumentToLedger(sale.document_id);
      } else {
        const narration = `Sales Invoice #${sale.id} issued to ${sale.customer?.name || 'Customer'} for ₹${Number(sale.grand_total || sale.amount || 0).toLocaleString()} [Dr Trade Debtors (AR) / Cr Sales Revenue]`;
        await diService.createTransfer(workbenchId, {
          transfer_type: 'bank_to_bank',
          from_account: `Sales Revenue (${sale.customer?.name || 'Customer'})`,
          to_account: 'Trade Debtors (Accounts Receivable)',
          amount: Number(sale.grand_total || sale.amount || 0),
          transfer_date: sale.date || new Date().toISOString().split('T')[0],
          reference_number: `SALE-INV-${sale.id}`,
          narration
        });
      }
      setIsPostedToCoa(true);
      toast.success(`Posted Sale #${sale.id} to COA Ledger!`, { icon: '⚡' });
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('ledger:updated'));
      }
      if (onUpdate) onUpdate();
    } catch (err) {
      toast.error(err.message || 'Failed to post sale to COA ledger');
    } finally {
      setIsPostingToCoa(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/70 backdrop-blur-sm transition-opacity">
      <div className="w-full max-w-3xl h-full bg-[#18181A] border-l border-white/10 flex flex-col font-dm-sans text-gray-200 shadow-2xl animate-in slide-in-from-right duration-200">
        {/* Header Bar */}
        <div className="px-6 py-4 border-b border-white/10 bg-[#111111] flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-teal-500/10 border border-teal-500/20 text-teal-400 rounded-xl">
              <BsReceipt className="text-xl" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-bold text-white tracking-tight">SALE #{sale.id}</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-teal-500/10 text-teal-400 border border-teal-500/20">
                  {sale.sale_type.replace(/_/g, ' ')}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">Reference: {sale.reference_number} • Date: {sale.date}</p>
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
            {sale.amount_due > 0 && (
              <button
                onClick={() => setShowPaymentModal(true)}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black rounded-lg text-xs font-bold transition-all shadow-md"
              >
                <BsCashCoin />
                <span>Record Payment</span>
              </button>
            )}

            {sale.status !== 'Returned' && (
              <button
                onClick={() => setShowReturnModal(true)}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-lg text-xs font-bold transition-colors"
              >
                <BsArrowReturnLeft />
                <span>Issue Credit Note</span>
              </button>
            )}
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={() => navigate('/dashboard/workbench/ops', { state: { tab: 'ar' } })}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-teal-400 border border-white/10 rounded-lg text-xs font-semibold transition-colors"
            >
              <BsGraphUpArrow />
              <span>View AR in OPS</span>
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
                className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-gradient-to-r from-teal-500/20 to-emerald-500/20 hover:from-teal-500/30 hover:to-emerald-500/30 text-teal-300 border border-teal-500/40 rounded-lg text-xs font-extrabold transition-all shadow-md shadow-teal-500/10 cursor-pointer active:scale-95"
              >
                {isPostingToCoa ? (
                  <>
                    <BsClockHistory className="animate-spin text-teal-400" />
                    <span>Posting to COA...</span>
                  </>
                ) : (
                  <>
                    <BsLightningCharge className="text-teal-400 text-sm animate-pulse" />
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
                    ? 'border-teal-500 text-teal-400' 
                    : 'border-transparent text-gray-400 hover:text-white'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Modal Main Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Customer & Status Banner */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-[#111111] border border-white/5 rounded-xl space-y-1">
                  <div className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Customer / Party</div>
                  <div className="text-base font-bold text-white flex items-center gap-2">
                    <BsBuilding className="text-teal-400" />
                    <span>{sale.customer?.name}</span>
                  </div>
                  {sale.customer?.gstin && <div className="text-xs font-mono text-gray-400">GSTIN: {sale.customer.gstin}</div>}
                </div>

                <div className="p-4 bg-[#111111] border border-white/5 rounded-xl space-y-1">
                  <div className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Lifecycle Status</div>
                  <div className="flex items-center space-x-2 pt-1">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider border ${
                      sale.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                      sale.status === 'Returned' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                      'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    }`}>
                      {sale.status}
                    </span>

                    <span className={`px-2.5 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider border ${
                      sale.payment_status === 'Paid' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-white/5 text-gray-400 border-white/10'
                    }`}>
                      Payment: {sale.payment_status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Financial KPI Summary */}
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-[#111111] border border-white/5 rounded-xl text-center">
                  <div className="text-[10px] text-gray-500 uppercase font-bold">Grand Total</div>
                  <div className="text-lg font-bold text-white mt-1">₹{sale.grand_total.toLocaleString()}</div>
                </div>
                <div className="p-4 bg-[#111111] border border-white/5 rounded-xl text-center">
                  <div className="text-[10px] text-emerald-500 uppercase font-bold">Amount Paid</div>
                  <div className="text-lg font-bold text-emerald-400 mt-1">₹{sale.amount_paid.toLocaleString()}</div>
                </div>
                <div className="p-4 bg-[#111111] border border-white/5 rounded-xl text-center">
                  <div className="text-[10px] text-amber-500 uppercase font-bold">Outstanding AR</div>
                  <div className="text-lg font-bold text-amber-400 mt-1">₹{sale.amount_due.toLocaleString()}</div>
                </div>
              </div>

              {/* Marketplace Details if applicable */}
              {sale.marketplace_details && (
                <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-2">
                  <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider">Marketplace Gross vs Net Settlement</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div>Gross: <strong className="text-white">₹{sale.marketplace_details.gross_sales}</strong></div>
                    <div>Commission: <strong className="text-rose-400">₹{sale.marketplace_details.commission}</strong></div>
                    <div>Platform Fees: <strong className="text-rose-400">₹{sale.marketplace_details.platform_fees}</strong></div>
                    <div>Net Bank: <strong className="text-emerald-400">₹{sale.marketplace_details.net_settlement}</strong></div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'items' && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">Purchased Items / Services</h3>
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
                    {sale.items.map((item, i) => (
                      <tr key={i} className="hover:bg-white/[0.02]">
                        <td className="p-3 font-semibold text-white">{item.name}</td>
                        <td className="p-3 text-center text-gray-300">{item.quantity}</td>
                        <td className="p-3 text-right text-gray-300">₹{(item.rate || 0).toLocaleString()}</td>
                        <td className="p-3 text-right text-gray-400">₹{(item.tax || 0).toLocaleString()}</td>
                        <td className="p-3 text-right font-bold text-teal-400">₹{(item.total || 0).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'payments' && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">Payment & Settlement Timeline</h3>
              {sale.payments.length === 0 ? (
                <div className="p-8 text-center text-gray-500 text-xs bg-[#111111] border border-white/5 rounded-xl">
                  No payments recorded yet. Click "Record Payment" to settle outstanding balance.
                </div>
              ) : (
                <div className="space-y-3">
                  {sale.payments.map((p, idx) => (
                    <div key={idx} className="p-4 bg-[#111111] border border-white/5 rounded-xl flex items-center justify-between text-xs">
                      <div className="space-y-0.5">
                        <div className="font-bold text-white flex items-center gap-2">
                          <BsCashCoin className="text-emerald-400" />
                          <span>{p.method} — {p.account}</span>
                        </div>
                        <div className="text-[10px] text-gray-500 font-mono">Ref: {p.reference} • Date: {p.date}</div>
                      </div>
                      <div className="text-base font-bold text-emerald-400">
                        +₹{p.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'documents' && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">Linked Documents from Doc Vault</h3>
              {sale.documents.length === 0 ? (
                <div className="p-8 text-center text-gray-500 text-xs bg-[#111111] border border-white/5 rounded-xl">
                  No attachments linked. Use "Import from Doc Vault" to link document evidence.
                </div>
              ) : (
                <div className="space-y-3">
                  {sale.documents.map(d => (
                    <div key={d.id} className="p-4 bg-[#111111] border border-white/5 rounded-xl flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-3">
                        <BsFileEarmarkText className="text-teal-400 text-lg" />
                        <div>
                          <div className="font-bold text-white">{d.original_filename}</div>
                          <div className="text-[10px] text-gray-500 font-mono">Doc Vault Ref: {d.id}</div>
                        </div>
                      </div>
                      <button
                        onClick={() => navigate('/dashboard/workbench/doc-vault')}
                        className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-teal-400 rounded-lg text-xs font-semibold"
                      >
                        Open in Doc Vault
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'accounting' && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-teal-400">Chart of Accounts (COA) Journal Entries</h3>
              <div className="bg-[#111111] border border-white/5 rounded-xl p-4 space-y-3">
                {sale.accounting_entries.map((entry, idx) => (
                  <div key={idx} className="p-3 bg-[#18181A] border border-white/5 rounded-lg flex items-center justify-between text-xs font-mono">
                    <div>
                      <div className="text-teal-400 font-bold">Dr {entry.debit_account}</div>
                      <div className="text-gray-400 pl-4 mt-0.5">Cr {entry.credit_account}</div>
                      {entry.description && <div className="text-[10px] text-gray-500 mt-1">{entry.description}</div>}
                    </div>
                    <div className="text-sm font-bold text-white">
                      ₹{entry.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sub-modals */}
      <RecordPaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        workbenchId={workbenchId}
        sale={sale}
        onPaymentRecorded={() => {
          if (onUpdate) onUpdate();
        }}
      />

      <CreateReturnModal
        isOpen={showReturnModal}
        onClose={() => setShowReturnModal(false)}
        workbenchId={workbenchId}
        sale={sale}
        onReturnCreated={() => {
          if (onUpdate) onUpdate();
        }}
      />
    </div>
  );
}
