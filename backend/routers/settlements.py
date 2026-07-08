import os
from typing import Dict, List, Optional
from fastapi import APIRouter, HTTPException, Depends
from supabase_client import supabase
from auth import require_permission, require_membership, P
from services.settlement_engine import settlement_engine

router = APIRouter()

@router.get("/workbench/{workbench_id}", dependencies=[Depends(require_membership())])
async def list_settlements(
    workbench_id: str,
    status: Optional[str] = None,
    limit: int = 50,
    offset: int = 0
):
    try:
        q = (
            supabase.table("event_settlements")
                    .select("*, event_a:event_id_a(*), event_b:event_id_b(*)")
                    .eq("workbench_id", workbench_id)
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

@router.post("/recalculate/{workbench_id}", dependencies=[Depends(require_permission(P.EXECUTE_TRADE))])
async def recalculate_settlements(workbench_id: str):
    """Re-run settlement engine for all OPEN events."""
    try:
        result = await settlement_engine.recalculate_workbench(workbench_id)
        return {"message": "Settlement recalculation complete", "result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
