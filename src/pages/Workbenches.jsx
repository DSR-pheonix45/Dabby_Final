import React, { useState } from "react";
import { useWorkbench } from "../context/WorkbenchContext";
import { useAuth } from "../hooks/useAuth";
import { BsSearch, BsGrid, BsListUl, BsThreeDots, BsPencil, BsTrash } from "react-icons/bs";
import { HiChevronDown } from "react-icons/hi";
import CreateWorkbenchModal from "../components/Workbenches/CreateWorkbenchModal";
import { supabase } from "../lib/supabase";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";

export default function Workbenches() {
  const { workbenches, activeWorkbench, changeActiveWorkbench, fetchWorkbenches } = useWorkbench();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [openDropdownId, setOpenDropdownId] = useState(null);
  const [renamingWorkbench, setRenamingWorkbench] = useState(null);
  const [newWorkbenchName, setNewWorkbenchName] = useState("");
  const navigate = useNavigate();

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this workbench?")) return;
    
    setOpenDropdownId(null);
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

  const filteredWorkbenches = workbenches.filter((wb) =>
    wb.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
                placeholder="Search for a workbench"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#1A1A1A] border border-white/10 rounded-md py-1.5 pl-9 pr-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-white/20 transition-colors"
              />
            </div>

            <button className="hidden sm:flex items-center space-x-2 px-3 py-1.5 bg-[#1A1A1A] hover:bg-white/5 border border-white/10 rounded-md text-sm text-gray-300 transition-colors">
              <span>Status</span>
              <HiChevronDown />
            </button>
            <button className="hidden sm:flex items-center space-x-2 px-3 py-1.5 bg-[#1A1A1A] hover:bg-white/5 border border-white/10 rounded-md text-sm text-gray-300 transition-colors">
              <span>Sorted by name</span>
              <HiChevronDown />
            </button>
          </div>

          <div className="flex items-center space-x-3 w-full md:w-auto justify-between md:justify-end">
            <div className="flex items-center p-1 bg-[#1A1A1A] border border-white/10 rounded-md">
              <button className="p-1 text-white bg-white/10 rounded">
                <BsGrid />
              </button>
              <button className="p-1 text-gray-500 hover:text-white rounded transition-colors">
                <BsListUl />
              </button>
            </div>

            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center space-x-2 px-3 py-1.5 bg-teal-500 hover:bg-teal-400 text-black font-semibold text-sm rounded-md transition-colors"
            >
              <span className="text-lg leading-none mb-0.5">+</span>
              <span>New workbench</span>
            </button>
          </div>
        </div>

        {openDropdownId && (
          <div 
            className="fixed inset-0 z-10"
            onClick={() => setOpenDropdownId(null)}
          />
        )}
        {/* Workbenches Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 relative z-20">
          {filteredWorkbenches.map((wb) => (
            <div
              key={wb.id}
              onClick={() => {
                changeActiveWorkbench(wb);
                navigate("/dashboard");
              }}
              className={`bg-[#181818] border ${
                activeWorkbench?.id === wb.id
                  ? "border-teal-500"
                  : "border-white/10"
              } hover:border-white/20 rounded-lg p-5 cursor-pointer transition-all group flex flex-col`}
            >
              <div className="flex justify-between items-start mb-4">
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
                    className={`text-gray-500 hover:text-white p-1 rounded hover:bg-white/10 transition-colors ${openDropdownId === wb.id ? "opacity-100 bg-white/10" : "opacity-0 group-hover:opacity-100"}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenDropdownId(openDropdownId === wb.id ? null : wb.id);
                    }}
                  >
                    <BsThreeDots />
                  </button>
                  {openDropdownId === wb.id && (
                    <div 
                      className="absolute right-0 mt-1 w-36 bg-[#1A1A1A] border border-white/10 rounded-md shadow-lg overflow-hidden z-30"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-white/5 hover:text-white flex items-center space-x-2 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          setRenamingWorkbench(wb);
                          setNewWorkbenchName(wb.name);
                          setOpenDropdownId(null);
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

              <div className="mt-auto pt-4 flex items-center space-x-2">
                <span className="px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide bg-white/5 text-gray-400 rounded">
                  {wb.business_type}
                </span>
                <span className="px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide bg-white/5 text-gray-400 rounded">
                  {wb.currency}
                </span>
                {activeWorkbench?.id === wb.id && (
                  <span className="px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide bg-teal-500/10 text-teal-400 rounded ml-auto border border-teal-500/20">
                    Active
                  </span>
                )}
              </div>
            </div>
          ))}
          {filteredWorkbenches.length === 0 && (
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
