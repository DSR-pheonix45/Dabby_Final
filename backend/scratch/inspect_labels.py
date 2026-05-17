import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from supabase_client import supabase

def inspect_labels():
    try:
        res = supabase.table("labels").select("*").limit(1).execute()
        if res.data:
            print(f"Columns in labels: {list(res.data[0].keys())}")
        else:
            print("No data in labels to inspect columns.")
    except Exception as e:
        print(f"Error: {e}")

inspect_labels()
