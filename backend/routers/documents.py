"""
Document Extraction Router — /api/documents

Endpoints for the Accounting Document Extraction Engine.
Accepts documents via Supabase doc_id or direct multipart upload,
runs the 13-step extraction pipeline, and returns structured JSON.
"""

from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from typing import Optional, Dict
import uuid

from supabase_client import supabase
from services.document_extraction_service import extraction_service
from services.intent_service import intent_engine
from services.journal_generator import journal_generator

router = APIRouter()


@router.post("/extract/{doc_id}")
async def extract_from_stored_document(doc_id: str):
    """
    Extract structured data from a document already stored in Supabase.
    Fetches the file from Doc_vault_Raw, runs extraction, and saves
    the result back into the document's metadata.
    """
    try:
        # 1. Fetch document metadata from DB
        doc_res = supabase.table("workbench_documents").select("*").eq("id", doc_id).single().execute()
        doc = doc_res.data
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found")

        print(f"[EXTRACT] Processing stored document: {doc_id}")
        print(f"[EXTRACT] Filename: {doc.get('filename')}, MIME: {doc.get('mime_type')}")

        # 2. Download file from Supabase Storage
        try:
            path = doc["file_path"]
            file_data = supabase.storage.from_("Doc_vault_Raw").download(path)
        except Exception as storage_err:
            print(f"[ERROR] Storage download failed for {path}: {storage_err}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to retrieve document from storage: {str(storage_err)}"
            )

        # 3. Run the 13-step extraction engine
        extracted = await extraction_service.extract(
            file_bytes=file_data,
            mime_type=doc.get("mime_type", "application/octet-stream"),
            filename=doc["filename"],
        )

        # 4. Save extracted data back to document metadata
        try:
            existing_meta = doc.get("metadata", {}) or {}
            supabase.table("workbench_documents").update({
                "metadata": {**existing_meta, "extraction": extracted},
                "status": "processed",
            }).eq("id", doc_id).execute()
        except Exception as db_err:
            print(f"[WARNING] Failed to save extraction to document metadata: {db_err}")
            # Non-fatal — we still return the extracted data

        return extracted

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"[ERROR] extract_from_stored_document CRASH: {e}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Extraction Engine Error: {str(e)}")


@router.post("/extract-upload")
async def extract_from_upload(
    file: UploadFile = File(...),
    workbench_id: Optional[str] = Form(None),
):
    """
    Extract structured data from a directly uploaded file.
    Optionally stores the document in Supabase first if workbench_id
    is provided.
    """
    try:
        file_bytes = await file.read()
        mime_type = file.content_type or "application/octet-stream"
        filename = file.filename or "uploaded_document"

        print(f"[EXTRACT] Direct upload: {filename} ({mime_type}, {len(file_bytes)} bytes)")

        # Optionally store in Supabase
        doc_id = None
        if workbench_id:
            try:
                storage_path = f"{workbench_id}/{filename}"
                supabase.storage.from_("Doc_vault_Raw").upload(
                    storage_path, file_bytes,
                    {"content-type": mime_type}
                )

                doc_res = supabase.table("workbench_documents").insert({
                    "workbench_id": workbench_id,
                    "filename": filename,
                    "file_path": storage_path,
                    "file_size": len(file_bytes),
                    "mime_type": mime_type,
                    "status": "processing",
                }).execute()

                if doc_res.data:
                    doc_id = doc_res.data[0]["id"]
            except Exception as store_err:
                print(f"[WARNING] Failed to store uploaded document: {store_err}")
                # Non-fatal — extraction can still proceed

        # Run the 13-step extraction engine
        extracted = await extraction_service.extract(
            file_bytes=file_bytes,
            mime_type=mime_type,
            filename=filename,
        )

        # Update stored document with extraction results
        if doc_id:
            try:
                supabase.table("workbench_documents").update({
                    "metadata": {"extraction": extracted},
                    "status": "processed",
                }).eq("id", doc_id).execute()
            except Exception as db_err:
                print(f"[WARNING] Failed to update document metadata: {db_err}")

        # Include doc_id in response if document was stored
        if doc_id:
            extracted["doc_id"] = doc_id

        return extracted

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"[ERROR] extract_from_upload CRASH: {e}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Extraction Engine Error: {str(e)}")


