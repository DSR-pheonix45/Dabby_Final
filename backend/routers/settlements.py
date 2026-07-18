import os
from typing import Dict, List, Optional
from fastapi import APIRouter, HTTPException, Depends
from supabase_client import supabase
from auth import verify_user_access
from services.settlement_engine import settlement_engine

router = APIRouter()

@router.get("/user/{user_id}", dependencies=[Depends(verify_user_access)])
async def list_settlements(
    user_id: str,
    status: Optional[str] = None,
    limit: int = 50,
    offset: int = 0
):
    try:
        q = (
            supabase.table("event_settlements")
                    .select("*, event_a:event_id_a(*), event_b:event_id_b(*)")
                    .eq("user_id", user_id)
                    .order("created_at", desc=True)
                    .limit(limit)
                    .offset(offset)
        )
        if status:
            q = q.eq("settlement_status", status)
        res = q.execute()
        return res.data or []
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/recalculate/{user_id}", dependencies=[Depends(verify_user_access)])
async def recalculate_settlements(user_id: str):
    """Re-run settlement engine for all OPEN events."""
    try:
        result = await settlement_engine.recalculate_user_ledger(user_id)
        return {"message": "Settlement recalculation complete", "result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/manual", dependencies=[Depends(verify_user_access)])
async def add_manual_settlement(payload: dict, user=Depends(verify_user_access)):
    """Create a manual cash payment event and link it to an invoice."""
    try:
        from services.business_event_registry import business_event_registry
        from services.ledger_compiler import ledger_compiler
        
        user_id = user.get("id") if isinstance(user, dict) else None
        workbench_id = payload.get("workbench_id")
        event_id = payload.get("event_id")
        invoice_type = payload.get("event_type")
        amount = float(payload.get("amount", 0))
        date_str = payload.get("date")
        notes = payload.get("notes")

        if not event_id:
            raise ValueError("Missing event_id (invoice reference)")

        # 1. Fetch invoice event
        invoice = await business_event_registry.get_event(event_id)
        if not invoice:
            raise ValueError(f"Invoice event {event_id} not found")

        counterparty = invoice.get("counterparty")
        
        # 2. Determine payment event type
        if invoice_type == "CUSTOMER_BILLED":
            payment_type = "CUSTOMER_PAYMENT_RECEIVED"
        elif invoice_type == "VENDOR_BILLED":
            payment_type = "VENDOR_PAYMENT_MADE"
        else:
            payment_type = "UNCLASSIFIED"

        # 3. Create payment event
        payment_row = {
            "user_id": user_id,
            "event_type": payment_type,
            "event_date": date_str,
            "counterparty": counterparty,
            "amount": amount,
            "currency": "INR",
            "event_status": "OPEN",
            "event_metadata": {"is_manual_settlement": True, "notes": notes},
            "is_superseded": False,
        }
        event_result = supabase.table("business_events").insert(payment_row).execute()
        if not event_result.data:
            raise RuntimeError("Failed to insert manual payment event")
            
        payment_event = event_result.data[0]
        
        # 4. Link payment to invoice manually
        await settlement_engine._create_settlement(
            event_a=invoice,
            event_b=payment_event,
            settlement_key=None,
            method="manual_cash",
            confidence=1.0
        )
        
        # 5. Compile the payment to the ledger
        ledger_compiler.compile_event(payment_event["id"], executed_by=user_id)
        
        return {"message": "Manual settlement added successfully", "event": payment_event}
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
