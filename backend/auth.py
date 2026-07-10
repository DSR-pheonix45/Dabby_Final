"""
Authentication and Authorization (Single Tenant Model).

Provides:
  1. `get_current_user`  — verifies the caller's Supabase JWT (Bearer token) and returns the authenticated user.
  2. `verify_user_access` — dependency to ensure the requested resource belongs to the authenticated user.
"""
from typing import Optional, Callable
from fastapi import Header, HTTPException, Request, Depends
from supabase_client import supabase
from datetime import datetime, timedelta


# ─── Token verification ─────────────────────────────────────────────────────
def _extract_bearer(authorization: Optional[str]) -> Optional[str]:
    if not authorization:
        return None
    parts = authorization.split(" ", 1)
    if len(parts) == 2 and parts[0].lower() == "bearer":
        return parts[1].strip()
    return authorization.strip()  # tolerate a bare token


def get_client_ip(request: Request) -> str:
    # Handle proxy headers (e.g. Vercel/Railway proxies)
    x_forwarded_for = request.headers.get("x-forwarded-for")
    if x_forwarded_for:
        return x_forwarded_for.split(",")[0].strip()
    x_real_ip = request.headers.get("x-real-ip")
    if x_real_ip:
        return x_real_ip.strip()
    return request.client.host if request.client else "127.0.0.1"


async def enforce_waitlist(email: str, user_id: str):
    if not email:
        return
    email_lower = email.strip().lower()
    
    # Exempt superadmins from waitlist gating
    try:
        res = supabase.table("superadmins").select("id").eq("email", email_lower).execute()
        if res.data:
            return
    except Exception:
        pass

    # Exempt users who are already invited and part of a workbench
    try:
        res = supabase.table("workbench_members").select("id").eq("user_id", user_id).limit(1).execute()
        if res.data:
            return
    except Exception:
        pass

    try:
        res = supabase.table("waitlist").select("status").eq("email", email_lower).execute()
        if not res.data:
            raise HTTPException(
                status_code=403,
                detail="Access denied: Your email is not on our approved waitlist. Please register at /waitlist."
            )
        
        status = res.data[0].get("status") or "pending"
        if status in ("pending", "rejected"):
            raise HTTPException(
                status_code=403,
                detail=f"Access denied: Your waitlist request is currently '{status}'. You will receive an email once approved."
            )
    except HTTPException:
        raise
    except Exception as e:
        # Log and continue to prevent locking the app if table isn't created yet
        print(f"[WAITLIST_CHECK] Warning: Waitlist check failed: {e}")


async def enforce_ip_restrictions(user_id: str, ip_address: str, email: str):
    if not email:
        return
    email_lower = email.strip().lower()
    
    # Exempt superadmins
    try:
        res = supabase.table("superadmins").select("id").eq("email", email_lower).execute()
        if res.data:
            return
    except Exception:
        pass

    try:
        # Upsert the client IP map
        supabase.table("user_ip_logs").upsert({
            "user_id": user_id,
            "ip_address": ip_address,
            "last_seen_at": datetime.utcnow().isoformat()
        }, on_conflict="user_id,ip_address").execute()
    except Exception as e:
        print(f"[IP_RESTRICTIONS] Warning: Failed to log IP to user_ip_logs: {e}")
        return

    try:
        # Check active IPs in last 24h
        cutoff = (datetime.utcnow() - timedelta(hours=24)).isoformat()
        res = supabase.table("user_ip_logs").select("ip_address")\
            .eq("user_id", user_id)\
            .gt("last_seen_at", cutoff).execute()
            
        active_ips = {row["ip_address"] for row in res.data} if res.data else set()
        
        MAX_DISTINCT_IPS = 100
        # If user has more than 100 active IPs and current one isn't counted
        if len(active_ips) > MAX_DISTINCT_IPS and ip_address not in active_ips:
            raise HTTPException(
                status_code=403,
                detail=f"Access denied: This account is being accessed from too many different devices or locations (IPs). "
                       f"Max {MAX_DISTINCT_IPS} active devices allowed per 24 hours."
            )
    except HTTPException:
        raise
    except Exception as e:
        print(f"[IP_RESTRICTIONS] Error validating IP restrictions: {e}")


