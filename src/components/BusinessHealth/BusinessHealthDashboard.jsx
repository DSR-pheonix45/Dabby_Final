import React, { useState, useEffect } from "react";
import {
  BsSliders2,
  BsBookmarkCheck,
  BsCheck2,
  BsArrowCounterclockwise,
  BsPlusLg,
  BsLightbulb,
  BsActivity,
  BsArrowRepeat,
} from "react-icons/bs";
import { toast } from "react-hot-toast";
import BusinessHealthCard from "./BusinessHealthCard";
import ActionCards from "../ActionCards/ActionCards";
import {
  KPI_REGISTRY,
  DEFAULT_ACTIVE_KPI_IDS,
  MIN_CARDS,
  MAX_CARDS,
} from "./kpiRegistry";
import { getWorkbenchMetrics } from "./workbenchMetricsHelper";

export default function BusinessHealthDashboard({
  workbench,
  onQuestionClick,
  isSidebarOpen,
  onToggleSidebar,
  activeKpiIds,
  setActiveKpiIds,
  onSaveLayout,
  isSaved,
}) {
  const [viewMode, setViewMode] = useState("health"); // "health" or "prompts"
  const [draggedCardId, setDraggedCardId] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [metricsData, setMetricsData] = useState(() => getWorkbenchMetrics(workbench));
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Re-compute metrics whenever workbench changes
  useEffect(() => {
    setMetricsData(getWorkbenchMetrics(workbench));
  }, [workbench?.id, workbench?.name]);

  const activeCards = activeKpiIds
    .map((id) => KPI_REGISTRY.find((k) => k.id === id))
    .filter(Boolean);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setMetricsData(getWorkbenchMetrics(workbench));
      setIsRefreshing(false);
      toast.success("Metrics updated for " + (workbench?.name || "Workbench"), {
        icon: "⚡",
      });
    }, 400);
  };

  // Reordering inside the grid
  const handleMoveCard = (fromIndex, toIndex) => {
    if (toIndex < 0 || toIndex >= activeKpiIds.length) return;
    setActiveKpiIds((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  };

  const handleRemoveCard = (cardId) => {
    if (activeKpiIds.length <= MIN_CARDS) {
      toast.error(`Minimum ${MIN_CARDS} cards required for dashboard`);
      return;
    }
    setActiveKpiIds((prev) => prev.filter((id) => id !== cardId));
    toast("Card removed from view", { icon: "🗑️" });
  };

  // HTML5 Drag and drop handlers within grid
  const handleDragStart = (e, cardId, index) => {
    e.dataTransfer.setData("text/plain", cardId);
    e.dataTransfer.effectAllowed = "move";
    setDraggedCardId(cardId);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e, targetIndex) => {
    e.preventDefault();
    setDragOverIndex(null);
    const incomingCardId = e.dataTransfer.getData("text/plain") || draggedCardId;
    if (!incomingCardId) return;

    // Check if card is already in layout
    const existingIndex = activeKpiIds.indexOf(incomingCardId);

    if (existingIndex !== -1) {
      // Reorder within grid
      handleMoveCard(existingIndex, targetIndex);
    } else {
      // Incoming from sidebar
      if (activeKpiIds.length >= MAX_CARDS) {
        toast.error(`Maximum ${MAX_CARDS} cards allowed. Remove one or swap.`);
        return;
      }
      setActiveKpiIds((prev) => {
        const next = [...prev];
        next.splice(targetIndex, 0, incomingCardId);
        return next;
      });
      toast.success("KPI card added to dashboard");
    }
    setDraggedCardId(null);
  };

  const handleAddSlotClick = () => {
    if (activeKpiIds.length >= MAX_CARDS) {
      toast.error(`Maximum ${MAX_CARDS} cards reached`);
      return;
    }
    onToggleSidebar();
  };

  return (
    <div className="px-3 sm:px-5 lg:px-8 py-3 sm:py-5 max-w-6xl mx-auto font-dm-sans">
      {/* Top Command Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-5 pb-3 border-b border-white/5">
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-400 animate-pulse shadow-[0_0_10px_rgba(20,184,166,0.8)]" />
            <h2 className="text-white text-sm sm:text-base font-bold tracking-tight">
              Business Health
            </h2>
          </div>

          <span className="text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-300">
            {workbench?.name || "Active Workbench"}
          </span>

          {/* Mode Switcher: Health vs Prompt recommendations */}
          <div className="flex items-center bg-black/40 border border-white/10 rounded-xl p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setViewMode("health")}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium transition-all ${
                viewMode === "health"
                  ? "bg-teal-500/20 text-teal-300 border border-teal-500/40 shadow-sm"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <BsActivity className="text-xs" /> KPIs ({activeCards.length})
            </button>
            <button
              type="button"
              onClick={() => setViewMode("prompts")}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium transition-all ${
                viewMode === "prompts"
                  ? "bg-teal-500/20 text-teal-300 border border-teal-500/40 shadow-sm"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <BsLightbulb className="text-xs" /> AI Prompts
            </button>
          </div>
        </div>

        {/* Right Controls: Refresh, Save, Customize Sidebar Toggle */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          {/* Refresh metrics */}
          <button
            type="button"
            onClick={handleRefresh}
            title="Refresh workbench KPI values"
            disabled={isRefreshing}
            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 hover:text-white transition-colors"
          >
            <BsArrowRepeat className={`text-sm ${isRefreshing ? "animate-spin text-teal-400" : ""}`} />
          </button>

          {/* Save Layout Button */}
          <button
            type="button"
            onClick={onSaveLayout}
            title="Save custom layout for this workbench"
            className={`py-1.5 px-3 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm ${
              isSaved
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                : "bg-white/5 hover:bg-white/10 text-gray-200 border border-white/10 hover:border-teal-500/30"
            }`}
          >
            {isSaved ? (
              <>
                <BsCheck2 className="text-xs font-bold" /> Saved
              </>
            ) : (
              <>
                <BsBookmarkCheck className="text-xs text-teal-400" /> Save Layout
              </>
            )}
          </button>

          {/* Open Collapsible Right Sidebar */}
          <button
            type="button"
            onClick={onToggleSidebar}
            title="Open KPI Library to customize 3-9 cards"
            className={`py-1.5 px-3 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              isSidebarOpen
                ? "bg-teal-500/20 text-teal-300 border border-teal-500/50 shadow-[0_0_15px_rgba(20,184,166,0.2)]"
                : "bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30"
            }`}
          >
            <BsSliders2 className="text-xs" />
            <span>Customize</span>
            <span className="text-[10px] font-mono font-bold bg-teal-500/20 px-1 rounded">
              {activeCards.length}/{MAX_CARDS}
            </span>
          </button>
        </div>
      </div>

      {/* Main View Mode */}
      {viewMode === "prompts" ? (
        <ActionCards onQuestionCardClick={onQuestionClick} />
      ) : (
        <>
          {/* Dynamic Drag-and-Drop 3 to 9 Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {activeCards.map((kpi, idx) => (
              <BusinessHealthCard
                key={kpi.id}
                kpi={kpi}
                metricData={metricsData?.metrics?.[kpi.id]}
                index={idx}
                totalCards={activeCards.length}
                canRemove={activeCards.length > MIN_CARDS}
                onRemove={handleRemoveCard}
                onMoveLeft={(i) => handleMoveCard(i, i - 1)}
                onMoveRight={(i) => handleMoveCard(i, i + 1)}
                onQuestionClick={onQuestionClick}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                isDragOver={dragOverIndex === idx}
              />
            ))}

            {/* If slots available (< 9), render Add Slot placeholder */}
            {activeCards.length < MAX_CARDS && (
              <button
                type="button"
                onClick={handleAddSlotClick}
                className="group flex flex-col items-center justify-center min-h-[160px] rounded-2xl border-2 border-dashed border-white/10 hover:border-teal-500/40 bg-black/20 hover:bg-teal-500/5 p-5 transition-all text-center cursor-pointer"
              >
                <div className="w-10 h-10 rounded-full bg-white/5 group-hover:bg-teal-500/15 border border-white/10 group-hover:border-teal-500/30 flex items-center justify-center text-gray-400 group-hover:text-teal-400 transition-colors mb-2">
                  <BsPlusLg className="text-sm" />
                </div>
                <div className="text-xs font-semibold text-gray-300 group-hover:text-teal-300">
                  Add KPI Card
                </div>
                <div className="text-[10px] text-gray-500 mt-0.5">
                  Slot #{activeCards.length + 1} of {MAX_CARDS}
                </div>
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
