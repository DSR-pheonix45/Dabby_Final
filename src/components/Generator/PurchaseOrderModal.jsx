import React, { useState } from "react";
import { BsX, BsCartCheck, BsPlus, BsTrash, BsFileEarmarkPdf, BsCheckCircleFill, BsBuilding } from "react-icons/bs";
import { toast } from "react-hot-toast";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { savePO } from "./generatorStore";
import { useWorkbench } from "../../context/WorkbenchContext";
import { useAuth } from "../../hooks/useAuth";
import { getWorkbenchCompanyDetails } from "../../utils/workbenchCompanyHelper";
import { saveDocumentToDocVaultAndEngine } from "../../utils/docVaultExporter";
import PartySelector from "./PartySelector";

const PRESET_VENDORS = [
  { name: "RawMat India Supplies", gstin: "27AABCR9911P1ZK", address: "GIDC Industrial Estate, Vadodara, GJ - 390010", email: "orders@rawmat.in" },
  { name: "Precision Steels & Alloys", gstin: "24AAACP4412Q1ZX", address: "Steel Market, Kalamboli, Navi Mumbai, MH - 410218", email: "sales@precisionsteels.com" },
  { name: "MicroChip Components Ltd", gstin: "29AAACM8877K1Z9", address: "Electronics City, Bengaluru, KA - 560100", email: "procurement@microchipcomponents.in" }
];

