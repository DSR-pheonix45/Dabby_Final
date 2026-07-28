import React from "react";
import { Sliders, Check } from "lucide-react";

export const PRESETS = [
  {
    id: "standard",
    label: "Standard Goods & Services",
    columnLabels: { sno: "S.NO.", items: "ITEMS", hsn: "HSN", qty: "QTY.", unit: "UNIT", rate: "RATE", amount: "AMOUNT" },
    showSeparateUnitCol: false
  },
  {
    id: "construction",
    label: "Construction / Fabrication (Area & Rate)",
    columnLabels: { sno: "S.NO.", items: "ITEMS", hsn: "HSN", qty: "AREA", unit: "UNIT", rate: "UNIT RATE", amount: "DERIVING AMOUNT" },
    showSeparateUnitCol: false
  },
  {
    id: "architectural",
    label: "Architectural (Area Value, Unit, Rate)",
    columnLabels: { sno: "S.NO.", items: "ITEMS", hsn: "HSN", qty: "AREA VALUE", unit: "AREA UNIT", rate: "UNIT RATE", amount: "DERIVING AMOUNT" },
    showSeparateUnitCol: true
  }
];

export default function ColumnConfigurator({
  columnLabels,
  setColumnLabels,
  showSeparateUnitCol,
  setShowSeparateUnitCol,
  theme = "dark"
}) {
  const applyPreset = (preset) => {
    setColumnLabels(preset.columnLabels);
    setShowSeparateUnitCol(preset.showSeparateUnitCol);
  };

  const handleLabelChange = (field, val) => {
    setColumnLabels(prev => ({ ...prev, [field]: val }));
  };

  return (
    <div className={`p-4 rounded-xl border ${theme === "dark" ? "bg-white/5 border-white/10" : "bg-gray-50 border-gray-200"} space-y-4 mb-4`}>
      <div className="flex items-center justify-between border-b pb-2">
        <div className="flex items-center space-x-2">
          <Sliders className="w-4 h-4 text-blue-400" />
          <span className="text-xs font-bold uppercase tracking-wider">Customize Column Labels & Layout</span>
        </div>
      </div>

      {/* Presets */}
      <div>
        <span className="text-[11px] font-semibold text-gray-400 block mb-2">Column Label Presets</span>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => applyPreset(p)}
              className="px-3 py-1.5 rounded-lg border text-xs font-medium bg-white/5 hover:bg-white/10 transition-colors border-white/10 flex items-center gap-1.5"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Column Labels Editable Grid */}
      <div>
        <span className="text-[11px] font-semibold text-gray-400 block mb-2">Custom Table Header Labels</span>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <div>
            <label className="text-[10px] text-gray-400 block mb-1">Qty / Area Label</label>
            <input
              type="text"
              value={columnLabels?.qty || "QTY."}
              onChange={(e) => handleLabelChange("qty", e.target.value)}
              className={`w-full p-2 rounded text-xs border ${theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-300"}`}
              placeholder="e.g. QTY. or AREA"
            />
          </div>

          <div>
            <label className="text-[10px] text-gray-400 block mb-1">Unit Label</label>
            <input
              type="text"
              value={columnLabels?.unit || "UNIT"}
              onChange={(e) => handleLabelChange("unit", e.target.value)}
              className={`w-full p-2 rounded text-xs border ${theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-300"}`}
              placeholder="e.g. UNIT or AREA UNIT"
            />
          </div>

          <div>
            <label className="text-[10px] text-gray-400 block mb-1">Rate Label</label>
            <input
              type="text"
              value={columnLabels?.rate || "RATE"}
              onChange={(e) => handleLabelChange("rate", e.target.value)}
              className={`w-full p-2 rounded text-xs border ${theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-300"}`}
              placeholder="e.g. RATE or UNIT RATE"
            />
          </div>

          <div>
            <label className="text-[10px] text-gray-400 block mb-1">Amount Label</label>
            <input
              type="text"
              value={columnLabels?.amount || "AMOUNT"}
              onChange={(e) => handleLabelChange("amount", e.target.value)}
              className={`w-full p-2 rounded text-xs border ${theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-300"}`}
              placeholder="e.g. DERIVING AMOUNT"
            />
          </div>
        </div>
      </div>

      {/* Separate Unit Column Toggle */}
      <div className="flex items-center justify-between pt-2 border-t border-white/5">
        <div>
          <span className="text-xs font-semibold block">Split Unit into Separate Column</span>
          <span className="text-[10px] text-gray-400">Shows Area Value and Area Unit in distinct table columns</span>
        </div>
        <button
          type="button"
          onClick={() => setShowSeparateUnitCol(!showSeparateUnitCol)}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
            showSeparateUnitCol ? "bg-blue-600 text-white" : "bg-white/10 text-gray-400 border border-white/10"
          }`}
        >
          {showSeparateUnitCol && <Check className="w-3.5 h-3.5" />}
          {showSeparateUnitCol ? "Separate Unit Column Enabled" : "Combined Qty & Unit"}
        </button>
      </div>
    </div>
  );
}
