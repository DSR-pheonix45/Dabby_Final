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
