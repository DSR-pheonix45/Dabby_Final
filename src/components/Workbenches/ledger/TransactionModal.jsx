import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BsX, BsArrowRight, BsJournalText, BsCashStack, BsArrowRepeat } from "react-icons/bs";
import { toast } from "react-hot-toast";
import ProofUploader from "../shared/ProofUploader";
import { backendService } from "../../../services/backendService";

const TRADE_TYPES = [
  "Vendor Invoice", "Vendor Payment", "Sales Invoice", "Customer Payment",
  "Expense Receipt", "Payroll", "Investment", "Loan", "Bank Statement",
  "Credit Note", "Debit Note", "Purchase Order", "Sales Order", "Manual Trade"
];

const TRADE_DIRECTIONS = [
  "PAYABLE", "RECEIVABLE", "IMMEDIATE_SETTLEMENT", "TRANSFER", "NON_FINANCIAL"
];

export default function TransactionModal({ isOpen, onClose, workbenchId, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [proofFile, setProofFile] = useState(null);
  const [parties, setParties] = useState([]);
  const [formData, setFormData] = useState({
    trade_type: "Expense Receipt",
    trade_direction: "IMMEDIATE_SETTLEMENT",
    amount: "",
    currency: "INR",
    invoice_number: "",
    invoice_date: new Date().toISOString().split("T")[0],
    due_date: "",
    description: "",
    notes: "",
    party_id: "",
    entity_id: "",
    our_entity_id: ""
  });

  useEffect(() => {
    if (isOpen && workbenchId) {
      fetchParties();
    }
  }, [isOpen, workbenchId]);

  const fetchParties = async () => {
    try {
      const response = await fetch(`http://localhost:8000/api/ops/parties/${workbenchId}`);
      if (!response.ok) throw new Error("Failed to fetch parties");
      const data = await response.json();
      setParties(data || []);
    } catch (err) {
      console.error("Error fetching parties:", err);
    }
  };

  const getEntities = (partyId) => {
    if (!partyId) return [];
    const party = parties.find(p => p.id === partyId);
    return party?.entities || [];
  };

  const getSelfParty = () => {
    return parties.find(p => p.is_self);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.amount || !formData.invoice_date) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      setLoading(true);
      
      const payload = {
        workbench_id: workbenchId,
        trade_type: formData.trade_type,
        trade_direction: formData.trade_direction,
        amount: parseFloat(formData.amount),
        currency: formData.currency || "INR",
        invoice_number: formData.invoice_number || null,
        invoice_date: formData.invoice_date,
        due_date: formData.due_date || null,
        description: formData.description || `Manual ${formData.trade_type}`,
        notes: formData.notes || "",
        party_id: formData.party_id || null,
        entity_id: formData.entity_id || null,
        our_entity_id: formData.our_entity_id || null,
        status: "Draft"
      };

      const response = await fetch("http://localhost:8000/api/trades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to record manual trade");
      }

      const result = await response.json();
      
      // Upload proof file if provided
      if (proofFile && result.id) {
        toast.loading("Uploading proof document...", { id: "upload-proof" });
        try {
          const docType = formData.trade_type.toLowerCase().replace(" ", "_");
          const docRes = await backendService.uploadDocument(
            workbenchId, 
            proofFile, 
            docType
          );
          
          if (docRes && docRes.id) {
            // Link document to the trade
            await fetch(`http://localhost:8000/api/trades/${result.id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ document_id: docRes.id })
            });
          }
          toast.success("Proof document uploaded and linked!", { id: "upload-proof" });
        } catch (uploadErr) {
          console.error("Proof upload failed:", uploadErr);
          toast.error("Trade recorded, but proof upload failed", { id: "upload-proof" });
        }
      }

      toast.success("Manual Trade recorded successfully!");
      onSuccess?.();
      onClose();
      
      // Reset form
      setFormData({
        trade_type: "Expense Receipt",
        trade_direction: "IMMEDIATE_SETTLEMENT",
        amount: "",
        currency: "INR",
        invoice_number: "",
        invoice_date: new Date().toISOString().split("T")[0],
        due_date: "",
        description: "",
        notes: "",
        party_id: "",
        entity_id: "",
        our_entity_id: ""
      });
      setProofFile(null);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const selfParty = getSelfParty();

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-2xl bg-[#0d0d0d] border border-white/10 rounded-[2rem] shadow-2xl overflow-hidden max-h-[95vh] flex flex-col"
          >
            {/* Modal Header */}
            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
                  <BsArrowRepeat size={20} className="animate-spin-slow" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white tracking-tight">Record Manual Trade</h3>
                  <p className="text-[9px] text-gray-500 uppercase tracking-widest font-black">Trade Engine System (Sprint 1)</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl text-gray-500 transition-all">
                <BsX size={24} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto custom-scrollbar">
              
              {/* Type and Direction */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Trade Type</label>
                  <select
                    value={formData.trade_type}
                    onChange={(e) => setFormData({ ...formData, trade_type: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:border-teal-500/50 appearance-none cursor-pointer"
                  >
                    {TRADE_TYPES.map(t => <option key={t} value={t} className="bg-black">{t}</option>)}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Trade Direction</label>
                  <select
                    value={formData.trade_direction}
                    onChange={(e) => setFormData({ ...formData, trade_direction: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:border-teal-500/50 appearance-none cursor-pointer"
                  >
                    {TRADE_DIRECTIONS.map(d => <option key={d} value={d} className="bg-black">{d}</option>)}
                  </select>
                </div>
              </div>

              {/* Counterparty Party and Entity */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Counterparty Party</label>
                  <select
                    value={formData.party_id}
                    onChange={(e) => setFormData({ ...formData, party_id: e.target.value, entity_id: "" })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:border-teal-500/50 appearance-none cursor-pointer"
                  >
                    <option value="">N/A</option>
                    {parties.filter(p => !p.is_self).map(p => (
                      <option key={p.id} value={p.id} className="bg-black">{p.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Counterparty Entity</label>
                  <select
                    disabled={!formData.party_id}
                    value={formData.entity_id}
                    onChange={(e) => setFormData({ ...formData, entity_id: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:border-teal-500/50 appearance-none cursor-pointer disabled:opacity-30"
                  >
                    <option value="">-- Leave Unresolved --</option>
                    {getEntities(formData.party_id).map(e => (
                      <option key={e.id} value={e.id} className="bg-black">{e.name} ({e.type})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Our Entity (Resolves Self Entity) */}
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Our Entity</label>
                <select
                  disabled={!selfParty}
                  value={formData.our_entity_id}
                  onChange={(e) => setFormData({ ...formData, our_entity_id: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:border-teal-500/50 appearance-none cursor-pointer disabled:opacity-30"
                >
                  <option value="">-- Leave Unresolved --</option>
                  {selfParty && getEntities(selfParty.id).map(e => (
                    <option key={e.id} value={e.id} className="bg-black">{e.name} ({e.type})</option>
                  ))}
                </select>
              </div>

              {/* Amount, Currency and Reference */}
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2 space-y-1">
                  <label className="text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Amount</label>
                  <div className="relative">
                    <BsCashStack className="absolute left-4 top-1/2 -translate-y-1/2 text-teal-500 text-sm" />
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="0.00"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-2.5 text-xs font-bold text-white focus:border-teal-500/50 transition-all animate-none"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Currency</label>
                  <input
                    type="text"
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:border-teal-500/50 transition-all"
                  />
                </div>
              </div>

              {/* Dates & Invoice details */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Invoice Number</label>
                  <input
                    type="text"
                    value={formData.invoice_number}
                    onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                    placeholder="INV-XXX"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:border-teal-500/50 transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Invoice Date</label>
                  <input
                    type="date"
                    required
                    value={formData.invoice_date}
                    onChange={(e) => setFormData({ ...formData, invoice_date: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:border-teal-500/50 transition-all cursor-pointer"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Due Date</label>
                  <input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:border-teal-500/50 transition-all cursor-pointer"
                  />
                </div>
              </div>

              {/* Memo/Description & Notes */}
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Description</label>
                  <div className="relative">
                    <BsJournalText className="absolute left-4 top-3 text-gray-500 text-xs" />
                    <textarea
                      rows="2"
                      required
                      placeholder="Describe the nature of this trade..."
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs text-white focus:border-teal-500/50 transition-all resize-none custom-scrollbar"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Internal Notes</label>
                  <textarea
                    rows="1"
                    placeholder="Add internal annotations or reference..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs text-white focus:border-teal-500/50 transition-all resize-none custom-scrollbar"
                  />
                </div>
              </div>

              {/* Upload Proof */}
              <div className="pt-1">
                <ProofUploader 
                  selectedFile={proofFile} 
                  onFileSelect={setProofFile} 
                  label="Trade Document Proof (Screenshot/Bill/Invoice)" 
                />
              </div>

              {/* Actions */}
              <div className="pt-2 flex space-x-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-8 py-3.5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-500 hover:bg-white/5 transition-all"
                >
                  Discard
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-[2] px-8 py-3.5 bg-teal-500 text-black rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-teal-400 transition-all shadow-xl shadow-teal-500/20 disabled:opacity-50"
                >
                  {loading ? "Recording Trade..." : "Record Trade"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
