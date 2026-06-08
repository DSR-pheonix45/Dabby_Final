"""
Request authentication & authorization helpers for the FastAPI backend.

WHY THIS EXISTS
---------------
Today every router uses the Supabase service-role client (which bypasses RLS)
and trusts client-supplied `workbench_id` / `user_id`. That means anyone who can
reach the API can read or write any workbench. These dependencies close that hole
by (1) verifying the caller's Supabase JWT and (2) checking they are a member of
the target workbench with a sufficient role.

ADOPTION (do this as a coordinated change — it is intentionally NOT wired in yet)
---------------------------------------------------------------------------------
1. Frontend: send the user's access token on every backend call, e.g. in
   `backendService.js`:

       const { data } = await supabase.auth.getSession();
       headers: { Authorization: `Bearer ${data.session?.access_token}` }

2. Backend: add the dependency to each route that needs protection, e.g.

       from auth import require_workbench_member

       @router.post("/transactions")
       async def create_tx(body: TxCreate,
                           user = Depends(require_workbench_member(
                               lambda body: body.workbench_id,
                               roles=("founder", "ca", "analyst")))):
           ...

   For path-param routes (`/{workbench_id}/...`) use `require_workbench_path`.

Until step 1 ships for ALL call sites, do not make these mandatory globally or
the app will start returning 401s.
"""

from fastapi import Header, HTTPException, Depends
from supabase_client import supabase

OPS_ROLES = ("founder", "ca", "analyst")
ALL_ROLES = ("founder", "ca", "analyst", "investor")


async def get_current_user(authorization: str = Header(default=None)):
    """Validate the Supabase access token and return the authenticated user."""
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")
    token = authorization.split(" ", 1)[1].strip()
    try:
        # Validates the JWT against Supabase Auth (no local JWT secret needed).
        res = supabase.auth.get_user(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    user = getattr(res, "user", None)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return user


def _assert_member(workbench_id: str, user_id: str, roles):
    q = (
        supabase.table("workbench_members")
        .select("role")
        .eq("workbench_id", workbench_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not q.data:
        raise HTTPException(status_code=403, detail="Not a member of this workbench")
    role = q.data[0].get("role")
    if roles and role not in roles:
        raise HTTPException(status_code=403, detail="Insufficient role for this action")
    return role


def require_workbench_path(roles=ALL_ROLES):
    """Dependency for routes with a `{workbench_id}` path parameter."""
    async def _dep(workbench_id: str, user=Depends(get_current_user)):
        _assert_member(workbench_id, user.id, roles)
        return user
    return _dep


def require_workbench_member(extract_workbench_id, roles=OPS_ROLES):
    """
    Dependency factory for body-based routes.
    `extract_workbench_id` is a callable taking the parsed body and returning
    the workbench_id (e.g. `lambda body: body.workbench_id`).
    """
    async def _dep(body, user=Depends(get_current_user)):
        wb = extract_workbench_id(body)
        if not wb:
            raise HTTPException(status_code=400, detail="workbench_id is required")
        _assert_member(wb, user.id, roles)
        return user
    return _dep
