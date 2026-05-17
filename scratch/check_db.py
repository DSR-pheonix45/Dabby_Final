import os
import sys
from supabase import create_client, Client
from dotenv import load_dotenv

# Add backend to path for imports
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))

load_dotenv('.env.local')

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_ANON_KEY")
supabase: Client = create_client(url, key)

def check_table():
    try:
        # Try to select from parties
        res = supabase.table("parties").select("id").limit(1).execute()
        print("SUCCESS: parties table exists.")
    except Exception as e:
        print(f"FAILURE: {e}")

if __name__ == "__main__":
    check_table()
