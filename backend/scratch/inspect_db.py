import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from supabase_client import supabase

def inspect_table(table_name):
    try:
        # Fetch one row to see columns
        res = supabase.table(table_name).select("*").order("created_at", desc=True).limit(5).execute()
        if res.data:
            print(f"Rows in {table_name}: {len(res.data)}")
            for i, row in enumerate(res.data):
                print(f"Row {i}: {row}")
        else:
            print(f"No data in {table_name}.")
    except Exception as e:
        print(f"Error inspecting {table_name}: {str(e)}")

inspect_table("parties")
inspect_table("entities")
inspect_table("transactions")
inspect_table("workbench_documents")
inspect_table("workbenches")
inspect_table("workbench_records")
