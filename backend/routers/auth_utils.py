from fastapi import HTTPException, Header
from typing import List, Optional
from supabase_client import supabase


async def require_membership(workbench_id: str, x_user_id: Optional[str] = None) -> dict:
    """Verify that the given user_id is a member of the workbench.

    Note: This helper reads `x_user_id` (a simple header) for now. Replace with
    proper JWT validation in production.
    """
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


def get_plan_limits(plan: str) -> dict:
    # Basic preset limits; replace with DB-driven config as needed
    presets = {
        'free': {'max_members': 3, 'max_transactions_month': 500},
        'go': {'max_members': 10, 'max_transactions_month': 5000},
        'plus': {'max_members': 50, 'max_transactions_month': 50000},
        'default': {'max_members': 3, 'max_transactions_month': 500}
    }
    return presets.get(plan, presets['default'])


async def enforce_member_limit(workbench_id: str):
    """Check current member count against plan limits and raise if exceeded."""
    try:
        wb = supabase.table('workbenches').select('id,plan').eq('id', workbench_id).maybe_single().execute().data
        if not wb:
            raise HTTPException(status_code=404, detail='Workbench not found')

        plan = wb.get('plan', 'free')
        limits = get_plan_limits(plan)

        members_res = supabase.table('workbench_members').select('id').eq('workbench_id', workbench_id).execute()
        members = members_res.data or []
        if len(members) >= limits['max_members']:
            raise HTTPException(status_code=403, detail=f"Member limit reached for plan '{plan}'")
        return True
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


async def get_user_id_from_header(x_user_id: Optional[str] = Header(None)) -> Optional[str]:
    return x_user_id
