from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional, Dict
from pydantic import BaseModel
from supabase_client import supabase
from auth import get_current_user

router = APIRouter()

class MemberInvite(BaseModel):
    user_id: str
    role: str

class PartyCreate(BaseModel):
    name: str
    party_type: str
    email: Optional[str] = None
    phone: Optional[str] = None
    notes: Optional[str] = None

class WorkbenchSettingsUpdate(BaseModel):
    name: Optional[str] = None
    legal_name: Optional[str] = None

@router.get("/{workbench_id}/members")
def get_members(workbench_id: str, user = Depends(get_current_user)):
    # RLS will enforce whether this user can see these members
    res = supabase.table("workbench_members").select("*").eq("workbench_id", workbench_id).execute()
    return res.data

@router.post("/{workbench_id}/members")
def invite_member(workbench_id: str, payload: MemberInvite, user = Depends(get_current_user)):
    res = supabase.table("workbench_members").insert({
        "workbench_id": workbench_id,
        "user_id": payload.user_id,
        "role": payload.role,
        "status": "invited",
        "invited_by": user["id"]
    }).execute()
    return res.data[0] if res.data else None

@router.get("/{workbench_id}/parties")
def get_parties(workbench_id: str, user = Depends(get_current_user)):
    res = supabase.table("parties").select("*").eq("workbench_id", workbench_id).execute()
    return res.data

@router.post("/{workbench_id}/parties")
def create_party(workbench_id: str, payload: PartyCreate, user = Depends(get_current_user)):
    res = supabase.table("parties").insert({
        "workbench_id": workbench_id,
        "name": payload.name,
        "party_type": payload.party_type,
        "email": payload.email,
        "phone": payload.phone,
        "notes": payload.notes
    }).execute()
    return res.data[0] if res.data else None

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
