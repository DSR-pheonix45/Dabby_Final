import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BsX, BsTag, BsGrid } from "react-icons/bs";
import { toast } from "react-hot-toast";
import { supabase } from "../../../lib/supabase";
import { useAuth } from "../../../hooks/useAuth";
import { useWorkbench } from "../../../context/WorkbenchContext";

export default function LabelModal({ isOpen, onClose, workbenchId, label, onSuccess }) {
  const { plan, planLimits } = useAuth();
  const { labels } = useWorkbench();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    type: "expense",
    sub_account: "",
    is_system: false,
  });
  const isEditing = Boolean(label?.id);

  React.useEffect(() => {
    if (label) {
      setFormData({
        name: label.name || "",
        type: label.type || "expense",
        sub_account: label.sub_account || "",
        is_system: label.is_system || false,
      });
    } else {
      setFormData({
        name: "",
        type: "expense",
        sub_account: "",
        is_system: false,
      });
    }
  }, [label]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.sub_account) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const url = isEditing
        ? `http://localhost:8000/api/ledger/labels/${label.id}`
        : "http://localhost:8000/api/ledger/labels";
      const method = isEditing ? "PATCH" : "POST";
      const payload = isEditing
        ? {
            name: formData.name,
            sub_account: formData.sub_account,
          }
        : {
            workbench_id: workbenchId,
            ...formData,
          };

      const response = await fetch(url, {
        method,
        headers: { 
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || (isEditing ? "Failed to update label" : "Failed to create label"));
      }

      toast.success(isEditing ? "Category updated successfully" : "Category created successfully");
      onSuccess?.();
      onClose();
      setFormData({ name: "", type: "expense", sub_account: "", is_system: false });
    } catch (err) {
      console.error("Error saving label:", err);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const SUB_ACCOUNT_MAP = {
    asset: [
      "Cash & Equivalents",
      "Accounts Receivable",
      "Inventory",
      "Investments",
      "Fixed Assets",
      "Prepayments"
    ],
    liability: [
      "Accounts Payable",
      "Credit Card Debts",
      "Short-term Loans",
      "Accrued Expenses",
      "Long-term Debts"
    ],
    equity: [
      "Owner's Capital",
      "Retained Earnings",
      "Dividends"
    ],
    revenue: [
      "Sales Revenue",
      "Service Revenue",
      "Other Income",
      "Interest Income"
    ],
    expense: [
      "Payroll & Benefits",
      "Marketing & Advertising",
      "Rent & Utilities",
      "Taxes & Licenses",
      "Travel & Entertainment",
      "OpEx",
      "COGS"
    ]
  };

  const types = ["asset", "liability", "equity", "revenue", "expense"];

  const customLabels = (labels || []).filter((label) => label?.is_system !== true);
  const customLabelCount = customLabels.length;
  const labelLimit = planLimits?.coa_label_limit ?? 0;
  const remainingLabelSlots = labelLimit > 0 ? labelLimit - customLabelCount : 0;
  const labelLimitReached = labelLimit > 0 && customLabelCount >= labelLimit;

  const handleTypeChange = (type) => {
    setFormData({ 
      ...formData, 
      type, 
      sub_account: SUB_ACCOUNT_MAP[type][0] // Default to first sub-account in new type
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-lg bg-[#0d1117] border border-white/10 rounded-3xl shadow-2xl overflow-hidden"
          >
            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
                  <BsTag size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Create Category</h3>
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">New Financial Label</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl text-gray-500 transition-all">
                <BsX size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Label Name */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Label Name</label>
                <div className="relative">
                  <BsTag className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rent, HDFC Bank, Service Revenue"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:border-blue-500/50 text-white transition-all"
                  />
                </div>
              </div>

              {/* Account Type (Pillar) */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Account Pillar</label>
                <div className="grid grid-cols-5 gap-2">
                  {types.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => { if (!isEditing) handleTypeChange(t); }}
                      disabled={isEditing}
                      className={`px-2 py-2 rounded-xl text-[9px] font-bold uppercase tracking-wider border transition-all ${
                        formData.type === t
                          ? "bg-blue-500/10 border-blue-500/40 text-blue-400 shadow-lg shadow-blue-500/5"
                          : "bg-white/5 border-white/5 text-gray-500 hover:text-gray-300"
                      } ${isEditing ? "opacity-40 cursor-not-allowed" : ""}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sub-Account Tags */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Sub-Account Group</label>
                <div className="flex flex-wrap gap-2 p-4 bg-white/[0.02] border border-white/5 rounded-2xl min-h-[100px]">
                  {SUB_ACCOUNT_MAP[formData.type].map((sub) => (
                    <button
                      key={sub}
                      type="button"
                      onClick={() => setFormData({ ...formData, sub_account: sub })}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border ${
                        formData.sub_account === sub
                          ? "bg-teal-500/10 border-teal-500/30 text-teal-400 shadow-lg"
                          : "bg-white/5 border-white/5 text-gray-500 hover:text-gray-300"
                      }`}
                    >
                      {sub}
                    </button>
                  ))}
                </div>
              </div>

              {labelLimit >= 0 && (
                <div className="rounded-2xl border border-blue-500/10 bg-blue-500/5 p-3 text-xs text-blue-200">
                  <p className="font-semibold">{plan?.toUpperCase()} plan limit:</p>
                  <p>{customLabelCount} of {labelLimit} custom COA labels used.</p>
                  <p>{labelLimit === 0 ? "Free plan does not allow custom COA labels. Upgrade for more." : remainingLabelSlots > 0 ? `${remainingLabelSlots} remaining.` : "Label quota reached. Upgrade for more."}</p>
                </div>
              )}

              <div className="pt-4 flex space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-6 py-3 border border-white/10 rounded-2xl text-xs font-bold text-gray-400 hover:bg-white/5 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || labelLimitReached}
                  className="flex-[2] px-6 py-3 bg-blue-500 text-white rounded-2xl text-xs font-bold hover:bg-blue-400 transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50"
                >
                  {loading ? "Creating..." : "Create Category"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
