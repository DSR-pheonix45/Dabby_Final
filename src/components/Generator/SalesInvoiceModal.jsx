import React, { useState, useEffect } from "react";
import { 
  BsX, BsCheckCircleFill, BsFileEarmarkPdf, BsPlus, BsTrash, 
  BsBuilding, BsTruck, BsTag, BsShieldCheck, BsInfoCircle, BsSend, BsReceipt
} from "react-icons/bs";
import { toast } from "react-hot-toast";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { saveInvoice, getStoredDiscountTags } from "./generatorStore";
import { generateStandardDocumentPDF } from "../../utils/documentPdfGenerator";
import { useWorkbench } from "../../context/WorkbenchContext";
import { useAuth } from "../../hooks/useAuth";
import { getWorkbenchCompanyDetails } from "../../utils/workbenchCompanyHelper";
import { saveDocumentToDocVaultAndEngine } from "../../utils/docVaultExporter";
import PartySelector from "./PartySelector";
import DynamicColumnConfigurator, { DEFAULT_COLUMNS } from "./DynamicColumnConfigurator";
import DocumentBrandingToolbar from "./DocumentBrandingToolbar";

export default function SalesInvoiceModal({ isOpen, onClose, isPage = false }) {
  const { activeWorkbench } = useWorkbench();
  const { user } = useAuth();
  const company = getWorkbenchCompanyDetails(activeWorkbench, user);

  const [docNumber, setDocNumber] = useState(`INV-${Math.floor(1000 + Math.random() * 9000)}`);
  const [docDate, setDocDate] = useState(new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState("");

  // Branding & Template State
  const [templateStyle, setTemplateStyle] = useState("modern");
  const [logo, setLogo] = useState(company.logo || null);
  const [letterhead, setLetterhead] = useState(null);
  const [stamp, setStamp] = useState(null);
  const [signature, setSignature] = useState(null);

  // Client Billing Details
  const [partyName, setPartyName] = useState("");
  const [clientGstin, setClientGstin] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [placeOfSupply, setPlaceOfSupply] = useState("");

  // Shipping Details
  const [shipToSameAsBilling, setShipToSameAsBilling] = useState(true);
  const [shipToName, setShipToName] = useState("");
  const [shipToAddress, setShipToAddress] = useState("");

  // GST Registration Status & Taxes Area
  const [isGstRegistered, setIsGstRegistered] = useState(true);
  const [taxSchema, setTaxSchema] = useState("CGST_SGST"); // 'CGST_SGST' or 'IGST'
  const [eWayBillNo, setEWayBillNo] = useState("");
  const [gstDocRef, setGstDocRef] = useState(`GST-DOC-${Math.floor(100000 + Math.random() * 900000)}`);

  // Shipping & Delivery Details (Challan)
  const [includeShipping, setIncludeShipping] = useState(false);
  const [deliveryChallan, setDeliveryChallan] = useState({
    challanNo: `DC-${Math.floor(1000 + Math.random() * 9000)}`,
    vehicleNo: "",
    dispatchDate: new Date().toISOString().split("T")[0],
    biltyLrNo: ""
  });

  // Dynamic Column Config
  const [columns, setColumns] = useState(DEFAULT_COLUMNS);
  const [showColConfig, setShowColConfig] = useState(false);

  // Line items
  const [lineItems, setLineItems] = useState([
    { id: 1, sku: "", description: "", subDetails: "", hsnSac: "", qty: 1, unit: "pcs", rate: 0, taxRate: 18 }
  ]);

  // Payment Details & Snippet
  const [paymentSnippet, setPaymentSnippet] = useState({
    bankName: company.bankDetails.bankName || "",
    accountName: company.bankDetails.accountName || company.legalName || "",
    accountNumber: company.bankDetails.accountNumber || "",
    ifsc: company.bankDetails.ifsc || "",
    paymentTerms: "Net 30 Days"
  });

  const [notes, setNotes] = useState("");
  const [discountTags, setDiscountTags] = useState([]);
  const [selectedTagId, setSelectedTagId] = useState("");
  const [isSavingDoc, setIsSavingDoc] = useState(false);

  useEffect(() => {
    if (activeWorkbench) {
      setPaymentSnippet((prev) => ({
        ...prev,
        bankName: company.bankDetails.bankName || prev.bankName,
        accountName: company.bankDetails.accountName || company.legalName || prev.accountName,
        accountNumber: company.bankDetails.accountNumber || prev.accountNumber,
        ifsc: company.bankDetails.ifsc || prev.ifsc
      }));
    }
    setDiscountTags(getStoredDiscountTags());
  }, [activeWorkbench]);

  const addLineItem = () => {
    setLineItems([
      ...lineItems,
      { id: Date.now(), sku: "", description: "", subDetails: "", hsnSac: "", qty: 1, unit: "pcs", rate: 0, taxRate: isGstRegistered ? 18 : 0 }
    ]);
  };

  const removeLineItem = (id) => {
    if (lineItems.length === 1) return toast.error("Invoice must have at least one line item.");
    setLineItems(lineItems.filter(item => item.id !== id));
  };

  const updateLineItem = (id, field, value) => {
    setLineItems(lineItems.map(item => {
      if (item.id === id) {
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  // Tax & Totals Calculation
  const subtotal = lineItems.reduce((acc, item) => acc + (Number(item.qty || 0) * Number(item.rate || 0)), 0);

  const activeDiscountTag = discountTags.find(t => t.id === selectedTagId);
  let discountAmount = 0;
  if (activeDiscountTag) {
    if (activeDiscountTag.type === "PERCENT") {
      discountAmount = (subtotal * activeDiscountTag.value) / 100;
    } else {
      discountAmount = activeDiscountTag.value;
    }
  }

  const taxableAmount = Math.max(0, subtotal - discountAmount);

  // Total tax across line items (or 0 if unregistered)
  const totalTax = isGstRegistered
    ? lineItems.reduce((acc, item) => {
        const itemAmount = Number(item.qty || 0) * Number(item.rate || 0);
        const itemTax = (itemAmount * (Number(item.taxRate) || 0)) / 100;
        return acc + itemTax;
      }, 0)
    : 0;

  const cgstTotal = isGstRegistered && taxSchema === "CGST_SGST" ? totalTax / 2 : 0;
  const sgstTotal = isGstRegistered && taxSchema === "CGST_SGST" ? totalTax / 2 : 0;
  const igstTotal = isGstRegistered && taxSchema === "IGST" ? totalTax : 0;
  const grandTotal = taxableAmount + totalTax;

  const sanitizeItems = (rawItems) => {
    const hasSubCol = columns.some(c => c.id === "subDetails");
    return rawItems.map((it, idx) => ({
      sno: idx + 1,
      description: it.description || it.sku || `Item #${idx + 1}`,
      subDetails: hasSubCol ? (it.subDetails || "") : "",
      hsn: it.hsnSac || "",
      qty: Number(it.qty) || 1,
      unit: it.unit || "pcs",
      rate: Number(it.rate) || 0,
      taxRate: isGstRegistered ? (Number(it.taxRate) || 0) : 0
    }));
  };

  const generatePDFDoc = () => {
    return generateStandardDocumentPDF({
      documentType: "TAX INVOICE",
      docNumber: docNumber,
      docDate: docDate,
      dueDate: dueDate,
      senderName: company.legalName || company.name,
      senderAddress: company.address,
      senderGstin: isGstRegistered ? company.gstin : "UNREGISTERED",
      senderPan: company.pan,
      senderCin: company.cin,
      senderEmail: company.email,
      logo: logo,
      letterhead: letterhead,
      stamp: stamp,
      signature: signature,
      templateStyle: templateStyle,
      clientName: partyName || "Client",
      clientAddress: clientAddress || "",
      placeOfSupply: placeOfSupply || "",
      clientGstin: clientGstin || "",
      shipToName: shipToSameAsBilling ? partyName : shipToName,
      shipToAddress: shipToSameAsBilling ? clientAddress : shipToAddress,
      items: sanitizeItems(lineItems),
      columns,
      taxRate: isGstRegistered ? 18 : 0,
      isIgst: taxSchema === "IGST",
      notes: notes,
      terms: paymentSnippet.paymentTerms || "Net 30 Days",
      bankDetails: {
        name: paymentSnippet.accountName || company.legalName,
        ifsc: paymentSnippet.ifsc || company.bankDetails.ifsc,
        accountNo: paymentSnippet.accountNumber || company.bankDetails.accountNumber,
        bankName: paymentSnippet.bankName || company.bankDetails.bankName
      },
      authorisedSignatory: company.legalName || company.name
    });
  };

  const handleExportPDF = () => {
    try {
      const doc = generatePDFDoc();
      doc.save(`${docNumber}_sales_invoice.pdf`);
      toast.success(`Exported Sales Invoice ${docNumber} PDF!`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate PDF proof");
    }
  };

  const handleSaveDocument = async () => {
    setIsSavingDoc(true);
    try {
      const pdfDoc = generatePDFDoc();
      await saveDocumentToDocVaultAndEngine({
        activeWorkbench,
        docNumber: docNumber,
        documentType: "sales_invoice",
        pdfDoc,
        partyName: partyName || "Client",
        partyAddress: clientAddress || "",
        partyGstin: clientGstin || "",
        totalAmount: grandTotal,
        docDate: docDate,
        dueDate: dueDate,
        lineItems: sanitizeItems(lineItems),
        notes: notes,
        terms: paymentSnippet.paymentTerms || ""
      });

      const savedObj = {
        id: docNumber,
        invoiceNumber: docNumber,
        stage: "SALES_INVOICE",
        stageLabel: "Tax Invoice (Sales)",
        date: docDate,
        partyName: partyName,
        partyGstin: clientGstin,
        amount: grandTotal,
        status: "Issued & Locked",
        paymentSnippet,
        isGstRegistered,
        taxSchema,
        includeShipping,
        deliveryChallan,
        lineItems
      };
      saveInvoice(savedObj);

      toast.success(`Sales Invoice ${docNumber} saved to Doc Vault & Sales Flow!`);
      onClose();
    } catch (e) {
      console.error("Save to Doc Vault error:", e);
      toast.error("Failed to save invoice to Doc Vault: " + (e.message || e));
    } finally {
      setIsSavingDoc(false);
    }
  };

  if (!isOpen && !isPage) return null;

  const content = (
    <div className={`bg-[#121212] border border-white/10 rounded-2xl w-full overflow-hidden shadow-2xl flex flex-col ${
      isPage ? "max-w-6xl mx-auto my-6 border border-white/10" : "max-w-5xl my-8 max-h-[90vh]"
    }`}>
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#181818]">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 font-bold text-lg">
              ₹
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                Sales Tax Invoice Generator
                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium border bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                  Tax Sales Invoice
                </span>
              </h2>
              <p className="text-xs text-gray-400">Issue locked-in tax sales invoices directly to customers</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors">
            <BsX size={26} />
          </button>
        </div>

        {/* Modal / Page Body Flow */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
          
          {/* Step 1: Document Meta Header */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl bg-white/5 border border-white/5">
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1">Invoice Number</label>
              <input
                type="text"
                value={docNumber}
                onChange={(e) => setDocNumber(e.target.value)}
                className="w-full bg-[#1e1e1e] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-teal-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1">Invoice Date</label>
              <input
                type="date"
                value={docDate}
                onChange={(e) => setDocDate(e.target.value)}
                className="w-full bg-[#1e1e1e] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-teal-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1">Payment Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full bg-[#1e1e1e] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-teal-500"
              />
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

          {/* Step 2: Client Billing & Shipping Details */}
          <div className="p-5 rounded-xl bg-white/5 border border-white/5 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <BsBuilding className="text-teal-400" />
                1. Client Billing & Shipping Details
              </h3>
              <label className="flex items-center space-x-2 cursor-pointer text-xs text-gray-300">
                <input
                  type="checkbox"
                  checked={shipToSameAsBilling}
                  onChange={(e) => setShipToSameAsBilling(e.target.checked)}
                  className="rounded border-white/10 text-teal-600 focus:ring-0"
                />
                <span>Ship To same as Bill To</span>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {/* BILL TO */}
              <div className="space-y-3">
                <span className="text-[11px] font-bold text-teal-400 block uppercase">Bill To (Customer)</span>
                <div>
                  <label className="block font-medium text-gray-400 mb-1">Select or Create Customer</label>
                  <PartySelector
                    value={partyName}
                    placeholder="Select or Search Client..."
                    filterType="customer"
                    onSelectParty={(p) => {
                      setPartyName(p.name);
                      if (p.gstin) setClientGstin(p.gstin);
                      if (p.address) setClientAddress(p.address);
                    }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-gray-400 mb-0.5">GSTIN Number</label>
                    <input
                      type="text"
                      value={clientGstin}
                      onChange={(e) => setClientGstin(e.target.value)}
                      placeholder="e.g. 27AABCU9603R1ZM"
                      className="w-full bg-[#1e1e1e] border border-white/10 rounded px-2.5 py-1.5 text-white uppercase focus:outline-none focus:border-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-400 mb-0.5">Place of Supply (State)</label>
                    <input
                      type="text"
                      value={placeOfSupply}
                      onChange={(e) => setPlaceOfSupply(e.target.value)}
                      placeholder="e.g. 27 - Maharashtra"
                      className="w-full bg-[#1e1e1e] border border-white/10 rounded px-2.5 py-1.5 text-white focus:outline-none focus:border-teal-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] text-gray-400 mb-0.5">Billing & Registered Address</label>
                  <textarea
                    rows={2}
                    value={clientAddress}
                    onChange={(e) => setClientAddress(e.target.value)}
                    placeholder="Full street address..."
                    className="w-full bg-[#1e1e1e] border border-white/10 rounded px-2.5 py-1.5 text-white focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              {/* SHIP TO */}
              <div className="space-y-3 border-l border-white/5 pl-0 md:pl-4">
                <span className="text-[11px] font-bold text-teal-400 block uppercase">Ship To (Consignee)</span>
                {shipToSameAsBilling ? (
                  <div className="p-3.5 bg-white/5 border border-white/5 rounded-xl text-xs text-gray-400 space-y-1.5 mt-2">
                    <div><span className="text-gray-300 font-semibold">Consignee:</span> {partyName || "Same as Bill To"}</div>
                    <div><span className="text-gray-300 font-semibold">Address:</span> {clientAddress || "Same as Billing Address"}</div>
                    <div className="text-[11px] text-teal-400 italic pt-1 flex items-center gap-1">
                      <BsCheckCircleFill /> Shipping details automatically match billing address
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    <div>
                      <label className="block text-[10px] text-gray-400 mb-0.5">Consignee Name</label>
                      <input
                        type="text"
                        value={shipToName}
                        onChange={(e) => setShipToName(e.target.value)}
                        placeholder="e.g. Site Delivery Office"
                        className="w-full bg-[#1e1e1e] border border-white/10 rounded px-2.5 py-1.5 text-white focus:outline-none focus:border-teal-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-400 mb-0.5">Shipping Address</label>
                      <textarea
                        rows={3}
                        value={shipToAddress}
                        onChange={(e) => setShipToAddress(e.target.value)}
                        placeholder="Full delivery address..."
                        className="w-full bg-[#1e1e1e] border border-white/10 rounded px-2.5 py-1.5 text-white focus:outline-none focus:border-teal-500"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Step 3: Line Items & SKU Particulars */}
          <div className="p-5 rounded-xl bg-white/5 border border-white/5 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <BsTag className="text-teal-400" />
                2. Particulars & Line Items
              </h3>
              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={() => setShowColConfig(!showColConfig)}
                  className="text-xs text-teal-400 font-bold hover:underline flex items-center gap-1"
                >
                  ⚙ {showColConfig ? "Hide Column Settings" : "Configure Column Labels"}
                </button>
                <button
                  onClick={addLineItem}
                  className="flex items-center gap-1.5 bg-teal-500/10 text-teal-400 hover:bg-teal-500/20 px-3 py-1.5 rounded-lg text-xs font-semibold border border-teal-500/30 transition-colors"
                >
                  <BsPlus className="text-lg" /> Add Line Item
                </button>
              </div>
            </div>

            {/* Column Configuration Drawer */}
            {showColConfig && (
              <DynamicColumnConfigurator columns={columns} setColumns={setColumns} />
            )}

            {/* Line items table */}
            <div className="space-y-3">
              {lineItems.map((item, idx) => (
                <div key={item.id} className="p-3 rounded-lg bg-[#181818] border border-white/5 grid grid-cols-12 gap-2 items-center text-xs">
                  <div className="col-span-12 md:col-span-3">
                    <label className="block text-[10px] text-gray-400 mb-0.5">SKU / Item Code</label>
                    <input
                      type="text"
                      value={item.sku || ""}
                      onChange={(e) => updateLineItem(item.id, "sku", e.target.value)}
                      placeholder="e.g. SKU-101 / Item Code"
                      className="w-full bg-[#222] border border-white/10 rounded px-2 py-1 text-white focus:outline-none focus:border-teal-500"
                    />
                  </div>
                  <div className="col-span-12 md:col-span-3">
                    <label className="block text-[10px] text-gray-400 mb-0.5">Description</label>
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => updateLineItem(item.id, "description", e.target.value)}
                      placeholder="Item description"
                      className="w-full bg-[#222] border border-white/10 rounded px-2 py-1 text-white focus:outline-none focus:border-teal-500"
                    />
                  </div>
                  <div className="col-span-4 md:col-span-1">
                    <label className="block text-[10px] text-gray-400 mb-0.5">HSN/SAC</label>
                    <input
                      type="text"
                      value={item.hsnSac}
                      onChange={(e) => updateLineItem(item.id, "hsnSac", e.target.value)}
                      placeholder="e.g. 8471"
                      className="w-full bg-[#222] border border-white/10 rounded px-2 py-1 text-white focus:outline-none focus:border-teal-500"
                    />
                  </div>
                  <div className="col-span-4 md:col-span-1">
                    <label className="block text-[10px] text-gray-400 mb-0.5">Qty</label>
                    <input
                      type="number"
                      value={item.qty}
                      onChange={(e) => updateLineItem(item.id, "qty", Math.max(1, parseInt(e.target.value) || 0))}
                      className="w-full bg-[#222] border border-white/10 rounded px-2 py-1 text-white focus:outline-none focus:border-teal-500"
                    />
                  </div>
                  <div className="col-span-4 md:col-span-2">
                    <label className="block text-[10px] text-gray-400 mb-0.5">Rate (₹)</label>
                    <input
                      type="number"
                      value={item.rate}
                      onChange={(e) => updateLineItem(item.id, "rate", parseFloat(e.target.value) || 0)}
                      className="w-full bg-[#222] border border-white/10 rounded px-2 py-1 text-white focus:outline-none focus:border-teal-500"
                    />
                  </div>
                  <div className="col-span-8 md:col-span-1">
                    <label className="block text-[10px] text-gray-400 mb-0.5">Tax %</label>
                    <select
                      value={isGstRegistered ? item.taxRate : 0}
                      disabled={!isGstRegistered}
                      onChange={(e) => updateLineItem(item.id, "taxRate", Number(e.target.value))}
                      className="w-full bg-[#222] border border-white/10 rounded px-1.5 py-1 text-white focus:outline-none disabled:opacity-50"
                    >
                      <option value={0}>0%</option>
                      <option value={5}>5%</option>
                      <option value={12}>12%</option>
                      <option value={18}>18%</option>
                      <option value={28}>28%</option>
                    </select>
                  </div>
                  <div className="col-span-4 md:col-span-1 flex items-center justify-between pt-3">
                    <span className="font-bold text-teal-400 text-xs">
                      ₹{(Number(item.qty || 0) * Number(item.rate || 0)).toLocaleString("en-IN")}
                    </span>
                    <button
                      onClick={() => removeLineItem(item.id)}
                      className="text-gray-500 hover:text-red-400 transition-colors p-1"
                      title="Remove Item"
                    >
                      <BsTrash />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Step 4: GST Registration & Tax Levy Settings */}
          <div className="p-5 rounded-xl bg-white/5 border border-white/5 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <BsShieldCheck className="text-teal-400" />
                3. GST Registration & Tax Levy Area
              </h3>
            </div>

            {/* Ask user: Is GST Registration done? */}
            <div className="p-4 bg-[#181818] border border-white/10 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-white block">Is your business GST Registered?</span>
                  <span className="text-[11px] text-gray-400">If registered, invoice will levy GST taxes. If unregistered, tax levy is exempt per GST rules.</span>
                </div>
                <div className="flex items-center space-x-2 bg-white/5 p-1 rounded-lg border border-white/10">
                  <button
                    type="button"
                    onClick={() => {
                      setIsGstRegistered(true);
                      setLineItems(lineItems.map(it => ({ ...it, taxRate: it.taxRate || 18 })));
                    }}
                    className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                      isGstRegistered ? "bg-teal-500 text-black shadow" : "text-gray-400 hover:text-white"
                    }`}
                  >
                    Yes (GST Registered)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsGstRegistered(false);
                      setLineItems(lineItems.map(it => ({ ...it, taxRate: 0 })));
                    }}
                    className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                      !isGstRegistered ? "bg-amber-500 text-black shadow" : "text-gray-400 hover:text-white"
                    }`}
                  >
                    No (Unregistered / Exempt)
                  </button>
                </div>
              </div>

              {!isGstRegistered ? (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs text-amber-300 flex items-center gap-2">
                  <BsInfoCircle className="text-base shrink-0" />
                  <span>
                    <strong>Unregistered Business Mode:</strong> Invoices issued by non-GST registered businesses cannot levy tax on customers. All item tax rates are set to 0% (Exempt).
                  </span>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs pt-2">
                  <div>
                    <label className="block text-gray-400 mb-1">Tax Calculation Schema</label>
                    <select
                      value={taxSchema}
                      onChange={(e) => setTaxSchema(e.target.value)}
                      className="w-full bg-[#1e1e1e] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none"
                    >
                      <option value="CGST_SGST">Intra-state (CGST + SGST)</option>
                      <option value="IGST">Inter-state (IGST)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-400 mb-1">GST Audit / Doc Record Ref</label>
                    <input
                      type="text"
                      value={gstDocRef}
                      onChange={(e) => setGstDocRef(e.target.value)}
                      className="w-full bg-[#1e1e1e] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-400 mb-1">E-Way Bill Number (If applicable)</label>
                    <input
                      type="text"
                      value={eWayBillNo}
                      onChange={(e) => setEWayBillNo(e.target.value)}
                      placeholder="e.g. 121008743912"
                      className="w-full bg-[#1e1e1e] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Step 5: Material Shipping & Delivery Details */}
          <div className="p-5 rounded-xl bg-white/5 border border-white/5 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <BsTruck className="text-teal-400" />
                4. Material Shipping & Delivery Challan
              </h3>
              <label className="flex items-center space-x-2 cursor-pointer text-xs text-gray-300">
                <input
                  type="checkbox"
                  checked={includeShipping}
                  onChange={(e) => setIncludeShipping(e.target.checked)}
                  className="rounded border-white/10 text-teal-600 focus:ring-0"
                />
                <span>Include Physical Goods Dispatch Details</span>
              </label>
            </div>

            {includeShipping && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs p-4 bg-[#181818] border border-white/10 rounded-xl">
                <div>
                  <label className="block text-gray-400 mb-1">Challan Number</label>
                  <input
                    type="text"
                    value={deliveryChallan.challanNo}
                    onChange={(e) => setDeliveryChallan({ ...deliveryChallan, challanNo: e.target.value })}
                    className="w-full bg-[#1e1e1e] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 mb-1">Vehicle Number</label>
                  <input
                    type="text"
                    value={deliveryChallan.vehicleNo}
                    onChange={(e) => setDeliveryChallan({ ...deliveryChallan, vehicleNo: e.target.value })}
                    placeholder="e.g. MH-04-AB-1234"
                    className="w-full bg-[#1e1e1e] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 mb-1">Dispatch Date</label>
                  <input
                    type="date"
                    value={deliveryChallan.dispatchDate}
                    onChange={(e) => setDeliveryChallan({ ...deliveryChallan, dispatchDate: e.target.value })}
                    className="w-full bg-[#1e1e1e] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 mb-1">Bilty / LR Number</label>
                  <input
                    type="text"
                    value={deliveryChallan.biltyLrNo}
                    onChange={(e) => setDeliveryChallan({ ...deliveryChallan, biltyLrNo: e.target.value })}
                    placeholder="e.g. LR-998822"
                    className="w-full bg-[#1e1e1e] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Step 6: Payment Details, Terms & Totals Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Payment & Terms */}
            <div className="p-5 rounded-xl bg-white/5 border border-white/5 space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-white/10 pb-3">
                <BsReceipt className="text-teal-400" />
                5. Payment Snippet & Terms
              </h3>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-[10px] text-gray-400 mb-0.5">Bank Name</label>
                  <input
                    type="text"
                    value={paymentSnippet.bankName}
                    onChange={(e) => setPaymentSnippet({ ...paymentSnippet, bankName: e.target.value })}
                    className="w-full bg-[#1e1e1e] border border-white/10 rounded p-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-400 mb-0.5">Account Number</label>
                  <input
                    type="text"
                    value={paymentSnippet.accountNumber}
                    onChange={(e) => setPaymentSnippet({ ...paymentSnippet, accountNumber: e.target.value })}
                    className="w-full bg-[#1e1e1e] border border-white/10 rounded p-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-400 mb-0.5">IFSC Code</label>
                  <input
                    type="text"
                    value={paymentSnippet.ifsc}
                    onChange={(e) => setPaymentSnippet({ ...paymentSnippet, ifsc: e.target.value })}
                    className="w-full bg-[#1e1e1e] border border-white/10 rounded p-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-400 mb-0.5">Payment Terms</label>
                  <select
                    value={paymentSnippet.paymentTerms}
                    onChange={(e) => setPaymentSnippet({ ...paymentSnippet, paymentTerms: e.target.value })}
                    className="w-full bg-[#1e1e1e] border border-white/10 rounded p-2 text-white focus:outline-none"
                  >
                    <option value="Net 30 Days">Net 30 Days</option>
                    <option value="Net 15 Days">Net 15 Days</option>
                    <option value="50% Advance & 50% Delivery">50% Advance & 50% Delivery</option>
                    <option value="Immediate / Cash on Delivery">Immediate / Cash on Delivery</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-gray-400 mb-0.5">Special Notes / Instructions</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional terms or notes for the client..."
                  className="w-full bg-[#1e1e1e] border border-white/10 rounded p-2 text-xs text-white"
                />
              </div>
            </div>

            {/* Summary & Totals Box */}
            <div className="p-5 rounded-xl bg-white/5 border border-white/5 flex flex-col justify-between space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-white/10 pb-3">
                Financial Summary Breakdown
              </h3>

              <div className="space-y-2.5 text-xs text-gray-300">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span className="font-semibold text-white">₹{subtotal.toLocaleString("en-IN")}</span>
                </div>

                {discountTags.length > 0 && (
                  <div className="flex justify-between items-center">
                    <span>Discount Tag:</span>
                    <select
                      value={selectedTagId}
                      onChange={(e) => setSelectedTagId(e.target.value)}
                      className="bg-[#1e1e1e] border border-white/10 rounded text-xs text-amber-300 p-1"
                    >
                      <option value="">-- Apply Tag Discount --</option>
                      {discountTags.map(t => (
                        <option key={t.id} value={t.id}>{t.code} ({t.value}{t.type === 'PERCENT' ? '%' : ' ₹'})</option>
                      ))}
                    </select>
                  </div>
                )}

                {discountAmount > 0 && (
                  <div className="flex justify-between text-amber-400">
                    <span>Discount Applied:</span>
                    <span>- ₹{discountAmount.toLocaleString("en-IN")}</span>
                  </div>
                )}

                {isGstRegistered ? (
                  <>
                    {taxSchema === "CGST_SGST" ? (
                      <>
                        <div className="flex justify-between text-gray-400">
                          <span>CGST Total:</span>
                          <span>₹{cgstTotal.toLocaleString("en-IN")}</span>
                        </div>
                        <div className="flex justify-between text-gray-400">
                          <span>SGST Total:</span>
                          <span>₹{sgstTotal.toLocaleString("en-IN")}</span>
                        </div>
                      </>
                    ) : (
                      <div className="flex justify-between text-gray-400">
                        <span>IGST Total:</span>
                        <span>₹{igstTotal.toLocaleString("en-IN")}</span>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex justify-between text-amber-400 italic text-[11px]">
                    <span>GST Tax:</span>
                    <span>₹0.00 (Unregistered Exempt)</span>
                  </div>
                )}

                <div className="border-t border-white/10 pt-3 flex justify-between items-center">
                  <span className="text-sm font-bold text-white">Grand Total:</span>
                  <span className="text-xl font-extrabold text-teal-400">₹{grandTotal.toLocaleString("en-IN")}</span>
                </div>
              </div>

              <div className="text-[11px] text-gray-400 italic bg-black/30 p-2.5 rounded-lg border border-white/5">
                Saved invoices automatically log in Doc Vault & sync with Accounts Receivable in OPS.
              </div>
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-white/10 bg-[#181818]">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-white/10 rounded-xl text-xs font-semibold text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleExportPDF}
              className="flex items-center space-x-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl text-xs font-semibold transition-colors"
            >
              <BsFileEarmarkPdf className="text-red-400 text-sm" />
              <span>Export PDF Proof</span>
            </button>
            <button
              disabled={isSavingDoc}
              onClick={handleSaveDocument}
              className="flex items-center space-x-2 bg-teal-500 hover:bg-teal-400 text-black font-bold px-5 py-2 rounded-xl text-xs shadow-lg shadow-teal-500/20 transition-all disabled:opacity-50"
            >
              <BsSend className="text-sm" />
              <span>{isSavingDoc ? "Saving..." : "Save & Issue Tax Invoice"}</span>
            </button>
          </div>
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
