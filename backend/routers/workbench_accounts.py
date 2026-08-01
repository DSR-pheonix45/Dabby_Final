from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from typing import List, Optional
from pydantic import BaseModel
from supabase_client import supabase
from auth import get_current_user
from services.ai_service import ai_service

router = APIRouter()

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

@router.post("")
async def create_account(account: AccountCreate, user = Depends(get_current_user)):
    try:
        res = supabase.table("workbench_accounts").insert(account.dict()).execute()
        if not res.data:
            raise HTTPException(status_code=400, detail="Failed to create account")
        return res.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/sync")
async def sync_accounts(payload: AccountSyncPayload, user = Depends(get_current_user)):
    try:
        # 1. Process deletions first to free up full_code constraints
        if payload.deleted_ids:
            # Filter out non-UUID temporary IDs (e.g., 'row-123', 'imported-456')
            valid_uuids = [d_id for d_id in payload.deleted_ids if len(d_id) == 36 and "-" in d_id]
            if valid_uuids:
                supabase.table("workbench_accounts").delete().in_("id", valid_uuids).execute()
        
        # 2. If no accounts left in payload, we are done
        if not payload.accounts:
            return {"status": "success", "accounts": []}

        # 3. Process inserts and updates
        saved_accounts = []
        for acc in payload.accounts:
            acc_data = {
                "workbench_id": payload.workbench_id,
                "account_class": acc.account_class,
                "group_code": acc.group_code,
                "full_code": acc.full_code,
                "ledger": acc.ledger,
                "label": acc.label or ""
            }
            if acc.is_new or not acc.id or not (len(acc.id) == 36 and "-" in acc.id):
                res = supabase.table("workbench_accounts").insert(acc_data).execute()
                if res.data:
                    saved_accounts.append(res.data[0])
            else:
                res = supabase.table("workbench_accounts").update(acc_data).eq("id", acc.id).execute()
                if res.data:
                    saved_accounts.append(res.data[0])

        return {"status": "success", "accounts": saved_accounts}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/workbench/{workbench_id}")
async def clear_all_accounts(workbench_id: str, user = Depends(get_current_user)):
    try:
        res = supabase.table("workbench_accounts").delete().eq("workbench_id", workbench_id).execute()
        return {"status": "success", "deleted_count": len(res.data) if res.data else 0}
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

@router.get("/{workbench_id}")
async def get_accounts(workbench_id: str, user = Depends(get_current_user)):
    try:
        res = supabase.table("workbench_accounts").select("*").eq("workbench_id", workbench_id).order("full_code").execute()
        return res.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{account_id}")
async def update_account(account_id: str, payload: AccountUpdate, user = Depends(get_current_user)):
    try:
        res = supabase.table("workbench_accounts").update(payload.dict(exclude_unset=True)).eq("id", account_id).execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="Account not found")
        return res.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{account_id}")
async def delete_account(account_id: str, user = Depends(get_current_user)):
    try:
        res = supabase.table("workbench_accounts").delete().eq("id", account_id).execute()
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class VoucherEntryItem(BaseModel):
    account_id: Optional[str] = None
    full_code: Optional[str] = None
    ledger: Optional[str] = None
    direction: str  # 'debit' or 'credit'
    amount: float

class VoucherPostPayload(BaseModel):
    workbench_id: str
    voucher_type: Optional[str] = "journal"
    voucher_number: Optional[str] = None
    description: Optional[str] = None
    entries: List[VoucherEntryItem]

@router.post("/post-voucher")
async def post_voucher(payload: VoucherPostPayload, user = Depends(get_current_user)):
    try:
        if not payload.entries:
            raise HTTPException(status_code=400, detail="Voucher entries cannot be empty")
        
        # 1. Verify Double-Entry Balance: sum(debit) == sum(credit)
        total_debit = sum(e.amount for e in payload.entries if e.direction.lower() == "debit")
        total_credit = sum(e.amount for e in payload.entries if e.direction.lower() == "credit")

        if round(total_debit, 2) != round(total_credit, 2):
            raise HTTPException(
                status_code=400,
                detail=f"Unbalanced voucher: Total Debits (₹{total_debit:.2f}) must equal Total Credits (₹{total_credit:.2f})"
            )

        # 2. Fetch all workbench accounts for mapping
        acc_res = supabase.table("workbench_accounts").select("*").eq("workbench_id", payload.workbench_id).execute()
        accounts = acc_res.data or []
        acc_by_id = {a["id"]: a for a in accounts}
        acc_by_code = {a["full_code"]: a for a in accounts}
        acc_by_ledger = {a["ledger"].strip().lower(): a for a in accounts}

        updated_accounts = []
        for entry in payload.entries:
            target_acc = None
            if entry.account_id and entry.account_id in acc_by_id:
                target_acc = acc_by_id[entry.account_id]
            elif entry.full_code and entry.full_code in acc_by_code:
                target_acc = acc_by_code[entry.full_code]
            elif entry.ledger and entry.ledger.strip().lower() in acc_by_ledger:
                target_acc = acc_by_ledger[entry.ledger.strip().lower()]
            
            if target_acc:
                curr_bal = float(target_acc.get("current_balance") or 0.0)
                ac_class = (target_acc.get("account_class") or "Expenses").capitalize()
                
                # Normal Balances:
                # Debit Normal: Assets, Expenses
                # Credit Normal: Liabilities, Equity, Revenue
                if ac_class in ["Assets", "Expenses"]:
                    new_bal = curr_bal + entry.amount if entry.direction.lower() == "debit" else curr_bal - entry.amount
                else:
                    new_bal = curr_bal + entry.amount if entry.direction.lower() == "credit" else curr_bal - entry.amount

                upd = supabase.table("workbench_accounts").update({"current_balance": new_bal}).eq("id", target_acc["id"]).execute()
                if upd.data:
                    updated_accounts.append(upd.data[0])

        return {
            "status": "success",
            "total_debit": total_debit,
            "total_credit": total_credit,
            "updated_accounts_count": len(updated_accounts)
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/kpi-summary/{workbench_id}")
async def get_kpi_summary(workbench_id: str, user = Depends(get_current_user)):
    try:
        acc_res = supabase.table("workbench_accounts").select("*").eq("workbench_id", workbench_id).execute()
        accounts = acc_res.data or []

        kpis = {
            "Asset": {"net": 0.0, "gross": 0.0, "count": 0},
            "Liability": {"net": 0.0, "gross": 0.0, "count": 0},
            "Equity": {"net": 0.0, "gross": 0.0, "count": 0},
            "Revenue": {"net": 0.0, "gross": 0.0, "count": 0},
            "Expense": {"net": 0.0, "gross": 0.0, "count": 0},
        }

        for acc in accounts:
            raw_cls = (acc.get("account_class") or "Expense").strip().capitalize()
            # Singularize
            if raw_cls.endswith("s"):
                cls_key = raw_cls[:-1]
            else:
                cls_key = raw_cls

            if cls_key not in kpis:
                cls_key = "Expense"

            bal = float(acc.get("current_balance") or 0.0)
            kpis[cls_key]["net"] += bal
            kpis[cls_key]["gross"] += abs(bal)
            kpis[cls_key]["count"] += 1

        return kpis
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

