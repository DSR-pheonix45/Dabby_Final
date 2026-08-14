import React, { useState } from "react";
import { BsX, BsSend, BsFileEarmarkPdf, BsTag, BsGear, BsTrash, BsPlusLg, BsBuilding } from "react-icons/bs";
import { toast } from "react-hot-toast";
import { useWorkbench } from "../../context/WorkbenchContext";
import { formatCurrency } from "../../utils/currency";
import { generateStandardDocumentPDF } from "../../utils/documentPdfGenerator";
import { getWorkbenchCompanyDetails } from "../../utils/workbenchCompanyHelper";
import { saveDocumentToDocVaultAndEngine } from "../../utils/docVaultExporter";
import DynamicColumnConfigurator, { DEFAULT_COLUMNS } from "./DynamicColumnConfigurator";
import PartySelector from "./PartySelector";
import DocumentBrandingToolbar from "./DocumentBrandingToolbar";

export default function QuotationModal({ isOpen, onClose, isPage = false }) {
  const { activeWorkbench } = useWorkbench();
  const company = getWorkbenchCompanyDetails(activeWorkbench);

  const [isSavingDoc, setIsSavingDoc] = useState(false);
  const [quoteNumber, setQuoteNumber] = useState(`QT-${Math.floor(1000 + Math.random() * 9000)}`);
  const [quoteDate, setQuoteDate] = useState(new Date().toISOString().split("T")[0]);
  const [expiryDate, setExpiryDate] = useState(
    new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );
  
  // Branding & Template State
  const [templateStyle, setTemplateStyle] = useState("modern");
  const [logo, setLogo] = useState(company.logo || null);
  const [letterhead, setLetterhead] = useState(null);
  const [stamp, setStamp] = useState(null);
  const [signature, setSignature] = useState(null);
  
  // Billing Details
  const [partyName, setPartyName] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [placeOfSupply, setPlaceOfSupply] = useState("");

  // Shipping Details
  const [shipToSameAsBilling, setShipToSameAsBilling] = useState(true);
  const [shipToName, setShipToName] = useState("");
  const [shipToAddress, setShipToAddress] = useState("");

  const [quoteStatus, setQuoteStatus] = useState("DRAFT"); // DRAFT | SENT | NEGOTIATING | ACCEPTED | REJECTED

  const [columns, setColumns] = useState(DEFAULT_COLUMNS);
  const [showColConfig, setShowColConfig] = useState(false);

  const [items, setItems] = useState([
    { description: "", subDetails: "", hsn: "", qty: 1, unit: "pcs", rate: 0 }
  ]);

  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState("");

  if (!isOpen) return null;

  const addItem = () => setItems([...items, { description: "", subDetails: "", hsn: "", qty: 1, unit: "pcs", rate: 0 }]);
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

  const totalAmount = items.reduce((acc, it) => acc + ((Number(it.qty) || 0) * (Number(it.rate) || 0)), 0);

  const sanitizeItems = (rawItems) => {
    const hasSubCol = columns.some(c => c.id === "subDetails");
    return rawItems.map(it => ({
      ...it,
      subDetails: hasSubCol ? (it.subDetails || "") : ""
    }));
  };

  const generatePDFDoc = () => {
    return generateStandardDocumentPDF({
      documentType: "QUOTATION",
      docNumber: quoteNumber,
      docDate: quoteDate,
      dueDate: expiryDate,
      senderName: company.legalName || company.name,
      senderAddress: company.address,
      senderGstin: company.gstin,
      senderPan: company.pan,
      senderCin: company.cin,
      senderEmail: company.email,
      logo: logo,
      letterhead: letterhead,
      stamp: stamp,
      signature: signature,
      templateStyle: templateStyle,
      clientName: partyName,
      clientAddress: clientAddress,
      placeOfSupply: placeOfSupply,
      shipToName: shipToSameAsBilling ? partyName : shipToName,
      shipToAddress: shipToSameAsBilling ? clientAddress : shipToAddress,
      items: sanitizeItems(items),
      columns,
      taxRate: 0,
      notes: notes,
      terms: terms,
      bankDetails: {
        name: company.bankDetails.accountName || company.legalName,
        ifsc: company.bankDetails.ifsc,
        accountNo: company.bankDetails.accountNumber,
        bankName: company.bankDetails.bankName
      },
      authorisedSignatory: company.legalName || company.name
    });
  };

  const handleExportPDF = () => {
    const doc = generatePDFDoc();
    doc.save(`${quoteNumber}_${partyName.replace(/\s+/g, '_')}.pdf`);
    toast.success("Quotation PDF downloaded!");
  };

  const handleSendToTrade = async () => {
    setIsSavingDoc(true);
    try {
      const pdfDoc = generatePDFDoc();
      await saveDocumentToDocVaultAndEngine({
        activeWorkbench,
        docNumber: quoteNumber,
        documentType: "quotation",
        pdfDoc,
        partyName,
        partyAddress: clientAddress,
        totalAmount,
        docDate: quoteDate,
        dueDate: expiryDate,
        lineItems: sanitizeItems(items),
        notes,
        terms
      });

      toast.success(`Quotation ${quoteNumber} saved to Doc Vault!`);
      onClose();
    } catch (e) {
      console.error("Save to Doc Vault error:", e);
      toast.error("Failed to save document to Doc Vault: " + (e.message || e));
    } finally {
      setIsSavingDoc(false);
    }
  };

   if (!isOpen && !isPage) return null;

  const content = (
    <div className={`bg-[#141414] border border-white/10 rounded-2xl w-full overflow-hidden shadow-2xl flex flex-col ${
      isPage ? "max-w-6xl mx-auto my-6 border border-white/10" : "max-w-4xl"
    }`}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10 bg-[#1a1a1a]">
          <h3 className="text-lg font-bold text-white flex items-center">
            <BsTag className="mr-2 text-blue-400" /> Stage 0: Quotation Generator
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><BsX size={24} /></button>
        </div>

        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto custom-scrollbar">
          {/* Quote Meta */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Quote Number</label>
              <input value={quoteNumber} onChange={e => setQuoteNumber(e.target.value)} className="w-full bg-[#1e1e1e] border border-white/10 rounded-lg p-2 text-sm text-white" />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Quote Date</label>
              <input type="date" value={quoteDate} onChange={e => setQuoteDate(e.target.value)} className="w-full bg-[#1e1e1e] border border-white/10 rounded-lg p-2 text-sm text-white" />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Valid Until</label>
              <input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} className="w-full bg-[#1e1e1e] border border-white/10 rounded-lg p-2 text-sm text-white" />
            </div>
          </div>

          {/* Document Branding, Letterhead & PDF Template Selector */}
          <DocumentBrandingToolbar
            templateStyle={templateStyle}
            setTemplateStyle={setTemplateStyle}
            logo={logo}
            setLogo={setLogo}
            letterhead={letterhead}
            setLetterhead={setLetterhead}
            stamp={stamp}
            setStamp={setStamp}
            signature={signature}
            setSignature={setSignature}
          />

          {/* Billing & Shipping Section */}
          <div className="p-4 bg-[#181818] border border-white/10 rounded-xl space-y-3">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                <BsBuilding className="text-sm" /> Client Billing & Shipping Details
              </span>
              <label className="flex items-center space-x-2 cursor-pointer text-xs text-gray-300">
                <input
                  type="checkbox"
                  checked={shipToSameAsBilling}
                  onChange={(e) => setShipToSameAsBilling(e.target.checked)}
                  className="rounded border-white/10 text-blue-600 focus:ring-0"
                />
                <span>Ship To same as Bill To</span>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* BILL TO */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-gray-300 block uppercase">Bill To</span>
                <div>
                  <label className="text-[10px] text-gray-400 block mb-0.5">Select Client / Business</label>
                  <PartySelector
                    value={partyName}
                    placeholder="Select or Create Client..."
                    filterType="customer"
                    onSelectParty={(party) => {
                      setPartyName(party.name);
                      if (party.address) setClientAddress(party.address);
                    }}
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
              </div>

              {/* SHIP TO */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-gray-300 block uppercase">Ship To</span>
                {shipToSameAsBilling ? (
                  <div className="p-3 bg-white/5 border border-white/5 rounded-lg text-xs text-gray-400 space-y-1">
                    <div><span className="text-gray-300 font-semibold">Consignee:</span> {partyName}</div>
                    <div><span className="text-gray-300 font-semibold">Address:</span> {clientAddress}</div>
                    <div className="text-[11px] text-blue-400 italic pt-1">Shipping details match billing address</div>
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
              <span className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
                Quote Line Items
              </span>
              <div className="flex items-center space-x-4">
                <button
                  type="button"
                  onClick={() => setShowColConfig(!showColConfig)}
                  className="text-xs text-blue-400 font-bold hover:underline flex items-center gap-1"
                >
                  <BsGear className="text-xs" /> {showColConfig ? "Hide Column Settings" : "Add / Remove / Edit Columns"}
                </button>
                <button onClick={addItem} className="text-xs text-blue-400 font-bold hover:underline flex items-center gap-1">
                  <BsPlusLg className="text-xs" /> Add Line Item
                </button>
              </div>
            </div>

            {/* Dynamic Column Configurator Panel */}
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
                        <div key={col.id} className="flex-1 min-w-[90px] text-right text-xs text-blue-400 font-bold px-2 py-1.5">
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

          <div className="bg-white/5 p-3 rounded-lg flex justify-between items-center">
            <span className="text-xs text-gray-400 font-bold">Total Quote Estimate</span>
            <span className="text-lg font-bold text-blue-400">{formatCurrency(totalAmount, activeWorkbench?.country)}</span>
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
          <button onClick={handleSendToTrade} className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs flex items-center">
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
