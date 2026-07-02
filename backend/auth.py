"""
RBAC & Authentication (Module 11).

The FastAPI backend runs on the Supabase *service role* key, which bypasses RLS.
That means the backend — not the database — is responsible for authorization.
This module provides:

  1. `get_current_user`  — verifies the caller's Supabase JWT (Bearer token) and
                           returns the authenticated user. Never trusts a body `user_id`.
  2. `get_workbench_role`— looks up the caller's role in `workbench_members`.
  3. `require_permission`— a dependency factory enforcing the role→permission matrix
                           below, resolving the workbench from the request path.

Roles (stored in workbench_members.role):
    owner       — full control (billing, members, delete, everything below)
    accountant  — edit drafts, configure COA, approve + execute trades, upload docs
    auditor     — read-only across the workbench (alias: investor)
    member      — read-only queues/reports + upload-only to Doc Vault

Design note: authorization degrades *closed*. A missing/invalid token → 401.
A valid user with no membership in the target workbench → 403.
"""
from typing import Optional, Callable
from fastapi import Header, HTTPException, Request, Depends
from supabase_client import supabase


# ─── Permission catalogue ──────────────────────────────────────────────────
class P:
    VIEW               = "view"                 # read queues, reports, ledger
    VIEW_ALL_DOCS      = "view_all_documents"   # see every member's uploads
    UPLOAD_DOCUMENT    = "upload_document"       # push to Doc Vault
    EDIT_DRAFT         = "edit_draft"            # edit trades / drafts
    CONFIGURE_COA      = "configure_coa"         # add/modify Chart of Accounts
    WRITE_RULESET      = "write_ruleset"         # create/edit/delete rulesets
    APPROVE_TRADE      = "approve_trade"         # move trade Ready→Approved
    EXECUTE_TRADE      = "execute_trade"         # Stage 10-12 commit to ledger
    DELETE_TRANSACTION = "delete_transaction"    # remove/void ledger records
    INVITE_MEMBERS     = "invite_members"        # add workbench members
    MANAGE_MEMBERS     = "manage_members"        # change roles / remove members
    MANAGE_BILLING     = "manage_billing"        # plan / subscription changes
    DELETE_WORKBENCH   = "delete_workbench"      # destroy the workbench


# ─── Role → permission matrix ───────────────────────────────────────────────
# NOTE: role NAMES here match what the app actually stores in workbench_members
# (owner, founder, editor, viewer) PLUS the spec's names (accountant, auditor,
# member, investor) as aliases, so both the live data and the spec resolve.
_OWNER = {
    P.VIEW, P.VIEW_ALL_DOCS, P.UPLOAD_DOCUMENT, P.EDIT_DRAFT,
    P.CONFIGURE_COA, P.WRITE_RULESET, P.APPROVE_TRADE, P.EXECUTE_TRADE,
    P.DELETE_TRANSACTION, P.INVITE_MEMBERS, P.MANAGE_MEMBERS,
    P.MANAGE_BILLING, P.DELETE_WORKBENCH,
}
_ACCOUNTANT = {
    P.VIEW, P.VIEW_ALL_DOCS, P.UPLOAD_DOCUMENT, P.EDIT_DRAFT,
    P.CONFIGURE_COA, P.WRITE_RULESET, P.APPROVE_TRADE, P.EXECUTE_TRADE,
}
_READ_ONLY = {P.VIEW, P.VIEW_ALL_DOCS}
ROLE_PERMISSIONS = {
    # live data roles
    "owner":      set(_OWNER),
    "founder":    set(_OWNER),        # founders have full control
    "editor":     set(_ACCOUNTANT),   # can edit/execute, not manage members/billing
    "viewer":     set(_READ_ONLY),    # read-only
    # spec roles (kept as aliases)
    "accountant": set(_ACCOUNTANT),
    "auditor":    set(_READ_ONLY),
    "investor":   set(_READ_ONLY),
    "member":     {P.VIEW, P.UPLOAD_DOCUMENT},
}

# Roles that may still see the workbench but are strictly read-only for writes.
READ_ONLY_ROLES = {"auditor", "investor", "viewer", "member"}


def role_has(role: Optional[str], permission: str) -> bool:
    return permission in ROLE_PERMISSIONS.get((role or "").lower(), set())


# ─── Token verification ─────────────────────────────────────────────────────
def _extract_bearer(authorization: Optional[str]) -> Optional[str]:
    if not authorization:
        return None
    parts = authorization.split(" ", 1)
    if len(parts) == 2 and parts[0].lower() == "bearer":
        return parts[1].strip()
    return authorization.strip()  # tolerate a bare token


