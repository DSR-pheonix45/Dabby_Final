from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from typing import Optional, Dict, Any
from supabase_client import supabase
from services.ufo_mapper import UFOMapper
from services.ai_service import GEMINI_MODEL
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
async def process_document(document_id: str, hint: Optional[str] = None):
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
        ocr_provider = "sarvam"
        
        try:
            from sarvamai.client import SarvamAI
            import os
            import time
            import requests
            import io
            import zipfile
            import asyncio
            
            api_key = os.getenv("SARVAM_API_KEY")
            if api_key:
                print(f"[DEBUG] Attempting Sarvam AI Document OCR for {doc_data['original_filename']}")
                sarvam_client = SarvamAI(api_subscription_key=api_key)
                file_name = doc_data['original_filename']
                
                job = sarvam_client.document_intelligence.create_job(language='en-IN', output_format='md')
                job_id = job.id if hasattr(job, "id") else getattr(job, "job_id", getattr(job, "jobId", None))
                
                upload_resp = sarvam_client.document_intelligence.get_upload_links(job_id=job_id, files=[file_name])
                
                if hasattr(upload_resp, "upload_urls"):
                    urls_dict = upload_resp.upload_urls
                    upload_url = urls_dict[file_name].file_url if hasattr(urls_dict[file_name], "file_url") else urls_dict[file_name]["file_url"]
                else:
                    urls_dict = upload_resp["upload_urls"]
                    upload_url = urls_dict[file_name]["file_url"]
                    
                headers = {"x-ms-blob-type": "BlockBlob"}
                res = requests.put(upload_url, data=file_bytes, headers=headers)
                
                if res.status_code in [200, 201]:
                    sarvam_client.document_intelligence.start(job_id=job_id)
                    
                    attempts = 0
                    state = ""
                    while attempts < 30: # 1 min timeout
                        status = sarvam_client.document_intelligence.get_status(job_id=job_id)
                        state = getattr(status, "job_state", getattr(status, "status", None))
                        if state in ["Completed", "Failed", "Completed_with_errors"]:
                            break
                        await asyncio.sleep(2)
                        attempts += 1
                        
                    if state in ["Completed", "Completed_with_errors"]:
                        download = sarvam_client.document_intelligence.get_download_links(job_id=job_id)
                        
                        if hasattr(download, "download_urls"):
                            zip_url = download.download_urls['document.zip'].file_url if hasattr(download.download_urls['document.zip'], "file_url") else download.download_urls['document.zip']["file_url"]
                        else:
                            zip_url = download["download_urls"]['document.zip']["file_url"]
                            
                        zip_res = requests.get(zip_url)
                        with zipfile.ZipFile(io.BytesIO(zip_res.content)) as z:
                            md_files = [n for n in z.namelist() if n.endswith('.md') or n.endswith('.txt')]
                            if md_files:
                                extracted_text = "\n".join(z.read(n).decode('utf-8') for n in md_files)
                                print("[DEBUG] Sarvam AI OCR successful.")
        except Exception as e:
            print(f"[WARNING] Sarvam API extraction failed: {e}")
            extracted_text = ""
            
        if not extracted_text:
            ocr_provider = "gemini"
            print("[DEBUG] Falling back to PyMuPDF/Gemini OCR logic.")
            if is_pdf:
                pdf_doc = fitz.open(stream=file_bytes, filetype="pdf")
                for page in pdf_doc:
                    extracted_text += page.get_text()
                pdf_doc.close()

        # Save OCR raw text
        supabase.table("di_document_ocr").insert({
            "document_id": document_id,
            "provider": ocr_provider,
            "language": "en",
            "raw_text": extracted_text if extracted_text else "Image Document",
            "confidence": 0.95
        }).execute()
        
        supabase.table("di_document_processing_logs").insert({
            "document_id": document_id,
            "stage": "ocr",
            "provider": ocr_provider,
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
        if hint and hint in ["customer_payment_receipt", "vendor_payment_receipt", "expense_receipt"]:
            doc_type = hint
            print(f"[DEBUG] Using manual classification hint: {doc_type}")
        else:
            class_prompt = """
            You are a document classification specialist. Identify the type of this financial document.
            Return ONLY a JSON object with this exact schema:
            {
              "document_type": "bank_statement", // One of: sales_invoice, vendor_invoice, receipt, bank_statement, unknown
              "confidence": 0.99
            }
            """
            class_model = genai.GenerativeModel(
                GEMINI_MODEL,
                system_instruction=class_prompt,
                generation_config={"response_mime_type": "application/json", "temperature": 0.1}
            )
            
            document_part = {
                "mime_type": doc_data['mime_type'],
                "data": file_bytes
            }
            classification_prompt = "Classify this document."
            if extracted_text:
                classification_prompt = f"Here is the high-quality OCR text from Sarvam AI:\n\n{extracted_text[:4000]}\n\n" + classification_prompt
            class_res = class_model.generate_content([document_part, classification_prompt])
                
            try:
                class_text = class_res.text.strip()
                if class_text.startswith("```json"):
                    class_text = class_text[7:-3].strip()
                elif class_text.startswith("```"):
                    class_text = class_text[3:-3].strip()
                class_data = json.loads(class_text)
                doc_type = class_data.get("document_type", "unknown").lower()
            except:
                doc_type = "unknown"
                
            print(f"[DEBUG] di_documents classified as: {doc_type}")
        
        # --- Step 2: Specialized Extraction ---
        if doc_type == "bank_statement":
            print(f"[DEBUG] Using dedicated BankStatementParser for {doc_data['original_filename']}")
            from services.bank_statement_parser import BankStatementParser
            from services.groq_pool import GroqPool
            import google.generativeai as genai
            
            gemini_model = genai.GenerativeModel(GEMINI_MODEL)
            parser = BankStatementParser(gemini_model, GroqPool.execute)
            
            if extracted_text:
                print("[DEBUG] Using Sarvam text with Llama-3.3-70b parser")
                analysis_data = await parser.parse_text(extracted_text, doc_data['original_filename'])
            else:
                print("[DEBUG] Falling back to Gemini Vision parser")
                analysis_data = await parser.parse_vision(file_bytes, doc_data['mime_type'], doc_data['original_filename'])
                
            predicted_label = "bank_statement"
            overall_confidence = 0.99
            analysis_data["analysis"] = "Bank Statement parsed successfully using dedicated extraction module."
            
            # Formatting as required by di_analysis_notes / ExtractedDataTab
            analysis_data["document_type"] = "bank_statement"
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
                GEMINI_MODEL,
                system_instruction=system_prompt,
                generation_config={"response_mime_type": "application/json", "temperature": 0.1}
            )
            
            extraction_prompt = "Extract the financial details from this document."
            if extracted_text:
                extraction_prompt = f"Here is the high-quality OCR text from Sarvam AI:\n\n{extracted_text[:80000]}\n\n" + extraction_prompt
                
            response = model.generate_content([
                document_part,
                extraction_prompt
            ])
                
            analysis_text = response.text.strip()
            if analysis_text.startswith("```json"):
                analysis_text = analysis_text[7:-3].strip()
            elif analysis_text.startswith("```"):
                analysis_text = analysis_text[3:-3].strip()
            analysis_data = json.loads(analysis_text)
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
        
        # Phase 1: Map unstructured JSON to strict UFO structure
        ufo = UFOMapper.normalize(analysis_data)
        
        supabase.table("di_analysis_notes").insert({
            "document_id": document_id,
            "classification_type": predicted_label.lower(),
            "extracted_data": analysis_data,
            "reasoning": analysis_data.get("analysis", ""),
            "confidence": overall_confidence,
            "document_type": ufo.get("document_type"),
            "parties": ufo.get("parties"),
            "money": ufo.get("money"),
            "taxes": ufo.get("taxes"),
            "dates": ufo.get("dates"),
            "line_items": ufo.get("line_items")
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
        update_payload = {}
        if "extracted_data" in payload:
            update_payload["extracted_data"] = payload["extracted_data"]
        
        # Also allow updating UFO columns
        for col in ["document_type", "parties", "money", "taxes", "dates", "line_items"]:
            if col in payload:
                update_payload[col] = payload[col]

        if update_payload:
            supabase.table("di_analysis_notes").update(update_payload).eq("document_id", document_id).execute()
        
        supabase.table("di_document_processing_logs").insert({
            "document_id": document_id,
            "stage": "user_edit",
            "provider": "user",
            "status": "success"
        }).execute()
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
