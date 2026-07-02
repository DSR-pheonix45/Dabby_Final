import os
import sys

# Add backend directory to PYTHONPATH
sys.path.append(r"c:\Users\Medhansh Pc\Desktop\Dabby_Final\backend")

from supabase import create_client
from services.coa_seeder import seed_coa

supabase_url = "https://rdwrxipstlogfthhveim.supabase.co"
service_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkd3J4aXBzdGxvZ2Z0aGh2ZWltIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzU2MzM2MiwiZXhwIjoyMDg5MTM5MzYyfQ.i3ZhTBfC6DxGrsoNvL4kV2BmSJME3YABHbCH-2vIl_I"

supabase = create_client(supabase_url, service_key)

wb_id = "2d057275-8914-40bd-a836-a453f58dfee3"

print("Starting test seeding...")
try:
    res = seed_coa(supabase, wb_id, "services", "small", "technology")
    print("Result:", res)
except Exception as e:
    import traceback
    traceback.print_exc()
