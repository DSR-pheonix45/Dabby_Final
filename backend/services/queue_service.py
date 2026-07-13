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

# ── Phase 1: New pipeline services ────────────────────────────────────────────
from services.document_classifier import DocumentClassifier
from services.analysis_note_service import AnalysisNoteService
from services.bank_statement_parser import BankStatementParser
from services.groq_pool import GroqPool

# Initialise pipeline services (injected with dependencies)
_bank_parser = BankStatementParser(
    gemini_model=ai_service.gemini_model,
    groq_pool_execute=GroqPool.execute,
)
_document_classifier = DocumentClassifier(
    groq_pool_execute=GroqPool.execute,
    gemini_model=ai_service.gemini_model,
)
_analysis_note_service = AnalysisNoteService(bank_statement_parser=_bank_parser)


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
        supabase.table("user_documents").update({"status": "uploaded"}).eq("id", doc_id).execute()
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

async def process_queued_document(doc_id: str):
    """
    Parallel page-by-page worker task implementing a fault-tolerant processing pipeline.
    """
    print(f"[WORKER] Starting processing of document {doc_id}...")
    import time
    import hashlib
    try:
        # Fetch document metadata
        doc_res = supabase.table("user_documents").select("*").eq("id", doc_id).single().execute()
        doc = doc_res.data
        if not doc:
            print(f"[WORKER ERROR] Document {doc_id} not found in database")
            return

        meta = doc.get("metadata") or {}
        
        # State: VALIDATING
        meta["job_state"] = "VALIDATING"
        supabase.table("user_documents").update({
            "status": "VALIDATING",
            "metadata": meta
        }).eq("id", doc_id).execute()

        # Download file content from Storage
        path = doc["file_path"]
        file_data = supabase.storage.from_("Doc_vault_Raw").download(path)

        # Generate SHA256 hash for duplicate check & caching
        file_hash = hashlib.sha256(file_data).hexdigest()
        meta["file_hash"] = file_hash

        # Cache Check (Phase 13)
        cache_res = supabase.table("user_documents")\
            .select("*")\
            .eq("user_id", doc["user_id"])\
            .neq("id", doc_id)\
            .in_("status", ["processed", "COMPLETED"])\
            .eq("metadata->>file_hash", file_hash)\
            .execute()
            
        if cache_res.data:
            cached_doc = cache_res.data[0]
            cached_meta = cached_doc.get("metadata") or {}
            
            meta["job_state"] = "COMPLETED"
            meta["extracted_invoice"] = cached_meta.get("extracted_invoice")
            meta["bank_statement"] = cached_meta.get("bank_statement")
            meta["cached_from"] = cached_doc["id"]
            
            supabase.table("user_documents").update({
                "status": "processed",
                "document_type": cached_doc.get("document_type"),
                "metadata": meta
            }).eq("id", doc_id).execute()
            
            print(f"[WORKER] Document {doc_id} matched cache: copied results from {cached_doc['id']}")
            
            # TODO: Integrate trade_service when implemented
            # from services.trade_service import trade_service
            # await trade_service.create_trade_from_document(doc_id)
            return

        # Check if the document is a ZIP file (keep existing ZIP logic)
        if doc.get("mime_type") == "application/zip" or doc["filename"].endswith(".zip"):
            print(f"[WORKER] Found ZIP file: {doc['filename']}. Extracting files...")
            user_id = doc["user_id"]
            with zipfile.ZipFile(io.BytesIO(file_data)) as z:
                for file_info in z.infolist():
                    if file_info.is_dir():
                        continue
                    
                    filename = os.path.basename(file_info.filename)
                    if not filename:
                        continue
                    
                    extracted_file_bytes = z.read(file_info)
                    file_ext = filename.split('.')[-1] if '.' in filename else ''
                    random_name = f"{uuid.uuid4().hex}.{file_ext}" if file_ext else uuid.uuid4().hex
                    filePath = f"{user_id}/{random_name}"
                    
                    supabase.storage.from_("Doc_vault_Raw").upload(filePath, extracted_file_bytes)
                    
                    mime_type, _ = mimetypes.guess_type(filename)
                    if not mime_type:
                        mime_type = "application/octet-stream"
                    
                    doc_payload = {
                        "user_id": user_id,
                        "filename": filename,
                        "file_path": filePath,
                        "file_size": len(extracted_file_bytes),
                        "mime_type": mime_type,
                        "status": "uploaded",
                        "metadata": {"parent_zip": doc_id}
                    }
                    
                    new_doc_res = supabase.table("user_documents").insert(doc_payload).execute()
                    if new_doc_res.data:
                        new_doc_id = new_doc_res.data[0]["id"]
                        await enqueue_document(new_doc_id)
            
            supabase.table("user_documents").update({
                "status": "analyzed",
                "metadata": {**doc.get("metadata", {}), "extracted": True, "message": "ZIP file extracted"}
            }).eq("id", doc_id).execute()
            print(f"[WORKER] ZIP file {doc_id} extracted successfully")
            return

        # Duplicate check enforcement
        dup_res = supabase.table("user_documents")\
            .select("id, filename")\
            .eq("user_id", doc["user_id"])\
            .neq("id", doc_id)\
            .eq("metadata->>file_hash", file_hash)\
            .execute()
            
        is_duplicate = len(dup_res.data) > 0
        override_duplicate = doc.get("metadata", {}).get("override_duplicate") == True
        
        if is_duplicate and not override_duplicate:
            meta["is_duplicate"] = True
            supabase.table("user_documents").update({
                "status": "Needs Review",
                "metadata": {**meta, "error": f"Duplicate document. Match found: {dup_res.data[0]['filename']}."}
            }).eq("id", doc_id).execute()
            print(f"[WORKER] Skipped execution for doc {doc_id}: duplicate detected")
            return

        # Phase 2 & 3: Detect PDF Type and Split Document
        meta["job_state"] = "SPLITTING"
        supabase.table("user_documents").update({
            "status": "SPLITTING",
            "metadata": meta
        }).eq("id", doc_id).execute()

        is_pdf = (doc.get("mime_type") == "application/pdf" or doc["filename"].lower().endswith(".pdf"))
        
        if is_pdf:
            import fitz
            pdf_doc = fitz.open(stream=file_data, filetype="pdf")
            total_pages = pdf_doc.page_count
        else:
            total_pages = 1

        meta["total_pages"] = total_pages
        meta["completed_pages"] = meta.get("completed_pages", 0)
        meta["failed_pages"] = meta.get("failed_pages", 0)
        meta["errors"] = meta.get("errors", [])
        
        if "pages" not in meta:
            meta["pages"] = {}

        # Upload page splits or register them
        for idx in range(total_pages):
            page_num_str = str(idx + 1)
            if page_num_str in meta["pages"] and meta["pages"][page_num_str].get("file_path"):
                continue # Already split
            
            if is_pdf:
                page = pdf_doc[idx]
                text_content = page.get_text()
                is_digital = len(text_content.strip()) > 50
                
                # Split page
                page_pdf = fitz.open()
                page_pdf.insert_pdf(pdf_doc, from_page=idx, to_page=idx)
                page_bytes = page_pdf.write()
                page_pdf.close()
                
                # Upload split
                split_path = f"splits/{doc_id}/page_{page_num_str}.pdf"
                supabase.storage.from_("Doc_vault_Raw").upload(split_path, page_bytes)
                
                meta["pages"][page_num_str] = {
                    "status": "QUEUED",
                    "file_path": split_path,
                    "is_digital": is_digital,
                    "page_text": text_content if is_digital else None,
                    "retry_count": 0
                }
            else:
                meta["pages"][page_num_str] = {
                    "status": "QUEUED",
                    "file_path": doc["file_path"],
                    "is_digital": False,
                    "page_text": None,
                    "retry_count": 0
                }
                
        # Save split status
        supabase.table("user_documents").update({
            "metadata": meta
        }).eq("id", doc_id).execute()

        if is_pdf:
            pdf_doc.close()

        # Phase 4 & 5: Configurable Parallel Processing with Semaphore
        meta["job_state"] = "OCR_RUNNING"
        supabase.table("user_documents").update({
            "status": "OCR_RUNNING",
            "metadata": meta
        }).eq("id", doc_id).execute()

        MAX_PAGE_CONCURRENCY = int(os.environ.get("MAX_PAGE_CONCURRENCY", 8))
        semaphore = asyncio.Semaphore(MAX_PAGE_CONCURRENCY)
        db_lock = asyncio.Lock()
        
        start_ocr_time = time.time()
        if "ocr_start_time" not in meta:
            meta["ocr_start_time"] = start_ocr_time

        # Temporary helper function to save progress in DB
        async def save_progress():
            async with db_lock:
                supabase.table("user_documents").update({
                    "metadata": meta
                }).eq("id", doc_id).execute()

        # Single page worker task
        async def process_page_task(page_num_str: str):
            page_info = meta["pages"][page_num_str]
            if page_info.get("status") == "COMPLETED":
                return # Skip already completed page (resume support)

            async with semaphore:
                page_info["status"] = "PROCESSING"
                await save_progress()
                
                max_retries = 3
                attempt = 0
                base_delay = 2.0
                
                page_file_path = page_info["file_path"]
                is_digital = page_info.get("is_digital", False)
                page_text = page_info.get("page_text")
                inferred_type = doc.get("document_type") or "generic"
                
                # Fetch page content
                if page_file_path != doc["file_path"]:
                    page_bytes = supabase.storage.from_("Doc_vault_Raw").download(page_file_path)
                else:
                    page_bytes = file_data
                    
                while attempt < max_retries:
                    try:
                        # Structured single-page OCR with 30s timeout protection
                        result = await asyncio.wait_for(
                            ai_service.scan_document_page_raw(
                                file_bytes=page_bytes,
                                mime_type="application/pdf" if is_pdf else doc.get("mime_type", "image/png"),
                                filename=f"page_{page_num_str}_{doc['filename']}",
                                is_text=is_digital,
                                page_text=page_text,
                                doc_type=inferred_type
                            ),
                            timeout=30.0
                        )
                        
                        page_info["status"] = "COMPLETED"
                        page_info["result"] = result
                        page_info["retry_count"] = attempt
                        page_info["error"] = None
                        
                        meta["completed_pages"] = sum(1 for p in meta["pages"].values() if p.get("status") == "COMPLETED")
                        
                        # Phase 8: Incremental Aggregation
                        if inferred_type == "bank_statement":
                            agg = ai_service.aggregate_pages(meta["pages"])
                            meta["bank_statement"] = {
                                "statement_summary": agg["statement_summary"],
                                "transactions": agg["transactions"]
                            }
                            # First page summary detection for doc-level mapping
                            if page_num_str == "1":
                                doc_type_detected = "bank_statement"
                        else:
                            agg = ai_service.aggregate_invoice_pages(meta["pages"])
                            meta["extracted_invoice"] = agg
                            
                        # ETA / Stats estimation
                        elapsed = time.time() - start_ocr_time
                        done_count = meta["completed_pages"] + meta["failed_pages"]
                        if done_count > 0:
                            meta["average_time_per_page"] = round(elapsed / done_count, 2)
                            remaining = total_pages - done_count
                            meta["estimated_completion_time"] = round(meta["average_time_per_page"] * remaining, 2)
                            
                        await save_progress()
                        print(f"[WORKER] Page {page_num_str} of doc {doc_id} COMPLETED on attempt {attempt}")
                        return
                        
                    except Exception as e:
                        attempt += 1
                        print(f"[WORKER WARNING] Page {page_num_str} failed (attempt {attempt}/{max_retries}): {e}")
                        if attempt < max_retries:
                            sleep_time = base_delay * (2 ** attempt)
                            await asyncio.sleep(sleep_time)
                        else:
                            # Mark page failed permanently
                            page_info["status"] = "FAILED"
                            page_info["error"] = str(e)
                            page_info["retry_count"] = attempt
                            
                            meta["failed_pages"] = sum(1 for p in meta["pages"].values() if p.get("status") == "FAILED")
                            meta["errors"].append({
                                "page": page_num_str,
                                "error": str(e)
                            })
                            await save_progress()
                            print(f"[WORKER ERROR] Page {page_num_str} of doc {doc_id} permanently FAILED.")

        # Run concurrent workers with document-level timeout protection
        DOCUMENT_TIMEOUT = int(os.environ.get("DOCUMENT_TIMEOUT_SECONDS", 600)) # Default 10 minutes
        page_tasks = [process_page_task(p_num) for p_num in meta["pages"].keys()]
        try:
            await asyncio.wait_for(asyncio.gather(*page_tasks), timeout=float(DOCUMENT_TIMEOUT))
        except asyncio.TimeoutError:
            print(f"[WORKER ERROR] Document {doc_id} execution exceeded time limit of {DOCUMENT_TIMEOUT} seconds. Terminating.")
            # Mark all incomplete pages as FAILED
            for p_num, p_info in meta["pages"].items():
                if p_info.get("status") in ["QUEUED", "PROCESSING"]:
                    p_info["status"] = "FAILED"
                    p_info["error"] = "Document timeout exceeded"
            meta["failed_pages"] = sum(1 for p in meta["pages"].values() if p.get("status") == "FAILED")
            meta["errors"].append({
                "document": "overall",
                "error": f"Document processing timed out after {DOCUMENT_TIMEOUT} seconds."
            })
            await save_progress()
            raise TimeoutError(f"Document processing timed out after {DOCUMENT_TIMEOUT} seconds.")

        # ── Phase 11 & 16: Decoupled post-processing & normalisation ──────────
        inferred_type = doc.get("document_type") or "generic"

        if inferred_type == "bank_statement":
            meta["job_state"] = "NORMALIZING"
            await save_progress()

            agg_raw = ai_service.aggregate_pages(meta["pages"])

            meta["job_state"] = "AGGREGATING"
            await save_progress()

            final_res = await ai_service.post_process_bank_statement(agg_raw)
            meta["bank_statement"] = final_res["bank_statement"]
            aggregated_extraction = final_res
            doc_type = "bank_statement"
        else:
            meta["job_state"] = "NORMALIZING"
            await save_progress()

            aggregated_extraction = ai_service.aggregate_invoice_pages(meta["pages"])
            meta["extracted_invoice"] = aggregated_extraction
            doc_type = aggregated_extraction.get("document_type") or "expense_receipt"

        # ── Phase 1: Document Classification ─────────────────────────────────
        meta["job_state"] = "CLASSIFYING"
        await save_progress()

        try:
            # Build canonical OCR raw output
            ocr_raw = ai_service.build_ocr_raw_output(
                aggregated_extraction=aggregated_extraction,
                pages_meta=meta["pages"],
                extraction_method="aggregated",
            )

            # Run two-pass classifier
            classification = _document_classifier.classify(
                raw_text=ocr_raw["raw_text"],
                filename=doc["filename"],
                mime_type=doc.get("mime_type", ""),
            )
            doc_type = classification["document_type"]

            # Store classification result
            supabase.table("document_classifications").insert({
                "document_id":           doc_id,
                "user_id":          doc["user_id"],
                "document_type":         doc_type,
                "confidence":            classification["confidence"],
                "reasoning":             classification.get("reasoning"),
                "classification_signals":classification.get("classification_signals", []),
                "classification_method": classification.get("classification_method", "heuristic"),
            }).execute()

            # Store OCR raw output
            supabase.table("ocr_raw_output").insert({
                "document_id":        doc_id,
                "user_id":       doc["user_id"],
                "raw_text":           (ocr_raw["raw_text"] or "")[:50000],  # cap storage
                "tables":             ocr_raw.get("tables", []),
                "entities":           ocr_raw.get("entities", {}),
                "extraction_method":  ocr_raw.get("extraction_method", "aggregated"),
                "page_count":         ocr_raw.get("page_count", 1),
                "processing_time_ms": round(meta.get("ocr_time", 0) * 1000),
            }).execute()

            print(f"[WORKER] Document {doc_id} classified as '{doc_type}' "
                  f"(confidence={classification['confidence']:.2f}, "
                  f"method={classification.get('classification_method')})")

        except Exception as clf_err:
            print(f"[WORKER WARNING] Classification step failed: {clf_err}. "
                  f"Using OCR-inferred type: {doc_type}")
            classification = {
                "document_type": doc_type,
                "confidence":    0.30,
                "reasoning":     f"Classification failed: {clf_err}",
                "classification_method": "fallback",
            }
            ocr_raw = {
                "raw_text":          "",
                "tables":            [],
                "entities":          {},
                "confidence":        0.30,
                "extraction_method": "fallback",
                "page_count":        meta.get("total_pages", 1),
            }

        # ── Phase 1: Analysis Note Generation ────────────────────────────────
        meta["job_state"] = "ANALYSING"
        await save_progress()

        analysis_note_id = None
        try:
            # Pass bank statement KPIs if available
            pre_processed = meta.get("bank_statement") if doc_type == "bank_statement" else None

            analysis_note = await _analysis_note_service.generate_and_store(
                document_id=doc_id,
                user_id=doc["user_id"],
                ocr_output={**ocr_raw, "confidence": ocr_raw.get("confidence", 0.0)},
                classification=classification,
                existing_processed=pre_processed,
            )
            analysis_note_id = analysis_note["id"]
            meta["analysis_note_id"] = analysis_note_id
            print(f"[WORKER] Analysis Note {analysis_note_id} stored for doc {doc_id}")

        except Exception as note_err:
            print(f"[WORKER WARNING] Analysis Note generation failed: {note_err}")
            traceback.print_exc()
            # Non-fatal: pipeline continues to Trade Engine

        meta["job_state"] = "COMPLETED"
        final_doc_status = "analyzed"

        async with db_lock:
            supabase.table("user_documents").update({
                "document_type": doc_type,
                "status":        final_doc_status,
                "metadata":      meta,
            }).eq("id", doc_id).execute()

        print(f"[WORKER] Finished doc {doc_id}. AnalysisNote={analysis_note_id}, DocStatus={final_doc_status}")

    except Exception as e:
        print(f"[WORKER ERROR] Processing of doc {doc_id} failed: {e}")
        try:
            meta["job_state"] = "FAILED"
            meta["error"] = str(e)
            supabase.table("user_documents").update({
                "status": "failed",
                "metadata": meta
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

            # 1. Try pulling from Redis first if available.
            # NOTE: the availability ping is blocking (socket connect), so run it
            # in the executor — calling it directly here starves the event loop and
            # makes HTTP requests time out whenever Redis is offline.
            redis_up = await loop.run_in_executor(None, is_redis_available)
            if redis_up:
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
