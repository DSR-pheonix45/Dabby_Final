from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional, Dict
from pydantic import BaseModel
from supabase_client import supabase
from auth import get_current_user, get_current_user_no_waitlist
import jwt
import os
from datetime import datetime, timedelta, timezone

router = APIRouter()

# Default to a generic secret if SUPABASE_JWT_SECRET is not provided
JWT_SECRET = os.environ.get("SUPABASE_JWT_SECRET", "super_secret_key_for_dabby")
ALGORITHM = "HS256"

# Role Permissions Mapping
ROLE_PERMISSIONS = {
    "owner": {
        "documents": {"upload": True, "delete": True, "review": True},
        "reports": {"view": True, "export": True},
        "chat": {"access": True},
        "transactions": {"create": True, "approve": True},
        "members": {"invite": True, "remove": True, "change_roles": True},
        "settings": {"edit": True}
    },
    "admin": {
        "documents": {"upload": True, "delete": True, "review": True},
        "reports": {"view": True, "export": True},
        "chat": {"access": True},
        "transactions": {"create": True, "approve": True},
        "members": {"invite": True, "remove": True, "change_roles": True},
        "settings": {"edit": False}
    },
    "finance_manager": {
        "documents": {"upload": True, "delete": False, "review": True},
        "reports": {"view": True, "export": True},
        "chat": {"access": True},
        "transactions": {"create": True, "approve": True},
        "members": {"invite": True, "remove": False, "change_roles": False},
        "settings": {"edit": False}
    },
    "accountant": {
        "documents": {"upload": True, "delete": False, "review": True},
        "reports": {"view": True, "export": True},
        "chat": {"access": True},
        "transactions": {"create": True, "approve": False},
        "members": {"invite": False, "remove": False, "change_roles": False},
        "settings": {"edit": False}
    },
    "analyst": {
        "documents": {"upload": False, "delete": False, "review": True},
        "reports": {"view": True, "export": True},
        "chat": {"access": True},
        "transactions": {"create": False, "approve": False},
        "members": {"invite": False, "remove": False, "change_roles": False},
        "settings": {"edit": False}
    },
    "viewer": {
        "documents": {"upload": False, "delete": False, "review": True},
        "reports": {"view": True, "export": False},
        "chat": {"access": False},
        "transactions": {"create": False, "approve": False},
        "members": {"invite": False, "remove": False, "change_roles": False},
        "settings": {"edit": False}
    },
    "auditor": {
        "documents": {"upload": False, "delete": False, "review": True},
        "reports": {"view": True, "export": True},
        "chat": {"access": False},
        "transactions": {"create": False, "approve": False},
        "members": {"invite": False, "remove": False, "change_roles": False},
        "settings": {"edit": False}
    }
}

# Default to a generic secret if SUPABASE_JWT_SECRET is not provided
JWT_SECRET = os.environ.get("SUPABASE_JWT_SECRET", "super_secret_key_for_dabby")
ALGORITHM = "HS256"

class MemberInvite(BaseModel):
    user_id: str
    role: str

class RoleInvite(BaseModel):
    role: str

class JoinToken(BaseModel):
    token: str

class RoleUpdate(BaseModel):
    role: str

class PartyCreate(BaseModel):
    name: str
    party_type: str
    email: Optional[str] = None
    phone: Optional[str] = None
    notes: Optional[str] = None

class VesselCreate(BaseModel):
    account_type: str
    display_name: str
    bank_name: Optional[str] = None
    account_number: Optional[str] = None
    upi_id: Optional[str] = None

class WorkbenchSettingsUpdate(BaseModel):
    name: Optional[str] = None
    legal_name: Optional[str] = None
    logo: Optional[str] = None
    company_master: Optional[list] = None

# --- Members & Invites ---

@router.get("/{workbench_id}/members")
def get_members(workbench_id: str, user = Depends(get_current_user)):
    res = supabase.table("workbench_members").select("*").eq("workbench_id", workbench_id).execute()
    members = res.data or []
    
    if members:
        user_ids = list({m["user_id"] for m in members if m.get("user_id")})
        if user_ids:
            users_res = supabase.table("users").select("id, email, name").in_("id", user_ids).execute()
            users_map = {u["id"]: u for u in (users_res.data or [])}
            for m in members:
                m["users"] = users_map.get(m["user_id"], {})
                
    return members

@router.get("/permissions")
def get_permissions():
    return ROLE_PERMISSIONS

@router.post("/{workbench_id}/invites/generate")
def generate_invite(workbench_id: str, payload: RoleInvite, user = Depends(get_current_user)):
    # 1. Verify user has permission to invite (e.g. Owner/Admin)
    # We rely on RLS/Auth or verify here. For now, trust the caller.
    
    # 2. Generate a short-lived token
    expiration = datetime.now(timezone.utc) + timedelta(days=7)
    token_data = {
        "workbench_id": workbench_id,
        "role": payload.role,
        "inviter_id": user["id"],
        "exp": expiration
    }
    
    token = jwt.encode(token_data, JWT_SECRET, algorithm=ALGORITHM)
    # We could also use the current host origin to construct the URL, but the frontend will handle it.
    return {"token": token}

