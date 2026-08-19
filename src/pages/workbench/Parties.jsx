import React, { useState } from "react";
import { useWorkbench } from "../../context/WorkbenchContext";
import { useDataCache } from "../../hooks/useDataCache";
import { 
  BsSearch, BsShieldCheck, BsBuilding, BsPlus, BsPerson,
  BsTag, BsBriefcase, BsCheckCircle, BsSlashCircle, BsArchive
} from "react-icons/bs";
import { collaborationService } from "../../services/collaborationService";
import AddPartyModal from "./AddPartyModal";
import AddVesselModal from "./AddVesselModal";
import PartyAnalyticsModal from "./PartyAnalyticsModal"; // Party Profile Drawer

export default function Parties() {
  const { activeWorkbench } = useWorkbench();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterEntity, setFilterEntity] = useState("ALL");
  const [filterRole, setFilterRole] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ACTIVE");

  const { data, isLoading, refetch: loadParties } = useDataCache(
    activeWorkbench ? `parties_${activeWorkbench.id}` : null,
    () => collaborationService.getParties(activeWorkbench.id)
  );

  const [isAddPartyOpen, setIsAddPartyOpen] = useState(false);
  const [isAddVesselOpen, setIsAddVesselOpen] = useState(false);
  const [selectedPartyId, setSelectedPartyId] = useState(null);
  const [selectedProfileParty, setSelectedProfileParty] = useState(null);

  const parties = data || [];

  const handleAddVesselClick = (partyId, e) => {
    e.stopPropagation();
    setSelectedPartyId(partyId);
    setIsAddVesselOpen(true);
  };

  if (!activeWorkbench) return null;

  const filteredParties = parties.filter(p => {
    // 1. Search Query
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const nameMatch = (p.legal_name || p.name || "").toLowerCase().includes(q);
      const displayMatch = (p.display_name || "").toLowerCase().includes(q);
      const gstinMatch = (p.gstin || "").toLowerCase().includes(q);
      const panMatch = (p.pan || "").toLowerCase().includes(q);
      const phoneMatch = (p.phone || "").toLowerCase().includes(q);
      const emailMatch = (p.email || "").toLowerCase().includes(q);

      if (!nameMatch && !displayMatch && !gstinMatch && !panMatch && !phoneMatch && !emailMatch) {
        return false;
      }
    }

    // 2. Entity Filter
    if (filterEntity !== "ALL") {
      const pEntity = (p.entity_type || (p.is_self ? "CORPORATION" : "CORPORATION")).toUpperCase();
      if (filterEntity === "INTERNAL") {
        if (!p.is_self && p.party_type !== "internal") return false;
      } else if (pEntity !== filterEntity) {
        return false;
      }
    }

    // 3. Role Filter
    if (filterRole !== "ALL") {
      const partyRoles = p.roles || [];
      if (!partyRoles.includes(filterRole.toUpperCase())) {
        return false;
      }
    }

    // 4. Status Filter
    if (filterStatus !== "ALL") {
      const partyStatus = (p.status || "ACTIVE").toUpperCase();
      if (partyStatus !== filterStatus) return false;
    }

    return true;
  });

  return (
    <div className="flex-1 h-full overflow-y-auto p-6 lg:p-10 font-dm-sans custom-scrollbar">
      <div className="w-full space-y-8">
        
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Party Registry</h1>
            <p className="text-gray-500 text-xs font-semibold mt-1 uppercase tracking-[0.1em]">
              Canonical Identity, Classification & Relationship Layer
            </p>
          </div>
          <button 
            onClick={() => setIsAddPartyOpen(true)}
            className="flex items-center space-x-1.5 px-5 py-2.5 bg-teal-500 hover:bg-teal-400 text-black font-bold text-sm rounded-lg transition-all shadow-[0_0_15px_rgba(20,184,166,0.4)] cursor-pointer"
          >
            <BsPlus size={20} />
            <span>Create Party</span>
          </button>
        </div>

        {/* Toolbar & Filters Section */}
        <div className="bg-[#0A0A0A] border border-white/5 p-4 rounded-2xl space-y-4">
          {/* Search Input */}
          <div className="relative w-full">
            <BsSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
            <input
              type="text"
              placeholder="Search parties by Legal Name, Display Name, GSTIN, PAN, Phone, or Email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#141416] border border-white/5 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-teal-500/50 transition-colors"
            />
          </div>
          
          {/* Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-white/5 text-xs">
            {/* Entity Types */}
            <div className="flex items-center space-x-2">
              <span className="text-gray-500 font-bold uppercase tracking-wider text-[10px]">Entity:</span>
              {["ALL", "CORPORATION", "INDIVIDUAL", "INTERNAL", "OTHER"].map((type) => (
                <button
                  key={type}
                  onClick={() => setFilterEntity(type)}
                  className={`px-3 py-1 rounded-md font-bold tracking-wider transition-colors uppercase ${
                    filterEntity === type
                      ? "bg-teal-500/20 text-teal-400 border border-teal-500/30"
                      : "bg-white/5 text-gray-400 hover:text-white"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>

            {/* Roles */}
            <div className="flex items-center space-x-2 overflow-x-auto hide-scrollbar">
              <span className="text-gray-500 font-bold uppercase tracking-wider text-[10px]">Role:</span>
              {["ALL", "CUSTOMER", "VENDOR", "PARTNER", "INVESTOR", "BANK", "OTHER"].map((role) => (
                <button
                  key={role}
                  onClick={() => setFilterRole(role)}
                  className={`px-3 py-1 rounded-md font-bold tracking-wider transition-colors uppercase ${
                    filterRole === role
                      ? "bg-white/20 text-white border border-white/30"
                      : "bg-white/5 text-gray-400 hover:text-white"
                  }`}
                >
                  {role}
                </button>
              ))}
            </div>

            {/* Status */}
            <div className="flex items-center space-x-2">
              <span className="text-gray-500 font-bold uppercase tracking-wider text-[10px]">Status:</span>
              {["ACTIVE", "INACTIVE", "ARCHIVED", "ALL"].map((st) => (
                <button
                  key={st}
                  onClick={() => setFilterStatus(st)}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                    filterStatus === st
                      ? "bg-gray-700 text-white"
                      : "text-gray-500 hover:text-gray-300"
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Parties Grid */}
        {isLoading ? (
          <div className="py-16 text-center text-gray-500">Loading party registry...</div>
        ) : filteredParties.length === 0 ? (
          <div className="py-16 text-center text-gray-500 bg-[#0F0F11] border border-white/5 rounded-2xl p-8">
            <p className="text-base font-semibold text-gray-400">No parties found matching criteria.</p>
            <p className="text-xs text-gray-600 mt-1">Try adjusting your search query or filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredParties.map(party => {
              const isOwner = party.is_self || party.party_type === 'internal';
              const cardBorder = isOwner 
                ? 'border-yellow-500/40 shadow-[0_0_20px_rgba(234,179,8,0.08)] bg-yellow-500/[0.02]' 
                : 'border-white/5 shadow-xl bg-[#0F0F11]';
              
              const vessels = party.financial_accounts || [];
              const partyRoles = party.roles || [];
              const entityType = (party.entity_type || "CORPORATION").toUpperCase();
              const pStatus = (party.status || "ACTIVE").toUpperCase();

              return (
                <div 
                  key={party.id} 
                  className={`border ${cardBorder} rounded-2xl p-6 relative flex flex-col cursor-pointer hover:border-white/20 transition-all group`}
                  onClick={() => setSelectedProfileParty(party)}
                >
                  
                  {/* Self / Owner Badge */}
                  {isOwner && (
                    <div className="absolute top-0 right-6 bg-yellow-500 text-black text-[9px] font-extrabold px-3 py-1 rounded-b-md uppercase tracking-wider flex items-center gap-1 shadow-md">
                      <BsShieldCheck size={12} />
                      <span>SELF / OWNER ENTITY</span>
                    </div>
                  )}

                  {/* Header Row */}
                  <div className="flex justify-between items-start mb-4 mt-2">
                    <div className={`w-11 h-11 rounded-xl border flex items-center justify-center
                      ${isOwner ? 'border-yellow-500/30 text-yellow-500 bg-yellow-500/10' : 'border-teal-500/30 text-teal-400 bg-teal-500/10'}
                    `}>
                      {isOwner ? (
                        <BsShieldCheck size={20} />
                      ) : entityType === 'INDIVIDUAL' ? (
                        <BsPerson size={20} />
                      ) : (
                        <BsBuilding size={20} />
                      )}
                    </div>
                    
                    {/* Entity Type Badge & Status */}
                    <div className="flex flex-col items-end gap-1">
                      <span className={`text-[9px] font-bold px-2.5 py-0.5 rounded-full border uppercase tracking-wider
                        ${isOwner ? 'border-yellow-500/30 text-yellow-500' : 'border-white/10 text-gray-400 bg-white/5'}
                      `}>
                        {entityType}
                      </span>
                      {pStatus !== 'ACTIVE' && (
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 uppercase">
                          {pStatus}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Party Names */}
                  <div className="mb-4">
                    <h3 className={`text-lg font-bold tracking-tight mb-0.5 ${isOwner ? 'text-yellow-500' : 'text-white'}`}>
                      {party.legal_name || party.name}
                    </h3>
                    {party.display_name && party.display_name !== (party.legal_name || party.name) && (
                      <div className="text-xs text-gray-400 font-medium italic">
                        "{party.display_name}"
                      </div>
                    )}
                  </div>

                  {/* Party Roles Pills */}
                  <div className="flex flex-wrap items-center gap-1.5 mb-4">
                    {partyRoles.length === 0 ? (
                      <span className="text-[10px] text-gray-500 font-semibold uppercase px-2 py-0.5 bg-white/5 rounded border border-white/5">
                        NO ROLES
                      </span>
                    ) : (
                      partyRoles.map(role => (
                        <span 
                          key={role}
                          className="text-[9px] font-extrabold px-2.5 py-0.5 rounded border uppercase tracking-wider bg-teal-500/10 text-teal-400 border-teal-500/20"
                        >
                          {role}
                        </span>
                      ))
                    )}
                  </div>

                  {/* Identifiers Row (GSTIN / Tax ID) */}
                  <div className="bg-[#141416] border border-white/5 rounded-xl p-3 mb-4 space-y-1 text-xs">
                    <div className="flex justify-between text-gray-400 font-mono text-[11px]">
                      <span>GSTIN:</span>
                      <span className="text-white font-semibold">{party.gstin || "Unregistered"}</span>
                    </div>
                    {party.pan && party.pan !== party.gstin?.substring(2, 12) && (
                      <div className="flex justify-between text-gray-400 font-mono text-[11px]">
                        <span>PAN:</span>
                        <span className="text-white font-semibold">{party.pan}</span>
                      </div>
                    )}
                  </div>

                  {/* Settlement Vessels / Financial Accounts */}
                  <div className="border-t border-white/5 pt-4 mt-auto">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                        Settlement Vessels ({vessels.length})
                      </span>
                      <button 
                        onClick={(e) => handleAddVesselClick(party.id, e)}
                        className="text-[10px] text-teal-400 font-bold uppercase tracking-widest hover:text-teal-300 transition-colors"
                      >
                        + Add Vessel
                      </button>
                    </div>
                    
                    <div className="space-y-1.5">
                      {vessels.length === 0 ? (
                        <div className="border border-dashed border-white/5 rounded-xl p-3 text-center">
                          <span className="text-xs text-gray-600 italic">No settlement vessels added</span>
                        </div>
                      ) : (
                        vessels.slice(0, 2).map(vessel => (
                          <div 
                            key={vessel.id} 
                            onClick={(e) => e.stopPropagation()} 
                            className="bg-white/5 hover:bg-white/10 transition-colors rounded-lg p-2.5 flex items-center justify-between text-xs"
                          >
                            <div className="flex items-center space-x-2">
                              <BsBriefcase size={12} className="text-gray-400" />
                              <span className="text-gray-200 font-medium">{vessel.display_name}</span>
                            </div>
                            <span className="text-[9px] text-gray-500 font-bold uppercase">
                              {(vessel.account_type || "").replace('_', ' ')}
                            </span>
                          </div>
                        ))
                      )}
                      {vessels.length > 2 && (
                        <div className="text-[10px] text-gray-500 text-center font-semibold pt-1">
                          +{vessels.length - 2} more vessels
                        </div>
                      )}
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Creation Modal */}
      <AddPartyModal
        isOpen={isAddPartyOpen}
        onClose={() => setIsAddPartyOpen(false)}
        workbenchId={activeWorkbench.id}
        onSuccess={loadParties}
      />

      {/* Settlement Vessel Modal */}
      <AddVesselModal
        isOpen={isAddVesselOpen}
        onClose={() => setIsAddVesselOpen(false)}
        workbenchId={activeWorkbench.id}
        partyId={selectedPartyId}
        onSuccess={loadParties}
      />

      {/* Party Profile Drawer */}
      <PartyAnalyticsModal
        isOpen={!!selectedProfileParty}
        onClose={() => setSelectedProfileParty(null)}
        party={selectedProfileParty}
        onRefresh={loadParties}
      />
    </div>
  );
}
