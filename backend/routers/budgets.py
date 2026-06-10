from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from pydantic import BaseModel
from datetime import date
from supabase_client import supabase
from .auth_utils import require_membership, get_user_id_from_header

router = APIRouter()

class BudgetCreate(BaseModel):
    workbench_id: str
    project_id: Optional[str] = None
    name: str
    start_date: date
    end_date: date
    total_amount: float

@router.post("/")
async def create_budget(budget: BudgetCreate, x_user_id: str = Depends(get_user_id_from_header)):
    try:
        await require_membership(budget.workbench_id, x_user_id)
        data = budget.dict()
        data["start_date"] = str(budget.start_date)
        data["end_date"] = str(budget.end_date)
        
        response = supabase.table("budgets").insert(data).execute()
        return response.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{workbench_id}/performance")
async def get_budget_performance(workbench_id: str, x_user_id: str = Depends(get_user_id_from_header)):
    try:
        await require_membership(workbench_id, x_user_id)
        # Instead of calculating in Python, we can just query the SQL view we created
        response = supabase.table("view_budget_vs_actual").select("*").eq("workbench_id", workbench_id).execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{workbench_id}/transactions/{category}")
async def get_clubbed_transactions(workbench_id: str, category: str, x_user_id: str = Depends(get_user_id_from_header)):
    """
    Returns the individual fragmented transactions that were clubbed into a budget category.
    """
    try:
        await require_membership(workbench_id, x_user_id)
        # First, find the budget to get the date range
        budget_res = supabase.table("budgets").select("*").eq("workbench_id", workbench_id).eq("name", category).execute()
        
        if not budget_res.data:
            return []
            
        b = budget_res.data[0]
        
        # Query transaction entries for that sub-account and date range
        query = f"""
            SELECT te.amount, t.transaction_date, t.description, l.name as label_name
            FROM transaction_entries te
            JOIN transactions t ON t.id = te.transaction_id
            JOIN labels l ON l.id = te.label_id
            WHERE t.workbench_id = '{workbench_id}'
            AND l.sub_account = '{category}'
            AND t.transaction_date >= '{b['start_date']}'
            AND t.transaction_date <= '{b['end_date']}'
            ORDER BY t.transaction_date DESC
        """
        
        # We can't run raw SQL from client easily unless via rpc, so let's do it via Supabase RPC or Python filtering
        # To avoid RPC, we fetch all relevant entries and filter
        
        # Fetch labels in category
        labels_res = supabase.table("labels").select("id, name").eq("workbench_id", workbench_id).eq("sub_account", category).execute()
        label_ids = [l["id"] for l in labels_res.data]
        
        if not label_ids:
            return []
            
        # Fetch transaction entries
        te_res = supabase.table("transaction_entries").select("amount, transaction_id, label_id").in_("label_id", label_ids).execute()
        if not te_res.data:
            return []
            
        tx_ids = [te["transaction_id"] for te in te_res.data]
        
        # Fetch transactions within date range
        tx_res = supabase.table("transactions").select("id, description, transaction_date").in_("id", tx_ids).gte("transaction_date", b['start_date']).lte("transaction_date", b['end_date']).order("transaction_date", desc=True).execute()
        
        valid_tx_ids = {t["id"]: t for t in tx_res.data}
        
        # Combine
        results = []
        for te in te_res.data:
            if te["transaction_id"] in valid_tx_ids:
                t = valid_tx_ids[te["transaction_id"]]
                l_name = next(l["name"] for l in labels_res.data if l["id"] == te["label_id"])
                results.append({
                    "amount": te["amount"],
                    "date": t["transaction_date"],
                    "description": t["description"],
                    "label_name": l_name
                })
                
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
