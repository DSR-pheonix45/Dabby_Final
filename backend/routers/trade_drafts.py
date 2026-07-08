import os
from typing import Dict, List, Optional
from fastapi import APIRouter, HTTPException, Depends
from supabase_client import supabase
from auth import require_permission, require_membership, P
from services.trade_draft_service import trade_draft_service
from services.business_event_registry import business_event_registry

router = APIRouter()

@router.get("/workbench/{workbench_id}", dependencies=[Depends(require_membership())])
async def list_trade_drafts(
    workbench_id: str,
    status: Optional[str] = None,
    limit: int = 50,
    offset: int = 0
):
    try:
        return await trade_draft_service.list_for_workbench(workbench_id, status, limit, offset)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{draft_id}", dependencies=[Depends(require_membership())])
async def get_trade_draft(draft_id: str):
    try:
        draft = await trade_draft_service.get_draft(draft_id)
        if not draft:
            raise HTTPException(status_code=404, detail="Trade Draft not found")
        return draft
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{draft_id}", dependencies=[Depends(require_permission(P.EDIT_DRAFT))])
async def update_trade_draft(draft_id: str, payload: Dict):
    try:
        updated = await trade_draft_service.update_override_fields(draft_id, payload)
        return {"message": "Trade Draft updated", "draft": updated}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{draft_id}/approve", dependencies=[Depends(require_permission(P.EDIT_DRAFT))])
async def approve_trade_draft(draft_id: str, user=Depends(require_membership())):
    try:
        # User auth can be injected here; assuming user dict has 'id'
        user_id = user.get("id") if isinstance(user, dict) else None
        event = await business_event_registry.create_from_trade_draft(draft_id, reviewed_by=user_id)
        return {"message": "Trade Draft approved. Business Event created.", "event": event}
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{draft_id}/reject", dependencies=[Depends(require_permission(P.EDIT_DRAFT))])
async def reject_trade_draft(draft_id: str, payload: dict = {}, user=Depends(require_membership())):
    try:
        user_id = user.get("id") if isinstance(user, dict) else None
        reason = payload.get("reason")
        draft = await trade_draft_service.reject_draft(draft_id, reviewed_by=user_id, reason=reason)
        return {"message": "Trade Draft rejected", "draft": draft}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/generate/{analysis_note_id}", dependencies=[Depends(require_permission(P.EDIT_DRAFT))])
async def generate_draft(analysis_note_id: str):
    """Manually trigger draft generation from an Analysis Note."""
    try:
        draft = await trade_draft_service.create_draft_from_analysis_note(analysis_note_id)
        return {"message": "Trade Draft generated", "draft": draft}
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
