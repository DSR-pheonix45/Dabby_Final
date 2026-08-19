from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional, Dict
from pydantic import BaseModel
from supabase_client import supabase
from auth import get_current_user, get_current_user_no_waitlist
import jwt
import os
import uuid
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

class AccessByLicense(BaseModel):
    license_key: str
    access_password: str

class PasswordUpdate(BaseModel):
    access_password: str

class RoleUpdate(BaseModel):
    role: str

class PartyCreate(BaseModel):
    name: Optional[str] = None
    legal_name: Optional[str] = None
    display_name: Optional[str] = None
    entity_type: str = "CORPORATION" # INDIVIDUAL, CORPORATION, OTHER
    roles: List[str] = ["CUSTOMER"] # CUSTOMER, VENDOR, PARTNER, INVESTOR, BANK, OTHER
    party_type: Optional[str] = None # Legacy support fallback
    email: Optional[str] = None
    phone: Optional[str] = None
    gstin: Optional[str] = None
    pan: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None
    is_self: bool = False

class PartyUpdate(BaseModel):
    legal_name: Optional[str] = None
    display_name: Optional[str] = None
    entity_type: Optional[str] = None
    status: Optional[str] = None # ACTIVE, INACTIVE, ARCHIVED
    gstin: Optional[str] = None
    pan: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None

class RolePayload(BaseModel):
    role: str

class PartyResolveRequest(BaseModel):
    legal_name: Optional[str] = None
    display_name: Optional[str] = None
    gstin: Optional[str] = None
    pan: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    entity_type: Optional[str] = None
    expected_role: Optional[str] = None

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
    cin: Optional[str] = None
    gstin: Optional[str] = None
    pan: Optional[str] = None
    address: Optional[Dict] = None
    bank_accounts: Optional[List[Dict]] = None

# --- Members & Invites ---

@router.get("/{workbench_id}/members")
def get_members(workbench_id: str, user = Depends(get_current_user)):
    res = supabase.table("workbench_members").select("*").eq("workbench_id", workbench_id).execute()
    members = res.data or []
    
    # Auto-heal: ensure creator is present in workbench_members as owner
    try:
        wb_res = supabase.table("workbenches").select("created_by").eq("id", workbench_id).execute()
        if wb_res.data and wb_res.data[0].get("created_by"):
            creator_id = wb_res.data[0]["created_by"]
            if not any(m.get("user_id") == creator_id for m in members):
                supabase.table("workbench_members").upsert({
                    "workbench_id": workbench_id,
                    "user_id": creator_id,
                    "role": "owner",
                    "status": "active"
                }, on_conflict="workbench_id,user_id").execute()
                res = supabase.table("workbench_members").select("*").eq("workbench_id", workbench_id).execute()
                members = res.data or []
    except Exception as e:
        print(f"Notice auto-healing workbench owner: {e}")

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

@router.post("/access-by-license")
def access_by_license(payload: AccessByLicense, user = Depends(get_current_user_no_waitlist)):
    clean_key = payload.license_key.strip().upper()
    clean_pass = payload.access_password.strip()
    
    if not clean_key or not clean_pass:
        raise HTTPException(status_code=400, detail="Both License Key and Password are required.")
        
    # Query workbench by license_key
    wb_res = supabase.table("workbenches").select("*").eq("license_key", clean_key).execute()
    if not wb_res.data:
        raise HTTPException(status_code=404, detail="Invalid License Key or Workbench not found.")
        
    wb = wb_res.data[0]
    
    # Check access_password
    stored_password = (wb.get("access_password") or "").strip()
    if not stored_password or stored_password != clean_pass:
        raise HTTPException(status_code=401, detail="Incorrect Access Password for this Workbench.")
        
    workbench_id = wb["id"]
    user_id = user["id"]
    
    # Check if user is already a member
    existing = supabase.table("workbench_members").select("*").eq("workbench_id", workbench_id).eq("user_id", user_id).execute()
    if existing.data:
        return {
            "status": "already_member",
            "workbench": wb,
            "membership": existing.data[0]
        }
        
    # Insert new active member into workbench_members
    res = supabase.table("workbench_members").insert({
        "workbench_id": workbench_id,
        "user_id": user_id,
        "role": "admin",
        "status": "active"
    }).execute()
    
    # Best-effort insert into user_members table
    try:
        supabase.table("user_members").insert({
            "user_id": user_id,
            "workbench_id": workbench_id,
            "role": "admin"
        }).execute()
    except Exception:
        pass

    # Log activity
    try:
        supabase.table("activity_logs").insert({
            "workbench_id": workbench_id,
            "user_id": user_id,
            "action_type": "member_joined_via_license",
            "entity_type": "member",
            "entity_id": user_id,
            "description": "User joined workbench via License Key and Password"
        }).execute()
    except Exception:
        pass
        
    return {
        "status": "success",
        "workbench": wb,
        "membership": res.data[0] if res.data else {}
    }

