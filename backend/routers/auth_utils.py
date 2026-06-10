from fastapi import HTTPException, Header
from typing import List, Optional
from supabase_client import supabase
from datetime import datetime, timezone


# --- Plan Limits Configuration ---
# These mirror the `plans` table but are kept here for fast in-memory lookups
# without requiring a DB call on every request.
PLAN_LIMITS = {
    'free': {
        'max_workbenches': 0,
        'max_members': 0,
        'max_ai_requests': 50,
        'doc_vault_mb': 0,
        'investor_view': False,
        'advanced_coa': False,
        'audit_logs': False,
        'priority_ai': False,
    },
    'go': {
        'max_workbenches': 5,
        'max_members': 5,
        'max_ai_requests': 500,
        'doc_vault_mb': 100,
        'investor_view': False,
        'advanced_coa': False,
        'audit_logs': False,
        'priority_ai': False,
    },
    'pro': {
        'max_workbenches': 10,
        'max_members': 15,
        'max_ai_requests': 1000,
        'doc_vault_mb': 500,
        'investor_view': True,
        'advanced_coa': True,
        'audit_logs': False,
        'priority_ai': True,
    },
    'enterprise': {
        'max_workbenches': 999,
        'max_members': 50,
        'max_ai_requests': 9999,
        'doc_vault_mb': 5000,
        'investor_view': True,
        'advanced_coa': True,
        'audit_logs': True,
        'priority_ai': True,
    },
}

PLAN_HIERARCHY = ['free', 'go', 'pro', 'enterprise']


def get_plan_limits(plan: str) -> dict:
    """Returns the limits dict for a given plan key."""
    return PLAN_LIMITS.get(plan, PLAN_LIMITS['free'])


def is_plan_at_least(user_plan: str, required_plan: str) -> bool:
    """Check if user_plan meets or exceeds the required_plan level."""
    user_idx = PLAN_HIERARCHY.index(user_plan) if user_plan in PLAN_HIERARCHY else 0
    required_idx = PLAN_HIERARCHY.index(required_plan) if required_plan in PLAN_HIERARCHY else 0
    return user_idx >= required_idx


# --- User Plan Lookup ---

async def get_user_plan(user_id: str) -> str:
    """Fetch user's plan from the users table (source of truth)."""
    if not user_id:
        return 'free'
    try:
        res = supabase.table('users').select('plan').eq('id', user_id).maybe_single().execute()
        if not res.data:
            return 'free'
        return res.data.get('plan', 'free') or 'free'
    except Exception:
        return 'free'


# --- Membership Checks ---

async def require_membership(workbench_id: str, x_user_id: Optional[str] = None) -> dict:
    """Verify that the given user_id is a member of the workbench."""
    if not x_user_id:
        raise HTTPException(status_code=401, detail="Missing user id header")

    try:
        res = supabase.table('workbench_members').select('*').eq('workbench_id', workbench_id).eq('user_id', x_user_id).maybe_single().execute()
        member = res.data
        if not member:
            raise HTTPException(status_code=403, detail='User is not a member of this workbench')
        return member
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


async def check_role_allowed(member: dict, allowed_roles: List[str]):
    role = member.get('role')
    if role not in allowed_roles:
        raise HTTPException(status_code=403, detail='Insufficient role for this operation')
    return True


# --- Plan Enforcement Helpers ---

async def enforce_workbench_limit(user_id: str):
    """Check if user can create another workbench based on their plan."""
    plan = await get_user_plan(user_id)
    limits = get_plan_limits(plan)

    # Count existing workbenches owned by this user
    wb_res = supabase.table('workbenches').select('id').eq('owner_user_id', user_id).execute()
    current_count = len(wb_res.data or [])

    if current_count >= limits['max_workbenches']:
        raise HTTPException(
            status_code=403,
            detail=f"Workbench limit reached for '{plan}' plan ({limits['max_workbenches']} max). Upgrade your plan to create more."
        )


async def enforce_member_limit(workbench_id: str):
    """Check current member count against plan limits of the workbench owner."""
    try:
        # Get workbench owner
        wb = supabase.table('workbenches').select('owner_user_id').eq('id', workbench_id).maybe_single().execute().data
        if not wb:
            raise HTTPException(status_code=404, detail='Workbench not found')

        plan = await get_user_plan(wb['owner_user_id'])
        limits = get_plan_limits(plan)

        members_res = supabase.table('workbench_members').select('id').eq('workbench_id', workbench_id).execute()
        members = members_res.data or []
        if len(members) >= limits['max_members']:
            raise HTTPException(status_code=403, detail=f"Member limit reached for '{plan}' plan ({limits['max_members']} max)")
        return True
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


async def enforce_doc_vault_limit(user_id: str, new_file_size_bytes: int):
    """Check if adding a document would exceed the plan's storage limit."""
    plan = await get_user_plan(user_id)
    limits = get_plan_limits(plan)
    max_bytes = limits['doc_vault_mb'] * 1024 * 1024

    if max_bytes == 0:
        raise HTTPException(
            status_code=403,
            detail="Document Vault is not available on the Free plan. Upgrade to Go or higher."
        )

    # Sum current file sizes across all user's workbenches
    wb_res = supabase.table('workbenches').select('id').eq('owner_user_id', user_id).execute()
    wb_ids = [w['id'] for w in (wb_res.data or [])]

    if not wb_ids:
        return  # No workbenches means no docs

    docs_res = supabase.table('workbench_documents').select('file_size').in_('workbench_id', wb_ids).execute()
    current_bytes = sum(int(d.get('file_size', 0) or 0) for d in (docs_res.data or []))

    if current_bytes + new_file_size_bytes > max_bytes:
        used_mb = round(current_bytes / (1024 * 1024), 1)
        raise HTTPException(
            status_code=403,
            detail=f"Storage limit reached ({used_mb}MB / {limits['doc_vault_mb']}MB). Upgrade your plan for more storage."
        )


async def enforce_ai_request_limit(user_id: str):
    """Check if user has exceeded monthly AI request limit."""
    plan = await get_user_plan(user_id)
    limits = get_plan_limits(plan)

    # Count AI requests this month
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()

    try:
        res = supabase.table('ai_usage_log') \
            .select('id') \
            .eq('user_id', user_id) \
            .gte('created_at', month_start) \
            .execute()
        current_count = len(res.data or [])
    except Exception:
        # If table doesn't exist yet, skip enforcement
        return

    if current_count >= limits['max_ai_requests']:
        raise HTTPException(
            status_code=403,
            detail=f"AI request limit reached ({limits['max_ai_requests']}/month on '{plan}' plan). Upgrade for more requests."
        )


async def log_ai_request(user_id: str, request_type: str = 'chat', model: str = None, tokens: int = 0):
    """Log an AI request for usage tracking."""
    try:
        supabase.table('ai_usage_log').insert({
            'user_id': user_id,
            'request_type': request_type,
            'model': model,
            'tokens_used': tokens,
        }).execute()
    except Exception as e:
        # Don't fail the actual request if logging fails
        print(f"[WARN] Failed to log AI usage: {e}")


async def enforce_feature(user_id: str, feature: str):
    """Check if a specific feature flag is enabled for the user's plan."""
    plan = await get_user_plan(user_id)
    limits = get_plan_limits(plan)

    if not limits.get(feature, False):
        raise HTTPException(
            status_code=403,
            detail=f"The '{feature}' feature is not available on the '{plan}' plan. Please upgrade."
        )


# --- Header Extraction ---

async def get_user_id_from_header(x_user_id: Optional[str] = Header(None)) -> Optional[str]:
    return x_user_id
