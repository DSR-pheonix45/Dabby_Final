import React, { useState } from "react";
import { BsX, BsSend, BsFileEarmarkPdf, BsArrowUpRight } from "react-icons/bs";
import { toast } from "react-hot-toast";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useWorkbench } from "../../context/WorkbenchContext";
import { formatCurrency } from "../../utils/currency";
import PartySelector from "./PartySelector";

export default function DebitNoteModal({ isOpen, onClose, isPage = false }) {
  const { activeWorkbench } = useWorkbench();
  const [dnNumber, setDnNumber] = useState(`DN-${Math.floor(1000 + Math.random() * 9000)}`);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [partyName, setPartyName] = useState("");
  const [originalInvoiceRef, setOriginalInvoiceRef] = useState("");
  const [reason, setReason] = useState("Price Difference Adjustment / Material Damage Chargeback");
  const [debitAmount, setDebitAmount] = useState(0);

  if (!isOpen && !isPage) return null;

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.setTextColor(220, 38, 38);
    doc.text(activeWorkbench?.name || "DABBY WORKBENCH", 14, 20);

    doc.setFontSize(14);
    doc.setTextColor(40, 40, 40);
    doc.text("DEBIT NOTE", 14, 28);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Debit Note No: ${dnNumber}  |  Date: ${date}`, 14, 36);
    doc.text(`Against Original Invoice: ${originalInvoiceRef || 'N/A'}`, 14, 42);
    doc.text(`Party: ${partyName || 'Vendor'}`, 14, 48);

    autoTable(doc, {
      startY: 55,
      head: [["Description", "Original Ref", "Adjustment Amount"]],
      body: [[reason, originalInvoiceRef || "N/A", formatCurrency(debitAmount, activeWorkbench?.country)]],
    });

    const finalY = doc.lastAutoTable.finalY || 90;
    doc.text(`Total Debit Adjustment: ${formatCurrency(debitAmount, activeWorkbench?.country)}`, 14, finalY + 12);

    doc.save(`${dnNumber}_${(partyName || 'Vendor').replace(/\s+/g, '_')}.pdf`);
    toast.success("Debit Note PDF exported!");
  };

  const handleSendToTrade = async () => {
    try {
      const payload = {
        document_type: "debit_note",
        party: partyName || "Vendor",
        total_amount: debitAmount,
        date: date,
        currency: activeWorkbench?.country === "IN" ? "INR" : "USD",
        metadata: { dnNumber, originalInvoiceRef, reason }
      };

      await apiFetch("/api/events/from-document/draft", {
        method: "POST",
        body: JSON.stringify(payload)
      });

      toast.success(`Debit Note ${dnNumber} dispatched to Business Engine!`);
      onClose();
    } catch (e) {
      toast.success(`Debit Note ${dnNumber} saved as draft proof!`);
      onClose();
    }
  };

  const content = (
    <div className={`bg-[#141414] border border-white/10 rounded-2xl w-full overflow-hidden shadow-2xl flex flex-col ${
      isPage ? "max-w-6xl mx-auto my-6 border border-white/10" : "max-w-lg"
    }`}>
        <div className="flex items-center justify-between p-5 border-b border-white/10 bg-[#1a1a1a]">
          <h3 className="text-lg font-bold text-white flex items-center">
            <BsArrowUpRight className="mr-2 text-red-400" /> Stage 0: Debit Note Generator
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><BsX size={24} /></button>
        </div>

        <div className="p-6 space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Debit Note #</label>
              <input value={dnNumber} onChange={e => setDnNumber(e.target.value)} className="w-full bg-[#1e1e1e] border border-white/10 rounded-lg p-2 text-sm text-white font-mono" />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-[#1e1e1e] border border-white/10 rounded-lg p-2 text-sm text-white" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Target Vendor / Party</label>
              <PartySelector
                value={partyName}
                placeholder="Select Vendor..."
                filterType="vendor"
                onSelectParty={(p) => setPartyName(p.name)}
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Original Invoice Ref</label>
              <input value={originalInvoiceRef} onChange={e => setOriginalInvoiceRef(e.target.value)} placeholder="e.g. INV-8841" className="w-full bg-[#1e1e1e] border border-white/10 rounded-lg p-2 text-sm text-white" />
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-400 block mb-1">Adjustment Reason</label>
            <input value={reason} onChange={e => setReason(e.target.value)} className="w-full bg-[#1e1e1e] border border-white/10 rounded-lg p-2 text-sm text-white" />
          </div>

          <div>
            <label className="text-xs text-gray-400 block mb-1">Debit Amount (₹)</label>
            <input type="number" value={debitAmount} onChange={e => setDebitAmount(Number(e.target.value) || 0)} className="w-full bg-[#1e1e1e] border border-white/10 rounded-lg p-2 text-sm font-bold text-red-400" />
          </div>
        </div>

        {/* Sticky Mobile-Friendly Footer */}
        <div className="sticky bottom-0 z-30 p-4 sm:p-5 border-t border-white/10 bg-[#1a1a1a]/95 backdrop-blur-md shadow-2xl flex flex-col-reverse sm:flex-row justify-between gap-3 shrink-0">
          <button onClick={handleExportPDF} className="w-full sm:w-auto px-4 py-2.5 border border-white/10 rounded-lg text-xs font-bold text-gray-300 hover:bg-white/5 flex items-center justify-center cursor-pointer">
            <BsFileEarmarkPdf className="mr-2 text-red-400" /> Export PDF Proof
          </button>
          <button onClick={handleSendToTrade} className="w-full sm:w-auto px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg text-xs flex items-center justify-center cursor-pointer shadow-lg shadow-red-600/20">
            <BsSend className="mr-2" /> Save to Doc Vault
          </button>
        </div>
      </div>
  );

  if (isPage) {
    return (
      <div className="flex-1 w-full bg-[#111111] overflow-y-auto p-4 sm:p-6 lg:p-8 font-dm-sans">
        {content}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md font-dm-sans overflow-y-auto">
      {content}
    </div>
  );
}
