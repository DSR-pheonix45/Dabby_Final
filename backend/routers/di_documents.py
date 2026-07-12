from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from typing import Optional, Dict, Any
from supabase_client import supabase
import uuid
import json
import base64
import fitz

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
        file_bytes = await file.read()
        storage_path = f"{workbench_id}/{uuid.uuid4()}_{file.filename}"
        import httpx
        from supabase_client import url, key
        
        # Upload to Supabase Storage using HTTP REST API to bypass storage3 sdk bug
        headers = {
            "Authorization": f"Bearer {key}",
            "apikey": key,
            "Content-Type": file.content_type
        }
        
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{url}/storage/v1/object/Doc_vault_Raw/{storage_path}",
                content=file_bytes,
                headers=headers
            )
            if resp.status_code >= 400:
                raise Exception(f"Failed to upload to storage: {resp.text}")
        
        # Insert into di_documents
        doc_data = {
            "workbench_id": workbench_id,
            "storage_path": storage_path,
            "original_filename": file.filename,
            "mime_type": file.content_type,
            "size_bytes": len(file_bytes),
            "file_hash": str(uuid.uuid4()) # In real app, calculate real hash
        }
        
        doc_res = supabase.table("di_documents").insert(doc_data).execute()
        document_id = doc_res.data[0]['id']
        
        # Log the upload
        supabase.table("di_document_processing_logs").insert({
            "document_id": document_id,
            "stage": "upload",
            "provider": "system",
            "status": "success"
        }).execute()

        return {"status": "success", "document_id": document_id}
    except Exception as e:
        import traceback
        err_msg = traceback.format_exc()
        print(f"[UPLOAD ERROR] {err_msg}")
        raise HTTPException(status_code=400, detail=f"Upload Error: {str(e)} | Traceback: {err_msg}")

