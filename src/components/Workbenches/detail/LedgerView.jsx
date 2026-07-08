import React, { useState, useEffect } from "react";
import { BsJournalText, BsListUl, BsFunnel } from "react-icons/bs";
import { apiFetch } from "../../../lib/apiClient";
import toast from "react-hot-toast";

export default function LedgerView({ workbenchId }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (workbenchId) fetchTransactions();
  }, [workbenchId]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const res = await apiFetch(`/api/ledger/workbench/${workbenchId}`);
      if (res.ok) {
        const data = await res.json();
        setTransactions(data || []);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load ledger");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(val || 0);

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a]">
      {/* Header */}
      <div className="flex items-center justify-between p-8 pb-4 border-b border-white/5">
        <div className="flex items-center space-x-3">
          <BsJournalText className="text-teal-400 text-2xl" />
          <h2 className="text-2xl font-bold text-white">General Ledger</h2>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
        {loading ? (
          <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div></div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-20 bg-white/[0.02] border border-white/5 rounded-2xl">
            <BsJournalText className="mx-auto text-4xl text-gray-600 mb-4" />
            <h3 className="text-white font-bold mb-2">Ledger is empty</h3>
            <p className="text-gray-500 text-sm">Compiled business events will appear here as double-entry journals.</p>
          </div>
        ) : (
          <div className="bg-[#0d1117] rounded-2xl border border-white/10 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white/5 border-b border-white/10 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  <th className="p-4">Date</th>
                  <th className="p-4">Transaction ID</th>
                  <th className="p-4">Type</th>
                  <th className="p-4">Total Amount</th>
                  <th className="p-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {transactions.map(t => (
                  <tr key={t.id} className="hover:bg-white/5 transition-colors cursor-pointer group">
                    <td className="p-4 text-xs text-gray-300">{new Date(t.date || t.created_at).toLocaleDateString()}</td>
                    <td className="p-4 text-xs font-mono text-gray-400 group-hover:text-teal-400 transition-colors">{t.id.split('-')[0]}</td>
                    <td className="p-4 text-xs font-bold text-white">{t.trade_type || t.type || 'N/A'}</td>
                    <td className="p-4 text-xs text-white">{formatCurrency(t.total_amount)}</td>
                    <td className="p-4 text-xs text-gray-500">{t.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
