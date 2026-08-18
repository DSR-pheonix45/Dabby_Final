import React, { useState, useEffect } from "react";
import { useWorkbench } from "../../context/WorkbenchContext";
import { diService } from "../../services/diService";
import { accountService } from "../../services/accountService";
import { toast } from "react-hot-toast";
import { 
  BsArrowRepeat, 
  BsShieldCheck, 
  BsJournalText, 
  BsChevronDown, 
  BsChevronUp,
  BsTag,
  BsReceiptCutoff,
  BsFilter
} from "react-icons/bs";

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
          <p className="text-xs text-gray-500 mt-2">Total cumulative movement</p>
        </div>
      </div>
    </div>
  );
};

export default function COA() {
  const { activeWorkbench } = useWorkbench();
  const [loading, setLoading] = useState(true);
  const [trialBalance, setTrialBalance] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [masterAccounts, setMasterAccounts] = useState([]);
  const [periodFilter, setPeriodFilter] = useState("all"); // all | month | quarter | year
  const [viewMode, setViewMode] = useState("updated"); // 'updated' | 'all'
  const [expandedLedgerId, setExpandedLedgerId] = useState(null);

  const loadData = async () => {
    if (!activeWorkbench?.id) return;
    setLoading(true);
    try {
      const [tb, txs, accts] = await Promise.all([
        diService.getTrialBalance(activeWorkbench.id).catch(() => null),
        diService.getLedgerTransactions(activeWorkbench.id).catch(() => []),
        accountService.getAccounts(activeWorkbench.id).catch(() => [])
      ]);

      setTrialBalance(tb);
      const safeTxs = Array.isArray(txs) ? txs : [];
      setTransactions(safeTxs);
      
      // Calculate current balances and attach linked vouchers to accounts
      const accountsList = Array.isArray(accts) ? accts : [];
      const tbAccountsMap = {};
      (tb?.groups || []).forEach(g => {
        (g.accounts || []).forEach(a => {
          tbAccountsMap[a.account_id || a.code] = a.balance;
        });
      });

      const processedAccounts = accountsList.map(acc => {
        const linkedTxs = safeTxs.filter(tx => 
          (tx.entries || []).some(e => e.account_id === acc.id || e.account === acc.ledger || e.account === acc.full_code)
        );
        const derivedBal = tbAccountsMap[acc.id] !== undefined ? tbAccountsMap[acc.id] : (acc.current_balance || 0);

        return {
          ...acc,
          current_balance: derivedBal,
          linked_vouchers: linkedTxs,
          has_movement: Math.abs(derivedBal) > 0.001 || linkedTxs.length > 0
        };
      });

      setMasterAccounts(processedAccounts);
    } catch (err) {
      toast.error("Failed to load live COA state");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeWorkbench) {
      loadData();
    }
  }, [activeWorkbench]);

  // Real-time listener on ledger updates
  useEffect(() => {
    const handleUpdate = () => loadData();
    window.addEventListener('ledger:updated', handleUpdate);
    window.addEventListener('ar:updated', handleUpdate);
    window.addEventListener('focus', handleUpdate);
    return () => {
      window.removeEventListener('ledger:updated', handleUpdate);
      window.removeEventListener('ar:updated', handleUpdate);
      window.removeEventListener('focus', handleUpdate);
    };
  }, [activeWorkbench]);

  // Derived Financial Statement totals from canonical backend trial balance
  const groups = trialBalance?.groups || [];
  const getCatTotal = (catCode) => {
    const grp = groups.find(g => g.category === catCode);
    return Number(grp?.total || 0);
  };

  const totalAsset = getCatTotal("AST");
  const totalLiability = getCatTotal("LIA");
  const totalEquity = getCatTotal("EQU");
  const totalRevenue = getCatTotal("REV");
  const totalExpense = getCatTotal("EXP");

  const kpis = [
    { type: 'Asset', net: Math.max(0, totalAsset), gross: Math.max(0, totalAsset), color: { textTitle: 'text-emerald-400' } },
    { type: 'Liability', net: Math.max(0, totalLiability), gross: Math.max(0, totalLiability), color: { textTitle: 'text-rose-400' } },
    { type: 'Equity', net: Math.max(0, totalEquity), gross: Math.max(0, totalEquity), color: { textTitle: 'text-blue-400' } },
    { type: 'Revenue', net: Math.max(0, totalRevenue), gross: Math.max(0, totalRevenue), color: { textTitle: 'text-violet-400' } },
    { type: 'Expense', net: Math.max(0, totalExpense), gross: Math.max(0, totalExpense), color: { textTitle: 'text-orange-400' } },
  ];

  // Filter accounts based on view mode
  const displayedAccounts = viewMode === "updated"
    ? masterAccounts.filter(acc => acc.has_movement)
    : masterAccounts;

  const toggleExpand = (accId) => {
    setExpandedLedgerId(prev => prev === accId ? null : accId);
  };

  return (
    <div className="flex-1 h-full bg-[#111111] overflow-y-auto font-dm-sans">
      <div className="p-8 w-full space-y-8">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-6">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
              <span>Workbench Chart of Accounts</span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-500/10 text-teal-400 border border-teal-500/20">
                Live Derived State
              </span>
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              Real-time ALERX balances derived directly from posted double-entry ledger entries
            </p>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={periodFilter}
              onChange={(e) => setPeriodFilter(e.target.value)}
              className="bg-[#181818] border border-white/10 text-gray-300 text-xs font-semibold rounded-xl px-3 py-2 outline-none cursor-pointer"
            >
              <option value="all">Lifetime / Cumulative</option>
              <option value="month">Current Month</option>
              <option value="quarter">Current Quarter</option>
              <option value="year">Financial Year</option>
            </select>

            <button
              onClick={loadData}
              className="p-2 bg-[#181818] hover:bg-[#222] border border-white/10 rounded-xl text-gray-400 hover:text-white transition-all"
              title="Refresh Live Financials"
            >
              <BsArrowRepeat className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {/* 5 ALERX KPI Flip Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {kpis.map((kpi, idx) => (
            <KpiCard
              key={idx}
              title={kpi.type}
              netValue={kpi.net}
              grossValue={kpi.gross}
              color={kpi.color}
            />
          ))}
        </div>

        {/* Live Master Accounts & Day Book Split View */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Active / Updated Ledgers, Labels & Linked Vouchers */}
          <div className="lg:col-span-7 bg-[#181818] border border-white/10 rounded-2xl p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/5 pb-4 gap-3">
              <div>
                <h2 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <BsShieldCheck className="text-teal-400" />
                  <span>{viewMode === "updated" ? "Updated Ledgers & Linked Vouchers" : "All Configured Ledgers"}</span>
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  {viewMode === "updated" ? "Showing ledgers with active financial movement or posted vouchers" : "Showing full master Chart of Accounts"}
                </p>
              </div>

              {/* View Mode Toggle */}
              <div className="flex items-center bg-[#111111] p-1 rounded-xl border border-white/10 self-start sm:self-auto">
                <button
                  onClick={() => setViewMode("updated")}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                    viewMode === "updated" 
                      ? "bg-teal-500/20 text-teal-400 border border-teal-500/30" 
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  Active ({masterAccounts.filter(a => a.has_movement).length})
                </button>
                <button
                  onClick={() => setViewMode("all")}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                    viewMode === "all" 
                      ? "bg-teal-500/20 text-teal-400 border border-teal-500/30" 
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  All ({masterAccounts.length})
                </button>
              </div>
            </div>

            <div className="divide-y divide-white/5 overflow-hidden">
              {displayedAccounts.length === 0 ? (
                <div className="py-16 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto text-gray-400 text-xl">
                    <BsFilter />
                  </div>
                  <p className="text-sm text-gray-300 font-semibold">No updated ledgers found</p>
                  <p className="text-xs text-gray-500 max-w-sm mx-auto">
                    Post a transaction, invoice, or expense claim to activate ledgers, or toggle to "All" to view configured master accounts.
                  </p>
                </div>
              ) : (
                displayedAccounts.map((acc) => {
                  const isExpanded = expandedLedgerId === acc.id;
                  const vCount = acc.linked_vouchers.length;

                  return (
                    <div key={acc.id} className="py-4 space-y-3 transition-colors">
                      
                      {/* Main Ledger Row Header */}
                      <div 
                        onClick={() => toggleExpand(acc.id)}
                        className="flex items-center justify-between cursor-pointer group hover:bg-white/[0.02] p-2 rounded-xl transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <button className="p-1 rounded bg-white/5 text-gray-400 group-hover:text-white transition-colors">
                            {isExpanded ? <BsChevronUp className="text-xs" /> : <BsChevronDown className="text-xs" />}
                          </button>

                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-mono text-gray-500">{acc.full_code}</span>
                              <span className="text-sm font-bold text-white group-hover:text-teal-300 transition-colors">
                                {acc.ledger}
                              </span>
                              <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded bg-white/5 text-gray-400 border border-white/10">
                                {acc.account_class}
                              </span>
                            </div>

                            {/* Label & Linked Vouchers Pill */}
                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                              {acc.label && (
                                <span className="inline-flex items-center gap-1 text-[11px] text-gray-400 bg-white/[0.03] px-2 py-0.5 rounded border border-white/5">
                                  <BsTag className="text-[10px] text-teal-400" />
                                  <span>{acc.label}</span>
                                </span>
                              )}
                              <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded border font-semibold ${
                                vCount > 0 
                                  ? 'bg-teal-500/10 text-teal-400 border-teal-500/20' 
                                  : 'bg-white/5 text-gray-500 border-white/5'
                              }`}>
                                <BsReceiptCutoff className="text-[10px]" />
                                <span>{vCount} {vCount === 1 ? 'Linked Voucher' : 'Linked Vouchers'}</span>
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Balance */}
                        <div className="text-right">
                          <p className={`text-base font-extrabold ${
                            acc.current_balance > 0 ? 'text-white' : acc.current_balance < 0 ? 'text-rose-400' : 'text-gray-400'
                          }`}>
                            ₹{Number(acc.current_balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                          <span className="text-[10px] text-teal-400 font-semibold">Live Derived Balance</span>
                        </div>
                      </div>

                      {/* Expanded Linked Vouchers Accordion Panel */}
                      {isExpanded && (
                        <div className="ml-7 p-4 bg-[#111111] border border-white/10 rounded-xl space-y-3 animate-fadeIn">
                          <div className="flex items-center justify-between border-b border-white/5 pb-2">
                            <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2">
                              <BsReceiptCutoff className="text-teal-400" />
                              <span>Linked Vouchers ({vCount})</span>
                            </h4>
                            <span className="text-[10px] text-gray-500 font-mono">Ledger ID: {acc.id}</span>
                          </div>

                          {vCount === 0 ? (
                            <p className="text-xs text-gray-500 py-2 italic text-center">
                              No double-entry vouchers posted for this ledger yet.
                            </p>
                          ) : (
                            <div className="space-y-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                              {acc.linked_vouchers.map((v) => (
                                <div key={v.id} className="p-3 bg-[#181818] border border-white/5 rounded-lg text-xs space-y-1.5">
                                  <div className="flex items-center justify-between">
                                    <span className="font-bold text-white">{v.description}</span>
                                    <span className="text-gray-400 font-mono text-[11px]">{v.transaction_date}</span>
                                  </div>

                                  <div className="flex items-center justify-between text-gray-400 text-[11px]">
                                    <span>Dept: <strong className="text-gray-300">{v.department_name || 'General'}</strong></span>
                                    <span className="font-extrabold text-teal-400">₹{Number(v.total_amount || 0).toLocaleString()}</span>
                                  </div>

                                  <div className="border-t border-white/5 pt-1 mt-1 space-y-1">
                                    {(v.entries || []).map((e, idx) => (
                                      <div key={idx} className="flex items-center justify-between text-[11px]">
                                        <span className="text-gray-400">{e.account}</span>
                                        <span className={e.direction === 'debit' ? 'text-blue-400 font-bold' : 'text-amber-400 font-bold'}>
                                          {e.direction === 'debit' ? 'Dr' : 'Cr'} ₹{Number(e.amount || 0).toLocaleString()}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Day Book Posted Vouchers */}
          <div className="lg:col-span-5 bg-[#181818] border border-white/10 rounded-2xl p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <h2 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <BsJournalText className="text-teal-400" />
                <span>Day Book (Posted Activity)</span>
              </h2>
              <span className="text-xs text-gray-400 font-mono">
                {transactions.length} Posted Vouchers
              </span>
            </div>

            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1 custom-scrollbar">
              {transactions.length === 0 ? (
                <div className="py-16 text-center space-y-2">
                  <p className="text-sm font-semibold text-gray-400">No posted accounting entries recorded yet</p>
                  <p className="text-xs text-gray-500 max-w-xs mx-auto">
                    Approved sales invoices, expense claims, and manual vouchers will post audited double-entry records here.
                  </p>
                </div>
              ) : (
                transactions.map((tx) => (
                  <div key={tx.id} className="bg-[#111111] border border-white/5 rounded-xl p-4 space-y-2 hover:border-white/20 transition-all">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-teal-400 uppercase tracking-wider">
                        {tx.business_events?.event_type || 'VOUCHER POSTED'}
                      </span>
                      <span className="text-xs text-gray-400 font-mono">{tx.transaction_date}</span>
                    </div>

                    <p className="text-sm font-semibold text-white">{tx.description}</p>

                    <div className="pt-2 border-t border-white/5 space-y-1">
                      {(tx.entries || []).map((e, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs">
                          <span className="text-gray-400">
                            <span className="font-mono text-gray-500 mr-2">{e.code || 'LEG'}</span>
                            {e.account}
                          </span>
                          <span className={e.direction === 'debit' ? 'text-blue-400 font-bold' : 'text-amber-400 font-bold'}>
                            {e.direction === 'debit' ? 'Dr' : 'Cr'} ₹{Number(e.amount || 0).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-between pt-1 text-[10px] text-gray-500">
                      <span>Dept: {tx.department_name || 'General'}</span>
                      <span className="text-emerald-400 font-semibold">Audited Immutable</span>
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
