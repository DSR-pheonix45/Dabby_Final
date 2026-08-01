import uuid
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from typing import Optional, List, Dict, Any
from supabase_client import supabase
from auth import get_current_user
from engine.translation_pipeline import translation_pipeline
from engine.learning_engine import learning_engine
from schemas.coa_translation import OverrideRequestPayload, CommitTranslationPayload

router = APIRouter()

@router.post("/import")
async def import_coa(
    workbench_id: str = Form(...),
    source_erp: Optional[str] = Form("auto"),
    industry: Optional[str] = Form(None),
    file: UploadFile = File(...),
    user = Depends(get_current_user)
):
    """
    Ingests Chart of Accounts export file from ANY ERP (CSV, XLSX, JSON, XML),
    runs the 16-module translation engine, and stores translated ALERX ledgers.
    """
    try:
        content = await file.read()
        translated_items = await translation_pipeline.translate_file(
            file_content=content,
            filename=file.filename or "coa_export.csv",
            workbench_id=workbench_id,
            explicit_erp=source_erp if source_erp != "auto" else None,
            industry=industry
        )

        job_id = str(uuid.uuid4())
        
        # Calculate summary statistics
        total = len(translated_items)
        auto_mapped = sum(1 for item in translated_items if item.confidence_score >= 0.95)
        ai_assisted = sum(1 for item in translated_items if 0.80 <= item.confidence_score < 0.95)
        manual_review = sum(1 for item in translated_items if item.confidence_score < 0.80)

        # Store job details in Supabase coa_translation_jobs table
        job_record = {
            "id": job_id,
            "workbench_id": workbench_id,
            "source_erp": source_erp,
            "file_name": file.filename or "upload.csv",
            "total_ledgers": total,
            "auto_mapped_count": auto_mapped,
            "ai_assisted_count": ai_assisted,
            "manual_review_count": manual_review,
            "status": "completed"
        }
        try:
            supabase.table("coa_translation_jobs").insert(job_record).execute()
        except Exception as err:
            print("Warning: coa_translation_jobs DB insert failed (schema missing), proceeding in memory:", err)

        # Store individual translated ledgers in Supabase coa_translation_ledgers table
        ledger_rows = []
        for item in translated_items:
            ledger_rows.append({
                "job_id": job_id,
                "workbench_id": workbench_id,
                "external_id": item.external_id,
                "original_name": item.original_name,
                "original_type": item.original_type,
                "parent_name": item.parent_name,
                "is_sub_account": item.flags.is_sub_account,
                "is_header_group": item.flags.is_header_group,
                "hierarchy_depth": item.flags.hierarchy_depth,
                "parent_chain": item.flags.parent_chain,
                "normalized_name": item.normalized_name,
                "semantic_tags": item.semantic_tags,
                "mapped_class": item.mapped_class,
                "mapped_group_code": item.mapped_group_code,
                "generated_full_code": item.generated_full_code,
                "confidence_score": item.confidence_score,
                "mapping_source": item.mapping_source,
                "ai_reasoning": item.ai_reasoning,
                "validation_status": item.validation_status
            })

        if ledger_rows:
            try:
                supabase.table("coa_translation_ledgers").insert(ledger_rows).execute()
            except Exception as err:
                print("Warning: coa_translation_ledgers DB insert failed, returning parsed items:", err)

        return {
            "job_id": job_id,
            "status": "completed",
            "total_ledgers": total,
            "auto_mapped_count": auto_mapped,
            "ai_assisted_count": ai_assisted,
            "manual_review_count": manual_review,
            "confidence_distribution": {
                "high_gte_95": auto_mapped,
                "medium_80_94": ai_assisted,
                "low_below_80": manual_review
            },
            "accounts": [item.dict() for item in translated_items]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/override")
async def override_mapping(payload: OverrideRequestPayload, user = Depends(get_current_user)):
    """
    Saves user override correction into tenant-isolated Learning Engine.
    """
    try:
        await learning_engine.record_override(
            workbench_id=payload.workbench_id,
            raw_account_name=payload.raw_account_name,
            corrected_class=payload.corrected_class,
            corrected_group_code=payload.corrected_group_code
        )
        return {"status": "success", "message": "Override recorded in learning memory"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/commit")
async def commit_translation(payload: CommitTranslationPayload, user = Depends(get_current_user)):
    """
    Commits confirmed ALERX translated ledgers into workbench_accounts (Company Master).
    """
    try:
        ledgers_to_commit = payload.confirmed_ledgers or []

        if not ledgers_to_commit and payload.job_id:
            res = supabase.table("coa_translation_ledgers").select("*").eq("job_id", payload.job_id).execute()
            if res.data:
                ledgers_to_commit = res.data

        if not ledgers_to_commit:
            raise HTTPException(status_code=400, detail="No ledgers found to commit")

        coa_rows = []
        for acc in ledgers_to_commit:
            coa_rows.append({
                "workbench_id": payload.workbench_id,
                "account_class": acc.get("mapped_class") or acc.get("account_class"),
                "group_code": acc.get("mapped_group_code") or acc.get("group_code"),
                "full_code": acc.get("generated_full_code") or acc.get("full_code"),
                "ledger": acc.get("original_name") or acc.get("ledger"),
                "label": acc.get("normalized_name") or acc.get("label") or acc.get("ledger"),
                "current_balance": 0.0
            })

        supabase.table("workbench_accounts").insert(coa_rows).execute()
        return {"status": "success", "committed_count": len(coa_rows)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
