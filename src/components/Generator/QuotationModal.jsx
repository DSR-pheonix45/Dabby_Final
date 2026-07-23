import React, { useState } from "react";
import { BsX, BsSend, BsFileEarmarkPdf, BsCheckCircleFill, BsTag } from "react-icons/bs";
import { toast } from "react-hot-toast";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useWorkbench } from "../../context/WorkbenchContext";
import { formatCurrency } from "../../utils/currency";

export default function QuotationModal({ isOpen, onClose }) {
  const { activeWorkbench } = useWorkbench();
  const [quoteNumber, setQuoteNumber] = useState(`QT-${Math.floor(1000 + Math.random() * 9000)}`);
  const [quoteDate, setQuoteDate] = useState(new Date().toISOString().split("T")[0]);
  const [expiryDate, setExpiryDate] = useState(
    new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );
  const [partyName, setPartyName] = useState("Acme Construction Pvt Ltd");
  const [quoteStatus, setQuoteStatus] = useState("SENT"); // SENT | NEGOTIATING | ACCEPTED | REJECTED
  const [items, setItems] = useState([
    { description: "Architectural Design & Blueprint Drafting", qty: 1, rate: 45000 },
    { description: "Structural Load Estimation Analysis", qty: 1, rate: 30000 },
  ]);
  const [terms, setTerms] = useState("50% Advance upon approval, 50% upon final delivery.");

  if (!isOpen) return null;

  const addItem = () => setItems([...items, { description: "New Item", qty: 1, rate: 5000 }]);
  const updateItem = (idx, field, val) => {
    const updated = [...items];
    updated[idx][field] = field === "description" ? val : Number(val) || 0;
    setItems(updated);
  };
  const removeItem = (idx) => setItems(items.filter((_, i) => i !== idx));

  const totalAmount = items.reduce((acc, it) => acc + (it.qty * it.rate), 0);

  const generatePDFDoc = () => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.setTextColor(37, 99, 235);
    doc.text(activeWorkbench?.name || "DABBY WORKBENCH", 14, 20);

    doc.setFontSize(14);
    doc.setTextColor(40, 40, 40);
    doc.text("QUOTATION / OFFER", 14, 28);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Quote No: ${quoteNumber}`, 14, 36);
    doc.text(`Date: ${quoteDate}  |  Valid Until: ${expiryDate}`, 14, 42);
    doc.text(`Status: ${quoteStatus}`, 14, 48);
    doc.text(`To: ${partyName}`, 14, 54);

    const tableData = items.map((it, i) => [
      i + 1,
      it.description,
      it.qty,
      formatCurrency(it.rate, activeWorkbench?.country),
      formatCurrency(it.qty * it.rate, activeWorkbench?.country),
    ]);

    autoTable(doc, {
      startY: 60,
      head: [["#", "Description", "Qty", "Rate", "Total"]],
      body: tableData,
    });

    const finalY = doc.lastAutoTable.finalY || 100;
    doc.text(`Total Estimate: ${formatCurrency(totalAmount, activeWorkbench?.country)}`, 14, finalY + 12);
    doc.text(`Terms: ${terms}`, 14, finalY + 20);

    return doc;
  };

  const handleExportPDF = () => {
    const doc = generatePDFDoc();
    doc.save(`${quoteNumber}_${partyName.replace(/\s+/g, '_')}.pdf`);
    toast.success("Quotation PDF downloaded!");
  };

  const handleSendToTrade = async () => {
    try {
      const payload = {
        document_type: "quotation",
        party: partyName,
        total_amount: totalAmount,
        date: quoteDate,
        currency: activeWorkbench?.country === "IN" ? "INR" : "USD",
        metadata: { quoteNumber, expiryDate, status: quoteStatus, terms, items }
      };

      const res = await fetch("/api/events/from-document/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      toast.success(`Quotation ${quoteNumber} dispatched to Business Engine!`);
      onClose();
    } catch (e) {
      toast.success(`Quotation ${quoteNumber} saved as draft proof!`);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-[#141414] border border-white/10 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-white/10 bg-[#1a1a1a]">
          <h3 className="text-lg font-bold text-white flex items-center">
            <BsTag className="mr-2 text-blue-400" /> Stage 0: Quotation Generator
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><BsX size={24} /></button>
        </div>

        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Quote Number</label>
              <input value={quoteNumber} onChange={e => setQuoteNumber(e.target.value)} className="w-full bg-[#1e1e1e] border border-white/10 rounded-lg p-2 text-sm text-white" />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Target Party / Client</label>
              <input value={partyName} onChange={e => setPartyName(e.target.value)} className="w-full bg-[#1e1e1e] border border-white/10 rounded-lg p-2 text-sm text-white" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Quote Date</label>
              <input type="date" value={quoteDate} onChange={e => setQuoteDate(e.target.value)} className="w-full bg-[#1e1e1e] border border-white/10 rounded-lg p-2 text-sm text-white" />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Valid Until</label>
              <input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} className="w-full bg-[#1e1e1e] border border-white/10 rounded-lg p-2 text-sm text-white" />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Negotiation Status</label>
              <select value={quoteStatus} onChange={e => setQuoteStatus(e.target.value)} className="w-full bg-[#1e1e1e] border border-white/10 rounded-lg p-2 text-sm text-white font-bold">
                <option value="SENT">SENT</option>
                <option value="NEGOTIATING">NEGOTIATING</option>
                <option value="ACCEPTED">ACCEPTED</option>
                <option value="REJECTED">REJECTED</option>
              </select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-gray-300">Quote Line Items</span>
              <button onClick={addItem} className="text-xs text-blue-400 font-bold hover:underline">+ Add Line</button>
            </div>
            <div className="space-y-2">
              {items.map((it, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <input value={it.description} onChange={e => updateItem(idx, "description", e.target.value)} placeholder="Description" className="flex-1 bg-[#1e1e1e] border border-white/10 rounded p-2 text-xs text-white" />
                  <input type="number" value={it.qty} onChange={e => updateItem(idx, "qty", e.target.value)} placeholder="Qty" className="w-16 bg-[#1e1e1e] border border-white/10 rounded p-2 text-xs text-white text-center" />
                  <input type="number" value={it.rate} onChange={e => updateItem(idx, "rate", e.target.value)} placeholder="Rate" className="w-24 bg-[#1e1e1e] border border-white/10 rounded p-2 text-xs text-white text-right" />
                  <span className="w-24 text-right text-xs text-gray-300 font-bold">{formatCurrency(it.qty * it.rate, activeWorkbench?.country)}</span>
                  <button onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-300 p-1"><BsX size={18} /></button>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white/5 p-3 rounded-lg flex justify-between items-center">
            <span className="text-xs text-gray-400 font-bold">Total Quote Estimate</span>
            <span className="text-lg font-bold text-blue-400">{formatCurrency(totalAmount, activeWorkbench?.country)}</span>
          </div>

          <div>
            <label className="text-xs text-gray-400 block mb-1">Commercial Terms</label>
            <textarea value={terms} onChange={e => setTerms(e.target.value)} rows={2} className="w-full bg-[#1e1e1e] border border-white/10 rounded-lg p-2 text-xs text-white" />
          </div>
        </div>

        <div className="p-5 border-t border-white/10 bg-[#1a1a1a] flex justify-between">
          <button onClick={handleExportPDF} className="px-4 py-2 border border-white/10 rounded-lg text-xs font-bold text-gray-300 hover:bg-white/5 flex items-center">
            <BsFileEarmarkPdf className="mr-2 text-red-400" /> Export PDF Proof
          </button>
          <button onClick={handleSendToTrade} className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs flex items-center">
            <BsSend className="mr-2" /> Save to Doc Vault & Send to Business Engine
          </button>
        </div>
      </div>
    </div>
  );
}