async def run_pipeline(
    file_bytes: bytes,
    mime_type: str,
    filename: str,
    workbench_id: Optional[str] = None,
    doc_id: Optional[str] = None,
) -> Dict:
    """
    Core pipeline: OCR extraction -> Intent classification -> double-entry Journal Generation.
    If workbench_id is provided, also creates a staging log entry in workbench_records.
    """
    # 1. OCR Extraction (13-step)
    extracted = await extraction_service.extract(
        file_bytes=file_bytes,
        mime_type=mime_type,
        filename=filename,
    )

    # 2. Accounting Intent Engine
    accounting_event = await intent_engine.classify_intent(
        ocr_json=extracted,
        document_id=doc_id or "",
    )

    # 3. Journal Generator
    coa_labels = []
    party_list = []
    if workbench_id:
        try:
            from services.ledger_service import LedgerService
            ledger_service = LedgerService(supabase)
            coa_labels = await ledger_service.get_labels(workbench_id)
            parties_res = supabase.table("parties").select("*").eq("workbench_id", workbench_id).execute()
            party_list = parties_res.data or []
        except Exception as e:
            print(f"[WARNING] Failed to fetch COA/parties: {e}")

    draft_journal = await journal_generator.generate_journal(
        event_json=accounting_event,
        coa_labels=coa_labels,
        party_list=party_list,
        document_id=doc_id or "",
        event_id=accounting_event.get("id", ""),
    )

    # Resolve party ID
    party_id = None
    party_name = None
    if accounting_event.get("party"):
        for role in ["customer", "vendor", "employee", "investor", "lender"]:
            val = accounting_event["party"].get(role)
            if val:
                party_name = val
                break
    if party_name and party_list:
        name_lower = party_name.lower().strip()
        for p in party_list:
            if p.get("name") and p["name"].lower().strip() == name_lower:
                party_id = p["id"]
                break

    # 4. Save to workbench_records if workbench_id is provided
    record_id = None
    if workbench_id:
        try:
            metadata = extracted.get("metadata") or {}
            financials = extracted.get("financials") or {}
            payment_details = extracted.get("payment_details") or {}

            # Handle parsing and defaulting of numeric amounts
            gross = financials.get("total_amount")
            tax = financials.get("tax_amount")
            net = financials.get("subtotal") or (gross - tax if (gross is not None and tax is not None) else None)

            record_payload = {
                "workbench_id": workbench_id,
                "record_type": accounting_event.get("event_type") or "unknown",
                "reference_id": doc_id or str(uuid.uuid4()),
                "summary": draft_journal.get("description") or f"Draft transaction for {filename}",
                "document_id": doc_id,
                "gross_amount": gross,
                "tax_amount": tax,
                "net_amount": net,
                "issue_date": metadata.get("document_date"),
                "due_date": payment_details.get("due_date"),
                "status": "draft",
                "confidence_score": accounting_event.get("confidence") or 0.0,
                "party_id": party_id,
                "metadata": {
                    "ocr_extraction": extracted,
                    "accounting_event": accounting_event,
                    "draft_journal": draft_journal,
                },
            }

            # Convert date strings to standard YYYY-MM-DD
            for date_key in ["issue_date", "due_date"]:
                if record_payload[date_key] and len(record_payload[date_key]) > 10:
                    record_payload[date_key] = record_payload[date_key][:10]

            record_res = supabase.table("workbench_records").insert(record_payload).execute()
            if record_res.data:
                record_id = record_res.data[0]["id"]
                print(f"[PIPELINE] Draft record logged in workbench_records: {record_id}")
        except Exception as db_err:
            print(f"[WARNING] Failed to insert staging log in workbench_records: {db_err}")

    return {
        "ocr_extraction": extracted,
        "accounting_event": accounting_event,
        "draft_journal": draft_journal,
        "record_id": record_id,
    }


