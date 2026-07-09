import { apiFetch, apiJson } from "./apiClient";

/**
 * Front-end mirror of backend/services/plan_service.py (Module 12).
 * Display + soft-gating only; the backend independently enforces every limit.
 */
export const PLAN_LIMITS = {
  free: { label: "Free", uploads_per_month: 0, seats: 1, ai_messages_per_day: 10, custom_rulesets: false, auto_approvals: false, multibank: false, multi_currency: false },
  go: { label: "Go", uploads_per_month: 50, seats: 2, ai_messages_per_day: 100, custom_rulesets: false, auto_approvals: false, multibank: false, multi_currency: false },
  pro: { label: "Pro", uploads_per_month: 500, seats: 5, ai_messages_per_day: 500, custom_rulesets: true, auto_approvals: true, multibank: true, multi_currency: false },
  enterprise: { label: "Enterprise", uploads_per_month: null, seats: null, ai_messages_per_day: null, custom_rulesets: true, auto_approvals: true, multibank: true, multi_currency: true },
};

export const PLAN_ORDER = ["free", "go", "pro", "enterprise"];

export function nextPlan(plan) {
  const i = PLAN_ORDER.indexOf((plan || "free").toLowerCase());
  return i >= 0 && i < PLAN_ORDER.length - 1 ? PLAN_ORDER[i + 1] : null;
}

/** Meter one AI message for the current user. Returns {allowed, used, limit, remaining, plan}. */
export async function consumeAiMessage(userId) {
  try {
    return await apiJson("/api/plans/ai-usage/consume", {
      method: "POST",
      body: JSON.stringify({ user_id: userId || null }),
    });
  } catch {
    // Fail open on metering errors so the assistant never hard-breaks on infra hiccups.
    return { allowed: true, degraded: true };
  }
}

/** Fetch plan + usage for a workbench (drives the usage badge). */
export async function fetchPlanStatus(userId) {
  const res = await apiFetch(`/api/plans/status/${userId}`);
  if (!res.ok) throw new Error(`plan_status_${res.status}`);
  return res.json();
}
