import os
import sys
from supabase import create_client, Client
from dotenv import load_dotenv

# Load env variables
env_path = os.path.join(os.path.dirname(__file__), '..', '.env.local')
load_dotenv(env_path)

supabase_url = os.environ.get("VITE_SUPABASE_URL")
supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
supabase: Client = create_client(supabase_url, supabase_key)

workbench_id = "0338e803-e024-4bae-bfcd-e0f88262770d"

def check_and_clean():
    # 1. Check labels for the specific ID
    labels_res = supabase.table("labels").select("*").eq("workbench_id", workbench_id).execute()
    print(f"Found {len(labels_res.data)} labels in 'labels' table.")
    
    system_label_ids = []
    for l in labels_res.data:
        print(f" - {l['name']} (is_system: {l.get('is_system')}, id: {l['id']})")
        if l.get('is_system') == True:
            system_label_ids.append(l['id'])
    
    if system_label_ids:
        print(f"\nDeleting {len(system_label_ids)} system labels...")
        try:
            supabase.table("labels").delete().in_("id", system_label_ids).execute()
            print("Done.")
        except Exception as e:
            print(f"Error during deletion: {e}")
    else:
        print("\nNo system labels to delete.")

if __name__ == "__main__":
    check_and_clean()