async def get_current_user(authorization: Optional[str] = Header(None)) -> dict:
    """
    Verify the Supabase access token and return {id, email}.
    Raises 401 on any missing/invalid/expired token. Never trusts a body user_id.
    """
    token = _extract_bearer(authorization)
    if not token:
        raise HTTPException(status_code=401, detail="Authentication required (missing bearer token)")
    try:
        res = supabase.auth.get_user(token)
        user = getattr(res, "user", None)
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid or expired session: {e}")
    if not user or not getattr(user, "id", None):
        raise HTTPException(status_code=401, detail="Invalid session token")
    return {"id": user.id, "email": getattr(user, "email", None)}


# ─── Workbench-scoped role resolution ───────────────────────────────────────
_WORKBENCH_LOOKUPS = {
    # path-param name -> (table, column holding the workbench_id)
    "workbench_id": (None, None),           # already the workbench id
    "trade_id":     ("trades", "workbench_id"),
    "ruleset_id":   ("rulesets", "workbench_id"),
    "doc_id":       ("workbench_documents", "workbench_id"),
    "document_id":  ("workbench_documents", "workbench_id"),
}


async def _resolve_workbench_id(request: Request) -> Optional[str]:
    """
    Find the workbench id for authorization, checking (in order):
    path params → related-resource lookup (trade/ruleset/doc) → query string → JSON body.
    Reading the JSON body here is safe: Starlette caches it so the route still parses it.
    """
    params = request.path_params or {}
    if params.get("workbench_id"):
        return params["workbench_id"]
    for key, (table, col) in _WORKBENCH_LOOKUPS.items():
        if key == "workbench_id" or key not in params:
            continue
        try:
            row = supabase.table(table).select(col).eq("id", params[key]).single().execute()
            if row.data and row.data.get(col):
                return row.data[col]
        except Exception:
            continue
    # Query string (?workbench_id=...)
    qp = request.query_params.get("workbench_id")
    if qp:
        return qp
    # JSON body — for create-style POSTs. Accept a direct workbench_id, or resolve
    # it from a resource id the body references (ruleset_id / document_id / trade_id).
    try:
        if request.headers.get("content-type", "").startswith("application/json"):
            body = await request.json()
            if isinstance(body, dict):
                if body.get("workbench_id"):
                    return body["workbench_id"]
                for key, (table, col) in _WORKBENCH_LOOKUPS.items():
                    if key == "workbench_id" or not body.get(key):
                        continue
                    try:
                        row = supabase.table(table).select(col).eq("id", body[key]).single().execute()
                        if row.data and row.data.get(col):
                            return row.data[col]
                    except Exception:
                        continue
    except Exception:
        pass
    return None


def get_workbench_role(workbench_id: str, user_id: str) -> Optional[str]:
    """Return the caller's role in the workbench, or None if not a member."""
    try:
        res = supabase.table("workbench_members") \
            .select("role") \
            .eq("workbench_id", workbench_id) \
            .eq("user_id", user_id) \
            .limit(1).execute()
        if res.data:
            return (res.data[0].get("role") or "").lower()
    except Exception as e:
        print(f"[AUTH] role lookup failed for wb={workbench_id} user={user_id}: {e}")
    # Fallback: the workbench owner column (older workbenches predate members rows)
    try:
        wb = supabase.table("workbenches").select("owner_user_id").eq("id", workbench_id).single().execute()
        if wb.data and wb.data.get("owner_user_id") == user_id:
            return "owner"
    except Exception:
        pass
    return None


class Principal(dict):
    """Authenticated caller + their resolved role/workbench for a request."""
    @property
    def user_id(self): return self.get("user_id")
    @property
    def role(self): return self.get("role")
    @property
    def workbench_id(self): return self.get("workbench_id")


def require_permission(permission: str) -> Callable:
    """
    Dependency factory: enforce that the authenticated caller holds `permission`
    in the workbench addressed by the request path.

        @router.post("/{trade_id}/execute", dependencies=[Depends(require_permission(P.EXECUTE_TRADE))])
    """
    async def _dep(request: Request, user: dict = Depends(get_current_user)) -> Principal:
        workbench_id = await _resolve_workbench_id(request)
        if not workbench_id:
            raise HTTPException(status_code=400, detail="Could not resolve workbench for authorization")
        role = get_workbench_role(workbench_id, user["id"])
        if not role:
            raise HTTPException(status_code=403, detail="You are not a member of this workbench")
        if not role_has(role, permission):
            raise HTTPException(
                status_code=403,
                detail=f"Your role '{role}' cannot perform '{permission}' in this workbench",
            )
        return Principal(user_id=user["id"], role=role, workbench_id=workbench_id, email=user.get("email"))
    return _dep


def require_membership() -> Callable:
    """Lighter guard: authenticated AND a member (any role) of the target workbench."""
    return require_permission(P.VIEW)
