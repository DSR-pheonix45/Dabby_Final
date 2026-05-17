from fastapi import APIRouter, HTTPException
from typing import List, Optional
from pydantic import BaseModel
from supabase import create_client, Client
import os

router = APIRouter()

# Initialize Supabase client
supabase_url = os.environ.get("VITE_SUPABASE_URL")
supabase_key = os.environ.get("VITE_SUPABASE_ANON_KEY")
supabase: Client = create_client(supabase_url, supabase_key)

class COAItem(BaseModel):
    id: str
    name: str
    type: str
    level: int
    parent_id: Optional[str]
    is_system: bool
    display_order: int

@router.get("/{workbench_id}")
async def get_coa(workbench_id: str):
    """
    Fetches the full COA hierarchy for a workbench.
    """
    try:
        print(f"[DEBUG] Fetching COA for workbench: {workbench_id}")
        response = supabase.table("coa_accounts") \
            .select("*") \
            .eq("workbench_id", workbench_id) \
            .order("display_order") \
            .execute()
        
        return response.data
    except Exception as e:
        print(f"[ERROR] Failed to fetch COA: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
