import React, { useState, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { useWorkbench } from '../../../context/WorkbenchContext';
import { diService } from '../../../services/diService';
import { classifyDocumentParties } from '../../../utils/docPartyClassifier';
import { formatCurrency } from '../../../utils/currency';
import { 
  BsCartCheck, 
  BsGraphUpArrow, 
  BsCashCoin, 
  BsCheckCircle, 
  BsClockHistory, 
  BsArrowRight, 
  BsFileEarmarkText, 
  BsSearch,
  BsFunnel,
  BsBuilding
} from 'react-icons/bs';
import { toast } from 'react-hot-toast';

export default function SalesFlow() {
  const { activeWorkbench } = useWorkbench();
  const navigate = useNavigate();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('all');

  const loadSalesData = async () => {
    if (!activeWorkbench) return;
    setLoading(true);
    try {
      const allDocs = await diService.getDocuments(activeWorkbench.id);
      
      // Filter & categorize documents belonging to Sales Flow
      const salesDocs = allDocs.filter(doc => {
        const note = doc.di_analysis_notes?.[0] || {};
        const docType = (note.document_type || doc.document_type || '').toLowerCase();
        const classified = classifyDocumentParties(doc, activeWorkbench);
        
        // Sales types or classified as sales_invoice
        return (
          docType.includes('sales') || 
          docType.includes('customer') || 
          docType.includes('quotation') || 
          docType.includes('receipt') || 
          classified.classification === 'sales_invoice'
        );
      });

      salesDocs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setDocuments(salesDocs);
    } catch (err) {
      console.error("Failed to load Sales Flow documents:", err);
      toast.error("Failed to load Sales Flow data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSalesData();
  }, [activeWorkbench]);

  // Derive metrics
  const totalSalesRevenue = documents.reduce((sum, doc) => {
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
    const partyName = classified.externalParty?.name || data.parties?.customer?.value || "Customer";
    const ref = data.document?.reference_number?.value || doc.original_filename || "";

    const matchesSearch = partyName.toLowerCase().includes(term) || ref.toLowerCase().includes(term);

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
          <div className="flex items-center space-x-2 text-teal-400 text-xs font-bold uppercase tracking-wider mb-1">
            <BsCartCheck className="text-base" />
            <span>Process Flow</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            Sales & Revenue Flow
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Track customer sales documents, quotes, invoices, receipts, and link directly to Accounts Receivable (AR).
          </p>
        </div>

        <button
          onClick={() => navigate('/dashboard/workbench/ops', { state: { tab: 'ar' } })}
          className="flex items-center space-x-2 px-4 py-2.5 bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 rounded-xl text-xs font-bold transition-all shadow-lg shadow-teal-500/5 group shrink-0"
        >
          <span>View Accounts Receivable (AR) in OPS</span>
          <BsArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto px-6 lg:px-10 py-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-[#181818] border border-white/5 shadow-sm">
            <div className="flex items-center justify-between text-gray-400 text-xs font-semibold mb-2">
              <span>Total Sales Volume</span>
              <BsCashCoin className="text-teal-400 text-lg" />
            </div>
            <div className="text-xl font-bold text-white">
              {formatCurrency(totalSalesRevenue, activeWorkbench?.country)}
            </div>
            <div className="text-[11px] text-gray-500 mt-1">
              From {documents.length} sales document(s)
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#181818] border border-white/5 shadow-sm">
            <div className="flex items-center justify-between text-gray-400 text-xs font-semibold mb-2">
              <span>Settled Sales</span>
              <BsCheckCircle className="text-emerald-400 text-lg" />
            </div>
            <div className="text-xl font-bold text-emerald-400">
              {settledDocs.length} Documents
            </div>
            <div className="text-[11px] text-gray-500 mt-1">
              Fully posted to general ledger
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#181818] border border-white/5 shadow-sm">
            <div className="flex items-center justify-between text-gray-400 text-xs font-semibold mb-2">
              <span>Pending Action</span>
              <BsClockHistory className="text-amber-400 text-lg" />
            </div>
            <div className="text-xl font-bold text-amber-400">
              {pendingDocs.length} Documents
            </div>
            <div className="text-[11px] text-gray-500 mt-1">
              Awaiting review or payment posting
            </div>
          </div>

          <div 
            onClick={() => navigate('/dashboard/workbench/ops', { state: { tab: 'ar' } })}
            className="p-4 rounded-xl bg-teal-500/10 border border-teal-500/20 hover:border-teal-500/40 cursor-pointer transition-all shadow-sm group"
          >
            <div className="flex items-center justify-between text-teal-400 text-xs font-semibold mb-2">
              <span>OPS Integration</span>
              <BsGraphUpArrow className="text-teal-300 text-lg group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-sm font-bold text-white group-hover:text-teal-300 transition-colors">
              Manage AR & Aging →
            </div>
            <div className="text-[11px] text-teal-400/70 mt-1">
              Open Accounts Receivable in OPS
            </div>
          </div>
        </div>

        {/* Filter & Search Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-[#181818] border border-white/5">
          <div className="relative w-full sm:w-80">
            <BsSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
            <input 
              type="text"
              placeholder="Search customer, invoice ref..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#111111] border border-white/10 rounded-lg pl-9 pr-4 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-teal-500/50"
            />
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <BsFunnel className="text-gray-400 text-xs" />
            <button
              onClick={() => setStageFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                stageFilter === 'all' ? 'bg-teal-500 text-black' : 'bg-white/5 text-gray-400 hover:text-white'
              }`}
            >
              All Sales ({documents.length})
            </button>
            <button
              onClick={() => setStageFilter('pending')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                stageFilter === 'pending' ? 'bg-amber-500 text-black' : 'bg-white/5 text-gray-400 hover:text-white'
              }`}
            >
              Pending ({pendingDocs.length})
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

        {/* Sales Documents Pipeline Table / Cards */}
        <div className="rounded-xl bg-[#181818] border border-white/5 overflow-hidden">
          <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
            <h3 className="text-sm font-bold text-white tracking-wide uppercase flex items-center gap-2">
              <BsFileEarmarkText className="text-teal-400" />
              Sales Flow Documents ({filteredDocs.length})
            </h3>
            <button
              onClick={() => navigate('/dashboard/workbench/doc-vault')}
              className="text-xs text-teal-400 hover:text-teal-300 font-semibold"
            >
              Go to Doc Vault →
            </button>
          </div>

          {loading ? (
            <div className="p-12 text-center text-gray-500 text-xs animate-pulse">
              Loading sales flow data from Doc Vault...
            </div>
          ) : filteredDocs.length === 0 ? (
            <div className="p-12 text-center text-gray-500 text-xs">
              No sales documents found. Upload sales invoices or receipts in Doc Vault to populate this flow.
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {filteredDocs.map((doc) => {
                const note = doc.di_analysis_notes?.[0] || {};
                const data = note.extracted_data || {};
                const classified = classifyDocumentParties(doc, activeWorkbench);
                const customerName = classified.externalParty?.name || data.parties?.customer?.value || "Customer";
                const refNo = data.document?.reference_number?.value || doc.original_filename;
                const amt = note.money?.total_amount !== undefined ? note.money?.total_amount : data.financials?.total_amount?.value;
                const isSettled = settledDocs.some(s => s.id === doc.id);

                return (
                  <div 
                    key={doc.id}
                    className="p-4 hover:bg-white/[0.02] transition-colors flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center space-x-4 min-w-0">
                      <div className="p-2.5 rounded-lg bg-teal-500/10 border border-teal-500/20 text-teal-400 shrink-0">
                        <BsBuilding className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-white truncate">
                          {customerName}
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
                          Sales Invoice
                        </div>
                      </div>

                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                        isSettled 
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      }`}>
                        {isSettled ? 'Settled' : 'Pending AR'}
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
