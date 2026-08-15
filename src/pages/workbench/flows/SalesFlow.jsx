import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkbench } from '../../../context/WorkbenchContext';
import { salesService, SALE_STATUSES, SALE_TYPES } from '../../../services/salesService';
import { formatCurrency } from '../../../utils/currency';
import { collaborationService } from '../../../services/collaborationService';
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
  BsBuilding,
  BsPlusLg,
  BsArrowDownLeftSquare,
  BsReceipt,
  BsCheck2Circle
} from 'react-icons/bs';
import { toast } from 'react-hot-toast';
import RecordSaleModal from '../sales/components/RecordSaleModal';
import ImportDocVaultSalesModal from '../sales/components/ImportDocVaultSalesModal';
import RecordPaymentModal from '../sales/components/RecordPaymentModal';
import SaleDetailModal from '../sales/components/SaleDetailModal';

export default function SalesFlow() {
  const { activeWorkbench } = useWorkbench();
  const navigate = useNavigate();
  const workbenchId = activeWorkbench?.id;

  const [sales, setSales] = useState([]);
  const [savedParties, setSavedParties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('all');

  // Modals state
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedSaleForDetail, setSelectedSaleForDetail] = useState(null);

  const loadSalesModuleData = async () => {
    if (!workbenchId) return;
    setLoading(true);
    try {
      const data = salesService.getSales(workbenchId);
      setSales(data);

      try {
        const parties = await collaborationService.getParties(workbenchId);
        setSavedParties(parties || []);
      } catch (err) {
        console.warn("Parties fetch notice:", err);
      }
    } catch (err) {
      console.error("Failed to load Sales data:", err);
      toast.error("Failed to load Sales data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSalesModuleData();
    const handleSalesUpdate = () => loadSalesModuleData();
    window.addEventListener("sales:updated", handleSalesUpdate);
    return () => window.removeEventListener("sales:updated", handleSalesUpdate);
  }, [workbenchId]);

  // Derive metrics
  const totalSalesRevenue = sales.reduce((sum, s) => sum + (s.grand_total || 0), 0);
  const totalARCreated = sales.filter(s => s.sale_type !== 'pos').reduce((sum, s) => sum + (s.amount_due || 0), 0);
  const settledSalesCount = sales.filter(s => s.status === 'Completed' || s.payment_status === 'Paid').length;
  const pendingSettlementCount = sales.filter(s => s.amount_due > 0 && s.status !== 'Cancelled').length;

  // Filtered sales list
  const filteredSales = sales.filter(s => {
    const term = search.toLowerCase();
    const custName = (s.customer?.name || '').toLowerCase();
    const refNo = (s.reference_number || '').toLowerCase();
    const saleId = (s.id || '').toLowerCase();

    const matchesSearch = custName.includes(term) || refNo.includes(term) || saleId.includes(term);
    if (!matchesSearch) return false;

    if (statusFilter !== 'All' && s.status !== statusFilter) return false;
    if (typeFilter !== 'all' && s.sale_type !== typeFilter) return false;

    return true;
  });

  return (
    <div className="flex-1 flex flex-col h-full bg-[#111111] overflow-hidden font-dm-sans text-gray-200">
      {/* Module Header & Action Bar */}
      <div className="px-6 lg:px-10 py-5 border-b border-white/10 bg-[#181818]/60 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shrink-0">
        <div>
          <div className="flex items-center space-x-2 text-teal-400 text-xs font-bold uppercase tracking-wider mb-1">
            <BsCartCheck className="text-base" />
            <span>Commercial Operational Engine</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            Sales & Commercial Module
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Record sales, import Doc Vault invoices, settle receivables, and auto-post to Chart of Accounts (COA).
          </p>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={() => setShowRecordModal(true)}
            className="flex items-center space-x-2 px-4 py-2.5 bg-teal-500 hover:bg-teal-400 text-black rounded-xl text-xs font-extrabold transition-all shadow-lg shadow-teal-500/20"
          >
            <BsPlusLg className="text-xs" />
            <span>Record Sale</span>
          </button>

          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center space-x-2 px-3.5 py-2.5 bg-white/5 hover:bg-white/10 text-teal-400 border border-white/10 rounded-xl text-xs font-bold transition-colors"
          >
            <BsFileEarmarkText />
            <span>Import / Pull from Documents</span>
          </button>

          <button
            onClick={() => setShowPaymentModal(true)}
            className="flex items-center space-x-2 px-3.5 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-xl text-xs font-bold transition-colors"
          >
            <BsCashCoin />
            <span>Record Payment / Settlement</span>
          </button>

          <button
            onClick={() => navigate('/dashboard/workbench/ops', { state: { tab: 'ar' } })}
            className="flex items-center space-x-2 px-3.5 py-2.5 bg-[#222] hover:bg-[#333] text-gray-300 border border-white/10 rounded-xl text-xs font-bold transition-colors"
            title="Open Accounts Receivable in OPS"
          >
            <BsGraphUpArrow />
            <span>OPS → AR</span>
          </button>
        </div>
      </div>

      {/* Main Container Area */}
      <div className="flex-1 overflow-y-auto px-6 lg:px-10 py-6 space-y-6 custom-scrollbar">
        {/* KPI Summary Cards */}
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
              From {sales.length} recorded sale event(s)
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#181818] border border-white/5 shadow-sm">
            <div className="flex items-center justify-between text-gray-400 text-xs font-semibold mb-2">
              <span>Receivables (OPS → AR)</span>
              <BsClockHistory className="text-amber-400 text-lg" />
            </div>
            <div className="text-xl font-bold text-amber-400">
              {formatCurrency(totalARCreated, activeWorkbench?.country)}
            </div>
            <div className="text-[11px] text-gray-500 mt-1">
              {pendingSettlementCount} sale(s) awaiting collection
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#181818] border border-white/5 shadow-sm">
            <div className="flex items-center justify-between text-gray-400 text-xs font-semibold mb-2">
              <span>Settled Sales</span>
              <BsCheckCircle className="text-emerald-400 text-lg" />
            </div>
            <div className="text-xl font-bold text-emerald-400">
              {settledSalesCount} Transactions
            </div>
            <div className="text-[11px] text-gray-500 mt-1">
              Fully collected & posted to COA
            </div>
          </div>

          <div 
            onClick={() => navigate('/dashboard/workbench/ops', { state: { tab: 'ar' } })}
            className="p-4 rounded-xl bg-teal-500/10 border border-teal-500/20 hover:border-teal-500/40 cursor-pointer transition-all shadow-sm group"
          >
            <div className="flex items-center justify-between text-teal-400 text-xs font-semibold mb-2">
              <span>OPS → AR Integration</span>
              <BsGraphUpArrow className="text-teal-300 text-lg group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-sm font-bold text-white group-hover:text-teal-300 transition-colors">
              Manage AR & Aging →
            </div>
            <div className="text-[11px] text-teal-400/70 mt-1">
              Synced with Accounts Receivable
            </div>
          </div>
        </div>

        {/* Status Lifecycle Tabs */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {SALE_STATUSES.map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                statusFilter === st 
                  ? 'bg-teal-500 text-black shadow-md shadow-teal-500/20' 
                  : 'bg-[#181818] text-gray-400 hover:text-white border border-white/5'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-[#181818] border border-white/5">
          <div className="relative w-full sm:w-80">
            <BsSearch className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-500 text-xs" />
            <input 
              type="text"
              placeholder="Search customer, invoice #, sale ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#111111] border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-teal-500/50"
            />
          </div>

          <div className="flex items-center space-x-3 w-full sm:w-auto">
            <span className="text-xs text-gray-400 font-semibold flex items-center gap-1">
              <BsFunnel /> Model Filter:
            </span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-[#111111] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500/50"
            >
              <option value="all">All Models ({sales.length})</option>
              {SALE_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </div>
        </div>

        {/* Sales Transactions Grid / Table */}
        <div className="rounded-xl bg-[#181818] border border-white/5 overflow-hidden">
          <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
            <h3 className="text-xs font-bold text-white tracking-wider uppercase flex items-center gap-2">
              <BsReceipt className="text-teal-400 text-sm" />
              Sales Transactions ({filteredSales.length})
            </h3>
            <span className="text-[10px] text-gray-500 font-mono">
              Click any transaction to open details
            </span>
          </div>

          {loading ? (
            <div className="p-12 text-center text-gray-500 text-xs animate-pulse">
              Loading Sales Module data...
            </div>
          ) : filteredSales.length === 0 ? (
            <div className="p-12 text-center text-gray-500 text-xs">
              No sales transactions found matching your criteria. Click "+ Record Sale" to start.
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {filteredSales.map((s) => (
                <div 
                  key={s.id}
                  onClick={() => setSelectedSaleForDetail(s)}
                  className="p-4 hover:bg-white/[0.02] cursor-pointer transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                >
                  <div className="flex items-center space-x-4 min-w-0">
                    <div className="p-3 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400 shrink-0 group-hover:scale-105 transition-transform">
                      <BsBuilding className="text-lg" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-bold text-white group-hover:text-teal-300 transition-colors truncate">
                          {s.customer?.name}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-white/5 text-gray-400 border border-white/10">
                          {s.sale_type.replace(/_/g, ' ')}
                        </span>
                      </div>

                      <div className="flex items-center space-x-2 text-xs text-gray-400 mt-1">
                        <span className="font-mono text-teal-400/90 font-semibold">#{s.id}</span>
                        <span>•</span>
                        <span className="font-mono">{s.reference_number}</span>
                        <span>•</span>
                        <span>{s.date}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-6 text-right shrink-0">
                    <div>
                      <div className="text-base font-extrabold text-white">
                        {formatCurrency(s.grand_total, activeWorkbench?.country)}
                      </div>
                      <div className="text-[10px] text-gray-500 mt-0.5">
                        {s.amount_due > 0 ? (
                          <span className="text-amber-400 font-semibold">Due: ₹{s.amount_due.toLocaleString()}</span>
                        ) : (
                          <span className="text-emerald-400 font-semibold">Fully Settled</span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${
                        s.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                        s.status === 'Returned' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                        'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      }`}>
                        {s.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <RecordSaleModal
        isOpen={showRecordModal}
        onClose={() => setShowRecordModal(false)}
        workbenchId={workbenchId}
        savedParties={savedParties}
        onSaleRecorded={loadSalesModuleData}
      />

      <ImportDocVaultSalesModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        workbenchId={workbenchId}
        onImportSuccess={loadSalesModuleData}
      />

      <RecordPaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        workbenchId={workbenchId}
        onPaymentRecorded={loadSalesModuleData}
      />

      <SaleDetailModal
        isOpen={!!selectedSaleForDetail}
        onClose={() => setSelectedSaleForDetail(null)}
        workbenchId={workbenchId}
        sale={selectedSaleForDetail}
        onUpdate={() => {
          loadSalesModuleData();
          if (selectedSaleForDetail) {
            const updated = salesService.getSales(workbenchId).find(s => s.id === selectedSaleForDetail.id);
            setSelectedSaleForDetail(updated || null);
          }
        }}
      />
    </div>
  );
}
