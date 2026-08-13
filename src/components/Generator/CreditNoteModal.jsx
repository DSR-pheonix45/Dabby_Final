import React, { useState, useEffect } from "react";
import { BsX, BsArrowReturnLeft, BsLink45Deg, BsCheckCircleFill, BsFileEarmarkPdf, BsCalculator } from "react-icons/bs";
import { toast } from "react-hot-toast";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { getStoredInvoices, saveCreditNote } from "./generatorStore";

export default function CreditNoteModal({ isOpen = true, onClose, isPage = false }) {
  const [cnNumber, setCnNumber] = useState(`CN-${Math.floor(1000 + Math.random() * 9000)}`);
  const [cnDate, setCnDate] = useState(new Date().toISOString().split("T")[0]);

  const [invoices, setInvoices] = useState([]);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState("");
  const [manualInvoiceRef, setManualInvoiceRef] = useState("");

  const [reason, setReason] = useState("Settlement Discount / Volume Adjustment");
  const [settlementType, setSettlementType] = useState("flat"); // 'flat' or 'percent'
  const [settlementValue, setSettlementValue] = useState(5000);
  const [remarks, setRemarks] = useState("Settlement add-on value discount applied per mutual agreement.");

  useEffect(() => {
    const list = getStoredInvoices();
    setInvoices(list);
    if (list.length > 0) {
      setSelectedInvoiceId(list[0].id);
    }
  }, [isOpen]);

  const activeInvoice = invoices.find(i => i.id === selectedInvoiceId);
  const targetInvoiceNo = activeInvoice ? activeInvoice.invoiceNumber : (manualInvoiceRef || "INV-2026-001");
  const targetPartyName = activeInvoice ? activeInvoice.partyName : "Apex Logistics Ltd";
  const targetPartyGstin = activeInvoice ? activeInvoice.partyGstin : "27AABCU9603R1ZM";
  const originalInvoiceAmount = activeInvoice ? activeInvoice.amount : 145000;

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
      doc.text("DABBY ENTERPRISE PVT LTD", 14, 20);

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md font-dm-sans">
      <div className="bg-[#121212] border border-white/10 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
        
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

          {/* Invoice Linking Section */}
          <div className="p-5 rounded-xl bg-white/5 border border-white/5 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-white/10 pb-3">
              <BsLink45Deg className="text-red-400 text-lg" />
              1. Link to Target Invoice
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-400 mb-1">Select Existing System Invoice</label>
                <select
                  value={selectedInvoiceId}
                  onChange={(e) => setSelectedInvoiceId(e.target.value)}
                  className="w-full bg-[#1e1e1e] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none"
                >
                  {invoices.map(inv => (
                    <option key={inv.id} value={inv.id}>
                      {inv.invoiceNumber} - {inv.partyName} (₹{inv.amount.toLocaleString('en-IN')})
                    </option>
                  ))}
                  <option value="custom">-- Custom Reference --</option>
                </select>
              </div>

              {selectedInvoiceId === "custom" && (
                <div>
                  <label className="block text-gray-400 mb-1">Custom Reference Invoice #</label>
                  <input
                    type="text"
                    value={manualInvoiceRef}
                    onChange={(e) => setManualInvoiceRef(e.target.value)}
                    placeholder="e.g. INV-9982"
                    className="w-full bg-[#1e1e1e] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none"
                  />
                </div>
              )}
            </div>

            <div className="p-3 rounded-lg bg-[#181818] border border-white/5 text-gray-300 flex justify-between items-center">
              <div>
                <span className="font-semibold text-white">Linked Target: {targetInvoiceNo}</span>
                <span className="block text-gray-400 text-[11px]">Party: {targetPartyName} | GSTIN: {targetPartyGstin}</span>
              </div>
              <div className="text-right">
                <span className="text-[11px] text-gray-400">Original Invoice Value</span>
                <span className="block font-bold text-white text-sm">₹{originalInvoiceAmount.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          {/* Settlement & Discount Adjustment */}
          <div className="p-5 rounded-xl bg-white/5 border border-white/5 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-white/10 pb-3">
              <BsCalculator className="text-red-400" />
              2. Settlement & Add-on Value Discount
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-gray-400 mb-1">Adjustment Reason</label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full bg-[#1e1e1e] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none"
                >
                  <option value="Settlement Discount / Volume Adjustment">Settlement Discount</option>
                  <option value="Goods Return / Material Defect">Goods Return</option>
                  <option value="Price Difference Correction">Price Difference</option>
                  <option value="Post-Sales Quality Incentive">Quality Incentive</option>
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
                  Settlement Value ({settlementType === 'flat' ? '₹' : '%'})
                </label>
                <input
                  type="number"
                  value={settlementValue}
                  onChange={(e) => setSettlementValue(e.target.value)}
                  className="w-full bg-[#1e1e1e] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none"
                />
              </div>
            </div>

            <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/20 space-y-1">
              <div className="flex justify-between text-gray-300">
                <span>Credit Amount Offset</span>
                <span className="font-bold text-red-400">- ₹{creditAmount.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-gray-400 text-[11px]">
                <span>Estimated GST Reversal (18%)</span>
                <span>₹{gstReversal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
              </div>
              <div className="border-t border-white/10 pt-2 flex justify-between font-semibold text-white">
                <span>Revised Balance Receivable</span>
                <span className="text-emerald-400">₹{revisedInvoiceValue.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-gray-400 mb-1">Remarks & Settlement Agreement</label>
            <textarea
              rows={2}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full bg-[#1e1e1e] border border-white/10 rounded-lg p-2 text-white focus:outline-none"
            />
          </div>

        </div>

        {/* Footer */}
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
              className="flex items-center space-x-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl text-xs font-semibold transition-colors"
            >
              <BsFileEarmarkPdf className="text-red-400 text-base" />
              <span>Export PDF</span>
            </button>
            <button
              onClick={handleSaveCreditNote}
              className="flex items-center space-x-2 bg-red-500 hover:bg-red-400 text-white font-bold px-5 py-2 rounded-xl text-xs shadow-lg shadow-red-500/20 transition-all"
            >
              <BsCheckCircleFill className="text-base" />
              <span>Issue Credit Note</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
