import os
from supabase import create_client

url = "https://rdwrxipstlogfthhveim.supabase.co"
service_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkd3J4aXBzdGxvZ2Z0aGh2ZWltIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzU2MzM2MiwiZXhwIjoyMDg5MTM5MzYyfQ.i3ZhTBfC6DxGrsoNvL4kV2BmSJME3YABHbCH-2vIl_I"

supabase = create_client(url, service_key)

try:
    # Use admin API to list users
    res = supabase.auth.admin.list_users()
    print("Users found:")
    for user in res:
        print(f"- ID: {user.id}, Email: {user.email}, Created: {user.created_at}")
except Exception as e:
    print("Error listing users:", e)
