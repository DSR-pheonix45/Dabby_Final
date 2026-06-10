"""
Records Router — replaces Supabase Edge Functions:
  - create-record
  - push-adjustment
  - confirm-record
  - run-reconciliation
  - get-intelligence
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import Optional, Dict, Any
from pydantic import BaseModel
from datetime import date, datetime
from supabase_client import supabase
from .auth_utils import require_membership, check_role_allowed, get_user_id_from_header

router = APIRouter()


# --- Pydantic Models ---

class RecordCreate(BaseModel):
    workbench_id: str
    record_type: str  # transaction, compliance, budget, party
    summary: str
    metadata: Optional[Dict[str, Any]] = None


class AdjustmentCreate(BaseModel):
    workbench_id: str
    original_record_id: str
    adjustment_type: str
    reason: str
    metadata: Optional[Dict[str, Any]] = None


class RecordConfirm(BaseModel):
    record_id: str


class ReconciliationRun(BaseModel):
    workbench_id: str


# --- Endpoints ---

@router.post("/")
async def create_record(payload: RecordCreate, x_user_id: str = Depends(get_user_id_from_header)):
    """
    Creates a manual record (transaction, compliance, budget, or party).
    Replaces the 'create-record' Edge Function.
    """
    try:
        if not x_user_id:
            raise HTTPException(status_code=401, detail="Not authenticated")

        member = await require_membership(payload.workbench_id, x_user_id)

        record_data = {
            "workbench_id": payload.workbench_id,
            "record_type": payload.record_type,
            "summary": payload.summary,
            "metadata": payload.metadata or {},
            "created_by": x_user_id,
            "status": "draft",
        }

        # Insert into the records table
        res = supabase.table("records").insert(record_data).execute()

        if not res.data:
            raise HTTPException(status_code=500, detail="Failed to create record")

        return res.data[0]

    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] create_record failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/adjustment")
async def push_adjustment(payload: AdjustmentCreate, x_user_id: str = Depends(get_user_id_from_header)):
    """
    Pushes a financial adjustment against an existing record.
    Replaces the 'push-adjustment' Edge Function.
    """
    try:
        if not x_user_id:
            raise HTTPException(status_code=401, detail="Not authenticated")

        member = await require_membership(payload.workbench_id, x_user_id)

        # Verify the original record exists
        original = supabase.table("records") \
            .select("id, workbench_id, status") \
            .eq("id", payload.original_record_id) \
            .maybe_single() \
            .execute()

        if not original.data:
            raise HTTPException(status_code=404, detail="Original record not found")

        adjustment_data = {
            "workbench_id": payload.workbench_id,
            "record_type": "adjustment",
            "summary": payload.reason,
            "metadata": {
                **(payload.metadata or {}),
                "original_record_id": payload.original_record_id,
                "adjustment_type": payload.adjustment_type,
            },
            "created_by": x_user_id,
            "status": "draft",
        }

        res = supabase.table("records").insert(adjustment_data).execute()

        if not res.data:
            raise HTTPException(status_code=500, detail="Failed to create adjustment")

        return res.data[0]

    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] push_adjustment failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{record_id}/confirm")
async def confirm_record(record_id: str, x_user_id: str = Depends(get_user_id_from_header)):
    """
    Confirms a record and creates corresponding ledger entries.
    Replaces the 'confirm-record' Edge Function.
    """
    try:
        if not x_user_id:
            raise HTTPException(status_code=401, detail="Not authenticated")

        # Fetch the record
        record_res = supabase.table("records") \
            .select("*") \
            .eq("id", record_id) \
            .maybe_single() \
            .execute()

        if not record_res.data:
            raise HTTPException(status_code=404, detail="Record not found")

        record = record_res.data
        member = await require_membership(record["workbench_id"], x_user_id)
        await check_role_allowed(member, ["owner", "admin"])

        # Mark the record as confirmed
        update_res = supabase.table("records") \
            .update({"status": "confirmed", "confirmed_by": x_user_id}) \
            .eq("id", record_id) \
            .execute()

        if not update_res.data:
            raise HTTPException(status_code=500, detail="Failed to confirm record")

        # If the record has metadata with ledger entry info, create entries
        metadata = record.get("metadata", {}) or {}
        if metadata.get("from_label_id") and metadata.get("to_label_id") and metadata.get("amount"):
            # Create a transaction header
            tx_data = {
                "workbench_id": record["workbench_id"],
                "description": record.get("summary", "Confirmed record"),
                "transaction_date": str(date.today()),
                "created_by": x_user_id,
            }
            tx_res = supabase.table("transactions").insert(tx_data).execute()

            if tx_res.data:
                transaction_id = tx_res.data[0]["id"]
                amount = float(metadata["amount"])
                entries = [
                    {
                        "transaction_id": transaction_id,
                        "label_id": metadata["to_label_id"],
                        "amount": amount,
                    },
                    {
                        "transaction_id": transaction_id,
                        "label_id": metadata["from_label_id"],
                        "amount": -amount,
                    },
                ]
                supabase.table("transaction_entries").insert(entries).execute()

        return update_res.data[0]

    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] confirm_record failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/reconcile/{workbench_id}")
async def run_reconciliation(workbench_id: str, x_user_id: str = Depends(get_user_id_from_header)):
    """
    Runs the reconciliation engine for a workbench.
    Replaces the 'run-reconciliation' Edge Function.
    
    Compares bank statement entries against recorded transactions
    and flags unmatched items.
    """
    try:
        if not x_user_id:
            raise HTTPException(status_code=401, detail="Not authenticated")

        member = await require_membership(workbench_id, x_user_id)
        await check_role_allowed(member, ["owner", "admin"])

        # Fetch all transactions for the workbench
        tx_res = supabase.table("transactions") \
            .select("*, transaction_entries(*)") \
            .eq("workbench_id", workbench_id) \
            .execute()

        transactions = tx_res.data or []

        # Fetch bank statement entries if the table exists
        bank_entries = []
        try:
            bank_res = supabase.table("bank_statements") \
                .select("*") \
                .eq("workbench_id", workbench_id) \
                .eq("is_reconciled", False) \
                .execute()
            bank_entries = bank_res.data or []
        except Exception:
            # bank_statements table may not exist yet
            pass

        # Simple reconciliation: match by amount and date
        matched = []
        unmatched_bank = list(bank_entries)
        unmatched_transactions = []

        for tx in transactions:
            tx_amount = 0
            for entry in tx.get("transaction_entries", []):
                if entry["amount"] > 0:
                    tx_amount = entry["amount"]

            found_match = False
            for i, bank_entry in enumerate(unmatched_bank):
                if (abs(float(bank_entry.get("amount", 0)) - tx_amount) < 0.01 and
                        bank_entry.get("date") == tx.get("transaction_date")):
                    matched.append({
                        "transaction_id": tx["id"],
                        "bank_entry_id": bank_entry["id"],
                        "amount": tx_amount,
                    })
                    unmatched_bank.pop(i)
                    found_match = True
                    break

            if not found_match and tx_amount > 0:
                unmatched_transactions.append({
                    "transaction_id": tx["id"],
                    "amount": tx_amount,
                    "date": tx.get("transaction_date"),
                    "description": tx.get("description"),
                })

        # Mark matched bank entries as reconciled
        for match in matched:
            try:
                supabase.table("bank_statements") \
                    .update({"is_reconciled": True, "matched_transaction_id": match["transaction_id"]}) \
                    .eq("id", match["bank_entry_id"]) \
                    .execute()
            except Exception:
                pass

        return {
            "matched_count": len(matched),
            "unmatched_bank_count": len(unmatched_bank),
            "unmatched_transaction_count": len(unmatched_transactions),
            "matched": matched,
            "unmatched_bank": unmatched_bank,
            "unmatched_transactions": unmatched_transactions,
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] run_reconciliation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/intelligence/{workbench_id}")
async def get_intelligence(workbench_id: str, x_user_id: str = Depends(get_user_id_from_header)):
    """
    Fetches health/intelligence metrics for a workbench.
    Replaces the 'get-intelligence' Edge Function.
    
    Returns summary stats: transaction count, total volume,
    label count, recent activity, and reconciliation status.
    """
    try:
        if not x_user_id:
            raise HTTPException(status_code=401, detail="Not authenticated")

        await require_membership(workbench_id, x_user_id)

        # Transaction stats
        tx_res = supabase.table("transactions") \
            .select("id, transaction_date, description") \
            .eq("workbench_id", workbench_id) \
            .execute()
        transactions = tx_res.data or []

        # Entry volume
        total_volume = 0
        if transactions:
            tx_ids = [t["id"] for t in transactions]
            # Fetch positive entries to calculate total volume
            entries_res = supabase.table("transaction_entries") \
                .select("amount") \
                .in_("transaction_id", tx_ids) \
                .gt("amount", 0) \
                .execute()
            for entry in (entries_res.data or []):
                total_volume += float(entry["amount"])

        # Label count
        labels_res = supabase.table("labels") \
            .select("id") \
            .eq("workbench_id", workbench_id) \
            .eq("is_deleted", False) \
            .execute()
        label_count = len(labels_res.data or [])

        # Recent transactions (last 5)
        recent_tx = sorted(transactions, key=lambda t: t.get("transaction_date", ""), reverse=True)[:5]

        # Invoice stats
        invoice_count = 0
        overdue_invoices = 0
        try:
            inv_res = supabase.table("invoices") \
                .select("id, status, due_date") \
                .eq("workbench_id", workbench_id) \
                .execute()
            invoices = inv_res.data or []
            invoice_count = len(invoices)
            today_str = str(date.today())
            overdue_invoices = len([
                i for i in invoices
                if i.get("status") != "paid" and i.get("due_date", "9999-12-31") < today_str
            ])
        except Exception:
            pass

        # Bill stats
        bill_count = 0
        try:
            bill_res = supabase.table("bills") \
                .select("id") \
                .eq("workbench_id", workbench_id) \
                .execute()
            bill_count = len(bill_res.data or [])
        except Exception:
            pass

        return {
            "transaction_count": len(transactions),
            "total_volume": total_volume,
            "label_count": label_count,
            "invoice_count": invoice_count,
            "overdue_invoices": overdue_invoices,
            "bill_count": bill_count,
            "recent_transactions": recent_tx,
            "health": "healthy" if len(transactions) > 0 else "empty",
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] get_intelligence failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
