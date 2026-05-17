from fastapi import APIRouter, HTTPException
from services.investor_service import InvestorService
from supabase_client import supabase

router = APIRouter()
investor_service = InvestorService(supabase)

@router.get("/intelligence/{workbench_id}")
async def get_investor_intelligence(workbench_id: str):
    try:
        return await investor_service.get_intelligence(workbench_id)
    except Exception as e:
        print(f"Error in investor intelligence: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/statements/{workbench_id}")
async def get_financial_statements(workbench_id: str):
    try:
        return await investor_service.get_financial_statements(workbench_id)
    except Exception as e:
        print(f"Error in financial statements: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/share/{workbench_id}")
async def create_share_link(workbench_id: str, body: dict):
    try:
        password = body.get("password")
        if not password:
            raise HTTPException(status_code=400, detail="Password is required")
        share_id = await investor_service.create_share_link(workbench_id, password)
        return {"share_id": share_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/shared/{share_id}")
async def get_shared_snapshot(share_id: str, body: dict):
    try:
        password = body.get("password")
        if not password:
            raise HTTPException(status_code=400, detail="Password is required")
        return await investor_service.get_shared_snapshot(share_id, password)
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))

@router.post("/invite/{workbench_id}")
async def create_invite(workbench_id: str, body: dict):
    try:
        email = body.get("email")
        role = body.get("role", "viewer")
        if not email:
            raise HTTPException(status_code=400, detail="Email is required")
        token = await investor_service.create_invite(workbench_id, email, role)
        return {"token": token}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/invite/accept/{token}")
async def accept_invite(token: str, body: dict):
    try:
        user_id = body.get("user_id")
        if not user_id:
            raise HTTPException(status_code=400, detail="User ID is required")
        return await investor_service.accept_invite(token, user_id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))



