from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional, List
from supabase_client import supabase
from auth import get_current_user
import datetime

router = APIRouter()

# ─── Dependency: Enforce Superadmin Emails ────────────────────────────────
async def require_superadmin(user: dict = Depends(get_current_user)) -> dict:
    email = user.get("email")
    if not email:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: No email associated with this session."
        )
    try:
        res = supabase.table("superadmins").select("id").eq("email", email.strip().lower()).execute()
        if not res.data:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: Email {email} is not authorized as a superadmin."
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error checking superadmin authorization: {str(e)}"
        )
    return user


# ─── Schema Definitions ──────────────────────────────────────────────────
class WaitlistStatusUpdate(BaseModel):
    email: str
    status: str # 'approved', 'pending', 'rejected'

class WaitlistAdd(BaseModel):
    email: str
    status: Optional[str] = "approved"

class GroqKeyAdd(BaseModel):
    api_key: str
    label: Optional[str] = None

class GroqKeyUpdate(BaseModel):
    id: str
    status: str

class GroqKeyDelete(BaseModel):
    id: str

class WorkbenchPlanChange(BaseModel):
    user_id: str
    plan: str

class PaymentSimulate(BaseModel):
    user_id: str
    amount: float
    plan: str
    email: str
    status: Optional[str] = "completed"


# ─── Superadmin Endpoints ────────────────────────────────────────────────
@router.get("/stats", dependencies=[Depends(require_superadmin)])
async def get_superadmin_stats():
    """
    Returns metrics and logs: waitlist signups, page views, Groq key health, payments,
    and users for plan overrides.
    """
    stats = {}

    # 1. Fetch waitlist
    try:
        waitlist_res = supabase.table("waitlist").select("*").order("created_at", desc=True).execute()
        stats["waitlist"] = waitlist_res.data or []
    except Exception:
        stats["waitlist"] = []

    # 2. Fetch Groq keys
    try:
        keys_res = supabase.table("groq_api_keys").select("*").order("created_at", desc=True).execute()
        # Mask the middle of API keys for security in the dashboard
        masked_keys = []
        for k in (keys_res.data or []):
            raw_key = k.get("api_key", "")
            masked = f"{raw_key[:8]}...{raw_key[-6:]}" if len(raw_key) > 15 else "Invalid Key Length"
            masked_keys.append({**k, "api_key": masked})
        stats["groq_keys"] = masked_keys
    except Exception:
        stats["groq_keys"] = []

    # 3. Fetch page views analytics
    try:
        views_res = supabase.table("page_views").select("*").order("created_at", desc=True).limit(500).execute()
        raw_views = views_res.data or []
        
        # Aggregate path-wise metrics
        path_counts = {}
        for v in raw_views:
            path = v.get("path", "/")
            path_counts[path] = path_counts.get(path, 0) + 1
            
        stats["page_views"] = {
            "total_count": len(raw_views),
            "path_aggregates": [{"path": k, "count": v} for k, v in path_counts.items()],
            "recent_logs": raw_views[:100]
        }
    except Exception:
        stats["page_views"] = {"total_count": 0, "path_aggregates": [], "recent_logs": []}

    # 4. Fetch payments & subscriptions
    try:
        payments_res = supabase.table("payments").select("*").order("created_at", desc=True).execute()
        stats["payments"] = payments_res.data or []
    except Exception:
        stats["payments"] = []

    # 5. Fetch users & plans
    try:
        wb_res = supabase.table("users").select("id", "name", "plan", "created_at", "owner_user_id").execute()
        stats["users"] = wb_res.data or []
    except Exception:
        stats["users"] = []

    return stats


