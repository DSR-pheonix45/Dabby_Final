import React, { useState } from "react";
import { BsX, BsFileEarmarkText, BsCart, BsArrowReturnLeft, BsTag, BsFileEarmarkPdf, BsFileEarmarkWord, BsType } from "react-icons/bs";
import { toast } from "react-hot-toast";

export default function GeneratorModal({ isOpen, onClose }) {
  const [format, setFormat] = useState("pdf");

  if (!isOpen) return null;

  const options = [
    { id: "sales_invoice", name: "Sales Invoice", icon: BsFileEarmarkText, desc: "Generate a new sales invoice for a customer" },
    { id: "purchase_order", name: "Purchase Order", icon: BsCart, desc: "Create a purchase order for a vendor" },
    { id: "credit_note", name: "Credit Note", icon: BsArrowReturnLeft, desc: "Issue a credit note against an invoice" },
    { id: "coupons", name: "Discount & Referral", icon: BsTag, desc: "Generate promotional discount coupons" },
  ];

  const handleGenerate = (option) => {
    toast.success(`Generating ${option.name} as ${format.toUpperCase()}...`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm font-dm-sans">
      <div className="bg-[#181818] border border-white/10 rounded-xl w-full max-w-2xl overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-lg font-bold text-white tracking-tight">Generators</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <BsX size={24} />
          </button>
        </div>
        <div className="p-6">
          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-400 mb-3">Select Export Format</label>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => setFormat("pdf")}
                className={`flex items-center justify-center space-x-2 py-2.5 rounded-lg border transition-colors ${
                  format === "pdf" ? "bg-teal-500/10 border-teal-500/30 text-teal-400" : "bg-white/5 border-white/5 text-gray-400 hover:bg-white/10"
                }`}
              >
                <BsFileEarmarkPdf className="text-lg" />
                <span className="font-semibold text-sm">PDF</span>
              </button>
              <button
                onClick={() => setFormat("word")}
                className={`flex items-center justify-center space-x-2 py-2.5 rounded-lg border transition-colors ${
                  format === "word" ? "bg-teal-500/10 border-teal-500/30 text-teal-400" : "bg-white/5 border-white/5 text-gray-400 hover:bg-white/10"
                }`}
              >
                <BsFileEarmarkWord className="text-lg" />
                <span className="font-semibold text-sm">Word</span>
              </button>
              <button
                onClick={() => setFormat("text")}
                className={`flex items-center justify-center space-x-2 py-2.5 rounded-lg border transition-colors ${
                  format === "text" ? "bg-teal-500/10 border-teal-500/30 text-teal-400" : "bg-white/5 border-white/5 text-gray-400 hover:bg-white/10"
                }`}
              >
                <BsType className="text-lg" />
                <span className="font-semibold text-sm">Text String</span>
              </button>
            </div>
          </div>

          <p className="text-sm text-gray-400 mb-4">Select a document type to generate.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {options.map((opt) => {
              const Icon = opt.icon;
              return (
                <button
                  key={opt.id}
                  onClick={() => handleGenerate(opt)}
                  className="flex flex-col text-left p-5 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 hover:border-teal-500/30 transition-all group"
                >
                  <div className="h-12 w-12 rounded-lg bg-[#222] group-hover:bg-teal-500/10 flex items-center justify-center mb-4 transition-colors">
                    <Icon className="text-gray-400 group-hover:text-teal-400 text-2xl transition-colors" />
                  </div>
                  <h3 className="text-base font-bold text-white mb-1">{opt.name}</h3>
                  <p className="text-sm text-gray-500">{opt.desc}</p>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
