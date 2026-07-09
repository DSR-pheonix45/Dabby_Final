import React, { useState } from "react";
import { useWorkbench } from "../context/WorkbenchContext";
import { useAuth } from "../hooks/useAuth";
import { BsSearch, BsGrid, BsListUl, BsThreeDots } from "react-icons/bs";
import { HiChevronDown } from "react-icons/hi";
import CreateWorkbenchModal from "../components/Workbenches/CreateWorkbenchModal";
import { useNavigate } from "react-router-dom";

export default function Workbenches() {
  const { workbenches, activeWorkbench, changeActiveWorkbench } = useWorkbench();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  const filteredWorkbenches = workbenches.filter((wb) =>
    wb.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-full bg-[#111111] overflow-y-auto custom-scrollbar p-6 lg:p-10 font-dm-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-white tracking-tight">Projects</h1>
        </div>

        {/* Toolbar Section */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div className="flex items-center space-x-3 w-full md:w-auto">
            <div className="relative w-full md:w-64">
              <BsSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                placeholder="Search for a project"
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
              className="flex items-center space-x-2 px-3 py-1.5 bg-[#24B47E] hover:bg-[#20A070] text-black font-semibold text-sm rounded-md transition-colors"
            >
              <span className="text-lg leading-none mb-0.5">+</span>
              <span>New project</span>
            </button>
          </div>
        </div>

        {/* Workbenches Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredWorkbenches.map((wb) => (
            <div
              key={wb.id}
              onClick={() => {
                changeActiveWorkbench(wb);
                navigate("/dashboard");
              }}
              className={`bg-[#181818] border ${
                activeWorkbench?.id === wb.id
                  ? "border-[#24B47E]"
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
                <button
                  className="text-gray-500 hover:text-white p-1 rounded hover:bg-white/10 transition-colors opacity-0 group-hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                >
                  <BsThreeDots />
                </button>
              </div>

              <div className="mt-auto pt-4 flex items-center space-x-2">
                <span className="px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide bg-white/5 text-gray-400 rounded">
                  {wb.business_type}
                </span>
                <span className="px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide bg-white/5 text-gray-400 rounded">
                  {wb.currency}
                </span>
                {activeWorkbench?.id === wb.id && (
                  <span className="px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide bg-[#24B47E]/10 text-[#24B47E] rounded ml-auto border border-[#24B47E]/20">
                    Active
                  </span>
                )}
              </div>
            </div>
          ))}
          {filteredWorkbenches.length === 0 && (
            <div className="col-span-full py-12 text-center text-gray-500">
              No projects found.
            </div>
          )}
        </div>
      </div>

      <CreateWorkbenchModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={(newWb) => {
          changeActiveWorkbench(newWb);
        }}
      />
    </div>
  );
}
