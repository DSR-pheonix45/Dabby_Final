import React, { useState, useEffect } from 'react';
import { useWorkbench } from '../../../../context/WorkbenchContext';
import { salesService } from '../../../../services/salesService';
import { toast } from 'react-hot-toast';
import { BsX, BsCashCoin, BsCheck2Circle } from 'react-icons/bs';

export default function RecordPaymentModal({ isOpen, onClose, workbenchId, sale, onPaymentRecorded }) {
  const { activeWorkbench } = useWorkbench();
  const [salesList, setSalesList] = useState([]);
  const [selectedSaleId, setSelectedSaleId] = useState(sale?.id || '');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [method, setMethod] = useState('Bank Transfer');
  const [account, setAccount] = useState('HDFC Bank Main');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !workbenchId) return;

    async function fetchReceivableSales() {
      setLoading(true);
      try {
        const all = await salesService.getSalesWithDocVault(workbenchId, activeWorkbench);
        const unpaid = all.filter(s => (s.amount_due === undefined || s.amount_due > 0) && s.status !== 'Cancelled' && s.status !== 'Returned');
        setSalesList(unpaid);

        if (sale) {
          setSelectedSaleId(sale.id);
          setAmount(sale.amount_due !== undefined ? sale.amount_due : sale.grand_total);
        } else if (unpaid.length > 0) {
          const first = unpaid[0];
          setSelectedSaleId(first.id);
          setAmount(first.amount_due !== undefined ? first.amount_due : first.grand_total);
        }
      } catch (err) {
        console.error("Failed to fetch receivable sales:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchReceivableSales();
  }, [isOpen, workbenchId, sale, activeWorkbench]);

  if (!isOpen) return null;

  const currentSale = salesList.find(s => s.id === selectedSaleId) || sale;

  const handleSaleSelect = (id) => {
    setSelectedSaleId(id);
    const found = salesList.find(s => s.id === id);
    if (found) {
      setAmount(found.amount_due !== undefined ? found.amount_due : found.grand_total);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedSaleId) {
      toast.error("Please select a sale invoice to settle.");
      return;
    }
    const payAmt = Number(amount);
    if (!payAmt || payAmt <= 0) {
      toast.error("Please enter a valid payment amount.");
      return;
    }

    const targetSale = salesList.find(s => s.id === selectedSaleId) || currentSale;

    try {
      const updated = salesService.recordPayment(workbenchId, selectedSaleId, {
        amount: payAmt,
        date: date,
        method: method,
        account: account,
        reference: reference || `SETTLE-${Date.now().toString().slice(-6)}`,
        notes: notes,
        customerName: targetSale?.customer?.name,
        grandTotal: targetSale?.grand_total,
        referenceNumber: targetSale?.reference_number
      });

      toast.success(`Settlement of ₹${payAmt.toLocaleString()} recorded!`);
      if (onPaymentRecorded) onPaymentRecorded(updated);
      onClose();
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to record payment settlement");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-[#18181A] border border-white/10 rounded-2xl p-6 shadow-2xl relative font-dm-sans">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
              <BsCashCoin className="text-xl" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Record Payment / Settlement</h2>
              <p className="text-xs text-gray-400">Settle outstanding receivables against sales invoice</p>
            </div>
          </div>

          <button onClick={onClose} className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors">
            <BsX className="text-xl" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="pt-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1">Select Sale Invoice / Receivable</label>
            {loading ? (
              <div className="p-3 text-xs text-gray-400 bg-[#111111] rounded-xl animate-pulse">Loading receivable invoices...</div>
            ) : (
              <select
                value={selectedSaleId}
                onChange={(e) => handleSaleSelect(e.target.value)}
                className="w-full bg-[#111111] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-teal-500/50"
              >
                <option value="">-- Select Receivable Sale --</option>
                {salesList.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.customer?.name || 'Customer'} ({s.reference_number || s.id}) — Outstanding: ₹{(s.amount_due !== undefined ? s.amount_due : s.grand_total).toLocaleString()}
                  </option>
                ))}
              </select>
            )}
          </div>

          {currentSale && (
            <div className="p-3.5 bg-[#111111] border border-white/5 rounded-xl flex items-center justify-between text-xs">
              <div>
                <div className="text-white font-bold">{currentSale.customer?.name || 'Customer'}</div>
                <div className="text-[10px] text-teal-400 font-mono mt-0.5">{currentSale.reference_number || currentSale.id}</div>
              </div>
              <div className="text-right">
                <div className="text-gray-400 text-[11px]">Total: ₹{currentSale.grand_total.toLocaleString()}</div>
                <div className="text-amber-400 font-bold text-sm">
                  Outstanding: ₹{(currentSale.amount_due !== undefined ? currentSale.amount_due : currentSale.grand_total).toLocaleString()}
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1">Payment Amount (₹)</label>
              <input
                type="number"
                min="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Amount received"
                className="w-full bg-[#111111] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-teal-500/50 font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1">Payment Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-[#111111] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-teal-500/50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1">Payment Method</label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className="w-full bg-[#111111] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-teal-500/50"
              >
                <option value="Bank Transfer">Bank Transfer (NEFT/RTGS/IMPS)</option>
                <option value="UPI Payment">UPI Payment</option>
                <option value="Cheque">Cheque</option>
                <option value="Cash">Cash</option>
                <option value="Credit Card">Credit Card</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1">Receiving Bank/Cash Account</label>
              <select
                value={account}
                onChange={(e) => setAccount(e.target.value)}
                className="w-full bg-[#111111] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-teal-500/50"
              >
                <option value="HDFC Bank Main">HDFC Bank Main</option>
                <option value="Axis Bank Corp">Axis Bank Corp</option>
                <option value="Petty Cash Drawer">Petty Cash Drawer</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1">Reference / Transaction ID</label>
            <input
              type="text"
              placeholder="e.g. UTR-9810239120"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className="w-full bg-[#111111] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-teal-500/50 font-mono"
            />
          </div>

          {/* Action Footer */}
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
              className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-extrabold transition-all shadow-lg shadow-emerald-500/20 flex items-center space-x-2"
            >
              <BsCheck2Circle className="text-base" />
              <span>Record Settlement</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
