import React, { useState } from "react";
import {
  BsGripVertical,
  BsArrowUpRight,
  BsX,
  BsChevronLeft,
  BsChevronRight,
  BsStars,
} from "react-icons/bs";

export default function BusinessHealthCard({
  kpi,
  metricData,
  index,
  totalCards,
  canRemove,
  onRemove,
  onMoveLeft,
  onMoveRight,
  onQuestionClick,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  isDragOver = false,
}) {
  const [activeTab, setActiveTab] = useState("Week");
  const [isHovered, setIsHovered] = useState(false);

  const data = metricData || {};
  const primaryVal = data.primaryValue || kpi.subtext;
  const subtext = data.subtext || kpi.description;
  const status = data.status || kpi.defaultStatus;

  // Status pill color mapping
  const getStatusBadge = () => {
    switch (status) {
      case "GOOD":
      case "OPTIMAL":
      case "STRONG":
      case "EXCELLENT":
      case "HEALTHY":
      case "ON TRACK":
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            {status}
          </span>
        );
      case "ATTENTION":
      case "WARNING":
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-amber-500/10 text-amber-400 border border-amber-500/25 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            {status}
          </span>
        );
      case "LIVE":
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-teal-500/10 text-teal-300 border border-teal-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-ping" />
            {status}
          </span>
        );
      case "ACTIVATED":
      case "GROWTH":
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-cyan-500/10 text-cyan-300 border border-cyan-500/25">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            {status}
          </span>
        );
    }
  };

  // Render specific widgets inside card
  const renderWidget = () => {
    switch (kpi.widgetType) {
      case "sparkline":
        return (
          <div className="mt-2.5 flex items-center justify-between">
            <div className="flex-1">
              <svg className="w-full h-11 overflow-visible" viewBox="0 0 160 40">
                <defs>
                  <linearGradient id={`grad_${kpi.id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#14b8a6" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <path
                  d="M0,32 Q25,28 50,30 T100,18 T140,8 T160,5 L160,40 L0,40 Z"
                  fill={`url(#grad_${kpi.id})`}
                />
                <path
                  d="M0,32 Q25,28 50,30 T100,18 T140,8 T160,5"
                  fill="none"
                  stroke="#2dd4bf"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                <circle cx="160" cy="5" r="3.5" fill="#5eead4" className="animate-pulse" />
              </svg>
            </div>
          </div>
        );

      case "gauge_donut": {
        const pct = data.gaugePct || 98.7;
        const radius = 24;
        const circumference = 2 * Math.PI * radius;
        const strokeDashoffset = circumference - (pct / 100) * circumference;
        return (
          <div className="mt-1 flex items-center justify-between gap-3">
            <div className="text-[11px] text-gray-400 font-medium leading-relaxed">
              Automated 24h bank reconciliation with zero unmapped splits.
            </div>
            <div className="relative w-16 h-16 flex-shrink-0 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="32"
                  cy="32"
                  r={radius}
                  stroke="#1e293b"
                  strokeWidth="4.5"
                  fill="transparent"
                />
                <circle
                  cx="32"
                  cy="32"
                  r={radius}
                  stroke="#14b8a6"
                  strokeWidth="4.5"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  fill="transparent"
                  className="transition-all duration-700"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-white">
                {pct.toFixed(0)}%
              </div>
            </div>
          </div>
        );
      }

      case "chart_wave":
        return (
          <div className="mt-3">
            {/* Time toggle pills */}
            <div className="flex items-center justify-end gap-1 mb-2">
              {["Day", "Week", "Month", "Quarter"].map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveTab(tab);
                  }}
                  className={`text-[9px] px-2 py-0.5 rounded font-semibold transition-all ${
                    activeTab === tab
                      ? "bg-teal-500/20 text-teal-300 border border-teal-500/40"
                      : "text-gray-400 hover:text-gray-200 hover:bg-white/5"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
            {/* SVG Glowing Area Wave Chart */}
            <div className="relative h-20 w-full overflow-hidden">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 280 80" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="waveGlow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#0284c7" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <path
                  d="M 0,65 Q 40,55 80,60 T 160,35 T 220,15 T 280,30 L 280,80 L 0,80 Z"
                  fill="url(#waveGlow)"
                />
                <path
                  d="M 0,65 Q 40,55 80,60 T 160,35 T 220,15 T 280,30"
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                {/* Glowing points */}
                <circle cx="80" cy="60" r="3" fill="#38bdf8" />
                <circle cx="160" cy="35" r="3" fill="#38bdf8" />
                <circle cx="220" cy="15" r="4.5" fill="#7dd3fc" className="animate-pulse" />
              </svg>
            </div>
            <div className="flex justify-between text-[9px] text-gray-500 mt-1 font-mono">
              <span>Mon</span>
              <span>Wed</span>
              <span>Fri (Peak)</span>
              <span>Sun</span>
            </div>
          </div>
        );

      case "counter_queue":
        return (
          <div className="mt-3 space-y-2">
            {(data.items || []).slice(0, 3).map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-2 rounded-lg bg-black/30 border border-white/5 text-[11px]"
              >
                <div className="flex items-center gap-2 truncate">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      item.color === "amber"
                        ? "bg-amber-400"
                        : item.color === "teal"
                        ? "bg-teal-400"
                        : "bg-blue-400"
                    }`}
                  />
                  <span className="text-gray-200 font-medium truncate">{item.name}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-white font-mono font-semibold">{item.amount}</span>
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded uppercase font-semibold ${
                      item.color === "amber"
                        ? "bg-amber-500/10 text-amber-400"
                        : item.color === "teal"
                        ? "bg-teal-500/10 text-teal-400"
                        : "bg-blue-500/10 text-blue-400"
                    }`}
                  >
                    {item.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        );

      case "bars_rails":
        return (
          <div className="mt-3 space-y-2">
            {(data.rails || []).map((rail, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-gray-300 font-medium">{rail.label}</span>
                  <span className="text-white font-mono font-semibold">{rail.amount}</span>
                </div>
                <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${rail.pct}%`, backgroundColor: rail.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        );

      case "speedo_arc":
        return (
          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between text-[11px] text-gray-300">
              <span>Auto-cleared (24h)</span>
              <span className="text-white font-mono font-bold text-sm">
                {data.autoClearedAmount || "$304,628"}
              </span>
            </div>
            {/* Multi-segment arc gauge */}
            <div className="w-full h-2.5 bg-white/5 rounded-full overflow-hidden flex gap-1 p-0.5">
              <div className="h-full bg-teal-400 rounded-sm" style={{ width: "65%" }} title="Auto-approved: 14" />
              <div className="h-full bg-amber-400 rounded-sm" style={{ width: "20%" }} title="In review: 4" />
              <div className="h-full bg-purple-400 rounded-sm" style={{ width: "15%" }} title="Holds: 12" />
            </div>
            <div className="flex justify-between text-[9px] text-gray-400 font-mono">
              <span className="text-teal-400">• Auto-approved 14</span>
              <span className="text-amber-400">• In review 4</span>
              <span className="text-purple-400">• Holds 2</span>
            </div>
          </div>
        );

      case "runway_bar":
        return (
          <div className="mt-3 space-y-2">
            <div className="flex justify-between text-[11px] text-gray-300">
              <span>Liquid Cash Reserve</span>
              <span className="text-white font-mono font-semibold">{data.liquidBalance}</span>
            </div>
            <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-teal-500 to-emerald-400 rounded-full" style={{ width: "75%" }} />
            </div>
            <div className="flex justify-between text-[10px] text-gray-400">
              <span>Safe Zone (&gt;12 mo)</span>
              <span className="text-emerald-400 font-semibold">14.2 mo runway</span>
            </div>
          </div>
        );

      case "aging_buckets":
        return (
          <div className="mt-3 grid grid-cols-3 gap-1.5">
            {(data.buckets || []).map((b, i) => (
              <div key={i} className="p-2 rounded-lg bg-black/30 border border-white/5 text-center">
                <div className="text-[9px] text-gray-400 uppercase font-mono">{b.label}</div>
                <div className="text-[11px] text-white font-mono font-bold mt-0.5">{b.amount}</div>
              </div>
            ))}
          </div>
        );

      case "volume_bar":
      case "utilization_bar":
        return (
          <div className="mt-3 space-y-1.5">
            <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  kpi.widgetType === "utilization_bar"
                    ? "bg-amber-400"
                    : "bg-gradient-to-r from-teal-400 to-cyan-400"
                }`}
                style={{ width: `${data.utilizationPct || data.progressPct || 84}%` }}
              />
            </div>
            <div className="text-[11px] text-gray-400 leading-tight">
              {data.details || kpi.description}
            </div>
          </div>
        );

      default:
        return (
          <div className="mt-2.5 text-[11px] text-gray-400 leading-relaxed">
            {data.details || kpi.description}
          </div>
        );
    }
  };

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart?.(e, kpi.id, index)}
      onDragOver={(e) => onDragOver?.(e, index)}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop?.(e, index)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`group relative flex flex-col justify-between rounded-2xl p-4 sm:p-5 transition-all duration-300 font-dm-sans cursor-pointer select-none ${
        isDragOver
          ? "border-2 border-dashed border-teal-400 bg-teal-500/10 shadow-[0_0_25px_rgba(20,184,166,0.25)] scale-[1.02]"
          : "bg-gradient-to-b from-[#0e1626]/95 via-[#0b111e]/95 to-[#070b14]/95 border border-cyan-500/15 hover:border-cyan-400/35 hover:shadow-[0_8px_30px_rgba(14,165,233,0.12)] hover:-translate-y-0.5"
      }`}
      onClick={() => onQuestionClick?.(kpi.prompt)}
    >
      {/* Top subtle highlight gradient */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent" />

      {/* Header Row */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          {/* Drag Grip + Title */}
          <div className="flex items-center gap-2 min-w-0">
            <div
              className="cursor-grab active:cursor-grabbing text-gray-500 hover:text-cyan-400 transition-colors p-0.5 -ml-1 rounded"
              title="Drag to reorder card"
              onClick={(e) => e.stopPropagation()}
            >
              <BsGripVertical className="text-sm" />
            </div>
            <h3 className="text-gray-200 text-xs sm:text-sm font-semibold truncate tracking-tight">
              {kpi.shortTitle || kpi.title}
            </h3>
          </div>

          {/* Status Pill & Controls */}
          <div className="flex items-center gap-1.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
            {getStatusBadge()}

            {/* Quick Reorder arrows for touch devices */}
            <div className={`items-center gap-0.5 ${isHovered ? "flex" : "hidden sm:hidden"}`}>
              {index > 0 && (
                <button
                  type="button"
                  onClick={() => onMoveLeft?.(index)}
                  title="Move left"
                  className="p-1 text-gray-400 hover:text-white rounded hover:bg-white/10 text-xs"
                >
                  <BsChevronLeft />
                </button>
              )}
              {index < totalCards - 1 && (
                <button
                  type="button"
                  onClick={() => onMoveRight?.(index)}
                  title="Move right"
                  className="p-1 text-gray-400 hover:text-white rounded hover:bg-white/10 text-xs"
                >
                  <BsChevronRight />
                </button>
              )}
            </div>

            {/* Remove Card Button */}
            {canRemove && (
              <button
                type="button"
                onClick={() => onRemove?.(kpi.id)}
                title="Remove card from dashboard"
                className={`p-1 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all ${
                  isHovered ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                }`}
              >
                <BsX className="text-base" />
              </button>
            )}
          </div>
        </div>

        {/* Primary Numerical Value */}
        <div className="mt-1 flex items-baseline justify-between gap-2">
          <div className="text-2xl sm:text-3xl font-bold text-white tracking-tight font-dm-sans">
            {primaryVal}
          </div>
          <div className="text-[10px] sm:text-xs text-gray-400 font-medium truncate text-right">
            {subtext}
          </div>
        </div>

        {/* Customized Visual Widget */}
        {renderWidget()}
      </div>

      {/* Card Footer: Action Link / Prompt trigger */}
      <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs">
        <span className="text-cyan-400/90 group-hover:text-cyan-300 font-medium flex items-center gap-1 transition-colors">
          <BsStars className="text-[11px]" />
          {kpi.actionLabel || "Ask Dabby"}
          <BsArrowUpRight className="text-[10px] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
        </span>
        <span className="text-[10px] text-gray-500 group-hover:text-gray-400 uppercase tracking-wider font-mono">
          Slot #{index + 1}
        </span>
      </div>
    </div>
  );
}
