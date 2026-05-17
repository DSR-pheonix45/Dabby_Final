import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from supabase_client import supabase

def check_and_add_column():
    table_name = "workbench_documents"
    column_name = "transaction_id"
    
    print(f"Checking if column '{column_name}' exists in '{table_name}'...")
    
    # We can use a raw SQL query via RPC if available, but let's try to inspect via a dummy select
    try:
        # This will fail if the column doesn't exist
        supabase.table(table_name).select(column_name).limit(1).execute()
        print(f"Column '{column_name}' already exists.")
    except Exception as e:
        print(f"Column '{column_name}' likely missing or table missing. Error: {str(e)}")
        print("\nPROPOSED SQL TO FIX:")
        print(f"ALTER TABLE {table_name} ADD COLUMN IF NOT EXISTS {column_name} UUID REFERENCES transactions(id) ON DELETE SET NULL;")

if __name__ == "__main__":
    check_and_add_column()
