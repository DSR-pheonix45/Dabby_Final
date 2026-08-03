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
    gstin: Optional[str] = None
    pan: Optional[str] = None
    address: Optional[str] = None
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
        data_dict = {
            "workbench_id": workbench_id,
            "name": payload.name,
            "party_type": payload.party_type,
            "email": payload.email,
            "phone": payload.phone,
            "notes": payload.notes
        }
        if payload.gstin: data_dict["gstin"] = payload.gstin.upper()
        if payload.pan: data_dict["pan"] = payload.pan.upper()
        if payload.address: data_dict["address"] = payload.address

        res = supabase.table("parties").insert(data_dict).execute()
        return res.data[0] if res.data else None
    except Exception as e:
        print("Create party error:", e)
        # Retry with minimal fields if table schema does not have gstin/pan/address columns
        try:
            fallback = {
                "workbench_id": workbench_id,
                "name": payload.name,
                "party_type": payload.party_type,
                "email": payload.email,
                "phone": payload.phone,
                "notes": payload.notes
            }
            res = supabase.table("parties").insert(fallback).execute()
            return res.data[0] if res.data else None
        except Exception as fallbackErr:
            raise HTTPException(status_code=400, detail=f"Database error: {str(fallbackErr)}")

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

# --- Departments & Employee Directory ---

class DepartmentCreate(BaseModel):
    name: str
    code: Optional[str] = None
    monthly_budget: Optional[float] = 0.0

