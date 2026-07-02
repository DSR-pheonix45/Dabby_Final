from supabase import create_client

supabase_url = "https://rdwrxipstlogfthhveim.supabase.co"
service_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkd3J4aXBzdGxvZ2Z0aGh2ZWltIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzU2MzM2MiwiZXhwIjoyMDg5MTM5MzYyfQ.i3ZhTBfC6DxGrsoNvL4kV2BmSJME3YABHbCH-2vIl_I"

supabase = create_client(supabase_url, service_key)

res = supabase.table("workbenches").select("id, name").execute()
for r in res.data:
    if "Datalis 2" in r["name"]:
        db_id = r["id"]
        print(f"Name: {r['name']}")
        print(f"Database ID: {db_id}")
        
        # Let's check block by block
        parts = db_id.split("-")
        print("Blocks:", parts)
        print("Block 4:", parts[3])
        print("Block 5:", parts[4])
