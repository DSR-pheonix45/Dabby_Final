import React, { useState } from 'react';
import { salesService } from '../../../../services/salesService';
import { toast } from 'react-hot-toast';
import { BsX, BsArrowReturnLeft, BsCheck2Circle } from 'react-icons/bs';

export default function CreateReturnModal({ isOpen, onClose, workbenchId, sale, onReturnCreated }) {
  const [refundAmount, setRefundAmount] = useState(sale?.grand_total || '');
  const [reason, setReason] = useState('Customer Return / Defective Goods');

  if (!isOpen || !sale) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    try {
      const updated = salesService.recordReturn(workbenchId, sale.id, {
        refundAmount: Number(refundAmount) || sale.grand_total,
        reason: reason
      });
      toast.success(`Credit Note generated for Sale #${sale.id}!`);
      if (onReturnCreated) onReturnCreated(updated);
      onClose();
    } catch (err) {
      toast.error(err.message || "Failed to process return");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md bg-[#18181A] border border-white/10 rounded-2xl p-6 shadow-2xl relative font-dm-sans">
        <div className="flex items-center justify-between pb-4 border-b border-white/10 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl">
              <BsArrowReturnLeft className="text-xl" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Issue Return / Credit Note</h2>
              <p className="text-xs text-gray-400">Reversal adjustment maintaining full audit trail (Rule 14 & 19)</p>
            </div>
          </div>

          <button onClick={onClose} className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors">
            <BsX className="text-xl" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="pt-4 space-y-4">
          <div className="p-3 bg-[#111111] border border-white/5 rounded-xl text-xs space-y-1">
            <div className="text-gray-400">Target Sale: <strong className="text-white">#{sale.id} ({sale.reference_number})</strong></div>
            <div className="text-gray-400">Customer: <strong className="text-white">{sale.customer?.name}</strong></div>
            <div className="text-gray-400">Original Total: <strong className="text-teal-400">₹{sale.grand_total.toLocaleString()}</strong></div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1">Credit Note Amount (₹)</label>
            <input
              type="number"
              value={refundAmount}
              onChange={(e) => setRefundAmount(e.target.value)}
              className="w-full bg-[#111111] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-rose-500/50 font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1">Reason for Return / Adjustment</label>
            <textarea
              rows="3"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-[#111111] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-rose-500/50"
            />
          </div>

          <div className="pt-4 border-t border-white/10 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white text-xs font-bold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-white text-xs font-extrabold transition-all shadow-lg shadow-rose-500/20 flex items-center space-x-2"
            >
              <BsCheck2Circle className="text-base" />
              <span>Issue Credit Note</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
