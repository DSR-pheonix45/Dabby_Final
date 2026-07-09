import React, { useState } from "react";
import { BsX } from "react-icons/bs";
import { collaborationService } from "../../services/collaborationService";
import { toast } from "react-hot-toast";

export default function AddPartyModal({ isOpen, onClose, workbenchId, onSuccess }) {
  const [formData, setFormData] = useState({
    name: "",
    party_type: "customer",
    email: "",
    phone: "",
    notes: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await collaborationService.createParty(workbenchId, formData);
      toast.success("Party added successfully");
      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("Failed to add party");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm font-dm-sans">
      <div className="bg-[#181818] border border-white/10 rounded-xl w-full max-w-md overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-lg font-bold text-white tracking-tight">Add New Party</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <BsX size={24} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">Party Name</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-teal-500 transition-colors"
              placeholder="e.g. Acme Corp"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">Party Type</label>
            <select
              value={formData.party_type}
              onChange={(e) => setFormData({ ...formData, party_type: e.target.value })}
              className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-teal-500 transition-colors appearance-none"
            >
              <option value="customer">Customer</option>
              <option value="vendor">Vendor</option>
              <option value="partner">Partner</option>
              <option value="investor">Investor</option>
              <option value="bank">Bank</option>
              <option value="internal">Internal (Self)</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">Email (Optional)</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-teal-500 transition-colors"
                placeholder="contact@acme.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">Phone (Optional)</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-teal-500 transition-colors"
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end space-x-3 border-t border-white/10 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-md text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-black font-semibold text-sm rounded-md transition-colors shadow-[0_0_10px_rgba(20,184,166,0.3)] disabled:opacity-50"
            >
              {isSubmitting ? "Adding..." : "Add Party"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
