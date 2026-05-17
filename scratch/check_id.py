import asyncio
import os
from supabase import create_client

# Get env vars from .env.local
env = {}
with open(".env.local", "r") as f:
    for line in f:
        if "=" in line:
            k, v = line.strip().split("=", 1)
            env[k] = v

url = env.get("VITE_SUPABASE_URL")
key = env.get("VITE_SUPABASE_ANON_KEY")
target_id = "a2a527b5-118a-4ca7-9a98-b6fc229153ff"

supabase = create_client(url, key)

async def check():
    print(f"Checking ID: {target_id}")
    
    label = supabase.table("labels").select("*").eq("id", target_id).execute()
    if label.data:
        print(f"FOUND in labels: {label.data}")
    else:
        print("NOT FOUND in labels")
        
    entity = supabase.table("entities").select("*").eq("id", target_id).execute()
    if entity.data:
        print(f"FOUND in entities: {entity.data}")
    else:
        print("NOT FOUND in entities")

if __name__ == "__main__":
    asyncio.run(check())
