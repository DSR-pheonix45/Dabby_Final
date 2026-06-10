from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from supabase_client import supabase
from services.coa_seeder import seed_coa

router = APIRouter()

class WorkbenchCreate(BaseModel):
    owner_user_id: str
    name: str
    industry: str
    business_type: str
    sector: Optional[str] = None
    location: Optional[str] = "India"
    currency: Optional[str] = "INR"
    fy_start: Optional[str] = None
    books_start_date: Optional[str] = None
    legal_name: Optional[str] = None
    pan: Optional[str] = None
    gstin: Optional[str] = None
    cin: Optional[str] = None
    incorporation_date: Optional[str] = None
    coa_mode: Optional[str] = "create"

@router.post("")
async def create_workbench(payload: WorkbenchCreate):
    print(f"[DEBUG] Received request to create workbench: {payload.name}")
    try:
        # 1. Create Workbench
        insert_data = {
            "owner_user_id": payload.owner_user_id,
            "name": payload.name,
            "industry": payload.industry,
            "business_type": payload.business_type,
            "sector": payload.sector,
            "location": payload.location,
            "currency": payload.currency,
            "fy_start": payload.fy_start,
            "books_start_date": payload.books_start_date,
            "legal_name": payload.legal_name,
            "pan": payload.pan,
            "gstin": payload.gstin,
            "cin": payload.cin,
            "incorporation_date": payload.incorporation_date,
            "coa_mode": payload.coa_mode,
            "status": "ACTIVE"
        }
        print(f"[DEBUG] Attempting Supabase insert into 'workbenches'...")
        res = supabase.table('workbenches').insert(insert_data).execute()
        
        if not res.data:
            print(f"[ERROR] Supabase response was empty: {res}")
            raise HTTPException(status_code=400, detail="Failed to create workbench")
            
        workbench = res.data[0]
        workbench_id = workbench["id"]
        print(f"[DEBUG] Workbench created successfully with ID: {workbench_id}")
        
        # 2. Seed COA if mode is 'create'
        if payload.coa_mode == "create":
            print(f"[DEBUG] Seeding COA for workbench...")
            seed_coa(supabase, workbench_id, payload.business_type, "small", payload.industry)
            print(f"[DEBUG] COA seeding completed.")
        
        # 3. Add the creator as the first member
        print(f"[DEBUG] Adding owner to workbench_members...")
        supabase.table('workbench_members').insert({
            "workbench_id": workbench_id,
            "user_id": payload.owner_user_id,
            "role": "owner"
        }).execute()
        print(f"[DEBUG] Member added successfully.")
            
        return workbench
    except Exception as e:
        print(f"[CRITICAL ERROR] Workbench creation failed: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{workbench_id}/membership")
async def get_membership(workbench_id: str, user_id: str):
    try:
        res = supabase.table('workbench_members').select('*').eq('workbench_id', workbench_id).eq('user_id', user_id).maybe_single().execute()
        return { 'membership': res.data }
    except Exception as e:
        print(f"[ERROR] Failed to fetch membership: {e}")
        raise HTTPException(status_code=500, detail=str(e))
