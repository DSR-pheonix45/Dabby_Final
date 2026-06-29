import os
import json
import redis
import asyncio
import traceback
from supabase_client import supabase
from services.ai_service import ai_service

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

async def process_queued_document(doc_id: str):
    """
    Downloads file from Supabase storage, runs LLM / Vision OCR scan,
    and records the extracted json note under metadata.
    """
    print(f"[WORKER] Starting processing of document {doc_id}...")
    try:
        # Update status to 'processing'
        supabase.table("workbench_documents").update({"status": "processing"}).eq("id", doc_id).execute()
        
        # 1. Fetch document metadata
        doc_res = supabase.table("workbench_documents").select("*").eq("id", doc_id).single().execute()
        doc = doc_res.data
        if not doc:
            print(f"[WORKER ERROR] Document {doc_id} not found in database")
            return
            
        print(f"[WORKER] Extracted metadata for {doc['filename']}: path={doc['file_path']}")
        
        # 2. Download file content from Storage
        path = doc["file_path"]
        file_data = supabase.storage.from_("Doc_vault_Raw").download(path)
        
        # 3. Run AI scanner
        extracted = await ai_service.scan_document_vision(
            file_bytes=file_data,
            mime_type=doc.get("mime_type", "image/png"),
            filename=doc["filename"]
        )
        
        print(f"[WORKER] Successfully scanned {doc['filename']}. Type={extracted.get('document_type')}")
        
        # 4. Update status, type, and record the json note under metadata
        doc_type = extracted.get("document_type", doc.get("document_type", "expense_receipt"))
        supabase.table("workbench_documents").update({
            "status": "analyzed",
            "document_type": doc_type,
            "metadata": {**doc.get("metadata", {}), "extracted_invoice": extracted}
        }).eq("id", doc_id).execute()
        
        print(f"[WORKER] Document {doc_id} successfully processed and status set to analyzed.")
        
    except Exception as e:
        print(f"[WORKER ERROR] Processing of doc {doc_id} failed: {e}")
        try:
            supabase.table("workbench_documents").update({
                "status": "failed",
                "metadata": {"error": str(e)}
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
