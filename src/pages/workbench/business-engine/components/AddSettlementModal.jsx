import React, { useState } from 'react';
import { BsX, BsBank, BsReceipt, BsCash, BsUpload, BsCheckCircleFill } from 'react-icons/bs';
import { toast } from 'react-hot-toast';
import { formatCurrency } from '../../../../utils/currency';
import { useWorkbench } from '../../../../context/WorkbenchContext';
import { diService } from '../../../../services/diService';
import { apiFetch } from '../../../../lib/apiClient';

export default function AddSettlementModal({ isOpen, onClose, data }) {
  const { activeWorkbench } = useWorkbench();
  const [actionType, setActionType] = useState('SETTLE_SALES'); // SETTLE_SALES | SETTLE_PAYABLES | DIRECT_EXPENSE
  const [paymentSource, setPaymentSource] = useState('bank_account'); // bank_account | petty_cash | screenshot_ocr
  const [loading, setLoading] = useState(false);

  // Form State
  const [manualAmount, setManualAmount] = useState(data?.settlement?.difference || data?.amount || 0);
  const [manualDate, setManualDate] = useState(new Date().toISOString().split('T')[0]);
  const [expenseCategory, setExpenseCategory] = useState('Travel Allowance');
  const [manualNotes, setManualNotes] = useState('');

  if (!isOpen || !data) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!activeWorkbench?.id) {
      toast.error('Missing active workbench');
      return;
    }
    setLoading(true);
    try {
      if (paymentSource === 'petty_cash' && actionType === 'DIRECT_EXPENSE') {
        await apiFetch('/api/petty-cash/deduct', {
          method: 'POST',
          body: JSON.stringify({
            workbench_id: activeWorkbench.id,
            amount: Number(manualAmount),
            category: expenseCategory
          })
        });
      }

      await diService.addManualSettlement(
        activeWorkbench.id,
        data.settlement?.eventId || data.id,
        data.settlement?.eventType || data.type,
        manualAmount,
        manualDate,
        `${manualNotes} | Action: ${actionType} | Source: ${paymentSource} | Category: ${expenseCategory}`
      );

      toast.success(`Payment Snippet applied: ${actionType} (${formatCurrency(manualAmount, activeWorkbench?.country)})`);
      window.dispatchEvent(new CustomEvent('ledger:updated'));
      onClose();
    } catch (error) {
      toast.error(error.message || 'Failed to apply settlement snippet');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-[#0E1117] border border-[#1F242C] rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-black/20">
          <div>
            <h2 className="text-xl font-bold bg-gradient-to-r from-teal-400 to-cyan-500 bg-clip-text text-transparent">
              Payment Snippet & Settlement Engine
            </h2>
            <p className="text-xs text-gray-400 mt-1">
              Party / Document: {data.party || data.counterparty_name || "Direct Settlement"}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
            <BsX className="w-6 h-6" />
          </button>
        </div>

        {/* Invoice / Event Summary */}
        <div className="bg-[#181818] p-4 border-b border-white/5 flex justify-between items-center">
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Pending Balance</p>
            <p className="text-lg font-bold text-amber-400">
              {formatCurrency(data.settlement?.difference || data.amount, activeWorkbench?.country)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500 mb-0.5">Original Doc Amount</p>
            <p className="text-sm font-semibold text-gray-300">
              {formatCurrency(data.amount, activeWorkbench?.country)}
            </p>
          </div>
        </div>

        {/* 3 Payment Snippet Actions */}
        <div className="p-4 space-y-4 overflow-y-auto custom-scrollbar flex-1">
          <div>
            <label className="text-xs text-gray-400 block mb-2 font-bold uppercase tracking-wider">Select Payment Snippet Action</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setActionType('SETTLE_SALES')}
                className={`p-3 rounded-lg border text-left text-xs font-bold transition-all ${
                  actionType === 'SETTLE_SALES'
                    ? 'bg-teal-500/20 border-teal-500 text-teal-400'
                    : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                }`}
              >
                1. Settle Sales
                <p className="text-[10px] font-normal opacity-80 mt-1">Client paid $\rightarrow$ Deduct AR, Add Bank/Cash</p>
              </button>

              <button
                type="button"
                onClick={() => setActionType('SETTLE_PAYABLES')}
                className={`p-3 rounded-lg border text-left text-xs font-bold transition-all ${
                  actionType === 'SETTLE_PAYABLES'
                    ? 'bg-blue-500/20 border-blue-500 text-blue-400'
                    : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                }`}
              >
                2. Settle Payables
                <p className="text-[10px] font-normal opacity-80 mt-1">Paid Vendor $\rightarrow$ Deduct AP, Deduct Bank/Cash</p>
              </button>

              <button
                type="button"
                onClick={() => setActionType('DIRECT_EXPENSE')}
                className={`p-3 rounded-lg border text-left text-xs font-bold transition-all ${
                  actionType === 'DIRECT_EXPENSE'
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                    : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                }`}
              >
                3. Direct Expense
                <p className="text-[10px] font-normal opacity-80 mt-1">Operational $\rightarrow$ Post OPEX/COGS without party</p>
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Payment Method / Source</label>
                <select
                  value={paymentSource}
                  onChange={e => setPaymentSource(e.target.value)}
                  className="w-full bg-[#181818] border border-white/10 rounded-lg p-2 text-xs text-white"
                >
                  <option value="bank_account">Bank Statement / UPI OCR</option>
                  <option value="petty_cash">Petty Cash Bucket (Assets)</option>
                  <option value="screenshot_ocr">Payment Screenshot OCR</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-400 block mb-1">Settlement Date</label>
                <input
                  type="date"
                  value={manualDate}
                  onChange={e => setManualDate(e.target.value)}
                  className="w-full bg-[#181818] border border-white/10 rounded-lg p-2 text-xs text-white"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-400 block mb-1">Settlement Amount</label>
              <input
                type="number"
                step="0.01"
                value={manualAmount}
                onChange={e => setManualAmount(e.target.value)}
                className="w-full bg-[#181818] border border-white/10 rounded-lg p-2 text-sm font-bold text-teal-400"
              />
            </div>

            {actionType === 'DIRECT_EXPENSE' && (
              <div>
                <label className="text-xs text-gray-400 block mb-1">OPEX / Expense Category</label>
                <select
                  value={expenseCategory}
                  onChange={e => setExpenseCategory(e.target.value)}
                  className="w-full bg-[#181818] border border-white/10 rounded-lg p-2 text-xs text-white font-bold"
                >
                  <option value="Travel Allowance">Travel Allowance & Fuel (Petrol)</option>
                  <option value="Salaries & Stipends">Salaries & Stipends</option>
                  <option value="Rent & Premises">Rent & Premises</option>
                  <option value="Office Supplies & Meals">Office Supplies & Meals</option>
                  <option value="Software Subscriptions">Software & Cloud Subscriptions</option>
                </select>
              </div>
            )}

            <div>
              <label className="text-xs text-gray-400 block mb-1">Notes / Transaction Reference</label>
              <input
                type="text"
                value={manualNotes}
                onChange={e => setManualNotes(e.target.value)}
                placeholder="e.g. Bank Ref #99281726 or Cash voucher #041"
                className="w-full bg-[#181818] border border-white/10 rounded-lg p-2 text-xs text-white"
              />
            </div>

            <div className="pt-2 flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-white/10 rounded-lg text-xs text-gray-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 bg-teal-500 hover:bg-teal-400 text-black font-bold rounded-lg text-xs transition-colors flex items-center"
              >
                <BsCheckCircleFill className="mr-1.5" /> Apply Payment Snippet
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
