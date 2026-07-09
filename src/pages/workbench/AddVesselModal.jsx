import React, { useState } from "react";
import { BsX } from "react-icons/bs";
import { collaborationService } from "../../services/collaborationService";
import { toast } from "react-hot-toast";

export default function AddVesselModal({ isOpen, onClose, workbenchId, partyId, onSuccess }) {
  const [formData, setFormData] = useState({
    account_type: "bank_account",
    display_name: "",
    bank_name: "",
    account_number: "",
    upi_id: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await collaborationService.addTradeVessel(workbenchId, partyId, formData);
      toast.success("Trade Vessel added successfully");
      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("Failed to add trade vessel");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm font-dm-sans">
      <div className="bg-[#181818] border border-white/10 rounded-xl w-full max-w-md overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-lg font-bold text-white tracking-tight">Add Trade Vessel</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <BsX size={24} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">Vessel Type</label>
            <select
              value={formData.account_type}
              onChange={(e) => setFormData({ ...formData, account_type: e.target.value })}
              className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-teal-500 transition-colors appearance-none"
            >
              <option value="bank_account">Bank Account</option>
              <option value="cash">Cash Account</option>
              <option value="upi">UPI ID</option>
              <option value="wallet">Digital Wallet</option>
              <option value="virtual_account">Virtual Account</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">Display Name</label>
            <input
              type="text"
              required
              value={formData.display_name}
              onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
              className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-teal-500 transition-colors"
              placeholder="e.g. HDFC Current Account"
            />
          </div>

          {formData.account_type === "bank_account" && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">Bank Name</label>
                <input
                  type="text"
                  value={formData.bank_name}
                  onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                  className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-teal-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">Account Number</label>
                <input
                  type="text"
                  value={formData.account_number}
                  onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                  className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-teal-500 transition-colors"
                />
              </div>
            </>
          )}

          {formData.account_type === "upi" && (
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">UPI ID</label>
              <input
                type="text"
                required
                value={formData.upi_id}
                onChange={(e) => setFormData({ ...formData, upi_id: e.target.value })}
                className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-teal-500 transition-colors"
                placeholder="name@bank"
              />
            </div>
          )}

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
              {isSubmitting ? "Adding..." : "Add Vessel"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
