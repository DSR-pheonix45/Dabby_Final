"""
Usage Router — Returns current user's usage stats + plan limits.
Endpoint: GET /api/usage/me
"""

from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone
from supabase_client import supabase
from .auth_utils import get_user_id_from_header, get_user_plan, get_plan_limits

router = APIRouter()


@router.get("/me")
async def get_my_usage(x_user_id: str = Depends(get_user_id_from_header)):
    """
    Returns the authenticated user's:
    - Current plan and its limits
    - Usage stats (workbenches, storage, AI requests, members)
    """
    if not x_user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")

    try:
        # 1. Get user's plan
        plan = await get_user_plan(x_user_id)
        limits = get_plan_limits(plan)

        # 2. Count workbenches
        wb_res = supabase.table('workbenches').select('id').eq('owner_user_id', x_user_id).execute()
        workbench_ids = [w['id'] for w in (wb_res.data or [])]
        workbench_count = len(workbench_ids)

        # 3. Calculate storage used (sum of file_size across all user's workbenches)
        storage_bytes = 0
        if workbench_ids:
            docs_res = supabase.table('workbench_documents') \
                .select('file_size') \
                .in_('workbench_id', workbench_ids) \
                .execute()
            storage_bytes = sum(int(d.get('file_size', 0) or 0) for d in (docs_res.data or []))
        storage_mb = round(storage_bytes / (1024 * 1024), 2)

        # 4. Count AI requests this month
        now = datetime.now(timezone.utc)
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()
        ai_requests_count = 0
        try:
            ai_res = supabase.table('ai_usage_log') \
                .select('id') \
                .eq('user_id', x_user_id) \
                .gte('created_at', month_start) \
                .execute()
            ai_requests_count = len(ai_res.data or [])
        except Exception:
            # Table may not exist yet if migration hasn't been run
            pass

        # 5. Count members per workbench
        members_per_wb = {}
        if workbench_ids:
            for wb_id in workbench_ids:
                mem_res = supabase.table('workbench_members') \
                    .select('id') \
                    .eq('workbench_id', wb_id) \
                    .execute()
                members_per_wb[wb_id] = len(mem_res.data or [])

        return {
            "plan": plan,
            "limits": limits,
            "usage": {
                "workbenches": workbench_count,
                "storage_mb": storage_mb,
                "storage_bytes": storage_bytes,
                "ai_requests_this_month": ai_requests_count,
                "members_per_workbench": members_per_wb,
            },
            "remaining": {
                "workbenches": max(0, limits['max_workbenches'] - workbench_count),
                "storage_mb": max(0, limits['doc_vault_mb'] - storage_mb),
                "ai_requests": max(0, limits['max_ai_requests'] - ai_requests_count),
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] get_my_usage failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/plans")
async def list_plans():
    """Returns all available plans from the plans table (or hardcoded fallback)."""
    try:
        res = supabase.table('plans').select('*').order('sort_order').execute()
        if res.data:
            return res.data
    except Exception:
        pass

    # Fallback: return hardcoded plans if table doesn't exist
    from .auth_utils import PLAN_LIMITS
    return [
        {"id": "free", "name": "Free", "price_inr": 0, **PLAN_LIMITS['free']},
        {"id": "go", "name": "Go", "price_inr": 5000, **PLAN_LIMITS['go']},
        {"id": "pro", "name": "Pro", "price_inr": 10000, **PLAN_LIMITS['pro']},
        {"id": "enterprise", "name": "Enterprise", "price_inr": 20000, **PLAN_LIMITS['enterprise']},
    ]
