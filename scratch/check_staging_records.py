import asyncio
import os
import sys

# Add backend directory to sys.path
sys.path.append(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "backend"))
from supabase_client import supabase

async def check():
    workbench_id = "8e9cb841-953a-4979-bf4e-c2eee8bd197b"
    res = supabase.table("workbench_records").select("*").eq("workbench_id", workbench_id).execute()
    records = res.data or []
    print(f"Total staging records found: {len(records)}")
    for r in records:
        print("="*60)
        print(f"Record ID: {r['id']}")
        print(f"Filename: {r.get('filename')}")
        print(f"Status: {r.get('status')}")
        meta = r.get("metadata") or {}
        print(f"Extracted Doc Type: {meta.get('document_type')}")
        draft_j = meta.get("draft_journal") or {}
        print(f"Draft Journal Desc: {draft_j.get('description')}")
        entries = draft_j.get("entries") or []
        print(f"Draft Journal Entries count: {len(entries)}")
        for e in entries:
            print(f"  - [{e.get('entry_type')}] Label: '{e.get('label')}' | Party: '{e.get('party')}' | Amount: {e.get('amount')}")

if __name__ == "__main__":
    asyncio.run(check())
