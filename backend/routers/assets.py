from fastapi import APIRouter, HTTPException
from typing import List, Dict
from supabase_client import supabase

router = APIRouter()

@router.get("/user/{user_id}")
async def list_assets(user_id: str):
    try:
        res = supabase.table("assets").select("*, trades(invoice_number), user_accounts(full_account_name)").eq("user_id", user_id).execute()
        return res.data or []
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{asset_id}")
async def get_asset(asset_id: str):
    try:
        res = supabase.table("assets").select("*, trades(invoice_number), user_accounts(full_account_name)").eq("id", asset_id).single().execute()
        return res.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
