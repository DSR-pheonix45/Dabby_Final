import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../backend')))
import uuid

from supabase_client import supabase

workbench_id = "0fe2ed1f-2eed-4868-b464-a8bf23aa2e68"

doc_data = {
    "workbench_id": workbench_id,
    "storage_path": f"{workbench_id}/test_test.pdf",
    "original_filename": "test.pdf",
    "mime_type": "application/pdf",
    "size_bytes": 100,
    "file_hash": str(uuid.uuid4())
}

print("Attempting to insert into di_documents...")
try:
    doc_res = supabase.table("di_documents").insert(doc_data).execute()
    print("Success di_documents:", doc_res.data)
    
    document_id = doc_res.data[0]['id']
    print(f"Document ID: {document_id}")
    
    log_res = supabase.table("di_document_processing_logs").insert({
        "document_id": document_id,
        "stage": "upload",
        "provider": "system",
        "status": "success"
    }).execute()
    print("Success logs:", log_res.data)
    
except Exception as e:
    print(f"ERROR: {type(e).__name__} - {str(e)}")
