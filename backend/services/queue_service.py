import os
import json
import redis
import asyncio
import traceback
from supabase_client import supabase
from services.ai_service import ai_service
import zipfile
import io
import uuid
import mimetypes


# Redis connection details
REDIS_HOST = os.environ.get("REDIS_HOST", "127.0.0.1")
REDIS_PORT = int(os.environ.get("REDIS_PORT", 6379))
REDIS_DB = int(os.environ.get("REDIS_DB", 0))

# Fallback memory queue
memory_queue = asyncio.Queue()

# Thread-safe local status checking
active_redis = False

def is_redis_available():
    global active_redis
    try:
        r = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, db=REDIS_DB, socket_timeout=1)
        r.ping()
        active_redis = True
        return True
    except Exception:
        active_redis = False
        return False

async def enqueue_document(doc_id: str):
    """
    Enqueues a document ID for background processing.
    """
    # 1. Update status to 'uploaded' initially
    try:
        supabase.table("workbench_documents").update({"status": "uploaded"}).eq("id", doc_id).execute()
    except Exception as e:
        print(f"[QUEUE ERROR] Failed to update status to uploaded for doc {doc_id}: {e}")

    # 2. Try Redis queue
    loop = asyncio.get_event_loop()
    def push_to_redis():
        r = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, db=REDIS_DB, socket_timeout=1)
        r.rpush("dabby_doc_queue", doc_id)
        
    try:
        if is_redis_available():
            await loop.run_in_executor(None, push_to_redis)
            print(f"[QUEUE] Document {doc_id} successfully queued in Redis")
            return
    except Exception as e:
        print(f"[QUEUE WARNING] Redis push failed: {e}")
        
    # 3. Fallback to in-memory queue
    print(f"[QUEUE] Redis offline. Enqueuing doc {doc_id} in-memory.")
    await memory_queue.put(doc_id)

