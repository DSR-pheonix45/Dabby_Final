from supabase import create_client
import sys
import os

supabase_url = "https://rdwrxipstlogfthhveim.supabase.co"
service_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkd3J4aXBzdGxvZ2Z0aGh2ZWltIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzU2MzM2MiwiZXhwIjoyMDg5MTM5MzYyfQ.i3ZhTBfC6DxGrsoNvL4kV2BmSJME3YABHbCH-2vIl_I"

supabase = create_client(supabase_url, service_key)

print("Checking waitlist table...")
try:
    res = supabase.table("waitlist").select("*").limit(5).execute()
    print("Success! Waitlist table exists.")
    print("Data sample:", res.data)
    if res.data:
        print("Columns:")
        for k in res.data[0].keys():
            print(f"- {k}: {res.data[0][k]}")
except Exception as e:
    print("Error querying waitlist table:", e)
