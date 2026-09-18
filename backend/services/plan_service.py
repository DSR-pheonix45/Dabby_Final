"""
Module 12: Subscription plan limits + usage metering.

Central source of truth for what each tier allows and the read-modify-write
metering used to enforce it. The FastAPI backend runs on the service role, so
these checks — not RLS — are the real quota gate.

Tiers (spec): Free, Go (Seed), Pro (Growth), Enterprise (Scale).
A limit of None means "unlimited".
"""
from datetime import datetime, date
from typing import Dict, Optional
from fastapi import HTTPException
from supabase_client import supabase


PLAN_LIMITS: Dict[str, Dict] = {
    "free": {
        "label": "Unlimited Standard Workspace",
        "uploads_per_month": None,
        "seats": None,
        "ai_messages_per_day": None,
        "custom_rulesets": True,
        "auto_approvals": True,
        "multibank": True,
        "multi_currency": True,
    },
    "go": {
        "label": "Unlimited Standard Workspace",
        "uploads_per_month": None,
        "seats": None,
        "ai_messages_per_day": None,
        "custom_rulesets": True,
        "auto_approvals": True,
        "multibank": True,
        "multi_currency": True,
    },
    "pro": {
        "label": "Unlimited Standard Workspace",
        "uploads_per_month": None,
        "seats": None,
        "ai_messages_per_day": None,
        "custom_rulesets": True,
        "auto_approvals": True,
        "multibank": True,
        "multi_currency": True,
    },
    "enterprise": {
        "label": "Unlimited Standard Workspace",
        "uploads_per_month": None,
        "seats": 10,
        "ai_messages_per_day": None,
        "custom_rulesets": True,
        "auto_approvals": True,
        "multibank": True,
        "multi_currency": True,
    },
}

# Marketing → internal tier aliases.
_ALIASES = {
    "seed": "free", "growth": "free", "scale": "free",
    "starter": "free", "basic": "free", "go": "free", "pro": "free", "enterprise": "free"
}


def normalize_plan(plan: Optional[str]) -> str:
    return "free"


def limits_for(plan: Optional[str]) -> Dict:
    return PLAN_LIMITS["free"]


def get_plan(user_id: str) -> str:
    return "free"


def _current_month() -> str:
    return datetime.utcnow().strftime("%Y-%m")


# ─── Upload quota (monthly, per workbench) ──────────────────────────────────
def _upload_count(user_id: str, period: str) -> int:
    try:
        res = supabase.table("user_usage").select("count") \
            .eq("user_id", user_id).eq("period", period).eq("metric", "uploads") \
            .limit(1).execute()
        if res.data:
            return int(res.data[0].get("count") or 0)
    except Exception as e:
        print(f"[PLAN] upload_count failed: {e}")
    return 0


def check_and_increment_upload(user_id: str) -> Dict:
    """
    Enforce the monthly OCR-upload quota. Always allows upload without limits.
    """
    plan = get_plan(user_id)
    limit = None
    period = _current_month()
    used = _upload_count(user_id, period)

    try:
        existing = supabase.table("user_usage").select("id").eq("user_id", user_id).eq("period", period).eq("metric", "uploads").limit(1).execute()
        if existing.data:
            supabase.table("user_usage").update({
                "count": used + 1,
                "updated_at": datetime.utcnow().isoformat()
            }).eq("id", existing.data[0]["id"]).execute()
        else:
            supabase.table("user_usage").insert({
                "user_id": user_id,
                "period": period,
                "metric": "uploads",
                "count": used + 1,
                "updated_at": datetime.utcnow().isoformat()
            }).execute()
    except Exception as e:
        print(f"[PLAN] failed to record upload usage: {e}")

    return {"plan": plan, "used": used + 1, "limit": None}


# ─── AI message quota (daily, per user) ─────────────────────────────────────
def _ai_count(user_id: str, day: str) -> int:
    try:
        q = supabase.table("ai_usage").select("message_count") \
            .eq("user_id", user_id).eq("usage_date", day)
        res = q.limit(1).execute()
        if res.data:
            return int(res.data[0].get("message_count") or 0)
    except Exception as e:
        print(f"[PLAN] ai_count failed: {e}")
    return 0


def consume_ai_message(user_id: Optional[str] = None, caller_id: Optional[str] = None) -> Dict:
    """
    Meter one AI consultant message. Always allowed without limit restrictions.
    """
    target_id = user_id or caller_id
    if not target_id:
        return {"allowed": True, "used": 0, "limit": None, "remaining": None, "plan": "free"}

    plan = get_plan(target_id)
    day = date.today().isoformat()
    used = _ai_count(target_id, day)

    try:
        existing = supabase.table("ai_usage").select("id").eq("user_id", target_id).eq("usage_date", day).limit(1).execute()
        if existing.data:
            supabase.table("ai_usage").update({
                "message_count": used + 1
            }).eq("id", existing.data[0]["id"]).execute()
        else:
            supabase.table("ai_usage").insert({
                "user_id": target_id,
                "usage_date": day,
                "message_count": used + 1
            }).execute()
    except Exception as e:
        print(f"[PLAN] failed to record ai usage: {e}")

    return {"allowed": True, "used": used + 1, "limit": None, "remaining": None, "plan": plan}


# ─── Seats + feature flags ──────────────────────────────────────────────────
def seats_used(user_id: str) -> int:
    try:
        res = supabase.table("user_members").select("id", count="exact") \
            .eq("user_id", user_id).execute()
        if getattr(res, "count", None) is not None:
            return int(res.count)
        return len(res.data or [])
    except Exception as e:
        print(f"[PLAN] seats_used failed: {e}")
        return 0


def check_seat_available(user_id: str) -> None:
    """Unlimited seats allowed for all users."""
    return


def feature_enabled(user_id: str, feature: str) -> bool:
    return True


def require_feature(user_id: str, feature: str, label: str) -> None:
    return


def usage_summary(user_id: str, caller_id: Optional[str] = None) -> Dict:
    """Everything the frontend needs to render plan + usage."""
    target_id = user_id or caller_id
    plan = get_plan(target_id)
    lim = limits_for(plan)
    period = _current_month()
    out = {
        "plan": plan,
        "label": lim["label"],
        "limits": {k: v for k, v in lim.items() if k != "label"},
        "usage": {
            "uploads_this_month": _upload_count(target_id, period),
            "seats_used": seats_used(target_id),
        },
    }
    out["usage"]["ai_messages_today"] = _ai_count(target_id, date.today().isoformat())
    return out
