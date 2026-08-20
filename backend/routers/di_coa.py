import uuid
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from supabase_client import supabase

router = APIRouter()

# --- Pydantic Models ---

class COATemplateSeed(BaseModel):
    workbench_id: str
    template_id: str

class AIRecommendPayload(BaseModel):
    workbench_id: str
    business_type: Optional[str] = "services"
    industry: Optional[str] = "others"
    scale: Optional[str] = "small"
    domain: Optional[str] = None

class CreateLedgerPayload(BaseModel):
    workbench_id: str
    sub_account_id: str
    ledger_name: str
    ledger_code: Optional[str] = None
    description: Optional[str] = None

class CreateLabelPayload(BaseModel):
    workbench_id: str
    ledger_account_id: str
    label_name: str
    description: Optional[str] = None

# ALERX Group Code to Sub-account Taxonomy mapping
GROUP_SUBACCOUNT_MAP = {
    "ACO": ("A-ACO", "Cash & Cash Equivalents", "A"),
    "AAR": ("A-AAR", "Accounts Receivable (AR)", "A"),
    "AIN": ("A-AIN", "Inventory", "A"),
    "ATX": ("A-ATX", "Tax & Operational Advances", "A"),
    "AFA": ("A-AFA", "Fixed & Intangible Assets", "A"),
    "LAP": ("L-LAP", "Accounts Payable (AP)", "L"),
    "LDE": ("L-LDE", "Debt & Credit Lines", "L"),
    "LST": ("L-LST", "Statutory & Tax Liabilities", "L"),
    "LPR": ("L-LPR", "Payroll Liabilities", "L"),
    "LOT": ("L-LOT", "Accrued Expenses & Other Liabilities", "L"),
    "ESC": ("E-ESC", "Share Capital", "E"),
    "EOU": ("E-EOU", "Securities Premium & Surplus", "E"),
    "ERE": ("E-ERE", "Retained Earnings & Reserves", "E"),
    "ROP": ("R-ROP", "Operating Revenue", "R"),
    "RCR": ("R-RCR", "Contra-Revenue & Other Income", "R"),
    "XDC": ("X-XDC", "Direct Costs (COGS)", "X"),
    "XPE": ("X-XPE", "Personnel Costs (OPEX)", "X"),
    "XMK": ("X-XMK", "Marketing & Growth (OPEX)", "X"),
    "XTE": ("X-XTE", "Technology & Internal Tools (OPEX)", "X"),
    "XAD": ("X-XAD", "Administrative & Statutory Expenses", "X"),
}

CLASS_TO_CATEGORY = {
    "Assets": "A", "Liabilities": "L", "Equity": "E", "Revenue": "R", "Expenses": "X",
    "Asset": "A", "Liability": "L", "Income": "R", "Expense": "X",
    "AST": "A", "LIA": "L", "EQU": "E", "REV": "R", "EXP": "X"
}

CATEGORY_TO_CLASS = {
    "A": "Assets", "AST": "Assets",
    "L": "Liabilities", "LIA": "Liabilities",
    "E": "Equity", "EQU": "Equity",
    "R": "Revenue", "REV": "Revenue",
    "X": "Expenses", "EXP": "Expenses"
}

# --- GET Canonical Structured Accounts ---

@router.get("/accounts/{workbench_id}")
async def get_accounts(workbench_id: str):
    """
    Fetches the full canonical ALERX hierarchy for a workbench:
    Account (AST/LIA/EQU/REV/EXP) -> Sub-account -> Ledger -> Label.
    """
    try:
        acc_res = supabase.table("di_accounts").select("*").eq("workbench_id", workbench_id).order("sort_order").execute()
        accounts = acc_res.data or []
        
        lbl_res = supabase.table("di_workbench_labels").select("*").eq("workbench_id", workbench_id).execute()
        labels = lbl_res.data or []
        
        labels_by_ledger = {}
        for l in labels:
            lid = l.get("ledger_account_id")
            if lid not in labels_by_ledger:
                labels_by_ledger[lid] = []
            labels_by_ledger[lid].append(l)

        mapped_list = []
        for a in accounts:
            cat_code = a.get("category_code") or "EXP"
            acc_class = CATEGORY_TO_CLASS.get(cat_code, "Expenses")
            grp_code = a.get("metadata", {}).get("group_code") if isinstance(a.get("metadata"), dict) else "XAD"
            lbl_name = a.get("metadata", {}).get("label_name") if isinstance(a.get("metadata"), dict) else a.get("name")
            
            mapped_list.append({
                "id": a["id"],
                "workbench_id": a["workbench_id"],
                "account_class": acc_class,
                "category_code": cat_code,
                "group_code": grp_code,
                "full_code": a.get("code"),
                "ledger": a.get("name"),
                "label": lbl_name,
                "is_postable": a.get("is_postable", True),
                "is_system": a.get("is_system", False),
                "parent_account_id": a.get("parent_account_id"),
                "labels": [lbl["name"] for lbl in labels_by_ledger.get(a["id"], [])],
                "current_balance": 0.0
            })
            
        return mapped_list
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- AI COA Recommendation Endpoint ---

