"""
Module 12: Plan status + usage metering endpoints.
"""
from typing import Optional
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from supabase_client import supabase
from auth import require_membership, require_permission, get_current_user, P
from services import plan_service

router = APIRouter()


@router.get("/status/{workbench_id}", dependencies=[])
async def plan_status(workbench_id: str, principal=Depends(require_membership())):
    """Plan tier, limits, and current usage for the workbench (+ caller's AI count today)."""
    return plan_service.usage_summary(workbench_id, principal.user_id)


class AIConsume(BaseModel):
    workbench_id: Optional[str] = None


@router.post("/ai-usage/consume")
async def ai_consume(payload: AIConsume, user: dict = Depends(get_current_user)):
    """
    Meter one AI consultant message for the authenticated user. The chat calls
    this BEFORE hitting the LLM; if `allowed` is false it shows an upgrade prompt.
    """
    return plan_service.consume_ai_message(payload.workbench_id, user["id"])


class SetPlan(BaseModel):
    plan: str


@router.post("/set/{workbench_id}")
async def set_plan(workbench_id: str, payload: SetPlan, principal=Depends(require_permission(P.MANAGE_BILLING))):
    """Change a workbench's plan tier. Owner-only (manage_billing)."""
    plan = plan_service.normalize_plan(payload.plan)
    supabase.table("workbenches").update({"plan": plan}).eq("id", workbench_id).execute()
    return {"status": "updated", "plan": plan, "limits": plan_service.limits_for(plan)}


@router.get("/catalog")
async def plan_catalog():
    """Public-ish tier catalogue for pricing/upgrade UI."""
    return plan_service.PLAN_LIMITS
