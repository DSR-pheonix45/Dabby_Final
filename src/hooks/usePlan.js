import { useState, useEffect, useCallback } from "react";
import { fetchPlanStatus } from "../lib/plans";

/**
 * Loads a workbench's plan tier + current usage (Module 12) for UI display.
 *
 *   const { plan, limits, usage, loading, refresh } = usePlan(workbenchId);
 */
export function usePlan(workbenchId) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(!!workbenchId);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!workbenchId) {
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetchPlanStatus(workbenchId);
      setData(res);
      setError(null);
    } catch (e) {
      setError(e.message || "plan_load_failed");
    } finally {
      setLoading(false);
    }
  }, [workbenchId]);

  useEffect(() => { load(); }, [load]);

  return {
    plan: data?.plan || null,
    label: data?.label || null,
    limits: data?.limits || null,
    usage: data?.usage || null,
    loading,
    error,
    refresh: load,
  };
}
