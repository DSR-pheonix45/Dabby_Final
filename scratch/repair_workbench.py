import asyncio
import os
import uuid
from supabase import create_client

# Get env vars from .env.local
env = {}
with open(".env.local", "r") as f:
    for line in f:
        if "=" in line:
            k, v = line.strip().split("=", 1)
            env[k] = v

url = env.get("VITE_SUPABASE_URL")
key = env.get("SUPABASE_SERVICE_ROLE_KEY") # Use service role to bypass RLS
workbench_id = "0338e803-e024-4bae-bfcd-e0f88262770d"

supabase = create_client(url, key)

async def seed():
    print(f"Repairing workbench: {workbench_id}")
    
    # 1. Create essential COA accounts if they don't exist
    # (Level 1 and 2)
    coa_data = [
        {"workbench_id": workbench_id, "name": "ASSETS", "type": "asset", "level": 1, "display_order": 1},
        {"workbench_id": workbench_id, "name": "LIABILITIES", "type": "liability", "level": 1, "display_order": 2},
        {"workbench_id": workbench_id, "name": "REVENUE", "type": "revenue", "level": 1, "display_order": 3},
        {"workbench_id": workbench_id, "name": "EXPENSES", "type": "expense", "level": 1, "display_order": 4}
    ]
    
    for item in coa_data:
        existing = supabase.table("coa_accounts").select("id").eq("workbench_id", workbench_id).eq("name", item["name"]).execute()
        if not existing.data:
            supabase.table("coa_accounts").insert(item).execute()
            print(f"Created COA Account: {item['name']}")

    # 2. Seed essential Labels
    labels_to_seed = [
        {"workbench_id": workbench_id, "name": "Main Bank Account", "type": "asset", "sub_account": "Bank Accounts"},
        {"workbench_id": workbench_id, "name": "Cash on Hand", "type": "asset", "sub_account": "Cash & Cash Equivalents"},
        {"workbench_id": workbench_id, "name": "Product Inventory", "type": "asset", "sub_account": "Inventory"},
        {"workbench_id": workbench_id, "name": "Standard COGS", "type": "expense", "sub_account": "Cost of Goods Sold (COGS)"},
        {"workbench_id": workbench_id, "name": "Product Sales", "type": "revenue", "sub_account": "Operating Revenue"}
    ]
    
    label_map = {}
    for l in labels_to_seed:
        existing = supabase.table("labels").select("id").eq("workbench_id", workbench_id).eq("name", l["name"]).execute()
        if not existing.data:
            res = supabase.table("labels").insert(l).execute()
            label_id = res.data[0]["id"]
            print(f"Created Label: {l['name']} -> {label_id}")
            label_map[l['name']] = label_id
        else:
            label_map[l['name']] = existing.data[0]["id"]

    # 3. Update existing items to point to these labels
    items = supabase.table("items").select("id, name").eq("workbench_id", workbench_id).execute()
    for item in items.data:
        update_data = {
            "inventory_label_id": label_map["Product Inventory"],
            "cogs_label_id": label_map["Standard COGS"],
            "revenue_label_id": label_map["Product Sales"]
        }
        supabase.table("items").update(update_data).eq("id", item["id"]).execute()
        print(f"Updated Item {item['name']} with new labels")

    print("Workbench repair completed.")

if __name__ == "__main__":
    asyncio.run(seed())
