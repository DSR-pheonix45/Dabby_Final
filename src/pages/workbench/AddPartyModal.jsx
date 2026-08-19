import React, { useState } from "react";
import { BsX, BsExclamationTriangle, BsCheckCircle, BsBuilding, BsPerson, BsShieldCheck } from "react-icons/bs";
import { collaborationService } from "../../services/collaborationService";
import { toast } from "react-hot-toast";

export default function AddPartyModal({ isOpen, onClose, workbenchId, onSuccess }) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    legal_name: "",
    display_name: "",
    entity_type: "CORPORATION", // INDIVIDUAL, CORPORATION, OTHER
    roles: ["CUSTOMER"],
    gstin: "",
    pan: "",
    email: "",
    phone: "",
    address: "",
    notes: "",
    is_self: false
  });

  const [resolutionResult, setResolutionResult] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResolving, setIsResolving] = useState(false);

  if (!isOpen) return null;

  const handleRoleToggle = (role) => {
    const current = formData.roles || [];
    if (current.includes(role)) {
      if (current.length === 1) {
        toast.error("A party must have at least one role.");
        return;
      }
      setFormData({ ...formData, roles: current.filter(r => r !== role) });
    } else {
      setFormData({ ...formData, roles: [...current, role] });
    }
  };

  const handleNextToResolution = async (e) => {
    e.preventDefault();
    if (!formData.legal_name.trim()) {
      toast.error("Legal Name is required.");
      return;
    }

    setIsResolving(true);
    try {
      const res = await collaborationService.resolveParty(workbenchId, {
        legal_name: formData.legal_name,
        display_name: formData.display_name || formData.legal_name,
        gstin: formData.gstin,
        pan: formData.pan,
        phone: formData.phone,
        email: formData.email,
        entity_type: formData.entity_type
      });

      setResolutionResult(res);
      setStep(4);
    } catch (err) {
      console.error(err);
      toast.error("Duplicate resolution check failed. Proceeding with confirmation.");
      setResolutionResult({ resolution: "NEW", candidates: [] });
      setStep(4);
    } finally {
      setIsResolving(false);
    }
  };

  const handleConfirmCreate = async () => {
    setIsSubmitting(true);
    try {
      await collaborationService.createParty(workbenchId, {
        name: formData.legal_name,
        legal_name: formData.legal_name,
        display_name: formData.display_name || formData.legal_name,
        entity_type: formData.entity_type,
        roles: formData.roles,
        gstin: formData.gstin,
        pan: formData.pan,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        notes: formData.notes,
        is_self: formData.is_self
      });

      toast.success("Party created successfully");
      onSuccess();
      handleClose();
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to create party");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setStep(1);
    setResolutionResult(null);
    setFormData({
      legal_name: "",
      display_name: "",
      entity_type: "CORPORATION",
      roles: ["CUSTOMER"],
      gstin: "",
      pan: "",
      email: "",
      phone: "",
      address: "",
      notes: "",
      is_self: false
    });
    onClose();
  };

  const ALL_ROLES = [
    { key: "CUSTOMER", label: "Customer", desc: "Purchases goods or services from workbench" },
    { key: "VENDOR", label: "Vendor", desc: "Supplies goods or services to workbench" },
    { key: "PARTNER", label: "Partner", desc: "Strategic or channel business partner" },
    { key: "INVESTOR", label: "Investor", desc: "Capital provider or shareholder" },
    { key: "BANK", label: "Bank / Financial Inst.", desc: "External bank or financial institution" },
    { key: "OTHER", label: "Other", desc: "Other persistent business relationship" }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm font-dm-sans">
      <div className="bg-[#141416] border border-white/10 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/5 bg-[#18181A]">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">Create Party Record</h2>
            <div className="text-xs text-gray-500 font-semibold mt-0.5">
              Step {step} of 4 — Identity & Relationship Setup
            </div>
          </div>
          <button onClick={handleClose} className="text-gray-400 hover:text-white transition-colors">
            <BsX size={24} />
          </button>
        </div>

        {/* Modal Content Steps */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
          
          {/* STEP 1: Entity Type */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-300 mb-1">
                  Choose Entity Type
                </label>
                <p className="text-xs text-gray-500 mb-4">
                  Select the legal form of the entity. Relationship roles will be assigned next.
                </p>
                
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { key: "CORPORATION", label: "Corporation", icon: BsBuilding, desc: "Company, Pvt Ltd, LLP" },
                    { key: "INDIVIDUAL", label: "Individual", icon: BsPerson, desc: "Person, Sole Prop" },
                    { key: "OTHER", label: "Other", icon: BsShieldCheck, desc: "Trust, Org, Other" }
                  ].map(item => {
                    const Icon = item.icon;
                    const selected = formData.entity_type === item.key;
                    return (
                      <button
                        type="button"
                        key={item.key}
                        onClick={() => setFormData({ ...formData, entity_type: item.key })}
                        className={`p-4 rounded-xl border flex flex-col items-center text-center transition-all cursor-pointer ${
                          selected
                            ? "border-teal-500 bg-teal-500/10 text-teal-400"
                            : "border-white/5 bg-white/5 text-gray-400 hover:border-white/20"
                        }`}
                      >
                        <Icon size={24} className="mb-2" />
                        <span className="text-sm font-bold text-white">{item.label}</span>
                        <span className="text-[10px] text-gray-500 mt-1">{item.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Is Self Checkbox */}
              <div className="pt-4 border-t border-white/5">
                <label className="flex items-center space-x-3 cursor-pointer p-3 bg-white/5 rounded-xl border border-white/5 hover:border-white/10">
                  <input
                    type="checkbox"
                    checked={formData.is_self}
                    onChange={(e) => setFormData({ ...formData, is_self: e.target.checked })}
                    className="w-4 h-4 rounded text-teal-500 focus:ring-teal-500 bg-[#1A1A1A] border-white/20"
                  />
                  <div>
                    <div className="text-xs font-bold text-white">Designate as Self / Owner Entity</div>
                    <div className="text-[10px] text-gray-500">Represents this Workbench's own legal business entity</div>
                  </div>
                </label>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-5 py-2.5 bg-teal-500 hover:bg-teal-400 text-black font-bold text-sm rounded-lg transition-colors cursor-pointer"
                >
                  Continue to Roles →
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Party Roles (Multi-select) */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-300 mb-1">
                  Select Relationship Roles
                </label>
                <p className="text-xs text-gray-500 mb-4">
                  An entity can have multiple roles (e.g. both Customer and Vendor) under a single identity.
                </p>

                <div className="space-y-2.5">
                  {ALL_ROLES.map(r => {
                    const isChecked = (formData.roles || []).includes(r.key);
                    return (
                      <label 
                        key={r.key}
                        className={`flex items-start space-x-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                          isChecked 
                            ? "bg-teal-500/10 border-teal-500/40" 
                            : "bg-white/5 border-white/5 hover:border-white/10"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleRoleToggle(r.key)}
                          className="mt-0.5 w-4 h-4 rounded text-teal-500 focus:ring-teal-500 bg-[#1A1A1A] border-white/20"
                        />
                        <div>
                          <div className="text-sm font-bold text-white">{r.label}</div>
                          <div className="text-xs text-gray-500 mt-0.5">{r.desc}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="pt-4 flex justify-between">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-2 text-xs font-semibold text-gray-400 hover:text-white cursor-pointer"
                >
                  ← Back
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="px-5 py-2.5 bg-teal-500 hover:bg-teal-400 text-black font-bold text-sm rounded-lg transition-colors cursor-pointer"
                >
                  Continue to Identity →
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Identity & Tax Details */}
          {step === 3 && (
            <form onSubmit={handleNextToResolution} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1">
                  Legal Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.legal_name}
                  onChange={(e) => setFormData({ ...formData, legal_name: e.target.value })}
                  className="w-full bg-[#18181A] border border-white/10 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-teal-500"
                  placeholder="e.g. Acme Enterprises Private Limited"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1">
                  Display Name (Optional)
                </label>
                <input
                  type="text"
                  value={formData.display_name}
                  onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                  className="w-full bg-[#18181A] border border-white/10 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-teal-500"
                  placeholder="e.g. Acme Corp"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                  GSTIN <span className="text-gray-500 font-normal lowercase">(optional — 15 digit tax ID)</span>
                </label>
                <input
                  type="text"
                  value={formData.gstin}
                  onChange={(e) => {
                    const val = e.target.value.toUpperCase();
                    const derivedPan = val.length === 15 ? val.substring(2, 12) : (formData.pan || "");
                    setFormData({ ...formData, gstin: val, pan: derivedPan });
                  }}
                  className="w-full bg-[#18181A] border border-white/10 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-teal-500 font-mono"
                  placeholder="e.g. 27AAAAA0000A1Z5"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-[#18181A] border border-white/10 rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Phone</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-[#18181A] border border-white/10 rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Address</label>
                <textarea
                  rows={2}
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full bg-[#18181A] border border-white/10 rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-teal-500 custom-scrollbar"
                />
              </div>

              <div className="pt-4 flex justify-between border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-4 py-2 text-xs font-semibold text-gray-400 hover:text-white cursor-pointer"
                >
                  ← Back
                </button>
                <button
                  type="submit"
                  disabled={isResolving}
                  className="px-5 py-2.5 bg-teal-500 hover:bg-teal-400 text-black font-bold text-sm rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isResolving ? "Checking Duplicates..." : "Run Duplicate Check →"}
                </button>
              </div>
            </form>
          )}

          {/* STEP 4: Duplicate Resolution Result & Confirmation */}
          {step === 4 && resolutionResult && (
            <div className="space-y-6">
              {resolutionResult.resolution === "EXACT" && (
                <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-4 space-y-3">
                  <div className="flex items-center space-x-2 text-rose-400 font-bold text-sm">
                    <BsExclamationTriangle size={18} />
                    <span>EXACT MATCH FOUND IN WORKBENCH</span>
                  </div>
                  <p className="text-xs text-rose-200/80">
                    An existing Party record matches your GSTIN, PAN, or exact name & contact details.
                  </p>
                </div>
              )}

              {(resolutionResult.resolution === "HIGH_CONFIDENCE" || resolutionResult.resolution === "AMBIGUOUS") && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 space-y-3">
                  <div className="flex items-center space-x-2 text-amber-400 font-bold text-sm">
                    <BsExclamationTriangle size={18} />
                    <span>POSSIBLE MATCH FOUND ({resolutionResult.resolution})</span>
                  </div>
                  <p className="text-xs text-amber-200/80">
                    The system detected potential duplicate records in this workbench. Review candidates below before creating a new party.
                  </p>
                </div>
              )}

              {resolutionResult.resolution === "NEW" && (
                <div className="bg-teal-500/10 border border-teal-500/30 rounded-xl p-4 flex items-center space-x-3 text-teal-400 text-sm font-bold">
                  <BsCheckCircle size={20} />
                  <span>No existing party match found. Ready to create clean Party record.</span>
                </div>
              )}

              {/* Candidates List */}
              {resolutionResult.candidates && resolutionResult.candidates.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Matching Candidates</span>
                  <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                    {resolutionResult.candidates.map(candidate => (
                      <div key={candidate.id} className="bg-[#18181A] border border-white/10 rounded-xl p-3 flex items-center justify-between text-xs">
                        <div>
                          <div className="font-bold text-white">{candidate.legal_name || candidate.name}</div>
                          <div className="text-[10px] text-gray-500 font-mono">
                            GSTIN: {candidate.gstin || "N/A"} | PAN: {candidate.pan || "N/A"}
                          </div>
                        </div>
                        <span className="px-2.5 py-1 bg-white/10 text-white font-bold rounded text-[10px] uppercase">
                          Existing Party
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="px-4 py-2 text-xs font-semibold text-gray-400 hover:text-white"
                >
                  &larr; Edit Identity
                </button>
                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="px-4 py-2 text-xs font-semibold text-gray-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmCreate}
                    disabled={isSubmitting}
                    className="px-5 py-2.5 bg-teal-500 hover:bg-teal-400 text-black font-bold text-sm rounded-lg transition-colors shadow-[0_0_15px_rgba(20,184,166,0.3)] disabled:opacity-50"
                  >
                    {isSubmitting ? "Creating..." : "Confirm & Create Party"}
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
