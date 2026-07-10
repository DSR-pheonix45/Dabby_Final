import asyncio
from supabase_client import supabase

async def test():
    # Fetch all members to see if any joined
    res = supabase.table("workbench_members").select("*").execute()
    print("Members:", res.data)
    
    # Check workbenches RLS
    res = supabase.table("workbenches").select("*").execute()
    print("Workbenches (Service Role):", [w['id'] for w in res.data])

if __name__ == "__main__":
    asyncio.run(test())