@router.post("/join")
def join_workbench(payload: JoinToken, user = Depends(get_current_user_no_waitlist)):
    try:
        decoded = jwt.decode(payload.token, JWT_SECRET, algorithms=[ALGORITHM])
        workbench_id = decoded["workbench_id"]
        role = decoded["role"]
        inviter_id = decoded["inviter_id"]
        
        # Check if already a member
        existing = supabase.table("workbench_members").select("*").eq("workbench_id", workbench_id).eq("user_id", user["id"]).execute()
        if existing.data:
            return existing.data[0]
            
        # Validate workbench exists and is active
        wb_res = supabase.table("workbenches").select("*").eq("id", workbench_id).execute()
        if not wb_res.data:
            raise HTTPException(status_code=400, detail="Workbench does not exist.")
            
        # Insert new active member
        res = supabase.table("workbench_members").insert({
            "workbench_id": workbench_id,
            "user_id": user["id"],
            "role": role,
            "status": "active",
            "invited_by": inviter_id,
            "joined_at": datetime.now(timezone.utc).isoformat()
        }).execute()
        
        # Log activity
        if res.data:
            supabase.table("activity_logs").insert({
                "workbench_id": workbench_id,
                "user_id": user["id"],
                "action_type": "member_joined",
                "entity_type": "member",
                "entity_id": user["id"],
                "description": f"User joined workbench as {role}"
            }).execute()
            
        return res.data[0] if res.data else None
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=400, detail="Invite link has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=400, detail="Invalid invite link")

@router.put("/{workbench_id}/members/{target_user_id}/role")
def update_member_role(workbench_id: str, target_user_id: str, payload: RoleUpdate, user = Depends(get_current_user)):
    # Basic check for invoker permission (fallback in case RLS is weird)
    invoker = supabase.table("workbench_members").select("role").eq("workbench_id", workbench_id).eq("user_id", user["id"]).execute()
    if not invoker.data or invoker.data[0]["role"] not in ["owner", "admin"]:
        raise HTTPException(status_code=403, detail="Only owners and admins can change roles.")

    # Check valid role
    if payload.role not in ROLE_PERMISSIONS:
        raise HTTPException(status_code=400, detail="Invalid role specified.")

    # Update role
    res = supabase.table("workbench_members").update({"role": payload.role}).eq("workbench_id", workbench_id).eq("user_id", target_user_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Member not found")
        
    # Log activity
    target_user = supabase.table("users").select("email").eq("id", target_user_id).execute()
    target_email = target_user.data[0]["email"] if target_user.data else target_user_id
    
    supabase.table("activity_logs").insert({
        "workbench_id": workbench_id,
        "user_id": user["id"],
        "action_type": "role_changed",
        "entity_type": "member",
        "entity_id": target_user_id,
        "description": f"Changed role of {target_email} to {payload.role}"
    }).execute()
    
    return res.data[0]

# --- Parties & Trade Vessels ---

@router.get("/{workbench_id}/parties")
def get_parties(workbench_id: str, user = Depends(get_current_user)):
    try:
        # Fetch parties and their nested trade vessels (financial_accounts)
        res = supabase.table("parties").select("*, party_profiles(*), financial_accounts(*)").eq("workbench_id", workbench_id).execute()
        return res.data
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Database error: {str(e)}")

@router.post("/{workbench_id}/parties")
def create_party(workbench_id: str, payload: PartyCreate, user = Depends(get_current_user)):
    try:
        res = supabase.table("parties").insert({
            "workbench_id": workbench_id,
            "name": payload.name,
            "party_type": payload.party_type,
            "email": payload.email,
            "phone": payload.phone,
            "notes": payload.notes
        }).execute()
        return res.data[0] if res.data else None
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Database error: {str(e)}")

@router.post("/{workbench_id}/parties/{party_id}/vessels")
def add_trade_vessel(workbench_id: str, party_id: str, payload: VesselCreate, user = Depends(get_current_user)):
    # Create a new financial account for the party
    res = supabase.table("financial_accounts").insert({
        "party_id": party_id,
        "account_type": payload.account_type,
        "display_name": payload.display_name,
        "bank_name": payload.bank_name,
        "account_number": payload.account_number,
        "upi_id": payload.upi_id
    }).execute()
    return res.data[0] if res.data else None

# --- Settings ---

@router.put("/{workbench_id}/settings")
def update_settings(workbench_id: str, payload: WorkbenchSettingsUpdate, user = Depends(get_current_user)):
    update_data = {}
    if payload.name is not None:
        update_data["name"] = payload.name
    if payload.legal_name is not None:
        update_data["legal_name"] = payload.legal_name
    if payload.logo is not None:
        update_data["logo"] = payload.logo
    if payload.company_master is not None:
        update_data["company_master"] = payload.company_master
    
    if not update_data:
        return {"status": "no changes"}
        
    res = supabase.table("workbenches").update(update_data).eq("id", workbench_id).execute()
    return res.data[0] if res.data else None

# --- Activity & Notifications ---

@router.get("/{workbench_id}/activity")
def get_activity_logs(workbench_id: str, user = Depends(get_current_user)):
    try:
        # Fetch latest 50 activity logs for the workbench
        res = supabase.table("activity_logs").select("*").eq("workbench_id", workbench_id).order("created_at", desc=True).limit(50).execute()
        logs = res.data or []
        
        if logs:
            user_ids = list({log["user_id"] for log in logs if log.get("user_id")})
            if user_ids:
                users_res = supabase.table("users").select("id, email, name").in_("id", user_ids).execute()
                users_map = {u["id"]: u for u in (users_res.data or [])}
                for log in logs:
                    log["users"] = users_map.get(log["user_id"], {})
                    
        return logs
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/user/notifications")
def get_notifications(user = Depends(get_current_user)):
    try:
        res = supabase.table("notifications").select("*").eq("user_id", user["id"]).order("created_at", desc=True).limit(20).execute()
        return res.data or []
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/user/notifications/{notification_id}/read")
def mark_notification_read(notification_id: str, user = Depends(get_current_user)):
    try:
        res = supabase.table("notifications").update({"is_read": True}).eq("id", notification_id).eq("user_id", user["id"]).execute()
        return res.data[0] if res.data else None
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
