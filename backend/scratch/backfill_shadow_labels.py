import os
from supabase_client import supabase
import uuid

def backfill_shadow_labels():
    print("[DEBUG] Starting backfill of shadow labels for existing entities...")
    
    # 1. Fetch entities missing label_id
    entities_res = supabase.table("entities").select("*, parties(*)").is_("label_id", "null").execute()
    entities = entities_res.data
    
    if not entities:
        print("[DEBUG] No entities found missing shadow labels.")
        return

    for entity in entities:
        try:
            party = entity.get("parties")
            if not party:
                print(f"[WARNING] Entity {entity['id']} has no linked party. Skipping.")
                continue
                
            workbench_id = party["workbench_id"]
            
            # Determine Parenting Pillar
            parent_sub_name = "Bank Accounts" if party.get("is_self") else "Accounts Receivable (AR)"
            label_type = "asset"
            
            # Find the parent sub-account ID
            parent_res = supabase.table("coa_accounts") \
                .select("id") \
                .eq("workbench_id", workbench_id) \
                .eq("name", parent_sub_name) \
                .eq("level", 2) \
                .execute()
            
            parent_id = parent_res.data[0]["id"] if parent_res.data else None
            
            # Create the Shadow Label
            label_data = {
                "workbench_id": workbench_id,
                "name": f"{party['name']} - {entity['name']}",
                "type": label_type,
                "sub_account": parent_sub_name,
                "is_system": False,
                "is_shadow": True,
                "vessel_id": entity["id"]
            }
            
            print(f"[DEBUG] Creating shadow label for {party['name']} - {entity['name']}...")
            label_res = supabase.table("labels").insert(label_data).execute()
            
            if label_res.data:
                label_id = label_res.data[0]["id"]
                # Update entity
                supabase.table("entities").update({"label_id": label_id}).eq("id", entity["id"]).execute()
                print(f"[SUCCESS] Linked shadow label {label_id} to entity {entity['id']}")
                
        except Exception as e:
            print(f"[ERROR] Failed to backfill for entity {entity['id']}: {e}")

if __name__ == "__main__":
    backfill_shadow_labels()
