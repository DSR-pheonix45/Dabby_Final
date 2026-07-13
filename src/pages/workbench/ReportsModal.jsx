import React, { useState } from "react";
import { BsX, BsFileEarmarkPdf, BsFileEarmarkExcel, BsGraphUp } from "react-icons/bs";
import { toast } from "react-hot-toast";

export default function ReportsModal({ isOpen, onClose }) {
  const [reportType, setReportType] = useState("business_overview");
  const [format, setFormat] = useState("pdf");

  if (!isOpen) return null;

  const handleExtract = () => {
    toast.success(`Extracting report as ${format.toUpperCase()}...`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm font-dm-sans">
      <div className="bg-[#181818] border border-white/10 rounded-xl w-full max-w-md overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-lg font-bold text-white tracking-tight">Extract Business Reports</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <BsX size={24} />
          </button>
        </div>
        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Report Type</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-teal-500 transition-colors appearance-none"
            >
              <option value="business_overview">Business Overview</option>
              <option value="financial_summary">Financial Summary</option>
              <option value="cash_flow">Cash Flow Statement</option>
              <option value="tax_liability">Tax Liability Report</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Export Format</label>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setFormat("pdf")}
                className={`flex items-center justify-center space-x-2 py-3 rounded-lg border transition-colors ${
                  format === "pdf" ? "bg-teal-500/10 border-teal-500/30 text-teal-400" : "bg-white/5 border-white/5 text-gray-400 hover:bg-white/10"
                }`}
              >
                <BsFileEarmarkPdf className="text-lg" />
                <span className="font-semibold text-sm">PDF Format</span>
              </button>
              <button
                onClick={() => setFormat("excel")}
                className={`flex items-center justify-center space-x-2 py-3 rounded-lg border transition-colors ${
                  format === "excel" ? "bg-teal-500/10 border-teal-500/30 text-teal-400" : "bg-white/5 border-white/5 text-gray-400 hover:bg-white/10"
                }`}
              >
                <BsFileEarmarkExcel className="text-lg" />
                <span className="font-semibold text-sm">Excel Format</span>
              </button>
            </div>
          </div>

          <div className="pt-4 flex justify-end space-x-3 border-t border-white/10 mt-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-md text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleExtract}
              className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-black font-semibold text-sm rounded-md transition-colors shadow-[0_0_10px_rgba(20,184,166,0.3)] flex items-center space-x-2"
            >
              <BsGraphUp />
              <span>Extract Report</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
