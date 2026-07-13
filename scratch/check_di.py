import os
from supabase import create_client

supabase_url = "https://rdwrxipstlogfthhveim.supabase.co"
service_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkd3J4aXBzdGxvZ2Z0aGh2ZWltIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzU2MzM2MiwiZXhwIjoyMDg5MTM5MzYyfQ.i3ZhTBfC6DxGrsoNvL4kV2BmSJME3YABHbCH-2vIl_I"
supabase = create_client(supabase_url, service_key)

print("--- workbench_documents schema ---")
res = supabase.table("workbench_documents").select("*").limit(1).execute()
if res.data:
    print(res.data[0].keys())

print("--- di_analysis_notes schema ---")
res = supabase.table("di_analysis_notes").select("*").limit(1).execute()
if res.data:
    print(res.data[0].keys())
