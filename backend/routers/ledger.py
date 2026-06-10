from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional, Dict
from pydantic import BaseModel
from datetime import date
from services.ledger_service import LedgerService
from supabase_client import supabase
from .auth_utils import require_membership, check_role_allowed, enforce_member_limit, get_user_id_from_header
from fastapi import Header

router = APIRouter()
ledger_service = LedgerService(supabase)

# --- Pydantic Models ---

class LabelCreate(BaseModel):
    workbench_id: str
    name: str
    type: str # asset/liability/equity/revenue/expense
    sub_account: str
    parent_id: Optional[str] = None
    is_system: bool = False

class LabelUpdate(BaseModel):
    name: Optional[str] = None
    sub_account: Optional[str] = None

class TransactionCreate(BaseModel):
    workbench_id: str
    from_label_id: str
    to_label_id: str
    amount: float
    description: str
    transaction_date: Optional[date] = None
    source_party_id: Optional[str] = None
    source_entity_id: Optional[str] = None
    destination_party_id: Optional[str] = None
    destination_entity_id: Optional[str] = None

# --- Label Endpoints ---

@router.post("/labels")
async def create_label(label: LabelCreate, x_user_id: str = Depends(get_user_id_from_header)):
    try:
        # RBAC: ensure caller is owner/admin for this workbench
        member = await require_membership(label.workbench_id, x_user_id)
        await check_role_allowed(member, ['owner', 'admin'])

        return await ledger_service.create_label(label.dict())
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/labels/{workbench_id}")
async def get_labels(workbench_id: str, x_user_id: str = Depends(get_user_id_from_header)):
    try:
        await require_membership(workbench_id, x_user_id)
        return await ledger_service.get_labels(workbench_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/labels/{label_id}")
async def update_label(label_id: str, label: LabelUpdate, x_user_id: str = Depends(get_user_id_from_header)):
    try:
        # Fetch label to get workbench_id and verify membership
        lbl = supabase.table('labels').select('workbench_id').eq('id', label_id).maybe_single().execute().data
        if not lbl:
            raise HTTPException(status_code=404, detail='Label not found')
        member = await require_membership(lbl['workbench_id'], x_user_id)
        await check_role_allowed(member, ['owner', 'admin'])
        return await ledger_service.update_label(label_id, label.dict(exclude_unset=True))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/labels/{label_id}")
async def delete_label(label_id: str, x_user_id: str = Depends(get_user_id_from_header)):
    try:
        lbl = supabase.table('labels').select('workbench_id').eq('id', label_id).maybe_single().execute().data
        if not lbl:
            raise HTTPException(status_code=404, detail='Label not found')
        member = await require_membership(lbl['workbench_id'], x_user_id)
        await check_role_allowed(member, ['owner', 'admin'])
        return await ledger_service.delete_label(label_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/labels/seed/{workbench_id}")
async def seed_labels(workbench_id: str, x_user_id: str = Depends(get_user_id_from_header)):
    try:
        member = await require_membership(workbench_id, x_user_id)
        await check_role_allowed(member, ['owner', 'admin'])
        return await ledger_service.seed_basic_labels(workbench_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- Transaction Endpoints ---

@router.post("/transactions")
async def create_transaction(tx: TransactionCreate, x_user_id: str = Depends(get_user_id_from_header)):
    try:
        # RBAC: ensure caller is a member (any role)
        member = await require_membership(tx.workbench_id, x_user_id)
        # Enforce plan limits if needed (e.g., transactions per month) — placeholder for now
        # await enforce_transaction_limit(tx.workbench_id)

        return await ledger_service.record_transaction(
            workbench_id=tx.workbench_id,
            from_label_id=tx.from_label_id,
            to_label_id=tx.to_label_id,
            amount=tx.amount,
            description=tx.description,
            transaction_date=tx.transaction_date,
            source_party_id=tx.source_party_id,
            source_entity_id=tx.source_entity_id,
            destination_party_id=tx.destination_party_id,
            destination_entity_id=tx.destination_entity_id
        )
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/transactions/{workbench_id}")
async def list_transactions(workbench_id: str, x_user_id: str = Depends(get_user_id_from_header)):
    try:
        await require_membership(workbench_id, x_user_id)
        return await ledger_service.get_transactions_list(workbench_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- Analytics Endpoints ---

@router.get("/balances/{workbench_id}")
async def get_balances(workbench_id: str, x_user_id: str = Depends(get_user_id_from_header)):
    try:
        await require_membership(workbench_id, x_user_id)
        return await ledger_service.get_balances(workbench_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
