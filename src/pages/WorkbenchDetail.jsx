import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  BsChevronLeft,
  BsSearch,
  BsFileEarmarkText,
  BsStars,
  BsShieldCheck,
  BsFolder2,
  BsLightningCharge,
  BsArrowUpRight,
  BsBoxSeam,
  BsGear,
  BsPlusLg,
  BsArrowLeftRight,
  BsCheckCircle,
  BsListUl,
  BsWrench,
  BsGraphUp,
  BsJournalText
} from "react-icons/bs";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "../lib/supabase";

// Sub-components
import LiquidityCenter from "../components/Workbenches/detail/LiquidityCenter";
import COAView from "../components/Workbenches/detail/COAView";
import OpsOverview from "../components/Workbenches/detail/OpsOverview";
import InvestorView from "../components/Workbenches/InvestorView";
import LogsView from "../components/Workbenches/LogsView";
import DocVault from "../components/Workbenches/detail/DocVault";
import OperationsView from "../components/Workbenches/OperationsView";
import ReportGenerationModal from "../components/Workbenches/ReportGenerationModal";
// Sub-components
import InventoryView from "../components/Workbenches/detail/InventoryView";
import WorkbenchSettings from "../components/Workbenches/WorkbenchSettings";
import TransactionModal from "../components/Workbenches/ledger/TransactionModal";
import Rulesets from "./Rulesets";
import PlanUsageBadge from "../components/Workbenches/PlanUsageBadge";

// Phase 3 Views
import BusinessHealthView from "../components/Workbenches/detail/BusinessHealthView";
import RealityReviewView from "../components/Workbenches/detail/RealityReviewView";
import BusinessEventsView from "../components/Workbenches/detail/BusinessEventsView";
import SettlementsView from "../components/Workbenches/detail/SettlementsView";
import CashFlowView from "../components/Workbenches/detail/CashFlowView";
import LedgerView from "../components/Workbenches/detail/LedgerView";
import DiagnosticsView from "../components/Workbenches/detail/DiagnosticsView";
import PlanUsageBadge from "../components/Workbenches/PlanUsageBadge";

import { WorkbenchProvider } from "../context/WorkbenchContext";