@router.patch("/{workbench_id}/password")
def update_workbench_password(workbench_id: str, payload: PasswordUpdate, user = Depends(get_current_user_no_waitlist)):
    new_pass = payload.access_password.strip()
    if not new_pass:
        raise HTTPException(status_code=400, detail="Password cannot be empty.")

    # 1. Verify workbench exists
    wb_res = supabase.table("workbenches").select("*").eq("id", workbench_id).execute()
    if not wb_res.data:
        raise HTTPException(status_code=404, detail="Workbench not found.")

    wb = wb_res.data[0]

    # 2. Strict owner verification
    is_creator = wb.get("created_by") == user["id"]
    is_owner_member = False
    if not is_creator:
        mem_res = supabase.table("workbench_members").select("role").eq("workbench_id", workbench_id).eq("user_id", user["id"]).execute()
        if mem_res.data and mem_res.data[0].get("role") == "owner":
            is_owner_member = True

    if not is_creator and not is_owner_member:
        raise HTTPException(status_code=403, detail="Only the owner of this workbench is allowed to edit its access password.")

    # 3. Update password in workbenches table
    res = supabase.table("workbenches").update({"access_password": new_pass}).eq("id", workbench_id).execute()
    
    # Log activity
    try:
        supabase.table("activity_logs").insert({
            "workbench_id": workbench_id,
            "user_id": user["id"],
            "action_type": "workbench_password_updated",
            "entity_type": "workbench",
            "entity_id": workbench_id,
            "description": "Owner updated workbench access password"
        }).execute()
    except Exception:
        pass

    return {
        "status": "success",
        "message": "Access password updated successfully.",
        "access_password": new_pass,
        "workbench": res.data[0] if res.data else wb
    }

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
        res = supabase.table("parties").select("*, party_profiles(*), financial_accounts(*)").eq("workbench_id", workbench_id).execute()
        parties_list = res.data or []
        
        party_ids = [p["id"] for p in parties_list if "id" in p]
        roles_by_party = {}
        if party_ids:
            try:
                roles_res = supabase.table("party_roles").select("*").in_("party_id", party_ids).execute()
                for r in (roles_res.data or []):
                    pid = r["party_id"]
                    if pid not in roles_by_party:
                        roles_by_party[pid] = []
                    roles_by_party[pid].append(r["role"])
            except Exception as r_err:
                print("Notice: party_roles query info:", r_err)

        for party in parties_list:
            pid = party["id"]
            party["roles"] = roles_by_party.get(pid, [])
            if not party["roles"] and party.get("party_type"):
                legacy_type = party.get("party_type", "").upper()
                if legacy_type in ["CUSTOMER", "VENDOR", "PARTNER", "INVESTOR", "BANK", "OTHER"]:
                    party["roles"] = [legacy_type]
                elif legacy_type == "INTERNAL":
                    party["is_self"] = True
                    party["roles"] = ["INTERNAL"]
                else:
                    party["roles"] = ["OTHER"]

        return parties_list
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Database error: {str(e)}")

@router.post("/{workbench_id}/parties")
def create_party(workbench_id: str, payload: PartyCreate, user = Depends(get_current_user)):
    try:
        legal_name = payload.legal_name or payload.name or "Unnamed Party"
        display_name = payload.display_name or legal_name
        
        valid_entity_types = ["INDIVIDUAL", "CORPORATION", "OTHER"]
        entity_type = (payload.entity_type or "CORPORATION").upper()
        if entity_type not in valid_entity_types:
            entity_type = "CORPORATION"

        if payload.is_self:
            existing_self = supabase.table("parties").select("id").eq("workbench_id", workbench_id).eq("is_self", True).execute()
            if existing_self.data:
                raise HTTPException(status_code=400, detail="Workbench already has a Self / Owner Party.")

        roles_input = [r.upper() for r in (payload.roles or [])]
        if not roles_input:
            if payload.party_type:
                roles_input = [payload.party_type.upper()]
            else:
                roles_input = ["CUSTOMER"]

        primary_legacy_type = roles_input[0].lower() if roles_input else "customer"

        data_dict = {
            "workbench_id": workbench_id,
            "name": legal_name,
            "legal_name": legal_name,
            "display_name": display_name,
            "entity_type": entity_type,
            "party_type": primary_legacy_type,
            "is_self": payload.is_self,
            "status": "ACTIVE",
            "email": payload.email,
            "phone": payload.phone,
            "notes": payload.notes
        }
        if payload.gstin:
            clean_gstin = payload.gstin.strip().upper()
            data_dict["gstin"] = clean_gstin
            if not payload.pan and len(clean_gstin) == 15:
                data_dict["pan"] = clean_gstin[2:12]
        if payload.pan:
            data_dict["pan"] = payload.pan.strip().upper()
        if payload.address: data_dict["address"] = payload.address.strip()

        res = supabase.table("parties").insert(data_dict).execute()
        if not res.data:
            raise HTTPException(status_code=400, detail="Failed to insert party")
        
        new_party = res.data[0]
        party_id = new_party["id"]

        valid_roles = ["CUSTOMER", "VENDOR", "PARTNER", "INVESTOR", "BANK", "OTHER"]
        added_roles = []
        for role_name in roles_input:
            clean_role = role_name.upper()
            if clean_role in valid_roles:
                try:
                    supabase.table("party_roles").insert({
                        "party_id": party_id,
                        "role": clean_role
                    }).execute()
                    added_roles.append(clean_role)
                except Exception as r_err:
                    print(f"Role insert info for {clean_role}:", r_err)

        new_party["roles"] = added_roles or roles_input
        new_party["financial_accounts"] = []
        return new_party

    except HTTPException:
        raise
    except Exception as e:
        print("Create party error:", e)
        raise HTTPException(status_code=400, detail=f"Database error: {str(e)}")

@router.patch("/{workbench_id}/parties/{party_id}")
def update_party(workbench_id: str, party_id: str, payload: PartyUpdate, user = Depends(get_current_user)):
    try:
        existing = supabase.table("parties").select("*").eq("id", party_id).eq("workbench_id", workbench_id).execute()
        if not existing.data:
            raise HTTPException(status_code=404, detail="Party not found in this Workbench")

        update_dict = {}
        if payload.legal_name is not None:
            update_dict["legal_name"] = payload.legal_name
            update_dict["name"] = payload.legal_name
        if payload.display_name is not None:
            update_dict["display_name"] = payload.display_name
        if payload.entity_type is not None:
            clean_et = payload.entity_type.upper()
            if clean_et in ["INDIVIDUAL", "CORPORATION", "OTHER"]:
                update_dict["entity_type"] = clean_et
        if payload.status is not None:
            clean_st = payload.status.upper()
            if clean_st in ["ACTIVE", "INACTIVE", "ARCHIVED"]:
                update_dict["status"] = clean_st
        if payload.gstin is not None:
            clean_gstin = payload.gstin.strip().upper()
            update_dict["gstin"] = clean_gstin
            if not payload.pan and len(clean_gstin) == 15:
                update_dict["pan"] = clean_gstin[2:12]
        if payload.pan is not None and payload.pan.strip():
            update_dict["pan"] = payload.pan.strip().upper()
        if payload.email is not None:
            update_dict["email"] = payload.email
        if payload.phone is not None:
            update_dict["phone"] = payload.phone
        if payload.address is not None:
            update_dict["address"] = payload.address
        if payload.notes is not None:
            update_dict["notes"] = payload.notes

        if not update_dict:
            return existing.data[0]

        res = supabase.table("parties").update(update_dict).eq("id", party_id).eq("workbench_id", workbench_id).execute()
        return res.data[0] if res.data else existing.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Database error: {str(e)}")

