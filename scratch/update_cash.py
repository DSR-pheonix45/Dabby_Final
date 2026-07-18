import sys
import os

# Add backend to path so we can import supabase_client
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../backend')))
from supabase_client import supabase

def update_petty_cash():
    res1 = supabase.table("di_template_accounts").update({"name": "Petty Cash"}).eq("code", "1000").execute()
    res2 = supabase.table("di_accounts").update({"name": "Petty Cash"}).eq("code", "1000").execute()
    print("Templates updated:", len(res1.data) if res1.data else 0)
    print("Accounts updated:", len(res2.data) if res2.data else 0)

if __name__ == "__main__":
    update_petty_cash()
