import React, { useState, useEffect } from "react";
import { 
  BsX, BsCheckCircleFill, BsFileEarmarkPdf, BsFileEarmarkWord, BsPlus, BsTrash, 
  BsBuilding, BsCreditCard, BsTruck, BsTag, BsShieldCheck, BsInfoCircle, BsPrinter
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

const STAGES = [
  {
    key: "QUOTATION",
    label: "1. Quotation",
    title: "Quotation",
    badge: "First Initialization",
    badgeColor: "bg-blue-500/10 text-blue-400 border-blue-500/30",
    desc: "First initialization phase: Non-binding preliminary estimate provided to the customer."
  },
  {
    key: "PROFORMA",
    label: "2. Proforma Invoice",
    title: "Proforma Invoice",
    badge: "Negotiation & Tentative",
    badgeColor: "bg-amber-500/10 text-amber-400 border-amber-500/30",
    desc: "Negotiation phase: Tentative costing & draft breakdown issued prior to delivery/payment."
  },
  {
    key: "SALES_INVOICE",
    label: "3. Sales Invoice",
    title: "Tax Invoice (Sales)",
    badge: "Absolute Locked-in Value",
    badgeColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    desc: "Final stage: Absolute locked-in value tax document & legally binding bill."
  }
];

const PRESET_PARTIES = [
  { name: "Apex Logistics Ltd", gstin: "27AABCU9603R1ZM", pan: "AABCU9603R", address: "Plot 42, MIDC Industrial Area, Mumbai, MH - 400093", email: "accounts@apexlogistics.in" },
  { name: "Zenith Tech Solutions", gstin: "29AAACZ1234F1Z5", pan: "AAACZ1234F", address: "Outer Ring Rd, Bellandur, Bengaluru, KA - 560103", email: "billing@zenithtech.io" },
  { name: "Global Trading Corp", gstin: "07AAACG5678H1Z1", pan: "AAACG5678H", address: "Connaught Place, New Delhi, DL - 110001", email: "finance@globaltrading.com" }
];

const PRESET_SKUS = [
  { sku: "SKU-CONV-88", name: "Industrial Conveyor Belt (Heavy Duty)", hsn: "8428", rate: 45000 },
  { sku: "SKU-SRV-01", name: "Cloud Server Rack 42U Hardware", hsn: "8471", rate: 75000 },
  { sku: "SKU-SENS-12", name: "IoT Thermal Sensor Probe Assembly", hsn: "9031", rate: 3200 },
  { sku: "SKU-MOT-09", name: "3-Phase Induction Motor 5HP", hsn: "8501", rate: 18500 }
];

export default function SalesInvoiceModal({ isOpen, onClose }) {
  const { activeWorkbench } = useWorkbench();
  const { user } = useAuth();
  const company = getWorkbenchCompanyDetails(activeWorkbench, user);

  const [stage, setStage] = useState("QUOTATION");
  const [docNumber, setDocNumber] = useState(`QT-${Math.floor(1000 + Math.random() * 9000)}`);
  const [docDate, setDocDate] = useState(new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState("");

  // Linked Beneficiary / Party
  const [party, setParty] = useState({
    name: "",
    gstin: "",
    pan: "",
    address: "",
    email: "",
    placeOfSupply: ""
  });

  // Payment Snippet Details auto-fitted from Workbench Settings
  const [paymentSnippet, setPaymentSnippet] = useState({
    bankName: company.bankDetails.bankName || "",
    accountName: company.bankDetails.accountName || company.legalName || "",
    accountNumber: company.bankDetails.accountNumber || "",
    ifsc: company.bankDetails.ifsc || "",
    upiId: "",
    paymentTerms: "Net 30 Days"
  });

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
  }, [activeWorkbench]);

  // GST Related Record Details
  const [gstDetails, setGstDetails] = useState({
    taxType: "CGST_SGST", // CGST_SGST or IGST
    eWayBillNo: "",
    gstDocRef: `GST-DOC-${Math.floor(100000 + Math.random() * 900000)}`,
    reverseCharge: "No"
  });

  // Shipping & Delivery Details (Delivery Challan + SKUs)
  const [includeShipping, setIncludeShipping] = useState(false);
  const [deliveryChallan, setDeliveryChallan] = useState({
    challanNo: `DC-${Math.floor(1000 + Math.random() * 9000)}`,
    vehicleNo: "",
    dispatchDate: new Date().toISOString().split("T")[0],
    biltyLrNo: "",
    shippingAddress: ""
  });

  // Discount Coupons
  const [discountTags, setDiscountTags] = useState([]);
  const [selectedTagId, setSelectedTagId] = useState("");

  // Column Configuration
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

  // Line items
  const [lineItems, setLineItems] = useState([
    { id: 1, sku: "CUSTOM", description: "", hsnSac: "", qty: 1, rate: 0 }
  ]);

  useEffect(() => {
    setDiscountTags(getStoredDiscountTags());
  }, []);

  // Update Document Prefix based on stage
  const handleStageChange = (newStage) => {
    setStage(newStage);
    const rand = Math.floor(1000 + Math.random() * 9000);
    if (newStage === "QUOTATION") setDocNumber(`QT-${rand}`);
    else if (newStage === "PROFORMA") setDocNumber(`PI-${rand}`);
    else setDocNumber(`INV-${rand}`);
  };

  const addLineItem = () => {
    setLineItems([
      ...lineItems,
      { id: Date.now(), sku: "CUSTOM", description: "", hsnSac: "9983", qty: 1, rate: 0 }
    ]);
  };

  const removeLineItem = (id) => {
    if (lineItems.length === 1) return toast.error("Invoice must have at least one line item.");
    setLineItems(lineItems.filter(item => item.id !== id));
  };

  const updateLineItem = (id, field, value) => {
    setLineItems(lineItems.map(item => {
      if (item.id === id) {
        if (field === "sku") {
          const matchedPreset = PRESET_SKUS.find(s => s.sku === value);
          if (matchedPreset) {
            return {
              ...item,
              sku: value,
              description: matchedPreset.name,
              hsnSac: matchedPreset.hsn,
              rate: matchedPreset.rate
            };
          }
        }
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  const handleSelectPresetParty = (e) => {
    const matched = PRESET_PARTIES.find(p => p.name === e.target.value);
    if (matched) setParty(matched);
  };

  const subtotal = lineItems.reduce((acc, item) => acc + (Number(item.qty || 0) * Number(item.rate || 0)), 0);

  // Calculate Tag Discount
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
  const taxRate = 0.18; // 18% GST
  const totalTax = taxableAmount * taxRate;
  const grandTotal = taxableAmount + totalTax;

  const currentStageObj = STAGES.find(s => s.key === stage);

  // PDF Exporter with auto-fitted Workbench company settings
  const handleExportPDF = () => {
    try {
      const docType = stage === "QUOTATION" ? "QUOTATION" : (stage === "PROFORMA" ? "PROFORMA INVOICE" : "TAX INVOICE");
      const doc = generateStandardDocumentPDF({
        documentType: docType,
        docNumber: docNumber,
        docDate: docDate,
        dueDate: dueDate,
        senderName: company.legalName || company.name,
        senderAddress: company.address,
        senderGstin: company.gstin,
        senderPan: company.pan,
        senderCin: company.cin,
        senderEmail: company.email,
        clientName: party.name || "RATNA DEEP CHS",
        clientAddress: party.address || "Mulund",
        placeOfSupply: party.placeOfSupply || "Maharashtra",
        clientGstin: party.gstin,
        shipToName: includeShipping && deliveryChallan.shippingAddress ? party.name : (party.name || "RATNA DEEP CHS"),
        shipToAddress: includeShipping && deliveryChallan.shippingAddress ? deliveryChallan.shippingAddress : (party.address || "Mulund"),
        items: lineItems.map((item, idx) => ({
          sno: idx + 1,
          description: item.description || item.sku,
          subDetails: "",
          hsn: item.hsnSac || "39162019",
          qty: Number(item.qty) || 1,
          unit: "pcs",
          rate: Number(item.rate) || 0
        })),
        taxRate: 18,
        isIgst: gstDetails.taxType === "IGST",
        columnLabels,
        showSeparateUnitCol,
        notes: "T-Patti for top,bottom & center support\n2\"X 2\" Pipe Ms Fabrication For Fins Support With Material And installation",
        terms: paymentSnippet.paymentTerms || "50% Advance\n30% ongoing work\n20% after completion",
        bankDetails: {
          name: paymentSnippet.accountName || company.legalName,
          ifsc: paymentSnippet.ifsc || company.bankDetails.ifsc,
          accountNo: paymentSnippet.accountNumber || company.bankDetails.accountNumber,
          bankName: paymentSnippet.bankName || company.bankDetails.bankName
        },
        authorisedSignatory: company.legalName || company.name
      });

      doc.save(`${docNumber}_${stage}.pdf`);
      toast.success(`Exported ${currentStageObj.title} PDF!`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate PDF");
    }
  };

  const [isSavingDoc, setIsSavingDoc] = useState(false);

  const handleSaveDocument = async () => {
    setIsSavingDoc(true);
    try {
      const docType = stage === "QUOTATION" ? "quotation" : (stage === "PROFORMA" ? "proforma" : "sales_invoice");
      const pdfDoc = generateStandardDocumentPDF({
        documentType: stage === "QUOTATION" ? "QUOTATION" : (stage === "PROFORMA" ? "PROFORMA INVOICE" : "TAX INVOICE"),
        docNumber: docNumber,
        docDate: docDate,
        dueDate: dueDate,
        senderName: company.legalName || company.name,
        senderAddress: company.address,
        senderGstin: company.gstin,
        senderPan: company.pan,
        senderCin: company.cin,
        senderEmail: company.email,
        clientName: party.name || "Client",
        clientAddress: party.address || "",
        placeOfSupply: party.placeOfSupply || "",
        clientGstin: party.gstin,
        shipToName: includeShipping && deliveryChallan.shippingAddress ? party.name : (party.name || ""),
        shipToAddress: includeShipping && deliveryChallan.shippingAddress ? deliveryChallan.shippingAddress : (party.address || ""),
        items: lineItems.map((item, idx) => ({
          sno: idx + 1,
          description: item.description || item.sku,
          subDetails: "",
          hsn: item.hsnSac || "",
          qty: Number(item.qty) || 1,
          unit: "pcs",
          rate: Number(item.rate) || 0
        })),
        taxRate: 18,
        isIgst: gstDetails.taxType === "IGST",
        columnLabels,
        showSeparateUnitCol,
        notes: "",
        terms: paymentSnippet.paymentTerms || "Net 30 Days",
        bankDetails: {
          name: paymentSnippet.accountName || company.legalName,
          ifsc: paymentSnippet.ifsc || company.bankDetails.ifsc,
          accountNo: paymentSnippet.accountNumber || company.bankDetails.accountNumber,
          bankName: paymentSnippet.bankName || company.bankDetails.bankName
        },
        authorisedSignatory: company.legalName || company.name
      });

      await saveDocumentToDocVaultAndEngine({
        activeWorkbench,
        docNumber,
        documentType: docType,
        pdfDoc,
        partyName: party.name,
        partyAddress: party.address,
        partyGstin: party.gstin,
        totalAmount: grandTotal,
        docDate,
        dueDate,
        lineItems,
        notes: "",
        terms: paymentSnippet.paymentTerms || ""
      });

      const savedObj = {
        id: docNumber,
        invoiceNumber: docNumber,
        stage: stage,
        stageLabel: currentStageObj.badge,
        date: docDate,
        partyName: party.name,
        partyGstin: party.gstin,
        amount: grandTotal,
        status: stage === "SALES_INVOICE" ? "Issued & Locked" : stage === "PROFORMA" ? "Under Negotiation" : "Draft Quotation",
        paymentSnippet,
        gstDetails,
        includeShipping,
        deliveryChallan,
        lineItems
      };
      saveInvoice(savedObj);

      toast.success(`${currentStageObj.title} saved to Doc Vault!`);
      onClose();
    } catch (e) {
      console.error("Save to Doc Vault error:", e);
      toast.error("Failed to save document to Doc Vault: " + (e.message || e));
    } finally {
      setIsSavingDoc(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md font-dm-sans overflow-y-auto">
      <div className="bg-[#121212] border border-white/10 rounded-2xl w-full max-w-5xl my-8 overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#181818]">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 font-bold text-lg">
              ₹
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                Sales & Invoice Generator
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${currentStageObj.badgeColor}`}>
                  {currentStageObj.badge}
                </span>
              </h2>
              <p className="text-xs text-gray-400">Build Quotations, Proforma Invoices, and Locked-in Tax Sales Invoices</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors">
            <BsX size={26} />
          </button>
        </div>

        {/* 3-Stage Selector Tabs */}
        <div className="bg-[#161616] border-b border-white/10 px-6 py-3">
          <div className="grid grid-cols-3 gap-3">
            {STAGES.map((s) => {
              const active = stage === s.key;
              return (
                <button
                  key={s.key}
                  onClick={() => handleStageChange(s.key)}
                  className={`flex flex-col p-3 rounded-xl border text-left transition-all ${
                    active 
                      ? "bg-teal-500/10 border-teal-500/50 text-white shadow-lg shadow-teal-500/5" 
                      : "bg-white/5 border-white/5 text-gray-400 hover:bg-white/10 hover:border-white/20"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`font-semibold text-sm ${active ? "text-teal-400" : "text-gray-300"}`}>
                      {s.label}
                    </span>
                    {active && <BsCheckCircleFill className="text-teal-400 text-sm" />}
                  </div>
                  <span className="text-[11px] text-gray-400 line-clamp-1">{s.desc}</span>
                </button>
              );
            })}
          </div>
          
          {/* Stage Explanation Banner */}
          <div className="mt-3 p-2.5 rounded-lg bg-teal-500/5 border border-teal-500/20 text-xs text-gray-300 flex items-center gap-2">
            <BsInfoCircle className="text-teal-400 text-base shrink-0" />
            <span>
              <strong>Current Workflow Stage ({currentStageObj.title}):</strong> {currentStageObj.desc}
            </span>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          
          {/* Document Meta Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl bg-white/5 border border-white/5">
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1">Document Number</label>
              <input
                type="text"
                value={docNumber}
                onChange={(e) => setDocNumber(e.target.value)}
                className="w-full bg-[#1e1e1e] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-teal-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1">Document Date</label>
              <input
                type="date"
                value={docDate}
                onChange={(e) => setDocDate(e.target.value)}
                className="w-full bg-[#1e1e1e] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-teal-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1">Payment / Validity Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full bg-[#1e1e1e] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>

          {/* Section 1: Beneficiary / Linked Party */}
          <div className="p-5 rounded-xl bg-white/5 border border-white/5 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <BsBuilding className="text-teal-400" />
                1. Linked Party (Beneficiary Customer)
              </h3>
              <select
                onChange={handleSelectPresetParty}
                className="bg-[#1a1a1a] border border-white/10 text-xs text-teal-300 rounded-lg px-2.5 py-1 focus:outline-none"
              >
                <option value="">-- Load Preset Beneficiary --</option>
                {PRESET_PARTIES.map(p => (
                  <option key={p.name} value={p.name}>{p.name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-medium text-gray-400 mb-1">Select Party / Customer</label>
                <PartySelector
                  value={party.name}
                  placeholder="Select or Create Party..."
                  filterType="customer"
                  onSelectParty={(selected) => {
                    setParty(prev => ({
                      ...prev,
                      name: selected.name,
                      address: selected.address || prev.address,
                      gstin: selected.gstin || prev.gstin,
                      pan: selected.pan || prev.pan,
                      email: selected.email || prev.email
                    }));
                  }}
                />
              </div>
              <div>
                <label className="block font-medium text-gray-400 mb-1">GSTIN Number</label>
                <input
                  type="text"
                  value={party.gstin}
                  onChange={(e) => setParty({ ...party, gstin: e.target.value })}
                  placeholder="e.g. 27AABCU9603R1ZM"
                  className="w-full bg-[#1e1e1e] border border-white/10 rounded-lg px-3 py-2 text-white uppercase focus:outline-none focus:border-teal-500"
                />
              </div>
              <div>
                <label className="block font-medium text-gray-400 mb-1">PAN Number</label>
                <input
                  type="text"
                  value={party.pan}
                  onChange={(e) => setParty({ ...party, pan: e.target.value })}
                  placeholder="e.g. AABCU9603R"
                  className="w-full bg-[#1e1e1e] border border-white/10 rounded-lg px-3 py-2 text-white uppercase focus:outline-none focus:border-teal-500"
                />
              </div>
              <div>
                <label className="block font-medium text-gray-400 mb-1">Place of Supply (State)</label>
                <input
                  type="text"
                  value={party.placeOfSupply}
                  onChange={(e) => setParty({ ...party, placeOfSupply: e.target.value })}
                  placeholder="e.g. 27 - Maharashtra"
                  className="w-full bg-[#1e1e1e] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-teal-500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block font-medium text-gray-400 mb-1">Billing & Registered Address</label>
                <input
                  type="text"
                  value={party.address}
                  onChange={(e) => setParty({ ...party, address: e.target.value })}
                  placeholder="Full street address..."
                  className="w-full bg-[#1e1e1e] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-teal-500"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Line Items & SKU Selector */}
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
              <div className="bg-[#181818] p-3.5 rounded-xl border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-gray-300 uppercase tracking-wider">Presets</span>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => { setColumnLabels({ sno: "S.NO.", items: "ITEMS", hsn: "HSN", qty: "QTY.", unit: "UNIT", rate: "RATE", amount: "AMOUNT" }); setShowSeparateUnitCol(false); }} className="px-2.5 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-[11px] text-gray-300 font-medium">Standard Goods</button>
                    <button type="button" onClick={() => { setColumnLabels({ sno: "S.NO.", items: "ITEMS", hsn: "HSN", qty: "AREA", unit: "UNIT", rate: "UNIT RATE", amount: "DERIVING AMOUNT" }); setShowSeparateUnitCol(false); }} className="px-2.5 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-[11px] text-gray-300 font-medium">Construction (Area & Rate)</button>
                    <button type="button" onClick={() => { setColumnLabels({ sno: "S.NO.", items: "ITEMS", hsn: "HSN", qty: "AREA VALUE", unit: "AREA UNIT", rate: "UNIT RATE", amount: "DERIVING AMOUNT" }); setShowSeparateUnitCol(true); }} className="px-2.5 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-[11px] text-gray-300 font-medium">Architectural (Area Value, Unit, Rate)</button>
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

            <div className="space-y-3">
              {lineItems.map((item, idx) => (
                <div key={item.id} className="p-3 rounded-lg bg-[#181818] border border-white/5 grid grid-cols-12 gap-2 items-center text-xs">
                  <div className="col-span-12 md:col-span-3">
                    <label className="block text-[10px] text-gray-400 mb-0.5">Select Inventory SKU</label>
                    <select
                      value={item.sku}
                      onChange={(e) => updateLineItem(item.id, "sku", e.target.value)}
                      className="w-full bg-[#222] border border-white/10 rounded px-2 py-1 text-white focus:outline-none"
                    >
                      <option value="">-- Select SKU --</option>
                      {PRESET_SKUS.map(s => (
                        <option key={s.sku} value={s.sku}>{s.sku} - {s.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-12 md:col-span-3">
                    <label className="block text-[10px] text-gray-400 mb-0.5">Description</label>
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => updateLineItem(item.id, "description", e.target.value)}
                      placeholder="Item description"
                      className="w-full bg-[#222] border border-white/10 rounded px-2 py-1 text-white focus:outline-none"
                    />
                  </div>
                  <div className="col-span-4 md:col-span-1">
                    <label className="block text-[10px] text-gray-400 mb-0.5">HSN/SAC</label>
                    <input
                      type="text"
                      value={item.hsnSac}
                      onChange={(e) => updateLineItem(item.id, "hsnSac", e.target.value)}
                      className="w-full bg-[#222] border border-white/10 rounded px-2 py-1 text-white focus:outline-none"
                    />
                  </div>
                  <div className="col-span-4 md:col-span-1">
                    <label className="block text-[10px] text-gray-400 mb-0.5">Qty</label>
                    <input
                      type="number"
                      value={item.qty}
                      onChange={(e) => updateLineItem(item.id, "qty", Math.max(1, parseInt(e.target.value) || 0))}
                      className="w-full bg-[#222] border border-white/10 rounded px-2 py-1 text-white focus:outline-none"
                    />
                  </div>
                  <div className="col-span-4 md:col-span-2">
                    <label className="block text-[10px] text-gray-400 mb-0.5">Rate (₹)</label>
                    <input
                      type="number"
                      value={item.rate}
                      onChange={(e) => updateLineItem(item.id, "rate", parseFloat(e.target.value) || 0)}
                      className="w-full bg-[#222] border border-white/10 rounded px-2 py-1 text-white focus:outline-none"
                    />
                  </div>
                  <div className="col-span-8 md:col-span-1">
                    <label className="block text-[10px] text-gray-400 mb-0.5">Tax %</label>
                    <select
                      value={item.taxRate}
                      onChange={(e) => updateLineItem(item.id, "taxRate", Number(e.target.value))}
                      className="w-full bg-[#222] border border-white/10 rounded px-1.5 py-1 text-white focus:outline-none"
                    >
                      <option value={0}>0%</option>
                      <option value={5}>5%</option>
                      <option value={12}>12%</option>
                      <option value={18}>18%</option>
                      <option value={28}>28%</option>
                    </select>
                  </div>
                  <div className="col-span-4 md:col-span-1 flex items-center justify-end">
                    <button
                      onClick={() => removeLineItem(item.id)}
                      className="text-red-400 hover:text-red-300 p-1.5 rounded hover:bg-red-500/10 transition-colors"
                    >
                      <BsTrash size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: GST Related Record Doc & Payment Snippets */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* GST Record Doc */}
            <div className="p-5 rounded-xl bg-white/5 border border-white/5 space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-white/10 pb-3">
                <BsShieldCheck className="text-teal-400" />
                3. GST Related Record Doc
              </h3>
              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-medium text-gray-400 mb-1">Tax Calculation Schema</label>
                  <select
                    value={gstDetails.taxType}
                    onChange={(e) => setGstDetails({ ...gstDetails, taxType: e.target.value })}
                    className="w-full bg-[#1e1e1e] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none"
                  >
                    <option value="CGST_SGST">Intra-state (CGST + SGST)</option>
                    <option value="IGST">Inter-state (Integrated IGST)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-gray-400 mb-1">GST Audit / Doc Record Ref</label>
                  <input
                    type="text"
                    value={gstDetails.gstDocRef}
                    onChange={(e) => setGstDetails({ ...gstDetails, gstDocRef: e.target.value })}
                    className="w-full bg-[#1e1e1e] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-gray-400 mb-1">E-Way Bill Number (If applicable)</label>
                  <input
                    type="text"
                    value={gstDetails.eWayBillNo}
                    onChange={(e) => setGstDetails({ ...gstDetails, eWayBillNo: e.target.value })}
                    placeholder="e.g. 121008743912"
                    className="w-full bg-[#1e1e1e] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Payment Snippets */}
            <div className="p-5 rounded-xl bg-white/5 border border-white/5 space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-white/10 pb-3">
                <BsCreditCard className="text-teal-400" />
                4. Payment Snippets & Terms
              </h3>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-medium text-gray-400 mb-1">Bank Name</label>
                  <input
                    type="text"
                    value={paymentSnippet.bankName}
                    onChange={(e) => setPaymentSnippet({ ...paymentSnippet, bankName: e.target.value })}
                    className="w-full bg-[#1e1e1e] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-gray-400 mb-1">Account Number</label>
                  <input
                    type="text"
                    value={paymentSnippet.accountNumber}
                    onChange={(e) => setPaymentSnippet({ ...paymentSnippet, accountNumber: e.target.value })}
                    className="w-full bg-[#1e1e1e] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-gray-400 mb-1">IFSC Code</label>
                  <input
                    type="text"
                    value={paymentSnippet.ifsc}
                    onChange={(e) => setPaymentSnippet({ ...paymentSnippet, ifsc: e.target.value })}
                    className="w-full bg-[#1e1e1e] border border-white/10 rounded-lg px-3 py-2 text-white uppercase focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-gray-400 mb-1">UPI VPA / QR Handle</label>
                  <input
                    type="text"
                    value={paymentSnippet.upiId}
                    onChange={(e) => setPaymentSnippet({ ...paymentSnippet, upiId: e.target.value })}
                    className="w-full bg-[#1e1e1e] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block font-medium text-gray-400 mb-1">Payment Terms</label>
                  <select
                    value={paymentSnippet.paymentTerms}
                    onChange={(e) => setPaymentSnippet({ ...paymentSnippet, paymentTerms: e.target.value })}
                    className="w-full bg-[#1e1e1e] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none"
                  >
                    <option value="Net 15 Days">Net 15 Days</option>
                    <option value="Net 30 Days">Net 30 Days</option>
                    <option value="50% Advance & Balance on Dispatch">50% Advance & Balance on Dispatch</option>
                    <option value="Due Immediately on Receipt">Due Immediately on Receipt</option>
                  </select>
                </div>
              </div>
            </div>

          </div>

          {/* Section 4: Material Shipping & Delivery Details (Delivery Challan) */}
          <div className="p-5 rounded-xl bg-white/5 border border-white/5 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-3">
                <BsTruck className="text-teal-400 text-lg" />
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    5. Link Material Shipping & Delivery Challan
                  </h3>
                  <p className="text-xs text-gray-400">Enable if physical materials/goods are being dispatched with SKUs</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeShipping}
                  onChange={(e) => setIncludeShipping(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-500"></div>
              </label>
            </div>

            {includeShipping && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs pt-2 animate-fadeIn">
                <div>
                  <label className="block font-medium text-gray-400 mb-1">Delivery Challan #</label>
                  <input
                    type="text"
                    value={deliveryChallan.challanNo}
                    onChange={(e) => setDeliveryChallan({ ...deliveryChallan, challanNo: e.target.value })}
                    className="w-full bg-[#1e1e1e] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-gray-400 mb-1">Vehicle Number</label>
                  <input
                    type="text"
                    value={deliveryChallan.vehicleNo}
                    onChange={(e) => setDeliveryChallan({ ...deliveryChallan, vehicleNo: e.target.value })}
                    className="w-full bg-[#1e1e1e] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-gray-400 mb-1">Dispatch Date</label>
                  <input
                    type="date"
                    value={deliveryChallan.dispatchDate}
                    onChange={(e) => setDeliveryChallan({ ...deliveryChallan, dispatchDate: e.target.value })}
                    className="w-full bg-[#1e1e1e] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-gray-400 mb-1">Bilty / Transporter LR #</label>
                  <input
                    type="text"
                    value={deliveryChallan.biltyLrNo}
                    onChange={(e) => setDeliveryChallan({ ...deliveryChallan, biltyLrNo: e.target.value })}
                    className="w-full bg-[#1e1e1e] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Section 5: Discount & Referral Tag Linking */}
          <div className="p-4 rounded-xl bg-teal-500/5 border border-teal-500/20 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <BsTag className="text-teal-400 text-xl shrink-0" />
              <div>
                <span className="text-sm font-semibold text-white">Apply Discount / Referral Coupon Tag</span>
                <p className="text-xs text-gray-400">Link promotional coupon tags created in the Discount Generator</p>
              </div>
            </div>
            <div className="w-full md:w-64">
              <select
                value={selectedTagId}
                onChange={(e) => setSelectedTagId(e.target.value)}
                className="w-full bg-[#181818] border border-teal-500/30 text-xs text-teal-300 rounded-lg px-3 py-2 focus:outline-none"
              >
                <option value="">-- Select Discount Tag --</option>
                {discountTags.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.code} ({t.type === 'percentage' ? `${t.value}% Off` : `₹${t.value} Off`})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Summary Footer Calculation Card */}
          <div className="p-5 rounded-xl bg-[#161616] border border-white/10 flex flex-col md:flex-row justify-between gap-6">
            <div className="space-y-1 text-xs text-gray-400">
              <p><strong className="text-gray-200">Stage:</strong> {currentStageObj.title} ({currentStageObj.badge})</p>
              <p><strong className="text-gray-200">Beneficiary:</strong> {party.name} ({party.gstin})</p>
              <p><strong className="text-gray-200">Payment Terms:</strong> {paymentSnippet.paymentTerms}</p>
              {includeShipping && (
                <p className="text-teal-400 font-medium">✓ Delivery Challan #{deliveryChallan.challanNo} Linked</p>
              )}
            </div>

            <div className="w-full md:w-72 space-y-2 text-xs">
              <div className="flex justify-between text-gray-400">
                <span>Subtotal</span>
                <span className="font-semibold text-white">₹{subtotal.toLocaleString('en-IN')}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-teal-400 font-medium">
                  <span>Discount ({selectedDiscountTag?.code})</span>
                  <span>- ₹{discountAmount.toLocaleString('en-IN')}</span>
                </div>
              )}
              {gstDetails.taxType === "CGST_SGST" ? (
                <>
                  <div className="flex justify-between text-gray-400">
                    <span>CGST Amount</span>
                    <span>₹{cgstTotal.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>SGST Amount</span>
                    <span>₹{sgstTotal.toLocaleString('en-IN')}</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between text-gray-400">
                  <span>IGST Amount</span>
                  <span>₹{igstTotal.toLocaleString('en-IN')}</span>
                </div>
              )}
              <div className="border-t border-white/10 pt-2 flex justify-between text-sm font-bold text-teal-400">
                <span>Grand Total Payable</span>
                <span>₹{grandTotal.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-white/10 bg-[#181818]">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={handleExportPDF}
              className="flex items-center space-x-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
            >
              <BsFileEarmarkPdf className="text-red-400 text-lg" />
              <span>Export PDF</span>
            </button>
            <button
              onClick={handleSaveDocument}
              className="flex items-center space-x-2 bg-teal-500 hover:bg-teal-400 text-black font-bold px-5 py-2 rounded-xl text-sm shadow-lg shadow-teal-500/20 transition-all"
            >
              <BsCheckCircleFill className="text-base" />
              <span>Save & Issue {currentStageObj.title}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
