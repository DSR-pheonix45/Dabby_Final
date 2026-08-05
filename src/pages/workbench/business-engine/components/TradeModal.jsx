import React, { useState, useEffect } from "react";
import { 
  BsXLg, BsFileEarmarkText, BsPlusLg, BsTrash, BsCheck2All, 
  BsCashCoin, BsBuildingCheck, BsLightningChargeFill, BsArrowRepeat,
  BsReceiptCutoff, BsBoxSeam, BsCheckCircleFill, BsExclamationTriangleFill,
  BsDiagram3, BsTag, BsCalendar3, BsArrowDownLeft, BsArrowUpRight
} from "react-icons/bs";
import { useWorkbench } from "../../../../context/WorkbenchContext";
import { formatCurrency } from "../../../../utils/currency";
import { diService } from "../../../../services/diService";
import VoucherPickerModal from "./VoucherPickerModal";
import { toast } from "react-hot-toast";

export default function TradeModal({ isOpen, onClose, trade, onSaveTrade, onPostToLedger }) {
  const { activeWorkbench } = useWorkbench();

  // Form State
  const [tradeTitle, setTradeTitle] = useState("");
  const [tradeType, setTradeType] = useState("receivable"); // receivable (Sales) | payable (Purchase)
  const [partyName, setPartyName] = useState("");
  const [targetDate, setTargetDate] = useState(new Date().toISOString().split("T")[0]);

  // Vouchers
  const [initiatorVoucher, setInitiatorVoucher] = useState(null);
  const [settlementVouchers, setSettlementVouchers] = useState([]);
  const [adjustmentNotes, setAdjustmentNotes] = useState([]);

  // Manual payment inputs
  const [newPaymentAmt, setNewPaymentAmt] = useState("");
  const [newPaymentRef, setNewPaymentRef] = useState("");
  const [newPaymentAccount, setNewPaymentAccount] = useState("HDFC / Primary Operating Bank Account");

  // Adjustment note inputs
  const [newAdjType, setNewAdjType] = useState("credit_note"); // credit_note | debit_note
  const [newAdjAmt, setNewAdjAmt] = useState("");
  const [newAdjReason, setNewAdjReason] = useState("");

  // Voucher Picker Drawer State
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [pickerMode, setPickerMode] = useState("initiator"); // initiator | receipt | adjustment

  // Posting status
  const [posting, setPosting] = useState(false);

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

  useEffect(() => {
    if (trade) {
      setTradeTitle(safeStr(trade.title || trade.party || "New Trade Transaction"));
      setTradeType(safeStr(trade.tradeType || (safeStr(trade.type).toLowerCase().includes("purchase") ? "payable" : "receivable"), "receivable"));
      setPartyName(safeStr(trade.party || trade.counterparty || ""));
      setTargetDate(safeStr(trade.date || new Date().toISOString().split("T")[0]));
      setInitiatorVoucher(trade.initiatorVoucher ? {
        ...trade.initiatorVoucher,
        voucherNo: safeStr(trade.initiatorVoucher.voucherNo),
        docType: safeStr(trade.initiatorVoucher.docType),
        party: safeStr(trade.initiatorVoucher.party),
        amount: safeNum(trade.initiatorVoucher.amount),
        date: safeStr(trade.initiatorVoucher.date)
      } : null);
      setSettlementVouchers(trade.settlementVouchers || trade.settlements || []);
      setAdjustmentNotes(trade.adjustmentNotes || []);
    } else {
      resetForm();
    }
  }, [trade, isOpen]);

  const resetForm = () => {
    setTradeTitle("");
    setTradeType("receivable");
    setPartyName("");
    setTargetDate(new Date().toISOString().split("T")[0]);
    setInitiatorVoucher(null);
    setSettlementVouchers([]);
    setAdjustmentNotes([]);
    setNewPaymentAmt("");
    setNewPaymentRef("");
    setNewAdjAmt("");
    setNewAdjReason("");
  };

  if (!isOpen) return null;

  // Calculate Trade Amounts
  const initiatorAmount = Number(initiatorVoucher?.amount || trade?.amount || 0);
  
  const totalSettlements = settlementVouchers.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
  const totalAdjustments = adjustmentNotes.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
  
  const netTradeTarget = Math.max(0, initiatorAmount - totalAdjustments);
  const remainingOutstanding = Math.max(0, netTradeTarget - totalSettlements);
  
  const settlementPercent = netTradeTarget > 0 ? Math.min(100, Math.round((totalSettlements / netTradeTarget) * 100)) : (totalSettlements > 0 ? 100 : 0);

  const getStatus = () => {
    if (initiatorAmount === 0 && totalSettlements === 0) return "UNSETTLED";
    if (remainingOutstanding === 0 && (totalSettlements > 0 || initiatorAmount > 0)) return "SETTLED";
    if (totalSettlements > 0) return "PARTIALLY_SETTLED";
    return "UNSETTLED";
  };

  const status = getStatus();

  // Handlers for Voucher Picker
  const handleOpenPicker = (mode) => {
    setPickerMode(mode);
    setIsPickerOpen(true);
  };

  const handleSelectVoucher = (v) => {
    if (pickerMode === "initiator") {
      setInitiatorVoucher({
        id: v.id,
        voucherNo: v.docNum,
        docType: v.docType,
        party: v.party,
        amount: v.amount,
        date: v.date,
        filename: v.filename
      });
      if (!partyName) setPartyName(v.party);
      if (!tradeTitle) setTradeTitle(`${v.docType.toUpperCase()} - ${v.party}`);
      toast.success(`Initiator voucher #${v.docNum} linked!`);
    } else if (pickerMode === "receipt") {
      const newSettle = {
        id: `settle_${Date.now()}`,
        voucherId: v.id,
        voucherNo: v.docNum,
        amount: v.amount,
        account: "Primary Operating Bank Account",
        reference: `Receipt #${v.docNum}`,
        date: v.date,
        filename: v.filename
      };
      setSettlementVouchers(prev => [...prev, newSettle]);
      toast.success(`Settlement voucher #${v.docNum} added!`);
    } else if (pickerMode === "adjustment") {
      const newAdj = {
        id: `adj_${Date.now()}`,
        voucherId: v.id,
        voucherNo: v.docNum,
        type: v.docType.includes("debit") ? "debit_note" : "credit_note",
        amount: v.amount,
        reason: `Adjustment note #${v.docNum}`,
        date: v.date
      };
      setAdjustmentNotes(prev => [...prev, newAdj]);
      toast.success(`Adjustment voucher #${v.docNum} added!`);
    }
  };

  const handleAddManualPayment = (e) => {
    e.preventDefault();
    const amt = Number(newPaymentAmt);
    if (!amt || amt <= 0) {
      toast.error("Please enter a valid payment amount");
      return;
    }

    const payment = {
      id: `manual_pay_${Date.now()}`,
      amount: amt,
      account: newPaymentAccount,
      reference: newPaymentRef.trim() || `Bank Receipt / Payment`,
      date: new Date().toISOString().split("T")[0]
    };

    setSettlementVouchers(prev => [...prev, payment]);
    setNewPaymentAmt("");
    setNewPaymentRef("");
    toast.success(`Settlement payment of ${formatCurrency(amt, activeWorkbench?.country)} added!`);
  };

  const handleAddManualAdjustment = (e) => {
    e.preventDefault();
    const amt = Number(newAdjAmt);
    if (!amt || amt <= 0) {
      toast.error("Please enter a valid adjustment amount");
      return;
    }

    const adj = {
      id: `adj_${Date.now()}`,
      type: newAdjType,
      amount: amt,
      reason: newAdjReason.trim() || `${newAdjType === "credit_note" ? "Credit Note" : "Debit Note"} Adjustment`,
      date: new Date().toISOString().split("T")[0]
    };

    setAdjustmentNotes(prev => [...prev, adj]);
    setNewAdjAmt("");
    setNewAdjReason("");
    toast.success(`Adjustment of ${formatCurrency(amt, activeWorkbench?.country)} recorded!`);
  };

  const handleRemoveSettlement = (id) => {
    setSettlementVouchers(prev => prev.filter(s => s.id !== id));
  };

  const handleRemoveAdjustment = (id) => {
    setAdjustmentNotes(prev => prev.filter(a => a.id !== id));
  };

  const handleSave = () => {
    if (!partyName.trim()) {
      toast.error("Please enter a counterparty name");
      return;
    }

    const updatedTrade = {
      id: trade?.id || `TRD-${Date.now().toString().substring(6)}`,
      title: tradeTitle.trim() || `${tradeType.toUpperCase()} - ${partyName}`,
      tradeType,
      party: partyName.trim(),
      amount: initiatorAmount,
      targetDate,
      status,
      initiatorVoucher,
      settlementVouchers,
      adjustmentNotes,
      netTarget: netTradeTarget,
      totalSettled: totalSettlements,
      remainingOutstanding,
      settlementPercent,
      updatedAt: new Date().toISOString()
    };

    onSaveTrade(updatedTrade);
    toast.success("Trade saved to Business Engine!");
    onClose();
  };

  const handlePostToCOA = async () => {
    if (!initiatorVoucher?.id) {
      toast.error("Please link an initiator voucher from Doc Vault to post to COA");
      return;
    }
    setPosting(true);
    try {
      if (onPostToLedger) {
        await onPostToLedger(initiatorVoucher.id);
      } else {
        await diService.postDocumentToLedger(initiatorVoucher.id);
      }
      toast.success("Trade & Double-Entry Journal successfully posted to COA!");
      handleSave();
    } catch (err) {
      console.error("Posting error:", err);
      toast.error(err.message || "Failed to post to COA ledger");
    } finally {
      setPosting(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
        <div className="bg-[#141414] border border-white/10 rounded-2xl w-full max-w-4xl max-h-[92vh] overflow-hidden shadow-2xl flex flex-col font-sans">
          
          {/* Top Bar Header */}
          <div className="px-6 py-4 border-b border-white/10 bg-[#181818] flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg ${
                tradeType === "receivable" ? "bg-teal-500/20 text-teal-400 border border-teal-500/30" : "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
              }`}>
                {tradeType === "receivable" ? <BsArrowDownLeft size={20} className="text-teal-400" /> : <BsArrowUpRight size={20} className="text-cyan-400" />}
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
                  {trade ? "Edit Trade Transaction" : "Create New Trade Transaction"}
                </h2>
                <p className="text-xs text-gray-400">
                  Link Initiator Vouchers, Receipts, Bills & Adjustments to complete COA trade lifecycle
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              {/* Status Pill */}
              <span className={`px-3 py-1 rounded-full text-xs font-black tracking-wider uppercase border ${
                status === "SETTLED" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" :
                status === "PARTIALLY_SETTLED" ? "bg-amber-500/10 text-amber-400 border-amber-500/30" :
                "bg-red-500/10 text-red-400 border-red-500/30"
              }`}>
                {status === "SETTLED" ? "✓ SETTLED" : status === "PARTIALLY_SETTLED" ? "PARTIAL SETTLEMENT" : "UNSETTLED"}
              </span>

              <button 
                onClick={onClose}
                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white flex items-center justify-center transition-colors"
              >
                <BsXLg size={14} />
              </button>
            </div>
          </div>

          {/* Scrollable Content Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-[#11131C]">
            
            {/* Trade Info & Counterparty Header */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white/5 p-4 rounded-2xl border border-white/10">
              
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1.5">
                  Trade Type / Flow
                </label>
                <select 
                  value={tradeType}
                  onChange={(e) => setTradeType(e.target.value)}
                  className="w-full bg-[#1A1D2B] border border-white/10 rounded-xl px-3 py-2 text-sm text-white font-semibold focus:outline-none focus:border-teal-500/50"
                >
                  <option value="receivable">Sales Trade (Receivables)</option>
                  <option value="payable">Purchase Trade (Payables)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1.5">
                  Counterparty / Party
                </label>
                <input 
                  type="text"
                  placeholder="e.g. Acme Corp / Steel Suppliers"
                  value={partyName}
                  onChange={(e) => setPartyName(e.target.value)}
                  className="w-full bg-[#1A1D2B] border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 font-semibold focus:outline-none focus:border-teal-500/50"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1.5">
                  Trade Title / Reference
                </label>
                <input 
                  type="text"
                  placeholder="e.g. Q3 Software Services Order"
                  value={tradeTitle}
                  onChange={(e) => setTradeTitle(e.target.value)}
                  className="w-full bg-[#1A1D2B] border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 font-semibold focus:outline-none focus:border-teal-500/50"
                />
              </div>

            </div>

            {/* SECTION 1: INITIATOR VOUCHER */}
            <div className="bg-[#171A27] border border-white/10 rounded-2xl p-5 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
                    <BsFileEarmarkText size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-white">
                      1. Trade Initiator Voucher {tradeType === "receivable" ? "(Sales Invoice / Quotation)" : "(Vendor Bill / PO)"}
                    </h3>
                    <p className="text-xs text-gray-400">
                      The primary document that books the initial receivable or payable in COA
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => handleOpenPicker("initiator")}
                  className="flex items-center space-x-2 px-3.5 py-1.5 bg-teal-500 hover:bg-teal-400 text-black font-extrabold text-xs rounded-xl transition-all shadow-md"
                >
                  <BsPlusLg size={12} />
                  <span>📥 Pull Voucher from Doc Vault</span>
                </button>
              </div>

              {initiatorVoucher ? (
                <div className="p-4 bg-white/5 border border-teal-500/30 rounded-xl flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <BsReceiptCutoff className="text-teal-400 text-xl" />
                    <div>
                      <h4 className="text-sm font-bold text-white">
                        Voucher #{initiatorVoucher.voucherNo} — {initiatorVoucher.party}
                      </h4>
                      <div className="flex items-center space-x-2 mt-0.5 text-xs text-gray-400">
                        <span className="uppercase font-mono bg-white/5 px-2 py-0.5 rounded">
                          {initiatorVoucher.docType}
                        </span>
                        <span>• Date: {initiatorVoucher.date}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <span className="text-xs text-gray-400 block">Initiated Amount</span>
                      <span className="text-base font-extrabold text-white font-mono">
                        {formatCurrency(initiatorVoucher.amount, activeWorkbench?.country)}
                      </span>
                    </div>

                    <button
                      onClick={() => setInitiatorVoucher(null)}
                      className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                      title="Unlink Voucher"
                    >
                      <BsTrash size={14} />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-6 border border-dashed border-white/10 rounded-xl text-center bg-white/[0.02]">
                  <p className="text-xs text-gray-400 mb-2">No initiator voucher linked yet.</p>
                  <button
                    onClick={() => handleOpenPicker("initiator")}
                    className="inline-flex items-center space-x-2 text-xs font-bold text-teal-400 hover:text-teal-300"
                  >
                    <span>Click here to select a voucher from Doc Vault</span>
                  </button>
                </div>
              )}
            </div>

            {/* SECTION 2: SETTLEMENT & FULFILLMENT VOUCHERS */}
            <div className="bg-[#171A27] border border-white/10 rounded-2xl p-5 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <BsCashCoin size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-white">
                      2. Settle & Payment Receipts {tradeType === "receivable" ? "(Bank Receipts / Cash Settle)" : "(Bank Payments / GRN)"}
                    </h3>
                    <p className="text-xs text-gray-400">
                      Receipts and payment vouchers that balance & settle the outstanding trade
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => handleOpenPicker("receipt")}
                  className="flex items-center space-x-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-gray-200 rounded-xl transition-all"
                >
                  <BsPlusLg size={12} />
                  <span>Pull Receipt from Vault</span>
                </button>
              </div>

              {/* Settlement List */}
              {settlementVouchers.length > 0 && (
                <div className="space-y-2 mb-4">
                  {settlementVouchers.map((s, idx) => (
                    <div key={s.id || idx} className="p-3 bg-white/5 border border-white/10 rounded-xl flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <BsCheckCircleFill className="text-emerald-400 text-sm" />
                        <div>
                          <h5 className="text-xs font-bold text-white">
                            {s.reference || `Payment Receipt #${s.voucherNo}`}
                          </h5>
                          <span className="text-[11px] text-gray-400">{s.account || "Operating Bank Account"} • {s.date}</span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        <span className="text-sm font-mono font-bold text-emerald-400">
                          +{formatCurrency(s.amount, activeWorkbench?.country)}
                        </span>
                        <button
                          onClick={() => handleRemoveSettlement(s.id)}
                          className="text-gray-500 hover:text-red-400 text-xs transition-colors"
                        >
                          <BsTrash size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Manual Payment Input Row */}
              <form onSubmit={handleAddManualPayment} className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 pt-2 border-t border-white/5">
                <input 
                  type="number"
                  placeholder="Payment Amount"
                  value={newPaymentAmt}
                  onChange={(e) => setNewPaymentAmt(e.target.value)}
                  className="bg-[#1A1D2B] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none"
                />
                <input 
                  type="text"
                  placeholder="Reference (e.g. Bank Ref / Cheque #)"
                  value={newPaymentRef}
                  onChange={(e) => setNewPaymentRef(e.target.value)}
                  className="bg-[#1A1D2B] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none sm:col-span-2"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/40 rounded-xl text-xs font-bold transition-all"
                >
                  + Add Payment
                </button>
              </form>
            </div>

            {/* SECTION 3: ADJUSTMENT NOTES (CREDIT / DEBIT NOTES) */}
            <div className="bg-[#171A27] border border-white/10 rounded-2xl p-5 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                    <BsTag size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-white">
                      3. Adjustment Notes (Credit & Debit Notes)
                    </h3>
                    <p className="text-xs text-gray-400">
                      Adjustments for returned goods, discounts, or rate differences
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => handleOpenPicker("adjustment")}
                  className="flex items-center space-x-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-gray-200 rounded-xl transition-all"
                >
                  <BsPlusLg size={12} />
                  <span>Pull Note from Vault</span>
                </button>
              </div>

              {/* Adjustment Notes List */}
              {adjustmentNotes.length > 0 && (
                <div className="space-y-2 mb-4">
                  {adjustmentNotes.map((a, idx) => (
                    <div key={a.id || idx} className="p-3 bg-white/5 border border-white/10 rounded-xl flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <BsTag className="text-amber-400 text-sm" />
                        <div>
                          <h5 className="text-xs font-bold text-white uppercase">
                            {a.type?.replace("_", " ")} {a.voucherNo ? `#${a.voucherNo}` : ""}
                          </h5>
                          <span className="text-[11px] text-gray-400">{a.reason} • {a.date}</span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        <span className="text-sm font-mono font-bold text-amber-400">
                          -{formatCurrency(a.amount, activeWorkbench?.country)}
                        </span>
                        <button
                          onClick={() => handleRemoveAdjustment(a.id)}
                          className="text-gray-500 hover:text-red-400 text-xs transition-colors"
                        >
                          <BsTrash size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Manual Adjustment Form */}
              <form onSubmit={handleAddManualAdjustment} className="grid grid-cols-1 sm:grid-cols-5 gap-2.5 pt-2 border-t border-white/5">
                <select
                  value={newAdjType}
                  onChange={(e) => setNewAdjType(e.target.value)}
                  className="bg-[#1A1D2B] border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white font-semibold focus:outline-none"
                >
                  <option value="credit_note">Credit Note (- Amt)</option>
                  <option value="debit_note">Debit Note (+ Amt)</option>
                </select>
                <input 
                  type="number"
                  placeholder="Amount"
                  value={newAdjAmt}
                  onChange={(e) => setNewAdjAmt(e.target.value)}
                  className="bg-[#1A1D2B] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none"
                />
                <input 
                  type="text"
                  placeholder="Reason / Note"
                  value={newAdjReason}
                  onChange={(e) => setNewAdjReason(e.target.value)}
                  className="bg-[#1A1D2B] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none sm:col-span-2"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/40 rounded-xl text-xs font-bold transition-all"
                >
                  + Add Note
                </button>
              </form>
            </div>

            {/* REAL-TIME SETTLEMENT SUMMARY CALCULATOR & PROGRESS */}
            <div className="bg-[#1A1E2D] border border-teal-500/30 rounded-2xl p-5 shadow-xl">
              <h4 className="text-xs font-extrabold text-teal-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <BsDiagram3 /> Trade Settlement Summary & Balance
              </h4>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                  <span className="text-[11px] text-gray-400 block">Initiator Booking</span>
                  <span className="text-sm font-extrabold text-white font-mono">
                    {formatCurrency(initiatorAmount, activeWorkbench?.country)}
                  </span>
                </div>

                <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                  <span className="text-[11px] text-gray-400 block">Adjustments</span>
                  <span className="text-sm font-extrabold text-amber-400 font-mono">
                    -{formatCurrency(totalAdjustments, activeWorkbench?.country)}
                  </span>
                </div>

                <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                  <span className="text-[11px] text-gray-400 block">Total Settled</span>
                  <span className="text-sm font-extrabold text-emerald-400 font-mono">
                    {formatCurrency(totalSettlements, activeWorkbench?.country)}
                  </span>
                </div>

                <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                  <span className="text-[11px] text-gray-400 block">Remaining Outstanding</span>
                  <span className="text-sm font-extrabold text-teal-300 font-mono">
                    {formatCurrency(remainingOutstanding, activeWorkbench?.country)}
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div>
                <div className="flex justify-between items-center text-xs font-bold mb-1.5">
                  <span className="text-gray-400">Settlement Progress</span>
                  <span className="text-teal-400">{settlementPercent}% Completed</span>
                </div>
                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-teal-500 to-emerald-400 transition-all duration-500" 
                    style={{ width: `${settlementPercent}%` }}
                  />
                </div>
              </div>
            </div>

          </div>

          {/* Footer Action Controls */}
          <div className="px-6 py-4 border-t border-white/10 bg-[#181818] flex items-center justify-between">
            <button
              onClick={handlePostToCOA}
              disabled={posting || !initiatorVoucher}
              className="flex items-center space-x-2 px-4 py-2.5 bg-teal-500 hover:bg-teal-400 text-black font-black text-xs rounded-xl transition-all shadow-lg shadow-teal-500/10 disabled:opacity-40"
              title="Post double-entry journal postings to COA ledger"
            >
              <BsLightningChargeFill className={posting ? "animate-spin" : ""} />
              <span>{posting ? "Posting to COA..." : "⚡ Post Trade to COA Ledger"}</span>
            </button>

            <div className="flex items-center space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl text-xs font-bold transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-5 py-2.5 bg-white text-black hover:bg-gray-200 rounded-xl text-xs font-extrabold transition-all shadow-md"
              >
                Save Trade Transaction
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* Voucher Picker Drawer */}
      <VoucherPickerModal
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        onSelectVoucher={handleSelectVoucher}
        filterType={pickerMode}
      />
    </>
  );
}
