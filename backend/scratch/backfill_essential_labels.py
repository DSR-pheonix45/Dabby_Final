import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv("../.env.local")

url = os.environ.get("VITE_SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") # Use service role to bypass RLS

supabase = create_client(url, key)

def backfill_labels():
    # 1. Get all workbenches
    wb_res = supabase.table("workbenches").select("id").execute()
    workbenches = wb_res.data
    
    for wb in workbenches:
        wb_id = wb["id"]
        for pillar_type in ["asset", "liability", "equity", "income", "revenue", "expense"]:
            # Check if they have any non-shadow labels of this type
            # Note: We check both 'income' and 'revenue' for the revenue pillar
            type_to_check = [pillar_type]
            if pillar_type in ["income", "revenue"]:
                type_to_check = ["income", "revenue"]
                
            labels_res = supabase.table("labels").select("id").eq("workbench_id", wb_id).in_("type", type_to_check).eq("is_shadow", False).execute()
            
            if not labels_res.data:
                print(f"Seeding essential {pillar_type} labels for workbench {wb_id}...")
                # Fetch sub-accounts for this type
                sub_res = supabase.table("coa_accounts").select("name, type").eq("workbench_id", wb_id).in_("type", type_to_check).eq("level", 2).execute()
                if sub_res.data:
                    # Just seed the first sub-account as a default label to keep it clean
                    sub = sub_res.data[0]
                    label_data = {
                        "workbench_id": wb_id,
                        "name": sub["name"],
                        "type": sub["type"],
                        "sub_account": sub["name"],
                        "is_system": False
                    }
                    supabase.table("labels").insert(label_data).execute()
                    print(f"Added {sub['name']} label for {wb_id}")
        print(f"Done for {wb_id}")

if __name__ == "__main__":
    backfill_labels()
