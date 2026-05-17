import os
from supabase import create_client, Client
from dotenv import load_dotenv

# Load from .env.local to get correct keys
load_dotenv(".env.local")

URL = os.environ.get("VITE_SUPABASE_URL")
KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not URL or not KEY:
    # Try .env
    load_dotenv(".env")
    URL = os.environ.get("VITE_SUPABASE_URL")
    # Service role is usually not in .env, so use .env.local as primary

supabase: Client = create_client(URL, KEY)

print(f"[DEBUG] Supabase client initialized for {URL}")

for table in ["coa_accounts", "labels", "workbenches"]:
    try:
        res = supabase.table(table).select("*").limit(1).execute()
        if res.data:
            print(f"Columns in {table}: {list(res.data[0].keys())}")
        else:
            print(f"No data in {table} to inspect columns.")
    except Exception as e:
        print(f"Error inspecting {table}: {e}")
