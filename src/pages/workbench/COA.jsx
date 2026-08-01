import React, { useState, useEffect } from "react";
import { useWorkbench } from "../../context/WorkbenchContext";
import { diService } from "../../services/diService";
import { accountService } from "../../services/accountService";
import { snapshotService } from "../../services/snapshotService";
import { toast } from "react-hot-toast";
import { BsArrowRepeat, BsCamera, BsUpload, BsClockHistory, BsCheckCircleFill, BsXCircleFill } from "react-icons/bs";

const KpiCard = ({ title, netValue, grossValue, color }) => {
  return (
    <div className="group relative w-full h-32 [perspective:1000px]">
      <div className="w-full h-full transition-all duration-500 [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)] shadow-sm rounded-xl cursor-pointer">
        {/* Front */}
        <div className={`absolute inset-0 w-full h-full [backface-visibility:hidden] flex flex-col justify-center px-6 rounded-xl border border-white/10 bg-[#181818]`}>
          <p className={`text-sm font-medium ${color.textTitle}`}>{title}</p>
          <h3 className={`text-2xl font-bold mt-1 text-white`}>
            ₹{netValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-sm font-normal opacity-70">Net</span>
          </h3>
          <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
            <BsArrowRepeat className="animate-spin-slow" /> Hover for Gross
          </p>
        </div>
        
        {/* Back */}
        <div className={`absolute inset-0 w-full h-full [backface-visibility:hidden] [transform:rotateY(180deg)] flex flex-col justify-center px-6 rounded-xl border border-white/10 bg-[#1A1A1A]`}>
          <p className="text-sm font-medium text-gray-400">{title} (Gross)</p>
          <h3 className="text-2xl font-bold text-white mt-1">
            ₹{grossValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h3>
          <p className="text-xs text-gray-500 mt-2">Total cumulative value</p>
        </div>
      </div>
    </div>
  );
};

export default function COA() {
  const { activeWorkbench } = useWorkbench();
  const [loading, setLoading] = useState(true);
  const [masterRows, setMasterRows] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [kpiSummary, setKpiSummary] = useState({
    Asset: { net: 0, gross: 0 },
    Liability: { net: 0, gross: 0 },
    Equity: { net: 0, gross: 0 },
    Revenue: { net: 0, gross: 0 },
    Expense: { net: 0, gross: 0 }
  });

  // Snapshot states
  const [snapshots, setSnapshots] = useState([]);
  const [isSnapshotDrawerOpen, setIsSnapshotDrawerOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    if (activeWorkbench) {
      loadData();
    }
  }, [activeWorkbench]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [accountsData, docs, kpiData, snaps] = await Promise.all([
        accountService.getAccounts(activeWorkbench.id),
        diService.getDocuments(activeWorkbench.id),
        accountService.getKpiSummary(activeWorkbench.id).catch(() => null),
        snapshotService.listSnapshots(activeWorkbench.id).catch(() => [])
      ]);
      
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
      if (kpiData) setKpiSummary(kpiData);
      setSnapshots(snaps || []);
    } catch (err) {
      toast.error("Failed to load COA data");
    } finally {
      setLoading(false);
    }
  };

  const handlePostVoucher = async (journal) => {
    try {
      const entries = journal.entries.map(e => ({
        ledger: e.account,
        direction: e.type,
        amount: parseFloat(e.amount)
      }));

      await accountService.postVoucher(activeWorkbench.id, {
        description: `Posted from AI Journal (${journal.documentName})`,
        entries
      });

      toast.success("Voucher posted to Double-Entry Ledger successfully!");
      loadData();
    } catch (err) {
      toast.error(err.message || "Failed to post voucher");
    }
  };

  const handleTakeSnapshot = async () => {
    try {
      await snapshotService.createSnapshot(activeWorkbench.id, null, "Manual snapshot from COA dashboard");
      toast.success("Trial Balance snapshot captured successfully!");
      loadData();
    } catch (err) {
      toast.error("Failed to take snapshot");
    }
  };

  const handleImportSubmit = async (e) => {
    e.preventDefault();
    if (!importFile) {
      toast.error("Please select a Trial Balance spreadsheet file (.xlsx or .csv)");
      return;
    }
    setImporting(true);
    try {
      const res = await snapshotService.importTrialBalanceExcel(activeWorkbench.id, importFile);
      toast.success(`Imported Trial Balance: ${res.extracted_items?.length || 0} accounts processed!`);
      setIsImportModalOpen(false);
      setImportFile(null);
      loadData();
    } catch (err) {
      toast.error(err.message || "Failed to import Trial Balance file");
    } finally {
      setImporting(false);
    }
  };

  const kpis = [
    { type: 'Asset', net: kpiSummary.Asset?.net || 0, gross: kpiSummary.Asset?.gross || 0, color: { textTitle: 'text-emerald-400' } },
    { type: 'Liability', net: kpiSummary.Liability?.net || 0, gross: kpiSummary.Liability?.gross || 0, color: { textTitle: 'text-rose-400' } },
    { type: 'Equity', net: kpiSummary.Equity?.net || 0, gross: kpiSummary.Equity?.gross || 0, color: { textTitle: 'text-blue-400' } },
    { type: 'Revenue', net: kpiSummary.Revenue?.net || 0, gross: kpiSummary.Revenue?.gross || 0, color: { textTitle: 'text-violet-400' } },
    { type: 'Expense', net: kpiSummary.Expense?.net || 0, gross: kpiSummary.Expense?.gross || 0, color: { textTitle: 'text-orange-400' } },
  ];

  const proposedJournals = [];
  documents.forEach(doc => {
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

  return (
    <div className="flex-1 h-full bg-[#111111] overflow-y-auto">
      <div className="p-8 max-w-7xl mx-auto space-y-8">
        
        {/* Header & Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-white">Chart of Accounts</h1>
            <p className="text-sm text-gray-400 mt-1">Double-Entry Financial DNA, Live Vouchers & Trial Balance Snapshots.</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleTakeSnapshot}
              className="px-4 py-2 bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 text-sm font-medium rounded-lg border border-teal-500/30 flex items-center gap-2 transition-colors"
            >
              <BsCamera /> Take Snapshot
            </button>
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 text-sm font-medium rounded-lg border border-blue-500/30 flex items-center gap-2 transition-colors"
            >
              <BsUpload /> Import Tally/Zoho TB
            </button>
            <button
              onClick={() => setIsSnapshotDrawerOpen(true)}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 text-sm font-medium rounded-lg border border-white/10 flex items-center gap-2 transition-colors"
            >
              <BsClockHistory /> History ({snapshots.length})
            </button>
          </div>
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
              ) : masterRows.length === 0 ? (
                <div className="text-center text-gray-500 py-12">
                  <p>No master accounts configured yet.</p>
                  <p className="text-xs mt-2">Go to Settings &gt; Company Master to set up your Chart of Accounts.</p>
                </div>
              ) : (
                <ul className="space-y-2">
                  {masterRows.map(row => (
                    <li key={row.id} className="p-3 bg-[#181818] border border-white/5 rounded-md shadow-sm transition-colors hover:border-white/10">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-white">
                          <span className="text-teal-400/70 mr-2 font-mono">{row.fullCode}</span>
                          {row.ledger}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-mono font-medium ${(row.accountClass === 'Expenses' || row.accountClass === 'Liabilities' || row.groupCode?.startsWith('X') || row.groupCode?.startsWith('L')) ? 'text-rose-400' : 'text-emerald-400'}`}>
                            ₹{(row.currentBalance || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
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

          {/* Right Side: Double-Entry Vouchers & AI Proposed Journals */}
          <div className="bg-[#181818] rounded-xl border border-white/10 p-6 flex flex-col h-[600px]">
            <h2 className="text-lg font-medium text-white mb-4">Double-Entry Vouchers & AI Journals</h2>
            <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
              {loading ? (
                <div className="animate-pulse space-y-4">
                  <div className="h-24 bg-white/5 rounded-xl"></div>
                  <div className="h-24 bg-white/5 rounded-xl"></div>
                </div>
              ) : proposedJournals.length === 0 ? (
                <div className="text-center text-gray-500 py-12 bg-[#111111] rounded-xl border border-dashed border-white/10">
                  <p>No AI journals generated yet.</p>
                  <p className="text-xs mt-1">Upload and process documents in the Doc Vault to see them here.</p>
                </div>
              ) : (
                proposedJournals.map((journal, i) => (
                  <div key={i} className="border border-white/10 rounded-xl overflow-hidden shadow-sm">
                    <div className="bg-[#111111] px-4 py-3 border-b border-white/10 flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-300 truncate max-w-[200px]" title={journal.documentName}>
                        {journal.documentName}
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-500">{journal.date}</span>
                        <button
                          onClick={() => handlePostVoucher(journal)}
                          className="px-3 py-1 bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 text-xs font-medium rounded-md border border-teal-500/30 transition-colors"
                        >
                          Post Voucher
                        </button>
                      </div>
                    </div>
                    <div className="p-4 bg-[#181818]">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-gray-500 border-b border-white/5">
                            <th className="pb-2 font-medium">Account</th>
                            <th className="pb-2 font-medium text-right">Debit</th>
                            <th className="pb-2 font-medium text-right">Credit</th>
                          </tr>
                        </thead>
                        <tbody>
                          {journal.entries.map((entry, j) => (
                            <tr key={j} className="border-b border-white/5 last:border-0">
                              <td className={`py-2 ${entry.type === 'credit' ? 'pl-4 text-gray-400' : 'font-medium text-gray-200'}`}>
                                {entry.account}
                              </td>
                              <td className="py-2 text-right text-gray-300">
                                {entry.type === 'debit' ? `₹${entry.amount.toFixed(2)}` : '-'}
                              </td>
                              <td className="py-2 text-right text-gray-300">
                                {entry.type === 'credit' ? `₹${entry.amount.toFixed(2)}` : '-'}
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

        {/* Import Trial Balance Modal */}
        {isImportModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#181818] border border-white/10 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
              <h3 className="text-lg font-semibold text-white">Import Trial Balance Spreadsheet</h3>
              <p className="text-xs text-gray-400">
                Upload an exported Trial Balance Excel file (.xlsx or .csv) from Tally, Zoho Books, or QuickBooks to create a Trial Balance snapshot.
              </p>

              <form onSubmit={handleImportSubmit} className="space-y-4">
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={(e) => setImportFile(e.target.files[0])}
                  className="w-full text-xs text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-teal-500/20 file:text-teal-300 hover:file:bg-teal-500/30 cursor-pointer"
                />

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsImportModalOpen(false)}
                    className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-medium rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={importing}
                    className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-black font-semibold text-xs rounded-lg disabled:opacity-50 flex items-center gap-2"
                  >
                    {importing ? "Scanning & Importing..." : "Create Snapshot"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Snapshot History Drawer/Modal */}
        {isSnapshotDrawerOpen && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#181818] border border-white/10 rounded-2xl p-6 max-w-2xl w-full space-y-4 shadow-2xl max-h-[80vh] flex flex-col">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-white">Trial Balance Snapshots History</h3>
                <button
                  onClick={() => setIsSnapshotDrawerOpen(false)}
                  className="text-gray-400 hover:text-white text-sm"
                >
                  ✕
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-1">
                {snapshots.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-8">No historical snapshots recorded yet.</p>
                ) : (
                  snapshots.map((snap) => (
                    <div key={snap.id} className="p-4 bg-[#111111] border border-white/5 rounded-xl flex justify-between items-center">
                      <div>
                        <h4 className="text-sm font-medium text-white">{snap.snapshot_name}</h4>
                        <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
                          <span>Date: {snap.snapshot_date}</span>
                          <span className="capitalize px-2 py-0.5 bg-white/5 rounded text-teal-300 font-mono">{snap.snapshot_type}</span>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="flex items-center gap-1 text-xs text-emerald-400 font-mono">
                          {snap.is_balanced ? <BsCheckCircleFill className="text-emerald-400" /> : <BsXCircleFill className="text-rose-400" />}
                          {snap.is_balanced ? "Balanced" : "Unbalanced"}
                        </div>
                        <p className="text-xs text-gray-500 mt-1 font-mono">
                          Debits: ₹{(snap.total_debit || 0).toLocaleString()} | Credits: ₹{(snap.total_credit || 0).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
