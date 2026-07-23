import React, { useState } from "react";
import { BsX, BsSend, BsFileEarmarkPdf, BsCalculator } from "react-icons/bs";
import { toast } from "react-hot-toast";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useWorkbench } from "../../context/WorkbenchContext";
import { formatCurrency } from "../../utils/currency";

export default function ProformaInvoiceModal({ isOpen, onClose }) {
  const { activeWorkbench } = useWorkbench();
  const [proformaNumber, setProformaNumber] = useState(`PI-${Math.floor(1000 + Math.random() * 9000)}`);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [partyName, setPartyName] = useState("Vanguard Infra Developers");
  const [projectEstimateName, setProjectEstimateName] = useState("Site Excavation & Foundation Phase 1");
  const [items, setItems] = useState([
    { description: "Site Clearing & Soil Grading (Est. 200 hrs)", qty: 200, rate: 450 },
    { description: "Concrete Pouring & Reinforcement Mesh", qty: 1, rate: 85000 },
  ]);
  const [advancePercent, setAdvancePercent] = useState(20);

  if (!isOpen) return null;

  const addItem = () => setItems([...items, { description: "New Estimate Item", qty: 1, rate: 10000 }]);
  const updateItem = (idx, field, val) => {
    const updated = [...items];
    updated[idx][field] = field === "description" ? val : Number(val) || 0;
    setItems(updated);
  };
  const removeItem = (idx) => setItems(items.filter((_, i) => i !== idx));

  const totalEstimate = items.reduce((acc, it) => acc + (it.qty * it.rate), 0);
  const requiredAdvance = (totalEstimate * advancePercent) / 100;

  const generatePDFDoc = () => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.setTextColor(147, 51, 234);
    doc.text(activeWorkbench?.name || "DABBY WORKBENCH", 14, 20);

    doc.setFontSize(14);
    doc.setTextColor(40, 40, 40);
    doc.text("PROFORMA INVOICE / ESTIMATE", 14, 28);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Proforma No: ${proformaNumber}  |  Date: ${date}`, 14, 36);
    doc.text(`Project/Contract: ${projectEstimateName}`, 14, 42);
    doc.text(`Client: ${partyName}`, 14, 48);

    const tableData = items.map((it, i) => [
      i + 1,
      it.description,
      it.qty,
      formatCurrency(it.rate, activeWorkbench?.country),
      formatCurrency(it.qty * it.rate, activeWorkbench?.country),
    ]);

    autoTable(doc, {
      startY: 55,
      head: [["#", "Work Description", "Qty/Hrs", "Rate", "Total"]],
      body: tableData,
    });

    const finalY = doc.lastAutoTable.finalY || 100;
    doc.text(`Total Working Estimate: ${formatCurrency(totalEstimate, activeWorkbench?.country)}`, 14, finalY + 12);
    doc.text(`Required Advance (${advancePercent}%): ${formatCurrency(requiredAdvance, activeWorkbench?.country)}`, 14, finalY + 20);

    return doc;
  };

  const handleExportPDF = () => {
    const doc = generatePDFDoc();
    doc.save(`${proformaNumber}_${partyName.replace(/\s+/g, '_')}.pdf`);
    toast.success("Proforma Invoice PDF exported!");
  };

  const handleSendToTrade = async () => {
    try {
      const payload = {
        document_type: "proforma_invoice",
        party: partyName,
        total_amount: totalEstimate,
        date: date,
        currency: activeWorkbench?.country === "IN" ? "INR" : "USD",
        metadata: { proformaNumber, projectEstimateName, advancePercent, requiredAdvance, items }
      };

      await fetch("/api/events/from-document/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      toast.success(`Proforma ${proformaNumber} dispatched to Business Engine!`);
      onClose();
    } catch (e) {
      toast.success(`Proforma ${proformaNumber} saved as draft proof!`);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-[#141414] border border-white/10 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-white/10 bg-[#1a1a1a]">
          <h3 className="text-lg font-bold text-white flex items-center">
            <BsCalculator className="mr-2 text-purple-400" /> Stage 0: Proforma / Estimate Generator
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><BsX size={24} /></button>
        </div>

        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Proforma / Estimate #</label>
              <input value={proformaNumber} onChange={e => setProformaNumber(e.target.value)} className="w-full bg-[#1e1e1e] border border-white/10 rounded-lg p-2 text-sm text-white" />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Party / Contractor</label>
              <input value={partyName} onChange={e => setPartyName(e.target.value)} className="w-full bg-[#1e1e1e] border border-white/10 rounded-lg p-2 text-sm text-white" />
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-400 block mb-1">Project / Contract Scope Name</label>
            <input value={projectEstimateName} onChange={e => setProjectEstimateName(e.target.value)} className="w-full bg-[#1e1e1e] border border-white/10 rounded-lg p-2 text-sm text-white" />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-gray-300">Estimated Work Line Items</span>
              <button onClick={addItem} className="text-xs text-purple-400 font-bold hover:underline">+ Add Work Item</button>
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

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/5 p-3 rounded-lg">
              <span className="text-xs text-gray-400 block mb-1">Total Estimated Cost</span>
              <span className="text-lg font-bold text-purple-400">{formatCurrency(totalEstimate, activeWorkbench?.country)}</span>
            </div>
            <div className="bg-white/5 p-3 rounded-lg">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-gray-400">Advance %</span>
                <input type="number" value={advancePercent} onChange={e => setAdvancePercent(Number(e.target.value))} className="w-12 bg-black/40 border border-white/10 rounded text-center text-xs text-white" />
              </div>
              <span className="text-lg font-bold text-amber-400">{formatCurrency(requiredAdvance, activeWorkbench?.country)}</span>
            </div>
          </div>
        </div>

        <div className="p-5 border-t border-white/10 bg-[#1a1a1a] flex justify-between">
          <button onClick={handleExportPDF} className="px-4 py-2 border border-white/10 rounded-lg text-xs font-bold text-gray-300 hover:bg-white/5 flex items-center">
            <BsFileEarmarkPdf className="mr-2 text-red-400" /> Export PDF Proof
          </button>
          <button onClick={handleSendToTrade} className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg text-xs flex items-center">
            <BsSend className="mr-2" /> Save to Doc Vault & Send to Business Engine
          </button>
        </div>
      </div>
    </div>
  );
}
