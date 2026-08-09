import React, { useState } from "react";
import { useWorkbench } from "../context/WorkbenchContext";
import { useAuth } from "../hooks/useAuth";
import { BsSearch, BsGrid, BsListUl, BsThreeDots, BsPencil, BsTrash, BsX, BsKeyFill } from "react-icons/bs";
import { HiChevronDown } from "react-icons/hi";
import CreateWorkbenchModal from "../components/Workbenches/CreateWorkbenchModal";
import AccessWorkbenchModal from "../components/Workbenches/AccessWorkbenchModal";
import LicenseCredentialsModal from "../components/Workbenches/LicenseCredentialsModal";
import { supabase } from "../lib/supabase";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";

export default function Workbenches() {
  const { workbenches, activeWorkbench, changeActiveWorkbench, fetchWorkbenches } = useWorkbench();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAccessModalOpen, setIsAccessModalOpen] = useState(false);
  const [selectedLicenseWb, setSelectedLicenseWb] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [openDropdown, setOpenDropdown] = useState(null);
  const [statusFilter, setStatusFilter] = useState("Status");
  const [sortBy, setSortBy] = useState("Sorted by name");
  const [viewMode, setViewMode] = useState("grid");
  const [renamingWorkbench, setRenamingWorkbench] = useState(null);
  const [newWorkbenchName, setNewWorkbenchName] = useState("");
  const navigate = useNavigate();

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this workbench?")) return;
    
    setOpenDropdown(null);
    const { error } = await supabase.from("workbenches").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete workbench");
    } else {
      toast.success("Workbench deleted");
      if (activeWorkbench?.id === id) {
        changeActiveWorkbench(null);
      }
      fetchWorkbenches();
    }
  };

  const handleRenameSubmit = async (e) => {
    e.preventDefault();
    if (!newWorkbenchName.trim()) return;

    const { error } = await supabase
      .from("workbenches")
      .update({ name: newWorkbenchName.trim() })
      .eq("id", renamingWorkbench.id);

    if (error) {
      toast.error("Failed to rename workbench");
    } else {
      toast.success("Workbench renamed");
      setRenamingWorkbench(null);
      setNewWorkbenchName("");
      fetchWorkbenches();
    }
  };

  let finalWorkbenches = workbenches.filter((wb) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.trim().toLowerCase();
    const name = (wb.name || "").toLowerCase();
    const legalName = (wb.legal_name || "").toLowerCase();
    const industry = (wb.industry || "").toLowerCase();
    const country = (wb.country || "").toLowerCase();
    const bType = (wb.business_type || "").toLowerCase();
    return (
      name.includes(query) || 
      legalName.includes(query) || 
      industry.includes(query) || 
      country.includes(query) ||
      bType.includes(query)
    );
  });

  if (statusFilter === "Active") {
    finalWorkbenches = finalWorkbenches.filter(wb => activeWorkbench?.id === wb.id);
  }

  finalWorkbenches.sort((a, b) => {
    if (sortBy === "Name (A-Z)") return (a.name || "").localeCompare(b.name || "");
    if (sortBy === "Name (Z-A)") return (b.name || "").localeCompare(a.name || "");
    if (sortBy === "Newest") return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    if (sortBy === "Oldest") return new Date(a.created_at || 0) - new Date(b.created_at || 0);
    return 0;
  });

  return (
    <div className="h-full bg-[#111111] overflow-y-auto custom-scrollbar p-6 lg:p-10 font-dm-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-white tracking-tight">Workbenches</h1>
        </div>

        {/* Toolbar Section */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div className="flex items-center space-x-3 w-full md:w-auto">
            <div className="relative w-full md:w-64">
              <BsSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                placeholder="Search for a workbench..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#1A1A1A] border border-white/10 rounded-md py-1.5 pl-9 pr-8 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-white/20 transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                  title="Clear search"
                >
                  <BsX size={16} />
                </button>
              )}
            </div>

            <div className="relative hidden sm:block z-30">
              <button 
                onClick={() => setOpenDropdown(openDropdown === "status" ? null : "status")}
                className="flex items-center space-x-2 px-3 py-1.5 bg-[#1A1A1A] hover:bg-white/5 border border-white/10 rounded-md text-sm text-gray-300 transition-colors"
              >
                <span>{statusFilter}</span>
                <HiChevronDown />
              </button>
              {openDropdown === "status" && (
                <div className="absolute left-0 mt-1 w-32 bg-[#1A1A1A] border border-white/10 rounded-md shadow-lg overflow-hidden">
                  {["Status", "Active"].map(opt => (
                    <button
                      key={opt}
                      onClick={() => { setStatusFilter(opt); setOpenDropdown(null); }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
                    >
                      {opt === "Status" ? "All" : opt}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="relative hidden sm:block z-30">
              <button 
                onClick={() => setOpenDropdown(openDropdown === "sort" ? null : "sort")}
                className="flex items-center space-x-2 px-3 py-1.5 bg-[#1A1A1A] hover:bg-white/5 border border-white/10 rounded-md text-sm text-gray-300 transition-colors"
              >
                <span>{sortBy}</span>
                <HiChevronDown />
              </button>
              {openDropdown === "sort" && (
                <div className="absolute left-0 mt-1 w-40 bg-[#1A1A1A] border border-white/10 rounded-md shadow-lg overflow-hidden">
                  {["Sorted by name", "Name (A-Z)", "Name (Z-A)", "Newest", "Oldest"].map(opt => (
                    <button
                      key={opt}
                      onClick={() => { setSortBy(opt); setOpenDropdown(null); }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
                    >
                      {opt === "Sorted by name" ? "Default" : opt}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-3 w-full md:w-auto justify-between md:justify-end">
            <div className="flex items-center p-1 bg-[#1A1A1A] border border-white/10 rounded-md">
              <button 
                onClick={() => setViewMode("grid")}
                className={`p-1 rounded transition-colors ${viewMode === "grid" ? "text-white bg-white/10" : "text-gray-500 hover:text-white"}`}
              >
                <BsGrid />
              </button>
              <button 
                onClick={() => setViewMode("list")}
                className={`p-1 rounded transition-colors ${viewMode === "list" ? "text-white bg-white/10" : "text-gray-500 hover:text-white"}`}
              >
                <BsListUl />
              </button>
            </div>

            <button
              onClick={() => setIsAccessModalOpen(true)}
              className="flex items-center space-x-2 px-3.5 py-1.5 bg-[#1A1A1A] hover:bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold text-sm rounded-md transition-colors shadow-sm"
              title="Access an existing workbench using its License Key & Password"
            >
              <BsKeyFill size={14} />
              <span>Access Workbench</span>
            </button>

            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center space-x-2 px-3 py-1.5 bg-teal-500 hover:bg-teal-400 text-black font-semibold text-sm rounded-md transition-colors"
            >
              <span className="text-lg leading-none mb-0.5">+</span>
              <span>New workbench</span>
            </button>
          </div>
        </div>

        {openDropdown && (
          <div 
            className="fixed inset-0 z-10"
            onClick={() => setOpenDropdown(null)}
          />
        )}
        {/* Workbenches Grid */}
        <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 relative z-20" : "flex flex-col gap-3 relative z-20"}>
          {finalWorkbenches.map((wb) => (
            <div
              key={wb.id}
              onClick={() => {
                changeActiveWorkbench(wb);
                navigate("/dashboard/workbench/members");
              }}
              className={`bg-[#181818] border ${
                activeWorkbench?.id === wb.id
                  ? "border-teal-500"
                  : "border-white/10"
              } hover:border-white/20 rounded-lg p-5 cursor-pointer transition-all group flex ${viewMode === "grid" ? "flex-col" : "flex-row items-center justify-between"}`}
            >
              <div className={`flex justify-between items-start ${viewMode === "grid" ? "mb-4" : "flex-1 mr-4 items-center"}`}>
                <div className="flex-1 min-w-0 pr-4">
                  <h3 className="text-white font-medium text-base truncate">
                    {wb.name}
                  </h3>
                  <div className="text-xs text-gray-500 mt-1 truncate">
                    {wb.country} | {wb.industry}
                  </div>
                </div>
                <div className="relative">
                  <button
                    className={`text-gray-500 hover:text-white p-1 rounded hover:bg-white/10 transition-colors ${openDropdown === wb.id ? "opacity-100 bg-white/10" : "opacity-0 group-hover:opacity-100"}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenDropdown(openDropdown === wb.id ? null : wb.id);
                    }}
                  >
                    <BsThreeDots />
                  </button>
                  {openDropdown === wb.id && (
                    <div 
                      className="absolute right-0 mt-1 w-40 bg-[#1A1A1A] border border-white/10 rounded-md shadow-lg overflow-hidden z-30"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        className="w-full text-left px-4 py-2 text-sm text-amber-400 hover:bg-white/5 flex items-center space-x-2 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedLicenseWb(wb);
                          setOpenDropdown(null);
                        }}
                      >
                        <BsKeyFill size={12} />
                        <span>Key & Password</span>
                      </button>
                      <button
                        className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-white/5 hover:text-white flex items-center space-x-2 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          setRenamingWorkbench(wb);
                          setNewWorkbenchName(wb.name);
                          setOpenDropdown(null);
                        }}
                      >
                        <BsPencil size={12} />
                        <span>Rename</span>
                      </button>
                      <button
                        className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-400/10 hover:text-red-300 flex items-center space-x-2 transition-colors"
                        onClick={(e) => handleDelete(wb.id, e)}
                      >
                        <BsTrash size={12} />
                        <span>Delete</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className={`flex items-center space-x-2 ${viewMode === "grid" ? "mt-auto pt-4" : "border-l border-white/10 pl-4"}`}>
                <span className="px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide bg-white/5 text-gray-400 rounded">
                  {wb.business_type}
                </span>
                <span className="px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide bg-white/5 text-gray-400 rounded">
                  {wb.currency}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedLicenseWb(wb);
                  }}
                  className="px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 rounded border border-amber-500/20 flex items-center gap-1 transition-colors ml-auto"
                  title="View License Key & Access Password"
                >
                  <BsKeyFill className="w-2.5 h-2.5" />
                  Key
                </button>
                {activeWorkbench?.id === wb.id && (
                  <span className="px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide bg-teal-500/10 text-teal-400 rounded ml-auto border border-teal-500/20">
                    Active
                  </span>
                )}
              </div>
            </div>
          ))}
          {finalWorkbenches.length === 0 && (
            <div className="col-span-full py-12 text-center text-gray-500">
              No workbenches found.
            </div>
          )}
        </div>
      </div>

      <CreateWorkbenchModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={async (newWb) => {
          await fetchWorkbenches();
          changeActiveWorkbench(newWb);
        }}
      />

      <AccessWorkbenchModal
        isOpen={isAccessModalOpen}
        onClose={() => setIsAccessModalOpen(false)}
        onSuccess={async (wb) => {
          await fetchWorkbenches();
          changeActiveWorkbench(wb);
        }}
      />

      <LicenseCredentialsModal
        isOpen={!!selectedLicenseWb}
        onClose={() => setSelectedLicenseWb(null)}
        workbench={selectedLicenseWb}
      />

      {renamingWorkbench && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111111] border border-white/10 rounded-xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-white/10">
              <h2 className="text-xl font-bold text-white tracking-tight">Rename Workbench</h2>
            </div>
            <form onSubmit={handleRenameSubmit} className="p-6">
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">New Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  value={newWorkbenchName}
                  onChange={(e) => setNewWorkbenchName(e.target.value)}
                  className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-colors"
                  autoFocus
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setRenamingWorkbench(null)}
                  className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newWorkbenchName.trim() || newWorkbenchName === renamingWorkbench.name}
                  className="px-6 py-2 bg-teal-500 hover:bg-teal-400 text-black font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
