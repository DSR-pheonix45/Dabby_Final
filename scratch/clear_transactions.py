import asyncio
import os
import sys

sys.path.append(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "backend"))
from supabase_client import supabase

async def clear_ledger():
    workbench_id = "8e9cb841-953a-4979-bf4e-c2eee8bd197b"
    
    # 1. Fetch transactions to get IDs
    tx_res = supabase.table("transactions").select("id").eq("workbench_id", workbench_id).execute()
    tx_ids = [tx["id"] for tx in tx_res.data or []]
    
    if tx_ids:
        # 2. Delete transaction entries
        print(f"[DB] Deleting {len(tx_ids)} transactions' entries...")
        supabase.table("transaction_entries").delete().in_("transaction_id", tx_ids).execute()
        
        # 3. Delete transactions
        print("[DB] Deleting transactions...")
        supabase.table("transactions").delete().eq("workbench_id", workbench_id).execute()
        print("Ledger cleared successfully.")
    else:
        print("No transactions to clear.")

if __name__ == "__main__":
    asyncio.run(clear_ledger())
