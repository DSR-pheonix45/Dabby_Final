import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../backend')))
from supabase_client import supabase

print("Fetching latest failed processing logs...")
try:
    res = supabase.table("di_document_processing_logs") \
        .select("*") \
        .eq("status", "failed") \
        .order("created_at", desc=True) \
        .limit(5) \
        .execute()
        
    if not res.data:
        print("No failed logs found.")
    else:
        for log in res.data:
            print(f"[{log['created_at']}] Document {log['document_id']} Stage: {log['stage']}")
            print(f"Error: {log.get('error_message')}")
            print("-" * 50)
except Exception as e:
    print(f"Failed to query: {e}")