@router.post("/{document_id}/process")
async def process_document(document_id: str):
    try:
        # 1. Fetch document metadata
        doc_res = supabase.table("di_documents").select("*").eq("id", document_id).execute()
        if not doc_res.data:
            raise HTTPException(status_code=404, detail="Document not found")
        doc_data = doc_res.data[0]
        
        supabase.table("di_document_processing_logs").insert({
            "document_id": document_id,
            "stage": "ocr",
            "provider": "groq",
            "status": "started"
        }).execute()
        
        # 2. Download from storage via HTTP
        import httpx
        from supabase_client import url, key
        
        headers = {
            "Authorization": f"Bearer {key}",
            "apikey": key
        }
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{url}/storage/v1/object/Doc_vault_Raw/{doc_data['storage_path']}",
                headers=headers
            )
            if resp.status_code >= 400:
                raise Exception(f"Failed to download from storage: {resp.text}")
            file_bytes = resp.content
        
        extracted_text = ""
        is_pdf = doc_data['mime_type'] == 'application/pdf'
        
        if is_pdf:
            pdf_doc = fitz.open(stream=file_bytes, filetype="pdf")
            for page in pdf_doc:
                extracted_text += page.get_text()
            pdf_doc.close()

        # Save OCR raw text (for images, we can leave it empty or extract text if needed, but for MVP we skip raw text for images)
        supabase.table("di_document_ocr").insert({
            "document_id": document_id,
            "provider": "gemini",
            "language": "en",
            "raw_text": extracted_text if extracted_text else "Image Document",
            "confidence": 0.95
        }).execute()
        
        supabase.table("di_document_processing_logs").insert({
            "document_id": document_id,
            "stage": "ocr",
            "provider": "gemini",
            "status": "success"
        }).execute()

        # 3. Analyze with Gemini (Fetch Workbench Labels to give to LLM)
        labels_res = supabase.table("di_workbench_labels").select("name").eq("workbench_id", doc_data['workbench_id']).execute()
        valid_labels = [l['name'] for l in labels_res.data] if labels_res.data else ["Purchase", "Sales"]

        import google.generativeai as genai
        import os
        
        gemini_key = os.environ.get("GEMINI_API_KEY")
        if not gemini_key:
            raise Exception("GEMINI_API_KEY is missing in environment variables.")
            
        genai.configure(api_key=gemini_key)
        
        # --- Step 1: Fast Classification ---
        class_prompt = """
        You are a document classification specialist. Identify the type of this financial document.
        Return ONLY a JSON object with this exact schema:
        {
          "document_type": "bank_statement", // One of: sales_invoice, vendor_invoice, receipt, bank_statement, unknown
          "confidence": 0.99
        }
        """
        class_model = genai.GenerativeModel(
            "gemini-2.5-flash",
            system_instruction=class_prompt,
            generation_config={"response_mime_type": "application/json", "temperature": 0.1}
        )
        
        if is_pdf:
            class_res = class_model.generate_content([extracted_text, "Classify this document."])
        else:
            class_res = class_model.generate_content([{"mime_type": doc_data['mime_type'], "data": file_bytes}, "Classify this document."])
            
        try:
            class_data = json.loads(class_res.text)
            doc_type = class_data.get("document_type", "unknown").lower()
        except:
            doc_type = "unknown"
            
        print(f"[DEBUG] di_documents classified as: {doc_type}")
        
        # --- Step 2: Specialized Extraction ---
        if doc_type == "bank_statement":
            system_prompt = f"""
You are an expert AI accounting agent. Analyze the bank statement and extract detailed financial insights.
You MUST classify this document into exactly one of these labels: {valid_labels}.

Return ONLY valid JSON matching this exact schema. For every value, provide a "value" and a "confidence" score (0.0 to 1.0).

{{
    "predicted_label": "String (Must be one of the provided labels, e.g., 'Bank Statement' if available)",
    "document_type": "Bank Statement",
    "statement_summary": {{
        "bank_name": {{"value": "String", "confidence": 0.99}},
        "account_number": {{"value": "String", "confidence": 0.99}},
        "statement_period": {{"value": "String", "confidence": 0.99}},
        "opening_balance": {{"value": 0.0, "confidence": 0.99}},
        "closing_balance": {{"value": 0.0, "confidence": 0.99}}
    }},
    "transactions": [
        {{
            "date": {{"value": "YYYY-MM-DD", "confidence": 0.99}},
            "description": {{"value": "String", "confidence": 0.99}},
            "debit_amount": {{"value": 0.0, "confidence": 0.99}},
            "credit_amount": {{"value": 0.0, "confidence": 0.99}},
            "balance": {{"value": 0.0, "confidence": 0.99}},
            "payment_mode": {{"value": "String", "confidence": 0.99}}
        }}
    ],
    "analysis": "Human-readable interpretation of the bank statement."
}}
"""
        else:
            system_prompt = f"""
You are an expert AI accounting agent. Analyze the invoice/receipt and extract detailed financial insights.
You MUST classify this document into exactly one of these labels: {valid_labels}.

Return ONLY valid JSON matching this exact schema. For every value, provide a "value" and a "confidence" score (0.0 to 1.0).

{{
    "predicted_label": "String (Must be one of the provided labels)",
    "document_type": "Invoice / Receipt / etc",
    "parties": {{
        "vendor": {{"value": "String", "confidence": 0.99}},
        "customer": {{"value": "String", "confidence": 0.99}}
    }},
    "document": {{
        "reference_number": {{"value": "String", "confidence": 0.99}},
        "date": {{"value": "YYYY-MM-DD", "confidence": 0.99}}
    }},
    "financials": {{
        "total_amount": {{"value": 1500.00, "confidence": 0.99}},
        "tax_amount": {{"value": 100.00, "confidence": 0.99}},
        "currency": {{"value": "USD", "confidence": 0.99}}
    }},
    "line_items": [
        {{
            "description": {{"value": "String", "confidence": 0.99}},
            "quantity": {{"value": 1, "confidence": 0.99}},
            "unit_price": {{"value": 100.00, "confidence": 0.99}},
            "total": {{"value": 100.00, "confidence": 0.99}}
        }}
    ],
    "financial_impact": [
        {{ "account": "Expense", "amount": 1400.00, "type": "increase" }}
    ],
    "business_events": [
        "Expense Incurred"
    ],
    "expected_journal": [
        {{ "account": "Expense", "type": "debit", "amount": 1400.00 }}
    ],
    "analysis": "Human-readable interpretation of the financial impact (2-3 sentences)."
}}
"""

        model = genai.GenerativeModel(
            "gemini-2.5-flash",
            system_instruction=system_prompt,
            generation_config={"response_mime_type": "application/json", "temperature": 0.1}
        )
        
        if is_pdf:
            response = model.generate_content([
                extracted_text,
                "Extract the financial details from this document text."
            ])
        else:
            image_part = {
                "mime_type": doc_data['mime_type'],
                "data": file_bytes
            }
            response = model.generate_content([
                image_part,
                "Extract the financial details from this image."
            ])
            
        analysis_data = json.loads(response.text)
        predicted_label = analysis_data.get("predicted_label", "Purchase")
        
        # Calculate overall confidence based on field confidences
        confidences = []
        try:
            if "financials" in analysis_data:
                confidences.append(analysis_data["financials"].get("total_amount", {}).get("confidence", 1.0))
            if "document" in analysis_data:
                confidences.append(analysis_data["document"].get("reference_number", {}).get("confidence", 1.0))
        except:
            pass
        
        overall_confidence = sum(confidences) / len(confidences) if confidences else 0.95
        
        supabase.table("di_analysis_notes").insert({
            "document_id": document_id,
            "classification_type": predicted_label.lower(),
            "extracted_data": analysis_data,
            "reasoning": analysis_data.get("analysis", ""),
            "confidence": overall_confidence
        }).execute()
        
        supabase.table("di_document_processing_logs").insert({
            "document_id": document_id,
            "stage": "analysis",
            "provider": "groq",
            "status": "success"
        }).execute()

        return {"status": "success", "message": "Document processed and proposed journal entries generated."}
    except Exception as e:
        import traceback
        err_msg = traceback.format_exc()
        print(f"[DI ERROR] {err_msg}")
        # Log failure
        try:
            supabase.table("di_document_processing_logs").insert({
                "document_id": document_id,
                "stage": "analysis",
                "provider": "system",
                "status": "failed",
                "error_message": str(e)[:500]
            }).execute()
        except:
            pass
        raise HTTPException(status_code=400, detail=f"Processing Error: {str(e)} | Traceback: {err_msg}")

@router.post("/{document_id}/approve")
async def approve_document(document_id: str):
    try:
        supabase.table("di_document_processing_logs").insert({
            "document_id": document_id,
            "stage": "post",
            "provider": "user",
            "status": "success"
        }).execute()
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{document_id}/ufo")
async def update_ufo(document_id: str, payload: dict):
    try:
        # In MVP we simply overwrite the extracted_data
        supabase.table("di_analysis_notes").update({
            "extracted_data": payload.get("extracted_data", {})
        }).eq("document_id", document_id).execute()
        
        supabase.table("di_document_processing_logs").insert({
            "document_id": document_id,
            "stage": "user_edit",
            "provider": "user",
            "status": "success"
        }).execute()
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
