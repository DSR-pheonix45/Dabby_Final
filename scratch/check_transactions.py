import asyncio
import os
import sys

# Add backend directory to sys.path
sys.path.append(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "backend"))
from supabase_client import supabase

async def check():
    workbench_id = "8e9cb841-953a-4979-bf4e-c2eee8bd197b"
    tx_res = supabase.table("transactions").select("*").eq("workbench_id", workbench_id).execute()
    txs = tx_res.data or []
    print(f"Total transactions found: {len(txs)}")
    for tx in txs:
        print(f"TX ID: {tx['id']} | Desc: {tx['description']} | Date: {tx['transaction_date']}")
        entries_res = supabase.table("transaction_entries").select("*").eq("transaction_id", tx["id"]).execute()
        entries = entries_res.data or []
        for e in entries:
            # Fetch the account name manually
            acc_res = supabase.table("workbench_accounts").select("full_account_name").eq("id", e["label_id"]).maybe_single().execute()
            acc_name = acc_res.data.get("full_account_name") if acc_res.data else "Unknown"
            print(f"  Entry: label_id={e['label_id']} | Name={acc_name} | Amount={e['amount']}")

if __name__ == "__main__":
    asyncio.run(check())