@router.post("/{workbench_id}/parties/{party_id}/roles")
def add_party_role(workbench_id: str, party_id: str, payload: RolePayload, user = Depends(get_current_user)):
    try:
        party_res = supabase.table("parties").select("id").eq("id", party_id).eq("workbench_id", workbench_id).execute()
        if not party_res.data:
            raise HTTPException(status_code=404, detail="Party not found in this Workbench")

        clean_role = payload.role.strip().upper()
        valid_roles = ["CUSTOMER", "VENDOR", "PARTNER", "INVESTOR", "BANK", "OTHER"]
        if clean_role not in valid_roles:
            raise HTTPException(status_code=400, detail=f"Invalid role. Must be one of {valid_roles}")

        res = supabase.table("party_roles").insert({
            "party_id": party_id,
            "role": clean_role
        }).execute()
        return res.data[0] if res.data else {"party_id": party_id, "role": clean_role}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Database error: {str(e)}")

@router.delete("/{workbench_id}/parties/{party_id}/roles/{role}")
def remove_party_role(workbench_id: str, party_id: str, role: str, user = Depends(get_current_user)):
    try:
        party_res = supabase.table("parties").select("id, is_self").eq("id", party_id).eq("workbench_id", workbench_id).execute()
        if not party_res.data:
            raise HTTPException(status_code=404, detail="Party not found in this Workbench")

        clean_role = role.strip().upper()
        res = supabase.table("party_roles").delete().eq("party_id", party_id).eq("role", clean_role).execute()
        return {"success": True, "removed_role": clean_role}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Database error: {str(e)}")

@router.post("/{workbench_id}/parties/resolve")
def resolve_party_identity(workbench_id: str, payload: PartyResolveRequest, user = Depends(get_current_user)):
    try:
        parties_res = supabase.table("parties").select("*, party_roles(*)").eq("workbench_id", workbench_id).execute()
        workbench_parties = parties_res.data or []

        input_gstin = (payload.gstin or "").strip().upper()
        input_pan = (payload.pan or "").strip().upper()
        input_name = (payload.legal_name or payload.display_name or "").strip().lower()
        input_phone = (payload.phone or "").strip()
        input_email = (payload.email or "").strip().lower()

        def normalize_name(s: str) -> str:
            if not s: return ""
            low = s.lower().strip()
            for suffix in ["pvt ltd", "private limited", "ltd", "limited", "inc", "corp", "llp", "co"]:
                low = low.replace(suffix, "")
            return "".join(ch for ch in low if ch.isalnum()).strip()

        norm_input_name = normalize_name(input_name)

        exact_matches = []
        high_conf_matches = []
        ambiguous_matches = []

        for p in workbench_parties:
            p_gstin = (p.get("gstin") or "").strip().upper()
            p_pan = (p.get("pan") or "").strip().upper()
            p_legal = (p.get("legal_name") or p.get("name") or "").strip().lower()
            p_phone = (p.get("phone") or "").strip()
            p_email = (p.get("email") or "").strip().lower()
            norm_p_legal = normalize_name(p_legal)

            is_gstin_exact = input_gstin and p_gstin and (input_gstin == p_gstin)
            is_pan_exact = input_pan and p_pan and (input_pan == p_pan)
            is_name_phone_exact = norm_input_name and norm_p_legal and (norm_input_name == norm_p_legal) and input_phone and (input_phone == p_phone)
            is_name_email_exact = norm_input_name and norm_p_legal and (norm_input_name == norm_p_legal) and input_email and (input_email == p_email)

            if is_gstin_exact or is_pan_exact or is_name_phone_exact or is_name_email_exact:
                exact_matches.append(p)
                continue

            is_exact_name = norm_input_name and norm_p_legal and (norm_input_name == norm_p_legal)
            is_contact_match = (input_phone and p_phone and input_phone == p_phone) or (input_email and p_email and input_email == p_email)
            
            if is_exact_name or is_contact_match:
                high_conf_matches.append(p)
                continue

            if norm_input_name and norm_p_legal:
                if norm_input_name in norm_p_legal or norm_p_legal in norm_input_name:
                    ambiguous_matches.append(p)

        if exact_matches:
            return {"resolution": "EXACT", "candidates": exact_matches}
        elif high_conf_matches:
            return {"resolution": "HIGH_CONFIDENCE", "candidates": high_conf_matches}
        elif ambiguous_matches:
            return {"resolution": "AMBIGUOUS", "candidates": ambiguous_matches}
        else:
            return {"resolution": "NEW", "candidates": []}

    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Resolution error: {str(e)}")

