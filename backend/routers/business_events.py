import os
from typing import Dict, List, Optional
from fastapi import APIRouter, HTTPException, Depends
from supabase_client import supabase
from auth import verify_user_access
from services.business_event_registry import business_event_registry
from services.settlement_engine import settlement_engine
from services.accounting_compiler import accounting_compiler

router = APIRouter()

@router.get("/user/{user_id}", dependencies=[Depends(verify_user_access)])
async def list_business_events(
    user_id: str,
    status: Optional[str] = None,
    event_type: Optional[str] = None,
    limit: int = 50,
    offset: int = 0
):
    try:
        return await business_event_registry.list_for_workbench(user_id, status, event_type, limit, offset)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{event_id}", dependencies=[Depends(verify_user_access)])
async def get_business_event(event_id: str):
    try:
        event = await business_event_registry.get_event(event_id)
        if not event:
            raise HTTPException(status_code=404, detail="Business Event not found")
        return event
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{event_id}/settlements", dependencies=[Depends(verify_user_access)])
async def get_event_settlements(event_id: str):
    try:
        return await settlement_engine.get_settlements_for_event(event_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{event_id}/compile", dependencies=[Depends(verify_user_access)])
async def compile_business_event(event_id: str, user=Depends(verify_user_access)):
    """Trigger Accounting Compiler for this Business Event."""
    try:
        user_id = user.get("id") if isinstance(user, dict) else None
        result = accounting_compiler.compile_from_business_event(event_id, executed_by=user_id)
        return {"message": "Business Event compiled to Ledger", "result": result}
    except NotImplementedError as nie:
        raise HTTPException(status_code=400, detail=str(nie))
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{event_id}/cancel", dependencies=[Depends(verify_user_access)])
async def cancel_business_event(event_id: str, payload: dict = {}):
    try:
        reason = payload.get("reason")
        new_event = await business_event_registry.cancel_event(event_id, reason)
        return {"message": "Business Event cancelled", "event": new_event}
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
