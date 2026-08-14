import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkbench } from '../../../context/WorkbenchContext';
import { diService } from '../../../services/diService';
import { classifyDocumentParties } from '../../../utils/docPartyClassifier';
import { formatCurrency } from '../../../utils/currency';
import { 
  BsBagCheck, 
  BsWallet2, 
  BsExclamationCircle, 
  BsCheckCircle, 
  BsClockHistory, 
  BsArrowRight, 
  BsFileEarmarkText, 
  BsSearch,
  BsFunnel,
  BsShop
} from 'react-icons/bs';
import { toast } from 'react-hot-toast';

export default function PurchasesFlow() {
  const { activeWorkbench } = useWorkbench();
  const navigate = useNavigate();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('all');

  const loadPurchasesData = async () => {
    if (!activeWorkbench) return;
    setLoading(true);
    try {
      const allDocs = await diService.getDocuments(activeWorkbench.id);

      // Filter & categorize documents belonging to Purchases/Expenses Flow
      const purchaseDocs = allDocs.filter(doc => {
        const classified = classifyDocumentParties(doc, activeWorkbench);
        return classified.classification === 'vendor_invoice';
      });

      purchaseDocs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setDocuments(purchaseDocs);
    } catch (err) {
      console.error("Failed to load Purchases Flow documents:", err);
      toast.error("Failed to load Purchases & Expenses Flow data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPurchasesData();
  }, [activeWorkbench]);

  // Derive metrics
  const totalPurchaseExpenses = documents.reduce((sum, doc) => {
    const note = doc.di_analysis_notes?.[0] || {};
    const amt = note.money?.total_amount !== undefined ? note.money?.total_amount : note.extracted_data?.financials?.total_amount?.value;
    return sum + (Number(amt) || 0);
  }, 0);

  const settledDocs = documents.filter(d => {
    const logs = d.di_document_processing_logs || [];
    return logs.some(l => l.stage === 'post' && l.status === 'success');
  });

  const pendingDocs = documents.filter(d => !settledDocs.some(s => s.id === d.id));

  // Filtered documents list
  const filteredDocs = documents.filter(doc => {
    const term = search.toLowerCase();
    const note = doc.di_analysis_notes?.[0] || {};
    const data = note.extracted_data || {};
    const classified = classifyDocumentParties(doc, activeWorkbench);
    const vendorName = classified.externalParty?.name || data.parties?.vendor?.value || "Vendor";
    const ref = data.document?.reference_number?.value || doc.original_filename || "";

    const matchesSearch = vendorName.toLowerCase().includes(term) || ref.toLowerCase().includes(term);

    if (!matchesSearch) return false;
    if (stageFilter === 'settled') return settledDocs.some(s => s.id === doc.id);
    if (stageFilter === 'pending') return pendingDocs.some(p => p.id === doc.id);
    return true;
  });

  return (
    <div className="flex-1 flex flex-col h-full bg-[#111111] overflow-hidden font-dm-sans">
      {/* Header Banner */}
      <div className="px-6 lg:px-10 py-6 border-b border-white/10 bg-[#181818]/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-indigo-400 text-xs font-bold uppercase tracking-wider mb-1">
            <BsBagCheck className="text-base" />
            <span>Process Flow</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            Purchases & Expenses Flow
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Track vendor bills, purchase orders, OPEX claims, payments, and link directly to Accounts Payable (AP).
          </p>
        </div>

        <button
          onClick={() => navigate('/dashboard/workbench/ops', { state: { tab: 'ap' } })}
          className="flex items-center space-x-2 px-4 py-2.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-500/5 group shrink-0"
        >
          <span>View Accounts Payable (AP) in OPS</span>
          <BsArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto px-6 lg:px-10 py-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-[#181818] border border-white/5 shadow-sm">
            <div className="flex items-center justify-between text-gray-400 text-xs font-semibold mb-2">
              <span>Total Purchase Volume</span>
              <BsWallet2 className="text-indigo-400 text-lg" />
            </div>
            <div className="text-xl font-bold text-white">
              {formatCurrency(totalPurchaseExpenses, activeWorkbench?.country)}
            </div>
            <div className="text-[11px] text-gray-500 mt-1">
              From {documents.length} purchase/bill document(s)
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#181818] border border-white/5 shadow-sm">
            <div className="flex items-center justify-between text-gray-400 text-xs font-semibold mb-2">
              <span>Paid & Settled</span>
              <BsCheckCircle className="text-emerald-400 text-lg" />
            </div>
            <div className="text-xl font-bold text-emerald-400">
              {settledDocs.length} Bills
            </div>
            <div className="text-[11px] text-gray-500 mt-1">
              Fully settled & ledger posted
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#181818] border border-white/5 shadow-sm">
            <div className="flex items-center justify-between text-gray-400 text-xs font-semibold mb-2">
              <span>Pending AP / Unpaid</span>
              <BsExclamationCircle className="text-rose-400 text-lg" />
            </div>
            <div className="text-xl font-bold text-rose-400">
              {pendingDocs.length} Bills
            </div>
            <div className="text-[11px] text-gray-500 mt-1">
              Awaiting payment or vendor approval
            </div>
          </div>

          <div 
            onClick={() => navigate('/dashboard/workbench/ops', { state: { tab: 'ap' } })}
            className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 hover:border-indigo-500/40 cursor-pointer transition-all shadow-sm group"
          >
            <div className="flex items-center justify-between text-indigo-400 text-xs font-semibold mb-2">
              <span>OPS Integration</span>
              <BsWallet2 className="text-indigo-300 text-lg group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors">
              Manage AP & Vendors →
            </div>
            <div className="text-[11px] text-indigo-400/70 mt-1">
              Open Accounts Payable in OPS
            </div>
          </div>
        </div>

        {/* Filter & Search Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-[#181818] border border-white/5">
          <div className="relative w-full sm:w-80">
            <BsSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
            <input 
              type="text"
              placeholder="Search vendor, bill ref..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#111111] border border-white/10 rounded-lg pl-9 pr-4 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500/50"
            />
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <BsFunnel className="text-gray-400 text-xs" />
            <button
              onClick={() => setStageFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                stageFilter === 'all' ? 'bg-indigo-500 text-white' : 'bg-white/5 text-gray-400 hover:text-white'
              }`}
            >
              All Purchases ({documents.length})
            </button>
            <button
              onClick={() => setStageFilter('pending')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                stageFilter === 'pending' ? 'bg-amber-500 text-black' : 'bg-white/5 text-gray-400 hover:text-white'
              }`}
            >
              Pending AP ({pendingDocs.length})
            </button>
            <button
              onClick={() => setStageFilter('settled')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                stageFilter === 'settled' ? 'bg-emerald-500 text-black' : 'bg-white/5 text-gray-400 hover:text-white'
              }`}
            >
              Settled ({settledDocs.length})
            </button>
          </div>
        </div>

        {/* Purchase Documents Pipeline Table / Cards */}
        <div className="rounded-xl bg-[#181818] border border-white/5 overflow-hidden">
          <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
            <h3 className="text-sm font-bold text-white tracking-wide uppercase flex items-center gap-2">
              <BsFileEarmarkText className="text-indigo-400" />
              Purchases & Expenses Documents ({filteredDocs.length})
            </h3>
            <button
              onClick={() => navigate('/dashboard/workbench/doc-vault')}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
            >
              Go to Doc Vault →
            </button>
          </div>

          {loading ? (
            <div className="p-12 text-center text-gray-500 text-xs animate-pulse">
              Loading purchase/expense flow data from Doc Vault...
            </div>
          ) : filteredDocs.length === 0 ? (
            <div className="p-12 text-center text-gray-500 text-xs">
              No purchase/expense documents found. Upload vendor bills or expense claims in Doc Vault to populate this flow.
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {filteredDocs.map((doc) => {
                const note = doc.di_analysis_notes?.[0] || {};
                const data = note.extracted_data || {};
                const classified = classifyDocumentParties(doc, activeWorkbench);
                const vendorName = classified.externalParty?.name || data.parties?.vendor?.value || "Vendor";
                const refNo = data.document?.reference_number?.value || doc.original_filename;
                const amt = note.money?.total_amount !== undefined ? note.money?.total_amount : data.financials?.total_amount?.value;
                const isSettled = settledDocs.some(s => s.id === doc.id);

                return (
                  <div 
                    key={doc.id}
                    className="p-4 hover:bg-white/[0.02] transition-colors flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center space-x-4 min-w-0">
                      <div className="p-2.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 shrink-0">
                        <BsShop className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-white truncate">
                          {vendorName}
                        </div>
                        <div className="flex items-center space-x-2 text-xs text-gray-400 mt-0.5">
                          <span className="font-mono">{refNo}</span>
                          <span>•</span>
                          <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-6 text-right shrink-0">
                      <div>
                        <div className="text-sm font-bold text-white">
                          {amt !== undefined ? formatCurrency(amt, activeWorkbench?.country) : '-'}
                        </div>
                        <div className="text-[10px] text-gray-500 uppercase tracking-wider mt-0.5">
                          Vendor Bill / Expense
                        </div>
                      </div>

                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                        isSettled 
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                          : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                      }`}>
                        {isSettled ? 'Settled' : 'Pending AP'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
