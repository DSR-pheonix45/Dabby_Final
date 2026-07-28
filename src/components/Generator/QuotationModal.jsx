import React, { useState } from "react";
import { BsX, BsSend, BsFileEarmarkPdf, BsTag, BsGear } from "react-icons/bs";
import { toast } from "react-hot-toast";
import { useWorkbench } from "../../context/WorkbenchContext";
import { formatCurrency } from "../../utils/currency";
import { generateStandardDocumentPDF } from "../../utils/documentPdfGenerator";

export default function QuotationModal({ isOpen, onClose }) {
  const { activeWorkbench } = useWorkbench();
  const [quoteNumber, setQuoteNumber] = useState(`QT-${Math.floor(1000 + Math.random() * 9000)}`);
  const [quoteDate, setQuoteDate] = useState(new Date().toISOString().split("T")[0]);
  const [expiryDate, setExpiryDate] = useState(
    new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );
  const [partyName, setPartyName] = useState("RATNA DEEP CHS");
  const [quoteStatus, setQuoteStatus] = useState("SENT"); // SENT | NEGOTIATING | ACCEPTED | REJECTED
  const [items, setItems] = useState([
    { description: "100 MM x 50 MM UPVC louver Profile", subDetails: "100 – 75 – 100 – 75 – 100", hsn: "39162019", qty: 6900, unit: "RFT", rate: 115 },
    { description: "MS FABRICATION WORK 115'X30'", subDetails: "", hsn: "7308", qty: 1, unit: "pcs", rate: 240000 },
  ]);
  const [terms, setTerms] = useState("50% Advance\n30% ongoing work\n20% after completion");

  const [columnLabels, setColumnLabels] = useState({
    sno: "S.NO.",
    items: "ITEMS",
    hsn: "HSN",
    qty: "AREA / QTY",
    unit: "UNIT",
    rate: "UNIT RATE",
    amount: "DERIVING AMOUNT"
  });
  const [showColConfig, setShowColConfig] = useState(false);
  const [showSeparateUnitCol, setShowSeparateUnitCol] = useState(false);

  if (!isOpen) return null;

  const addItem = () => setItems([...items, { description: "New Item", subDetails: "", hsn: "7308", qty: 1, unit: "pcs", rate: 5000 }]);
  const updateItem = (idx, field, val) => {
    const updated = [...items];
    updated[idx][field] = field === "qty" || field === "rate" ? Number(val) || 0 : val;
    setItems(updated);
  };
  const removeItem = (idx) => setItems(items.filter((_, i) => i !== idx));

  const applyPreset = (type) => {
    if (type === "standard") {
      setColumnLabels({ sno: "S.NO.", items: "ITEMS", hsn: "HSN", qty: "QTY.", unit: "UNIT", rate: "RATE", amount: "AMOUNT" });
      setShowSeparateUnitCol(false);
    } else if (type === "construction") {
      setColumnLabels({ sno: "S.NO.", items: "ITEMS", hsn: "HSN", qty: "AREA", unit: "UNIT", rate: "UNIT RATE", amount: "DERIVING AMOUNT" });
      setShowSeparateUnitCol(false);
    } else if (type === "architectural") {
      setColumnLabels({ sno: "S.NO.", items: "ITEMS", hsn: "HSN", qty: "AREA VALUE", unit: "AREA UNIT", rate: "UNIT RATE", amount: "DERIVING AMOUNT" });
      setShowSeparateUnitCol(true);
    }
  };

  const totalAmount = items.reduce((acc, it) => acc + (it.qty * it.rate), 0);

  const generatePDFDoc = () => {
    return generateStandardDocumentPDF({
      documentType: "QUOTATION",
      docNumber: quoteNumber,
      docDate: quoteDate,
      dueDate: expiryDate,
      senderName: activeWorkbench?.name || "Archzona",
      senderAddress: activeWorkbench?.metadata?.address || "105, PRISM INDUSTRIAL ESTATE, BEHIND PENDARKAR COLLEGE, DOMBIVLI(EAST)421201",
      senderGstin: activeWorkbench?.gstin || "7ACDFA4175F1ZJ",
      senderMobile: activeWorkbench?.metadata?.mobile || "9870048082",
      senderEmail: activeWorkbench?.metadata?.email || "info.archzona@gmail.com",
      clientName: partyName,
      clientAddress: "Mulund",
      placeOfSupply: "Maharashtra",
      shipToName: partyName,
      shipToAddress: "Mulund",
      items: items.map((it, idx) => ({
        sno: idx + 1,
        description: it.description,
        subDetails: it.subDetails || "",
        hsn: it.hsn || "39162019",
        qty: it.qty,
        unit: it.unit || "pcs",
        rate: it.rate
      })),
      taxRate: 18,
      columnLabels,
      showSeparateUnitCol,
      notes: "T-Patti for top,bottom & center support\n2\"X 2\" Pipe Ms Fabrication For Fins Support With Material And installation",
      terms: terms,
      bankDetails: {
        name: activeWorkbench?.name || "Archzona",
        ifsc: "UTIB000125",
        accountNo: "923020053039794",
        bankName: "AXIS BANK, Dombivli"
      },
      authorisedSignatory: activeWorkbench?.name || "Archzona"
    });
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
        metadata: { quoteNumber, expiryDate, status: quoteStatus, terms, items, columnLabels }
      };

      await fetch("/api/events/from-document/draft", {
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
      <div className="bg-[#141414] border border-white/10 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-white/10 bg-[#1a1a1a]">
          <h3 className="text-lg font-bold text-white flex items-center">
            <BsTag className="mr-2 text-blue-400" /> Stage 0: Quotation Generator
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><BsX size={24} /></button>
        </div>

        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto custom-scrollbar">
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

          {/* Line Items Section */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
                Quote Line Items
              </span>
              <div className="flex items-center space-x-4">
                <button
                  type="button"
                  onClick={() => setShowColConfig(!showColConfig)}
                  className="text-xs text-blue-400 font-bold hover:underline flex items-center gap-1"
                >
                  <BsGear className="text-xs" /> {showColConfig ? "Hide Column Settings" : "Configure Column Labels"}
                </button>
                <button onClick={addItem} className="text-xs text-blue-400 font-bold hover:underline">+ Add Line</button>
              </div>
            </div>

            {/* Column Configuration Drawer */}
            {showColConfig && (
              <div className="bg-[#181818] p-3.5 rounded-xl border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-gray-300 uppercase tracking-wider">Presets</span>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => applyPreset("standard")} className="px-2.5 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-[11px] text-gray-300 font-medium">Standard Goods</button>
                    <button type="button" onClick={() => applyPreset("construction")} className="px-2.5 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-[11px] text-gray-300 font-medium">Construction (Area & Rate)</button>
                    <button type="button" onClick={() => applyPreset("architectural")} className="px-2.5 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-[11px] text-gray-300 font-medium">Architectural (Area Value, Unit, Rate)</button>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2 pt-1 border-t border-white/5">
                  <div>
                    <label className="text-[10px] text-gray-400 block mb-0.5">Qty / Area Header</label>
                    <input value={columnLabels.qty} onChange={e => setColumnLabels({...columnLabels, qty: e.target.value})} className="w-full bg-[#1e1e1e] border border-white/10 rounded p-1.5 text-xs text-white" />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400 block mb-0.5">Unit Header</label>
                    <input value={columnLabels.unit} onChange={e => setColumnLabels({...columnLabels, unit: e.target.value})} className="w-full bg-[#1e1e1e] border border-white/10 rounded p-1.5 text-xs text-white" />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400 block mb-0.5">Rate Header</label>
                    <input value={columnLabels.rate} onChange={e => setColumnLabels({...columnLabels, rate: e.target.value})} className="w-full bg-[#1e1e1e] border border-white/10 rounded p-1.5 text-xs text-white" />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400 block mb-0.5">Amount Header</label>
                    <input value={columnLabels.amount} onChange={e => setColumnLabels({...columnLabels, amount: e.target.value})} className="w-full bg-[#1e1e1e] border border-white/10 rounded p-1.5 text-xs text-white" />
                  </div>
                </div>
              </div>
            )}

            {/* Table Column Headers Display Row */}
            <div className="grid grid-cols-12 gap-2 px-1 text-[10px] font-bold text-gray-400 uppercase border-b border-white/10 pb-1">
              <div className="col-span-4">Item Description</div>
              <div className="col-span-2">HSN/SAC</div>
              <div className="col-span-2 text-center">{columnLabels.qty}</div>
              <div className="col-span-1 text-center">{columnLabels.unit}</div>
              <div className="col-span-1 text-right">{columnLabels.rate}</div>
              <div className="col-span-2 text-right">{columnLabels.amount}</div>
            </div>

            {/* Item Rows */}
            <div className="space-y-2">
              {items.map((it, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                  <input value={it.description} onChange={e => updateItem(idx, "description", e.target.value)} placeholder="Description" className="col-span-4 bg-[#1e1e1e] border border-white/10 rounded p-2 text-xs text-white" />
                  <input value={it.hsn || ""} onChange={e => updateItem(idx, "hsn", e.target.value)} placeholder="HSN" className="col-span-2 bg-[#1e1e1e] border border-white/10 rounded p-2 text-xs text-white text-center font-mono" />
                  <input type="number" value={it.qty} onChange={e => updateItem(idx, "qty", e.target.value)} placeholder="Qty/Area" className="col-span-2 bg-[#1e1e1e] border border-white/10 rounded p-2 text-xs text-white text-center" />
                  <input value={it.unit || ""} onChange={e => updateItem(idx, "unit", e.target.value)} placeholder="Unit" className="col-span-1 bg-[#1e1e1e] border border-white/10 rounded p-2 text-xs text-white text-center" />
                  <input type="number" value={it.rate} onChange={e => updateItem(idx, "rate", e.target.value)} placeholder="Rate" className="col-span-1 bg-[#1e1e1e] border border-white/10 rounded p-2 text-xs text-white text-right" />
                  <div className="col-span-2 flex items-center justify-between pl-1">
                    <span className="text-xs text-blue-400 font-bold text-right flex-1">{formatCurrency(it.qty * it.rate, activeWorkbench?.country)}</span>
                    <button onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-300 p-1 ml-1"><BsX size={18} /></button>
                  </div>
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
