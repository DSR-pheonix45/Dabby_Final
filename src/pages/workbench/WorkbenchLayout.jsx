import React, { useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useWorkbench } from "../../context/WorkbenchContext";
import { apiFetch } from "../../lib/apiClient";
import { BsPerson, BsBuilding, BsGear, BsFileEarmarkText, BsDiagram3, BsGraphUp, BsCpu, BsJournalText, BsLightningCharge, BsFileEarmarkBarGraph, BsArrowRepeat } from "react-icons/bs";
import GeneratorModal from "./GeneratorModal";
import ReportsModal from "./ReportsModal";
import { toast } from "react-hot-toast";

export default function WorkbenchLayout() {
  const { activeWorkbench } = useWorkbench();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [isGeneratorModalOpen, setIsGeneratorModalOpen] = useState(false);
  const [isReportsModalOpen, setIsReportsModalOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const handleQuickSync = async () => {
    if (!activeWorkbench?.id) return;
    setSyncing(true);
    const toastId = toast.loading("Executing sync with Zoho Books...");
    try {
      const resp = await apiFetch("/api/integrations/zoho/sync", {
        method: "POST",
        body: JSON.stringify({ workbench_id: activeWorkbench.id, sync_type: "manual" })
      });
      const result = await resp.json();
      if (resp.ok && result.status === "success") {
        toast.success(`Sync complete! ${result.records_imported} records imported.`, { id: toastId });
      } else {
        toast.error("No active Zoho connection found. Opening Integrations...", { id: toastId });
        navigate("/dashboard/workbench/integrations");
      }
    } catch (err) {
      toast.error("Opening Integrations setup...", { id: toastId });
      navigate("/dashboard/workbench/integrations");
    } finally {
      setSyncing(false);
    }
  };

  if (!activeWorkbench) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500 font-dm-sans bg-[#111111]">
        Select a workbench to view details.
      </div>
    );
  }

  const navItems = [
    { label: "Business Engine", path: "/dashboard/workbench/business-engine", icon: BsCpu },
    { label: "Financials", path: "/dashboard/workbench/ledger", icon: BsJournalText },
    { label: "Integrations", path: "/dashboard/workbench/integrations", icon: BsLightningCharge },
    { label: "Members", path: "/dashboard/workbench/members", icon: BsPerson },
    { label: "Parties", path: "/dashboard/workbench/parties", icon: BsBuilding },
    { label: "COA", path: "/dashboard/workbench/coa", icon: BsDiagram3 },
    { label: "Doc Vault", path: "/dashboard/workbench/doc-vault", icon: BsFileEarmarkText },
    { label: "OPS", path: "/dashboard/workbench/ops", icon: BsGraphUp },
    { label: "Settings", path: "/dashboard/workbench/settings", icon: BsGear },
  ];

  return (
    <div className="h-full flex flex-col bg-[#111111] font-dm-sans">
      {/* Workbench Navigation Header */}
      <div className="border-b border-white/10 bg-[#181818] px-6 lg:px-10 pt-6">
        <div className="max-w-7xl mx-auto flex flex-col space-y-6">
          <div className="flex items-center justify-between">
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
          </div>
          <div className="flex items-center justify-between">
            <div 
              className="flex space-x-8 overflow-x-auto" 
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              <style dangerouslySetInnerHTML={{__html: `\n                .flex.space-x-8.overflow-x-auto::-webkit-scrollbar {\n                  display: none;\n                }\n              `}} />
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname.includes(item.path);
                return (
                  <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className={`pb-4 flex items-center space-x-2 border-b-2 transition-colors -mb-[1px] whitespace-nowrap ${
                      isActive ? "border-teal-500 text-teal-400" : "border-transparent text-gray-400 hover:text-white"
                    }`}
                  >
                    <Icon />
                    <span className="font-semibold text-sm">{item.label}</span>
                  </button>
                );
              })}
            </div>
            
            <div className="flex items-center space-x-3 pb-4 shrink-0">
              <div className="h-6 w-[1px] bg-white/10 mr-2 hidden md:block"></div>
              <button 
                onClick={handleQuickSync}
                disabled={syncing}
                className="flex items-center space-x-2 px-3 py-1.5 bg-teal-500 hover:bg-teal-400 text-black rounded-lg text-sm font-bold transition-colors shadow-sm disabled:opacity-50"
                title="Sync Zoho Books ERP"
              >
                <BsArrowRepeat className={syncing ? "animate-spin" : ""} />
                <span>{syncing ? "Syncing..." : "Sync Zoho"}</span>
              </button>
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
