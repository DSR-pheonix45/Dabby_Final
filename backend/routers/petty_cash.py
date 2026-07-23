import os
from typing import Dict, List, Optional
from fastapi import APIRouter, HTTPException, Depends
from supabase_client import supabase
from auth import verify_user_access

router = APIRouter()


@router.get("/balance/{workbench_id}", dependencies=[Depends(verify_user_access)])
async def get_petty_cash_balance(workbench_id: str):
    """Retrieve current Petty Cash balance for a workbench."""
    try:
        wb_res = supabase.table("workbenches").select("petty_cash_balance, currency").eq("id", workbench_id).execute()
        if wb_res.data:
            bal = wb_res.data[0].get("petty_cash_balance") or 0.0
            curr = wb_res.data[0].get("currency") or "INR"
            return {"workbench_id": workbench_id, "balance": bal, "currency": curr}
        return {"workbench_id": workbench_id, "balance": 0.0, "currency": "INR"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/topup", dependencies=[Depends(verify_user_access)])
async def request_topup(payload: dict, user=Depends(verify_user_access)):
    """Request a Petty Cash top-up (requires Owner / Co-Owner approval)."""
    try:
        user_id = user.get("id") if isinstance(user, dict) else None
        workbench_id = payload.get("workbench_id")
        amount = float(payload.get("amount", 0))
        reason = payload.get("reason", "Petty cash pool top-up")

        if amount <= 0:
            raise HTTPException(status_code=400, detail="Amount must be positive")

        topup_row = {
            "user_id": user_id,
            "workbench_id": workbench_id,
            "event_type": "PETTY_CASH_TOPUP",
            "amount": amount,
            "reason": reason,
            "status": "PENDING_APPROVAL",
        }
        res = supabase.table("trade_drafts").insert(topup_row).execute()
        return {"message": "Top-up request submitted for Owner approval", "request": res.data[0] if res.data else topup_row}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/approve/{request_id}", dependencies=[Depends(verify_user_access)])
async def approve_topup(request_id: str, user=Depends(verify_user_access)):
    """Approve a Petty Cash top-up (Owner/Co-Owner action)."""
    try:
        user_id = user.get("id") if isinstance(user, dict) else None

        # Fetch request
        req = supabase.table("trade_drafts").select("*").eq("id", request_id).single().execute()
        if not req.data:
            raise HTTPException(status_code=404, detail="Top-up request not found")

        draft = req.data
        if draft.get("status") == "APPROVED":
            return {"message": "Top-up already approved", "request": draft}

        amount = float(draft.get("amount") or 0)
        workbench_id = draft.get("workbench_id")

        # Update draft status
        supabase.table("trade_drafts").update({"status": "APPROVED", "reviewed_by": user_id}).eq("id", request_id).execute()

        # Update workbench balance
        if workbench_id:
            wb_res = supabase.table("workbenches").select("petty_cash_balance").eq("id", workbench_id).execute()
            current_bal = (wb_res.data[0].get("petty_cash_balance") or 0.0) if wb_res.data else 0.0
            new_bal = current_bal + amount
            supabase.table("workbenches").update({"petty_cash_balance": new_bal}).eq("id", workbench_id).execute()

        return {"message": "Petty Cash top-up approved successfully", "added_amount": amount}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/deduct", dependencies=[Depends(verify_user_access)])
async def deduct_petty_cash(payload: dict, user=Depends(verify_user_access)):
    """Deduct an OPEX expense directly from Petty Cash bucket (Party Exemption)."""
    try:
        workbench_id = payload.get("workbench_id")
        amount = float(payload.get("amount", 0))
        category = payload.get("category", "Travel Allowance")

        if amount <= 0:
            raise HTTPException(status_code=400, detail="Amount must be positive")

        if workbench_id:
            wb_res = supabase.table("workbenches").select("petty_cash_balance").eq("id", workbench_id).execute()
            current_bal = (wb_res.data[0].get("petty_cash_balance") or 0.0) if wb_res.data else 0.0
            if current_bal < amount:
                raise HTTPException(status_code=400, detail=f"Insufficient Petty Cash balance (Available: {current_bal})")

            new_bal = current_bal - amount
            supabase.table("workbenches").update({"petty_cash_balance": new_bal}).eq("id", workbench_id).execute()

        return {"message": "Expense deducted from Petty Cash bucket", "deducted": amount, "category": category}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
