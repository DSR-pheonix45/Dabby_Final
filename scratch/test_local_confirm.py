import asyncio
import os
import sys
import requests

# Add backend directory to sys.path
sys.path.append(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "backend"))
from supabase_client import supabase

async def test_local_confirm():
    url = "http://localhost:8000/api/documents/confirm-record"
    
    # Get a staging record ID from workbench_records
    records_res = supabase.table("workbench_records").select("id").eq("status", "draft").limit(1).execute()
    if not records_res.data:
        print("No draft records found in workbench_records to test confirmation.")
        return
    
    record_id = records_res.data[0]["id"]
    print(f"Testing local confirm-record for record_id: {record_id}")
    
    payload = {"record_id": record_id}
    
    # Test POST request
    print("\n--- Testing POST request to FastAPI endpoint ---")
    post_resp = requests.post(url, json=payload)
    print(f"POST Status Code: {post_resp.status_code}")
    print(f"POST Response: {post_resp.text}")

if __name__ == "__main__":
    asyncio.run(test_local_confirm())
