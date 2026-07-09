import React, { useState } from "react";
import { useWorkbench } from "../../context/WorkbenchContext";
import { BsBuildingPlus, BsSearch, BsThreeDots, BsFilter } from "react-icons/bs";

export default function Parties() {
  const { activeWorkbench } = useWorkbench();
  const [searchQuery, setSearchQuery] = useState("");

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
            <BsBuildingPlus size={16} />
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

        {/* Parties List Shell */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Mock Card */}
          <div className="bg-[#181818] border border-white/10 hover:border-white/20 rounded-lg p-5 cursor-pointer transition-all group flex flex-col">
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1 min-w-0 pr-4">
                <h3 className="text-white font-medium text-base truncate">Acme Corp</h3>
                <div className="text-xs text-gray-500 mt-1 truncate">hello@acmecorp.example.com</div>
              </div>
              <button className="text-gray-500 hover:text-white p-1 rounded hover:bg-white/10 transition-colors opacity-0 group-hover:opacity-100">
                <BsThreeDots />
              </button>
            </div>
            <div className="mt-auto pt-4 flex items-center space-x-2">
              <span className="px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide bg-blue-500/10 text-blue-400 rounded border border-blue-500/20">
                Customer
              </span>
              <span className="px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide bg-white/5 text-gray-400 rounded">
                USA
              </span>
            </div>
          </div>

          <div className="bg-[#181818] border border-white/10 hover:border-white/20 rounded-lg p-5 cursor-pointer transition-all group flex flex-col">
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1 min-w-0 pr-4">
                <h3 className="text-white font-medium text-base truncate">Global Supplies Ltd</h3>
                <div className="text-xs text-gray-500 mt-1 truncate">vendor@globalsupplies.example.com</div>
              </div>
              <button className="text-gray-500 hover:text-white p-1 rounded hover:bg-white/10 transition-colors opacity-0 group-hover:opacity-100">
                <BsThreeDots />
              </button>
            </div>
            <div className="mt-auto pt-4 flex items-center space-x-2">
              <span className="px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide bg-orange-500/10 text-orange-400 rounded border border-orange-500/20">
                Vendor
              </span>
              <span className="px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide bg-white/5 text-gray-400 rounded">
                UK
              </span>
            </div>
          </div>
        </div>

        <div className="py-8 text-center text-gray-500 text-sm border-t border-white/5 mt-8">
          This is a shell layout. Data fetching will be wired up later.
        </div>

      </div>
    </div>
  );
}