@router.post("/process-pipeline/{doc_id}")
async def process_stored_pipeline(doc_id: str):
    """
    Process a stored document through the entire Accounting pipeline:
    OCR extraction -> Intent classification -> draft Journal Generation -> Stage Log.
    """
    try:
        # Fetch document metadata
        doc_res = supabase.table("workbench_documents").select("*").eq("id", doc_id).single().execute()
        doc = doc_res.data
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found")

        print(f"[PIPELINE] Processing stored document: {doc_id}")

        # Download from storage
        try:
            path = doc["file_path"]
            file_data = supabase.storage.from_("Doc_vault_Raw").download(path)
        except Exception as storage_err:
            print(f"[ERROR] Storage download failed for {path}: {storage_err}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to retrieve document from storage: {str(storage_err)}"
            )

        # Run pipeline
        res = await run_pipeline(
            file_bytes=file_data,
            mime_type=doc.get("mime_type", "application/octet-stream"),
            filename=doc["filename"],
            workbench_id=doc["workbench_id"],
            doc_id=doc_id,
        )

        # Update stored document status
        try:
            existing_meta = doc.get("metadata", {}) or {}
            supabase.table("workbench_documents").update({
                "metadata": {
                    **existing_meta,
                    "extraction": res["ocr_extraction"],
                    "accounting_event": res["accounting_event"],
                    "draft_journal": res["draft_journal"],
                    "record_id": res["record_id"],
                },
                "status": "processed",
            }).eq("id", doc_id).execute()
        except Exception as db_err:
            print(f"[WARNING] Failed to save pipeline data to document: {db_err}")

        return res

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"[ERROR] process_stored_pipeline CRASH: {e}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Pipeline Error: {str(e)}")


@router.post("/process-pipeline-upload")
async def process_upload_pipeline(
    file: UploadFile = File(...),
    workbench_id: Optional[str] = Form(None),
):
    """
    Process a directly uploaded file through the entire Accounting pipeline.
    """
    try:
        file_bytes = await file.read()
        mime_type = file.content_type or "application/octet-stream"
        filename = file.filename or "uploaded_document"

        print(f"[PIPELINE] Direct upload: {filename} ({mime_type})")

        # Optionally store in Supabase Storage & DB first
        doc_id = None
        if workbench_id:
            try:
                storage_path = f"{workbench_id}/{filename}"
                supabase.storage.from_("Doc_vault_Raw").upload(
                    storage_path, file_bytes,
                    {"content-type": mime_type}
                )

                doc_res = supabase.table("workbench_documents").insert({
                    "workbench_id": workbench_id,
                    "filename": filename,
                    "file_path": storage_path,
                    "file_size": len(file_bytes),
                    "mime_type": mime_type,
                    "status": "processing",
                }).execute()

                if doc_res.data:
                    doc_id = doc_res.data[0]["id"]
            except Exception as store_err:
                print(f"[WARNING] Failed to store uploaded document: {store_err}")

        # Run pipeline
        res = await run_pipeline(
            file_bytes=file_bytes,
            mime_type=mime_type,
            filename=filename,
            workbench_id=workbench_id,
            doc_id=doc_id,
        )

        # Update stored document
        if doc_id:
            try:
                supabase.table("workbench_documents").update({
                    "metadata": {
                        "extraction": res["ocr_extraction"],
                        "accounting_event": res["accounting_event"],
                        "draft_journal": res["draft_journal"],
                        "record_id": res["record_id"],
                    },
                    "status": "processed",
                }).eq("id", doc_id).execute()
            except Exception as db_err:
                print(f"[WARNING] Failed to update document: {db_err}")
            res["doc_id"] = doc_id

        return res

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"[ERROR] process_upload_pipeline CRASH: {e}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Pipeline Error: {str(e)}")


