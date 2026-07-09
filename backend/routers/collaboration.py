from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional, Dict
from pydantic import BaseModel
from supabase_client import supabase
from auth import get_current_user
import jwt
import os
from datetime import datetime, timedelta, timezone

router = APIRouter()

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

# --- Members & Invites ---

@router.get("/{workbench_id}/members")
def get_members(workbench_id: str, user = Depends(get_current_user)):
    res = supabase.table("workbench_members").select("*").eq("workbench_id", workbench_id).execute()
    return res.data

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
def join_workbench(payload: JoinToken, user = Depends(get_current_user)):
    try:
        decoded = jwt.decode(payload.token, JWT_SECRET, algorithms=[ALGORITHM])
        workbench_id = decoded["workbench_id"]
        role = decoded["role"]
        inviter_id = decoded["inviter_id"]
        
        # Check if already a member
        existing = supabase.table("workbench_members").select("*").eq("workbench_id", workbench_id).eq("user_id", user["id"]).execute()
        if existing.data:
            return existing.data[0]
            
        # Insert new active member
        res = supabase.table("workbench_members").insert({
            "workbench_id": workbench_id,
            "user_id": user["id"],
            "role": role,
            "status": "active",
            "invited_by": inviter_id,
            "joined_at": datetime.now(timezone.utc).isoformat()
        }).execute()
        
        return res.data[0] if res.data else None
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=400, detail="Invite link has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=400, detail="Invalid invite link")

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
    
    if not update_data:
        return {"status": "no changes"}
        
    res = supabase.table("workbenches").update(update_data).eq("id", workbench_id).execute()
    return res.data[0] if res.data else None
