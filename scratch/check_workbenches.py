from supabase import create_client

supabase_url = "https://rdwrxipstlogfthhveim.supabase.co"
service_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkd3J4aXBzdGxvZ2Z0aGh2ZWltIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzU2MzM2MiwiZXhwIjoyMDg5MTM5MzYyfQ.i3ZhTBfC6DxGrsoNvL4kV2BmSJME3YABHbCH-2vIl_I"

supabase = create_client(supabase_url, service_key)

print("--- workbenches ---")
res = supabase.table("workbenches").select("*").execute()
print(f"Total workbenches: {len(res.data)}")
for row in res.data:
    print(f"ID: {row['id']}, Name: {row['name']}")
