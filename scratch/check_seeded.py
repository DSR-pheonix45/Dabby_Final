from supabase import create_client

supabase_url = "https://rdwrxipstlogfthhveim.supabase.co"
service_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkd3J4aXBzdGxvZ2Z0aGh2ZWltIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzU2MzM2MiwiZXhwIjoyMDg5MTM5MzYyfQ.i3ZhTBfC6DxGrsoNvL4kV2BmSJME3YABHbCH-2vIl_I"

supabase = create_client(supabase_url, service_key)

wb_id = "2d057275-8914-40bd-a836-a453f58dfee3"

res = supabase.table("workbench_accounts").select("*").eq("workbench_id", wb_id).execute()
print(f"Seeded accounts for {wb_id}: {len(res.data)}")
for r in res.data[:5]:
    print(r["full_account_name"])
