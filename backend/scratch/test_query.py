import os
import requests
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.environ.get("VITE_SUPABASE_URL")
SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

headers = {
    "apikey": SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Content-Type": "application/json"
}

# Fetch all members with the foreign key join
res = requests.get(f"{SUPABASE_URL}/rest/v1/workbench_members?select=*,users:user_id(id,email,name)", headers=headers)
print("status:", res.status_code)
print("response:", res.text)
