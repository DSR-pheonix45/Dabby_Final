import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "../lib/apiClient";
import { roleCan } from "../lib/permissions";

/**
 * Resolves the current user's role in a workbench (Module 11 / RBAC) and exposes
 * a `can(permission)` helper for gating UI. The backend is the real authority;
 * this only shapes what controls are shown.
 *
 *   const { role, loading, can } = useWorkbenchRole(workbenchId);
 *   {can(PERM.EXECUTE_TRADE) && <ExecuteButton />}
 */
export function useWorkbenchRole(workbenchId) {
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(!!workbenchId);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!workbenchId) {
      setRole(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await apiFetch(`/api/workbenches/${workbenchId}/my-role`);
      if (res.ok) {
        const data = await res.json();
        setRole((data.role || "").toLowerCase());
        setError(null);
      } else {
        // 403 = not a member; treat as no role (deny writes)
        setRole(null);
        setError(res.status === 403 ? "not_a_member" : `role_lookup_${res.status}`);
      }
    } catch (e) {
      setRole(null);
      setError(e.message || "role_lookup_failed");
    } finally {
      setLoading(false);
    }
  }, [workbenchId]);

  useEffect(() => { load(); }, [load]);

  const can = useCallback((permission) => roleCan(role, permission), [role]);

  return { role, loading, error, can, refresh: load };
}
