import React, { useState, useEffect } from "react";
import { BsX, BsArrowReturnLeft, BsLink45Deg, BsCheckCircleFill, BsFileEarmarkPdf, BsCalculator } from "react-icons/bs";
import { toast } from "react-hot-toast";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { getStoredInvoices, saveCreditNote } from "./generatorStore";
import PartySelector from "./PartySelector";
import { useWorkbench } from "../../context/WorkbenchContext";
import { getWorkbenchCompanyDetails } from "../../utils/workbenchCompanyHelper";
import { diService } from "../../services/diService";

export default function CreditNoteModal({ isOpen, onClose, isPage = false }) {
  const { activeWorkbench } = useWorkbench();
  const company = getWorkbenchCompanyDetails(activeWorkbench);

  const [cnNumber, setCnNumber] = useState(`CN-${Math.floor(1000 + Math.random() * 9000)}`);
  const [cnDate, setCnDate] = useState(new Date().toISOString().split("T")[0]);

  const [invoices, setInvoices] = useState([]);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState("custom");
  const [manualInvoiceRef, setManualInvoiceRef] = useState("");
  const [selectedParty, setSelectedParty] = useState({ name: "", gstin: "", address: "" });
  const [manualInvoiceAmount, setManualInvoiceAmount] = useState(0);

  const [reason, setReason] = useState("Settlement Discount / Volume Adjustment");
  const [settlementType, setSettlementType] = useState("flat"); // 'flat' or 'percent'
  const [settlementValue, setSettlementValue] = useState(5000);
  const [remarks, setRemarks] = useState("Settlement add-on value discount applied per mutual agreement.");

  useEffect(() => {
    // Purge legacy demo invoices from localStorage
    const rawList = getStoredInvoices();
    const cleanList = rawList.filter(i => 
      i.partyName !== "Apex Logistics Ltd" && 
      i.partyName !== "Zenith Tech Solutions" && 
      !i.id?.includes("2026-001") && 
      !i.id?.includes("2026-002") &&
      !i.id?.includes("2983")
    );
    if (cleanList.length !== rawList.length) {
      try {
        localStorage.setItem('dabby_generator_invoices', JSON.stringify(cleanList));
      } catch (e) {}
    }

    let allInv = [...cleanList];

    // Fetch Doc Vault documents if activeWorkbench exists
    if (activeWorkbench?.id) {
      diService.getDocuments(activeWorkbench.id).then(docs => {
        if (Array.isArray(docs)) {
          const vaultInvoices = docs.map(doc => {
            const note = doc.di_analysis_notes?.[0] || {};
            const recipientName = note.parties?.recipient?.name || note.parties?.issuer?.name || note.party_name || "";
            const invNo = note.document_number || doc.doc_number || doc.file_name?.replace('.pdf', '') || `DOC-${doc.id?.slice(0, 6)}`;
            const amount = note.money?.total_amount || 0;
            const docDate = note.dates?.document_date || doc.created_at?.split('T')[0] || '';

            return {
              id: doc.id || invNo,
              invoiceNumber: invNo,
              partyName: recipientName,
              amount: amount,
              date: docDate,
              source: 'doc_vault'
            };
          });

          const existingIds = new Set(cleanList.map(i => i.id));
          const newVaultItems = vaultInvoices.filter(i => !existingIds.has(i.id) && i.partyName);
          allInv = [...cleanList, ...newVaultItems];
          setInvoices(allInv);
        }
      }).catch(err => {
        console.warn("Doc Vault invoices fetch notice:", err);
      });
    }

    setInvoices(allInv);
  }, [activeWorkbench?.id, isOpen]);

  // Filter invoices belonging to selected party
  const partyInvoices = selectedParty.name
    ? invoices.filter(inv => 
        inv.partyName && inv.partyName.trim().toLowerCase().includes(selectedParty.name.trim().toLowerCase())
      )
    : invoices;

  const handleSelectParty = (p) => {
    const partyObj = { name: p.name || "", gstin: p.gstin || "", address: p.address || "" };
    setSelectedParty(partyObj);

    if (p.name) {
      const matching = invoices.filter(inv => 
        inv.partyName && inv.partyName.trim().toLowerCase().includes(p.name.trim().toLowerCase())
      );
      if (matching.length > 0) {
        const topInv = matching[0];
        setSelectedInvoiceId(topInv.id);
        setManualInvoiceRef(topInv.invoiceNumber || topInv.id);
        setManualInvoiceAmount(Number(topInv.amount) || 0);
      } else {
        setSelectedInvoiceId("custom");
        setManualInvoiceAmount(0);
      }
    }
  };

  const handleInvoiceChange = (invId) => {
    setSelectedInvoiceId(invId);
    if (invId === "custom") {
      // Keep manual reference mode
    } else {
      const match = invoices.find(i => i.id === invId);
      if (match) {
        setManualInvoiceRef(match.invoiceNumber || match.id);
        setManualInvoiceAmount(Number(match.amount) || 0);
        if (match.partyName && !selectedParty.name) {
          setSelectedParty(prev => ({ ...prev, name: match.partyName, gstin: match.partyGstin || prev.gstin }));
        }
      }
    }
  };

  const activeInvoice = invoices.find(i => i.id === selectedInvoiceId);
  const isCustomRef = selectedInvoiceId === "custom" || !activeInvoice;

  const targetInvoiceNo = isCustomRef ? (manualInvoiceRef || "INV-REF") : (activeInvoice.invoiceNumber || activeInvoice.id);
  const targetPartyName = selectedParty.name || (activeInvoice ? activeInvoice.partyName : "Customer");
  const targetPartyGstin = selectedParty.gstin || (activeInvoice ? activeInvoice.partyGstin : "");
  const originalInvoiceAmount = isCustomRef ? (Number(manualInvoiceAmount) || 0) : (Number(activeInvoice.amount) || 0);

  // Settlement Discount calculation
  let creditAmount = 0;
  if (settlementType === "flat") {
    creditAmount = Number(settlementValue) || 0;
  } else {
    creditAmount = (originalInvoiceAmount * (Number(settlementValue) || 0)) / 100;
  }

  // Tax reversal component (assuming standard 18% GST portion)
  const gstReversal = (creditAmount * 18) / 118;
  const taxableCredit = creditAmount - gstReversal;
  const revisedInvoiceValue = Math.max(0, originalInvoiceAmount - creditAmount);

  const handleExportPDF = () => {
    try {
      const doc = new jsPDF();
      doc.setFontSize(20);
      doc.setTextColor(239, 68, 68);
      doc.text(company.legalName || company.name || activeWorkbench?.name || "WORKBENCH COMPANY", 14, 20);

      doc.setFontSize(14);
      doc.setTextColor(40, 40, 40);
      doc.text("CREDIT NOTE", 14, 28);

      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Credit Note #: ${cnNumber}`, 14, 35);
      doc.text(`Date: ${cnDate}`, 14, 40);

      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      doc.text("LINKED INVOICE DETAILS:", 120, 28);
      doc.setFontSize(10);
      doc.setTextColor(60, 60, 60);
      doc.text(`Target Invoice: ${targetInvoiceNo}`, 120, 34);
      doc.text(`Party: ${targetPartyName}`, 120, 39);
      doc.text(`GSTIN: ${targetPartyGstin}`, 120, 44);

      const tableData = [
        ["Original Invoice Amount", `Rs. ${originalInvoiceAmount.toLocaleString('en-IN')}`],
        ["Adjustment Reason", reason],
        ["Settlement Add-on Discount Value", `Rs. ${creditAmount.toLocaleString('en-IN')}`],
        ["Taxable Base Reversal", `Rs. ${taxableCredit.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`],
        ["GST Tax Reversal (18%)", `Rs. ${gstReversal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`],
        ["Revised Net Invoice Payable", `Rs. ${revisedInvoiceValue.toLocaleString('en-IN')}`]
      ];

      autoTable(doc, {
        startY: 50,
        head: [['Adjustment Parameter', 'Amount / Detail']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [239, 68, 68] }
      });

      let finalY = doc.lastAutoTable.finalY + 15;
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.text("REMARKS & NOTES:", 14, finalY);
      doc.setTextColor(80, 80, 80);
      doc.text(remarks, 14, finalY + 5);

      doc.save(`${cnNumber}_CreditNote.pdf`);
      toast.success("Exported Credit Note PDF!");
    } catch (e) {
      console.error(e);
      toast.error("Failed to generate Credit Note PDF");
    }
  };

  const handleSaveCreditNote = () => {
    const cnObj = {
      id: cnNumber,
      cnNumber,
      cnDate,
      linkedInvoiceNo: targetInvoiceNo,
      partyName: targetPartyName,
      partyGstin: targetPartyGstin,
      originalAmount: originalInvoiceAmount,
      reason,
      creditAmount,
      revisedAmount: revisedInvoiceValue,
      remarks,
      status: "Issued"
    };
    saveCreditNote(cnObj);
    toast.success(`Credit Note ${cnNumber} linked to ${targetInvoiceNo} issued!`);
    onClose();
  };

  if (!isOpen && !isPage) return null;

  const content = (
    <div className={`bg-[#121212] border border-white/10 rounded-2xl w-full overflow-hidden shadow-2xl flex flex-col ${
      isPage ? "max-w-6xl mx-auto my-6 border border-white/10" : "max-w-3xl max-h-[90vh]"
    }`}>
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#181818]">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400">
              <BsArrowReturnLeft size={22} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">Credit Note & Settlement Builder</h2>
              <p className="text-xs text-gray-400">Link to any sales invoice to apply settlement add-on value discounts & price adjustments</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors">
            <BsX size={26} />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1 text-xs">
          
          {/* Metadata */}
          <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-white/5 border border-white/5">
            <div>
              <label className="block font-semibold text-gray-400 mb-1">Credit Note Number</label>
              <input
                type="text"
                value={cnNumber}
                onChange={(e) => setCnNumber(e.target.value)}
                className="w-full bg-[#1e1e1e] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-red-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-gray-400 mb-1">Credit Note Date</label>
              <input
                type="date"
                value={cnDate}
                onChange={(e) => setCnDate(e.target.value)}
                className="w-full bg-[#1e1e1e] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-red-500"
              />
            </div>
          </div>

          {/* Invoice Linking & Party Selection */}
          <div className="p-5 rounded-xl bg-white/5 border border-white/5 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-white/10 pb-3">
              <BsLink45Deg className="text-red-400 text-lg" />
              1. Party Selection & System Invoice Linking
            </h3>

            {/* Row 1: Party Selector & Invoice Dropdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-400 mb-1 font-semibold">Select Customer / Workbench Party</label>
                <PartySelector
                  value={selectedParty.name}
                  placeholder="Select or Search Client..."
                  filterType="customer"
                  onSelectParty={handleSelectParty}
                />
              </div>

              <div>
                <label className="block text-gray-400 mb-1 font-semibold">
                  Select System Invoice {selectedParty.name ? `for ${selectedParty.name}` : ""}
                </label>
                <select
                  value={selectedInvoiceId}
                  onChange={(e) => handleInvoiceChange(e.target.value)}
                  className="w-full bg-[#1e1e1e] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none"
                >
                  <option value="custom">-- Enter Custom / External Invoice Reference --</option>
                  {partyInvoices.map(inv => (
                    <option key={inv.id} value={inv.id}>
                      {inv.invoiceNumber || inv.id} — ₹{Number(inv.amount || 0).toLocaleString('en-IN')} ({inv.date || 'Issued'})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Status notification when invoices found for party */}
            {selectedParty.name && partyInvoices.length > 0 && selectedInvoiceId !== "custom" && (
              <div className="p-3 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-300 text-xs flex items-center justify-between">
                <span>
                  ✓ Auto-linked to invoice <strong>{targetInvoiceNo}</strong> (Original Value: ₹{originalInvoiceAmount.toLocaleString("en-IN")})
                </span>
                <span className="text-[11px] bg-teal-500/20 px-2.5 py-0.5 rounded-full text-teal-200 font-semibold">
                  {partyInvoices.length} Invoice(s) Found
                </span>
              </div>
            )}

            {/* Status notification when no invoices found for party */}
            {selectedParty.name && partyInvoices.length === 0 && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
                ℹ No recorded system invoices found for <strong>{selectedParty.name}</strong>. You can enter a custom invoice reference below.
              </div>
            )}

            {/* Custom reference inputs */}
            {(selectedInvoiceId === "custom" || partyInvoices.length === 0) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-white/5">
                <div>
                  <label className="block text-gray-400 mb-1">Custom Reference Invoice #</label>
                  <input
                    type="text"
                    value={manualInvoiceRef}
                    onChange={(e) => setManualInvoiceRef(e.target.value)}
                    placeholder="e.g. INV-9982"
                    className="w-full bg-[#1e1e1e] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 mb-1">Original Invoice Value (₹)</label>
                  <input
                    type="number"
                    value={manualInvoiceAmount}
                    onChange={(e) => setManualInvoiceAmount(parseFloat(e.target.value) || 0)}
                    placeholder="e.g. 50000"
                    className="w-full bg-[#1e1e1e] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none font-mono"
                  />
                </div>
              </div>
            )}

            {/* Summary card */}
            <div className="p-3.5 rounded-xl bg-[#181818] border border-white/5 text-gray-300 flex justify-between items-center">
              <div>
                <span className="font-semibold text-white">Linked Target: {targetInvoiceNo}</span>
                <span className="block text-gray-400 text-[11px]">
                  Party: {targetPartyName} {targetPartyGstin ? `| GSTIN: ${targetPartyGstin}` : ""}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[11px] text-gray-400 block">Original Invoice Value</span>
                <span className="font-bold text-white text-base">₹{originalInvoiceAmount.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          {/* Settlement & Discount Details */}
          <div className="p-5 rounded-xl bg-white/5 border border-white/5 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-white/10 pb-3">
              <BsCalculator className="text-red-400 text-lg" />
              2. Settlement & Add-On Value Discount
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-gray-400 mb-1">Adjustment Reason</label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full bg-[#1e1e1e] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none"
                >
                  <option value="Settlement Discount">Settlement Discount</option>
                  <option value="Volume / Add-on Value Rebate">Volume / Add-on Value Rebate</option>
                  <option value="Price Difference Adjustment">Price Difference Adjustment</option>
                  <option value="Goods Return / Damage Offset">Goods Return / Damage Offset</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-400 mb-1">Discount Unit</label>
                <select
                  value={settlementType}
                  onChange={(e) => setSettlementType(e.target.value)}
                  className="w-full bg-[#1e1e1e] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none"
                >
                  <option value="flat">Flat Amount (₹)</option>
                  <option value="percent">Percentage (%)</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-400 mb-1">
                  Settlement Value {settlementType === "percent" ? "(%)" : "(₹)"}
                </label>
                <input
                  type="number"
                  value={settlementValue}
                  onChange={(e) => setSettlementValue(parseFloat(e.target.value) || 0)}
                  className="w-full bg-[#1e1e1e] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none font-bold"
                />
              </div>
            </div>

            {/* Calculations Breakdown Box */}
            <div className="p-4 rounded-xl bg-red-950/20 border border-red-500/20 space-y-2">
              <div className="flex justify-between items-center font-bold text-red-400 text-sm">
                <span>Credit Amount Offset:</span>
                <span>- ₹{creditAmount.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between items-center text-gray-400 text-[11px]">
                <span>Estimated GST Reversal (18% Portion):</span>
                <span>₹{gstReversal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
              </div>
              <div className="border-t border-white/10 pt-2 flex justify-between items-center font-bold text-white text-xs">
                <span>Revised Balance Receivable:</span>
                <span className="text-teal-400 text-sm font-mono">₹{revisedInvoiceValue.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-gray-400 mb-1">Remarks & Notes</label>
            <textarea
              rows={2}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full bg-[#1e1e1e] border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-red-500"
            />
          </div>

        </div>

        {/* Footer */}
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
              onClick={handleSaveCreditNote}
              className="flex items-center space-x-2 bg-red-600 hover:bg-red-500 text-white font-bold px-5 py-2 rounded-xl text-xs shadow-lg shadow-red-600/20 transition-all"
            >
              <BsCheckCircleFill className="text-sm" />
              <span>Save & Issue Credit Note</span>
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
