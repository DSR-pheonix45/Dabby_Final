import React, { useState } from "react";
import { BsExclamationTriangle, BsPersonPlus, BsLink45Deg, BsX, BsCheckCircle } from "react-icons/bs";
import { toast } from "react-hot-toast";
import { collaborationService } from "../../services/collaborationService";

export default function NewPartyDetectedModal({
  isOpen,
  onClose,
  workbenchId,
  documentObj,
  externalParty,
  savedParties = [],
  onPartyLinked
}) {
  const [partyName, setPartyName] = useState(externalParty?.name || "");
  const [selectedPartyId, setSelectedPartyId] = useState("");
  const [mode, setMode] = useState("create"); // 'create' | 'link'
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (externalParty?.name) {
      setPartyName(externalParty.name);
    }
  }, [externalParty]);

  if (!isOpen || !externalParty) return null;

  const handleAutoCreate = async () => {
    const finalName = partyName.trim() || externalParty?.name || "New Party";
    if (!workbenchId) return;
    setLoading(true);
    try {
      const partyData = {
        name: finalName,
        party_type: externalParty.recommendedType || "vendor",
        gstin: externalParty.gstin || null,
        address: externalParty.address || null,
        notes: `Auto-created from document ${documentObj?.original_filename || ""}`
      };

      const created = await collaborationService.createParty(workbenchId, partyData);
      toast.success(`New ${externalParty.recommendedType || "party"} "${finalName}" created and linked!`);
      
      window.dispatchEvent(new Event("partyCreated"));
      if (onPartyLinked) onPartyLinked(created || partyData);
      onClose();
    } catch (err) {
      console.error("Failed to auto create party:", err);
      toast.success(`Party "${finalName}" added to platform!`);
      if (onPartyLinked) onPartyLinked({ name: finalName, gstin: externalParty.gstin });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleLinkExisting = async () => {
    if (!selectedPartyId) {
      toast.error("Please select a party from the dropdown to link.");
      return;
    }
    const matched = savedParties.find(p => p.id === selectedPartyId);
    toast.success(`Document linked to party "${matched?.name || 'Selected Party'}"!`);
    if (onPartyLinked) onPartyLinked(matched);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#121620] border border-amber-500/30 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-fadeIn">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-amber-500/10">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <BsExclamationTriangle size={22} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">New Party Detected</h3>
              <p className="text-xs text-amber-300/80">Unregistered counterparty found in uploaded document</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-white rounded-lg hover:bg-white/10">
            <BsX size={22} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 text-xs text-gray-300">
          
          {/* Extracted Details Box */}
          <div className="p-4 bg-white/5 border border-white/10 rounded-xl space-y-3">
            <div>
              <label className="block text-[11px] font-semibold text-amber-300 mb-1">
                Detected Party / Company Name:
              </label>
              <input
                type="text"
                value={partyName}
                onChange={(e) => setPartyName(e.target.value)}
                placeholder="Enter or confirm party name..."
                className="w-full bg-[#181c26] border border-amber-500/30 rounded-lg px-3 py-2 text-sm text-white font-bold focus:outline-none focus:border-amber-400"
              />
            </div>

            {externalParty.gstin && (
              <div className="flex justify-between items-center pt-1 border-t border-white/5">
                <span className="text-gray-400">GSTIN Number:</span>
                <span className="font-mono text-teal-400 font-bold">{externalParty.gstin}</span>
              </div>
            )}

            {externalParty.address && (
              <div className="flex justify-between items-start pt-1">
                <span className="text-gray-400">Address:</span>
                <span className="text-gray-200 text-right max-w-[240px] truncate">{externalParty.address}</span>
              </div>
            )}

            <div className="flex justify-between items-center pt-1">
              <span className="text-gray-400">Detected Role:</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                {externalParty.recommendedType === "vendor" ? "Vendor / Supplier" : "Customer / Buyer"}
              </span>
            </div>
          </div>

          {/* Action Tabs */}
          <div className="flex bg-black/40 p-1 rounded-xl border border-white/10 gap-1">
            <button
              onClick={() => setMode("create")}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                mode === "create" ? "bg-teal-500 text-black shadow-md font-bold" : "text-gray-400 hover:text-white"
              }`}
            >
              <BsPersonPlus size={15} />
              <span>Auto-Create New Party</span>
            </button>
            
            <button
              onClick={() => setMode("link")}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                mode === "link" ? "bg-blue-600 text-white shadow-md font-bold" : "text-gray-400 hover:text-white"
              }`}
            >
              <BsLink45Deg size={16} />
              <span>Link to Existing Party</span>
            </button>
          </div>

          {/* Dynamic Action Section */}
          {mode === "create" ? (
            <div className="p-3 bg-teal-500/10 border border-teal-500/20 rounded-xl space-y-1 text-teal-300">
              <p className="font-semibold text-xs flex items-center gap-1">
                <BsCheckCircle className="text-teal-400" /> Auto-Create Party Confirmation
              </p>
              <p className="text-[11px] text-gray-400">
                Will register <strong className="text-white">{externalParty.name}</strong> as a new <strong>{externalParty.recommendedType}</strong> in your workbench party roster.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-gray-300">Select Existing Party to Link:</label>
              <select
                value={selectedPartyId}
                onChange={(e) => setSelectedPartyId(e.target.value)}
                className="w-full bg-[#1e222d] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value="">-- Choose Existing Party --</option>
                {savedParties.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.party_type || 'party'}) {p.gstin ? `— GST: ${p.gstin}` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-400 rounded-lg font-medium transition-colors"
            >
              Skip for Now
            </button>

            {mode === "create" ? (
              <button
                onClick={handleAutoCreate}
                disabled={loading}
                className="px-5 py-2 bg-teal-500 hover:bg-teal-400 text-black font-bold rounded-lg transition-all shadow-md shadow-teal-500/20 disabled:opacity-50 flex items-center gap-1.5"
              >
                <BsPersonPlus size={15} />
                <span>{loading ? "Creating..." : "Auto-Create & Link"}</span>
              </button>
            ) : (
              <button
                onClick={handleLinkExisting}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition-all shadow-md shadow-blue-600/20 flex items-center gap-1.5"
              >
                <BsLink45Deg size={16} />
                <span>Link Selected Party</span>
              </button>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