async def auto_record_ledger_from_ocr(doc_id: str, doc: dict, extracted: dict):
    """
    Directly extracts the business event type from document scanning and records a balanced
    double-entry transaction using ledger_service, then creates an audit log of it.
    """
    try:
        from services.ledger_service import LedgerService
        ledger_service = LedgerService(supabase)
        
        workbench_id = doc["workbench_id"]
        
        # 1. Parse document type & map to Business Event Type
        raw_doc_type = extracted.get("document_type") or doc.get("document_type") or "expense_receipt"
        doc_type = raw_doc_type.lower()
        
        # Map to internal business event
        # Invoice -> Customer Sale
        # Bank Statement -> Customer Payment
        # Payroll -> Salary Paid
        # Expense -> Expense Paid
        event_type = "Expense Paid"
        if "invoice" in doc_type or "sales_invoice" in doc_type or "sales_order" in doc_type:
            event_type = "Customer Sale"
        elif "bank_statement" in doc_type or "customer_payment_receipt" in doc_type or "bank" in doc_type:
            event_type = "Customer Payment"
        elif "payroll" in doc_type or "salary" in doc_type:
            event_type = "Salary Paid"
        
        # 2. Fetch all labels (COA accounts)
        labels = await ledger_service.get_labels(workbench_id)
        if not labels:
            print(f"[WARNING] No COA labels found for workbench {workbench_id}. Cannot post ledger entries.")
            return
            
        # Helper to find a label by criteria
        def find_label(type_filter, keywords, sub_account_filter=None):
            # 1. Try matching sub_account specifically if provided
            if sub_account_filter:
                for l in labels:
                    if l["type"] == type_filter and l.get("sub_account") == sub_account_filter:
                        return l
            # 2. Try matching keywords in account name
            for l in labels:
                if l["type"] == type_filter:
                    name_lower = l["name"].lower()
                    if any(kw in name_lower for kw in keywords):
                        return l
            # 3. Fallback to any label of the target type
            for l in labels:
                if l["type"] == type_filter:
                    return l
            return None

        # Resolve debit/credit labels based on event type
        debit_label = None
        credit_label = None
        
        cash_bank_label = find_label("asset", ["cash", "bank", "checking", "savings", "liquidity"], "Cash & Cash Equivalents") or find_label("asset", ["cash", "bank"])
        revenue_label = find_label("revenue", ["operating", "sales", "revenue", "income"], "Operating Revenue") or find_label("revenue", ["revenue", "income"])
        ar_label = find_label("asset", ["receivable", "ar"], "Accounts Receivable (AR)") or cash_bank_label
        salaries_label = find_label("expense", ["salary", "wage", "payroll", "employee"], "Salaries & Wages") or find_label("expense", ["salary", "wage"])
        expense_label = find_label("expense", ["expense", "purchase", "cogs", "utilities", "software"]) or find_label("expense", [])
        
        if event_type == "Customer Sale":
            debit_label = cash_bank_label
            credit_label = revenue_label
        elif event_type == "Customer Payment":
            debit_label = cash_bank_label
            credit_label = ar_label
        elif event_type == "Salary Paid":
            debit_label = salaries_label
            credit_label = cash_bank_label
        else: # Expense Paid
            debit_label = expense_label
            credit_label = cash_bank_label

        if not debit_label or not credit_label:
            print(f"[WARNING] Could not resolve both debit and credit labels for {event_type}. Debit: {debit_label}, Credit: {credit_label}")
            return

        # 3. Extract financials
        financials = extracted.get("financials") or {}
        total_amount = financials.get("total_amount") or financials.get("total") or extracted.get("amount") or 0.0
        try:
            total_amount = float(total_amount)
        except (ValueError, TypeError):
            total_amount = 0.0
            
        if total_amount <= 0:
            total_amount = 1000.0 # Fallback default

        # 4. Extract metadata references
        doc_meta = extracted.get("document_metadata") or {}
        doc_date_str = doc_meta.get("document_date") or doc_meta.get("date")
        tx_date = None
        if doc_date_str:
            try:
                from datetime import datetime
                tx_date = datetime.strptime(doc_date_str[:10], "%Y-%m-%d").date()
            except Exception:
                tx_date = None
                
        parties = extracted.get("parties") or {}
        counterparty_name = parties.get("customer_name") or parties.get("vendor_name") or "Unknown"
        
        references = extracted.get("references") or {}
        invoice_number = references.get("invoice_number") or references.get("reference") or ""
        
        # Format description
        description = f"{event_type}"
        if counterparty_name and counterparty_name != "Unknown":
            description += f" - {counterparty_name}"
        if invoice_number:
            description += f" (Inv #{invoice_number})"
        
        # 5. Record strict double-entry transaction
        tx_res = await ledger_service.record_transaction(
            workbench_id=workbench_id,
            from_label_id=credit_label["id"],
            to_label_id=debit_label["id"],
            amount=total_amount,
            description=description,
            transaction_date=tx_date,
            invoice_id=doc_id
        )
        
        tx_id = tx_res["transaction"]["id"]
        
        # 6. Update document's transaction link in supabase
        supabase.table("workbench_documents").update({
            "transaction_id": tx_id
        }).eq("id", doc_id).execute()
        
        # 7. Create audit log
        audit_payload = {
            "trade_id": None,
            "activity_id": None,
            "user_id": None,
            "action": "AUTO_DOCUMENT_INGESTION",
            "old_value": {},
            "new_value": {
                "transaction_id": tx_id,
                "event_type": event_type,
                "amount": total_amount,
                "debit_label": debit_label["name"],
                "credit_label": credit_label["name"],
                "counterparty": counterparty_name,
                "invoice_number": invoice_number
            },
            "metadata": {
                "message": f"Successfully processed {doc['filename']}: Created {event_type} journal entry. Debit {debit_label['name']} (+{total_amount}), Credit {credit_label['name']} (+{total_amount}).",
                "counterparty": counterparty_name,
                "reference": invoice_number
            }
        }
        supabase.table("audit_logs").insert(audit_payload).execute()
        print(f"[WORKER] Successfully auto-recorded ledger transaction {tx_id} for doc {doc_id}")
        
    except Exception as tx_err:
        print(f"[WORKER ERROR] Failed to record ledger transaction: {tx_err}")
        traceback.print_exc()

