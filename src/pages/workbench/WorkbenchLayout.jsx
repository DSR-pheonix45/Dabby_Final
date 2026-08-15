import React, { useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useWorkbench } from "../../context/WorkbenchContext";
import { 
  BsPerson, 
  BsBuilding, 
  BsGear, 
  BsFileEarmarkText, 
  BsDiagram3, 
  BsGraphUp, 
  BsJournalText, 
  BsLightningCharge, 
  BsFileEarmarkBarGraph, 
  BsCartCheck, 
  BsBagCheck,
  BsChevronUp,
  BsChevronDown
} from "react-icons/bs";
import GeneratorModal from "./GeneratorModal";
import ReportsModal from "./ReportsModal";

export default function WorkbenchLayout() {
  const { activeWorkbench } = useWorkbench();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [isGeneratorModalOpen, setIsGeneratorModalOpen] = useState(false);
  const [isReportsModalOpen, setIsReportsModalOpen] = useState(false);
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(() => {
    return localStorage.getItem("dabby_wb_header_collapsed") === "true";
  });

  if (!activeWorkbench) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500 font-dm-sans bg-[#111111]">
        Select a workbench to view details.
      </div>
    );
  }

  const toggleHeader = () => {
    setIsHeaderCollapsed(prev => {
      const next = !prev;
      localStorage.setItem("dabby_wb_header_collapsed", String(next));
      return next;
    });
  };

  const navItems = [
    { label: "Members", path: "/dashboard/workbench/members", icon: BsPerson },
    { label: "Parties", path: "/dashboard/workbench/parties", icon: BsBuilding },
    { label: "Doc Vault", path: "/dashboard/workbench/doc-vault", icon: BsFileEarmarkText },
    { label: "Sales", path: "/dashboard/workbench/sales", icon: BsCartCheck },
    { label: "Purchases & Expenses", path: "/dashboard/workbench/purchases", icon: BsBagCheck },
    { label: "OPS", path: "/dashboard/workbench/ops", icon: BsGraphUp },
    { label: "Financials", path: "/dashboard/workbench/ledger", icon: BsJournalText },
    { label: "COA", path: "/dashboard/workbench/coa", icon: BsDiagram3 },
    { label: "Settings", path: "/dashboard/workbench/settings", icon: BsGear },
  ];

  return (
    <div className="h-full flex flex-col bg-[#111111] font-dm-sans">
      {/* Workbench Navigation Header */}
      <div className={`border-b border-white/10 bg-[#181818] px-6 lg:px-10 transition-all duration-200 ${isHeaderCollapsed ? "pt-3 pb-0" : "pt-6"}`}>
        <div className={`w-full flex flex-col ${isHeaderCollapsed ? "space-y-1" : "space-y-5"}`}>
          
          {/* Foldable Company Info Row */}
          {!isHeaderCollapsed && (
            <div className="flex items-center justify-between animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center space-x-4">
                <div className="h-12 w-12 bg-teal-500/10 border border-teal-500/20 text-teal-400 rounded-xl flex items-center justify-center text-2xl font-bold overflow-hidden shrink-0">
                  {activeWorkbench.logo ? (
                    <img src={activeWorkbench.logo} alt={`${activeWorkbench.name} Logo`} className="w-full h-full object-cover" />
                  ) : (
                    activeWorkbench.name.charAt(0)
                  )}
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

              {/* Fold Header Toggle Button */}
              <button
                onClick={toggleHeader}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 hover:text-white text-xs font-semibold transition-colors"
                title="Fold Company Info"
              >
                <BsChevronUp className="text-xs" />
                <span>Fold Header</span>
              </button>
            </div>
          )}

          {/* Navigation Bar Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {/* Unfold Header Toggle Button */}
              {isHeaderCollapsed && (
                <button
                  onClick={toggleHeader}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/20 text-teal-400 text-xs font-semibold transition-colors shrink-0 mb-3"
                  title="Expand Company Info"
                >
                  <BsChevronDown className="text-xs" />
                  <span className="truncate max-w-[120px]">{activeWorkbench.name}</span>
                </button>
              )}

              <div 
                className="flex space-x-8 overflow-x-auto" 
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                <style dangerouslySetInnerHTML={{__html: `
                  .flex.space-x-8.overflow-x-auto::-webkit-scrollbar {
                    display: none;
                  }
                `}} />
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname.includes(item.path);
                  return (
                    <button
                      key={item.path}
                      onClick={() => navigate(item.path)}
                      className={`pb-3 flex items-center space-x-2 border-b-2 transition-colors -mb-[1px] whitespace-nowrap ${
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
            
            <div className="flex items-center space-x-3 pb-3 shrink-0">
              <div className="h-6 w-[1px] bg-white/10 mr-2 hidden md:block"></div>
              <button 
                onClick={() => setIsGeneratorModalOpen(true)}
                className="flex items-center space-x-2 px-3 py-1.5 bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 border border-teal-500/20 rounded-lg text-sm font-semibold transition-colors"
                title="Generators"
              >
                <BsLightningCharge />
                <span>Generators</span>
              </button>
              <button 
                onClick={() => setIsReportsModalOpen(true)}
                className="flex items-center space-x-2 px-3 py-1.5 bg-[#222] hover:bg-[#333] text-gray-300 hover:text-white border border-white/10 rounded-lg text-sm font-semibold transition-colors"
                title="Reports"
              >
                <BsFileEarmarkBarGraph />
                <span>Reports</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Page Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <Outlet context={{ workbench: activeWorkbench }} />
      </div>

      <GeneratorModal isOpen={isGeneratorModalOpen} onClose={() => setIsGeneratorModalOpen(false)} />
      <ReportsModal isOpen={isReportsModalOpen} onClose={() => setIsReportsModalOpen(false)} />
    </div>
  );
}
