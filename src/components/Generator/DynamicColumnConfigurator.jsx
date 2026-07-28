import React, { useState } from "react";
import { Plus, Trash2, Sliders, Check, RotateCcw } from "lucide-react";

export const DEFAULT_COLUMNS = [
  { id: "description", label: "Item Description", type: "text", removable: false, required: true },
  { id: "hsn", label: "HSN/SAC", type: "text", removable: true },
  { id: "qty", label: "Area / Qty", type: "number", removable: true },
  { id: "unit", label: "Unit", type: "text", removable: true },
  { id: "rate", label: "Unit Rate", type: "number", removable: true },
  { id: "amount", label: "Deriving Amount", type: "amount", removable: false, required: true }
];

export const PRESETS = [
  {
    id: "standard",
    label: "Standard Goods (Qty, Rate, Amount)",
    columns: [
      { id: "description", label: "Item Description", type: "text", removable: false },
      { id: "hsn", label: "HSN/SAC", type: "text", removable: true },
      { id: "qty", label: "Qty", type: "number", removable: true },
      { id: "unit", label: "Unit", type: "text", removable: true },
      { id: "rate", label: "Rate", type: "number", removable: true },
      { id: "amount", label: "Amount", type: "amount", removable: false }
    ]
  },
  {
    id: "construction",
    label: "Construction / Fabrication (Area & Rate)",
    columns: [
      { id: "description", label: "Item Description", type: "text", removable: false },
      { id: "hsn", label: "HSN/SAC", type: "text", removable: true },
      { id: "qty", label: "Area", type: "number", removable: true },
      { id: "unit", label: "Unit (RFT, sqft)", type: "text", removable: true },
      { id: "rate", label: "Unit Rate", type: "number", removable: true },
      { id: "amount", label: "Deriving Amount", type: "amount", removable: false }
    ]
  },
  {
    id: "dimensions",
    label: "Dimensions & Measurements (Specs, Length, Qty, Rate)",
    columns: [
      { id: "description", label: "Item Description", type: "text", removable: false },
      { id: "subDetails", label: "Dimensions / Specs", type: "text", removable: true },
      { id: "hsn", label: "HSN/SAC", type: "text", removable: true },
      { id: "qty", label: "Area / Quantity", type: "number", removable: true },
      { id: "unit", label: "Unit", type: "text", removable: true },
      { id: "rate", label: "Unit Rate", type: "number", removable: true },
      { id: "amount", label: "Deriving Amount", type: "amount", removable: false }
    ]
  }
];

export default function DynamicColumnConfigurator({
  columns,
  setColumns,
  theme = "dark"
}) {
  const [newColLabel, setNewColLabel] = useState("");
  const [newColType, setNewColType] = useState("text"); // text | number

  const handleAddColumn = () => {
    if (!newColLabel.trim()) return;
    const colId = `custom_${Date.now()}`;
    const newCol = {
      id: colId,
      label: newColLabel.trim(),
      type: newColType,
      removable: true
    };
    
    // Insert before amount column if present, else at end
    const amountIdx = columns.findIndex(c => c.id === "amount");
    let updated;
    if (amountIdx !== -1) {
      updated = [...columns.slice(0, amountIdx), newCol, ...columns.slice(amountIdx)];
    } else {
      updated = [...columns, newCol];
    }

    setColumns(updated);
    setNewColLabel("");
  };

  const handleRemoveColumn = (colId) => {
    setColumns(columns.filter(c => c.id !== colId));
  };

  const handleLabelChange = (colId, newLabel) => {
    setColumns(columns.map(c => c.id === colId ? { ...c, label: newLabel } : c));
  };

  const handleReset = () => {
    setColumns(DEFAULT_COLUMNS);
  };

  return (
    <div className={`p-4 rounded-xl border ${theme === "dark" ? "bg-[#181818] border-white/10 text-white" : "bg-gray-50 border-gray-200 text-gray-900"} space-y-4 mb-4`}>
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-2">
        <div className="flex items-center space-x-2">
          <Sliders className="w-4 h-4 text-blue-400" />
          <span className="text-xs font-bold uppercase tracking-wider">Dynamic Column Manager</span>
        </div>
        <button
          type="button"
          onClick={handleReset}
          className="text-[11px] text-gray-400 hover:text-white flex items-center gap-1 font-medium"
        >
          <RotateCcw className="w-3 h-3" /> Reset Defaults
        </button>
      </div>

      {/* Column Presets */}
      <div>
        <span className="text-[11px] font-semibold text-gray-400 block mb-2">Column Presets</span>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setColumns(p.columns)}
              className="px-3 py-1.5 rounded-lg border text-xs font-medium bg-white/5 hover:bg-white/10 transition-colors border-white/10 text-gray-200"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Active Columns List & Inline Label Editors */}
      <div>
        <span className="text-[11px] font-semibold text-gray-400 block mb-2">Active Columns (Edit Header Names or Remove Columns)</span>
        <div className="flex flex-wrap gap-2 items-center">
          {columns.map((col) => (
            <div
              key={col.id}
              className="flex items-center space-x-1.5 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1 text-xs"
            >
              <input
                type="text"
                value={col.label}
                onChange={(e) => handleLabelChange(col.id, e.target.value)}
                className="bg-transparent text-white font-bold border-b border-transparent focus:border-blue-400 focus:outline-none w-28 text-xs"
              />
              {col.removable && (
                <button
                  type="button"
                  onClick={() => handleRemoveColumn(col.id)}
                  className="text-red-400 hover:text-red-300 p-0.5 rounded hover:bg-red-500/20"
                  title="Remove Column"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Add New Custom Column Bar */}
      <div className="pt-2 border-t border-white/10">
        <span className="text-[11px] font-semibold text-gray-400 block mb-2">+ Add Custom Column</span>
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="New Column Label (e.g. Length, Material, Discount %, Remarks)"
            value={newColLabel}
            onChange={(e) => setNewColLabel(e.target.value)}
            className={`flex-1 p-2 rounded-lg text-xs border ${theme === "dark" ? "bg-[#1e1e1e] border-white/10 text-white" : "bg-white border-gray-300"}`}
          />
          <select
            value={newColType}
            onChange={(e) => setNewColType(e.target.value)}
            className={`p-2 rounded-lg text-xs border ${theme === "dark" ? "bg-[#1e1e1e] border-white/10 text-white" : "bg-white border-gray-300"}`}
          >
            <option value="text">Text Column</option>
            <option value="number">Number Column</option>
          </select>
          <button
            type="button"
            onClick={handleAddColumn}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Add Column
          </button>
        </div>
      </div>

    </div>
  );
}