async def process_queued_document(doc_id: str):
    """
    Downloads file from Supabase storage, runs LLM / Vision OCR scan,
    and records the extracted json note under metadata.
    """
    print(f"[WORKER] Starting processing of document {doc_id}...")
    try:
        # 1. Fetch document metadata
        doc_res = supabase.table("workbench_documents").select("*").eq("id", doc_id).single().execute()
        doc = doc_res.data
        if not doc:
            print(f"[WORKER ERROR] Document {doc_id} not found in database")
            return

        # Check if the document has already been OCR-scanned
        metadata = doc.get("metadata") or {}
        extracted = metadata.get("extracted_invoice")
        doc_type = doc.get("document_type")

        # Update status to 'processing'
        supabase.table("workbench_documents").update({"status": "processing"}).eq("id", doc_id).execute()

        if extracted and doc_type:
            print(f"[WORKER] Document {doc_id} already has OCR data. Proceeding directly to Ruleset Engine.")
        else:
            # 2. Download file content from Storage
            path = doc["file_path"]
            file_data = supabase.storage.from_("Doc_vault_Raw").download(path)
            
            # Check if the document is a ZIP file
            if doc.get("mime_type") == "application/zip" or doc["filename"].endswith(".zip"):
                print(f"[WORKER] Found ZIP file: {doc['filename']}. Extracting files...")
                workbench_id = doc["workbench_id"]
                # Open Zip File
                with zipfile.ZipFile(io.BytesIO(file_data)) as z:
                    for file_info in z.infolist():
                        if file_info.is_dir():
                            continue
                        
                        filename = os.path.basename(file_info.filename)
                        if not filename:
                            continue
                        
                        # Read file content
                        extracted_file_bytes = z.read(file_info)
                        
                        # Generate a unique path in Supabase storage
                        file_ext = filename.split('.')[-1] if '.' in filename else ''
                        random_name = f"{uuid.uuid4().hex}.{file_ext}" if file_ext else uuid.uuid4().hex
                        filePath = f"{workbench_id}/{random_name}"
                        
                        # Upload to storage
                        supabase.storage.from_("Doc_vault_Raw").upload(filePath, extracted_file_bytes)
                        
                        # Get mime type
                        mime_type, _ = mimetypes.guess_type(filename)
                        if not mime_type:
                            mime_type = "application/octet-stream"
                        
                        # Insert doc payload
                        doc_payload = {
                            "workbench_id": workbench_id,
                            "filename": filename,
                            "file_path": filePath,
                            "file_size": len(extracted_file_bytes),
                            "mime_type": mime_type,
                            "status": "uploaded",
                            "metadata": {"parent_zip": doc_id}
                        }
                        
                        new_doc_res = supabase.table("workbench_documents").insert(doc_payload).execute()
                        if new_doc_res.data:
                            new_doc_id = new_doc_res.data[0]["id"]
                            await enqueue_document(new_doc_id)
                
                # Set parent ZIP status to processed
                supabase.table("workbench_documents").update({
                    "status": "analyzed",
                    "metadata": {**doc.get("metadata", {}), "extracted": True, "message": "ZIP file extracted"}
                }).eq("id", doc_id).execute()
                
                print(f"[WORKER] ZIP file {doc_id} extracted successfully")
                return
            
            # 3. Run AI scanner
            extracted = await ai_service.scan_document_vision(
                file_bytes=file_data,
                mime_type=doc.get("mime_type", "image/png"),
                filename=doc["filename"]
            )
            
            print(f"[WORKER] Successfully scanned {doc['filename']}. Type={extracted.get('document_type')}")
            
            # 4. Update status, type, and record the json note under metadata
            doc_type = extracted.get("document_type", doc.get("document_type", "expense_receipt"))
            
            # Calculate document hash to detect duplicates
            import hashlib
            file_hash = hashlib.md5(file_data).hexdigest()
            
            # Check for duplicates in the same workbench
            dup_res = supabase.table("workbench_documents")\
                .select("id, filename")\
                .eq("workbench_id", doc["workbench_id"])\
                .neq("id", doc_id)\
                .eq("metadata->>file_hash", file_hash)\
                .execute()
                
            is_duplicate = len(dup_res.data) > 0
            override_duplicate = doc.get("metadata", {}).get("override_duplicate") == True
            
            updated_metadata = {
                **doc.get("metadata", {}), 
                "extracted_invoice": extracted,
                "file_hash": file_hash
            }
            if is_duplicate:
                updated_metadata["is_duplicate"] = True
                
            supabase.table("workbench_documents").update({
                "document_type": doc_type,
                "metadata": updated_metadata
            }).eq("id", doc_id).execute()
            
            # OCR Confidence Check
            confidence = float(extracted.get("confidence") or 1.0)
            if confidence < 0.8:
                supabase.table("workbench_documents").update({
                    "status": "Needs Review",
                    "metadata": {**updated_metadata, "error": f"Low OCR confidence ({confidence*100:.1f}%) below 80% threshold."}
                }).eq("id", doc_id).execute()
                print(f"[WORKER] Skipped execution for doc {doc_id}: low confidence")
                return

            # Duplicate check enforcement
            if is_duplicate and not override_duplicate:
                supabase.table("workbench_documents").update({
                    "status": "Needs Review",
                    "metadata": {**updated_metadata, "error": f"Duplicate document. Match found: {dup_res.data[0]['filename']}."}
                }).eq("id", doc_id).execute()
                print(f"[WORKER] Skipped execution for doc {doc_id}: duplicate detected")
                return

        # 5. Route to unified Trade Engine Pipeline (Stages 2-9)
        print(f"[WORKER] Routing document {doc_id} to 12-stage Trade Engine Pipeline...")
        from services.trade_service import trade_service
        trade = await trade_service.create_trade_from_document(doc_id)
        
        # Link document's transaction status to match trade status
        final_doc_status = "processed" if trade["status"] == "Ready" else "Needs Review"
        supabase.table("workbench_documents").update({
            "status": final_doc_status
        }).eq("id", doc_id).execute()
        
        print(f"[WORKER] Finished processing doc {doc_id}. Trade ID: {trade['id']}, Trade Status: {trade['status']}, Doc Status: {final_doc_status}")
        
    except Exception as e:
        print(f"[WORKER ERROR] Processing of doc {doc_id} failed: {e}")
        try:
            supabase.table("workbench_documents").update({
                "status": "failed",
                "metadata": {**(doc.get("metadata") or {}), "error": str(e)}
            }).eq("id", doc_id).execute()
        except Exception as update_err:
            print(f"[WORKER ERROR] Failed to set status to failed: {update_err}")

