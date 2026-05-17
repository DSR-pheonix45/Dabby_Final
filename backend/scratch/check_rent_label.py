import os
from supabase import create_client
from dotenv import load_dotenv

# Load env variables from the root .env.local
load_dotenv('../.env.local')

url = os.getenv('SUPABASE_URL')
key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

if not url or not key:
    # Try different env var names
    url = os.getenv('VITE_SUPABASE_URL')
    key = os.getenv('VITE_SUPABASE_ANON_KEY')

if not url:
    print("Error: Supabase URL not found in environment.")
    exit(1)

supabase = create_client(url, key)

res = supabase.table('labels').select('*').ilike('name', '%office rent%').execute()
print(res.data)
