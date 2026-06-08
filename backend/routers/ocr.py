"""
Document text-extraction endpoint for the document vault.
Downloads the stored file, extracts text locally (pdfplumber/pypdf, with optional
Tesseract OCR for scanned docs), persists the text on the document row, and
indexes it for semantic search.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from supabase_client import supabase
from services.ocr_service import ocr_service
from services.embedding_service import embedding_service

router = APIRouter()
BUCKET = "Doc_vault_Raw"


class OCRRequest(BaseModel):
    file_path: str
    document_id: Optional[str] = None
    index: bool = True


@router.get("/status")
async def status():
    return {
        "text_extraction": ocr_service.pdf_text,
        "ocr_available": ocr_service.ocr_available,
    }


@router.post("/extract/{workbench_id}")
async def extract(workbench_id: str, req: OCRRequest):
    try:
        # 1. Download the stored file bytes.
        try:
            content = supabase.storage.from_(BUCKET).download(req.file_path)
        except Exception as e:
            raise HTTPException(status_code=404, detail=f"Could not download document: {e}")

        # 2. Extract text locally (digital PDF text first, OCR fallback if installed).
        result = ocr_service.extract_text(content, filename=req.file_path)
        text = result["text"]

        if not text:
            detail = ("This looks like a scanned/image PDF with no text layer. "
                      "Install Tesseract + Poppler to enable OCR, or upload a digital PDF."
                      if result["needs_ocr"] else "No text could be extracted from this document.")
            raise HTTPException(status_code=422, detail=detail)

        # 3. Persist extracted text + status on the document row.
        if req.document_id:
            try:
                supabase.table("workbench_documents").update({
                    "extracted_text": text,
                    "status": "ocr_complete",
                }).eq("id", req.document_id).execute()
            except Exception as e:
                print(f"[OCR] Could not update document row: {e}")

        # 4. Index for semantic retrieval (best-effort).
        indexed = 0
        if req.index and embedding_service.enabled and text:
            from routers.rag import index_document, IndexRequest
            try:
                res = await index_document(workbench_id, IndexRequest(document_id=req.document_id, text=text))
                indexed = res.get("indexed", 0)
            except Exception as e:
                print(f"[OCR] Indexing failed: {e}")

        return {"text": text, "chars": len(text), "method": result["method"], "indexed": indexed}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