async def queue_worker():
    """
    Continuous worker loop that pulls from Redis queue and fallback memory queue.
    """
    print("[WORKER] Background queue worker starting...")
    loop = asyncio.get_event_loop()
    
    def pop_from_redis():
        r = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, db=REDIS_DB, socket_timeout=1)
        res = r.blpop("dabby_doc_queue", timeout=2)
        if res:
            return res[1].decode('utf-8')
        return None

    while True:
        try:
            doc_id = None
            
            # 1. Try pulling from Redis first if available
            if is_redis_available():
                try:
                    doc_id = await loop.run_in_executor(None, pop_from_redis)
                except Exception as e:
                    print(f"[WORKER WARNING] Redis pop error: {e}")
            
            # 2. If no Redis item, try pulling from Memory Queue (non-blocking)
            if not doc_id:
                try:
                    doc_id = memory_queue.get_nowait()
                    memory_queue.task_done()
                except asyncio.QueueEmpty:
                    pass
            
            # 3. If item found, process it
            if doc_id:
                await process_queued_document(doc_id)
            else:
                # Idle delay if no jobs
                await asyncio.sleep(1)
                
        except Exception as e:
            print(f"[WORKER LOOP ERROR] {e}")
            traceback.print_exc()
            await asyncio.sleep(2)

def start_worker():
    """
    Launches the background queue worker task.
    """
    asyncio.create_task(queue_worker())
