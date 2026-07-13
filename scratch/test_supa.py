import os
import sys
from dotenv import load_dotenv

sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env.local'))
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

from supabase_client import supabase

try:
    res = supabase.table("di_documents").select("id").execute()
    print("Success:", res)
except Exception as e:
    import traceback
    traceback.print_exc()
