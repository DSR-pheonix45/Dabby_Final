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
        <div className={`absolute inset-0 w-full h-full [backface-visibility:hidden] flex flex-col justify-center px-6 rounded-xl border border-gray-100 ${color.bg}`}>
          <p className={`text-sm font-medium ${color.textTitle}`}>{title}</p>
          <h3 className={`text-2xl font-bold mt-1 ${color.textVal}`}>
            ${netValue.toLocaleString()} <span className="text-sm font-normal opacity-70">Net</span>
          </h3>
          <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
            <BsArrowRepeat className="animate-spin-slow" /> Hover for Gross
          </p>
        </div>
        
        {/* Back */}
        <div className={`absolute inset-0 w-full h-full [backface-visibility:hidden] [transform:rotateY(180deg)] flex flex-col justify-center px-6 rounded-xl border border-gray-200 bg-white`}>
          <p className="text-sm font-medium text-gray-500">{title} (Gross)</p>
          <h3 className="text-2xl font-bold text-gray-900 mt-1">
            ${grossValue.toLocaleString()}
          </h3>
          <p className="text-xs text-gray-400 mt-2">Total cumulative value</p>
        </div>
      </div>
    </div>
  );
};

export default function COA() {
  const { currentWorkbench } = useWorkbench();
  const [accounts, setAccounts] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentWorkbench) {
      loadData();
    }
  }, [currentWorkbench]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [accs, docs] = await Promise.all([
        diService.getAccounts(currentWorkbench.id),
        diService.getDocuments(currentWorkbench.id)
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
    { type: 'Asset', net: 150000, gross: 250000, color: { bg: 'bg-emerald-50', textTitle: 'text-emerald-700', textVal: 'text-emerald-900' } },
    { type: 'Liability', net: 45000, gross: 80000, color: { bg: 'bg-rose-50', textTitle: 'text-rose-700', textVal: 'text-rose-900' } },
    { type: 'Equity', net: 105000, gross: 170000, color: { bg: 'bg-blue-50', textTitle: 'text-blue-700', textVal: 'text-blue-900' } },
    { type: 'Revenue', net: 320000, gross: 400000, color: { bg: 'bg-violet-50', textTitle: 'text-violet-700', textVal: 'text-violet-900' } },
    { type: 'Expense', net: 180000, gross: 210000, color: { bg: 'bg-orange-50', textTitle: 'text-orange-700', textVal: 'text-orange-900' } },
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
    <div className="flex-1 bg-[#FAFAFA] min-h-screen">
      <div className="p-8 max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Chart of Accounts</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your financial DNA and view AI-proposed ledger activities.</p>
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
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col h-[600px]">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Ledger & Labels</h2>
            <div className="flex-1 overflow-y-auto border border-gray-100 rounded-lg bg-gray-50 p-4">
              {loading ? (
                <div className="animate-pulse flex space-x-4">
                  <div className="flex-1 space-y-4 py-1">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              ) : accounts.length === 0 ? (
                <div className="text-center text-gray-500 py-12">
                  <p>No accounts configured yet.</p>
                  <button className="mt-4 px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700">
                    Seed from Template
                  </button>
                </div>
              ) : (
                <ul className="space-y-2">
                  {accounts.map(acc => (
                    <li key={acc.id} className="p-3 bg-white border border-gray-200 rounded-md shadow-sm">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-gray-800">{acc.name}</span>
                        <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded capitalize">{acc.account_type}</span>
                      </div>
                      <div className="text-xs text-gray-400 mt-1">Balance: {acc.normal_balance}</div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Right Side: Auto-generated Journals */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col h-[600px]">
            <h2 className="text-lg font-medium text-gray-900 mb-4">AI Proposed Journals</h2>
            <div className="flex-1 overflow-y-auto space-y-4 pr-2">
              {loading ? (
                <div className="animate-pulse space-y-4">
                  <div className="h-24 bg-gray-100 rounded-xl"></div>
                  <div className="h-24 bg-gray-100 rounded-xl"></div>
                </div>
              ) : proposedJournals.length === 0 ? (
                <div className="text-center text-gray-500 py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  <p>No AI journals generated yet.</p>
                  <p className="text-xs mt-1">Upload and process documents in the Doc Vault to see them here.</p>
                </div>
              ) : (
                proposedJournals.map((journal, i) => (
                  <div key={i} className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                    <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700 truncate max-w-[200px]" title={journal.documentName}>
                        {journal.documentName}
                      </span>
                      <span className="text-xs text-gray-500">{journal.date}</span>
                    </div>
                    <div className="p-4 bg-white">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-gray-400 border-b border-gray-100">
                            <th className="pb-2 font-medium">Account</th>
                            <th className="pb-2 font-medium text-right">Debit</th>
                            <th className="pb-2 font-medium text-right">Credit</th>
                          </tr>
                        </thead>
                        <tbody>
                          {journal.entries.map((entry, j) => (
                            <tr key={j} className="border-b border-gray-50 last:border-0">
                              <td className={`py-2 ${entry.type === 'credit' ? 'pl-4 text-gray-600' : 'font-medium text-gray-800'}`}>
                                {entry.account}
                              </td>
                              <td className="py-2 text-right text-gray-900">
                                {entry.type === 'debit' ? `$${entry.amount.toFixed(2)}` : '-'}
                              </td>
                              <td className="py-2 text-right text-gray-900">
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
