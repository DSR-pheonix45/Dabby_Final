import asyncio
import os
import sys
import requests

# Add backend directory to sys.path
sys.path.append(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "backend"))
from supabase_client import supabase

async def test_invoke():
    # Let's inspect the headers and try calling the function
    url = f"{supabase.supabase_url}/functions/v1/confirm-record"
    headers = {
        "Authorization": f"Bearer {supabase.supabase_key}",
        "Content-Type": "application/json"
    }
    # Let's get a staging record ID from workbench_records
    records_res = supabase.table("workbench_records").select("id").eq("status", "draft").limit(1).execute()
    if not records_res.data:
        print("No draft records found in workbench_records to test confirmation.")
        return
    
    record_id = records_res.data[0]["id"]
    print(f"Testing confirm-record for record_id: {record_id}")
    
    payload = {"record_id": record_id}
    
    # 1. Test OPTIONS preflight
    print("\n--- Testing OPTIONS Preflight ---")
    opt_resp = requests.options(url, headers={
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "authorization,content-type",
        "Origin": "http://localhost:5174"
    })
    print(f"OPTIONS Status Code: {opt_resp.status_code}")
    print(f"OPTIONS Headers: {dict(opt_resp.headers)}")
    
    # 2. Test POST request
    print("\n--- Testing POST request ---")
    post_resp = requests.post(url, headers=headers, json=payload)
    print(f"POST Status Code: {post_resp.status_code}")
    print(f"POST Response: {post_resp.text}")

if __name__ == "__main__":
    asyncio.run(test_invoke())
