from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from typing import List, Optional
from pydantic import BaseModel
from supabase_client import supabase
from auth import get_current_user
from services.ai_service import ai_service

router = APIRouter()

class AccountCreate(BaseModel):
    workbench_id: str
    account_class: str
    group_code: str
    full_code: str
    ledger: str
    label: Optional[str] = None
    current_balance: Optional[float] = 0.0

class AccountUpdate(BaseModel):
    account_class: Optional[str] = None
    group_code: Optional[str] = None
    full_code: Optional[str] = None
    ledger: Optional[str] = None
    label: Optional[str] = None
    current_balance: Optional[float] = None

@router.post("")
async def create_account(account: AccountCreate, user = Depends(get_current_user)):
    try:
        res = supabase.table("workbench_accounts").insert(account.dict()).execute()
        if not res.data:
            raise HTTPException(status_code=400, detail="Failed to create account")
        return res.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/ai-import")
async def ai_import(
    workbench_id: str = Form(...),
    file: UploadFile = File(...),
    user = Depends(get_current_user)
):
    try:
        content = await file.read()
        accounts = await ai_service.scan_company_master_import(content, file.content_type, file.filename)
        return {"accounts": accounts}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{workbench_id}")
async def get_accounts(workbench_id: str, user = Depends(get_current_user)):
    try:
        res = supabase.table("workbench_accounts").select("*").eq("workbench_id", workbench_id).order("full_code").execute()
        return res.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{account_id}")
async def update_account(account_id: str, payload: AccountUpdate, user = Depends(get_current_user)):
    try:
        res = supabase.table("workbench_accounts").update(payload.dict(exclude_unset=True)).eq("id", account_id).execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="Account not found")
        return res.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{account_id}")
async def delete_account(account_id: str, user = Depends(get_current_user)):
    try:
        res = supabase.table("workbench_accounts").delete().eq("id", account_id).execute()
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