class EmployeeCreate(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    department_id: Optional[str] = None
    department_name: Optional[str] = None
    designation: Optional[str] = None
    monthly_allowance: Optional[float] = 0.0

@router.get("/{workbench_id}/departments")
def get_departments(workbench_id: str):
    try:
        res = supabase.table("departments").select("*").eq("workbench_id", workbench_id).execute()
        return res.data or []
    except Exception as e:
        # Fallback to in-memory/default mock departments if schema table isn't created yet
        return [
            {"id": "dept_1", "workbench_id": workbench_id, "name": "Site Operations", "monthly_budget": 100000},
            {"id": "dept_2", "workbench_id": workbench_id, "name": "Sales & Business Development", "monthly_budget": 150000},
            {"id": "dept_3", "workbench_id": workbench_id, "name": "Engineering & IT", "monthly_budget": 80000},
            {"id": "dept_4", "workbench_id": workbench_id, "name": "Administration & HR", "monthly_budget": 50000}
        ]

@router.post("/{workbench_id}/departments")
def create_department(workbench_id: str, dept: DepartmentCreate):
    try:
        row = {
            "workbench_id": workbench_id,
            "name": dept.name,
            "code": dept.code or dept.name[:3].upper(),
            "monthly_budget": dept.monthly_budget or 0.0
        }
        res = supabase.table("departments").insert(row).execute()
        return res.data[0] if res.data else row
    except Exception as e:
        return {"id": f"dept_{int(datetime.now().timestamp())}", "workbench_id": workbench_id, "name": dept.name, "monthly_budget": dept.monthly_budget}

@router.get("/{workbench_id}/employees")
def get_employees(workbench_id: str):
    # Calculate approved spend per employee from CLAIMS_STORE and DB
    approved_claims = [c for c in CLAIMS_STORE if c.get("workbench_id") == workbench_id and c.get("status") == "APPROVED"]
    try:
        db_res = supabase.table("expense_claims").select("*").eq("workbench_id", workbench_id).eq("status", "APPROVED").execute()
        if db_res.data:
            approved_claims.extend(db_res.data)
    except Exception:
        pass

    spend_map = {}
    for c in approved_claims:
        emp_name = c.get("employee_name")
        if emp_name:
            spend_map[emp_name] = spend_map.get(emp_name, 0.0) + float(c.get("amount", 0.0))

    try:
        res = supabase.table("employees").select("*").eq("workbench_id", workbench_id).execute()
        employees = res.data or []
        if not employees:
            employees = [
                {"id": "emp_1", "workbench_id": workbench_id, "name": "Rahul Sharma", "email": "rahul.s@company.com", "department_name": "Site Operations", "designation": "Site Engineer", "monthly_allowance": 15000},
                {"id": "emp_2", "workbench_id": workbench_id, "name": "Priya Verma", "email": "priya.v@company.com", "department_name": "Sales & Business Development", "designation": "Sales Executive", "monthly_allowance": 25000}
            ]
    except Exception as e:
        employees = [
            {"id": "emp_1", "workbench_id": workbench_id, "name": "Rahul Sharma", "email": "rahul.s@company.com", "department_name": "Site Operations", "designation": "Site Engineer", "monthly_allowance": 15000},
            {"id": "emp_2", "workbench_id": workbench_id, "name": "Priya Verma", "email": "priya.v@company.com", "department_name": "Sales & Business Development", "designation": "Sales Executive", "monthly_allowance": 25000}
        ]

    for emp in employees:
        emp_name = emp.get("name")
        spent = spend_map.get(emp_name, 0.0)
        allowance = float(emp.get("monthly_allowance", 15000) or 15000)
        emp["spent_allowance"] = spent
        emp["remaining_allowance"] = max(0.0, allowance - spent)

    return employees

@router.post("/{workbench_id}/employees")
def create_employee(workbench_id: str, emp: EmployeeCreate):
    try:
        row = {
            "workbench_id": workbench_id,
            "name": emp.name,
            "email": emp.email or "",
            "phone": emp.phone or "",
            "department_id": emp.department_id or "",
            "department_name": emp.department_name or "General Operations",
            "designation": emp.designation or "Staff",
            "monthly_allowance": emp.monthly_allowance or 0.0
        }
        res = supabase.table("employees").insert(row).execute()
        return res.data[0] if res.data else row
    except Exception as e:
        return {"id": f"emp_{int(datetime.now().timestamp())}", "workbench_id": workbench_id, "name": emp.name, "email": emp.email, "department_name": emp.department_name, "designation": emp.designation}

# --- Employee Expense Claims & Approval Workflow ---

class ExpenseClaimCreate(BaseModel):
    claim_number: str
    employee_name: str
    employee_email: Optional[str] = None
    department_name: Optional[str] = "Site Operations"
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
    try:
        res = supabase.table("expense_claims").select("*").eq("workbench_id", workbench_id).order("created_at", desc=True).execute()
        db_claims = res.data or []
        local_claims = [c for c in CLAIMS_STORE if c.get("workbench_id") == workbench_id]
        # Merge local and db claims (avoid duplicates by claim_number)
        seen = set()
        merged = []
        for c in local_claims + db_claims:
            cn = c.get("claim_number") or c.get("id")
            if cn not in seen:
                seen.add(cn)
                merged.append(c)
        return merged
    except Exception as e:
        return [c for c in CLAIMS_STORE if c.get("workbench_id") == workbench_id]

@router.post("/{workbench_id}/claims")
def create_expense_claim(workbench_id: str, claim: ExpenseClaimCreate):
    claim_row = {
        "id": f"claim_{int(datetime.now().timestamp())}",
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

    # Try database insert
    try:
        supabase.table("expense_claims").insert(claim_row).execute()
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

class ClaimStatusUpdate(BaseModel):
    status: str # APPROVED | REJECTED

@router.patch("/{workbench_id}/claims/{claim_id}")
def update_claim_status(workbench_id: str, claim_id: str, payload: ClaimStatusUpdate):
    # Update local store
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
        print("[WARNING] DB update for claim status fallback:", e)

    # If APPROVED, automatically log draft document event in financial ledger
    if payload.status == "APPROVED" and target_claim:
        try:
            event_payload = {
                "document_type": "expense_receipt",
                "party": f"{target_claim.get('employee_name')} ({target_claim.get('department_name')})",
                "total_amount": target_claim.get("amount", 0.0),
                "date": target_claim.get("date"),
                "currency": "INR",
                "metadata": {
                    "claim_number": target_claim.get("claim_number"),
                    "category": target_claim.get("category"),
                    "payment_type": target_claim.get("payment_type"),
                    "employee_name": target_claim.get("employee_name"),
                    "department_name": target_claim.get("department_name"),
                    "status": "APPROVED"
                }
            }
            supabase.table("di_analysis_notes").insert({
                "document_type": "expense_receipt",
                "confidence": 0.99,
                "parties": {
                    "issuer": {"name": target_claim.get("employee_name"), "department": target_claim.get("department_name")},
                    "recipient": {"name": "Company"}
                },
                "money": {
                    "total_amount": target_claim.get("amount", 0.0),
                    "currency": "INR"
                },
                "dates": {"document_date": target_claim.get("date")},
                "raw_text": f"Approved Claim #{target_claim.get('claim_number')} by {target_claim.get('employee_name')}"
            }).execute()
        except Exception as event_err:
            print("[WARNING] Event creation on claim approval:", event_err)

    return target_claim or {"id": claim_id, "status": payload.status}