async def get_current_user(request: Request, authorization: Optional[str] = Header(None)) -> dict:
    """
    Verify the Supabase access token, enforce waitlist limits + IP restrictions,
    and return the authenticated user {id, email}.
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
    
    uid = user.id
    email = getattr(user, "email", None)
    
    # 1. Enforce waitlist restrictions
    await enforce_waitlist(email, uid)
    
    # 2. Enforce IP restrictions (Account Sharing Prevention)
    client_ip = get_client_ip(request)
    await enforce_ip_restrictions(uid, client_ip, email)
    
    return {"id": uid, "email": email}

async def get_current_user_no_waitlist(request: Request, authorization: Optional[str] = Header(None)) -> dict:
    """
    Same as get_current_user but skips the waitlist check. Useful for invite links.
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
    
    uid = user.id
    email = getattr(user, "email", None)
    
    # Skip waitlist, only enforce IP restrictions
    client_ip = get_client_ip(request)
    await enforce_ip_restrictions(uid, client_ip, email)
    
    return {"id": uid, "email": email}


# ─── Authorization ────────────────────────────────────────────────────────
_USER_ID_LOOKUPS = {
    # path-param name -> (table, column holding the user_id)
    "user_id": (None, None),
    "trade_id":     ("trades", "user_id"),
    "ruleset_id":   ("rulesets", "user_id"),
    "doc_id":       ("user_documents", "user_id"),
    "document_id":  ("user_documents", "user_id"),
}


async def _resolve_user_id(request: Request) -> Optional[str]:
    """
    Find the user_id related to this request for authorization checking.
    path params → related-resource lookup (trade/ruleset/doc) → query string → JSON body.
    """
    params = request.path_params or {}
    if params.get("user_id"):
        return params["user_id"]
    for key, (table, col) in _USER_ID_LOOKUPS.items():
        if key == "user_id" or key not in params:
            continue
        try:
            row = supabase.table(table).select(col).eq("id", params[key]).single().execute()
            if row.data and row.data.get(col):
                return row.data[col]
        except Exception:
            continue
    # Query string (?user_id=...)
    qp = request.query_params.get("user_id")
    if qp:
        return qp
    # JSON body
    try:
        if request.headers.get("content-type", "").startswith("application/json"):
            body = await request.json()
            if isinstance(body, dict):
                if body.get("user_id"):
                    return body["user_id"]
                for key, (table, col) in _USER_ID_LOOKUPS.items():
                    if key == "user_id" or not body.get(key):
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


class Principal(dict):
    """Authenticated caller info."""
    @property
    def user_id(self): return self.get("user_id")


async def verify_user_access(request: Request, user: dict = Depends(get_current_user)) -> Principal:
    """
    Dependency: enforce that the authenticated user is accessing their own data.
    Resolves the user_id from the request and compares it to auth.uid().
    """
    requested_user_id = await _resolve_user_id(request)
    
    # If no specific user is resolved, we assume it's for the current user 
    # (or let the route handle missing user_id).
    if not requested_user_id:
        return Principal(user_id=user["id"], email=user.get("email"))

    if requested_user_id != user["id"]:
        raise HTTPException(
            status_code=403,
            detail="Access denied: You do not have permission to access these resources."
        )

    return Principal(user_id=user["id"], email=user.get("email"))


# Mock dependencies for routers that might still be using the old P permissions
def require_permission(permission: str = None) -> Callable:
    """Alias for verify_user_access to prevent breaking changes in routers before they are updated."""
    return verify_user_access

def require_membership() -> Callable:
    """Alias for verify_user_access to prevent breaking changes in routers before they are updated."""
    return verify_user_access
