from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from typing import List, Optional
from pydantic import BaseModel
from supabase_client import supabase
from auth import get_current_user
from services.ai_service import ai_service
import uuid

router = APIRouter()

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

class AccountCreate(BaseModel):
    workbench_id: str
    account_class: str
    group_code: str
    full_code: str
    ledger: str
    label: Optional[str] = None
    current_balance: Optional[float] = 0.0

class AccountUpdate(BaseModel):
    account_class: Optional[str] = None
    group_code: Optional[str] = None
    full_code: Optional[str] = None
    ledger: Optional[str] = None
    label: Optional[str] = None
    current_balance: Optional[float] = None

class AccountSyncItem(BaseModel):
    id: Optional[str] = None
    account_class: str
    group_code: str
    full_code: str
    ledger: str
    label: Optional[str] = None
    is_new: Optional[bool] = False

class AccountSyncPayload(BaseModel):
    workbench_id: str
    accounts: List[AccountSyncItem]
    deleted_ids: Optional[List[str]] = []

@router.get("/{workbench_id}")
async def get_accounts(workbench_id: str, user = Depends(get_current_user)):
    """
    Reads canonical accounts from di_accounts and formats for Settings UI.
    """
    try:
        res = supabase.table("di_accounts").select("*").eq("workbench_id", workbench_id).order("sort_order").execute()
        accounts = res.data or []
        
        lbl_res = supabase.table("di_workbench_labels").select("*").eq("workbench_id", workbench_id).execute()
        labels_by_ledger = {}
        for l in (lbl_res.data or []):
            lid = l.get("ledger_account_id")
            if lid not in labels_by_ledger:
                labels_by_ledger[lid] = []
            labels_by_ledger[lid].append(l.get("name"))

        rows = []
        for a in accounts:
            if not a.get("is_postable"):
                continue
            cat_code = a.get("category_code") or "EXP"
            acc_class = CATEGORY_TO_CLASS.get(cat_code, "Expenses")
            grp_code = a.get("metadata", {}).get("group_code") if isinstance(a.get("metadata"), dict) else "XAD"
            lbl_text = a.get("metadata", {}).get("label_name") if isinstance(a.get("metadata"), dict) else a.get("name")
            
            rows.append({
                "id": a["id"],
                "workbench_id": a["workbench_id"],
                "account_class": acc_class,
                "group_code": grp_code,
                "full_code": a.get("code"),
                "ledger": a.get("name"),
                "label": lbl_text,
                "current_balance": 0.0
            })
        return rows
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/sync")
async def sync_accounts(payload: AccountSyncPayload, user = Depends(get_current_user)):
    """
    Syncs Settings COA changes directly into canonical di_accounts.
    """
    try:
        if payload.deleted_ids:
            valid_uuids = [d_id for d_id in payload.deleted_ids if len(d_id) == 36 and "-" in d_id]
            if valid_uuids:
                supabase.table("di_accounts").delete().in_("id", valid_uuids).execute()
        
        saved_rows = []
        for acc in payload.accounts:
            cat_code = CLASS_TO_CATEGORY.get(acc.account_class, "EXP")
            norm_bal = "credit" if cat_code in ["LIA", "EQU", "REV"] else "debit"
            
            acc_data = {
                "workbench_id": payload.workbench_id,
                "code": acc.full_code,
                "name": acc.ledger.strip(),
                "category_code": cat_code,
                "normal_balance": norm_bal,
                "is_postable": True,
                "is_system": False,
                "sort_order": 30,
                "metadata": {
                    "group_code": acc.group_code,
                    "label_name": acc.label or acc.ledger
                }
            }
            
            if acc.is_new or not acc.id or not (len(acc.id) == 36 and "-" in acc.id):
                res = supabase.table("di_accounts").insert(acc_data).execute()
                if res.data:
                    saved_rows.append(res.data[0])
            else:
                res = supabase.table("di_accounts").update(acc_data).eq("id", acc.id).execute()
                if res.data:
                    saved_rows.append(res.data[0])

        return {"status": "success", "accounts": saved_rows}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/ai-import")
async def ai_import(
    workbench_id: str = Form(...),
    file: UploadFile = File(...),
    user = Depends(get_current_user)
):
    try:
        content = await file.read()
        accounts = await ai_service.scan_company_master_import(content, file.content_type, file.filename)
        return {"accounts": accounts}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/workbench/{workbench_id}")
async def clear_all_accounts(workbench_id: str, user = Depends(get_current_user)):
    try:
        res = supabase.table("di_accounts").delete().eq("workbench_id", workbench_id).eq("is_system", False).execute()
        return {"status": "success", "deleted_count": len(res.data) if res.data else 0}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
