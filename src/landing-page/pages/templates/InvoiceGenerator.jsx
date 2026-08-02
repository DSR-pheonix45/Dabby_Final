import React, { useState } from "react";
import { useTheme } from "../../../context/ThemeContext";
import { Link } from "react-router-dom";
import { ArrowLeft, Download, Plus, Trash2, Printer } from "lucide-react";
import { generateStandardDocumentPDF } from "../../../utils/documentPdfGenerator";
import PrintableDocumentTemplate from "../../../components/Generator/PrintableDocumentTemplate";
import ColumnConfigurator from "../../../components/Generator/ColumnConfigurator";

export default function InvoiceGenerator() {
  const { theme } = useTheme();
  const [invoiceData, setInvoiceData] = useState({
    documentType: "TAX INVOICE",
    invoiceNumber: "INV-1001",
    date: new Date().toISOString().split('T')[0],
    dueDate: "",

    // Sender / Business
    senderName: "Archzona",
    senderAddress: "105, PRISM INDUSTRIAL ESTATE, BEHIND PENDARKAR COLLEGE, DOMBIVLI(EAST)421201",
    senderGstin: "7ACDFA4175F1ZJ",
    senderMobile: "9870048082",
    senderEmail: "info.archzona@gmail.com",
    logo: null,

    // Client / Bill To & Ship To
    clientName: "RATNA DEEP CHS",
    clientAddress: "Mulund",
    placeOfSupply: "Maharashtra",
    clientGstin: "",

    shipToName: "RATNA DEEP CHS",
    shipToAddress: "Mulund",

    // Items
    items: [
      {
        description: "100 MM x 50 MM UPVC louver Profile",
        subDetails: "",
        hsn: "39162019",
        qty: 6900,
        unit: "RFT",
        rate: 115
      },
      {
        description: "MS FABRICATION WORK 115'X30'",
        subDetails: "",
        hsn: "7308",
        qty: 1,
        unit: "pcs",
        rate: 240000
      }
    ],

    taxRate: 18,
    isIgst: false,

    notes: "T-Patti for top,bottom & center support\n2\"X 2\" Pipe Ms Fabrication For Fins Support With Material And installation",
    terms: "50% Advance\n30% ongoing work\n20% after completion",

    bankDetails: {
      name: "Archzona",
      ifsc: "UTIB000125",
      accountNo: "923020053039794",
      bankName: "AXIS BANK, Dombivli"
    },
    authorisedSignatory: "Archzona"
  });

  const [columnLabels, setColumnLabels] = useState({
    sno: "S.NO.",
    items: "ITEMS",
    hsn: "HSN",
    qty: "QTY.",
    unit: "UNIT",
    rate: "RATE",
    amount: "AMOUNT"
  });
  const [showSeparateUnitCol, setShowSeparateUnitCol] = useState(false);

  const [activeTab, setActiveTab] = useState("edit"); // edit | preview

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setInvoiceData(prev => ({ ...prev, [name]: value }));
  };

  const handleBankChange = (e) => {
    const { name, value } = e.target;
    setInvoiceData(prev => ({
      ...prev,
      bankDetails: { ...prev.bankDetails, [name]: value }
    }));
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...invoiceData.items];
    newItems[index][field] = field === "qty" || field === "rate" ? parseFloat(value) || 0 : value;
    setInvoiceData(prev => ({ ...prev, items: newItems }));
  };

  const addItem = () => {
    setInvoiceData(prev => ({
      ...prev,
      items: [
        ...prev.items,
        { description: "", subDetails: "", hsn: "", qty: 1, unit: "pcs", rate: 0 }
      ]
    }));
  };

  const removeItem = (index) => {
    const newItems = invoiceData.items.filter((_, i) => i !== index);
    setInvoiceData(prev => ({ ...prev, items: newItems }));
  };

  const handleExportPDF = () => {
    const doc = generateStandardDocumentPDF({
      documentType: "TAX INVOICE",
      docNumber: invoiceData.invoiceNumber,
      docDate: invoiceData.date,
      dueDate: invoiceData.dueDate,
      senderName: invoiceData.senderName,
      senderAddress: invoiceData.senderAddress,
      senderGstin: invoiceData.senderGstin,
      senderMobile: invoiceData.senderMobile,
      senderEmail: invoiceData.senderEmail,
      logo: invoiceData.logo,
      clientName: invoiceData.clientName,
      clientAddress: invoiceData.clientAddress,
      placeOfSupply: invoiceData.placeOfSupply,
      shipToName: invoiceData.shipToName,
      shipToAddress: invoiceData.shipToAddress,
      items: invoiceData.items,
      taxRate: invoiceData.taxRate,
      isIgst: invoiceData.isIgst,
      columnLabels,
      showSeparateUnitCol,
      notes: invoiceData.notes,
      terms: invoiceData.terms,
      bankDetails: invoiceData.bankDetails,
      authorisedSignatory: invoiceData.authorisedSignatory
    });

    doc.save(`${invoiceData.invoiceNumber}_Invoice.pdf`);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className={`min-h-screen ${theme === "dark" ? "bg-[#0b0f19] text-white" : "bg-gray-50 text-gray-900"} font-sans pb-16`}>
      {/* Top Header Bar */}
      <div className={`border-b ${theme === "dark" ? "border-white/10 bg-[#111827]" : "border-gray-200 bg-white"} sticky top-0 z-30 shadow-sm print:hidden`}>
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link to="/templates" className="p-2 rounded-lg hover:bg-white/5 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl font-bold">Tax Invoice Generator</h1>
              <p className="text-xs opacity-60">Generate structured, professional Tax Invoice PDFs</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="flex rounded-lg bg-gray-200 dark:bg-white/10 p-1">
              <button
                onClick={() => setActiveTab("edit")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  activeTab === "edit" ? "bg-teal-600 text-white shadow" : "text-gray-600 dark:text-gray-300"
                }`}
              >
                Form Editor
              </button>
              <button
                onClick={() => setActiveTab("preview")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  activeTab === "preview" ? "bg-teal-600 text-white shadow" : "text-gray-600 dark:text-gray-300"
                }`}
              >
                Document Preview
              </button>
            </div>

            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-lg text-xs flex items-center gap-2"
            >
              <Printer className="w-4 h-4" /> Print
            </button>

            <button
              onClick={handleExportPDF}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-lg text-xs flex items-center gap-2"
            >
              <Download className="w-4 h-4" /> Download PDF
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {activeTab === "preview" ? (
          <div className="p-4 bg-gray-200 dark:bg-gray-900 rounded-2xl border border-gray-300 dark:border-white/10 shadow-2xl">
            <PrintableDocumentTemplate
              data={{
                documentType: "TAX INVOICE",
                docNumber: invoiceData.invoiceNumber,
                docDate: invoiceData.date,
                senderName: invoiceData.senderName,
                senderAddress: invoiceData.senderAddress,
                senderGstin: invoiceData.senderGstin,
                senderMobile: invoiceData.senderMobile,
                senderEmail: invoiceData.senderEmail,
                logo: invoiceData.logo,
                clientName: invoiceData.clientName,
                clientAddress: invoiceData.clientAddress,
                placeOfSupply: invoiceData.placeOfSupply,
                shipToName: invoiceData.shipToName,
                shipToAddress: invoiceData.shipToAddress,
                items: invoiceData.items,
                taxRate: invoiceData.taxRate,
                isIgst: invoiceData.isIgst,
                columnLabels,
                showSeparateUnitCol,
                notes: invoiceData.notes,
                terms: invoiceData.terms,
                bankDetails: invoiceData.bankDetails,
                authorisedSignatory: invoiceData.authorisedSignatory
              }}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column: Form Controls */}
            <div className="lg:col-span-6 space-y-6">
              {/* Document Info */}
              <div className={`p-6 rounded-2xl border ${theme === "dark" ? "bg-[#111827] border-white/10" : "bg-white border-gray-200"} shadow-sm`}>
                <h2 className="text-base font-bold border-b pb-2 mb-4 text-teal-400">1. Invoice Details</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold mb-1 opacity-70">Invoice No.</label>
                    <input
                      type="text"
                      name="invoiceNumber"
                      value={invoiceData.invoiceNumber}
                      onChange={handleInputChange}
                      className={`w-full p-2.5 rounded-lg border text-sm ${theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-gray-50 border-gray-300"}`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1 opacity-70">Invoice Date</label>
                    <input
                      type="date"
                      name="date"
                      value={invoiceData.date}
                      onChange={handleInputChange}
                      className={`w-full p-2.5 rounded-lg border text-sm ${theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-gray-50 border-gray-300"}`}
                    />
                  </div>
                </div>
              </div>

              {/* Your Business Details */}
              <div className={`p-6 rounded-2xl border ${theme === "dark" ? "bg-[#111827] border-white/10" : "bg-white border-gray-200"} shadow-sm space-y-3`}>
                <h2 className="text-base font-bold border-b pb-2 mb-4 text-teal-400">2. Your Business Details (Header)</h2>
                <div>
                  <label className="block text-xs font-semibold mb-1 opacity-70">Business Name</label>
                  <input
                    type="text"
                    name="senderName"
                    value={invoiceData.senderName}
                    onChange={handleInputChange}
                    className={`w-full p-2.5 rounded-lg border text-sm ${theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-gray-50 border-gray-300"}`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1 opacity-70">Business Address</label>
                  <textarea
                    name="senderAddress"
                    rows="2"
                    value={invoiceData.senderAddress}
                    onChange={handleInputChange}
                    className={`w-full p-2.5 rounded-lg border text-sm ${theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-gray-50 border-gray-300"}`}
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1 opacity-70">GSTIN</label>
                    <input
                      type="text"
                      name="senderGstin"
                      value={invoiceData.senderGstin}
                      onChange={handleInputChange}
                      className={`w-full p-2.5 rounded-lg border text-sm ${theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-gray-50 border-gray-300"}`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1 opacity-70">Mobile</label>
                    <input
                      type="text"
                      name="senderMobile"
                      value={invoiceData.senderMobile}
                      onChange={handleInputChange}
                      className={`w-full p-2.5 rounded-lg border text-sm ${theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-gray-50 border-gray-300"}`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1 opacity-70">Email</label>
                    <input
                      type="email"
                      name="senderEmail"
                      value={invoiceData.senderEmail}
                      onChange={handleInputChange}
                      className={`w-full p-2.5 rounded-lg border text-sm ${theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-gray-50 border-gray-300"}`}
                    />
                  </div>
                </div>
              </div>

              {/* Billing & Shipping Details */}
              <div className={`p-6 rounded-2xl border ${theme === "dark" ? "bg-[#111827] border-white/10" : "bg-white border-gray-200"} shadow-sm space-y-4`}>
                <h2 className="text-base font-bold border-b pb-2 text-teal-400">3. Billing & Shipping Details</h2>
                
                <div className="space-y-3">
                  <span className="text-xs font-bold uppercase text-gray-400">Bill To</span>
                  <input
                    type="text"
                    name="clientName"
                    placeholder="Client Name / Business"
                    value={invoiceData.clientName}
                    onChange={handleInputChange}
                    className={`w-full p-2.5 rounded-lg border text-sm ${theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-gray-50 border-gray-300"}`}
                  />
                  <input
                    type="text"
                    name="clientAddress"
                    placeholder="Billing Address"
                    value={invoiceData.clientAddress}
                    onChange={handleInputChange}
                    className={`w-full p-2.5 rounded-lg border text-sm ${theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-gray-50 border-gray-300"}`}
                  />
                  <input
                    type="text"
                    name="placeOfSupply"
                    placeholder="Place of Supply (e.g. Maharashtra)"
                    value={invoiceData.placeOfSupply}
                    onChange={handleInputChange}
                    className={`w-full p-2.5 rounded-lg border text-sm ${theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-gray-50 border-gray-300"}`}
                  />
                </div>

                <div className="space-y-3 pt-2">
                  <span className="text-xs font-bold uppercase text-gray-400">Ship To</span>
                  <input
                    type="text"
                    name="shipToName"
                    placeholder="Consignee Name"
                    value={invoiceData.shipToName}
                    onChange={handleInputChange}
                    className={`w-full p-2.5 rounded-lg border text-sm ${theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-gray-50 border-gray-300"}`}
                  />
                  <input
                    type="text"
                    name="shipToAddress"
                    placeholder="Shipping Address"
                    value={invoiceData.shipToAddress}
                    onChange={handleInputChange}
                    className={`w-full p-2.5 rounded-lg border text-sm ${theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-gray-50 border-gray-300"}`}
                  />
                </div>
              </div>

              {/* Items & Tax */}
              <div className={`p-6 rounded-2xl border ${theme === "dark" ? "bg-[#111827] border-white/10" : "bg-white border-gray-200"} shadow-sm space-y-4`}>
                <div className="flex justify-between items-center border-b pb-2">
                  <h2 className="text-base font-bold text-teal-400">4. Items & Tax Configuration</h2>
                  <button onClick={addItem} className="text-xs font-bold text-teal-400 hover:underline flex items-center gap-1">
                    <Plus className="w-3.5 h-3.5" /> Add Item
                  </button>
                </div>

                {/* Column Configurator Panel */}
                <ColumnConfigurator
                  columnLabels={columnLabels}
                  setColumnLabels={setColumnLabels}
                  showSeparateUnitCol={showSeparateUnitCol}
                  setShowSeparateUnitCol={setShowSeparateUnitCol}
                  theme={theme}
                />

                <div className="space-y-4">
                  {invoiceData.items.map((item, idx) => (
                    <div key={idx} className="p-3 rounded-lg border border-white/10 bg-white/5 space-y-2 relative">
                      <button onClick={() => removeItem(idx)} className="absolute top-2 right-2 text-red-400 hover:text-red-300">
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <input
                        type="text"
                        placeholder="Item Description"
                        value={item.description}
                        onChange={(e) => handleItemChange(idx, "description", e.target.value)}
                        className={`w-full p-2 rounded border text-xs ${theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-300"}`}
                      />
                      <input
                        type="text"
                        placeholder="Sub Details / Specs"
                        value={item.subDetails}
                        onChange={(e) => handleItemChange(idx, "subDetails", e.target.value)}
                        className={`w-full p-2 rounded border text-xs ${theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-300"}`}
                      />
                      <div className="grid grid-cols-4 gap-2">
                        <input
                          type="text"
                          placeholder="HSN Code"
                          value={item.hsn}
                          onChange={(e) => handleItemChange(idx, "hsn", e.target.value)}
                          className={`p-2 rounded border text-xs ${theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-300"}`}
                        />
                        <input
                          type="number"
                          placeholder={columnLabels?.qty || "Qty"}
                          value={item.qty}
                          onChange={(e) => handleItemChange(idx, "qty", e.target.value)}
                          className={`p-2 rounded border text-xs ${theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-300"}`}
                        />
                        <input
                          type="text"
                          placeholder={columnLabels?.unit || "Unit (RFT, sqft, pcs)"}
                          value={item.unit}
                          onChange={(e) => handleItemChange(idx, "unit", e.target.value)}
                          className={`p-2 rounded border text-xs ${theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-300"}`}
                        />
                        <input
                          type="number"
                          placeholder={columnLabels?.rate || "Rate (₹)"}
                          value={item.rate}
                          onChange={(e) => handleItemChange(idx, "rate", e.target.value)}
                          className={`p-2 rounded border text-xs ${theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-300"}`}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="block text-xs font-semibold mb-1 opacity-70">GST Rate (%)</label>
                    <input
                      type="number"
                      name="taxRate"
                      value={invoiceData.taxRate}
                      onChange={handleInputChange}
                      className={`w-full p-2.5 rounded-lg border text-sm ${theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-gray-50 border-gray-300"}`}
                    />
                  </div>
                </div>
              </div>

              {/* Bank Details & Terms */}
              <div className={`p-6 rounded-2xl border ${theme === "dark" ? "bg-[#111827] border-white/10" : "bg-white border-gray-200"} shadow-sm space-y-4`}>
                <h2 className="text-base font-bold border-b pb-2 text-teal-400">5. Bank Details & Terms</h2>
                <div className="space-y-3">
                  <span className="text-xs font-bold uppercase text-gray-400">Bank Details</span>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      name="name"
                      placeholder="Account Name"
                      value={invoiceData.bankDetails.name}
                      onChange={handleBankChange}
                      className={`p-2 rounded border text-xs ${theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-gray-50 border-gray-300"}`}
                    />
                    <input
                      type="text"
                      name="ifsc"
                      placeholder="IFSC Code"
                      value={invoiceData.bankDetails.ifsc}
                      onChange={handleBankChange}
                      className={`p-2 rounded border text-xs ${theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-gray-50 border-gray-300"}`}
                    />
                    <input
                      type="text"
                      name="accountNo"
                      placeholder="Account Number"
                      value={invoiceData.bankDetails.accountNo}
                      onChange={handleBankChange}
                      className={`p-2 rounded border text-xs ${theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-gray-50 border-gray-300"}`}
                    />
                    <input
                      type="text"
                      name="bankName"
                      placeholder="Bank & Branch Name"
                      value={invoiceData.bankDetails.bankName}
                      onChange={handleBankChange}
                      className={`p-2 rounded border text-xs ${theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-gray-50 border-gray-300"}`}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1 opacity-70">Notes</label>
                  <textarea
                    name="notes"
                    rows="2"
                    value={invoiceData.notes}
                    onChange={handleInputChange}
                    className={`w-full p-2.5 rounded-lg border text-xs ${theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-gray-50 border-gray-300"}`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1 opacity-70">Terms and Conditions</label>
                  <textarea
                    name="terms"
                    rows="2"
                    value={invoiceData.terms}
                    onChange={handleInputChange}
                    className={`w-full p-2.5 rounded-lg border text-xs ${theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-gray-50 border-gray-300"}`}
                  />
                </div>
              </div>
            </div>

            {/* Right Column: Live Document Preview */}
            <div className="lg:col-span-6 sticky top-24 self-start">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Live Paper Preview</span>
                <span className="text-[11px] text-teal-400 font-semibold">Updates real-time</span>
              </div>
              <div className="transform scale-[0.9] origin-top-left">
                <PrintableDocumentTemplate
                  data={{
                    documentType: "TAX INVOICE",
                    docNumber: invoiceData.invoiceNumber,
                    docDate: invoiceData.date,
                    senderName: invoiceData.senderName,
                    senderAddress: invoiceData.senderAddress,
                    senderGstin: invoiceData.senderGstin,
                    senderMobile: invoiceData.senderMobile,
                    senderEmail: invoiceData.senderEmail,
                    logo: invoiceData.logo,
                    clientName: invoiceData.clientName,
                    clientAddress: invoiceData.clientAddress,
                    placeOfSupply: invoiceData.placeOfSupply,
                    shipToName: invoiceData.shipToName,
                    shipToAddress: invoiceData.shipToAddress,
                    items: invoiceData.items,
                    taxRate: invoiceData.taxRate,
                    isIgst: invoiceData.isIgst,
                    columnLabels,
                    showSeparateUnitCol,
                    notes: invoiceData.notes,
                    terms: invoiceData.terms,
                    bankDetails: invoiceData.bankDetails,
                    authorisedSignatory: invoiceData.authorisedSignatory
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
