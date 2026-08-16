import React, { useState, useEffect } from "react";
import { useWorkbench } from "../../context/WorkbenchContext";
import { diService } from "../../services/diService";
import { accountService } from "../../services/accountService";
import { salesService } from "../../services/salesService";
import { toast } from "react-hot-toast";
import { BsArrowRepeat, BsShieldCheck } from "react-icons/bs";

const KpiCard = ({ title, netValue, grossValue, color }) => {
  return (
    <div className="group relative w-full h-32 [perspective:1000px]">
      <div className="w-full h-full transition-all duration-500 [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)] shadow-sm rounded-xl cursor-pointer">
        {/* Front */}
        <div className={`absolute inset-0 w-full h-full [backface-visibility:hidden] flex flex-col justify-center px-6 rounded-xl border border-white/10 bg-[#181818]`}>
          <p className={`text-sm font-medium ${color.textTitle}`}>{title}</p>
          <h3 className={`text-2xl font-bold mt-1 text-white`}>
            ₹{Number(netValue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xs font-normal opacity-70">Net</span>
          </h3>
          <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
            <BsArrowRepeat className="animate-spin-slow" /> Hover for Gross
          </p>
        </div>
        
        {/* Back */}
        <div className={`absolute inset-0 w-full h-full [backface-visibility:hidden] [transform:rotateY(180deg)] flex flex-col justify-center px-6 rounded-xl border border-white/10 bg-[#1A1A1A]`}>
          <p className="text-sm font-medium text-gray-400">{title} (Gross)</p>
          <h3 className="text-2xl font-bold text-white mt-1">
            ₹{Number(grossValue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h3>
          <p className="text-xs text-gray-500 mt-2">Total cumulative value</p>
        </div>
      </div>
    </div>
  );
};

export default function COA() {
  const { activeWorkbench } = useWorkbench();
  const [documents, setDocuments] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [masterRows, setMasterRows] = useState([]);

  const loadData = async () => {
    if (!activeWorkbench?.id) return;
    setLoading(true);
    try {
      const [accountsData, docs, trfs] = await Promise.all([
        accountService.getAccounts(activeWorkbench.id).catch(() => []),
        diService.getDocuments(activeWorkbench.id).catch(() => []),
        diService.getTransfers(activeWorkbench.id).catch(() => [])
      ]);
      
      const salesData = salesService.getSales(activeWorkbench.id) || [];

      const rows = accountsData || [];
      setMasterRows(
        rows.map(acc => ({
          id: acc.id,
          accountClass: acc.account_class,
          groupCode: acc.group_code,
          ledger: acc.ledger,
          label: acc.label || '',
          fullCode: acc.full_code,
          currentBalance: acc.current_balance || 0,
        }))
      );
      
      setDocuments(docs || []);
      setTransfers(trfs || []);
      setSales(salesData);
    } catch (err) {
      toast.error("Failed to load COA data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeWorkbench) {
      loadData();
    }
  }, [activeWorkbench]);

  // Listen to ledger:updated and window focus events for instant real-time sync
  useEffect(() => {
    const handleUpdate = () => {
      loadData();
    };
    window.addEventListener('ledger:updated', handleUpdate);
    window.addEventListener('ar:updated', handleUpdate);
    window.addEventListener('focus', handleUpdate);
    return () => {
      window.removeEventListener('ledger:updated', handleUpdate);
      window.removeEventListener('ar:updated', handleUpdate);
      window.removeEventListener('focus', handleUpdate);
    };
  }, [activeWorkbench]);

  // Build complete list of Day Book Journal Entries across Transfers, Sales & Doc Vault
  const proposedJournals = [];

  // A. Transfers (Bank-to-bank, Petty Cash, Founder Equity, Pushed Sales)
  (transfers || []).forEach(t => {
    proposedJournals.push({
      documentName: `Voucher: ${t.reference_number || 'TRF-POST'}`,
      date: t.transfer_date,
      narration: t.narration,
      entries: [
        { account: t.to_account, type: 'debit', amount: Number(t.amount || 0) },
        { account: t.from_account, type: 'credit', amount: Number(t.amount || 0) }
      ]
    });
  });

  // B. Sales Invoices (Pushed / User recorded sales)
  (sales || []).forEach(s => {
    const amt = Number(s.grand_total || s.amount || 0);
    if (amt > 0) {
      const custName = s.customer?.name || s.customer_name || 'Customer';
      proposedJournals.push({
        documentName: `Sales Invoice #${s.id}`,
        date: s.date || new Date().toISOString().split('T')[0],
        narration: `Sales Invoice #${s.id} issued to ${custName} [Posted to COA AR & Revenue]`,
        entries: [
          { account: 'Trade Debtors (Accounts Receivable)', type: 'debit', amount: amt },
          { account: 'Sales Revenue', type: 'credit', amount: amt }
        ]
      });
      if (Number(s.amount_paid || 0) > 0) {
        proposedJournals.push({
          documentName: `Receipt Voucher #${s.id}`,
          date: s.date || new Date().toISOString().split('T')[0],
          narration: `Customer Payment received against Sale #${s.id}`,
          entries: [
            { account: 'Operating Bank Account', type: 'debit', amount: Number(s.amount_paid) },
            { account: 'Trade Debtors (Accounts Receivable)', type: 'credit', amount: Number(s.amount_paid) }
          ]
        });
      }
    }
  });

  // C. Doc Vault Scanned Documents
  (documents || []).forEach(doc => {
    if (doc.di_analysis_notes && doc.di_analysis_notes.length > 0) {
      const note = doc.di_analysis_notes[0];
      if (note.extracted_data?.proposed_journal_entries) {
        proposedJournals.push({
          documentName: doc.original_filename,
          date: note.extracted_data.date,
          entries: note.extracted_data.proposed_journal_entries
        });
      }
    }
  });

  // Calculate live dynamic Net & Gross totals for the 5 KPI cards
  let totalAsset = 0;
  let totalLiability = 0;
  let totalEquity = 0;
  let totalRevenue = 0;
  let totalExpense = 0;

  proposedJournals.forEach(j => {
    (j.entries || []).forEach(e => {
      const accName = (e.account || '').toLowerCase();
      const amt = Number(e.amount || 0);
      if (e.type === 'debit') {
        if (accName.includes('receivable') || accName.includes('debtor') || accName.includes('bank') || accName.includes('cash') || accName.includes('asset')) {
          totalAsset += amt;
        } else if (accName.includes('expense') || accName.includes('cogs') || accName.includes('cost')) {
          totalExpense += amt;
        }
      } else if (e.type === 'credit') {
        if (accName.includes('revenue') || accName.includes('sale') || accName.includes('income')) {
          totalRevenue += amt;
        } else if (accName.includes('payable') || accName.includes('vendor') || accName.includes('liability')) {
          totalLiability += amt;
        } else if (accName.includes('equity') || accName.includes('capital')) {
          totalEquity += amt;
        }
      }
    });
  });

  const kpis = [
    { type: 'Asset', net: totalAsset, gross: totalAsset, color: { textTitle: 'text-emerald-400' } },
    { type: 'Liability', net: totalLiability, gross: totalLiability, color: { textTitle: 'text-rose-400' } },
    { type: 'Equity', net: totalEquity, gross: totalEquity, color: { textTitle: 'text-blue-400' } },
    { type: 'Revenue', net: totalRevenue, gross: totalRevenue, color: { textTitle: 'text-violet-400' } },
    { type: 'Expense', net: totalExpense, gross: totalExpense, color: { textTitle: 'text-orange-400' } },
  ];

  // Update master accounts current balances based on double-entry journal postings
  const computedMasterRows = masterRows.map(acc => {
    const labelLower = (acc.label || acc.ledger || '').toLowerCase();
    const ledgerLower = (acc.ledger || '').toLowerCase();
    let balance = Number(acc.currentBalance || 0);

    proposedJournals.forEach(j => {
      (j.entries || []).forEach(e => {
        const eAccLower = (e.account || '').toLowerCase();
        if (
          eAccLower.includes(labelLower) || 
          eAccLower.includes(ledgerLower) || 
          (ledgerLower.includes('receivable') && eAccLower.includes('receivable')) ||
          (ledgerLower.includes('debtor') && eAccLower.includes('debtor')) ||
          (ledgerLower.includes('revenue') && eAccLower.includes('revenue')) ||
          (ledgerLower.includes('bank') && eAccLower.includes('bank'))
        ) {
          if (e.type === 'debit') balance += Number(e.amount || 0);
          else balance -= Number(e.amount || 0);
        }
      });
    });

    return {
      ...acc,
      computedBalance: Math.abs(balance)
    };
  });

  return (
    <div className="flex-1 h-full bg-[#111111] overflow-y-auto">
      <div className="p-8 w-full space-y-8">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white">Chart of Accounts</h1>
            <p className="text-sm text-gray-400 mt-1">Manage your financial DNA and view live double-entry Day Book transactions.</p>
          </div>
          <button
            onClick={loadData}
            title="Refresh COA Data"
            className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-gray-400 hover:text-white transition-all shadow-sm flex items-center justify-center"
          >
            <BsArrowRepeat className="text-base" />
          </button>
        </div>

        {/* 5 KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {kpis.map((kpi) => (
            <KpiCard 
              key={kpi.type}
              title={kpi.type}
              netValue={kpi.net}
              grossValue={kpi.gross}
              color={kpi.color}
            />
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-4">
          
          {/* Left Side: Ledger and Labels */}
          <div className="bg-[#181818] rounded-xl border border-white/10 p-6 flex flex-col h-[600px]">
            <h2 className="text-lg font-medium text-white mb-4">Ledger & Labels</h2>
            <div className="flex-1 overflow-y-auto border border-white/5 rounded-lg bg-[#111111] p-4 custom-scrollbar">
              {loading ? (
                <div className="animate-pulse flex space-x-4">
                  <div className="flex-1 space-y-4 py-1">
                    <div className="h-4 bg-white/10 rounded w-3/4"></div>
                    <div className="h-4 bg-white/10 rounded w-1/2"></div>
                  </div>
                </div>
              ) : computedMasterRows.length === 0 ? (
                <div className="text-center text-gray-500 py-12">
                  <p>No master accounts configured yet.</p>
                  <p className="text-xs mt-2">Go to Settings &gt; Company Master to set up your Chart of Accounts.</p>
                </div>
              ) : (
                <ul className="space-y-2">
                  {computedMasterRows.map(row => (
                    <li key={row.id} className="p-3 bg-[#181818] border border-white/5 rounded-md shadow-sm transition-colors hover:border-white/10">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-white">
                          <span className="text-teal-400/70 mr-2 font-mono">{row.fullCode}</span>
                          {row.ledger}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-mono font-bold ${(row.accountClass === 'Expenses' || row.accountClass === 'Liabilities' || row.groupCode?.startsWith('X') || row.groupCode?.startsWith('L')) ? 'text-rose-400' : 'text-emerald-400'}`}>
                            ₹{(row.computedBalance || row.currentBalance || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                          </span>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">Label: <span className="capitalize">{row.label || "—"}</span> | Group: {row.groupCode}</div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Right Side: Auto-generated Day Book & Journal Entries */}
          <div className="bg-[#181818] rounded-xl border border-white/10 p-6 flex flex-col h-[600px]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-white">Day Book & Journal Entries</h2>
              <span className="text-xs text-teal-400 bg-teal-500/10 px-2.5 py-1 rounded-full border border-teal-500/20 font-bold flex items-center gap-1">
                <BsShieldCheck /> Live Postings ({proposedJournals.length})
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
              {loading ? (
                <div className="animate-pulse space-y-4">
                  <div className="h-24 bg-white/5 rounded-xl"></div>
                  <div className="h-24 bg-white/5 rounded-xl"></div>
                </div>
              ) : proposedJournals.length === 0 ? (
                <div className="text-center text-gray-500 py-12 bg-[#111111] rounded-xl border border-dashed border-white/10">
                  <p>No journal entries recorded yet.</p>
                  <p className="text-xs mt-1">Click "Push to COA Ledger" on sales invoices or record transfers to populate this ledger.</p>
                </div>
              ) : (
                proposedJournals.map((journal, i) => (
                  <div key={i} className="border border-white/10 rounded-xl overflow-hidden shadow-sm">
                    <div className="bg-[#111111] px-4 py-3 border-b border-white/10 flex justify-between items-center">
                      <div>
                        <span className="text-sm font-bold text-white truncate block max-w-[280px]" title={journal.documentName}>
                          {journal.documentName}
                        </span>
                        {journal.narration && <span className="text-[10px] text-gray-400 italic block mt-0.5">{journal.narration}</span>}
                      </div>
                      <span className="text-xs text-gray-500 font-mono">{journal.date}</span>
                    </div>
                    <div className="p-4 bg-[#181818]">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-gray-500 border-b border-white/5 text-xs">
                            <th className="pb-2 font-medium">Account</th>
                            <th className="pb-2 font-medium text-right">Debit (₹)</th>
                            <th className="pb-2 font-medium text-right">Credit (₹)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {journal.entries.map((entry, j) => (
                            <tr key={j} className="border-b border-white/5 last:border-0">
                              <td className={`py-2 text-xs ${entry.type === 'credit' ? 'pl-4 text-gray-400' : 'font-bold text-teal-300'}`}>
                                {entry.type === 'credit' ? `Cr ${entry.account}` : `Dr ${entry.account}`}
                              </td>
                              <td className="py-2 text-right text-xs text-emerald-400 font-bold font-mono">
                                {entry.type === 'debit' ? `₹${Number(entry.amount).toLocaleString(undefined, {minimumFractionDigits: 2})}` : '-'}
                              </td>
                              <td className="py-2 text-right text-xs text-purple-300 font-bold font-mono">
                                {entry.type === 'credit' ? `₹${Number(entry.amount).toLocaleString(undefined, {minimumFractionDigits: 2})}` : '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