@router.post("/recommend")
async def recommend_coa(payload: AIRecommendPayload):
    """
    Generates a structured COA recommendation tailored to industry/domain.
    BOUNDARIES ENFORCED:
    1. Maximum recommendation depth = Sub-account / optional Ledger.
    2. AI NEVER RECOMMENDS OR CREATES LABELS.
    3. Output is a reviewable preview array that requires user confirmation.
    """
    try:
        from services.coa_seeder import base_structure, overlays
        
        selected_ind = (payload.industry or "others").lower()
        rec_accounts = []
        
        # Build base template
        for cat_name, cat_info in base_structure.items():
            cat_code = CLASS_TO_CATEGORY.get(cat_name, "EXP")
            acc_class = CATEGORY_TO_CLASS.get(cat_code, "Expenses")
            
            for sub_name, sample_ledgers in cat_info.get("sub_accounts", {}).items():
                grp_code = "XAD"
                for g_code, (s_code, s_name, c_code) in GROUP_SUBACCOUNT_MAP.items():
                    if c_code == cat_code and sub_name.lower() in s_name.lower():
                        grp_code = g_code
                        break
                        
                # Add Sub-account / Ledger recommendation (NO LABELS!)
                if sample_ledgers:
                    for idx, led_name in enumerate(sample_ledgers):
                        rec_accounts.append({
                            "account_class": acc_class,
                            "category_code": cat_code,
                            "group_code": grp_code,
                            "full_code": f"{cat_code[0]}-{grp_code}-{str(idx+1).zfill(2)}",
                            "ledger": led_name,
                            "label": led_name, # Default label matches ledger, no AI operational label creation
                            "is_recommended": True
                        })
                else:
                    rec_accounts.append({
                        "account_class": acc_class,
                        "category_code": cat_code,
                        "group_code": grp_code,
                        "full_code": f"{cat_code[0]}-{grp_code}-01",
                        "ledger": sub_name,
                        "label": sub_name,
                        "is_recommended": True
                    })
                    
        return {
            "status": "preview",
            "workbench_id": payload.workbench_id,
            "industry": payload.industry,
            "domain": payload.domain,
            "count": len(rec_accounts),
            "recommendations": rec_accounts
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- Create User Ledger ---

@router.post("/ledgers")
async def create_user_ledger(payload: CreateLedgerPayload):
    """
    Creates a user-defined Ledger under a valid Sub-account.
    Enforces lineage validation: sub_account_id -> account_id.
    """
    try:
        sub_res = supabase.table("di_accounts").select("*").eq("id", payload.sub_account_id).maybe_single().execute()
        if not sub_res.data:
            raise HTTPException(status_code=400, detail=f"Target Sub-account ID '{payload.sub_account_id}' does not exist.")
            
        sub_acc = sub_res.data
        cat_code = sub_acc["category_code"]
        
        ledger_code = payload.ledger_code or f"L-{str(uuid.uuid4())[:8]}"
        
        new_ledger = supabase.table("di_accounts").insert({
            "workbench_id": payload.workbench_id,
            "parent_account_id": sub_acc["id"],
            "code": ledger_code,
            "name": payload.ledger_name.strip(),
            "category_code": cat_code,
            "normal_balance": sub_acc["normal_balance"],
            "is_postable": True,
            "is_system": False,
            "sort_order": 30,
            "metadata": {
                "description": payload.description,
                "user_created": True
            }
        }).execute()
        
        if not new_ledger.data:
            raise HTTPException(status_code=400, detail="Failed to create User Ledger")
            
        return new_ledger.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- Create User Label ---

@router.post("/labels")
async def create_user_label(payload: CreateLabelPayload):
    """
    Creates a user-defined Label under a valid Ledger.
    Labels are optional operational tags. AI NEVER creates labels.
    """
    try:
        led_res = supabase.table("di_accounts").select("*").eq("id", payload.ledger_account_id).maybe_single().execute()
        if not led_res.data:
            raise HTTPException(status_code=400, detail=f"Target Ledger ID '{payload.ledger_account_id}' does not exist.")
            
        new_label = supabase.table("di_workbench_labels").insert({
            "workbench_id": payload.workbench_id,
            "ledger_account_id": payload.ledger_account_id,
            "name": payload.label_name.strip(),
            "confidence_threshold": 1.0
        }).execute()
        
        if not new_label.data:
            raise HTTPException(status_code=400, detail="Failed to create User Label")
            
        return new_label.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/templates")
async def get_coa_templates():
    try:
        res = supabase.table("di_coa_templates").select("*").execute()
        return res.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
