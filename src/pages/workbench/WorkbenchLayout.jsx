import React from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useWorkbench } from "../../context/WorkbenchContext";
import { BsPerson, BsBuilding, BsGear, BsFileEarmarkText, BsDiagram3 } from "react-icons/bs";

export default function WorkbenchLayout() {
  const { activeWorkbench } = useWorkbench();
  const location = useLocation();
  const navigate = useNavigate();

  if (!activeWorkbench) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500 font-dm-sans bg-[#111111]">
        Select a workbench to view details.
      </div>
    );
  }

  const navItems = [
    { label: "Members", path: "/dashboard/workbench/members", icon: BsPerson },
    { label: "Parties", path: "/dashboard/workbench/parties", icon: BsBuilding },
    { label: "COA", path: "/dashboard/workbench/coa", icon: BsDiagram3 },
    { label: "Doc Vault", path: "/dashboard/workbench/doc-vault", icon: BsFileEarmarkText },
    { label: "Settings", path: "/dashboard/workbench/settings", icon: BsGear },
  ];

  return (
    <div className="h-full flex flex-col bg-[#111111] font-dm-sans">
      {/* Workbench Navigation Header */}
      <div className="border-b border-white/10 bg-[#181818] px-6 lg:px-10 pt-6">
        <div className="max-w-7xl mx-auto flex flex-col space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="h-12 w-12 bg-teal-500/10 border border-teal-500/20 text-teal-400 rounded-xl flex items-center justify-center text-2xl font-bold">
                {activeWorkbench.name.charAt(0)}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white tracking-tight">{activeWorkbench.name}</h2>
                <div className="flex items-center space-x-2 mt-1">
                  <span className="text-xs text-gray-400 uppercase tracking-wider font-semibold">{activeWorkbench.business_type}</span>
                  <span className="text-gray-600">•</span>
                  <span className="text-xs text-gray-400 font-medium">{activeWorkbench.country}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex space-x-8">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname.includes(item.path);
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`pb-4 flex items-center space-x-2 border-b-2 transition-colors -mb-[1px] ${
                    isActive ? "border-teal-500 text-teal-400" : "border-transparent text-gray-400 hover:text-white"
                  }`}
                >
                  <Icon />
                  <span className="font-semibold text-sm">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Page Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <Outlet />
      </div>
    </div>
  );
}
