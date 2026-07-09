import React, { useState, useEffect } from "react";
import { useWorkbench } from "../../context/WorkbenchContext";
import { BsBuilding, BsSearch, BsThreeDots, BsFilter } from "react-icons/bs";
import { collaborationService } from "../../services/collaborationService";

export default function Parties() {
  const { activeWorkbench } = useWorkbench();
  const [searchQuery, setSearchQuery] = useState("");
  const [parties, setParties] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (activeWorkbench) {
      loadParties();
    }
  }, [activeWorkbench]);

  const loadParties = async () => {
    setIsLoading(true);
    try {
      const data = await collaborationService.getParties(activeWorkbench.id);
      setParties(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!activeWorkbench) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500 font-dm-sans">
        Select a workbench to view parties.
      </div>
    );
  }

  return (
    <div className="h-full bg-[#111111] overflow-y-auto custom-scrollbar p-6 lg:p-10 font-dm-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Business Parties</h1>
            <p className="text-gray-400 text-sm mt-1">Manage customers, vendors, and other actors for {activeWorkbench.name}</p>
          </div>
          <button className="flex items-center space-x-2 px-4 py-2 bg-teal-500 hover:bg-teal-400 text-black font-semibold text-sm rounded-md transition-colors w-full sm:w-auto justify-center">
            <BsBuilding size={16} />
            <span>Add Party</span>
          </button>
        </div>

        {/* Toolbar Section */}
        <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div className="relative w-full max-w-md">
            <BsSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Search by name, email, or type"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#1A1A1A] border border-white/10 rounded-md py-2 pl-9 pr-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-white/20 transition-colors"
            />
          </div>
          <button className="flex items-center space-x-2 px-3 py-2 bg-[#1A1A1A] hover:bg-white/5 border border-white/10 rounded-md text-sm text-gray-300 transition-colors">
            <BsFilter />
            <span>Filter</span>
          </button>
        </div>

        {/* Parties List */}
        {isLoading ? (
          <div className="py-12 text-center text-gray-500">Loading parties...</div>
        ) : parties.length === 0 ? (
          <div className="py-12 text-center text-gray-500">No parties found.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {parties.map(party => (
              <div key={party.id} className="bg-[#181818] border border-white/10 hover:border-white/20 rounded-lg p-5 cursor-pointer transition-all group flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1 min-w-0 pr-4">
                    <h3 className="text-white font-medium text-base truncate">{party.name}</h3>
                    <div className="text-xs text-gray-500 mt-1 truncate">{party.email || "No email"}</div>
                  </div>
                  <button className="text-gray-500 hover:text-white p-1 rounded hover:bg-white/10 transition-colors opacity-0 group-hover:opacity-100">
                    <BsThreeDots />
                  </button>
                </div>
                <div className="mt-auto pt-4 flex items-center space-x-2">
                  <span className="px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide bg-blue-500/10 text-blue-400 rounded border border-blue-500/20">
                    {party.party_type}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
