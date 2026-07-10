import asyncio
import os
import sys

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env.local'))

from supabase_client import supabase

def test_parties():
    try:
        res = supabase.table("parties").select("*").limit(1).execute()
        print("Parties table exists. Data:", res.data)
    except Exception as e:
        print(f"Error querying parties table: {e}")

if __name__ == "__main__":
    test_parties()
