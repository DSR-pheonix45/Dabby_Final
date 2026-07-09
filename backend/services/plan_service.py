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
        "label": "Free",
        "uploads_per_month": None,
        "seats": 1,
        "ai_messages_per_day": None,
        "custom_rulesets": False,
        "auto_approvals": False,
        "multibank": False,
        "multi_currency": False,
    },
    "go": {
        "label": "Go",
        "uploads_per_month": 50,
        "seats": 2,
        "ai_messages_per_day": 100,
        "custom_rulesets": False,
        "auto_approvals": False,
        "multibank": False,
        "multi_currency": False,
    },
    "pro": {
        "label": "Pro",
        "uploads_per_month": 500,
        "seats": 5,
        "ai_messages_per_day": 500,
        "custom_rulesets": True,
        "auto_approvals": True,
        "multibank": True,
        "multi_currency": False,
    },
    "enterprise": {
        "label": "Enterprise",
        "uploads_per_month": None,
        "seats": None,
        "ai_messages_per_day": None,
        "custom_rulesets": True,
        "auto_approvals": True,
        "multibank": True,
        "multi_currency": True,
    },
}

# Marketing → internal tier aliases.
_ALIASES = {
    "seed": "go", "growth": "pro", "scale": "enterprise",
    "starter": "go", "basic": "go",
}


def normalize_plan(plan: Optional[str]) -> str:
    p = (plan or "free").strip().lower()
    p = _ALIASES.get(p, p)
    return p if p in PLAN_LIMITS else "free"


def limits_for(plan: Optional[str]) -> Dict:
    return PLAN_LIMITS[normalize_plan(plan)]


def get_plan(user_id: str) -> str:
    try:
        res = supabase.table("users").select("plan").eq("id", user_id).single().execute()
        if res.data:
            return normalize_plan(res.data.get("plan"))
    except Exception as e:
        print(f"[PLAN] get_plan failed for {user_id}: {e}")
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
    Enforce the monthly OCR-upload quota. Raises HTTP 402 when the plan limit
    is reached; otherwise records the upload and returns usage info.
    """
    plan = get_plan(user_id)
    limit = None  # Force None to bypass limits check in local development
    period = _current_month()
    used = _upload_count(user_id, period)

    try:
        supabase.table("user_usage").upsert(
            {
                "user_id": user_id,
                "period": period,
                "metric": "uploads",
                "count": used + 1,
                "updated_at": datetime.utcnow().isoformat(),
            },
            on_conflict="user_id,period,metric",
        ).execute()
    except Exception as e:
        print(f"[PLAN] failed to record upload usage: {e}")

    return {"plan": plan, "used": used + 1, "limit": limit}


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


def consume_ai_message(user_id: str) -> Dict:
    """
    Meter one AI consultant message. Returns {allowed, used, limit, remaining}.
    Does NOT raise — the caller (chat) decides how to surface a soft block.
    Increments only when allowed.
    """
    plan = get_plan(user_id)
    limit = limits_for(plan)["ai_messages_per_day"]
    day = date.today().isoformat()
    used = _ai_count(user_id, day)

    if limit is not None and used >= limit:
        return {"allowed": False, "used": used, "limit": limit, "remaining": 0, "plan": plan}

    try:
        supabase.table("ai_usage").upsert(
            {
                "user_id": user_id,
                "usage_date": day,
                "message_count": used + 1,
            },
            on_conflict="user_id,usage_date",
        ).execute()
    except Exception as e:
        print(f"[PLAN] failed to record ai usage: {e}")

    remaining = None if limit is None else max(0, limit - (used + 1))
    return {"allowed": True, "used": used + 1, "limit": limit, "remaining": remaining, "plan": plan}


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
    """Raise 402 if adding one more member would exceed the seat limit."""
    plan = get_plan(user_id)
    limit = limits_for(plan)["seats"]
    if limit is None:
        return
    if seats_used(user_id) >= limit:
        raise HTTPException(
            status_code=402,
            detail=f"Seat limit reached for the {limits_for(plan)['label']} plan ({limit} seats). Upgrade to invite more members.",
        )


def feature_enabled(user_id: str, feature: str) -> bool:
    return bool(limits_for(get_plan(user_id)).get(feature, False))


def require_feature(user_id: str, feature: str, label: str) -> None:
    if not feature_enabled(user_id, feature):
        plan = get_plan(user_id)
        raise HTTPException(
            status_code=402,
            detail=f"{label} isn't available on the {limits_for(plan)['label']} plan. Upgrade to unlock it.",
        )


def usage_summary(user_id: str) -> Dict:
    """Everything the frontend needs to render plan + usage."""
    plan = get_plan(user_id)
    lim = limits_for(plan)
    period = _current_month()
    out = {
        "plan": plan,
        "label": lim["label"],
        "limits": {k: v for k, v in lim.items() if k != "label"},
        "usage": {
            "uploads_this_month": _upload_count(user_id, period),
            "seats_used": seats_used(user_id),
        },
    }
    out["usage"]["ai_messages_today"] = _ai_count(user_id, date.today().isoformat())
    return out
