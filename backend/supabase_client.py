import os
from supabase import create_client, Client
from dotenv import load_dotenv

# Load env variables from the root .env or .env.local
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env.local'))

url: str = os.environ.get("VITE_SUPABASE_URL")
# IMPORTANT: Backend uses Service Role to bypass RLS for trusted operations
key: str = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not url or not key:
    # Fallback to .env
    load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))
    url = os.environ.get("VITE_SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not url or not key:
    # Check for VITE_ prefix as fallback
    key = os.environ.get("VITE_SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        raise ValueError("Supabase URL and SERVICE_ROLE_KEY must be set in environment variables")

supabase: Client = create_client(url, key)
print("[DEBUG] Supabase client initialized with Service Role (Bypassing RLS)")
