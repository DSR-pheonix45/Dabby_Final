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
        # 1. Fetch template accounts
        templates_res = supabase.table("di_template_accounts").select("*").execute()
        if not templates_res.data:
            raise HTTPException(status_code=500, detail="No template accounts found in global seeder.")
        
        # 2. Insert into di_accounts for this workbench
        accounts_to_insert = []
        for t in templates_res.data:
            accounts_to_insert.append({
                "workbench_id": payload.workbench_id,
                "template_account_code": t['code'],
                "code": t['code'],
                "name": t['name'],
                "category_code": t['category_code'],
                "normal_balance": t['normal_balance'],
                "is_postable": t['is_postable'],
                "is_system": True,
                "sort_order": t['sort_order']
            })
        
        inserted_accounts_res = supabase.table("di_accounts").insert(accounts_to_insert).execute()
        inserted_accounts = inserted_accounts_res.data
        
        # Build mapping from template_account_code to new di_accounts id
        code_to_account_id = {acc['code']: acc['id'] for acc in inserted_accounts}

        # 3. Fetch global AI labels
        labels_res = supabase.table("di_ai_labels").select("*").execute()
        if labels_res.data:
            # 4. Insert into di_workbench_labels
            labels_to_insert = []
            for l in labels_res.data:
                target_account_id = code_to_account_id.get(l['default_account_code'])
                if target_account_id:
                    labels_to_insert.append({
                        "workbench_id": payload.workbench_id,
                        "template_label_id": l['id'],
                        "name": l['name'],
                        "ledger_account_id": target_account_id,
                        "confidence_threshold": l['confidence_threshold']
                    })
            
            if labels_to_insert:
                supabase.table("di_workbench_labels").insert(labels_to_insert).execute()
        
        return {"status": "success", "message": "Financial Language and COA successfully seeded."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
