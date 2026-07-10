import asyncio
import os
import sys

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env.local'))

from supabase_client import supabase

async def test_upload():
    print("Testing Supabase Storage upload directly...")
    try:
        bucket = "Doc_vault_Raw"
        path = "test/test_file.txt"
        content = b"Hello World"
        
        # Try to list buckets
        buckets = supabase.storage.list_buckets()
        print("Available buckets:", [b.name for b in buckets])
        
        # Try to upload
        print(f"Uploading to {bucket}/{path}...")
        res = supabase.storage.from_(bucket).upload(path, content)
        print("Upload Result:", res)
        
        # Clean up
        supabase.storage.from_(bucket).remove([path])
        print("Cleaned up test file")
    except Exception as e:
        print(f"ERROR: {e}")

if __name__ == "__main__":
    asyncio.run(test_upload())