@router.post("/{workbench_id}/parties/{party_id}/vessels")
def add_trade_vessel(workbench_id: str, party_id: str, payload: VesselCreate, user = Depends(get_current_user)):
    party_res = supabase.table("parties").select("id").eq("id", party_id).eq("workbench_id", workbench_id).execute()
    if not party_res.data:
        raise HTTPException(status_code=404, detail="Party not found in this Workbench")

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
    if payload.cin is not None:
        update_data["cin"] = payload.cin
    if payload.gstin is not None:
        update_data["gstin"] = payload.gstin
    if payload.pan is not None:
        update_data["pan"] = payload.pan
    if payload.address is not None:
        update_data["address"] = payload.address
    if payload.bank_accounts is not None:
        update_data["bank_accounts"] = payload.bank_accounts
    
    if not update_data:
        return {"status": "no changes"}
        
    try:
        res = supabase.table("workbenches").update(update_data).eq("id", workbench_id).execute()
        return res.data[0] if res.data else None
    except Exception as e:
        print("[WARNING] Settings update exception (column might be missing from schema):", e)
        # Attempt fallback to update columns that exist or return current workbench state merged with update_data
        wb_res = supabase.table("workbenches").select("*").eq("id", workbench_id).execute()
        current_wb = wb_res.data[0] if (wb_res.data and len(wb_res.data) > 0) else {}
        current_wb.update(update_data)
        return current_wb

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
def get_notifications(workbench_id: Optional[str] = Query(None), user = Depends(get_current_user)):
    try:
        query = supabase.table("notifications").select("*").eq("user_id", user["id"])
        if workbench_id:
            query = query.eq("workbench_id", workbench_id)
        res = query.order("created_at", desc=True).limit(20).execute()
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

# --- Departments & Employee Directory ---

class DepartmentCreate(BaseModel):
    name: str
    code: Optional[str] = None
    description: Optional[str] = ""
    head_id: Optional[str] = None
    head_name: Optional[str] = ""
    parent_department_id: Optional[str] = None
    parent_department_name: Optional[str] = ""
    status: Optional[str] = "active"
    monthly_budget: Optional[float] = 0.0
    annual_budget: Optional[float] = 0.0
    employee_ids: Optional[List[str]] = []

class DepartmentUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    description: Optional[str] = None
    head_id: Optional[str] = None
    head_name: Optional[str] = None
    parent_department_id: Optional[str] = None
    parent_department_name: Optional[str] = None
    status: Optional[str] = None
    monthly_budget: Optional[float] = None
    annual_budget: Optional[float] = None

