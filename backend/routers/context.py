from fastapi import APIRouter, HTTPException
from typing import List, Optional, Dict
from pydantic import BaseModel
from services.ledger_service import LedgerService
from supabase_client import supabase

router = APIRouter()
ledger_service = LedgerService(supabase)

@router.get("/{workbench_id}")
async def get_workbench_context(workbench_id: str):
    """
    Consolidates all workbench data into a single response for fast initial load.
    """
    try:
        # 1. Fetch Workbench details
        try:
            workbench_res = supabase.table("workbenches").select("*").eq("id", workbench_id).maybe_single().execute()
            workbench_data = workbench_res.data
        except Exception as wb_err:
            print(f"[WARNING] Failed to fetch workbench details: {wb_err}")
            workbench_data = None
            
        if not workbench_data:
            raise HTTPException(status_code=404, detail="Workbench not found")
        
        # 2. Fetch COA Accounts
        try:
            coa_res = supabase.table("coa_accounts").select("*").eq("workbench_id", workbench_id).order("display_order").execute()
            coa_data = coa_res.data or []
        except Exception as coa_err:
            print(f"[WARNING] Failed to fetch COA: {coa_err}")
            coa_data = []
        
        # 3. Fetch Ledger Labels
        try:
            labels = await ledger_service.get_labels(workbench_id)
        except Exception as labels_err:
            print(f"[WARNING] Failed to fetch labels: {labels_err}")
            labels = []
        
        # 4. Fetch Balances
        try:
            balances = await ledger_service.get_balances(workbench_id)
        except Exception as bal_err:
            print(f"[WARNING] Failed to fetch balances: {bal_err}")
            balances = {}
        
        # 5. Fetch Recent Transactions (Top 50)
        try:
            transactions = await ledger_service.get_transactions_list(workbench_id)
            recent_transactions = transactions[:50]
        except Exception as tx_err:
            print(f"[WARNING] Failed to fetch transactions: {tx_err}")
            recent_transactions = []
        
        # 6. Fetch Inventory Items
        try:
            inventory_res = supabase.table("items").select("*").eq("workbench_id", workbench_id).eq("is_deleted", False).order("created_at", desc=True).execute()
            items = inventory_res.data or []
            
            # Calculate current stock for each item
            for item in items:
                try:
                    stock_res = supabase.table("stock_ledger").select("quantity_change").eq("item_id", item["id"]).execute()
                    item["stock_level"] = sum(float(row["quantity_change"]) for row in stock_res.data if row.get("quantity_change") is not None)
                except Exception as stock_err:
                    print(f"[WARNING] Failed to calculate stock for item {item.get('id')}: {stock_err}")
                    item["stock_level"] = 0
        except Exception as inv_err:
            print(f"[WARNING] Failed to fetch inventory: {inv_err}")
            items = []
        
        # 7. Fetch Parties & Entities
        try:
            parties_res = supabase.table("parties").select("*, entities(*)").eq("workbench_id", workbench_id).execute()
            parties_data = parties_res.data or []
            
            # 8. Ensure 'Self' identity exists (Party + Legal Entity)
            self_party = next((p for p in parties_data if p.get("is_self")), None)
            if not self_party:
                wb_name = workbench_data.get("name", "My Company")
                p_res = supabase.table("parties").insert({
                    "workbench_id": workbench_id,
                    "name": wb_name,
                    "category": "corporation",
                    "is_self": True
                }).execute()
                if p_res.data:
                    self_party = p_res.data[0]
                    
                    # Also create the first legal entity for this party
                    legal_name = workbench_data.get("legal_name") or wb_name
                    supabase.table("entities").insert({
                        "party_id": self_party["id"],
                        "name": legal_name,
                        "type": "legal_rep",
                        "metadata": {
                            "pan": workbench_data.get("pan"),
                            "gstin": workbench_data.get("gstin"),
                            "cin": workbench_data.get("cin"),
                            "incorporation_date": workbench_data.get("incorporation_date")
                        }
                    }).execute()
                    
                    # Refetch parties to include the new one and its entity
                    parties_res = supabase.table("parties").select("*, entities(*)").eq("workbench_id", workbench_id).execute()
                    parties_data = parties_res.data or []
            elif not self_party.get("entities"):
                # Party exists but has no entities, create the legal one
                legal_name = workbench_data.get("legal_name") or self_party["name"]
                supabase.table("entities").insert({
                    "party_id": self_party["id"],
                    "name": legal_name,
                    "type": "legal_rep",
                    "metadata": {
                        "pan": workbench_data.get("pan"),
                        "gstin": workbench_data.get("gstin"),
                        "cin": workbench_data.get("cin"),
                        "incorporation_date": workbench_data.get("incorporation_date")
                    }
                }).execute()
                parties_res = supabase.table("parties").select("*, entities(*)").eq("workbench_id", workbench_id).execute()
                parties_data = parties_res.data or []
        except Exception as party_err:
            print(f"[WARNING] Failed to fetch/initialize parties: {party_err}")
            parties_data = []
        
        # 8. Fetch Documents
        try:
            documents_res = supabase.table("workbench_documents").select("*").eq("workbench_id", workbench_id).order("created_at", desc=True).execute()
            documents = documents_res.data or []
        except Exception as doc_err:
            print(f"[WARNING] Failed to fetch documents: {doc_err}")
            documents = []

        return {
            "workbench": workbench_data,
            "coa": coa_data,
            "labels": labels,
            "balances": balances,
            "transactions": recent_transactions,
            "inventory": items,
            "parties": parties_data,
            "documents": documents,
            "last_sync": "now" # Could use a timestamp here
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] Context API failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
