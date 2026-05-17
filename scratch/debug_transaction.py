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

# Use actual IDs from the previous check
# HDFC startup Bank: 762bf5da-3d97-4445-9c30-5e4426a1bdb6 (Asset)
# Office Rent: 71cf0a35-79b9-4ce6-accc-09ef0e1d33b2 (Expense?) - let's check
# Datalis Product Revenue: 5d89b121-adb6-4d0f-a444-1d4fdd47d38f (Revenue)

def debug_transaction():
    try:
        # Check label types
        l_res = supabase.table("labels").select("id, name, type").in_("id", [
            "762bf5da-3d97-4445-9c30-5e4426a1bdb6",
            "71cf0a35-79b9-4ce6-accc-09ef0e1d33b2",
            "5d89b121-adb6-4d0f-a444-1d4fdd47d38f"
        ]).execute()
        
        for l in l_res.data:
            print(f"Label: {l['name']}, Type: {l['type']}, ID: {l['id']}")

        # Simulate a transaction from Revenue to Asset (Product Sale)
        # from_label_id = Revenue (5d89b121-adb6-4d0f-a444-1d4fdd47d38f)
        # to_label_id = Asset (762bf5da-3d97-4445-9c30-5e4426a1bdb6)
        
        # I need actual IDs for parties and entities.
        # Let's fetch one.
        party_res = supabase.table("parties").select("id").eq("workbench_id", workbench_id).limit(1).execute()
        if party_res.data:
            party_id = party_res.data[0]["id"]
            entity_res = supabase.table("entities").select("id").eq("party_id", party_id).limit(1).execute()
            entity_id = entity_res.data[0]["id"] if entity_res.data else None
        else:
            party_id = None
            entity_id = None

        payload = {
            "workbench_id": workbench_id,
            "description": "API Debug Transaction with Party",
            "from_label_id": "5d89b121-adb6-4d0f-a444-1d4fdd47d38f",
            "to_label_id": "762bf5da-3d97-4445-9c30-5e4426a1bdb6",
            "amount": 100.0,
            "transaction_date": "2026-05-04",
            "source_party_id": party_id,
            "source_entity_id": entity_id
        }
        
        print("\nAttempting to insert transaction...")
        tx_resp = supabase.table("transactions").insert({
            "workbench_id": payload["workbench_id"],
            "description": payload["description"],
            "transaction_date": payload["transaction_date"]
        }).execute()
        
        if not tx_resp.data:
            print("Failed to create transaction header")
            return
            
        tx_id = tx_resp.data[0]["id"]
        print(f"Created transaction: {tx_id}")
        
        entries = [
            {"transaction_id": tx_id, "label_id": payload["to_label_id"], "amount": 100.0},
            {"transaction_id": tx_id, "label_id": payload["from_label_id"], "amount": -100.0}
        ]
        
        print("Attempting to insert entries...")
        entries_resp = supabase.table("transaction_entries").insert(entries).execute()
        print("Success!")
        
    except Exception as e:
        print(f"ERROR: {e}")

if __name__ == "__main__":
    debug_transaction()
