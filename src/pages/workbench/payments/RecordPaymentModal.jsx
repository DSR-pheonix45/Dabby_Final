import React, { useState, useEffect } from 'react';
import { BsXLg, BsCheckCircleFill, BsCreditCard, BsBagCheck, BsCartCheck } from 'react-icons/bs';
import { paymentsService } from '../../../services/paymentsService';
import { toast } from 'react-hot-toast';

export default function RecordPaymentModal({ isOpen, onClose, workbenchId, initialType = 'Payment Received', onPaymentRecorded }) {
  if (!isOpen) return null;

  const [type, setType] = useState(initialType === 'Payment Sent' ? 'Payment Sent' : 'Payment Received');
  const [party, setParty] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMode, setPaymentMode] = useState('Bank Transfer');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [tradeContainer, setTradeContainer] = useState(initialType === 'Payment Sent' ? 'Purchases' : 'Sales');
  const [linkedDocRef, setLinkedDocRef] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const t = initialType === 'Payment Sent' ? 'Payment Sent' : 'Payment Received';
    setType(t);
    setTradeContainer(t === 'Payment Sent' ? 'Purchases' : 'Sales');
  }, [initialType, isOpen]);

  const handleTypeChange = (newType) => {
    setType(newType);
    if (newType === 'Payment Received') {
      setTradeContainer('Sales');
    } else {
      setTradeContainer('Purchases');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    if (!party.trim()) {
      toast.error('Please enter party name or counterparty');
      return;
    }

    setSubmitting(true);
    try {
      await paymentsService.recordPayment(workbenchId, {
        type,
        party: party.trim(),
        amount: Number(amount),
        date,
        payment_mode: paymentMode,
        reference_number: referenceNumber.trim() || `UTR-${Math.floor(100000 + Math.random() * 900000)}`,
        trade_container: tradeContainer,
        linked_doc_ref: linkedDocRef.trim() || 'Unmapped',
        notes: notes.trim()
      });

      toast.success(`${type} recorded successfully!`);
      if (onPaymentRecorded) onPaymentRecorded();
      onClose();
    } catch (err) {
      console.error('[RecordPaymentModal] Error:', err);
      toast.error('Failed to record payment voucher');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#181818] border border-white/10 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden font-dm-sans">
        {/* Header */}
        <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between bg-[#1A1A1A]">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 bg-teal-500/10 border border-teal-500/20 text-teal-400 rounded-xl flex items-center justify-center text-lg">
              <BsCreditCard />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">
                {type === 'Payment Received' ? 'Record Receipt Voucher' : 'Record Payment Voucher'}
              </h3>
              <p className="text-xs text-gray-400">Add payment received or sent mapped to Sales or Purchase trade containers</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
            <BsXLg />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Payment Type Selector */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Voucher Type</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleTypeChange('Payment Received')}
                className={`py-2.5 px-4 rounded-xl border text-xs font-bold transition-all flex items-center justify-center space-x-2 ${
                  type === 'Payment Received'
                    ? 'bg-teal-500/15 border-teal-500 text-teal-400 shadow-sm'
                    : 'bg-[#111111] border-white/10 text-gray-400 hover:text-white'
                }`}
              >
                <span>📥 Payment Received (Receipt)</span>
              </button>
              <button
                type="button"
                onClick={() => handleTypeChange('Payment Sent')}
                className={`py-2.5 px-4 rounded-xl border text-xs font-bold transition-all flex items-center justify-center space-x-2 ${
                  type === 'Payment Sent'
                    ? 'bg-rose-500/15 border-rose-500 text-rose-400 shadow-sm'
                    : 'bg-[#111111] border-white/10 text-gray-400 hover:text-white'
                }`}
              >
                <span>📤 Payment Sent (Payment)</span>
              </button>
            </div>
          </div>

          {/* Amount & Date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Amount (₹) *</label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-4 py-2.5 bg-[#111111] border border-white/10 rounded-xl text-white font-medium focus:outline-none focus:border-teal-500 transition-colors font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Payment Date *</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-2.5 bg-[#111111] border border-white/10 rounded-xl text-white font-medium focus:outline-none focus:border-teal-500 transition-colors"
              />
            </div>
          </div>

          {/* Counterparty / Party */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
              {type === 'Payment Received' ? 'Customer / Payer Name *' : 'Vendor / Payee Name *'}
            </label>
            <input
              type="text"
              required
              placeholder={type === 'Payment Received' ? 'e.g. Acme Tech Corp' : 'e.g. Vendor Logistics Pvt Ltd'}
              value={party}
              onChange={(e) => setParty(e.target.value)}
              className="w-full px-4 py-2.5 bg-[#111111] border border-white/10 rounded-xl text-white font-medium focus:outline-none focus:border-teal-500 transition-colors"
            />
          </div>

          {/* Payment Mode & Reference Number */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Payment Mode</label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value)}
                className="w-full px-4 py-2.5 bg-[#111111] border border-white/10 rounded-xl text-white font-medium focus:outline-none focus:border-teal-500 transition-colors"
              >
                <option value="Bank Transfer">Bank Transfer (IMPS/NEFT)</option>
                <option value="UPI">UPI / QR Code</option>
                <option value="Cash">Cash / Petty Cash</option>
                <option value="Cheque">Cheque</option>
                <option value="Credit Card">Credit / Debit Card</option>
                <option value="NetBanking">Net Banking</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Reference / UTR #</label>
              <input
                type="text"
                placeholder="e.g. UTR901823901"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                className="w-full px-4 py-2.5 bg-[#111111] border border-white/10 rounded-xl text-white font-medium focus:outline-none focus:border-teal-500 transition-colors"
              />
            </div>
          </div>

          {/* Trade Container Mapping */}
          <div className="p-4 bg-[#111111] border border-white/10 rounded-xl space-y-3">
            <label className="block text-xs font-bold text-teal-400 uppercase tracking-wider">Map to Trade Container</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setTradeContainer('Sales')}
                className={`py-2 px-3 rounded-lg border text-xs font-medium flex items-center justify-center space-x-1.5 transition-all ${
                  tradeContainer === 'Sales' ? 'bg-teal-500/20 border-teal-500 text-teal-400' : 'bg-[#181818] border-white/10 text-gray-400 hover:text-white'
                }`}
              >
                <BsCartCheck />
                <span>Sales Container</span>
              </button>
              <button
                type="button"
                onClick={() => setTradeContainer('Purchases')}
                className={`py-2 px-3 rounded-lg border text-xs font-medium flex items-center justify-center space-x-1.5 transition-all ${
                  tradeContainer === 'Purchases' ? 'bg-teal-500/20 border-teal-500 text-teal-400' : 'bg-[#181818] border-white/10 text-gray-400 hover:text-white'
                }`}
              >
                <BsBagCheck />
                <span>Purchases Container</span>
              </button>
            </div>
            <div>
              <label className="block text-[11px] text-gray-400 mb-1">Linked Document Ref (Optional)</label>
              <input
                type="text"
                placeholder="e.g. INV-2024-001 or BILL-8092"
                value={linkedDocRef}
                onChange={(e) => setLinkedDocRef(e.target.value)}
                className="w-full px-3 py-1.5 bg-[#181818] border border-white/10 rounded-lg text-xs text-white placeholder-gray-600 focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Notes / Remark</label>
            <input
              type="text"
              placeholder="e.g. Advance payment received for Q3 order"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-4 py-2.5 bg-[#111111] border border-white/10 rounded-xl text-white font-medium focus:outline-none focus:border-teal-500 transition-colors"
            />
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-white/10 text-sm font-semibold text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-sm flex items-center space-x-2 transition-all shadow-lg shadow-teal-500/20 disabled:opacity-50"
            >
              <BsCheckCircleFill />
              <span>{submitting ? 'Recording...' : 'Record Voucher'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
