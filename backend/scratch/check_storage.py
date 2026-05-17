import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from supabase_client import supabase

def check_storage():
    bucket_name = "Doc_vault_Raw"
    print(f"Checking bucket: {bucket_name}")
    
    try:
        # List files in the root or some subfolders
        res = supabase.storage.from_(bucket_name).list("", {"limit": 10})
        print(f"Files in bucket root: {res}")
        
        # Try to list files for the specific workbench if we have one
        workbench_id = "0338e803-e024-4bae-bfcd-e0f88262770d"
        res_wb = supabase.storage.from_(bucket_name).list(workbench_id, {"limit": 10})
        print(f"Files in workbench {workbench_id}: {res_wb}")
        
    except Exception as e:
        print(f"Error checking storage: {str(e)}")

if __name__ == "__main__":
    check_storage()
