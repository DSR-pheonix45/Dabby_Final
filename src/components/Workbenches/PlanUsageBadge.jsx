import React from "react";
import { BsGem } from "react-icons/bs";
import { usePlan } from "../../hooks/usePlan";
import { nextPlan, PLAN_LIMITS } from "../../lib/plans";

const fmtLimit = (v) => (v === null || v === undefined ? "∞" : v);

function Meter({ label, used, limit }) {
  const unlimited = limit === null || limit === undefined;
  const pct = unlimited || !limit ? 0 : Math.min(100, Math.round((used / limit) * 100));
  const danger = !unlimited && limit > 0 && used >= limit;
  const warn = !unlimited && limit > 0 && used / limit >= 0.8;
  const barColor = danger ? "bg-rose-500" : warn ? "bg-amber-400" : "bg-teal-400";
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px] font-bold">
        <span className="text-gray-400">{label}</span>
        <span className={danger ? "text-rose-400" : "text-gray-300"}>
          {used} / {fmtLimit(limit)}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
        <div className={`h-full ${barColor} transition-all`} style={{ width: `${unlimited ? 6 : pct}%` }} />
      </div>
    </div>
  );
}

/**
 * Compact plan tier + usage panel for the workbench sidebar (Module 12).
 */
export default function PlanUsageBadge({ workbenchId }) {
  const { plan, label, limits, usage, loading } = usePlan(workbenchId);

  if (loading || !plan || !limits || !usage) return null;

  const upgrade = nextPlan(plan);

  return (
    <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <BsGem className="text-teal-400" />
          <span className="text-[10px] font-black text-white uppercase tracking-widest">{label} plan</span>
        </div>
        {upgrade && (
          <span className="text-[9px] font-bold text-teal-400 uppercase tracking-wider">
            → {PLAN_LIMITS[upgrade].label}
          </span>
        )}
      </div>

      <Meter label="Uploads (mo)" used={usage.uploads_this_month ?? 0} limit={limits.uploads_per_month} />
      <Meter label="Seats" used={usage.seats_used ?? 0} limit={limits.seats} />
      {typeof usage.ai_messages_today === "number" && (
        <Meter label="AI msgs (today)" used={usage.ai_messages_today} limit={limits.ai_messages_per_day} />
      )}
    </div>
  );
}
