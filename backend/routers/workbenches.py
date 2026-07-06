from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from supabase_client import supabase
from services.coa_seeder import seed_coa
from auth import get_current_user, get_workbench_role

router = APIRouter()


@router.get("/{workbench_id}/my-role")
async def get_my_role(workbench_id: str, user: dict = Depends(get_current_user)):
    """Returns the authenticated caller's role in this workbench (drives UI gating)."""
    role = get_workbench_role(workbench_id, user["id"])
    if not role:
        raise HTTPException(status_code=403, detail="You are not a member of this workbench")
    return {"role": role, "user_id": user["id"]}

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


class WorkbenchDeletePayload(BaseModel):
    confirm_name: str
    password: Optional[str] = None


@router.post("/{workbench_id}/delete")
async def delete_workbench_secure(workbench_id: str, payload: WorkbenchDeletePayload, user: dict = Depends(get_current_user)):
    # 1. Resolve caller's role
    role = get_workbench_role(workbench_id, user["id"])

    # 2. Get workbench details
    try:
        wb_res = supabase.table("workbenches").select("settings", "name", "owner_user_id").eq("id", workbench_id).single().execute()
        if not wb_res.data:
            raise HTTPException(status_code=404, detail="Workbench not found")
        
        wb = wb_res.data
        is_owner = (wb.get("owner_user_id") == user["id"]) or (role in ("owner", "founder"))
        if not is_owner:
            raise HTTPException(status_code=403, detail="Only the Owner or Founder of the workbench has authority to delete it.")
        settings = wb.get("settings") or {}
        correct_name = wb.get("name")
        correct_password = settings.get("workbench_password")
        
        # 3. Verify confirmation name
        if payload.confirm_name.strip() != correct_name.strip():
            raise HTTPException(status_code=400, detail="Incorrect workbench name confirmation.")
            
        # 4. Verify password if protected
        if correct_password:
            if not payload.password or payload.password != correct_password:
                raise HTTPException(status_code=400, detail="Incorrect password.")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Verification failed: {str(e)}")

    # 5. Delete everything
    try:
        # Delete transaction entries associated with this workbench
        labels_res = supabase.table("labels").select("id").eq("workbench_id", workbench_id).execute()
        label_ids = [row["id"] for row in labels_res.data] if labels_res.data else []
        if label_ids:
            supabase.table("transaction_entries").delete().in_("label_id", label_ids).execute()
            
        txs_res = supabase.table("transactions").select("id").eq("workbench_id", workbench_id).execute()
        tx_ids = [row["id"] for row in txs_res.data] if txs_res.data else []
        if tx_ids:
            supabase.table("transaction_entries").delete().in_("transaction_id", tx_ids).execute()
            
        # Delete labels and transactions
        supabase.table("labels").delete().eq("workbench_id", workbench_id).execute()
        supabase.table("transactions").delete().eq("workbench_id", workbench_id).execute()
        
        # Delete workbench itself (cascades to others)
        supabase.table("workbenches").delete().eq("id", workbench_id).execute()
        
        return {"status": "deleted", "message": "Workbench and all associated data deleted successfully."}
    except Exception as e:
        print(f"[CRITICAL ERROR] Failed to delete workbench {workbench_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete workbench: {str(e)}")
