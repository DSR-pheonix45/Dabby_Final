import sys
import os
import httpx
import asyncio
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../backend')))
from supabase_client import url, key

async def test_upload():
    storage_path = "0fe2ed1f-2eed-4868-b464-a8bf23aa2e68/test_upload_from_script.txt"
    file_bytes = b"Hello world"
    headers = {
        "Authorization": f"Bearer {key}",
        "apikey": key,
        "Content-Type": "text/plain"
    }
    print(f"Uploading to {url}/storage/v1/object/Doc_vault_Raw/{storage_path}...")
    
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{url}/storage/v1/object/Doc_vault_Raw/{storage_path}",
            content=file_bytes,
            headers=headers
        )
        print("STATUS:", resp.status_code)
        if resp.status_code >= 400:
            print("ERROR:", resp.text)
        else:
            print("SUCCESS")

asyncio.run(test_upload())
