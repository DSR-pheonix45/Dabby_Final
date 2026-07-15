import os
import sys

# Add backend to path so we can import supabase_client
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))
from backend.supabase_client import supabase

try:
    res = supabase.table("di_document_processing_logs").select("*").order("created_at", desc=True).limit(5).execute()
    for row in res.data:
        print(row)
except Exception as e:
    print(f"Error: {e}")
