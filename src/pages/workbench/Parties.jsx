import React, { useState, useEffect } from "react";
import { useWorkbench } from "../../context/WorkbenchContext";
import { useDataCache } from "../../hooks/useDataCache";
import { BsSearch, BsShieldCheck, BsBuilding, BsPlus } from "react-icons/bs";
import { collaborationService } from "../../services/collaborationService";
import AddPartyModal from "./AddPartyModal";
import AddVesselModal from "./AddVesselModal";
import PartyAnalyticsModal from "./PartyAnalyticsModal";

export default function Parties() {
  const { activeWorkbench } = useWorkbench();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("ALL");
  const { data, isLoading, refetch: loadParties } = useDataCache(
    activeWorkbench ? `parties_${activeWorkbench.id}` : null,
    () => collaborationService.getParties(activeWorkbench.id)
  );

  const [isAddPartyOpen, setIsAddPartyOpen] = useState(false);
  const [isAddVesselOpen, setIsAddVesselOpen] = useState(false);
  const [selectedPartyId, setSelectedPartyId] = useState(null);
  const [analyticsParty, setAnalyticsParty] = useState(null);

  const parties = data || [];

  const handleAddVesselClick = (partyId) => {
    setSelectedPartyId(partyId);
    setIsAddVesselOpen(true);
  };

  if (!activeWorkbench) return null;

  const filteredParties = parties.filter(p => {
    if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (filterType !== "ALL") {
      if (filterType === "INTERNAL" && p.party_type !== "internal") return false;
      if (filterType === "CORPORATION" && !["customer", "vendor", "partner"].includes(p.party_type)) return false;
      if (filterType === "INDIVIDUAL" && !["employee", "investor"].includes(p.party_type)) return false;
    }
    return true;
  });

  return (
    <div className="p-6 lg:p-10 font-dm-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Parties & Entities</h1>
            <p className="text-gray-500 text-xs font-semibold mt-1 uppercase tracking-[0.1em]">Individuals representing trade vessels</p>
          </div>
          <button 
            onClick={() => setIsAddPartyOpen(true)}
            className="flex items-center space-x-1 px-5 py-2.5 bg-teal-500 hover:bg-teal-400 text-black font-bold text-sm rounded-lg transition-all shadow-[0_0_15px_rgba(20,184,166,0.4)]"
          >
            <BsPlus size={20} />
            <span>Manage Parties</span>
          </button>
        </div>

        {/* Toolbar Section */}
        <div className="flex flex-col md:flex-row items-center gap-4 bg-[#0A0A0A] border border-white/5 p-2 rounded-xl">
          <div className="relative w-full md:max-w-md flex-1">
            <BsSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
            <input
              type="text"
              placeholder="Search parties by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#181818] border border-transparent rounded-lg py-2.5 pl-10 pr-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-white/10 transition-colors"
            />
          </div>
          
          <div className="flex items-center space-x-1 px-2 w-full md:w-auto overflow-x-auto hide-scrollbar">
            {["ALL", "INDIVIDUAL", "CORPORATION", "INTERNAL"].map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold tracking-wider transition-colors whitespace-nowrap ${
                  filterType === type
                    ? "bg-white/10 text-white"
                    : "text-gray-500 hover:text-gray-300"
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Parties List */}
        {isLoading ? (
          <div className="py-12 text-center text-gray-500">Loading parties...</div>
        ) : filteredParties.length === 0 ? (
          <div className="py-12 text-center text-gray-500">No parties found.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredParties.map(party => {
              const isOwner = party.party_type === 'internal';
              const themeColor = isOwner ? 'yellow' : 'blue';
              const cardBorder = isOwner ? 'border-yellow-500/30 shadow-[0_0_15px_rgba(234,179,8,0.05)]' : 'border-white/5 shadow-xl';
              
              const vessels = party.financial_accounts || [];

              return (
                <div 
                  key={party.id} 
                  className={`bg-[#0F0F11] border ${cardBorder} rounded-2xl p-6 relative flex flex-col cursor-pointer hover:bg-white/[0.02] transition-colors`}
                  onClick={() => setAnalyticsParty(party)}
                >
                  
                  {isOwner && (
                    <div className="absolute top-0 right-6 bg-yellow-500 text-black text-[9px] font-bold px-3 py-1 rounded-b-md uppercase tracking-wider">
                      Owner Entity
                    </div>
                  )}

                  <div className="flex justify-between items-start mb-6 mt-2">
                    <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center
                      ${isOwner ? 'border-yellow-500/30 text-yellow-500 bg-yellow-500/5' : 'border-teal-500/30 text-teal-400 bg-teal-500/10'}
                    `}>
                      {isOwner ? <BsShieldCheck size={20} /> : <BsBuilding size={20} />}
                    </div>
                    
                    <div className={`text-[9px] font-bold px-3 py-1 rounded-full border uppercase tracking-wider
                      ${isOwner ? 'border-yellow-500/30 text-yellow-500' : 'border-teal-500/30 text-teal-400 bg-teal-500/10'}
                    `}>
                      {isOwner ? "Self (Owner)" : "Corporation"}
                    </div>
                  </div>
                  
                  <div className="mb-6">
                    <h3 className={`text-xl font-bold mb-1 ${isOwner ? 'text-yellow-500' : 'text-white'}`}>
                      {party.name}
                    </h3>
                    <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                      Party Identity
                    </div>
                  </div>

                  <div className="border-t border-white/5 pt-4 mt-auto">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Trade Vessels</span>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleAddVesselClick(party.id); }}
                        className="text-[10px] text-teal-400 font-bold uppercase tracking-widest hover:text-teal-300 transition-colors"
                      >
                        + Add Vessel
                      </button>
                    </div>
                    
                    <div className="space-y-2">
                      {vessels.length === 0 ? (
                        <div className="border border-dashed border-white/10 rounded-xl p-4 text-center">
                          <span className="text-xs text-gray-600 font-medium italic">No vessels linked</span>
                        </div>
                      ) : (
                        vessels.map(vessel => (
                          <div 
                            key={vessel.id} 
                            onClick={(e) => e.stopPropagation()} 
                            className="bg-white/5 hover:bg-white/10 transition-colors rounded-xl p-3 flex items-center justify-between group cursor-pointer"
                          >
                            <div className="flex items-center space-x-3">
                              <div className="text-gray-400">
                                <BsBuilding size={14} />
                              </div>
                              <div>
                                <div className="text-sm text-gray-200 font-medium">{vessel.display_name}</div>
                                <div className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">{vessel.account_type.replace('_', ' ')}</div>
                              </div>
                            </div>
                            <div className="text-gray-600 group-hover:text-gray-400 transition-colors">
                              &rarr;
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

      <AddPartyModal
        isOpen={isAddPartyOpen}
        onClose={() => setIsAddPartyOpen(false)}
        workbenchId={activeWorkbench.id}
        onSuccess={loadParties}
      />

      <AddVesselModal
        isOpen={isAddVesselOpen}
        onClose={() => setIsAddVesselOpen(false)}
        workbenchId={activeWorkbench.id}
        partyId={selectedPartyId}
        onSuccess={loadParties}
      />

      <PartyAnalyticsModal
        isOpen={!!analyticsParty}
        onClose={() => setAnalyticsParty(null)}
        party={analyticsParty}
      />
    </div>
  );
}