@router.post("/waitlist/update-status", dependencies=[Depends(require_superadmin)])
async def update_waitlist_status(payload: WaitlistStatusUpdate):
    email = payload.email.strip().lower()
    try:
        res = supabase.table("waitlist").update({"status": payload.status}).eq("email", email).execute()
        return {"status": "success", "message": f"Waitlist email {email} status updated to {payload.status}.", "data": res.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update waitlist: {str(e)}")


@router.post("/waitlist/add", dependencies=[Depends(require_superadmin)])
async def add_waitlist_email(payload: WaitlistAdd):
    email = payload.email.strip().lower()
    try:
        res = supabase.table("waitlist").upsert({
            "email": email,
            "status": payload.status
        }, on_conflict="email").execute()
        return {"status": "success", "message": f"Email {email} upserted to waitlist as '{payload.status}'.", "data": res.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to add waitlist entry: {str(e)}")


@router.post("/groq-keys/add", dependencies=[Depends(require_superadmin)])
async def add_groq_key(payload: GroqKeyAdd):
    key = payload.api_key.strip()
    if not key.startswith("gsk_"):
        raise HTTPException(status_code=400, detail="Invalid key format. Groq API keys usually start with 'gsk_'.")
    try:
        res = supabase.table("groq_api_keys").insert({
            "api_key": key,
            "label": payload.label or f"Key Added {datetime.date.today().isoformat()}",
            "status": "active"
        }).execute()
        return {"status": "success", "message": "Groq API key added successfully.", "data": res.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to add API key (might be duplicate): {str(e)}")


@router.post("/groq-keys/update-status", dependencies=[Depends(require_superadmin)])
async def update_groq_key_status(payload: GroqKeyUpdate):
    try:
        res = supabase.table("groq_api_keys").update({"status": payload.status}).eq("id", payload.id).execute()
        return {"status": "success", "message": f"Groq key status updated to '{payload.status}'.", "data": res.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update key status: {str(e)}")


@router.post("/groq-keys/delete", dependencies=[Depends(require_superadmin)])
async def delete_groq_key(payload: GroqKeyDelete):
    try:
        res = supabase.table("groq_api_keys").delete().eq("id", payload.id).execute()
        return {"status": "success", "message": "Groq key deleted successfully.", "data": res.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete key: {str(e)}")


@router.post("/user/set-plan", dependencies=[Depends(require_superadmin)])
async def override_workbench_plan(payload: WorkbenchPlanChange, user: dict = Depends(get_current_user)):
    wb_id = payload.user_id
    new_plan = payload.plan.strip().lower()
    
    # 1. Fetch current plan to log history
    try:
        wb_res = supabase.table("users").select("plan").eq("id", wb_id).single().execute()
        prev_plan = wb_res.data.get("plan") if wb_res.data else "free"
    except Exception:
        prev_plan = "free"
        
    try:
        # 2. Update workbench plan
        supabase.table("users").update({"plan": new_plan}).eq("id", wb_id).execute()
        
        # 3. Log into plan history
        supabase.table("plan_history").insert({
            "user_id": wb_id,
            "previous_plan": prev_plan,
            "new_plan": new_plan,
            "changed_by": user["id"]
        }).execute()
        
        return {"status": "success", "message": f"Plan updated from {prev_plan} to {new_plan} for workbench {wb_id}."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to override workbench plan: {str(e)}")


@router.post("/payments/simulate", dependencies=[Depends(require_superadmin)])
async def simulate_payment(payload: PaymentSimulate):
    """
    Log a simulated payment to test Razorpay dashboards and upgrade logs.
    """
    try:
        payment_id = f"pay_mock_{datetime.datetime.utcnow().strftime('%Y%m%d%H%M%S')}"
        res = supabase.table("payments").insert({
            "user_id": payload.user_id,
            "user_id": payload.email, # placeholder for audit tracking
            "email": payload.email,
            "plan": payload.plan,
            "amount": payload.amount,
            "razorpay_payment_id": payment_id,
            "status": payload.status
        }).execute()
        
        return {"status": "success", "payment_id": payment_id, "data": res.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to simulate payment: {str(e)}")
