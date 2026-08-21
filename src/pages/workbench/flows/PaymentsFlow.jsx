import React, { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  BsCreditCard, 
  BsArrowDownLeftCircleFill, 
  BsArrowUpRightCircleFill, 
  BsArrowLeftRight, 
  BsPlusLg, 
  BsSearch, 
  BsFunnel, 
  BsCheckCircleFill, 
  BsArrowRepeat,
  BsCartCheck,
  BsBagCheck,
  BsReceipt,
  BsClockHistory
} from 'react-icons/bs';
import { paymentsService } from '../../../services/paymentsService';
import { formatCurrency } from '../../../utils/currency';
import RecordPaymentModal from '../payments/RecordPaymentModal';
import RecordTransferModal from '../ops/components/RecordTransferModal';
import { toast } from 'react-hot-toast';

export default function PaymentsFlow() {
  const { workbench } = useOutletContext() || {};
  const workbenchId = workbench?.id;
  const country = workbench?.country;

  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('all'); // all | received | sent | transfers | mapped
  const [search, setSearch] = useState('');
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentModalType, setPaymentModalType] = useState('Payment Received');
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);

  const loadPayments = useCallback(async () => {
    if (!workbenchId) return;
    setLoading(true);
    try {
      const data = await paymentsService.getPayments(workbenchId);
      setPayments(data || []);
    } catch (err) {
      console.error('[PaymentsFlow] Failed to load payments:', err);
      toast.error('Failed to load payments data');
    } finally {
      setLoading(false);
    }
  }, [workbenchId]);

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  useEffect(() => {
    const handleUpdate = () => loadPayments();
    window.addEventListener('payments:updated', handleUpdate);
    window.addEventListener('ledger:updated', handleUpdate);
    return () => {
      window.removeEventListener('payments:updated', handleUpdate);
      window.removeEventListener('ledger:updated', handleUpdate);
    };
  }, [loadPayments]);

  // Derived KPIs
  const totalReceived = payments
    .filter(p => p.type === 'Payment Received')
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  const totalSent = payments
    .filter(p => p.type === 'Payment Sent')
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  const netCashFlow = totalReceived - totalSent;

  const mappedCount = payments.filter(p => p.linked_doc_ref && p.linked_doc_ref !== 'Unmapped').length;

  // Filtered Payments
  const filteredPayments = payments.filter(p => {
    const term = search.toLowerCase();
    const matchesSearch = 
      (p.voucher_number || '').toLowerCase().includes(term) ||
      (p.party || '').toLowerCase().includes(term) ||
      (p.reference_number || '').toLowerCase().includes(term) ||
      (p.trade_container || '').toLowerCase().includes(term) ||
      (p.linked_doc_ref || '').toLowerCase().includes(term);

    if (!matchesSearch) return false;

    if (tab === 'received') return p.type === 'Payment Received';
    if (tab === 'sent') return p.type === 'Payment Sent';
    if (tab === 'transfers') return p.type === 'Transfer';
    if (tab === 'mapped') return p.linked_doc_ref && p.linked_doc_ref !== 'Unmapped';
    return true;
  });

  return (
    <div className="flex-1 flex flex-col h-full bg-[#111111] overflow-hidden font-dm-sans">
      {/* Top Header */}
      <div className="px-6 lg:px-10 py-6 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#181818]/50">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <BsCreditCard className="text-teal-400" /> Payments & Vouchers
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Store and manage payments received, payments sent, and bank transfers mapped to Sales, Purchases, and Account Transfers
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={loadPayments}
            title="Refresh Payments"
            className="p-2.5 bg-[#181818] hover:bg-[#222] border border-white/10 rounded-xl text-gray-400 hover:text-white transition-colors"
          >
            <BsArrowRepeat className={loading ? 'animate-spin' : ''} />
          </button>

          <button
            onClick={() => {
              setPaymentModalType('Payment Received');
              setIsPaymentModalOpen(true);
            }}
            className="px-4 py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs rounded-xl flex items-center space-x-1.5 transition-all shadow-lg shadow-teal-500/20"
          >
            <BsPlusLg />
            <span>+ Record Payment / Voucher</span>
          </button>

          <button
            onClick={() => setIsTransferModalOpen(true)}
            className="px-4 py-2.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 font-bold text-xs rounded-xl flex items-center space-x-1.5 transition-all"
          >
            <BsArrowLeftRight />
            <span>Record Business Transfer</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto px-6 lg:px-10 py-6 space-y-6">
        {/* KPI Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Received */}
          <div className="bg-[#181818] border border-white/10 rounded-2xl p-5 relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Total Received (Inflow)</span>
              <div className="h-8 w-8 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg flex items-center justify-center text-base">
                <BsArrowDownLeftCircleFill />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-white">{formatCurrency(totalReceived, country)}</div>
            <div className="text-xs text-emerald-400 font-medium mt-1">Customer Receipts & Collections</div>
          </div>

          {/* Card 2: Total Sent */}
          <div className="bg-[#181818] border border-white/10 rounded-2xl p-5 relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Total Sent (Outflow)</span>
              <div className="h-8 w-8 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg flex items-center justify-center text-base">
                <BsArrowUpRightCircleFill />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-white">{formatCurrency(totalSent, country)}</div>
            <div className="text-xs text-rose-400 font-medium mt-1">Vendor Payments & Expenses</div>
          </div>

          {/* Card 3: Net Cash Flow */}
          <div className="bg-[#181818] border border-white/10 rounded-2xl p-5 relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Net Cash Flow</span>
              <div className="h-8 w-8 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-lg flex items-center justify-center text-base">
                <BsArrowLeftRight />
              </div>
            </div>
            <div className={`text-2xl font-extrabold ${netCashFlow >= 0 ? 'text-teal-400' : 'text-rose-400'}`}>
              {formatCurrency(netCashFlow, country)}
            </div>
            <div className="text-xs text-gray-400 font-medium mt-1">Inflow minus Outflow balance</div>
          </div>

          {/* Card 4: Mapped Containers */}
          <div className="bg-[#181818] border border-white/10 rounded-2xl p-5 relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Trade Container Mapped</span>
              <div className="h-8 w-8 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-lg flex items-center justify-center text-base">
                <BsReceipt />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-white">{mappedCount} <span className="text-sm font-normal text-gray-400">Vouchers</span></div>
            <div className="text-xs text-blue-400 font-medium mt-1">Mapped to Sales, Purchases & Transfers</div>
          </div>
        </div>

        {/* Filters & Control Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#181818] border border-white/10 p-2.5 rounded-2xl">
          {/* Segmented Sub-Tabs */}
          <div className="flex items-center bg-[#111111] p-1 rounded-xl border border-white/5 overflow-x-auto">
            <button
              onClick={() => setTab('all')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                tab === 'all' ? 'bg-white/10 text-teal-400' : 'text-gray-400 hover:text-white'
              }`}
            >
              All Vouchers ({payments.length})
            </button>
            <button
              onClick={() => setTab('received')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                tab === 'received' ? 'bg-emerald-500/20 text-emerald-400' : 'text-gray-400 hover:text-white'
              }`}
            >
              📥 Received ({payments.filter(p => p.type === 'Payment Received').length})
            </button>
            <button
              onClick={() => setTab('sent')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                tab === 'sent' ? 'bg-rose-500/20 text-rose-400' : 'text-gray-400 hover:text-white'
              }`}
            >
              📤 Sent ({payments.filter(p => p.type === 'Payment Sent').length})
            </button>
            <button
              onClick={() => setTab('transfers')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                tab === 'transfers' ? 'bg-purple-500/20 text-purple-400' : 'text-gray-400 hover:text-white'
              }`}
            >
              🔄 Transfers ({payments.filter(p => p.type === 'Transfer').length})
            </button>
            <button
              onClick={() => setTab('mapped')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                tab === 'mapped' ? 'bg-blue-500/20 text-blue-400' : 'text-gray-400 hover:text-white'
              }`}
            >
              📦 Mapped Vouchers ({mappedCount})
            </button>
          </div>

          {/* Search Box */}
          <div className="relative min-w-[240px]">
            <BsSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 text-sm" />
            <input
              type="text"
              placeholder="Search voucher #, party, UTR..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-[#111111] border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-teal-500 transition-colors"
            />
          </div>
        </div>

        {/* Vouchers Table */}
        <div className="bg-[#181818] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
          {loading ? (
            <div className="flex items-center justify-center py-20 text-gray-500 text-sm">
              <BsArrowRepeat className="animate-spin mr-2 text-lg" /> Loading payments registry…
            </div>
          ) : filteredPayments.length === 0 ? (
            <div className="text-center py-20 px-4">
              <BsCreditCard className="mx-auto text-4xl text-gray-600 mb-3" />
              <h3 className="text-lg font-bold text-white">No payment vouchers found</h3>
              <p className="text-xs text-gray-400 mt-1 max-w-md mx-auto">
                Record your first payment received, payment sent, or internal bank transfer to map them to your trade containers.
              </p>
              <div className="mt-4 flex items-center justify-center gap-3">
                <button
                  onClick={() => {
                    setPaymentModalType('Payment Received');
                    setIsPaymentModalOpen(true);
                  }}
                  className="px-4 py-2 bg-teal-500 text-slate-950 font-bold text-xs rounded-xl hover:bg-teal-400 transition-colors inline-flex items-center gap-1.5"
                >
                  <BsPlusLg /> Record Payment
                </button>
                <button
                  onClick={() => setIsTransferModalOpen(true)}
                  className="px-4 py-2 bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold text-xs rounded-xl hover:bg-purple-500/30 transition-colors inline-flex items-center gap-1.5"
                >
                  <BsArrowLeftRight /> Business Transfer
                </button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#111111]/80 text-gray-400 font-semibold uppercase tracking-wider border-b border-white/10">
                  <tr>
                    <th className="px-6 py-4">Voucher / Ref #</th>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Voucher Type</th>
                    <th className="px-6 py-4">Counterparty / Party</th>
                    <th className="px-6 py-4 text-right">Amount</th>
                    <th className="px-6 py-4">Mode / UTR</th>
                    <th className="px-6 py-4">Mapped Container</th>
                    <th className="px-6 py-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-medium text-gray-300">
                  {filteredPayments.map((p) => {
                    const isReceipt = p.type === 'Payment Received';
                    const isPayment = p.type === 'Payment Sent';
                    const isTransfer = p.type === 'Transfer';

                    let containerBadgeClass = 'bg-teal-500/10 text-teal-400 border-teal-500/20';
                    let ContainerIcon = BsCartCheck;
                    if (p.trade_container === 'Purchases') {
                      containerBadgeClass = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
                      ContainerIcon = BsBagCheck;
                    } else if (p.trade_container === 'Transfers') {
                      containerBadgeClass = 'bg-purple-500/10 text-purple-400 border-purple-500/20';
                      ContainerIcon = BsArrowLeftRight;
                    }

                    return (
                      <tr key={p.id} className="hover:bg-white/[0.02] transition-colors group">
                        {/* Voucher # */}
                        <td className="px-6 py-4">
                          <span className="font-mono text-white font-bold">{p.voucher_number}</span>
                          {p.notes && <div className="text-[11px] text-gray-500 truncate max-w-[180px]">{p.notes}</div>}
                        </td>

                        {/* Date */}
                        <td className="px-6 py-4 text-gray-400 whitespace-nowrap">
                          {p.date}
                        </td>

                        {/* Type Badge */}
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-bold ${
                            isReceipt ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                            isPayment ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                            'bg-purple-500/10 text-purple-400 border-purple-500/20'
                          }`}>
                            {isReceipt ? <BsArrowDownLeftCircleFill /> : isPayment ? <BsArrowUpRightCircleFill /> : <BsArrowLeftRight />}
                            {p.type}
                          </span>
                        </td>

                        {/* Party */}
                        <td className="px-6 py-4 text-white font-semibold">
                          {p.party}
                        </td>

                        {/* Amount */}
                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          <span className={`text-sm font-bold ${isReceipt ? 'text-emerald-400' : isPayment ? 'text-rose-400' : 'text-purple-400'}`}>
                            {isReceipt ? '+' : isPayment ? '-' : ''}{formatCurrency(p.amount, country)}
                          </span>
                        </td>

                        {/* Mode & UTR */}
                        <td className="px-6 py-4">
                          <div className="text-gray-200">{p.payment_mode}</div>
                          <div className="text-[11px] font-mono text-gray-500">{p.reference_number}</div>
                        </td>

                        {/* Mapped Container */}
                        <td className="px-6 py-4">
                          <div className="flex flex-col space-y-1">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-bold w-fit ${containerBadgeClass}`}>
                              <ContainerIcon /> {p.trade_container} Container
                            </span>
                            <span className="text-[11px] text-gray-400 font-mono">
                              Ref: {p.linked_doc_ref}
                            </span>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-6 py-4 text-right">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-extrabold uppercase tracking-wider ${
                            p.status === 'Settled'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          }`}>
                            {p.status === 'Settled' ? <BsCheckCircleFill className="text-[9px]" /> : <BsClockHistory className="text-[9px]" />}
                            {p.status || 'Pending Settlement'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Record Payment Modal */}
      <RecordPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        workbenchId={workbenchId}
        initialType={paymentModalType}
        onPaymentRecorded={loadPayments}
      />

      {/* Official Business Transfer (Contra) Modal */}
      <RecordTransferModal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        workbenchId={workbenchId}
        onTransferCreated={loadPayments}
      />
    </div>
  );
}
