import React, { useState } from 'react';
import { useTransfers } from '../../../../hooks/useOps';
import OpsSummaryCard from '../components/OpsSummaryCard';
import OpsFilterBar from '../components/OpsFilterBar';
import OpsDataTable from '../components/OpsDataTable';
import { 
  BsArrowLeftRight, BsBank, BsCashCoin, BsPiggyBank, BsShieldCheck, 
  BsPlusLg, BsFileEarmarkText, BsJournalCheck, BsArrowUpRight, BsArrowDownLeft 
} from 'react-icons/bs';
import { diService } from '../../../../services/diService';
import { toast } from 'react-hot-toast';

export default function Transfers({ workbenchId }) {
  const {
    data,
    kpis,
    loading,
    activeFilters,
    setFilters,
    searchQuery,
    setSearchQuery,
    refetch
  } = useTransfers(workbenchId);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [transferType, setTransferType] = useState('bank_to_bank');
  const [fromAccount, setFromAccount] = useState('HDFC Primary Current Acc');
  const [toAccount, setToAccount] = useState('ICICI Operations Acc');
  const [amount, setAmount] = useState('');
  const [transferDate, setTransferDate] = useState(new Date().toISOString().split('T')[0]);
  const [referenceNumber, setReferenceNumber] = useState('');
  const [narration, setNarration] = useState('');

  const filtersConfig = [
    {
      id: 'transfer_type',
      label: 'All Transfer Types',
      options: [
        { value: 'bank_to_bank', label: 'Inter-Bank Contra' },
        { value: 'petty_cash_withdrawal', label: 'Petty Cash Withdrawal' },
        { value: 'petty_cash_deposit', label: 'Petty Cash Deposit' },
        { value: 'founder_capital_infusion', label: 'Founder Capital Infusion' },
        { value: 'initial_funding', label: 'Initial Funding / Investment' },
        { value: 'founder_drawings', label: 'Founder Drawings / Withdrawal' }
      ]
    }
  ];

  const handleCreateTransfer = async (e) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) {
      toast.error('Please enter a valid transfer amount');
      return;
    }
    setSubmitting(true);
    try {
      await diService.createTransfer(workbenchId, {
        transfer_type: transferType,
        from_account: fromAccount,
        to_account: toAccount,
        amount: Number(amount),
        transfer_date: transferDate,
        reference_number: referenceNumber.trim() || undefined,
        narration: narration.trim() || undefined
      });
      toast.success('Transfer recorded and posted to COA!');
      setIsModalOpen(false);
      setAmount('');
      setReferenceNumber('');
      setNarration('');
      refetch();
    } catch (err) {
      toast.error(err.message || 'Failed to record transfer');
    } finally {
      setSubmitting(false);
    }
  };

  const getTypeLabel = (type) => {
    switch (type) {
      case 'bank_to_bank': return { label: 'Bank Contra', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' };
      case 'petty_cash_withdrawal': return { label: 'Petty Cash Out', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' };
      case 'petty_cash_deposit': return { label: 'Petty Cash In', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' };
      case 'founder_capital_infusion': return { label: 'Founder Capital', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' };
      case 'initial_funding': return { label: 'Initial Funding', color: 'bg-teal-500/10 text-teal-400 border-teal-500/20' };
      case 'founder_drawings': return { label: 'Founder Drawings', color: 'bg-rose-500/10 text-rose-400 border-rose-500/20' };
      default: return { label: 'Transfer', color: 'bg-gray-500/10 text-gray-400 border-gray-500/20' };
    }
  };

  const columns = [
    {
      header: 'Date & Reference',
      accessor: 'transfer_date',
      render: (row) => (
        <div>
          <p className="font-bold text-white text-xs">{row.transfer_date}</p>
          <p className="text-[10px] text-gray-400 font-mono mt-0.5">{row.reference_number || 'TRF-AUTO'}</p>
        </div>
      )
    },
    {
      header: 'Transfer Category',
      accessor: 'transfer_type',
      render: (row) => {
        const badge = getTypeLabel(row.transfer_type);
        return (
          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${badge.color}`}>
            {badge.label}
          </span>
        );
      }
    },
    {
      header: 'Accounts Movement',
      accessor: 'from_account',
      render: (row) => (
        <div className="flex items-center space-x-2 text-xs">
          <span className="text-gray-300 font-medium">{row.from_account}</span>
          <BsArrowLeftRight className="text-teal-400 text-xs shrink-0" />
          <span className="text-teal-300 font-bold">{row.to_account}</span>
        </div>
      )
    },
    {
      header: 'Amount (₹)',
      align: 'right',
      render: (row) => (
        <span className="font-extrabold text-emerald-400 text-xs">
          ₹{Number(row.amount || 0).toLocaleString()}
        </span>
      )
    },
    {
      header: 'Day Book Narration & COA Link',
      accessor: 'narration',
      render: (row) => (
        <div className="max-w-md space-y-1">
          <p className="text-xs text-gray-300 italic truncate" title={row.narration}>"{row.narration}"</p>
          <div className="flex items-center space-x-1.5 text-[10px] text-teal-400">
            <BsShieldCheck className="text-emerald-400" />
            <span>Posted to COA Universal Ledger</span>
          </div>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      
      {/* Top Banner & Trigger */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#141722] border border-white/10 rounded-2xl p-5 shadow-xl">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <BsArrowLeftRight className="text-teal-400" /> Transfers & Capital Ledger
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Contra bank-to-bank transfers, petty cash movements, and equity/capital infusions
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2.5 bg-teal-500 hover:bg-teal-400 text-black font-bold text-xs rounded-xl transition-all shadow-lg shadow-teal-500/20 flex items-center justify-center gap-2 shrink-0"
        >
          <BsPlusLg className="w-3.5 h-3.5" /> + Record Transfer
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <OpsSummaryCard
          title="Total Transfer Volume"
          value={`₹${(kpis.totalVolume || 0).toLocaleString()}`}
          trend={`${data.length} Total Transactions`}
          isPositive={true}
          icon={BsArrowLeftRight}
        />
        <OpsSummaryCard
          title="Inter-Bank Contra"
          value={`${kpis.contraCount || 0}`}
          trend="Contra Vouchers"
          isPositive={true}
          icon={BsBank}
        />
        <OpsSummaryCard
          title="Equity & Capital"
          value={`${kpis.equityCount || 0}`}
          trend="Infusions & Drawings"
          isPositive={true}
          icon={BsPiggyBank}
        />
        <OpsSummaryCard
          title="Day Book COA Status"
          value={`${kpis.postedCount || 0}`}
          trend="100% Balanced Ledger"
          isPositive={true}
          icon={BsJournalCheck}
        />
      </div>

      {/* Filter Bar */}
      <OpsFilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search narration, account name, reference..."
        filtersConfig={filtersConfig}
        activeFilters={activeFilters}
        onFilterChange={(key, val) => setFilters(prev => ({ ...prev, [key]: val }))}
        onClearFilters={() => setFilters({})}
      />

      {/* Data Table */}
      <OpsDataTable
        columns={columns}
        data={data}
        loading={loading}
        emptyMessage="No transfer records found. Click '+ Record Transfer' to create inter-bank contra or founder capital movements."
      />

      {/* Record Transfer Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-white/10 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl p-6 space-y-4">
            <div className="border-b border-white/10 pb-3">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <BsArrowLeftRight className="text-teal-400" /> Record Business Transfer
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">Contra bank transfers, petty cash, or founder equity movements</p>
            </div>

            <form onSubmit={handleCreateTransfer} className="space-y-4 text-xs">
              <div>
                <label className="block text-gray-300 font-semibold mb-1">Transfer Type *</label>
                <select
                  value={transferType}
                  onChange={(e) => {
                    const t = e.target.value;
                    setTransferType(t);
                    if (t === 'bank_to_bank') { setFromAccount('HDFC Primary Current Acc'); setToAccount('ICICI Operations Acc'); }
                    else if (t === 'petty_cash_withdrawal') { setFromAccount('HDFC Primary Current Acc'); setToAccount('Petty Cash Box'); }
                    else if (t === 'petty_cash_deposit') { setFromAccount('Petty Cash Box'); setToAccount('HDFC Primary Current Acc'); }
                    else if (t === 'founder_capital_infusion') { setFromAccount('Founder Personal Acc / Equity'); setToAccount('HDFC Primary Current Acc'); }
                    else if (t === 'founder_drawings') { setFromAccount('HDFC Primary Current Acc'); setToAccount('Founder Personal Drawings'); }
                  }}
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
                    placeholder="e.g. HDFC Current Acc"
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

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-teal-500 hover:bg-teal-400 text-black font-bold rounded-xl flex items-center gap-1.5"
                >
                  {submitting ? 'Posting...' : 'Post Transfer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
