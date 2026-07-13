import os
import sys
import asyncio

# Add backend directory to sys.path so we can import services
backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend'))
sys.path.insert(0, backend_path)

from services.queue_service import process_queued_document # type: ignore
from supabase_client import supabase # type: ignore

async def main():
    doc_id = "135e130c-98dc-4e6b-b34b-09ab4908eb6f"
    print(f"Triggering processing for document {doc_id}...")
    await process_queued_document(doc_id)
    
    # Check document status after processing
    res = supabase.table("workbench_documents").select("*").eq("id", doc_id).single().execute()
    if res.data:
        print("\nResulting Document State:")
        print("Status:", res.data.get("status"))
        print("Metadata:", res.data.get("metadata"))
        print("Transaction ID:", res.data.get("transaction_id"))

if __name__ == "__main__":
    asyncio.run(main())
