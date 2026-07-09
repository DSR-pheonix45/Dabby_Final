from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from typing import Optional, Dict, Any
from supabase_client import supabase
import uuid

router = APIRouter()

class DocumentProcessRequest(BaseModel):
    workbench_id: str

@router.get("/{workbench_id}")
async def list_documents(workbench_id: str):
    try:
        res = supabase.table("di_documents").select("*, di_analysis_notes(*), di_document_processing_logs(*)").eq("workbench_id", workbench_id).execute()
        return res.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/upload")
async def upload_document(
    workbench_id: str = Form(...),
    file: UploadFile = File(...)
):
    try:
        # 1. We would typically upload to Supabase storage here.
        # For now, we mock the storage path.
        storage_path = f"{workbench_id}/{uuid.uuid4()}_{file.filename}"
        
        # 2. Insert into di_documents
        doc_data = {
            "workbench_id": workbench_id,
            "storage_path": storage_path,
            "original_filename": file.filename,
            "mime_type": file.content_type,
            "size_bytes": 0, # Should be calculated
            "file_hash": str(uuid.uuid4()) # Mock hash
        }
        
        doc_res = supabase.table("di_documents").insert(doc_data).execute()
        document_id = doc_res.data[0]['id']
        
        # 3. Log the upload
        supabase.table("di_document_processing_logs").insert({
            "document_id": document_id,
            "stage": "upload",
            "provider": "system",
            "status": "success"
        }).execute()

        return {"status": "success", "document_id": document_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{document_id}/process")
async def process_document(document_id: str):
    try:
        # Mock processing logic
        # 1. OCR Stage
        supabase.table("di_document_processing_logs").insert({
            "document_id": document_id,
            "stage": "ocr",
            "provider": "groq",
            "status": "success"
        }).execute()
        
        supabase.table("di_document_ocr").insert({
            "document_id": document_id,
            "provider": "groq",
            "language": "en",
            "raw_text": "MOCKED OCR TEXT FOR DOCUMENT",
            "confidence": 0.98
        }).execute()

        # 2. Analysis Stage (Auto-generate Proposed Journal Entries)
        extracted_data = {
            "vendor": "Acme Corp",
            "total_amount": 1500.00,
            "date": "2023-10-01",
            "proposed_journal_entries": [
                {
                    "account": "Software Expenses",
                    "type": "debit",
                    "amount": 1500.00
                },
                {
                    "account": "Accounts Payable",
                    "type": "credit",
                    "amount": 1500.00
                }
            ]
        }
        
        supabase.table("di_analysis_notes").insert({
            "document_id": document_id,
            "classification_type": "invoice",
            "extracted_data": extracted_data,
            "reasoning": "Identified as SaaS subscription invoice. Expensed immediately.",
            "confidence": 0.95
        }).execute()
        
        supabase.table("di_document_processing_logs").insert({
            "document_id": document_id,
            "stage": "analysis",
            "provider": "groq",
            "status": "success"
        }).execute()

        return {"status": "success", "message": "Document processed and proposed journal entries generated."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
