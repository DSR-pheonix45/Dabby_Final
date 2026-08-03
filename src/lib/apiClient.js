import { supabase } from "./supabase";

/**
 * Central client for the FastAPI backend (/api/*).
 *
 * The backend enforces RBAC by verifying the Supabase JWT (Module 11), so every
 * call MUST carry the caller's access token. Use apiFetch instead of raw fetch
 * for any /api/* request — it attaches `Authorization: Bearer <token>` and a
 * JSON content-type when sending a string body. Returns the raw Response so
 * existing `res.ok` / `res.json()` call sites keep working unchanged.
 */
const BACKEND_BASE = (import.meta.env.VITE_API_URL || "https://dabbyfinal-production-95b5.up.railway.app").replace(/\/$/, "");

export async function apiFetch(path, options = {}) {
  let token;
  try {
    const { data: { session } } = await supabase.auth.getSession();
    token = session?.access_token;
  } catch {
    token = undefined;
  }

  const headers = { ...(options.headers || {}) };
  if (token && !headers.Authorization) headers.Authorization = `Bearer ${token}`;
  if (
    options.body &&
    typeof options.body === "string" &&
    !headers["Content-Type"] &&
    !headers["content-type"]
  ) {
    headers["Content-Type"] = "application/json";
  }

  const fullUrl = path.startsWith("http")
    ? path
    : `${BACKEND_BASE}${path.startsWith("/") ? "" : "/"}${path}`;

  return fetch(fullUrl, { ...options, headers });
}

/**
 * Convenience wrapper that parses JSON and throws on non-2xx, surfacing the
 * backend's `detail` message (e.g. RBAC 403 "Your role 'auditor' cannot ...").
 */
export async function apiJson(path, options = {}) {
  const res = await apiFetch(path, options);
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* empty / non-JSON body */
  }
  if (!res.ok) {
    const msg = (data && (data.detail || data.message)) || `Request failed (${res.status})`;
    throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
  }
  return data;
}
