from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional, Dict
from pydantic import BaseModel
from services.ledger_service import LedgerService
from supabase_client import supabase
from .auth_utils import require_membership, get_user_id_from_header

router = APIRouter()
ledger_service = LedgerService(supabase)

@router.get("/{workbench_id}")
async def get_workbench_context(workbench_id: str, x_user_id: str = Depends(get_user_id_from_header)):
    """
    Consolidates all workbench data into a single response for fast initial load.
    """
    try:
        # Enforce membership before returning sensitive workbench data
        await require_membership(workbench_id, x_user_id)

        # 1. Fetch Workbench details
        workbench_res = supabase.table("workbenches").select("*").eq("id", workbench_id).maybe_single().execute()
        if not workbench_res.data:
            raise HTTPException(status_code=404, detail="Workbench not found")
        
        # 2. Fetch COA Accounts
        coa_res = supabase.table("coa_accounts").select("*").eq("workbench_id", workbench_id).order("display_order").execute()
        
        # 3. Fetch Ledger Labels
        labels = await ledger_service.get_labels(workbench_id)
        
        # 4. Fetch Balances
        balances = await ledger_service.get_balances(workbench_id)
        
        # 5. Fetch Recent Transactions (Top 50)
        # Note: ledger_service.get_transactions_list already orders by date desc
        transactions = await ledger_service.get_transactions_list(workbench_id)
        recent_transactions = transactions[:50]
        
        # 6. Fetch Inventory Items
        inventory_res = supabase.table("items").select("*").eq("workbench_id", workbench_id).eq("is_deleted", False).order("created_at", desc=True).execute()
        items = inventory_res.data
        
        # Calculate current stock for each item
        for item in items:
            stock_res = supabase.table("stock_ledger").select("quantity_change").eq("item_id", item["id"]).execute()
            item["stock_level"] = sum(float(row["quantity_change"]) for row in stock_res.data)
        
        # 7. Fetch Parties & Entities
        parties_res = supabase.table("parties").select("*, entities(*)").eq("workbench_id", workbench_id).execute()
        
        # 8. Ensure 'Self' identity exists (Party + Legal Entity)
        self_party = next((p for p in parties_res.data if p.get("is_self")), None)
        if not self_party:
            wb_name = workbench_res.data.get("name", "My Company")
            p_res = supabase.table("parties").insert({
                "workbench_id": workbench_id,
                "name": wb_name,
                "category": "corporation",
                "is_self": True
            }).execute()
            self_party = p_res.data[0]
            
            # Also create the first legal entity for this party
            legal_name = workbench_res.data.get("legal_name") or wb_name
            supabase.table("entities").insert({
                "party_id": self_party["id"],
                "name": legal_name,
                "type": "legal_rep",
                "metadata": {
                    "pan": workbench_res.data.get("pan"),
                    "gstin": workbench_res.data.get("gstin"),
                    "cin": workbench_res.data.get("cin"),
                    "incorporation_date": workbench_res.data.get("incorporation_date")
                }
            }).execute()
            
            # Refetch parties to include the new one and its entity
            parties_res = supabase.table("parties").select("*, entities(*)").eq("workbench_id", workbench_id).execute()
        elif not self_party.get("entities"):
            # Party exists but has no entities, create the legal one
            legal_name = workbench_res.data.get("legal_name") or self_party["name"]
            supabase.table("entities").insert({
                "party_id": self_party["id"],
                "name": legal_name,
                "type": "legal_rep",
                "metadata": {
                    "pan": workbench_res.data.get("pan"),
                    "gstin": workbench_res.data.get("gstin"),
                    "cin": workbench_res.data.get("cin"),
                    "incorporation_date": workbench_res.data.get("incorporation_date")
                }
            }).execute()
            parties_res = supabase.table("parties").select("*, entities(*)").eq("workbench_id", workbench_id).execute()

        return {
            "workbench": workbench_res.data,
            "coa": coa_res.data,
            "labels": labels,
            "balances": balances,
            "transactions": recent_transactions,
            "inventory": items,
            "parties": parties_res.data,
            "last_sync": "now" # Could use a timestamp here
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] Context API failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