@router.post("/confirm-record")
async def confirm_record(payload: Dict):
    """
    Confirms a staging record from workbench_records and posts it to the ledger.
    """
    from datetime import date
    record_id = payload.get("record_id")
    if not record_id:
        raise HTTPException(status_code=400, detail="Missing record_id")
    
    # 1. Fetch staging record
    try:
        record_res = supabase.table("workbench_records").select("*").eq("id", record_id).single().execute()
        record = record_res.data
    except Exception as fetch_err:
        print(f"[ERROR] Failed to fetch staging record: {fetch_err}")
        raise HTTPException(status_code=500, detail=f"Database fetch error: {str(fetch_err)}")
        
    if not record:
        raise HTTPException(status_code=404, detail="Staging record not found")
        
    if record.get("status") != "draft":
        raise HTTPException(status_code=400, detail=f"Record is already in status: {record.get('status')}")
        
    # 2. Extract journal
    meta = record.get("metadata") or {}
    draft_journal = meta.get("draft_journal") or {}
    entries = draft_journal.get("entries") or []
    
    if not entries:
        raise HTTPException(status_code=400, detail="Draft journal has no entries to post")
        
    # 3. Compute totals and balance
    try:
        debits = [e for e in entries if e.get("entry_type") == "Debit"]
        credits = [e for e in entries if e.get("entry_type") == "Credit"]
        
        total_debits = sum(float(e.get("amount") or 0) for e in debits)
        total_credits = sum(float(e.get("amount") or 0) for e in credits)
    except Exception as parse_err:
        raise HTTPException(status_code=400, detail=f"Error parsing journal amounts: {str(parse_err)}")
    
    if abs(total_debits - total_credits) > 0.01:
        raise HTTPException(status_code=400, detail=f"Journal is out of balance. Debits: {total_debits}, Credits: {total_credits}")
        
    if total_debits == 0:
        raise HTTPException(status_code=400, detail="Journal total amount cannot be zero")

    # Determine source/destination parties
    source_party_id = None
    destination_party_id = None
    for e in credits:
        if e.get("party"):
            source_party_id = e["party"]
            break
    for e in debits:
        if e.get("party"):
            destination_party_id = e["party"]
            break
            
    # 4. Insert Transaction Header
    tx_payload = {
        "workbench_id": record["workbench_id"],
        "description": draft_journal.get("description") or record.get("summary") or "Posted from staging review",
        "transaction_date": draft_journal.get("transaction_date") or record.get("issue_date") or str(date.today()),
        "source_party_id": source_party_id,
        "destination_party_id": destination_party_id,
    }
    
    # Clean transaction_date if it has time suffix
    if tx_payload["transaction_date"] and len(tx_payload["transaction_date"]) > 10:
        tx_payload["transaction_date"] = tx_payload["transaction_date"][:10]
        
    try:
        tx_res = supabase.table("transactions").insert(tx_payload).execute()
        if not tx_res.data:
            raise Exception("No data returned from transaction insert")
        tx_id = tx_res.data[0]["id"]
    except Exception as tx_err:
        print(f"[ERROR] Failed to insert transaction header: {tx_err}")
        raise HTTPException(status_code=500, detail=f"Failed to create transaction: {str(tx_err)}")
    
    # 5. Insert Transaction Entries
    # Debits are positive, Credits are negative
    db_entries = []
    for e in entries:
        amount = float(e["amount"])
        if e.get("entry_type") == "Credit":
            amount = -amount
            
        db_entries.append({
            "transaction_id": tx_id,
            "label_id": e["label"],
            "amount": amount
        })
        
    try:
        entries_res = supabase.table("transaction_entries").insert(db_entries).execute()
        if not entries_res.data:
            raise Exception("No data returned from transaction entries insert")
    except Exception as entries_err:
        print(f"[ERROR] Failed to insert transaction entries: {entries_err}")
        # Attempt to roll back the header
        try:
            supabase.table("transactions").delete().eq("id", tx_id).execute()
        except Exception as rb_err:
            print(f"[WARNING] Rollback failed: {rb_err}")
        raise HTTPException(status_code=500, detail=f"Failed to create ledger entries: {str(entries_err)}")
        
    # 6. Link Document
    doc_id = record.get("document_id")
    if doc_id:
        try:
            supabase.table("workbench_documents").update({
                "transaction_id": tx_id,
                "status": "processed"
            }).eq("id", doc_id).execute()
        except Exception as doc_err:
            print(f"[WARNING] Failed to link transaction {tx_id} to document {doc_id}: {doc_err}")
            
    # 7. Update staging record status to 'confirmed'
    new_metadata = {**meta, "posted_transaction_id": tx_id}
    try:
        supabase.table("workbench_records").update({
            "status": "confirmed",
            "metadata": new_metadata
        }).eq("id", record_id).execute()
    except Exception as record_update_err:
        print(f"[WARNING] Failed to update staging record status: {record_update_err}")
    
    return {
        "status": "success",
        "transaction_id": tx_id,
        "entries_count": len(db_entries)
    }


