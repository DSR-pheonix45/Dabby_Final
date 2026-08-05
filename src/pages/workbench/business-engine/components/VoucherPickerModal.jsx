import React, { useState, useEffect } from "react";
import { 
  BsXLg, BsSearch, BsFileEarmarkText, BsCheckCircleFill, 
  BsReceipt, BsFileEarmarkCheck, BsArrowUpRight, BsCashCoin
} from "react-icons/bs";
import { diService } from "../../../../services/diService";
import { useWorkbench } from "../../../../context/WorkbenchContext";
import { formatCurrency } from "../../../../utils/currency";

export default function VoucherPickerModal({ isOpen, onClose, onSelectVoucher, filterType }) {
  const { activeWorkbench } = useWorkbench();
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  useEffect(() => {
    if (isOpen && activeWorkbench) {
      loadVouchers();
    }
  }, [isOpen, activeWorkbench]);

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

  const loadVouchers = async () => {
    setLoading(true);
    try {
      const docs = await diService.getDocuments(activeWorkbench.id);
      
      // Transform documents into selectable vouchers
      const formatted = docs.map(doc => {
        const note = doc.di_analysis_notes?.[0] || {};
        const ext = note.extracted_data || {};
        
        const party = getCounterpartyName(doc, activeWorkbench);

        const rawAmt = ext.total_amount || ext.invoice_total || ext.amount || note.amount || note.money?.total_amount || 0;
        const amount = safeNum(rawAmt, 0);

        const rawDocType = ext.document_type || note.event_type || note.document_type || (doc.original_filename?.toLowerCase().includes("invoice") ? "sales_invoice" : "voucher");
        const docType = safeStr(rawDocType, "voucher");

        const rawDocNum = ext.invoice_number || ext.voucher_number || ext.po_number || doc.id?.substring(0, 8);
        const docNum = safeStr(rawDocNum, doc.id?.substring(0, 8));

        const rawDate = ext.invoice_date || ext.date || doc.created_at?.split("T")[0] || new Date().toISOString().split("T")[0];
        const date = safeStr(rawDate, new Date().toISOString().split("T")[0]);

        return {
          id: doc.id,
          filename: doc.original_filename,
          party,
          amount,
          docType: docType.toLowerCase(),
          docNum,
          date,
          rawDoc: doc,
          note
        };
      });

      setVouchers(formatted);
    } catch (err) {
      console.error("Failed to load vouchers for picker:", err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const filtered = vouchers.filter(v => {
    const matchesSearch = v.party.toLowerCase().includes(search.toLowerCase()) ||
                          v.docNum.toLowerCase().includes(search.toLowerCase()) ||
                          v.filename.toLowerCase().includes(search.toLowerCase());
    
    if (!matchesSearch) return false;
    
    if (filterType === "initiator") {
      // Initiator vouchers: Sales Invoices, Vendor Bills, Purchase Orders
      return true;
    }
    if (filterType === "receipt") {
      return v.docType.includes("receipt") || v.docType.includes("payment") || v.docType.includes("bank") || true;
    }
    if (filterType === "adjustment") {
      return v.docType.includes("credit") || v.docType.includes("debit") || v.docType.includes("note") || true;
    }
    
    return true;
  });

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#141414] border border-white/10 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between bg-[#181818]">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <BsFileEarmarkText className="text-teal-400" />
              Select Voucher from Doc Vault
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Choose an extracted document or voucher to link to this trade
            </p>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <BsXLg size={14} />
          </button>
        </div>

        {/* Search & Filter */}
        <div className="p-4 border-b border-white/5 bg-[#111111] flex items-center gap-3">
          <div className="relative flex-1">
            <BsSearch className="absolute left-3.5 top-3 text-gray-400 text-sm" />
            <input 
              type="text"
              placeholder="Search by party, voucher #, or filename..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-teal-500/50"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 custom-scrollbar">
          {loading ? (
            <div className="py-12 text-center text-gray-400 text-sm animate-pulse">
              Loading Doc Vault vouchers...
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-sm">
              No vouchers found in Doc Vault matching your search.
            </div>
          ) : (
            filtered.map(v => (
              <div 
                key={v.id}
                onClick={() => {
                  onSelectVoucher(v);
                  onClose();
                }}
                className="p-4 bg-white/5 hover:bg-teal-500/10 border border-white/10 hover:border-teal-500/30 rounded-xl flex items-center justify-between cursor-pointer transition-all group"
              >
                <div className="flex items-center space-x-3.5">
                  <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 group-hover:scale-105 transition-transform">
                    <BsReceipt size={18} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white group-hover:text-teal-300 transition-colors">
                      {v.party}
                    </h4>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="text-xs font-mono text-gray-400 bg-white/5 px-2 py-0.5 rounded">
                        #{v.docNum}
                      </span>
                      <span className="text-xs text-gray-400 capitalize">
                        {v.docType.replace("_", " ")}
                      </span>
                      <span className="text-xs text-gray-500">• {v.date}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-base font-extrabold text-white font-mono">
                    {formatCurrency(v.amount, activeWorkbench?.country)}
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs text-teal-400 font-semibold group-hover:underline mt-1">
                    Select <BsArrowUpRight size={12} />
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
}
