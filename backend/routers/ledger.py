from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional, Dict
from pydantic import BaseModel
from datetime import date
from services.ledger_service import LedgerService
from supabase_client import supabase

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
async def create_label(label: LabelCreate):
    try:
        return await ledger_service.create_label(label.dict())
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/labels/{workbench_id}")
async def get_labels(workbench_id: str):
    try:
        return await ledger_service.get_labels(workbench_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/labels/{label_id}")
async def update_label(label_id: str, label: LabelUpdate):
    try:
        return await ledger_service.update_label(label_id, label.dict(exclude_unset=True))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/labels/{label_id}")
async def delete_label(label_id: str):
    try:
        return await ledger_service.delete_label(label_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/labels/seed/{workbench_id}")
async def seed_labels(workbench_id: str):
    try:
        return await ledger_service.seed_basic_labels(workbench_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- Transaction Endpoints ---

@router.post("/transactions")
async def create_transaction(tx: TransactionCreate):
    try:
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
async def list_transactions(workbench_id: str):
    try:
        return await ledger_service.get_transactions_list(workbench_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- Analytics Endpoints ---

@router.get("/balances/{workbench_id}")
async def get_balances(workbench_id: str):
    try:
        return await ledger_service.get_balances(workbench_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
