from fastapi import APIRouter, HTTPException
from services.investor_service import InvestorService
from supabase_client import supabase

router = APIRouter()
investor_service = InvestorService(supabase)

@router.get("/intelligence/{user_id}")
async def get_investor_intelligence(user_id: str):
    try:
        return await investor_service.get_intelligence(user_id)
    except Exception as e:
        print(f"Error in investor intelligence: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/statements/{user_id}")
async def get_financial_statements(user_id: str):
    try:
        return await investor_service.get_financial_statements(user_id)
    except Exception as e:
        print(f"Error in financial statements: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/share/{user_id}")
async def create_share_link(user_id: str, body: dict):
    try:
        password = body.get("password")
        if not password:
            raise HTTPException(status_code=400, detail="Password is required")
        share_id = await investor_service.create_share_link(user_id, password)
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

@router.post("/invite/{user_id}")
async def create_invite(user_id: str, body: dict):
    try:
        email = body.get("email")
        role = body.get("role", "viewer")
        if not email:
            raise HTTPException(status_code=400, detail="Email is required")
        token = await investor_service.create_invite(user_id, email, role)
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



