import asyncio
import os
import sys

sys.path.append(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "backend"))
from supabase_client import supabase

async def list_labels():
    res = supabase.table("workbench_accounts").select("*").execute()
    for l in res.data or []:
        print(f"ID: {l['id']} | Name: {l['full_account_name']}")

if __name__ == "__main__":
    asyncio.run(list_labels())
