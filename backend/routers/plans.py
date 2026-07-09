"""
Module 12: Plan status + usage metering endpoints.
"""
from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel
from typing import Optional
from supabase_client import supabase
from auth import verify_user_access, get_current_user
from services import plan_service

router = APIRouter()


@router.get("/status/{user_id}", dependencies=[])
async def plan_status(user_id: str, principal=Depends(verify_user_access)):
    """Plan tier, limits, and current usage for the workbench (+ caller's AI count today)."""
    return plan_service.usage_summary(user_id, principal.user_id)


class AIConsume(BaseModel):
    user_id: Optional[str] = None


@router.post("/ai-usage/consume")
async def ai_consume(payload: AIConsume, user: dict = Depends(get_current_user)):
    """
    Meter one AI consultant message for the authenticated user. The chat calls
    this BEFORE hitting the LLM; if `allowed` is false it shows an upgrade prompt.
    """
    return plan_service.consume_ai_message(payload.user_id, user["id"])


class SetPlan(BaseModel):
    plan: str


@router.post("/set/{user_id}")
async def set_plan(user_id: str, payload: SetPlan, principal=Depends(verify_user_access)):
    """Change a workbench's plan tier. Owner-only (manage_billing)."""
    plan = plan_service.normalize_plan(payload.plan)
    supabase.table("users").update({"plan": plan}).eq("id", user_id).execute()
    return {"status": "updated", "plan": plan, "limits": plan_service.limits_for(plan)}


@router.get("/catalog")
async def plan_catalog():
    """Public-ish tier catalogue for pricing/upgrade UI."""
    return plan_service.PLAN_LIMITS


class LogViewRequest(BaseModel):
    path: str


@router.post("/log-view")
async def log_page_view(payload: LogViewRequest, request: Request):
    """
    Log page views for analytics. We fetch client IP and associate user email if auth header is present.
    """
    user_email = None
    user_id = None
    try:
        from auth import _extract_bearer
        authorization = request.headers.get("authorization")
        token = _extract_bearer(authorization)
        if token:
            res = supabase.auth.get_user(token)
            user = getattr(res, "user", None)
            if user:
                user_id = user.id
                user_email = getattr(user, "email", None)
    except Exception:
        pass

    # Extract client IP
    from auth import get_client_ip
    client_ip = get_client_ip(request)

    try:
        supabase.table("page_views").insert({
            "user_id": user_id,
            "email": user_email,
            "path": payload.path,
            "ip_address": client_ip
        }).execute()
    except Exception as e:
        print(f"[PAGE_VIEW] Warning: failed to log view: {e}")

    return {"status": "logged"}


@router.get("/check-waitlist")
async def check_waitlist_status(email: str):
    """
    Public check: returns whether an email is approved on the waitlist.
    """
    email_lower = email.strip().lower()
    
    # 1. Exempt superadmins
    try:
        res = supabase.table("superadmins").select("id").eq("email", email_lower).execute()
        if res.data:
            return {"approved": True, "status": "approved", "is_superadmin": True}
    except Exception:
        pass

    # 2. Check waitlist table
    try:
        res = supabase.table("waitlist").select("status").eq("email", email_lower).execute()
        if res.data:
            status = res.data[0].get("status") or "pending"
            return {"approved": status == "approved", "status": status}
    except Exception as e:
        print(f"[CHECK_WAITLIST] Warning: Waitlist check failed: {e}")
        
    return {"approved": False, "status": "not_found"}
