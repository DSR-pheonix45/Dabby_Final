from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional, Dict
from pydantic import BaseModel
from datetime import date
from services.inventory_service import InventoryService
from supabase_client import supabase

router = APIRouter()
inventory_service = InventoryService(supabase)

# --- Pydantic Models ---

class ItemCreate(BaseModel):
    workbench_id: str
    name: str
    sku: Optional[str] = None
    category: Optional[str] = "General"
    type: str # goods/service
    usage_type: str = "trading" # trading/internal
    unit: str = "pcs"
    min_stock_level: float = 0
    price: float = 0
    cost_method: str = "FIFO"
    inventory_label_id: Optional[str] = None
    cogs_label_id: Optional[str] = None
    revenue_label_id: Optional[str] = None
    # stock_level is sent by frontend but calculated from ledger in backend
    stock_level: Optional[float] = 0 

class PurchaseRequest(BaseModel):
    workbench_id: str
    item_id: str
    quantity: float
    unit_cost: float
    source_entity_id: str # The Bank/AP label ID
    description: Optional[str] = None
    transaction_date: Optional[date] = None

class SaleRequest(BaseModel):
    workbench_id: str
    item_id: str
    quantity: float
    selling_price: float
    destination_entity_id: str # The Bank/AR label ID
    description: Optional[str] = None
    transaction_date: Optional[date] = None

# --- Item Endpoints ---

@router.post("/items")
async def create_item(item: ItemCreate):
    try:
        item_dict = item.dict()
        # Convert empty strings to None for optional UUID fields
        for field in ["inventory_label_id", "cogs_label_id", "revenue_label_id"]:
            if item_dict.get(field) == "":
                item_dict[field] = None
                
        return await inventory_service.create_item(item_dict)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/items/{workbench_id}")
async def get_items(workbench_id: str):
    try:
        return await inventory_service.get_items(workbench_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/items/{item_id}/stock")
async def get_item_stock(item_id: str):
    try:
        level = await inventory_service.get_stock_level(item_id)
        return {"item_id": item_id, "quantity_on_hand": level}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- Flow Endpoints ---

@router.post("/purchase")
async def purchase_stock(req: PurchaseRequest):
    try:
        return await inventory_service.record_purchase(
            workbench_id=req.workbench_id,
            item_id=req.item_id,
            quantity=req.quantity,
            unit_cost=req.unit_cost,
            source_entity_id=req.source_entity_id,
            description=req.description,
            transaction_date=req.transaction_date
        )
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/sale")
async def sell_stock(req: SaleRequest):
    try:
        return await inventory_service.record_sale(
            workbench_id=req.workbench_id,
            item_id=req.item_id,
            quantity=req.quantity,
            selling_price=req.selling_price,
            destination_entity_id=req.destination_entity_id,
            description=req.description,
            transaction_date=req.transaction_date
        )
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
