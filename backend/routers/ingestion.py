"""
Ingestion Router
================
REST API for the Phase 1 Analysis Note pipeline.

Endpoints:
  GET  /api/ingestion/analysis-notes/{document_id}         → Fetch note for a document
  GET  /api/ingestion/analysis-notes/user/{wb_id}     → List notes for workbench
  POST /api/ingestion/analysis-notes/{note_id}/review      → Update review_status
  GET  /api/ingestion/analysis-notes/{wb_id}/settlement/{key} → Find linked notes by key
  POST /api/ingestion/reanalyse/{document_id}              → Trigger re-analysis
  GET  /api/ingestion/ocr-raw/{document_id}                → Fetch raw OCR output
  GET  /api/ingestion/classification/{document_id}         → Fetch classification result
  GET  /api/ingestion/processing-log/{document_id}         → Full processing audit log
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List
from supabase_client import supabase
from services.analysis_note_service import analysis_note_service

router = APIRouter()


# ──────────────────────────────────────────────────────────────────────────────
# Request models
# ──────────────────────────────────────────────────────────────────────────────

class ReviewStatusUpdate(BaseModel):
    review_status: str          # DRAFT | UNDER_REVIEW | APPROVED | REJECTED | SUPERSEDED
    reviewed_by:   Optional[str] = None
    review_notes:  Optional[str] = None


# ──────────────────────────────────────────────────────────────────────────────
# Analysis Note endpoints
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/analysis-notes/{document_id}")
async def get_analysis_note(document_id: str):
    """
    Fetch the latest (non-superseded) Analysis Note for a document.
    """
    note = await _analysis_note_service.get_for_document(document_id)
    if not note:
        raise HTTPException(
            status_code=404,
            detail=f"No Analysis Note found for document {document_id}"
        )
    return note


@router.get("/analysis-notes/user/{user_id}")
async def list_analysis_notes(
    user_id: str,
    review_status: Optional[str] = Query(None, description="Filter by review_status"),
    limit:  int = Query(50,  ge=1, le=200),
    offset: int = Query(0,   ge=0),
):
    """
    List Analysis Notes for a workbench.
    Optionally filter by review_status: DRAFT | UNDER_REVIEW | APPROVED | REJECTED | SUPERSEDED
    """
    notes = await _analysis_note_service.list_for_workbench(
        user_id=user_id,
        review_status=review_status,
        limit=limit,
        offset=offset,
    )
    return {"data": notes, "count": len(notes)}


@router.post("/analysis-notes/{note_id}/review")
async def update_review_status(note_id: str, body: ReviewStatusUpdate):
    """
    Update the lifecycle review_status of an Analysis Note.
    Valid transitions: DRAFT → UNDER_REVIEW → APPROVED | REJECTED
    """
    try:
        updated = await _analysis_note_service.update_review_status(
            note_id=note_id,
            new_status=body.review_status,
            reviewed_by=body.reviewed_by,
            review_notes=body.review_notes,
        )
        if not updated:
            raise HTTPException(status_code=404, detail=f"Analysis Note {note_id} not found")
        return updated
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/analysis-notes/{user_id}/settlement/{settlement_key}")
async def find_by_settlement_key(user_id: str, settlement_key: str):
    """
    Find all Analysis Notes in a workbench that share a settlement key.
    This is the cross-document linkage endpoint (invoice ↔ payment matching).
    """
    notes = await _analysis_note_service.find_linked_by_settlement_key(
        user_id=user_id,
        settlement_key=settlement_key,
    )
    return {"settlement_key": settlement_key, "linked_notes": notes, "count": len(notes)}


# ──────────────────────────────────────────────────────────────────────────────
# Re-analysis
# ──────────────────────────────────────────────────────────────────────────────

@router.post("/reanalyse/{document_id}")
async def reanalyse_document(document_id: str):
    """
    Trigger re-analysis of a document.

    This:
      1. Fetches the document's existing OCR output and classification
      2. Re-generates the Analysis Note (supersedes the old one)
      3. Returns the new Analysis Note

    Does NOT re-run OCR. Re-uses stored OCR raw output.
    For a full re-OCR, re-upload the document.
    """
    try:
        # Fetch existing OCR raw output
        ocr_res = (
            supabase.table("ocr_raw_output")
                    .select("*")
                    .eq("document_id", document_id)
                    .order("created_at", desc=True)
                    .limit(1)
                    .execute()
        )
        if not ocr_res.data:
            raise HTTPException(
                status_code=404,
                detail=f"No OCR output found for document {document_id}. "
                       "Re-upload the document to trigger full re-processing."
            )
        ocr_raw = ocr_res.data[0]

        # Fetch existing classification
        clf_res = (
            supabase.table("document_classifications")
                    .select("*")
                    .eq("document_id", document_id)
                    .order("created_at", desc=True)
                    .limit(1)
                    .execute()
        )
        if not clf_res.data:
            raise HTTPException(
                status_code=404,
                detail=f"No classification found for document {document_id}."
            )
        classification = {
            "document_type": clf_res.data[0]["document_type"],
            "confidence":    clf_res.data[0]["confidence"],
            "reasoning":     clf_res.data[0].get("reasoning"),
            "classification_method": clf_res.data[0].get("classification_method", "heuristic"),
        }

        # Fetch document info for user_id
        doc_res = (
            supabase.table("user_documents")
                    .select("user_id")
                    .eq("id", document_id)
                    .single()
                    .execute()
        )
        if not doc_res.data:
            raise HTTPException(status_code=404, detail=f"Document {document_id} not found")

        user_id = doc_res.data["user_id"]

        # Re-generate Analysis Note
        new_note = await _analysis_note_service.generate_and_store(
            document_id=document_id,
            user_id=user_id,
            ocr_output=ocr_raw,
            classification=classification,
        )

        return {
            "message": "Re-analysis complete. Previous note superseded.",
            "analysis_note": new_note,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ──────────────────────────────────────────────────────────────────────────────
# Supporting data endpoints
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/ocr-raw/{document_id}")
async def get_ocr_raw(document_id: str):
    """Fetch raw OCR output for a document."""
    result = (
        supabase.table("ocr_raw_output")
                .select("*")
                .eq("document_id", document_id)
                .order("created_at", desc=True)
                .limit(1)
                .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail=f"No OCR output found for document {document_id}")
    return result.data[0]


@router.get("/classification/{document_id}")
async def get_classification(document_id: str):
    """Fetch the latest document classification result."""
    result = (
        supabase.table("document_classifications")
                .select("*")
                .eq("document_id", document_id)
                .order("created_at", desc=True)
                .limit(1)
                .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail=f"No classification found for document {document_id}")
    return result.data[0]


@router.get("/processing-log/{document_id}")
async def get_processing_log(document_id: str):
    """Fetch the full processing audit log for a document."""
    result = (
        supabase.table("document_processing_log")
                .select("*")
                .eq("document_id", document_id)
                .order("created_at", desc=False)
                .execute()
    )
    return {"document_id": document_id, "log": result.data or []}
