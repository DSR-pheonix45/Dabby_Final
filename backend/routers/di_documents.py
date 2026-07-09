from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from typing import Optional, Dict, Any
from supabase_client import supabase
import uuid
import json
import base64
import fitz
from services.groq_pool import GroqPool

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
        
        # Upload to Supabase Storage
        supabase.storage.from_("Doc_vault_Raw").upload(storage_path, file_bytes)
        
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
        raise HTTPException(status_code=500, detail=str(e))

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
        
        # 2. Download from storage
        file_bytes = supabase.storage.from_("Doc_vault_Raw").download(doc_data['storage_path'])
        
        extracted_text = ""
        prompt_content = []
        is_pdf = doc_data['mime_type'] == 'application/pdf'
        
        if is_pdf:
            pdf_doc = fitz.open(stream=file_bytes, filetype="pdf")
            for page in pdf_doc:
                extracted_text += page.get_text()
            pdf_doc.close()
            prompt_content.append({
                "type": "text", 
                "text": f"Extract the financial details from this document text:\n\n{extracted_text}"
            })
        else:
            base64_image = base64.b64encode(file_bytes).decode('utf-8')
            prompt_content.append({
                "type": "text", 
                "text": "Extract the financial details from this image."
            })
            prompt_content.append({
                "type": "image_url",
                "image_url": {
                    "url": f"data:{doc_data['mime_type']};base64,{base64_image}",
                },
            })

        # Save OCR raw text
        supabase.table("di_document_ocr").insert({
            "document_id": document_id,
            "provider": "groq" if is_pdf else "groq-vision",
            "language": "en",
            "raw_text": extracted_text if extracted_text else "Image Document",
            "confidence": 0.95
        }).execute()
        
        supabase.table("di_document_processing_logs").insert({
            "document_id": document_id,
            "stage": "ocr",
            "provider": "groq",
            "status": "success"
        }).execute()

        # 3. Analyze with Groq (Fetch Workbench Labels to give to LLM)
        labels_res = supabase.table("di_workbench_labels").select("name").eq("workbench_id", doc_data['workbench_id']).execute()
        valid_labels = [l['name'] for l in labels_res.data] if labels_res.data else ["Purchase", "Sales"]

        system_prompt = f"""
You are an expert AI accounting agent. Analyze the document and extract the JSON data.
You MUST classify this document into exactly one of these labels: {valid_labels}.
Return ONLY valid JSON matching this schema:
{{
    "vendor": "String",
    "total_amount": 1500.00,
    "date": "YYYY-MM-DD",
    "predicted_label": "String (Must be one of the provided labels)",
    "reasoning": "Brief explanation of the classification"
}}
"""

        def llm_call(client):
            return client.chat.completions.create(
                model="llama-3.2-11b-vision-preview" if not is_pdf else "llama3-8b-8192",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": prompt_content}
                ],
                response_format={"type": "json_object"},
                temperature=0.1
            )
            
        llm_response = GroqPool.execute(llm_call)
        analysis_data = json.loads(llm_response.choices[0].message.content)
        predicted_label = analysis_data.get("predicted_label", "Purchase")
        
        # 4. Resolve the label to the ledger account
        label_res = supabase.table("di_workbench_labels").select("name, ledger_account_id, di_accounts!inner(code, name)").eq("workbench_id", doc_data['workbench_id']).eq("name", predicted_label).execute()
        
        debit_account = predicted_label
        credit_account = "Accounts Payable"
        
        if label_res.data:
            debit_account = f"{label_res.data[0]['di_accounts']['code']} {label_res.data[0]['di_accounts']['name']}"
            ap_res = supabase.table("di_accounts").select("code, name").eq("workbench_id", doc_data['workbench_id']).eq("code", "2000").execute()
            if ap_res.data:
                credit_account = f"{ap_res.data[0]['code']} {ap_res.data[0]['name']}"

        analysis_data["proposed_journal_entries"] = [
            {"account": debit_account, "type": "debit", "amount": analysis_data.get("total_amount", 0.0)},
            {"account": credit_account, "type": "credit", "amount": analysis_data.get("total_amount", 0.0)}
        ]
        
        supabase.table("di_analysis_notes").insert({
            "document_id": document_id,
            "classification_type": predicted_label.lower(),
            "extracted_data": analysis_data,
            "reasoning": analysis_data.get("reasoning", ""),
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
        print(f"[DI ERROR] {str(e)}")
        # Log failure
        supabase.table("di_document_processing_logs").insert({
            "document_id": document_id,
            "stage": "analysis_failed",
            "provider": "system",
            "status": "failed"
        }).execute()
        raise HTTPException(status_code=500, detail=str(e))
