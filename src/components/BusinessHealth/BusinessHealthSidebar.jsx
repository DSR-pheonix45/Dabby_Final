import React, { useState, useMemo } from "react";
import {
  BsX,
  BsSearch,
  BsGripVertical,
  BsPlusLg,
  BsTrash3,
  BsBookmarkCheck,
  BsArrowCounterclockwise,
  BsCheck2,
  BsSliders2,
  BsInfoCircle,
} from "react-icons/bs";
import { KPI_REGISTRY, KPI_CATEGORIES, MIN_CARDS, MAX_CARDS } from "./kpiRegistry";

export default function BusinessHealthSidebar({
  isOpen,
  onClose,
  activeKpiIds,
  workbench,
  metricsData,
  onAddKpi,
  onRemoveKpi,
  onResetLayout,
  onSaveLayout,
  onDragStart,
  isSaved = false,
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const activeCount = activeKpiIds.length;
  const isMinReached = activeCount <= MIN_CARDS;
  const isMaxReached = activeCount >= MAX_CARDS;

  // Filter KPIs by search and category
  const filteredKpis = useMemo(() => {
    return KPI_REGISTRY.filter((kpi) => {
      const matchesCategory =
        selectedCategory === "all" || kpi.categoryKey === selectedCategory;
      const matchesSearch =
        kpi.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        kpi.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        kpi.category.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [searchTerm, selectedCategory]);

  if (!isOpen) return null;

  return (
    <aside
      className="fixed inset-y-0 right-0 z-50 w-full sm:w-[380px] bg-[#0c121e]/98 backdrop-blur-xl border-l border-cyan-500/20 shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col font-dm-sans transition-all duration-300 animate-in slide-in-from-right duration-300"
    >
      {/* Sidebar Header */}
      <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-black/40">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
            <BsSliders2 className="text-sm" />
          </div>
          <div>
            <h2 className="text-white text-sm sm:text-base font-bold tracking-tight">
              Business Health KPIs
            </h2>
            <p className="text-[11px] text-gray-400">
              Drag & drop to build layout ({MIN_CARDS}–{MAX_CARDS} cards)
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          title="Close sidebar"
        >
          <BsX className="text-xl" />
        </button>
      </div>

      {/* Slots Counter & Limit Warning */}
      <div className="px-4 py-3 bg-[#0a0f1a] border-b border-white/5">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="text-gray-300 font-medium">Dashboard Layout:</span>
          <span className="font-mono font-bold text-cyan-400">
            {activeCount} / {MAX_CARDS} Active Cards
          </span>
        </div>

        {/* Visual Progress / Slot Dots */}
        <div className="grid grid-cols-9 gap-1 h-1.5 w-full bg-white/5 rounded-full overflow-hidden p-0.5">
          {Array.from({ length: MAX_CARDS }).map((_, idx) => (
            <div
              key={idx}
              className={`rounded-full transition-all duration-300 ${
                idx < activeCount
                  ? "bg-gradient-to-r from-teal-400 to-cyan-400"
                  : "bg-white/10"
              }`}
            />
          ))}
        </div>

        {/* Informational feedback */}
        <div className="mt-2 flex items-center justify-between text-[11px]">
          {isMaxReached ? (
            <span className="text-amber-400 flex items-center gap-1">
              <BsInfoCircle className="text-xs" /> Maximum {MAX_CARDS} cards reached
            </span>
          ) : isMinReached ? (
            <span className="text-amber-400 flex items-center gap-1">
              <BsInfoCircle className="text-xs" /> Minimum {MIN_CARDS} cards required
            </span>
          ) : (
            <span className="text-gray-400">
              Drag card or click + to add to dashboard
            </span>
          )}

          <span className="text-[10px] text-gray-500 font-mono">
            {workbench?.name || "Active Workbench"}
          </span>
        </div>
      </div>

      {/* Action Buttons: Save & Reset */}
      <div className="px-4 py-2.5 bg-black/20 border-b border-white/5 flex items-center gap-2">
        <button
          type="button"
          onClick={onSaveLayout}
          className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-sm ${
            isSaved
              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
              : "bg-gradient-to-r from-teal-500 to-cyan-500 text-black hover:opacity-95 font-bold"
          }`}
        >
          {isSaved ? (
            <>
              <BsCheck2 className="text-sm font-bold" /> Layout Saved
            </>
          ) : (
            <>
              <BsBookmarkCheck className="text-sm" /> Save Layout
            </>
          )}
        </button>

        <button
          type="button"
          onClick={onResetLayout}
          title="Reset to default 6-7 recommended cards"
          className="py-1.5 px-3 rounded-xl text-xs font-medium text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 flex items-center gap-1 transition-colors"
        >
          <BsArrowCounterclockwise className="text-xs" /> Reset
        </button>
      </div>

      {/* Search Input */}
      <div className="p-3 border-b border-white/5">
        <div className="relative">
          <BsSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
          <input
            type="text"
            placeholder="Search KPIs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 mt-2.5 overflow-x-auto pb-1 scrollbar-none">
          {KPI_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`text-[10px] px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-all ${
                selectedCategory === cat.id
                  ? "bg-teal-500/20 text-teal-300 border border-teal-500/40 shadow-sm"
                  : "bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-white/5"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Catalog List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5 scrollbar-thin scrollbar-thumb-white/10">
        {filteredKpis.length === 0 ? (
          <div className="text-center py-10 text-gray-500 text-xs">
            No matching KPIs found. Try another search.
          </div>
        ) : (
          filteredKpis.map((kpi) => {
            const isActive = activeKpiIds.includes(kpi.id);
            const activeIndex = activeKpiIds.indexOf(kpi.id);
            const metric = metricsData?.metrics?.[kpi.id];

            return (
              <div
                key={kpi.id}
                draggable
                onDragStart={(e) => onDragStart?.(e, kpi.id)}
                className={`group/item relative p-3 rounded-xl border transition-all select-none ${
                  isActive
                    ? "bg-[#0b1422] border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.1)]"
                    : "bg-[#090e18] border-white/5 hover:border-white/15 hover:bg-[#0c121e]"
                }`}
              >
                {/* Drag Handle Indicator */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 min-w-0">
                    <div
                      className="mt-0.5 cursor-grab active:cursor-grabbing text-gray-500 hover:text-cyan-400 p-0.5 rounded"
                      title="Drag this card into dashboard"
                    >
                      <BsGripVertical className="text-sm" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[9px] uppercase tracking-wider font-bold text-gray-500 border border-white/5 px-1.5 py-0.2 rounded">
                          {kpi.category}
                        </span>
                        {isActive && (
                          <span className="text-[9px] bg-teal-500/20 text-teal-300 border border-teal-500/30 px-1.5 py-0.2 rounded font-mono font-semibold">
                            Slot #{activeIndex + 1}
                          </span>
                        )}
                      </div>

                      <h4 className="text-white text-xs sm:text-sm font-semibold mt-1 truncate">
                        {kpi.title}
                      </h4>
                      <p className="text-[11px] text-gray-400 line-clamp-1 mt-0.5">
                        {kpi.description}
                      </p>
                    </div>
                  </div>

                  {/* Add / Remove Action */}
                  <div className="flex-shrink-0">
                    {isActive ? (
                      <button
                        type="button"
                        disabled={isMinReached}
                        onClick={() => onRemoveKpi(kpi.id)}
                        title={
                          isMinReached
                            ? `Minimum ${MIN_CARDS} cards required`
                            : "Remove from dashboard"
                        }
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                          isMinReached
                            ? "opacity-30 cursor-not-allowed bg-white/5 text-gray-500"
                            : "bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20"
                        }`}
                      >
                        <BsTrash3 className="text-xs" /> Remove
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={isMaxReached}
                        onClick={() => onAddKpi(kpi.id)}
                        title={
                          isMaxReached
                            ? `Maximum ${MAX_CARDS} cards reached`
                            : "Add to dashboard"
                        }
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                          isMaxReached
                            ? "opacity-30 cursor-not-allowed bg-white/5 text-gray-500"
                            : "bg-teal-500/15 hover:bg-teal-500/25 text-teal-300 border border-teal-500/30"
                        }`}
                      >
                        <BsPlusLg className="text-xs" /> Add
                      </button>
                    )}
                  </div>
                </div>

                {/* Mini preview metric values */}
                {metric && (
                  <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center justify-between text-[11px]">
                    <span className="text-gray-400 font-mono">
                      Preview: <strong className="text-white">{metric.primaryValue}</strong>
                    </span>
                    <span className="text-gray-500 text-[10px] truncate max-w-[150px]">
                      {metric.subtext}
                    </span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer Note */}
      <div className="p-3 border-t border-white/10 bg-black/40 text-center text-[11px] text-gray-500">
        Changes persist for <span className="text-teal-400 font-medium">{workbench?.name || "Selected Workbench"}</span>
      </div>
    </aside>
  );
}
