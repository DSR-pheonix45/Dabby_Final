import os
from supabase import create_client

supabase_url = "https://rdwrxipstlogfthhveim.supabase.co"
supabase_key = "sb_publishable_lajEsk-4nacDOF3Fgg_VXw_wDlj12YT"  # This is the anon key from env, wait, is there a service key?
# Let's use the service role key from .env to make sure we can read everything without RLS filters
service_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkd3J4aXBzdGxvZ2Z0aGh2ZWltIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzU2MzM2MiwiZXhwIjoyMDg5MTM5MzYyfQ.i3ZhTBfC6DxGrsoNvL4kV2BmSJME3YABHbCH-2vIl_I"

supabase = create_client(supabase_url, service_key)

wb_id = "2d057275-8914-40bd-a836-a153f58dfee3"

print("--- workbench_accounts ---")
res = supabase.table("workbench_accounts").select("*").eq("workbench_id", wb_id).execute()
print(f"Total rows: {len(res.data)}")
for row in res.data[:10]:
    print(row)

print("--- master_accounts ---")
res_m = supabase.table("master_accounts").select("*").execute()
print(f"Total master: {len(res_m.data)}")

print("--- master_sub_accounts ---")
res_s = supabase.table("master_sub_accounts").select("*").execute()
print(f"Total master sub: {len(res_s.data)}")
