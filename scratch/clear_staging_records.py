import asyncio
import os
import sys

sys.path.append(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "backend"))
from supabase_client import supabase

async def clear_records():
    workbench_id = "8e9cb841-953a-4979-bf4e-c2eee8bd197b"
    
    # 1. Delete staging records
    print("[DB] Deleting staging records...")
    res = supabase.table("workbench_records").delete().eq("workbench_id", workbench_id).execute()
    print(f"Deleted {len(res.data or [])} staging records.")
    
    # 2. Reset workbench documents status to 'uploaded'
    print("[DB] Resetting documents status...")
    docs_res = supabase.table("workbench_documents").select("id").eq("workbench_id", workbench_id).execute()
    docs = docs_res.data or []
    for doc in docs:
        supabase.table("workbench_documents").update({
            "status": "uploaded",
            "transaction_id": None
        }).eq("id", doc["id"]).execute()
    print(f"Reset {len(docs)} documents status.")

if __name__ == "__main__":
    asyncio.run(clear_records())