export default function PurchaseOrderModal({ isOpen, onClose }) {
  const { activeWorkbench } = useWorkbench();
  const { user } = useAuth();
  const company = getWorkbenchCompanyDetails(activeWorkbench, user);

  const [poNumber, setPoNumber] = useState(`PO-${Math.floor(1000 + Math.random() * 9000)}`);
  const [poDate, setPoDate] = useState(new Date().toISOString().split("T")[0]);
  const [deliveryDate, setDeliveryDate] = useState("");

  const [vendor, setVendor] = useState({
    name: "",
    gstin: "",
    address: "",
    email: ""
  });

  const [items, setItems] = useState([
    { id: 1, sku: "", description: "", qty: 1, expectedRate: 0, targetDate: "" }
  ]);

  const [instructions, setInstructions] = useState("");

  const handleVendorPreset = (e) => {
    const matched = PRESET_VENDORS.find(v => v.name === e.target.value);
    if (matched) setVendor(matched);
  };

  const addItem = () => {
    setItems([
      ...items,
      { id: Date.now(), sku: "", description: "", qty: 1, expectedRate: 0, targetDate: "" }
    ]);
  };

  const updateItem = (id, field, value) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const removeItem = (id) => {
    if (items.length === 1) return toast.error("At least one item is required in Purchase Order.");
    setItems(items.filter(item => item.id !== id));
  };

  const totalAmount = items.reduce((sum, item) => sum + (Number(item.qty || 0) * Number(item.expectedRate || 0)), 0);

  const handleExportPDF = () => {
    try {
      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.setTextColor(20, 184, 166);
      doc.text((company.legalName || company.name).toUpperCase(), 14, 20);

      doc.setFontSize(10);
      doc.setTextColor(80, 80, 80);
      doc.text(company.address, 14, 26);
      doc.text(`GSTIN: ${company.gstin} | PAN: ${company.pan} ${company.cin ? '| CIN: ' + company.cin : ''}`, 14, 31);

      doc.setFontSize(13);
      doc.setTextColor(40, 40, 40);
      doc.text("PURCHASE ORDER (PO)", 14, 39);

      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text(`PO #: ${poNumber}`, 14, 45);
      doc.text(`PO Date: ${poDate}`, 14, 50);

      // Vendor block
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      doc.text("VENDOR DETAILS:", 120, 28);
      doc.setFontSize(10);
      doc.setTextColor(60, 60, 60);
      doc.text(vendor.name, 120, 34);
      doc.text(`GSTIN: ${vendor.gstin}`, 120, 39);
      doc.text(`Email: ${vendor.email}`, 120, 44);

      const tableData = items.map((item, idx) => [
        idx + 1,
        item.sku || "N/A",
        item.description,
        item.qty,
        `Rs. ${Number(item.expectedRate).toLocaleString('en-IN')}`,
        item.targetDate || deliveryDate || "ASAP",
        `Rs. ${(item.qty * item.expectedRate).toLocaleString('en-IN')}`
      ]);

      autoTable(doc, {
        startY: 50,
        head: [['#', 'SKU', 'Required Material Description', 'Qty', 'Expected Rate', 'Target Date', 'Total (Rs.)']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [20, 184, 166] }
      });

      let finalY = doc.lastAutoTable.finalY + 10;
      doc.setFontSize(12);
      doc.setTextColor(20, 184, 166);
      doc.text(`Estimated Order Total: Rs. ${totalAmount.toLocaleString('en-IN')}`, 120, finalY);

      finalY += 15;
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.text("VENDOR INSTRUCTIONS & TERMS:", 14, finalY);
      doc.setTextColor(80, 80, 80);
      doc.text(instructions, 14, finalY + 5);

      doc.save(`${poNumber}_PO.pdf`);
      toast.success("Exported Purchase Order PDF!");
    } catch (e) {
      console.error(e);
      toast.error("Failed to export PO PDF");
    }
  };

  const [isSavingDoc, setIsSavingDoc] = useState(false);

  const handleSavePO = async () => {
    setIsSavingDoc(true);
    try {
      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.setTextColor(20, 184, 166);
      doc.text((company.legalName || company.name).toUpperCase(), 14, 20);

      doc.setFontSize(10);
      doc.setTextColor(80, 80, 80);
      doc.text(company.address, 14, 26);
      doc.text(`GSTIN: ${company.gstin} | PAN: ${company.pan} ${company.cin ? '| CIN: ' + company.cin : ''}`, 14, 31);

      doc.setFontSize(13);
      doc.setTextColor(40, 40, 40);
      doc.text("PURCHASE ORDER (PO)", 14, 39);

      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text(`PO #: ${poNumber}`, 14, 45);
      doc.text(`PO Date: ${poDate}`, 14, 50);

      // Vendor block
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      doc.text("VENDOR DETAILS:", 120, 28);
      doc.setFontSize(10);
      doc.setTextColor(60, 60, 60);
      doc.text(vendor.name || "Vendor", 120, 34);
      doc.text(`GSTIN: ${vendor.gstin || "N/A"}`, 120, 39);
      doc.text(`Email: ${vendor.email || "N/A"}`, 120, 44);

      const tableData = items.map((item, idx) => [
        idx + 1,
        item.sku || "N/A",
        item.description || "Item",
        item.qty,
        `Rs. ${Number(item.expectedRate || 0).toLocaleString('en-IN')}`,
        item.targetDate || deliveryDate || "ASAP",
        `Rs. ${(Number(item.qty || 0) * Number(item.expectedRate || 0)).toLocaleString('en-IN')}`
      ]);

      autoTable(doc, {
        startY: 50,
        head: [['#', 'SKU', 'Required Material Description', 'Qty', 'Expected Rate', 'Target Date', 'Total (Rs.)']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [20, 184, 166] }
      });

      await saveDocumentToDocVaultAndEngine({
        activeWorkbench,
        docNumber: poNumber,
        documentType: "purchase_order",
        pdfDoc: doc,
        partyName: vendor.name,
        partyAddress: vendor.address,
        partyGstin: vendor.gstin,
        totalAmount,
        docDate: poDate,
        dueDate: deliveryDate,
        lineItems: items,
        notes: instructions
      });

      const poObj = {
        id: poNumber,
        poNumber,
        poDate,
        deliveryDate,
        vendor,
        items,
        instructions,
        totalAmount,
        status: "Sent to Vendor"
      };
      savePO(poObj);

      toast.success(`Purchase Order ${poNumber} saved to Doc Vault!`);
      onClose();
    } catch (e) {
      console.error("Save to Doc Vault error:", e);
      toast.error("Failed to save Purchase Order to Doc Vault: " + (e.message || e));
    } finally {
      setIsSavingDoc(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md font-dm-sans">
      <div className="bg-[#121212] border border-white/10 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#181818]">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
              <BsCartCheck size={22} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">Purchase Order (PO) Builder</h2>
              <p className="text-xs text-gray-400">Create a detailed requisition list for vendors stating material needs</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors">
            <BsX size={26} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 text-xs">
          
          {/* PO Metadata */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl bg-white/5 border border-white/5">
            <div>
              <label className="block font-semibold text-gray-400 mb-1">PO Number</label>
              <input
                type="text"
                value={poNumber}
                onChange={(e) => setPoNumber(e.target.value)}
                className="w-full bg-[#1e1e1e] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-teal-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-gray-400 mb-1">PO Date</label>
              <input
                type="date"
                value={poDate}
                onChange={(e) => setPoDate(e.target.value)}
                className="w-full bg-[#1e1e1e] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-teal-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-gray-400 mb-1">Target Delivery Date</label>
              <input
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                className="w-full bg-[#1e1e1e] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>

          {/* Vendor Details */}
          <div className="p-5 rounded-xl bg-white/5 border border-white/5 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <BsBuilding className="text-teal-400" />
                Vendor Details
              </h3>
              <select
                onChange={handleVendorPreset}
                className="bg-[#1a1a1a] border border-white/10 text-xs text-teal-300 rounded-lg px-2.5 py-1 focus:outline-none"
              >
                <option value="">-- Load Preset Vendor --</option>
                {PRESET_VENDORS.map(v => (
                  <option key={v.name} value={v.name}>{v.name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-gray-400 mb-1">Select Vendor / Supplier</label>
                <PartySelector
                  value={vendor.name}
                  placeholder="Select or Create Vendor..."
                  filterType="vendor"
                  onSelectParty={(party) => {
                    setVendor(prev => ({
                      ...prev,
                      name: party.name,
                      address: party.address || prev.address,
                      gstin: party.gstin || prev.gstin,
                      email: party.email || prev.email
                    }));
                  }}
                />
              </div>
              <div>
                <label className="block text-gray-400 mb-1">Vendor GSTIN</label>
                <input
                  type="text"
                  value={vendor.gstin}
                  onChange={(e) => setVendor({ ...vendor, gstin: e.target.value })}
                  className="w-full bg-[#1e1e1e] border border-white/10 rounded-lg px-3 py-2 text-white uppercase focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-gray-400 mb-1">Vendor Email</label>
                <input
                  type="email"
                  value={vendor.email}
                  onChange={(e) => setVendor({ ...vendor, email: e.target.value })}
                  className="w-full bg-[#1e1e1e] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Vendor Requisition Item List */}
          <div className="p-5 rounded-xl bg-white/5 border border-white/5 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Requisition Material List
              </h3>
              <button
                onClick={addItem}
                className="flex items-center gap-1 bg-teal-500/10 text-teal-400 hover:bg-teal-500/20 px-3 py-1.5 rounded-lg text-xs font-semibold border border-teal-500/30 transition-colors"
              >
                <BsPlus size={18} /> Add Material
              </button>
            </div>

            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.id} className="p-3 rounded-lg bg-[#181818] border border-white/5 grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-3">
                    <label className="block text-[10px] text-gray-400 mb-0.5">SKU / Code</label>
                    <input
                      type="text"
                      value={item.sku}
                      onChange={(e) => updateItem(item.id, "sku", e.target.value)}
                      placeholder="e.g. SKU-RAW-101"
                      className="w-full bg-[#222] border border-white/10 rounded px-2 py-1 text-white focus:outline-none"
                    />
                  </div>
                  <div className="col-span-4">
                    <label className="block text-[10px] text-gray-400 mb-0.5">Material Description</label>
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => updateItem(item.id, "description", e.target.value)}
                      placeholder="Required specification..."
                      className="w-full bg-[#222] border border-white/10 rounded px-2 py-1 text-white focus:outline-none"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[10px] text-gray-400 mb-0.5">Required Qty</label>
                    <input
                      type="number"
                      value={item.qty}
                      onChange={(e) => updateItem(item.id, "qty", parseInt(e.target.value) || 0)}
                      className="w-full bg-[#222] border border-white/10 rounded px-2 py-1 text-white focus:outline-none"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[10px] text-gray-400 mb-0.5">Target Rate (₹)</label>
                    <input
                      type="number"
                      value={item.expectedRate}
                      onChange={(e) => updateItem(item.id, "expectedRate", parseFloat(e.target.value) || 0)}
                      className="w-full bg-[#222] border border-white/10 rounded px-2 py-1 text-white focus:outline-none"
                    />
                  </div>
                  <div className="col-span-1 flex items-center justify-end">
                    <button
                      onClick={() => removeItem(item.id)}
                      className="text-red-400 hover:text-red-300 p-1 rounded hover:bg-red-500/10"
                    >
                      <BsTrash size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Instructions */}
          <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-2">
            <label className="block font-semibold text-gray-400">Vendor Terms & Delivery Notes</label>
            <textarea
              rows={2}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              className="w-full bg-[#1e1e1e] border border-white/10 rounded-lg p-2 text-white focus:outline-none"
            />
          </div>

        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-white/10 bg-[#181818]">
          <div className="text-sm font-bold text-teal-400">
            Total Requisition Estimated: ₹{totalAmount.toLocaleString('en-IN')}
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleExportPDF}
              className="flex items-center space-x-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl text-xs font-semibold transition-colors"
            >
              <BsFileEarmarkPdf className="text-red-400 text-base" />
              <span>Export PDF</span>
            </button>
            <button
              onClick={handleSavePO}
              className="flex items-center space-x-2 bg-teal-500 hover:bg-teal-400 text-black font-bold px-5 py-2 rounded-xl text-xs shadow-lg shadow-teal-500/20 transition-all"
            >
              <BsCheckCircleFill className="text-base" />
              <span>Issue Purchase Order</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
