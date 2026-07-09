from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from supabase_client import supabase

router = APIRouter()

class COATemplateSeed(BaseModel):
    workbench_id: str
    template_id: str

@router.get("/templates")
async def get_coa_templates():
    try:
        res = supabase.table("di_coa_templates").select("*").execute()
        return res.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/accounts/{workbench_id}")
async def get_accounts(workbench_id: str):
    try:
        res = supabase.table("di_accounts").select("*").eq("workbench_id", workbench_id).execute()
        return res.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/seed")
async def seed_accounts_from_template(payload: COATemplateSeed):
    try:
        # Fetch template
        template_res = supabase.table("di_coa_templates").select("structure").eq("id", payload.template_id).execute()
        if not template_res.data:
            raise HTTPException(status_code=404, detail="Template not found")
        
        structure = template_res.data[0].get("structure", {})
        
        # We need to flatten the structure and insert into di_accounts
        # Mocking the seed for now - a recursive insert would go here
        # E.g. structure: {"assets": [{"name": "Cash", "normal_balance": "debit"}]}
        
        return {"status": "success", "message": "COA seeding started (mocked)"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
