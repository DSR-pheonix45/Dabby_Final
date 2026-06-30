import os
from supabase import create_client, Client
from dotenv import load_dotenv

def view_ledger():
    env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env.local")
    if os.path.exists(env_path):
        load_dotenv(env_path)
    else:
        env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env")
        load_dotenv(env_path)
    
    url = os.environ.get("SUPABASE_URL") or os.environ.get("VITE_SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_SERVICE_KEY")
    if not url or not key:
        print("ERROR: Supabase credentials missing")
        return
        
    client = create_client(url, key)
    
    # Query transactions
    tx_res = client.table("transactions").select("*").execute()
    txs = tx_res.data
    print(f"\nTotal transactions posted: {len(txs)}")
    print("=" * 60)
    
    for tx in txs:
        print(f"\nTransaction ID: {tx['id']}")
        print(f"Date: {tx['transaction_date']} | Description: {tx['description']}")
        
        # Get entries
        ent_res = client.table("transaction_entries").select("*").eq("transaction_id", tx["id"]).execute()
        entries = ent_res.data
        for e in entries:
            # Print keys
            print(f"  Entry: {e}")

if __name__ == "__main__":
    view_ledger()
