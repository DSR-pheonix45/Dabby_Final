import React, { useState } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../hooks/useAuth";
import { toast } from "react-hot-toast";
import { BsX } from "react-icons/bs";

export default function CreateWorkbenchModal({ isOpen, onClose, onSuccess }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    legal_name: "",
    country: "",
    industry: "",
    business_type: "",
    currency: "INR",
    fiscal_year_start: new Date().toISOString().split("T")[0],
    books_start_date: new Date().toISOString().split("T")[0],
  });

  if (!isOpen) return null;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
      const payload = { ...formData, created_by: user.id };
      if (!payload.legal_name) {
        payload.legal_name = null;
      }

      const { data, error } = await supabase
        .from("workbenches")
        .insert([payload])
        .select()
        .single();

      if (error) throw error;

      toast.success("Workbench created successfully!");
      if (onSuccess) onSuccess(data);
      onClose();
    } catch (error) {
      console.error("Error creating workbench:", error);
      toast.error(error.message || "Failed to create workbench");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0E1117] border border-[#1F242C] rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-black/20">
          <h2 className="text-xl font-bold bg-gradient-to-r from-teal-400 to-cyan-500 bg-clip-text text-transparent">
            Create New Workbench
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <BsX className="w-6 h-6" />
          </button>
        </div>

        {/* Form Content */}
        <div className="p-4 sm:p-6 overflow-y-auto">
          <form id="create-workbench-form" onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Workbench Name <span className="text-red-500">*</span></label>
              <input
                type="text"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g. Acme Corp"
                className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Legal Name</label>
              <input
                type="text"
                name="legal_name"
                value={formData.legal_name}
                onChange={handleChange}
                placeholder="e.g. Acme Corporation Pvt. Ltd."
                className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-colors"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Country <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  name="country"
                  required
                  value={formData.country}
                  onChange={handleChange}
                  placeholder="e.g. India"
                  className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Currency <span className="text-red-500">*</span></label>
                <select
                  name="currency"
                  required
                  value={formData.currency}
                  onChange={handleChange}
                  className="w-full bg-[#1A1D24] border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-colors"
                >
                  <option value="INR">INR (₹)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Industry <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  name="industry"
                  required
                  value={formData.industry}
                  onChange={handleChange}
                  placeholder="e.g. Software, Retail"
                  className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Business Type <span className="text-red-500">*</span></label>
                <select
                  name="business_type"
                  required
                  value={formData.business_type}
                  onChange={handleChange}
                  className="w-full bg-[#1A1D24] border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-colors"
                >
                  <option value="">Select Type</option>
                  <option value="Sole Proprietorship">Sole Proprietorship</option>
                  <option value="Partnership">Partnership</option>
                  <option value="LLC">LLC</option>
                  <option value="Corporation">Corporation</option>
                  <option value="Non-Profit">Non-Profit</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Fiscal Year Start <span className="text-red-500">*</span></label>
                <input
                  type="date"
                  name="fiscal_year_start"
                  required
                  value={formData.fiscal_year_start}
                  onChange={handleChange}
                  className="w-full bg-[#1A1D24] border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-colors [color-scheme:dark]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Books Start Date <span className="text-red-500">*</span></label>
                <input
                  type="date"
                  name="books_start_date"
                  required
                  value={formData.books_start_date}
                  onChange={handleChange}
                  className="w-full bg-[#1A1D24] border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-colors [color-scheme:dark]"
                />
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-black/20 flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="create-workbench-form"
            disabled={loading}
            className="px-6 py-2 text-sm font-medium text-white bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-400 hover:to-cyan-500 rounded-lg transition-all shadow-lg shadow-teal-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Creating...
              </>
            ) : (
              "Create Workbench"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
