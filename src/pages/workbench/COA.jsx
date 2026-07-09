import React, { useState, useEffect } from "react";
import { useWorkbench } from "../../context/WorkbenchContext";
import { diService } from "../../services/diService";
import { toast } from "react-hot-toast";
import { BsArrowRepeat } from "react-icons/bs";

const KpiCard = ({ title, netValue, grossValue, color }) => {
  return (
    <div className="group relative w-full h-32 [perspective:1000px]">
      <div className="w-full h-full transition-all duration-500 [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)] shadow-sm rounded-xl cursor-pointer">
        {/* Front */}
        <div className={`absolute inset-0 w-full h-full [backface-visibility:hidden] flex flex-col justify-center px-6 rounded-xl border border-white/10 bg-[#181818]`}>
          <p className={`text-sm font-medium ${color.textTitle}`}>{title}</p>
          <h3 className={`text-2xl font-bold mt-1 text-white`}>
            ${netValue.toLocaleString()} <span className="text-sm font-normal opacity-70">Net</span>
          </h3>
          <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
            <BsArrowRepeat className="animate-spin-slow" /> Hover for Gross
          </p>
        </div>
        
        {/* Back */}
        <div className={`absolute inset-0 w-full h-full [backface-visibility:hidden] [transform:rotateY(180deg)] flex flex-col justify-center px-6 rounded-xl border border-white/10 bg-[#1A1A1A]`}>
          <p className="text-sm font-medium text-gray-400">{title} (Gross)</p>
          <h3 className="text-2xl font-bold text-white mt-1">
            ${grossValue.toLocaleString()}
          </h3>
          <p className="text-xs text-gray-500 mt-2">Total cumulative value</p>
        </div>
      </div>
    </div>
  );
};

export default function COA() {
  const { activeWorkbench } = useWorkbench();
  const [accounts, setAccounts] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (activeWorkbench) {
      loadData();
    }
  }, [activeWorkbench]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [accs, docs] = await Promise.all([
        diService.getAccounts(activeWorkbench.id),
        diService.getDocuments(activeWorkbench.id)
      ]);
      setAccounts(accs || []);
      setDocuments(docs || []);
    } catch (err) {
      toast.error("Failed to load COA data");
    } finally {
      setLoading(false);
    }
  };

  // Mock KPI data for the 5 account types
  const kpis = [
    { type: 'Asset', net: 150000, gross: 250000, color: { textTitle: 'text-emerald-400' } },
    { type: 'Liability', net: 45000, gross: 80000, color: { textTitle: 'text-rose-400' } },
    { type: 'Equity', net: 105000, gross: 170000, color: { textTitle: 'text-blue-400' } },
    { type: 'Revenue', net: 320000, gross: 400000, color: { textTitle: 'text-violet-400' } },
    { type: 'Expense', net: 180000, gross: 210000, color: { textTitle: 'text-orange-400' } },
  ];

  // Extract all proposed journal entries from the documents' analysis notes
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
        
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold text-white">Chart of Accounts</h1>
          <p className="text-sm text-gray-400 mt-1">Manage your financial DNA and view AI-proposed ledger activities.</p>
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
              ) : accounts.length === 0 ? (
                <div className="text-center text-gray-500 py-12">
                  <p>No accounts configured yet.</p>
                  <button 
                    onClick={async () => {
                      setLoading(true);
                      try {
                        await diService.seedAccounts(activeWorkbench.id, 'default-template-id');
                        toast.success('Financial Language seeded successfully!');
                        loadData();
                      } catch (err) {
                        toast.error(err.message || 'Failed to seed accounts');
                        setLoading(false);
                      }
                    }}
                    className="mt-4 px-4 py-2 bg-teal-500/20 text-teal-400 border border-teal-500/30 text-sm rounded-lg hover:bg-teal-500/30 transition-colors"
                  >
                    Seed Financial Language
                  </button>
                </div>
              ) : (
                <ul className="space-y-2">
                  {accounts.map(acc => (
                    <li key={acc.id} className="p-3 bg-[#181818] border border-white/5 rounded-md shadow-sm transition-colors hover:border-white/10">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-white">
                          <span className="text-teal-400/70 mr-2 font-mono">{acc.code}</span>
                          {acc.name}
                        </span>
                        <span className="text-[10px] px-2 py-1 bg-[#111111] border border-white/10 text-gray-400 rounded uppercase font-bold tracking-wider">{acc.category_code}</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">Balance: <span className="capitalize">{acc.normal_balance}</span></div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Right Side: Auto-generated Journals */}
          <div className="bg-[#181818] rounded-xl border border-white/10 p-6 flex flex-col h-[600px]">
            <h2 className="text-lg font-medium text-white mb-4">AI Proposed Journals</h2>
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
                      <span className="text-xs text-gray-500">{journal.date}</span>
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
                                {entry.type === 'debit' ? `$${entry.amount.toFixed(2)}` : '-'}
                              </td>
                              <td className="py-2 text-right text-gray-300">
                                {entry.type === 'credit' ? `$${entry.amount.toFixed(2)}` : '-'}
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
