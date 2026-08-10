import React, { useState } from 'react';
import { BsX, BsFileEarmarkMinus, BsCheckCircleFill, BsTag } from 'react-icons/bs';
import { toast } from 'react-hot-toast';
import { formatCurrency } from '../../../../utils/currency';
import { useWorkbench } from '../../../../context/WorkbenchContext';
import { saveInvoice } from '../../../../components/Generator/generatorStore';
import { saveDocumentToDocVaultAndEngine } from '../../../../utils/docVaultExporter';
import { generateStandardDocumentPDF } from '../../../../utils/documentPdfGenerator';

export default function CreateAdjustmentNoteModal({ isOpen, onClose, documentCard, onNoteCreated }) {
  const { activeWorkbench } = useWorkbench();
  
  const isSales = (documentCard?.type || "").toLowerCase().includes("sales") || (documentCard?.eventType || "").includes("CUSTOMER");
  const defaultNoteType = isSales ? "credit_note" : "debit_note";

  const [noteType, setNoteType] = useState(defaultNoteType);
  const [amount, setAmount] = useState(documentCard?.amount || 0);
  const [reason, setReason] = useState("Sales Return & Goods Rejection");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(false);

  if (!isOpen || !documentCard) return null;

  const noteNumber = noteType === "credit_note" ? `CN-${Math.floor(1000 + Math.random() * 9000)}` : `DN-${Math.floor(1000 + Math.random() * 9000)}`;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) {
      toast.error("Please enter a valid adjustment amount.");
      return;
    }

    setLoading(true);
    try {
      // 1. Generate PDF for the Credit/Debit Note
      const titleText = noteType === "credit_note" ? "CREDIT NOTE" : "DEBIT NOTE";
      const pdfDoc = generateStandardDocumentPDF({
        documentType: titleText,
        docNumber: noteNumber,
        docDate: date,
        dueDate: date,
        senderName: activeWorkbench?.legal_name || activeWorkbench?.name || "Company",
        senderAddress: activeWorkbench?.address || "",
        senderGstin: activeWorkbench?.gstin || "",
        clientName: documentCard.party || "Party",
        clientAddress: "",
        items: [
          {
            sno: 1,
            description: `Adjustment for Ref Doc: #${documentCard.id || documentCard.docNumber || "Invoice"} (${reason})`,
            qty: 1,
            unit: "pcs",
            rate: Number(amount)
          }
        ],
        notes: `Adjustment Note issued against ${documentCard.party}. Reason: ${reason}`,
        terms: "Immediate Adjustment"
      });

      // 2. Upload to Doc Vault & Business Engine
      await saveDocumentToDocVaultAndEngine({
        activeWorkbench,
        docNumber: noteNumber,
        documentType: noteType,
        pdfDoc,
        partyName: documentCard.party,
        totalAmount: Number(amount),
        docDate: date,
        notes: reason
      });

      // 3. Save to generator store
      saveInvoice({
        id: noteNumber,
        invoiceNumber: noteNumber,
        stage: noteType.toUpperCase(),
        date: date,
        partyName: documentCard.party,
        amount: Number(amount),
        status: "Issued",
        refDoc: documentCard.id
      });

      toast.success(`${titleText} ${noteNumber} created and linked to ${documentCard.party}!`);
      window.dispatchEvent(new Event("businessEventsUpdated"));
      window.dispatchEvent(new Event("docVaultUpdated"));
      if (onNoteCreated) onNoteCreated();
      onClose();
    } catch (err) {
      console.error("Error creating adjustment note:", err);
      toast.error("Failed to create note: " + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 font-sans">
      <div className="bg-[#181818] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-fadeIn">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#181818]">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <BsFileEarmarkMinus size={22} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Issue Adjustment Note</h3>
              <p className="text-xs text-gray-400">Linked to <strong className="text-white">{documentCard.party}</strong></p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-white rounded-lg hover:bg-white/10">
            <BsX size={22} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          
          {/* Note Type Selector */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">Note Type</label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-white/5 border border-white/10 rounded-xl">
              <button
                type="button"
                onClick={() => setNoteType("credit_note")}
                className={`py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                  noteType === "credit_note" ? "bg-emerald-500 text-black shadow-md" : "text-gray-400 hover:text-white"
                }`}
              >
                <BsTag size={14} />
                <span>Credit Note (Sales Return)</span>
              </button>
              
              <button
                type="button"
                onClick={() => setNoteType("debit_note")}
                className={`py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                  noteType === "debit_note" ? "bg-blue-600 text-white shadow-md" : "text-gray-400 hover:text-white"
                }`}
              >
                <BsTag size={14} />
                <span>Debit Note (Purchase Claim)</span>
              </button>
            </div>
          </div>

          {/* Amount & Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                Adjustment Amount ({activeWorkbench?.country === 'IN' ? '₹' : '$'})
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full bg-[#222222] border border-white/10 rounded-lg px-3.5 py-2.5 text-sm text-white font-bold focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">Issue Date</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-[#222222] border border-white/10 rounded-lg px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">Adjustment Reason</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-[#222222] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
            >
              <option value="Sales Return & Goods Rejection">Sales Return & Goods Rejection</option>
              <option value="Price Difference & Rebate">Price Difference & Rebate</option>
              <option value="Tax Calculation Correction">Tax Calculation Correction</option>
              <option value="Damage & Defective Material Claim">Damage & Defective Material Claim</option>
              <option value="Post-Sale Commercial Discount">Post-Sale Commercial Discount</option>
            </select>
          </div>

          {/* Footer Actions */}
          <div className="flex justify-end gap-2.5 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg text-xs font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-purple-500 hover:bg-purple-400 text-black font-bold rounded-lg text-xs transition-all shadow-md shadow-purple-500/20 disabled:opacity-50 flex items-center gap-1.5"
            >
              <BsCheckCircleFill size={14} />
              <span>{loading ? "Issuing Note..." : `Issue ${noteType === "credit_note" ? "Credit Note" : "Debit Note"}`}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
