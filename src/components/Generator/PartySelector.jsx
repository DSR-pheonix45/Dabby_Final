import React, { useState, useEffect } from "react";
import { BsBuilding, BsPlusLg, BsPersonCheck, BsChevronDown } from "react-icons/bs";
import { collaborationService } from "../../services/collaborationService";
import { useWorkbench } from "../../context/WorkbenchContext";
import CreatePartyModal from "./CreatePartyModal";

export default function PartySelector({ 
  value = "", 
  onSelectParty, 
  placeholder = "Select Party / Business...",
  filterType = "all", // 'customer' | 'vendor' | 'all'
  className = ""
}) {
  const { activeWorkbench } = useWorkbench();
  const [parties, setParties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadParties = async () => {
    if (!activeWorkbench?.id) return;
    setLoading(true);
    try {
      const data = await collaborationService.getParties(activeWorkbench.id);
      setParties(data || []);
    } catch (err) {
      console.error("Error fetching parties:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadParties();

    const handlePartyUpdate = () => loadParties();
    window.addEventListener("partyCreated", handlePartyUpdate);
    return () => window.removeEventListener("partyCreated", handlePartyUpdate);
  }, [activeWorkbench?.id]);

  const filteredParties = parties.filter(p => {
    if (filterType === "customer") return ["customer", "client", "internal"].includes(p.party_type);
    if (filterType === "vendor") return ["vendor", "supplier"].includes(p.party_type);
    return true;
  });

  const handleSelectChange = (e) => {
    const val = e.target.value;
    if (val === "__CREATE_NEW_PARTY__") {
      setIsModalOpen(true);
      return;
    }

    const matched = parties.find(p => p.id === val || p.name === val);
    if (matched) {
      onSelectParty({
        id: matched.id,
        name: matched.name,
        address: matched.address || (matched.party_profiles?.[0]?.address) || "",
        gstin: matched.gstin || (matched.party_profiles?.[0]?.gstin) || "",
        pan: matched.pan || (matched.party_profiles?.[0]?.pan) || "",
        email: matched.email || "",
        phone: matched.phone || "",
        party_type: matched.party_type
      });
    } else {
      onSelectParty({ name: val, address: "", gstin: "", pan: "", email: "", phone: "" });
    }
  };

  const selectedPartyObj = parties.find(p => p.name === value || p.id === value);

  return (
    <div className={`relative ${className}`}>
      <div className="relative flex items-center">
        <select
          value={selectedPartyObj?.id || value || ""}
          onChange={handleSelectChange}
          className="w-full bg-[#1A1D24] border border-white/10 rounded-lg px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-teal-500 appearance-none font-medium cursor-pointer"
        >
          <option value="" disabled>
            {loading ? "Loading parties..." : placeholder}
          </option>
          
          <option value="__CREATE_NEW_PARTY__" className="text-teal-400 font-bold bg-[#141822]">
            ➕ + Create New Party...
          </option>

          {filteredParties.length > 0 && (
            <optgroup label="Saved Workbench Parties" className="bg-[#12141A]">
              {filteredParties.map((p) => (
                <option key={p.id} value={p.id} className="text-white">
                  {p.name} ({p.party_type || "party"}) {p.gstin ? `— GST: ${p.gstin}` : ""}
                </option>
              ))}
            </optgroup>
          )}
        </select>
        <BsChevronDown className="absolute right-3 text-gray-400 pointer-events-none w-3.5 h-3.5" />
      </div>

      {/* Selected party badge */}
      {selectedPartyObj && (
        <div className="mt-1 flex items-center gap-2 text-[11px] text-teal-400">
          <BsPersonCheck className="w-3 h-3" />
          <span>Linked: <strong className="text-white">{selectedPartyObj.name}</strong></span>
          <span className="bg-teal-500/10 px-1.5 py-0.5 rounded text-[10px] uppercase border border-teal-500/20">
            {selectedPartyObj.party_type || "Customer"}
          </span>
        </div>
      )}

      {/* Inline Create Party Popup Modal */}
      <CreatePartyModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        workbenchId={activeWorkbench?.id}
        defaultType={filterType === "vendor" ? "vendor" : "customer"}
        onPartyCreated={(newParty) => {
          setParties(prev => [newParty, ...prev]);
          onSelectParty({
            id: newParty.id,
            name: newParty.name,
            address: newParty.address || "",
            gstin: newParty.gstin || "",
            pan: newParty.pan || "",
            email: newParty.email || "",
            phone: newParty.phone || "",
            party_type: newParty.party_type
          });
        }}
      />
    </div>
  );
}
