from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from typing import List, Optional, Dict
from pydantic import BaseModel
from datetime import datetime
from supabase_client import supabase
from auth import get_current_user
from services.ai_service import ai_service

router = APIRouter()

class SnapshotCreatePayload(BaseModel):
    workbench_id: str
    snapshot_name: Optional[str] = None
    snapshot_type: Optional[str] = "manual"  # 'manual', 'auto_monthly', 'imported'
    notes: Optional[str] = None

class SnapshotItemPayload(BaseModel):
    full_code: Optional[str] = None
    ledger_name: str
    account_class: Optional[str] = None
    group_code: Optional[str] = None
    debit_amount: float
    credit_amount: float

@router.post("/create")
async def create_snapshot(payload: SnapshotCreatePayload, user = Depends(get_current_user)):
    """
    Creates a snapshot of the current Trial Balance state for a workbench.
    """
    try:
        # 1. Fetch current workbench accounts
        acc_res = supabase.table("workbench_accounts").select("*").eq("workbench_id", payload.workbench_id).execute()
        accounts = acc_res.data or []

        now_str = datetime.utcnow().strftime("%Y-%m-%d %H:%M")
        name = payload.snapshot_name or f"Trial Balance Snapshot ({now_str})"
        snap_type = payload.snapshot_type or "manual"

        total_debit = 0.0
        total_credit = 0.0
        items = []

        for acc in accounts:
            bal = float(acc.get("current_balance") or 0.0)
            ac_class = (acc.get("account_class") or "Expenses").capitalize()
            
            # Debit Normal: Assets, Expenses
            if ac_class in ["Assets", "Expenses"]:
                d_amt = max(0.0, bal)
                c_amt = max(0.0, -bal)
            else:
                c_amt = max(0.0, bal)
                d_amt = max(0.0, -bal)

            total_debit += d_amt
            total_credit += c_amt

            items.append({
                "workbench_account_id": acc["id"],
                "full_code": acc.get("full_code"),
                "ledger_name": acc.get("ledger") or "Unnamed Ledger",
                "account_class": acc.get("account_class"),
                "group_code": acc.get("group_code"),
                "debit_amount": d_amt,
                "credit_amount": c_amt,
                "net_balance": bal
            })

        is_balanced = round(total_debit, 2) == round(total_credit, 2)

        # 2. Try inserting into trial_balance_snapshots table
        snap_record = None
        try:
            ins = supabase.table("trial_balance_snapshots").insert({
                "workbench_id": payload.workbench_id,
                "snapshot_date": datetime.utcnow().date().isoformat(),
                "snapshot_name": name,
                "snapshot_type": snap_type,
                "total_debit": total_debit,
                "total_credit": total_credit,
                "is_balanced": is_balanced,
                "notes": payload.notes,
                "created_by": user.get("id") if user else None
            }).execute()

            if ins.data:
                snap_record = ins.data[0]
                snap_id = snap_record["id"]

                # Insert items
                for itm in items:
                    itm["snapshot_id"] = snap_id
                supabase.table("trial_balance_snapshot_items").insert(items).execute()
        except Exception as db_err:
            print(f"[TB_SNAPSHOTS] DB table write fallback: {db_err}")
            # Fallback storage in di_documents if DB table not yet created
            fallback_doc = {
                "workbench_id": payload.workbench_id,
                "document_type": f"tb_snapshot_{snap_type}",
                "original_filename": f"{name}.json",
                "storage_path": f"snapshots/{payload.workbench_id}/{now_str}.json",
                "file_size_bytes": 1024,
                "mime_type": "application/json",
                "status": "COMPLETED",
                "extracted_text": f"Snapshot: {name} | Debits: {total_debit} | Credits: {total_credit}"
            }
            res_fallback = supabase.table("di_documents").insert(fallback_doc).execute()
            if res_fallback.data:
                snap_record = {
                    "id": res_fallback.data[0]["id"],
                    "workbench_id": payload.workbench_id,
                    "snapshot_date": datetime.utcnow().date().isoformat(),
                    "snapshot_name": name,
                    "snapshot_type": snap_type,
                    "total_debit": total_debit,
                    "total_credit": total_credit,
                    "is_balanced": is_balanced,
                    "items": items
                }

        return {
            "status": "success",
            "snapshot": snap_record or {
                "workbench_id": payload.workbench_id,
                "snapshot_name": name,
                "snapshot_type": snap_type,
                "total_debit": total_debit,
                "total_credit": total_credit,
                "is_balanced": is_balanced,
                "items_count": len(items)
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/workbench/{workbench_id}")
async def list_snapshots(workbench_id: str, user = Depends(get_current_user)):
    """
    Lists all historical Trial Balance snapshots for a workbench.
    """
    try:
        snapshots = []
        try:
            res = supabase.table("trial_balance_snapshots").select("*").eq("workbench_id", workbench_id).order("created_at", desc=True).execute()
            snapshots = res.data or []
        except Exception:
            # Fallback from di_documents
            res = supabase.table("di_documents").select("*").eq("workbench_id", workbench_id).like("document_type", "tb_snapshot%").order("created_at", desc=True).execute()
            docs = res.data or []
            for d in docs:
                snapshots.append({
                    "id": d["id"],
                    "workbench_id": workbench_id,
                    "snapshot_date": d.get("created_at", "")[:10],
                    "snapshot_name": d.get("original_filename", "").replace(".json", ""),
                    "snapshot_type": d.get("document_type", "").replace("tb_snapshot_", ""),
                    "total_debit": 0.0,
                    "total_credit": 0.0,
                    "is_balanced": True
                })
        return snapshots
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{snapshot_id}")
async def get_snapshot_detail(snapshot_id: str, user = Depends(get_current_user)):
    """
    Fetches snapshot metadata and items.
    """
    try:
        snap = None
        items = []
        try:
            res_snap = supabase.table("trial_balance_snapshots").select("*").eq("id", snapshot_id).single().execute()
            snap = res_snap.data
            if snap:
                res_items = supabase.table("trial_balance_snapshot_items").select("*").eq("snapshot_id", snapshot_id).execute()
                items = res_items.data or []
        except Exception:
            pass

        return {"snapshot": snap, "items": items}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/import-excel")
async def import_trial_balance_excel(
    workbench_id: str = Form(...),
    snapshot_name: Optional[str] = Form(None),
    file: UploadFile = File(...),
    user = Depends(get_current_user)
):
    """
    Imports an exported Trial Balance spreadsheet from Tally or Zoho Books as a snapshot.
    """
    try:
        content = await file.read()
        extracted_items = await ai_service.scan_trial_balance_import(content, file.content_type, file.filename)

        total_debit = sum(float(i.get("debit_amount") or 0.0) for i in extracted_items)
        total_credit = sum(float(i.get("credit_amount") or 0.0) for i in extracted_items)
        is_balanced = round(total_debit, 2) == round(total_credit, 2)

        name = snapshot_name or f"Imported TB: {file.filename}"
        now_str = datetime.utcnow().strftime("%Y-%m-%d %H:%M")

        snap_record = None
        try:
            ins = supabase.table("trial_balance_snapshots").insert({
                "workbench_id": workbench_id,
                "snapshot_date": datetime.utcnow().date().isoformat(),
                "snapshot_name": name,
                "snapshot_type": "imported",
                "total_debit": total_debit,
                "total_credit": total_credit,
                "is_balanced": is_balanced,
                "notes": f"Imported from {file.filename}",
                "created_by": user.get("id") if user else None
            }).execute()

            if ins.data:
                snap_record = ins.data[0]
                snap_id = snap_record["id"]
                db_items = []
                for itm in extracted_items:
                    db_items.append({
                        "snapshot_id": snap_id,
                        "full_code": itm.get("full_code"),
                        "ledger_name": itm.get("ledger_name") or "Extracted Account",
                        "account_class": itm.get("account_class"),
                        "group_code": itm.get("group_code"),
                        "debit_amount": float(itm.get("debit_amount") or 0.0),
                        "credit_amount": float(itm.get("credit_amount") or 0.0),
                        "net_balance": float(itm.get("net_balance") or 0.0)
                    })
                supabase.table("trial_balance_snapshot_items").insert(db_items).execute()
        except Exception as e:
            print(f"[IMPORT_TB] Fallback write: {e}")

        return {
            "status": "success",
            "snapshot_name": name,
            "total_debit": total_debit,
            "total_credit": total_credit,
            "is_balanced": is_balanced,
            "extracted_items": extracted_items
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/auto-monthly")
async def trigger_auto_monthly_snapshot(workbench_id: str, user = Depends(get_current_user)):
    """
    Triggers an automated end-of-month snapshot.
    """
    now_str = datetime.utcnow().strftime("%B %Y")
    name = f"Auto Monthly Closing ({now_str})"
    payload = SnapshotCreatePayload(
        workbench_id=workbench_id,
        snapshot_name=name,
        snapshot_type="auto_monthly",
        notes="Automated end-of-month Trial Balance snapshot"
    )
    return await create_snapshot(payload, user=user)
