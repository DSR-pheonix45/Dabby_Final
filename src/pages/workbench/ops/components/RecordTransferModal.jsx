import React, { useState } from 'react';
import { BsArrowLeftRight, BsXLg } from 'react-icons/bs';
import { diService } from '../../../../services/diService';
import { toast } from 'react-hot-toast';

export default function RecordTransferModal({ isOpen, onClose, workbenchId, onTransferCreated }) {
  if (!isOpen) return null;

  const [transferType, setTransferType] = useState('bank_to_bank');
  const [fromAccount, setFromAccount] = useState('HDFC Primary Current Acc');
  const [toAccount, setToAccount] = useState('ICICI Operations Acc');
  const [amount, setAmount] = useState('');
  const [transferDate, setTransferDate] = useState(new Date().toISOString().split('T')[0]);
  const [referenceNumber, setReferenceNumber] = useState('');
  const [narration, setNarration] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleTypeChange = (t) => {
    setTransferType(t);
    if (t === 'bank_to_bank') {
      setFromAccount('HDFC Primary Current Acc');
      setToAccount('ICICI Operations Acc');
    } else if (t === 'petty_cash_withdrawal') {
      setFromAccount('HDFC Primary Current Acc');
      setToAccount('Petty Cash Box');
    } else if (t === 'petty_cash_deposit') {
      setFromAccount('Petty Cash Box');
      setToAccount('HDFC Primary Current Acc');
    } else if (t === 'founder_capital_infusion') {
      setFromAccount('Founder Personal Acc / Equity');
      setToAccount('HDFC Primary Current Acc');
    } else if (t === 'initial_funding') {
      setFromAccount('Investor / Founder Capital');
      setToAccount('HDFC Primary Current Acc');
    } else if (t === 'founder_drawings') {
      setFromAccount('HDFC Primary Current Acc');
      setToAccount('Founder Personal Drawings');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) {
      toast.error('Please enter a valid transfer amount');
      return;
    }
    setSubmitting(true);
    try {
      await diService.createTransfer(workbenchId, {
        transfer_type: transferType,
        from_account: fromAccount.trim() || 'Bank Account',
        to_account: toAccount.trim() || 'Target Account',
        amount: Number(amount),
        transfer_date: transferDate,
        reference_number: referenceNumber.trim() || undefined,
        narration: narration.trim() || undefined
      });

      toast.success('Transfer recorded and posted to COA!');
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('payments:updated'));
      }
      if (onTransferCreated) onTransferCreated();
      onClose();
    } catch (err) {
      console.error('[RecordTransferModal] Error:', err);
      toast.error(err.message || 'Failed to record business transfer');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 font-dm-sans animate-in fade-in duration-200">
      <div className="bg-[#141414] border border-white/10 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl p-6 space-y-4">
        {/* Modal Header */}
        <div className="border-b border-white/10 pb-3 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <BsArrowLeftRight className="text-teal-400" /> Record Business Transfer
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">Contra bank transfers, petty cash, or founder equity movements</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-white rounded-lg transition-colors">
            <BsXLg />
          </button>
        </div>

        {/* Transfer Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-gray-300 font-semibold mb-1">Transfer Type *</label>
            <select
              value={transferType}
              onChange={(e) => handleTypeChange(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-teal-500"
            >
              <option value="bank_to_bank">Bank-to-Bank Contra Transfer</option>
              <option value="petty_cash_withdrawal">Petty Cash Withdrawal (Bank → Petty Cash)</option>
              <option value="petty_cash_deposit">Petty Cash Deposit (Petty Cash → Bank)</option>
              <option value="founder_capital_infusion">Founder Capital Infusion (Equity In)</option>
              <option value="initial_funding">Initial Funding / Investment</option>
              <option value="founder_drawings">Founder Drawings / Stakeholder Withdrawal</option>
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-gray-300 font-semibold mb-1">Source Account (From) *</label>
              <input
                type="text"
                required
                value={fromAccount}
                onChange={(e) => setFromAccount(e.target.value)}
                placeholder="e.g. HDFC Primary Current Acc"
                className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-teal-500"
              />
            </div>

            <div>
              <label className="block text-gray-300 font-semibold mb-1">Destination Account (To) *</label>
              <input
                type="text"
                required
                value={toAccount}
                onChange={(e) => setToAccount(e.target.value)}
                placeholder="e.g. ICICI Operations Acc"
                className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-gray-300 font-semibold mb-1">Amount (₹) *</label>
              <input
                type="number"
                step="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="50000"
                className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-teal-500 font-bold"
              />
            </div>

            <div>
              <label className="block text-gray-300 font-semibold mb-1">Transfer Date</label>
              <input
                type="date"
                required
                value={transferDate}
                onChange={(e) => setTransferDate(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-gray-300 font-semibold mb-1">Reference / Cheque / UTR #</label>
            <input
              type="text"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              placeholder="e.g. UTR-9002158"
              className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-teal-500"
            />
          </div>

          <div>
            <label className="block text-gray-300 font-semibold mb-1">Day Book Narration / Remarks</label>
            <textarea
              rows={2}
              value={narration}
              onChange={(e) => setNarration(e.target.value)}
              placeholder="Optional custom narration (e.g. Inter-bank contra transfer for payroll reserve)"
              className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-teal-500 resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-white/10 text-gray-400 hover:text-white font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-black font-bold disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Posting...' : 'Post Transfer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
