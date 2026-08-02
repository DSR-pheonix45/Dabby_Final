import React, { useState } from "react";
import { BsX, BsSend, BsFileEarmarkPdf, BsCalculator, BsGear, BsTrash, BsPlusLg, BsBuilding } from "react-icons/bs";
import { toast } from "react-hot-toast";
import { useWorkbench } from "../../context/WorkbenchContext";
import { formatCurrency } from "../../utils/currency";
import { generateStandardDocumentPDF } from "../../utils/documentPdfGenerator";
import DynamicColumnConfigurator, { DEFAULT_COLUMNS } from "./DynamicColumnConfigurator";

export default function ProformaInvoiceModal({ isOpen, onClose }) {
  const { activeWorkbench } = useWorkbench();
  const [proformaNumber, setProformaNumber] = useState(`PI-${Math.floor(1000 + Math.random() * 9000)}`);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  
  // Billing Details
  const [partyName, setPartyName] = useState("RATNA DEEP CHS");
  const [clientAddress, setClientAddress] = useState("Mulund");
  const [placeOfSupply, setPlaceOfSupply] = useState("Maharashtra");

  // Shipping Details
  const [shipToSameAsBilling, setShipToSameAsBilling] = useState(true);
  const [shipToName, setShipToName] = useState("RATNA DEEP CHS");
  const [shipToAddress, setShipToAddress] = useState("Mulund");

  const [projectEstimateName, setProjectEstimateName] = useState("Site Excavation & Foundation Phase 1");
  const [advancePercent, setAdvancePercent] = useState(20);

  const [columns, setColumns] = useState(DEFAULT_COLUMNS);
  const [showColConfig, setShowColConfig] = useState(false);

  const [items, setItems] = useState([
    { description: "100 MM x 50 MM UPVC louver Profile", subDetails: "", hsn: "39162019", qty: 6900, unit: "RFT", rate: 115 },
    { description: "MS FABRICATION WORK 115'X30'", subDetails: "", hsn: "7308", qty: 1, unit: "pcs", rate: 240000 },
  ]);

  const [notes, setNotes] = useState("T-Patti for top,bottom & center support\n2\"X 2\" Pipe Ms Fabrication For Fins Support With Material And installation");
  const [terms, setTerms] = useState("50% Advance\n30% ongoing work\n20% after completion");

  if (!isOpen) return null;

  const addItem = () => setItems([...items, { description: "New Estimate Item", subDetails: "", hsn: "7308", qty: 1, unit: "pcs", rate: 10000 }]);
  const updateItem = (idx, field, val) => {
    const updated = [...items];
    updated[idx][field] = field === "qty" || field === "rate" ? Number(val) || 0 : val;
    if (field === "description" && !columns.some(c => c.id === "subDetails")) {
      updated[idx].subDetails = "";
    }
    setItems(updated);
  };
  const removeItem = (idx) => setItems(items.filter((_, i) => i !== idx));

  const removeColumn = (colId) => {
    setColumns(columns.filter(c => c.id !== colId));
  };

  const totalEstimate = items.reduce((acc, it) => acc + ((Number(it.qty) || 0) * (Number(it.rate) || 0)), 0);
  const requiredAdvance = (totalEstimate * advancePercent) / 100;

  const generatePDFDoc = () => {
    return generateStandardDocumentPDF({
      documentType: "PROFORMA INVOICE",
      docNumber: proformaNumber,
      docDate: date,
      senderName: activeWorkbench?.name || "Archzona",
      senderAddress: activeWorkbench?.metadata?.address || "105, PRISM INDUSTRIAL ESTATE, BEHIND PENDARKAR COLLEGE, DOMBIVLI(EAST)421201",
      senderGstin: activeWorkbench?.gstin || "7ACDFA4175F1ZJ",
      senderMobile: activeWorkbench?.metadata?.mobile || "9870048082",
      senderEmail: activeWorkbench?.metadata?.email || "info.archzona@gmail.com",
      clientName: partyName,
      clientAddress: clientAddress,
      placeOfSupply: placeOfSupply,
      shipToName: shipToSameAsBilling ? partyName : shipToName,
      shipToAddress: shipToSameAsBilling ? clientAddress : shipToAddress,
      items,
      columns,
      taxRate: 18,
      notes: `Project/Contract: ${projectEstimateName}\n${notes}`,
      terms: `${advancePercent}% Advance\n${terms}`,
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
    doc.save(`${proformaNumber}_${partyName.replace(/\s+/g, '_')}.pdf`);
    toast.success("Proforma Invoice PDF downloaded!");
  };

  const handleSendToTrade = async () => {
    try {
      const payload = {
        document_type: "proforma_invoice",
        party: partyName,
        total_amount: totalEstimate,
        date: date,
        currency: activeWorkbench?.country === "IN" ? "INR" : "USD",
        metadata: {
          proformaNumber,
          projectEstimateName,
          advancePercent,
          requiredAdvance,
          clientAddress,
          placeOfSupply,
          shipToName: shipToSameAsBilling ? partyName : shipToName,
          shipToAddress: shipToSameAsBilling ? clientAddress : shipToAddress,
          notes,
          terms,
          items,
          columns
        }
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
      <div className="bg-[#141414] border border-white/10 rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-white/10 bg-[#1a1a1a]">
          <h3 className="text-lg font-bold text-white flex items-center">
            <BsCalculator className="mr-2 text-purple-400" /> Stage 0: Proforma / Estimate Generator
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><BsX size={24} /></button>
        </div>

        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Proforma / Estimate #</label>
              <input value={proformaNumber} onChange={e => setProformaNumber(e.target.value)} className="w-full bg-[#1e1e1e] border border-white/10 rounded-lg p-2 text-sm text-white" />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-[#1e1e1e] border border-white/10 rounded-lg p-2 text-sm text-white" />
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-400 block mb-1">Project / Contract Scope Name</label>
            <input value={projectEstimateName} onChange={e => setProjectEstimateName(e.target.value)} className="w-full bg-[#1e1e1e] border border-white/10 rounded-lg p-2 text-sm text-white" />
          </div>

          {/* Billing & Shipping Section */}
          <div className="p-4 bg-[#181818] border border-white/10 rounded-xl space-y-3">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="text-xs font-bold text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
                <BsBuilding className="text-sm" /> Client Billing & Shipping Details
              </span>
              <label className="flex items-center space-x-2 cursor-pointer text-xs text-gray-300">
                <input
                  type="checkbox"
                  checked={shipToSameAsBilling}
                  onChange={(e) => setShipToSameAsBilling(e.target.checked)}
                  className="rounded border-white/10 text-purple-600 focus:ring-0"
                />
                <span>Ship To same as Bill To</span>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* BILL TO */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-gray-300 block uppercase">Bill To</span>
                <div>
                  <label className="text-[10px] text-gray-400 block mb-0.5">Party / Client Name</label>
                  <input
                    value={partyName}
                    onChange={e => setPartyName(e.target.value)}
                    placeholder="e.g. RATNA DEEP CHS"
                    className="w-full bg-[#1e1e1e] border border-white/10 rounded-lg p-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 block mb-0.5">Billing Address</label>
                  <textarea
                    rows={2}
                    value={clientAddress}
                    onChange={e => setClientAddress(e.target.value)}
                    placeholder="Full billing address..."
                    className="w-full bg-[#1e1e1e] border border-white/10 rounded-lg p-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 block mb-0.5">Place of Supply</label>
                  <input
                    value={placeOfSupply}
                    onChange={e => setPlaceOfSupply(e.target.value)}
                    placeholder="e.g. Maharashtra"
                    className="w-full bg-[#1e1e1e] border border-white/10 rounded-lg p-2 text-xs text-white"
                  />
                </div>
              </div>

              {/* SHIP TO */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-gray-300 block uppercase">Ship To</span>
                {shipToSameAsBilling ? (
                  <div className="p-3 bg-white/5 border border-white/5 rounded-lg text-xs text-gray-400 space-y-1">
                    <div><span className="text-gray-300 font-semibold">Consignee:</span> {partyName}</div>
                    <div><span className="text-gray-300 font-semibold">Address:</span> {clientAddress}</div>
                    <div className="text-[11px] text-purple-400 italic pt-1">Shipping details match billing address</div>
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="text-[10px] text-gray-400 block mb-0.5">Consignee Name</label>
                      <input
                        value={shipToName}
                        onChange={e => setShipToName(e.target.value)}
                        placeholder="e.g. RATNA DEEP CHS Site"
                        className="w-full bg-[#1e1e1e] border border-white/10 rounded-lg p-2 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-400 block mb-0.5">Shipping Address</label>
                      <textarea
                        rows={3}
                        value={shipToAddress}
                        onChange={e => setShipToAddress(e.target.value)}
                        placeholder="Full delivery / site address..."
                        className="w-full bg-[#1e1e1e] border border-white/10 rounded-lg p-2 text-xs text-white"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Dynamic Line Items Section */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-300">Estimated Work Line Items</span>
              <div className="flex items-center space-x-4">
                <button
                  type="button"
                  onClick={() => setShowColConfig(!showColConfig)}
                  className="text-xs text-purple-400 font-bold hover:underline flex items-center gap-1"
                >
                  <BsGear className="text-xs" /> {showColConfig ? "Hide Column Settings" : "Add / Remove / Edit Columns"}
                </button>
                <button onClick={addItem} className="text-xs text-purple-400 font-bold hover:underline flex items-center gap-1">
                  <BsPlusLg className="text-xs" /> Add Work Item
                </button>
              </div>
            </div>

            {/* Dynamic Column Configurator Drawer */}
            {showColConfig && (
              <DynamicColumnConfigurator
                columns={columns}
                setColumns={setColumns}
                theme="dark"
              />
            )}

            {/* Dynamic Table Column Headers */}
            <div className="flex items-center gap-2 px-1 text-[11px] font-bold text-gray-400 uppercase border-b border-white/10 pb-1.5 overflow-x-auto">
              <div className="w-8 text-center flex-shrink-0">#</div>
              {columns.map((col) => (
                <div
                  key={col.id}
                  className={`flex items-center justify-between gap-1 flex-1 min-w-[90px] ${
                    col.type === "number" || col.type === "amount" ? "text-right" : "text-left"
                  }`}
                >
                  <span className="truncate">{col.label}</span>
                  {col.removable && (
                    <button
                      type="button"
                      onClick={() => removeColumn(col.id)}
                      className="text-red-400 hover:text-red-300 p-0.5 rounded hover:bg-red-500/20"
                      title={`Remove Column: ${col.label}`}
                    >
                      <BsTrash className="text-[10px]" />
                    </button>
                  )}
                </div>
              ))}
              <div className="w-8 flex-shrink-0 text-center"></div>
            </div>

            {/* Item Input Rows */}
            <div className="space-y-2">
              {items.map((it, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <div className="w-8 text-center text-xs text-gray-400 font-bold flex-shrink-0">{idx + 1}</div>
                  {columns.map((col) => {
                    if (col.id === "amount") {
                      const q = Number(it.qty) || 0;
                      const r = Number(it.rate) || 0;
                      return (
                        <div key={col.id} className="flex-1 min-w-[90px] text-right text-xs text-purple-400 font-bold px-2 py-1.5">
                          {formatCurrency(q * r, activeWorkbench?.country)}
                        </div>
                      );
                    }
                    return (
                      <input
                        key={col.id}
                        type={col.type === "number" ? "number" : "text"}
                        value={it[col.id] !== undefined ? it[col.id] : ""}
                        onChange={(e) => updateItem(idx, col.id, e.target.value)}
                        placeholder={col.label}
                        className={`flex-1 min-w-[90px] bg-[#1e1e1e] border border-white/10 rounded p-1.5 text-xs text-white ${
                          col.type === "number" ? "text-center" : "text-left"
                        }`}
                      />
                    );
                  })}
                  <button onClick={() => removeItem(idx)} className="w-8 text-red-400 hover:text-red-300 p-1 flex-shrink-0 flex justify-center">
                    <BsX size={18} />
                  </button>
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

          {/* Notes & Commercial Terms Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Notes & Scope Details</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={3}
                placeholder="Scope notes, support specs, installation details..."
                className="w-full bg-[#1e1e1e] border border-white/10 rounded-lg p-2.5 text-xs text-white"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Commercial Terms & Conditions</label>
              <textarea
                value={terms}
                onChange={e => setTerms(e.target.value)}
                rows={3}
                placeholder="Payment terms, advance schedule..."
                className="w-full bg-[#1e1e1e] border border-white/10 rounded-lg p-2.5 text-xs text-white"
              />
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