class EmployeeCreate(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    department_id: Optional[str] = None
    department_name: Optional[str] = None
    designation: Optional[str] = None
    salary: Optional[float] = 0.0
    monthly_allowance: Optional[float] = 0.0

class DepartmentEmployeeLink(BaseModel):
    department_name: str
    employee_ids: List[str]

# Global persistent fallback stores keyed by workbench_id
DEPARTMENTS_STORE: Dict[str, List[Dict]] = {}
EMPLOYEES_STORE: Dict[str, List[Dict]] = {}

def _init_default_departments(workbench_id: str) -> List[Dict]:
    return []

def _init_default_employees(workbench_id: str) -> List[Dict]:
    return []

@router.get("/{workbench_id}/departments")
def get_departments(workbench_id: str):
    db_depts = []
    try:
        res = supabase.table("departments").select("*").eq("workbench_id", workbench_id).execute()
        if res and res.data:
            db_depts = res.data
    except Exception as e:
        print("[DEBUG] Departments table select notice:", e)

    # In-memory store logic
    if workbench_id not in DEPARTMENTS_STORE:
        DEPARTMENTS_STORE[workbench_id] = _init_default_departments(workbench_id)

    mem_depts = DEPARTMENTS_STORE.get(workbench_id, [])

    # Merge db and memory departments by id/name
    seen_ids = set()
    merged = []
    for d in db_depts + mem_depts:
        did = d.get("id") or d.get("name")
        if did not in seen_ids:
            seen_ids.add(did)
            merged.append(d)

    return merged

@router.post("/{workbench_id}/departments")
def create_department(workbench_id: str, dept: DepartmentCreate):
    code = dept.code or (dept.name[:3].upper() if dept.name else "DEP")
    dept_id = str(uuid.uuid4())
    monthly_b = float(dept.monthly_budget or 0.0)
    annual_b = float(dept.annual_budget or (monthly_b * 12))

    row = {
        "id": dept_id,
        "workbench_id": workbench_id if len(workbench_id) == 36 and "-" in workbench_id else None,
        "name": dept.name,
        "code": code,
        "description": dept.description or "",
        "head_id": dept.head_id,
        "head_name": dept.head_name or "",
        "parent_department_id": dept.parent_department_id,
        "parent_department_name": dept.parent_department_name or "",
        "status": dept.status or "active",
        "monthly_budget": monthly_b,
        "annual_budget": annual_b
    }

    # 1. Try DB insert (full payload first, fallback to basic schema columns)
    saved_dept = dict(row)
    try:
        res = supabase.table("departments").insert(row).execute()
        if res and res.data:
            saved_dept = res.data[0]
            dept_id = saved_dept.get("id", dept_id)
    except Exception as e:
        try:
            db_row = {
                "id": dept_id,
                "workbench_id": workbench_id,
                "name": dept.name,
                "code": code,
                "monthly_budget": monthly_b
            }
            res = supabase.table("departments").insert(db_row).execute()
            if res and res.data:
                saved_dept.update(res.data[0])
                dept_id = saved_dept.get("id", dept_id)
        except Exception as db_err2:
            print("[DEBUG] Departments DB insert notice:", db_err2)

    # 2. Update memory store with full rich department attributes
    if workbench_id not in DEPARTMENTS_STORE:
        DEPARTMENTS_STORE[workbench_id] = _init_default_departments(workbench_id)
    DEPARTMENTS_STORE[workbench_id].append(saved_dept)

    # 3. If employee_ids supplied, link employees to this department
    if dept.employee_ids:
        link_employees_to_dept_internal(workbench_id, dept_id, dept.name, dept.employee_ids)

    return saved_dept

@router.api_route("/{workbench_id}/departments/{department_id}", methods=["PUT", "PATCH"])
def update_department(workbench_id: str, department_id: str, dept: DepartmentUpdate):
    update_data = {k: v for k, v in dept.dict(exclude_unset=True).items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    clean_wb_id = workbench_id if (len(workbench_id) == 36 and "-" in workbench_id) else None
    saved_dept = None

    if clean_wb_id:
        try:
            # Try updating full dataset
            res = supabase.table("departments").update(update_data).eq("id", department_id).eq("workbench_id", clean_wb_id).execute()
            if res and res.data:
                saved_dept = res.data[0]
            else:
                # Try by name if id didn't match
                res2 = supabase.table("departments").update(update_data).eq("name", department_id).eq("workbench_id", clean_wb_id).execute()
                if res2 and res2.data:
                    saved_dept = res2.data[0]
        except Exception as e:
            # Fallback to sanitized basic schema fields
            try:
                basic_keys = {"name", "code", "monthly_budget"}
                db_data = {k: v for k, v in update_data.items() if k in basic_keys}
                if db_data:
                    res3 = supabase.table("departments").update(db_data).eq("id", department_id).eq("workbench_id", clean_wb_id).execute()
                    if res3 and res3.data:
                        saved_dept = res3.data[0]
            except Exception as db_err2:
                print("[DEBUG] Departments DB update notice:", db_err2)

    mem_depts = DEPARTMENTS_STORE.get(workbench_id, [])
    found = False
    for i, d in enumerate(mem_depts):
        if d.get("id") == department_id or d.get("name") == department_id:
            mem_depts[i].update(update_data)
            if not saved_dept:
                saved_dept = mem_depts[i]
            found = True
            break

    if not found:
        new_entry = {"id": department_id, "workbench_id": workbench_id, **update_data}
        if workbench_id not in DEPARTMENTS_STORE:
            DEPARTMENTS_STORE[workbench_id] = []
        DEPARTMENTS_STORE[workbench_id].append(new_entry)
        if not saved_dept:
            saved_dept = new_entry

    return saved_dept

def link_employees_to_dept_internal(workbench_id: str, dept_id: str, dept_name: str, employee_ids: List[str]):
    # Update memory store
    mem_emps = EMPLOYEES_STORE.get(workbench_id, [])
    for emp in mem_emps:
        if emp.get("id") in employee_ids:
            emp["department_id"] = dept_id
            emp["department_name"] = dept_name

    # Try DB update
    try:
        for emp_id in employee_ids:
            supabase.table("employees").update({
                "department_id": dept_id,
                "department_name": dept_name
            }).eq("id", emp_id).eq("workbench_id", workbench_id).execute()
    except Exception as e:
        print("[DEBUG] Employees batch DB update notice:", e)

@router.put("/{workbench_id}/departments/{department_id}/link-employees")
def link_employees_to_department(workbench_id: str, department_id: str, link_data: DepartmentEmployeeLink):
    link_employees_to_dept_internal(workbench_id, department_id, link_data.department_name, link_data.employee_ids)
    return {"status": "success", "linked_count": len(link_data.employee_ids)}

@router.get("/{workbench_id}/employees")
def get_employees(workbench_id: str):
    # Calculate approved spend per employee from CLAIMS_STORE and DB
    approved_claims = [c for c in CLAIMS_STORE if c.get("workbench_id") == workbench_id and c.get("status") == "APPROVED"]
    try:
        db_res = supabase.table("expense_claims").select("*").eq("workbench_id", workbench_id).eq("status", "APPROVED").execute()
        if db_res and db_res.data:
            approved_claims.extend(db_res.data)
    except Exception:
        pass

    spend_map = {}
    for c in approved_claims:
        emp_name = c.get("employee_name")
        if emp_name:
            spend_map[emp_name] = spend_map.get(emp_name, 0.0) + float(c.get("amount", 0.0))

    db_emps = []
    try:
        res = supabase.table("employees").select("*").eq("workbench_id", workbench_id).execute()
        if res and res.data:
            db_emps = res.data
    except Exception as e:
        print("[DEBUG] Employees DB select notice:", e)

    if workbench_id not in EMPLOYEES_STORE:
        EMPLOYEES_STORE[workbench_id] = _init_default_employees(workbench_id)

    mem_emps = EMPLOYEES_STORE.get(workbench_id, [])

    seen_ids = set()
    merged = []
    for emp in db_emps + mem_emps:
        eid = emp.get("id") or emp.get("name")
        if eid not in seen_ids:
            seen_ids.add(eid)
            merged.append(emp)

    for emp in merged:
        emp_name = emp.get("name")
        spent = spend_map.get(emp_name, 0.0)
        allowance = float(emp.get("monthly_allowance", 15000) or 15000)
        emp["spent_allowance"] = spent
        emp["remaining_allowance"] = max(0.0, allowance - spent)
        if "salary" not in emp or emp["salary"] is None:
            emp["salary"] = 50000.0

    return merged

@router.post("/{workbench_id}/employees")
def create_employee(workbench_id: str, emp: EmployeeCreate):
    emp_id = str(uuid.uuid4())
    clean_wb_id = workbench_id if (len(workbench_id) == 36 and "-" in workbench_id) else None
    row = {
        "id": emp_id,
        "workbench_id": workbench_id,
        "name": emp.name,
        "email": emp.email or "",
        "phone": emp.phone or "",
        "department_id": emp.department_id or "",
        "department_name": emp.department_name or "General Operations",
        "designation": emp.designation or "Staff",
        "salary": float(emp.salary or 0.0),
        "monthly_allowance": float(emp.monthly_allowance or 0.0)
    }

    saved_emp = row
    if clean_wb_id:
        try:
            res = supabase.table("employees").insert({
                "id": emp_id,
                "workbench_id": clean_wb_id,
                "name": emp.name,
                "email": emp.email or "",
                "phone": emp.phone or "",
                "department_id": emp.department_id if (emp.department_id and len(emp.department_id) == 36) else None,
                "department_name": emp.department_name or "General Operations",
                "designation": emp.designation or "Staff",
                "salary": float(emp.salary or 0.0),
                "monthly_allowance": float(emp.monthly_allowance or 0.0)
            }).execute()
            if res and res.data:
                saved_emp = res.data[0]
        except Exception as e:
            print("[DEBUG] Employees DB insert notice:", e)

    if workbench_id not in EMPLOYEES_STORE:
        EMPLOYEES_STORE[workbench_id] = _init_default_employees(workbench_id)
    EMPLOYEES_STORE[workbench_id].append(saved_emp)

    return saved_emp


# --- Employee Expense Claims & Approval Workflow ---

class ExpenseClaimCreate(BaseModel):
    claim_number: str
    employee_name: str
    employee_email: Optional[str] = None
    department_name: Optional[str] = "General"
    category: str
    amount: float
    date: str
    payment_type: Optional[str] = "REIMBURSEMENT"
    notes: Optional[str] = None
    document_id: Optional[str] = None

# Global in-memory claims store fallback if DB table isn't migrated
CLAIMS_STORE: List[Dict] = []

@router.get("/{workbench_id}/claims")
def get_expense_claims(workbench_id: str):
    clean_wb_id = workbench_id if (len(workbench_id) == 36 and "-" in workbench_id) else None
    db_claims = []
    if clean_wb_id:
        try:
            res = supabase.table("expense_claims").select("*").eq("workbench_id", clean_wb_id).order("created_at", desc=True).execute()
            db_claims = res.data or []
        except Exception as e:
            pass

    local_claims = [c for c in CLAIMS_STORE if c.get("workbench_id") == workbench_id]
    seen = set()
    merged = []
    for c in local_claims + db_claims:
        cn = c.get("claim_number") or c.get("id")
        if cn not in seen:
            seen.add(cn)
            merged.append(c)
    return merged

@router.post("/{workbench_id}/claims")
def create_expense_claim(workbench_id: str, claim: ExpenseClaimCreate):
    claim_id = str(uuid.uuid4())
    clean_wb_id = workbench_id if (len(workbench_id) == 36 and "-" in workbench_id) else None

    claim_row = {
        "id": claim_id,
        "workbench_id": workbench_id,
        "claim_number": claim.claim_number,
        "employee_name": claim.employee_name,
        "employee_email": claim.employee_email or "",
        "department_name": claim.department_name or "General Operations",
        "category": claim.category,
        "amount": claim.amount,
        "date": claim.date,
        "payment_type": claim.payment_type or "REIMBURSEMENT",
        "notes": claim.notes or "",
        "document_id": claim.document_id,
        "status": "PENDING", # PENDING | APPROVED | REJECTED
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Save to local store fallback
    CLAIMS_STORE.insert(0, claim_row)

    # Try database insert if UUID workbench
    if clean_wb_id:
        try:
            db_payload = dict(claim_row)
            db_payload["workbench_id"] = clean_wb_id
            if claim.document_id and (len(claim.document_id) != 36 or "-" not in claim.document_id):
                db_payload["document_id"] = None
            supabase.table("expense_claims").insert(db_payload).execute()
        except Exception as db_err:
            print("[WARNING] Could not save claim to database, fallback stored in memory:", db_err)

    # Broadcast Notification to Workbench Members / Owners
    try:
        # Find members of workbench
        members_res = supabase.table("workbench_members").select("user_id").eq("workbench_id", workbench_id).execute()
        user_ids = [m["user_id"] for m in (members_res.data or []) if m.get("user_id")]
        
        notif_message = f"New Expense Claim {claim.claim_number} (₹{claim.amount:,.2f}) submitted by {claim.employee_name} [{claim.department_name}]. Needs approval."
        
        for uid in user_ids:
            try:
                supabase.table("notifications").insert({
                    "user_id": uid,
                    "title": f"Claim {claim.claim_number} Submitted",
                    "message": notif_message,
                    "link": "/dashboard/workbench/ops",
                    "is_read": False,
                    "created_at": datetime.now(timezone.utc).isoformat()
                }).execute()
            except Exception:
                pass
    except Exception as notif_err:
        print("[WARNING] Could not emit notifications:", notif_err)

    return claim_row

def _resolve_validated_account(workbench_id: str, account_name: str, category_code: str = "EXP", normal_balance: str = "debit") -> str:
    """Helper to resolve and validate an existing account/ledger in di_accounts (COA).
    POSTING VALIDATION INVARIANT:
    No account auto-creation or fallback during voucher posting!
    Posting requires a pre-existing valid postable account in di_accounts matching account_name.
    """
    clean_wb_id = workbench_id if (len(workbench_id) == 36 and "-" in workbench_id) else None
    if clean_wb_id:
        try:
            res = supabase.table("di_accounts")\
                .select("id, name, parent_account_id, is_postable")\
                .eq("workbench_id", clean_wb_id)\
                .ilike("name", account_name)\
                .execute()
            if res.data and len(res.data) > 0:
                # Valid existing account ID found
                return res.data[0]["id"]
        except Exception as err:
            print(f"[DEBUG] _resolve_validated_account search error: {err}")

    raise ValueError(f"[POSTING REJECTED] Referenced accounting object '{account_name}' does not exist in workbench {workbench_id}. Account creation belongs to COA Settings, not voucher posting.")

def _post_double_entry_voucher(
    workbench_id: str,
    description: str,
    date_str: str,
    debit_account_name: str,
    credit_account_name: str,
    amount: float,
    department_id: Optional[str] = None,
    department_name: Optional[str] = None
) -> Dict:
    """Compiles and posts double-entry transaction into di_ledger_transactions & di_ledger_entries.
    IMMUTABILITY & VALIDATION INVARIANT:
    Requires valid pre-existing accounts in di_accounts. Rejects missing accounts cleanly.
    """
    dr_acct_id = _resolve_validated_account(workbench_id, debit_account_name, "EXP", "debit")
    cr_acct_id = _resolve_validated_account(
        workbench_id,
        credit_account_name,
        "LIA" if "Payable" in credit_account_name else "AST",
        "credit"
    )

    tx_data = {
        "workbench_id": workbench_id,
        "description": description,
        "transaction_date": date_str or datetime.now().strftime("%Y-%m-%d"),
        "currency": "INR",
        "total_amount": float(amount),
        "department_id": department_id,
        "department_name": department_name
    }

    try:
        tx_res = supabase.table("di_ledger_transactions").insert(tx_data).execute()
        if tx_res.data and len(tx_res.data) > 0:
            tx_id = tx_res.data[0]["id"]
            supabase.table("di_ledger_entries").insert([
                {
                    "transaction_id": tx_id,
                    "account_id": dr_acct_id,
                    "direction": "debit",
                    "amount": float(amount),
                    "memo": f"Dr {debit_account_name} [{department_name or 'General'}]",
                    "department_id": department_id,
                    "department_name": department_name
                },
                {
                    "transaction_id": tx_id,
                    "account_id": cr_acct_id,
                    "direction": "credit",
                    "amount": float(amount),
                    "memo": f"Cr {credit_account_name} [{department_name or 'General'}]",
                    "department_id": department_id,
                    "department_name": department_name
                }
            ]).execute()
            return tx_res.data[0]
    except Exception as err:
        print(f"[ERROR] Failed to insert di_ledger_transaction: {err}")
        raise ValueError(f"Database voucher posting failed: {err}")

    return {"status": "posted_in_memory", "description": description, "amount": amount}

class ClaimStatusUpdate(BaseModel):
    status: str # APPROVED | REJECTED | RETURNED

@router.patch("/{workbench_id}/claims/{claim_id}")
def update_claim_status(workbench_id: str, claim_id: str, payload: ClaimStatusUpdate):
    target_claim = None
    for c in CLAIMS_STORE:
        if c.get("id") == claim_id or c.get("claim_number") == claim_id:
            c["status"] = payload.status
            target_claim = c
            break

    try:
        res = supabase.table("expense_claims").update({"status": payload.status}).or_(f"id.eq.{claim_id},claim_number.eq.{claim_id}").execute()
        if res.data and len(res.data) > 0:
            target_claim = res.data[0]
    except Exception as e:
        print("[WARNING] DB update for claim status notice:", e)

    if not target_claim:
        target_claim = {"id": claim_id, "workbench_id": workbench_id, "status": payload.status}

    # If APPROVED: execute double-entry accounting voucher compiler
    if payload.status == "APPROVED":
        dept_name = target_claim.get("department_name") or "General Operations"
        dept_id = target_claim.get("department_id")
        payment_type = (target_claim.get("payment_type") or "REIMBURSEMENT").upper()
        amount = float(target_claim.get("amount", 0.0))
        category = target_claim.get("category") or "Operating Expenses"
        employee_name = target_claim.get("employee_name") or "Staff"
        claim_no = target_claim.get("claim_number") or claim_id

        if payment_type == "DIRECT_COMPANY_PAYMENT":
            # Direct OPEX Spend (Company-paid from department budget)
            # Dr Expense Account, Cr Bank Account
            voucher = _post_double_entry_voucher(
                workbench_id=workbench_id,
                description=f"Direct Department OPEX: {category} ({claim_no})",
                date_str=target_claim.get("date"),
                debit_account_name=category,
                credit_account_name="Bank Account",
                amount=amount,
                department_id=dept_id,
                department_name=dept_name
            )
            target_claim["reimbursement_status"] = "N/A"
            target_claim["settlement_status"] = "SETTLED"
            target_claim["voucher_id"] = voucher.get("id")
        else:
            # Employee Out-of-Pocket Claim Approval
            # Dr Expense Account, Cr Employee Reimbursement Payable
            voucher = _post_double_entry_voucher(
                workbench_id=workbench_id,
                description=f"Employee Claim Approval: {claim_no} ({employee_name})",
                date_str=target_claim.get("date"),
                debit_account_name=category,
                credit_account_name="Employee Reimbursement Payable",
                amount=amount,
                department_id=dept_id,
                department_name=dept_name
            )
            target_claim["reimbursement_status"] = "UNPAID"
            target_claim["settlement_status"] = "UNSETTLED"
            target_claim["voucher_id"] = voucher.get("id")

        # Update status fields in DB if supported
        try:
            supabase.table("expense_claims").update({
                "reimbursement_status": target_claim.get("reimbursement_status"),
                "settlement_status": target_claim.get("settlement_status"),
                "voucher_id": target_claim.get("voucher_id")
            }).or_(f"id.eq.{claim_id},claim_number.eq.{claim_id}").execute()
        except Exception:
            pass

    return target_claim

@router.post("/{workbench_id}/claims/{claim_id}/reimburse")
def reimburse_expense_claim(workbench_id: str, claim_id: str):
    """Processes bank/cash reimbursement payment for an approved employee out-of-pocket claim."""
    target_claim = None
    for c in CLAIMS_STORE:
        if c.get("id") == claim_id or c.get("claim_number") == claim_id:
            target_claim = c
            break

    try:
        res = supabase.table("expense_claims").select("*").or_(f"id.eq.{claim_id},claim_number.eq.{claim_id}").execute()
        if res.data and len(res.data) > 0:
            target_claim = res.data[0]
    except Exception:
        pass

    if not target_claim:
        raise HTTPException(status_code=404, detail="Claim not found")

    amount = float(target_claim.get("amount", 0.0))
    dept_name = target_claim.get("department_name") or "General Operations"
    dept_id = target_claim.get("department_id")
    employee_name = target_claim.get("employee_name") or "Staff"
    claim_no = target_claim.get("claim_number") or claim_id

    # Post payment voucher: Dr Employee Reimbursement Payable, Cr Bank Account
    payment_voucher = _post_double_entry_voucher(
        workbench_id=workbench_id,
        description=f"Reimbursement Payment for Claim {claim_no} ({employee_name})",
        date_str=datetime.now().strftime("%Y-%m-%d"),
        debit_account_name="Employee Reimbursement Payable",
        credit_account_name="Bank Account",
        amount=amount,
        department_id=dept_id,
        department_name=dept_name
    )

    target_claim["reimbursement_status"] = "REIMBURSED"
    target_claim["settlement_status"] = "SETTLED"
    target_claim["payment_voucher_id"] = payment_voucher.get("id")
    target_claim["reimbursed_at"] = datetime.now(timezone.utc).isoformat()

    try:
        supabase.table("expense_claims").update({
            "reimbursement_status": "REIMBURSED",
            "settlement_status": "SETTLED",
            "payment_voucher_id": payment_voucher.get("id"),
            "reimbursed_at": target_claim["reimbursed_at"]
        }).or_(f"id.eq.{claim_id},claim_number.eq.{claim_id}").execute()
    except Exception as db_err:
        print("[WARNING] Could not update claim reimbursement status in DB:", db_err)

    return target_claim

@router.get("/{workbench_id}/departments/{department_id}/budget-vs-actual")
def get_department_budget_vs_actual(workbench_id: str, department_id: str):
    """Computes real Department Budget vs Actual from double-entry transactions and approved spend."""
    dept = None
    depts = get_departments(workbench_id)
    for d in depts:
        if d.get("id") == department_id or d.get("name") == department_id:
            dept = d
            break

    if not dept:
        dept = {"id": department_id, "name": department_id, "monthly_budget": 0.0, "annual_budget": 0.0}

    dept_name = dept.get("name")
    monthly_budget = float(dept.get("monthly_budget", 0.0) or 0.0)
    annual_budget = float(dept.get("annual_budget", monthly_budget * 12) or 0.0)

    # Compute Actual from double-entry ledger transactions
    actual = 0.0
    try:
        tx_res = supabase.table("di_ledger_transactions").select("id, total_amount").eq("workbench_id", workbench_id).or_(f"department_id.eq.{department_id},department_name.eq.{dept_name}").execute()
        if tx_res.data:
            actual += sum(float(t.get("total_amount", 0.0)) for t in tx_res.data)
    except Exception:
        pass

    # Include approved claims in actual if not already linked to transaction
    claims = get_expense_claims(workbench_id)
    for c in claims:
        c_dept = c.get("department_id") or c.get("department_name")
        if (c_dept == department_id or c_dept == dept_name) and c.get("status") == "APPROVED" and not c.get("voucher_id"):
            actual += float(c.get("amount", 0.0))

    # Compute Committed (pending claim requests under review)
    committed = 0.0
    for c in claims:
        c_dept = c.get("department_id") or c.get("department_name")
        if (c_dept == department_id or c_dept == dept_name) and c.get("status") in ["PENDING", "UNDER_REVIEW"]:
            committed += float(c.get("amount", 0.0))

    remaining_monthly = max(0.0, monthly_budget - actual)
    remaining_annual = max(0.0, annual_budget - actual)
    utilization_pct = round((actual / (monthly_budget or 1.0)) * 100, 1) if monthly_budget > 0 else 0.0

    return {
        "department_id": department_id,
        "department_name": dept_name,
        "monthly_budget": monthly_budget,
        "annual_budget": annual_budget,
        "actual": actual,
        "remaining_monthly": remaining_monthly,
        "remaining_annual": remaining_annual,
        "utilization_pct": utilization_pct,
        "committed": committed
    }

@router.patch("/{workbench_id}/departments/{department_id}/status")
def update_department_status(workbench_id: str, department_id: str, payload: Dict[str, str]):
    """Soft deactivates or reactivates a department without hard deleting historical accounting references."""
    new_status = payload.get("status", "active").lower()
    mem_depts = DEPARTMENTS_STORE.get(workbench_id, [])
    target = None
    for d in mem_depts:
        if d.get("id") == department_id or d.get("name") == department_id:
            d["status"] = new_status
            target = d
            break

    try:
        res = supabase.table("departments").update({"status": new_status}).eq("id", department_id).eq("workbench_id", workbench_id).execute()
        if res.data and len(res.data) > 0:
            target = res.data[0]
    except Exception as e:
        print("[WARNING] DB department status update notice:", e)

    return target or {"id": department_id, "status": new_status}


@router.delete("/{workbench_id}")
def delete_workbench(workbench_id: str, current_user: dict = Depends(get_current_user_no_waitlist)):
    # 1. Clean up di_ledger_transactions (triggers ON DELETE CASCADE on di_ledger_entries in Postgres)
    try:
        supabase.table("di_ledger_transactions").delete().eq("workbench_id", workbench_id).execute()
    except Exception as e:
        print("[WARNING] di_ledger_transactions delete:", e)

    # 2. Clean up di_workbench_labels
    try:
        supabase.table("di_workbench_labels").delete().eq("workbench_id", workbench_id).execute()
    except Exception as e:
        pass

    # 3. Clean up di_accounts (safe now that di_ledger_entries are removed)
    try:
        supabase.table("di_accounts").delete().eq("workbench_id", workbench_id).execute()
    except Exception as e:
        pass

    # 4. Clean up di_documents and child notes/logs
    try:
        res = supabase.table("di_documents").select("id").eq("workbench_id", workbench_id).execute()
        if res.data and len(res.data) > 0:
            doc_ids = [d["id"] for d in res.data]
            try:
                supabase.table("di_analysis_notes").delete().in_("document_id", doc_ids).execute()
            except Exception as e:
                pass
            try:
                supabase.table("di_document_processing_logs").delete().in_("document_id", doc_ids).execute()
            except Exception as e:
                pass
        supabase.table("di_documents").delete().eq("workbench_id", workbench_id).execute()
    except Exception as e:
        pass

    # 5. Clean up parties
    try:
        supabase.table("parties").delete().eq("workbench_id", workbench_id).execute()
    except Exception as e:
        pass

    # 6. Clean up workbench_accounts
    try:
        supabase.table("workbench_accounts").delete().eq("workbench_id", workbench_id).execute()
    except Exception as e:
        pass

    # 7. Clean up workbench_members
    try:
        supabase.table("workbench_members").delete().eq("workbench_id", workbench_id).execute()
    except Exception as e:
        pass

    # 8. Delete parent workbench record (bypasses RLS using Service Role key)
    try:
        del_res = supabase.table("workbenches").delete().eq("id", workbench_id).execute()
        return {"success": True, "message": "Workbench deleted successfully", "data": del_res.data}
    except Exception as e:
        print("[ERROR] Failed to delete workbench row:", e)
        raise HTTPException(status_code=500, detail=f"Failed to delete workbench: {str(e)}")



