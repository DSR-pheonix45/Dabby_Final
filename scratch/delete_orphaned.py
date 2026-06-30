import asyncio
import os
import sys

# Add backend directory to sys.path
sys.path.append(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "backend"))
from supabase_client import supabase

async def delete_orphaned():
    workbench_id = "8e9cb841-953a-4979-bf4e-c2eee8bd197b"
    tx_res = supabase.table("transactions").select("*").eq("workbench_id", workbench_id).execute()
    txs = tx_res.data or []
    
    for tx in txs:
        entries_res = supabase.table("transaction_entries").select("id").eq("transaction_id", tx["id"]).execute()
        entries = entries_res.data or []
        if not entries:
            print(f"Deleting orphaned transaction: {tx['id']} | Desc: {tx['description']}")
            supabase.table("transactions").delete().eq("id", tx["id"]).execute()
            print("Deleted successfully.")

if __name__ == "__main__":
    asyncio.run(delete_orphaned())