export default function WorkbenchDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [workbench, setWorkbench] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("BusinessHealth");
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);

  const [isUnlocked, setIsUnlocked] = useState(false);
  const [enteredPassword, setEnteredPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const fetchWorkbench = useCallback(async () => {
    if (authLoading || !user) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("workbenches")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error || !data) {
        navigate("/dashboard/workbenches");
        return;
      }
      setWorkbench(data);
      const unlocked = sessionStorage.getItem(`workbench_unlocked_${id}`) === "true";
      const hasPassword = !!data.settings?.workbench_password;
      setIsUnlocked(!hasPassword || unlocked);
    } catch (err) {
      console.error("Error fetching workbench:", err);
      navigate("/dashboard/workbenches");
    } finally {
      setLoading(false);
    }
  }, [id, navigate, user, authLoading]);

  useEffect(() => {
    fetchWorkbench();
  }, [fetchWorkbench]);

  useEffect(() => {
    const handleRefresh = () => {
      fetchWorkbench();
    };
    window.addEventListener('refresh-workbench-detail', handleRefresh);
    return () => {
      window.removeEventListener('refresh-workbench-detail', handleRefresh);
    };
  }, [fetchWorkbench]);

  useEffect(() => {
    const handleOpenModal = () => setIsTransactionModalOpen(true);
    window.addEventListener('open-transaction-modal', handleOpenModal);
    
    const handleChangeTab = (e) => {
      if (e.detail?.tab) {
        setActiveTab(e.detail.tab);
      }
    };
    window.addEventListener('change-workbench-tab', handleChangeTab);
    
    return () => {
      window.removeEventListener('open-transaction-modal', handleOpenModal);
      window.removeEventListener('change-workbench-tab', handleChangeTab);
    };
  }, []);

  const handleUnlock = (e) => {
    e.preventDefault();
    const correctPassword = workbench?.settings?.workbench_password;
    if (enteredPassword === correctPassword) {
      setIsUnlocked(true);
      sessionStorage.setItem(`workbench_unlocked_${id}`, "true");
      setPasswordError("");
    } else {
      setPasswordError("Incorrect password. Please try again.");
    }
  };

  const showInventory = ['manufacturing', 'trading'].includes(workbench?.industry) && 
    workbench?.settings?.enable_inventory === true;

  useEffect(() => {
    if (activeTab === "Inventory" && !showInventory && workbench) {
      setActiveTab("COA");
    }
  }, [activeTab, showInventory, workbench]);

  const navGroups = [
    {
      title: "FINANCIAL DATA ROOM",
      items: [
        { id: "BusinessHealth", label: "Business Health", icon: BsGraphUp },
        { id: "RealityReview", label: "Reality Review", icon: BsCheckCircle },
        { id: "BusinessEvents", label: "Business Events", icon: BsListUl },
        { id: "Settlements", label: "Settlements", icon: BsArrowLeftRight },
        { id: "CashFlow", label: "Cash Flow", icon: BsLightningCharge },
      ]
    },
    {
      title: "REPORTING",
      items: [
        { id: "Investor", label: "Reports", icon: BsArrowUpRight },
        { id: "DocVault", label: "Documents", icon: BsFolder2 },
      ]
    },
    {
      title: "ACCOUNTING",
      items: [
        { id: "Ledger", label: "Ledger", icon: BsJournalText },
        { id: "COA", label: "Chart of Accounts", icon: BsShieldCheck },
        ...(showInventory ? [{ id: "Inventory", label: "Inventory & Stock", icon: BsBoxSeam }] : []),
      ]
    },
    {
      title: "SYSTEM",
      items: [
        { id: "Settings", label: "Settings", icon: BsGear },
        { id: "Diagnostics", label: "Diagnostics", icon: BsWrench },
      ]
    }
  ];

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#0a0a0a]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
      </div>
    );
  }

  if (!loading && !isUnlocked) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#0a0a0a] px-4">
        <div className="relative w-full max-w-md bg-white/[0.02] border border-white/5 p-8 rounded-[32px] shadow-2xl backdrop-blur-md space-y-6 text-center">
          <div className="w-16 h-16 bg-teal-500/10 border border-teal-500/20 rounded-2xl flex items-center justify-center text-teal-400 mx-auto shadow-lg shadow-teal-500/5 animate-pulse">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          
          <div className="space-y-1">
            <h3 className="text-xl font-bold text-white uppercase tracking-wider">{workbench?.name}</h3>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Password Protected Workspace</p>
          </div>

          <form onSubmit={handleUnlock} className="space-y-4">
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter workspace password"
                value={enteredPassword}
                onChange={(e) => setEnteredPassword(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white focus:outline-none focus:border-teal-500/50 transition-all font-medium text-sm text-center"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
              >
                {showPassword ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542 7z" /></svg>
                )}
              </button>
            </div>

            {passwordError && (
              <p className="text-xs text-rose-500 font-medium">{passwordError}</p>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => navigate("/dashboard/workbenches")}
                className="flex-1 py-3.5 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-2xl text-xs font-bold uppercase tracking-widest transition-all"
              >
                Go Back
              </button>
              <button
                type="submit"
                className="flex-1 py-3.5 bg-[#00FFD1] text-black rounded-2xl text-xs font-bold uppercase tracking-widest hover:shadow-lg hover:shadow-[#00FFD1]/20 transition-all hover:scale-[1.01]"
              >
                Unlock
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <WorkbenchProvider workbenchId={id}>
      <div className="flex h-screen w-full bg-[#0a0a0a] overflow-hidden">
        {/* Workbench Internal Sidebar */}
        <div className="w-64 border-r border-white/5 bg-[#0d1117]/50 flex flex-col flex-shrink-0">
          <div className="p-6 flex items-center space-x-4 border-b border-white/5">
            <button 
              onClick={() => navigate("/dashboard/workbenches")}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 transition-all"
            >
              <BsChevronLeft />
            </button>
            <div>
              <h2 className="text-sm font-bold text-white truncate w-32">{workbench?.name}</h2>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">Active Workbench</p>
            </div>
          </div>

          <nav className="flex-1 p-4 space-y-6 overflow-y-auto custom-scrollbar" data-tour="workbench-sidebar">
            {navGroups.map((group, groupIdx) => (
              <div key={groupIdx} className="space-y-2">
                <div className="px-4 py-1">
                  <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">{group.title}</span>
                </div>
                {group.items.map(item => (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                      activeTab === item.id 
                        ? "bg-teal-500/10 text-teal-400 border border-teal-500/20 shadow-lg shadow-teal-500/5" 
                        : "text-gray-500 hover:text-gray-300 hover:bg-white/5 border border-transparent"
                      }`}
                  >
                    <item.icon className={`text-lg transition-transform duration-200 ${activeTab === item.id ? "scale-110" : "group-hover:scale-110"}`} />
                    <span className="font-bold text-sm">{item.label}</span>
                  </button>
                ))}
              </div>
            ))}
          </nav>

          <div className="p-4 border-t border-white/5 space-y-3">
             <PlanUsageBadge workbenchId={id} />
             <div className="p-4 rounded-2xl bg-gradient-to-br from-teal-500/10 to-cyan-500/10 border border-teal-500/20">
                <div className="flex items-center space-x-2 mb-2">
                   <BsStars className="text-teal-400" />
                   <span className="text-[10px] font-bold text-teal-400 uppercase tracking-widest">AI Context</span>
                </div>
                <p className="text-[10px] text-gray-400 leading-relaxed">Currently analyzing this workbench for optimization.</p>
             </div>
          </div>
        </div>

        {/* Content Container */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <header className="h-16 border-b border-white/5 bg-[#0a0a0a] px-8 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="text-[10px] text-gray-500 uppercase tracking-widest font-black">Active Workbench:</span>
              <span className="text-xs font-bold text-white uppercase">{workbench?.name}</span>
            </div>

            <div className="flex items-center space-x-3">
              <button 
                onClick={() => setIsReportModalOpen(true)}
                className="flex items-center space-x-2 px-4 py-2 border border-white/10 rounded-xl text-xs font-bold text-gray-300 hover:text-white transition-all hover:bg-white/5"
              >
                <BsStars className="text-teal-400" />
                <span>Invoice & Reports</span>
              </button>
              
              <button 
                onClick={() => setIsTransactionModalOpen(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-teal-500 text-black rounded-xl text-xs font-bold hover:bg-teal-400 transition-all shadow-lg shadow-teal-500/10"
              >
                <BsPlusLg />
                <span>New Transaction</span>
              </button>
            </div>
          </header>

          <main className="flex-grow flex flex-col min-h-0 relative overflow-hidden" data-tour="workbench-content">
            {activeTab === "BusinessHealth" && <BusinessHealthView workbenchId={id} />}
            {activeTab === "RealityReview" && <RealityReviewView workbenchId={id} />}
            {activeTab === "BusinessEvents" && <BusinessEventsView workbenchId={id} />}
            {activeTab === "Settlements" && <SettlementsView workbenchId={id} />}
            {activeTab === "CashFlow" && <CashFlowView workbenchId={id} />}
            {activeTab === "Ledger" && <LedgerView workbenchId={id} />}
            {activeTab === "Diagnostics" && <DiagnosticsView workbenchId={id} />}
            {activeTab === "COA" && <COAView workbenchId={id} />}
            {activeTab === "Rulesets" && <Rulesets workbenchId={id} />}
            {activeTab === "Investor" && <div className="p-8 overflow-auto h-full custom-scrollbar"><InvestorView workbenchId={id} workbenchName={workbench?.name} /></div>}
            {activeTab === "DocVault" && <DocVault workbenchId={id} />}
            {activeTab === "Inventory" && <InventoryView workbenchId={id} />}
            {activeTab === "Settings" && <div className="overflow-auto h-full custom-scrollbar"><WorkbenchSettings workbench={workbench} workbenchId={id} /></div>}
          </main>
        </div>

        <TransactionModal
          isOpen={isTransactionModalOpen}
          onClose={() => setIsTransactionModalOpen(false)}
          workbenchId={id}
          onSuccess={() => {
            // Trigger refresh event for any listener
            window.dispatchEvent(new Event('refresh-ledger-data'));
          }}
        />

        <ReportGenerationModal
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
          workbenchId={id}
          workbenchName={workbench?.name}
        />
      </div>
    </WorkbenchProvider>
  );
}
