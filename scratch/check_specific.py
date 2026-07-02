from supabase import create_client

supabase_url = "https://rdwrxipstlogfthhveim.supabase.co"
service_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkd3J4aXBzdGxvZ2Z0aGh2ZWltIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzU2MzM2MiwiZXhwIjoyMDg5MTM5MzYyfQ.i3ZhTBfC6DxGrsoNvL4kV2BmSJME3YABHbCH-2vIl_I"

supabase = create_client(supabase_url, service_key)

wb_id = "2d057275-8914-40bd-a836-a153f58dfee3"

res = supabase.table("workbenches").select("*").eq("id", wb_id).execute()
print("Found by ID:", res.data)

res_all = supabase.table("workbenches").select("id, name").execute()
for r in res_all.data:
    print(f"ID: {r['id']} (len: {len(r['id'])}), Name: {r['name']}")
