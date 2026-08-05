import React, { useState, useEffect } from "react";
import { useWorkbench } from "../../../context/WorkbenchContext";
import { useAuth } from "../../../hooks/useAuth";
import { diService } from "../../../services/diService";
import { formatCurrency } from "../../../utils/currency";
import { toast } from "react-hot-toast";

import { 
  BsPlusLg, BsSearch, BsGrid3X3GapFill, BsListTask, BsKanban, 
  BsFolderFill, BsArrowDownLeft, BsArrowUpRight, BsReceiptCutoff, BsCheck2All,
  BsHourglassSplit, BsCashCoin, BsTag, BsLightningCharge, BsTrash,
  BsPencilSquare, BsDiagram3, BsBuilding, BsFileEarmarkText, BsCpu
} from "react-icons/bs";

import TradeModal from "./components/TradeModal";
import PipelineBoard from "./components/PipelineBoard";

export default function BusinessEngine() {
  const { activeWorkbench } = useWorkbench();
  const { user } = useAuth();

  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filters & Search
  const [activeTab, setActiveTab] = useState("all"); // all | receivable | payable | settled | pending
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState("cards"); // cards | pipeline | table

  // Trade Modal State
  const [isTradeModalOpen, setIsTradeModalOpen] = useState(false);
  const [selectedTrade, setSelectedTrade] = useState(null);

  const safeStr = (v, fallback = "") => {
    if (v === null || v === undefined) return fallback;
    if (typeof v === "object") {
      if (v.value !== undefined) return safeStr(v.value, fallback);
      if (v.name !== undefined) return safeStr(v.name, fallback);
      if (v.label !== undefined) return safeStr(v.label, fallback);
      return fallback;
    }
    return String(v);
  };

  const safeNum = (v, fallback = 0) => {
    if (v === null || v === undefined) return fallback;
    if (typeof v === "object") {
      if (v.value !== undefined) return safeNum(v.value, fallback);
      if (v.amount !== undefined) return safeNum(v.amount, fallback);
    }
    const n = Number(v);
    return isNaN(n) ? fallback : n;
  };

  const getCounterpartyName = (doc, activeWb) => {
    if (!doc) return "Unknown Party";

    const note = doc.di_analysis_notes?.[0] || doc.analysis_notes || {};
    const ext = note.extracted_data || {};
    const parties = note.parties || ext.parties || {};

    const sellerObj = parties.issuer || parties.seller || parties.vendor || ext.vendor_name || ext.supplier_name || ext.biller_name || {};
    const sellerName = safeStr(typeof sellerObj === "object" ? (sellerObj.name || sellerObj.value || "") : sellerObj).trim();

    const buyerObj = parties.recipient || parties.buyer || parties.customer || ext.customer_name || ext.recipient_name || ext.buyer_name || {};
    const buyerName = safeStr(typeof buyerObj === "object" ? (buyerObj.name || buyerObj.value || "") : buyerObj).trim();

    const myCompanyNames = [
      activeWb?.name,
      activeWb?.legal_name,
      activeWb?.legalName
    ].filter(Boolean).map(n => safeStr(n).toLowerCase().trim());

    const isSellerUs = myCompanyNames.some(my => my && sellerName && (sellerName.toLowerCase().includes(my) || my.includes(sellerName.toLowerCase())));
    const isBuyerUs = myCompanyNames.some(my => my && buyerName && (buyerName.toLowerCase().includes(my) || my.includes(buyerName.toLowerCase())));

    if (isSellerUs && buyerName) return buyerName;
    if (isBuyerUs && sellerName) return sellerName;
    if (buyerName && myCompanyNames.some(my => my && sellerName.toLowerCase().includes(my))) return buyerName;
    if (sellerName && myCompanyNames.some(my => my && buyerName.toLowerCase().includes(my))) return sellerName;

    const docType = safeStr(ext.document_type || note.document_type || note.event_type || "").toLowerCase();
    if (docType.includes("sales") || docType.includes("receipt")) {
      return buyerName || (isSellerUs ? "" : sellerName) || "Customer";
    }

    return (isSellerUs ? buyerName : sellerName) || buyerName || sellerName || safeStr(ext.party_name) || doc.original_filename || "Unknown Party";
  };

  const createTradeFromDoc = (doc) => {
    if (!doc) return;
    const note = doc.di_analysis_notes?.[0] || {};
    const ext = note.extracted_data || {};

    const party = getCounterpartyName(doc, activeWorkbench);

    const rawAmt = ext.total_amount || ext.invoice_total || ext.amount || note.amount || note.money?.total_amount || 0;
    const amount = safeNum(rawAmt, 0);

    const rawDocType = ext.document_type || note.event_type || note.document_type || "VOUCHER";
    const docType = safeStr(rawDocType, "VOUCHER");

    const rawDocNum = ext.invoice_number || ext.voucher_number || ext.po_number || doc.id?.substring(0, 8);
    const docNum = safeStr(rawDocNum, doc.id?.substring(0, 8));

    const rawDate = ext.invoice_date || ext.date || doc.created_at?.split("T")[0] || new Date().toISOString().split("T")[0];
    const date = safeStr(rawDate, new Date().toISOString().split("T")[0]);

    const newTrade = {
      id: `TRD-${Date.now().toString().substring(6)}`,
      title: `${docType.toUpperCase()} - ${party}`,
      tradeType: doc.original_filename?.toLowerCase().includes("bill") || doc.original_filename?.toLowerCase().includes("po") ? "payable" : "receivable",
      party,
      amount,
      date,
      status: "UNSETTLED",
      initiatorVoucher: {
        id: doc.id,
        voucherNo: docNum,
        docType,
        party,
        amount,
        date,
        filename: doc.original_filename
      },
      settlementVouchers: [],
      adjustmentNotes: [],
      netTarget: amount,
      totalSettled: 0,
      remainingOutstanding: amount,
      settlementPercent: 0
    };

    setSelectedTrade(newTrade);
    setIsTradeModalOpen(true);
    toast("Pre-loaded voucher from Doc Vault!", { icon: "🚀" });
  };

  // Load persistent trades for active workbench & check for pending Doc Vault vouchers
  useEffect(() => {
    if (activeWorkbench) {
      loadTrades();

      // Check if there is a pending document sent from Doc Vault
      const keyWb = `dabby_pending_trade_doc_${activeWorkbench.id}`;
      const keyGen = "dabby_pending_trade_doc";
      const pendingStr = localStorage.getItem(keyWb) || localStorage.getItem(keyGen);

      if (pendingStr) {
        try {
          const doc = JSON.parse(pendingStr);
          localStorage.removeItem(keyWb);
          localStorage.removeItem(keyGen);
          createTradeFromDoc(doc);
        } catch (err) {
          console.error("Notice: error loading pending trade doc:", err);
        }
      }
    }
  }, [activeWorkbench]);

  // Listen for Doc Vault "Send to Business Engine" trigger
  useEffect(() => {
    const handleCreateFromDoc = (e) => {
      if (e.detail) {
        createTradeFromDoc(e.detail);
      }
    };

    window.addEventListener("trade:create_from_doc", handleCreateFromDoc);
    return () => window.removeEventListener("trade:create_from_doc", handleCreateFromDoc);
  }, []);

  const loadTrades = async () => {
    if (!activeWorkbench) return;
    setLoading(true);
    try {
      // 1. Try local storage cache for user-created trades
      const local = localStorage.getItem(`dabby_trades_${activeWorkbench.id}`);
      let parsed = local ? JSON.parse(local) : [];

      // 2. Fetch backend events to combine seamlessly
      try {
        const events = await diService.listEvents(user?.id || "");
        if (Array.isArray(events) && events.length > 0) {
          const backendTrades = events.map(ev => ({
            id: ev.id,
            title: `${safeStr(ev.event_type, "EVENT").toUpperCase()} - ${safeStr(ev.counterparty, "Trade")}`,
            tradeType: safeStr(ev.event_type).toLowerCase().includes("purchase") || safeStr(ev.event_type).toLowerCase().includes("payable") ? "payable" : "receivable",
            party: safeStr(ev.counterparty, "Vendor/Customer"),
            amount: safeNum(ev.amount, 0),
            date: safeStr(ev.event_date, new Date().toISOString().split("T")[0]),
            status: ev.event_status === "COMPILED" ? "SETTLED" : "UNSETTLED",
            initiatorVoucher: {
              id: ev.document_id,
              voucherNo: safeStr(ev.id)?.substring(0, 8),
              docType: safeStr(ev.event_type, "sales_invoice"),
              party: safeStr(ev.counterparty),
              amount: safeNum(ev.amount, 0),
              date: safeStr(ev.event_date)
            },
            settlementVouchers: [],
            adjustmentNotes: [],
            remainingOutstanding: ev.event_status === "COMPILED" ? 0 : safeNum(ev.amount, 0),
            settlementPercent: ev.event_status === "COMPILED" ? 100 : 0
          }));

          // Merge without duplicates
          const existingIds = new Set(parsed.map(p => p.id));
          backendTrades.forEach(bt => {
            if (!existingIds.has(bt.id)) parsed.push(bt);
          });
        }
      } catch (err) {
        console.warn("Backend events fetch notice:", err);
      }

      setTrades(parsed);
    } catch (err) {
      console.error("Failed to load trades:", err);
    } finally {
      setLoading(false);
    }
  };

  const saveTradesToStorage = (updatedList) => {
    setTrades(updatedList);
    if (activeWorkbench) {
      localStorage.setItem(`dabby_trades_${activeWorkbench.id}`, JSON.stringify(updatedList));
    }
  };

  const handleSaveTrade = (savedTrade) => {
    let updated;
    const exists = trades.some(t => t.id === savedTrade.id);
    if (exists) {
      updated = trades.map(t => t.id === savedTrade.id ? savedTrade : t);
    } else {
      updated = [savedTrade, ...trades];
    }
    saveTradesToStorage(updated);
  };

  const handleDeleteTrade = (tradeId, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this trade?")) return;
    const updated = trades.filter(t => t.id !== tradeId);
    saveTradesToStorage(updated);
    toast.success("Trade deleted");
  };

  const handlePostToLedger = async (docId) => {
    await diService.postDocumentToLedger(docId);
  };

  // Filtered List
  const filteredTrades = trades.filter(t => {
    const matchesSearch = t.party?.toLowerCase().includes(search.toLowerCase()) ||
                          t.title?.toLowerCase().includes(search.toLowerCase()) ||
                          t.id?.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;

    if (activeTab === "receivable") return t.tradeType === "receivable";
    if (activeTab === "payable") return t.tradeType === "payable";
    if (activeTab === "settled") return t.status === "SETTLED";
    if (activeTab === "pending") return t.status !== "SETTLED";

    return true;
  });

  // Calculate Metrics
  const totalReceivables = trades.filter(t => t.tradeType === "receivable").reduce((a, c) => a + Number(c.amount || 0), 0);
  const totalPayables = trades.filter(t => t.tradeType === "payable").reduce((a, c) => a + Number(c.amount || 0), 0);
  const totalSettled = trades.filter(t => t.status === "SETTLED").reduce((a, c) => a + Number(c.amount || 0), 0);
  const pendingCount = trades.filter(t => t.status !== "SETTLED").length;

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0F111A] overflow-hidden font-sans text-gray-200">
      
      {/* Google Drive Style Header Bar */}
      <div className="px-6 lg:px-10 py-5 border-b border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#141724]/90 backdrop-blur-md z-10">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <BsCpu className="text-teal-400" />
            Business Engine
            <span className="text-xs bg-teal-500/10 text-teal-400 border border-teal-500/20 px-2.5 py-0.5 rounded-full uppercase font-bold">
              Trade Lifecycle & COA Engine
            </span>
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Google Drive style workspace for trades, vouchers, receipts, and double-entry settlements
          </p>
        </div>

        {/* Top Right Controls */}
        <div className="flex items-center space-x-3">
          
          {/* Prominent Google Drive "+ New Trade" Button */}
          <button
            onClick={() => {
              setSelectedTrade(null);
              setIsTradeModalOpen(true);
            }}
            className="flex items-center space-x-2.5 px-5 py-2.5 bg-gradient-to-r from-teal-400 to-emerald-400 text-black font-black text-xs rounded-xl shadow-lg shadow-teal-500/20 hover:opacity-95 transition-all transform hover:-translate-y-0.5"
          >
            <BsPlusLg size={15} />
            <span>+ New Trade</span>
          </button>

          {/* View Mode Switcher */}
          <div className="flex items-center bg-white/5 border border-white/10 rounded-xl p-1">
            <button
              onClick={() => setViewMode("cards")}
              className={`p-2 rounded-lg text-xs font-bold transition-all ${
                viewMode === "cards" ? "bg-teal-500/20 text-teal-400 border border-teal-500/30" : "text-gray-400 hover:text-white"
              }`}
              title="Google Drive Grid View"
            >
              <BsGrid3X3GapFill size={14} />
            </button>
            <button
              onClick={() => setViewMode("pipeline")}
              className={`p-2 rounded-lg text-xs font-bold transition-all ${
                viewMode === "pipeline" ? "bg-teal-500/20 text-teal-400 border border-teal-500/30" : "text-gray-400 hover:text-white"
              }`}
              title="KanBan Pipeline View"
            >
              <BsKanban size={14} />
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`p-2 rounded-lg text-xs font-bold transition-all ${
                viewMode === "table" ? "bg-teal-500/20 text-teal-400 border border-teal-500/30" : "text-gray-400 hover:text-white"
              }`}
              title="List Table View"
            >
              <BsListTask size={14} />
            </button>
          </div>

        </div>
      </div>

      {/* Main Container */}
      <div className="flex-1 overflow-y-auto p-6 lg:p-10 space-y-8 custom-scrollbar">
        
        {/* GOOGLE DRIVE QUICK ACCESS CONTAINERS */}
        <div>
          <h2 className="text-xs font-extrabold text-gray-400 uppercase tracking-wider mb-3.5 flex items-center gap-2">
            <BsFolderFill className="text-teal-400" /> Quick Trade Folders
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Sales / Receivables Folder */}
            <div 
              onClick={() => setActiveTab("receivable")}
              className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                activeTab === "receivable" 
                  ? "bg-teal-500/10 border-teal-500/50 shadow-lg shadow-teal-500/5" 
                  : "bg-[#141724] border-white/10 hover:border-teal-500/30 hover:bg-[#181C2E]"
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
                  <BsFolderFill size={20} />
                </div>
                <span className="text-xs font-bold text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded">
                  {trades.filter(t => t.tradeType === "receivable").length} Trades
                </span>
              </div>
              <h3 className="text-sm font-bold text-white mb-0.5">Sales / Receivables</h3>
              <p className="text-xs text-gray-400 font-mono">
                {formatCurrency(totalReceivables, activeWorkbench?.country)}
              </p>
            </div>

            {/* Purchases / Payables Folder */}
            <div 
              onClick={() => setActiveTab("payable")}
              className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                activeTab === "payable" 
                  ? "bg-cyan-500/10 border-cyan-500/50 shadow-lg shadow-cyan-500/5" 
                  : "bg-[#141724] border-white/10 hover:border-cyan-500/30 hover:bg-[#181C2E]"
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                  <BsFolderFill size={20} />
                </div>
                <span className="text-xs font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded">
                  {trades.filter(t => t.tradeType === "payable").length} Trades
                </span>
              </div>
              <h3 className="text-sm font-bold text-white mb-0.5">Purchases / Payables</h3>
              <p className="text-xs text-gray-400 font-mono">
                {formatCurrency(totalPayables, activeWorkbench?.country)}
              </p>
            </div>

            {/* Settled Trades Folder */}
            <div 
              onClick={() => setActiveTab("settled")}
              className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                activeTab === "settled" 
                  ? "bg-emerald-500/10 border-emerald-500/50 shadow-lg shadow-emerald-500/5" 
                  : "bg-[#141724] border-white/10 hover:border-emerald-500/30 hover:bg-[#181C2E]"
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <BsCheck2All size={20} />
                </div>
                <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                  100% Settled
                </span>
              </div>
              <h3 className="text-sm font-bold text-white mb-0.5">Settled & Balanced</h3>
              <p className="text-xs text-gray-400 font-mono">
                {formatCurrency(totalSettled, activeWorkbench?.country)}
              </p>
            </div>

            {/* Pending / Action Needed Folder */}
            <div 
              onClick={() => setActiveTab("pending")}
              className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                activeTab === "pending" 
                  ? "bg-amber-500/10 border-amber-500/50 shadow-lg shadow-amber-500/5" 
                  : "bg-[#141724] border-white/10 hover:border-amber-500/30 hover:bg-[#181C2E]"
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <BsHourglassSplit size={20} />
                </div>
                <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">
                  {pendingCount} Pending
                </span>
              </div>
              <h3 className="text-sm font-bold text-white mb-0.5">Action Needed</h3>
              <p className="text-xs text-gray-400">Awaiting payment or receipt</p>
            </div>

          </div>
        </div>

        {/* SEARCH & SUB-TABS FILTER BAR */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
          
          {/* Sub Tabs */}
          <div className="flex items-center space-x-2 overflow-x-auto">
            {[
              { id: "all", label: "All Trades" },
              { id: "receivable", label: "Sales (Receivables)" },
              { id: "payable", label: "Purchases (Payables)" },
              { id: "settled", label: "Settled" },
              { id: "pending", label: "Pending" }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap ${
                  activeTab === tab.id 
                    ? "bg-teal-500 text-black shadow-md shadow-teal-500/10" 
                    : "bg-white/5 hover:bg-white/10 text-gray-300"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative min-w-[260px]">
            <BsSearch className="absolute left-3.5 top-3 text-gray-400 text-sm" />
            <input 
              type="text"
              placeholder="Search trade title, party, or voucher..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[#141724] border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-teal-500/50"
            />
          </div>

        </div>

        {/* VIEW MODE 1: GOOGLE DRIVE STYLE CARDS */}
        {viewMode === "cards" && (
          <div>
            {filteredTrades.length === 0 ? (
              <div className="py-20 text-center bg-[#141724]/50 border border-dashed border-white/10 rounded-3xl p-8">
                <div className="w-16 h-16 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 mx-auto mb-4">
                  <BsDiagram3 size={28} />
                </div>
                <h3 className="text-lg font-bold text-white mb-1">No Trade Transactions Found</h3>
                <p className="text-xs text-gray-400 max-w-sm mx-auto mb-5">
                  Click "+ New Trade" to link invoices, vendor bills, and receipt vouchers into a complete trade settlement lifecycle.
                </p>
                <button
                  onClick={() => {
                    setSelectedTrade(null);
                    setIsTradeModalOpen(true);
                  }}
                  className="px-4 py-2.5 bg-teal-500 text-black font-extrabold text-xs rounded-xl shadow-md"
                >
                  + Create Your First Trade
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredTrades.map(trade => (
                  <div 
                    key={trade.id}
                    onClick={() => {
                      setSelectedTrade(trade);
                      setIsTradeModalOpen(true);
                    }}
                    className="p-5 bg-[#141724] hover:bg-[#181C2E] border border-white/10 hover:border-teal-500/40 rounded-2xl transition-all shadow-lg hover:shadow-2xl cursor-pointer flex flex-col justify-between group relative overflow-hidden"
                  >
                    
                    {/* Top Accent Line */}
                    <div className={`absolute top-0 left-0 right-0 h-1 ${
                      trade.status === "SETTLED" ? "bg-emerald-400" : trade.tradeType === "receivable" ? "bg-teal-400" : "bg-cyan-400"
                    }`} />

                    <div>
                      {/* Card Header */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center space-x-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-base ${
                            trade.tradeType === "receivable" ? "bg-teal-500/10 text-teal-400 border border-teal-500/20" : "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                          }`}>
                            {trade.tradeType === "receivable" ? <BsArrowDownLeft size={20} className="text-teal-400" /> : <BsArrowUpRight size={20} className="text-cyan-400" />}
                          </div>
                          <div>
                            <h3 className="text-sm font-extrabold text-white group-hover:text-teal-300 transition-colors line-clamp-1">
                              {trade.title}
                            </h3>
                            <span className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                              <BsBuilding className="text-[10px]" /> {trade.party}
                            </span>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border ${
                          trade.status === "SETTLED" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" :
                          trade.status === "PARTIALLY_SETTLED" ? "bg-amber-500/10 text-amber-400 border-amber-500/30" :
                          "bg-red-500/10 text-red-400 border-red-500/30"
                        }`}>
                          {trade.status === "SETTLED" ? "✓ SETTLED" : trade.status === "PARTIALLY_SETTLED" ? "PARTIAL" : "UNSETTLED"}
                        </span>
                      </div>

                      {/* Initiator & Voucher Info */}
                      <div className="bg-white/5 p-3 rounded-xl border border-white/5 space-y-1.5 mb-4">
                        <div className="flex justify-between text-xs font-semibold">
                          <span className="text-gray-400">Initiator Voucher:</span>
                          <span className="text-white font-mono">
                            {trade.initiatorVoucher ? `#${trade.initiatorVoucher.voucherNo}` : "Not Linked"}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs font-semibold">
                          <span className="text-gray-400">Receipts/Payments:</span>
                          <span className={`font-mono ${trade.settlementVouchers?.length > 0 ? "text-emerald-400" : "text-gray-400"}`}>
                            {trade.settlementVouchers?.length || 0} Linked
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Footer Amount & Progress */}
                    <div>
                      <div className="flex items-center justify-between text-xs font-bold mb-2">
                        <span className="text-gray-400 font-mono">
                          {formatCurrency(trade.amount, activeWorkbench?.country)}
                        </span>
                        <span className="text-teal-400">
                          {trade.settlementPercent || 0}% Settled
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden mb-4">
                        <div 
                          className="h-full bg-gradient-to-r from-teal-400 to-emerald-400 transition-all duration-300"
                          style={{ width: `${trade.settlementPercent || 0}%` }}
                        />
                      </div>

                      {/* Action Button Row */}
                      <div className="flex items-center justify-between pt-3 border-t border-white/5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTrade(trade);
                            setIsTradeModalOpen(true);
                          }}
                          className="flex items-center space-x-1.5 text-xs font-bold text-teal-400 hover:text-teal-300"
                        >
                          <BsPencilSquare size={12} />
                          <span>Link Vouchers</span>
                        </button>

                        <button
                          onClick={(e) => handleDeleteTrade(trade.id, e)}
                          className="p-1.5 text-gray-500 hover:text-red-400 transition-colors"
                          title="Delete Trade"
                        >
                          <BsTrash size={13} />
                        </button>
                      </div>
                    </div>

                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* VIEW MODE 2: KANBAN PIPELINE BOARD */}
        {viewMode === "pipeline" && (
          <PipelineBoard 
            cards={filteredTrades.map(t => ({
              id: t.id,
              type: t.tradeType === "receivable" ? "Sales Invoice" : "Vendor Bill",
              party: t.party,
              amount: t.amount,
              status: t.status,
              confidence: 98,
              settlement: { status: t.status === "SETTLED" ? "completed" : "pending" }
            }))}
            onCardClick={(c) => {
              const matched = trades.find(t => t.id === c.id);
              if (matched) {
                setSelectedTrade(matched);
                setIsTradeModalOpen(true);
              }
            }}
          />
        )}

        {/* VIEW MODE 3: LIST TABLE VIEW */}
        {viewMode === "table" && (
          <div className="bg-[#141724] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
            <table className="w-full text-left text-xs font-sans">
              <thead className="bg-[#181C2E] border-b border-white/10 text-gray-400 uppercase tracking-wider font-extrabold">
                <tr>
                  <th className="p-4">Trade Reference</th>
                  <th className="p-4">Counterparty</th>
                  <th className="p-4">Type</th>
                  <th className="p-4">Initiator Voucher</th>
                  <th className="p-4 text-right">Trade Total</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredTrades.map(t => (
                  <tr 
                    key={t.id}
                    onClick={() => {
                      setSelectedTrade(t);
                      setIsTradeModalOpen(true);
                    }}
                    className="hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    <td className="p-4 font-bold text-white">{t.title}</td>
                    <td className="p-4 text-gray-300">{t.party}</td>
                    <td className="p-4 capitalize text-gray-400 font-semibold">{t.tradeType}</td>
                    <td className="p-4 font-mono text-gray-300">
                      {t.initiatorVoucher ? `#${t.initiatorVoucher.voucherNo}` : "—"}
                    </td>
                    <td className="p-4 text-right font-mono font-bold text-white">
                      {formatCurrency(t.amount, activeWorkbench?.country)}
                    </td>
                    <td className="p-4 text-center">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border ${
                        t.status === "SETTLED" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                      }`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTrade(t);
                          setIsTradeModalOpen(true);
                        }}
                        className="px-3 py-1 bg-teal-500/10 text-teal-400 border border-teal-500/30 rounded-lg text-xs font-bold hover:bg-teal-500/20 transition-all"
                      >
                        Edit Trade
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>

      {/* Main Trade Modal */}
      <TradeModal
        isOpen={isTradeModalOpen}
        onClose={() => setIsTradeModalOpen(false)}
        trade={selectedTrade}
        onSaveTrade={handleSaveTrade}
        onPostToLedger={handlePostToLedger}
      />

    </div>
  );
}
