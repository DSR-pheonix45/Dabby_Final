from fastapi import APIRouter, HTTPException
from typing import List, Optional
from pydantic import BaseModel
from datetime import date
from supabase_client import supabase

router = APIRouter()

class BudgetCreate(BaseModel):
    workbench_id: str
    project_id: Optional[str] = None
    name: str
    start_date: date
    end_date: date
    total_amount: float

@router.post("/")
async def create_budget(budget: BudgetCreate):
    try:
        data = budget.dict()
        data["start_date"] = str(budget.start_date)
        data["end_date"] = str(budget.end_date)
        
        response = supabase.table("budgets").insert(data).execute()
        return response.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{workbench_id}/performance")
async def get_budget_performance(workbench_id: str):
    try:
        # Instead of calculating in Python, we can just query the SQL view we created
        response = supabase.table("view_budget_vs_actual").select("*").eq("workbench_id", workbench_id).execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{workbench_id}/transactions/{category}")
async def get_clubbed_transactions(workbench_id: str, category: str):
    """
    Returns the individual fragmented transactions that were clubbed into a budget category.
    """
    try:
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
        
        # Fetch accounts in this sub-account category
        # Note: Now we need to query workbench_accounts based on master_sub_account matching
        accounts_res = supabase_client.table("workbench_accounts").select("id, full_account_name, master_sub_account_id").eq("workbench_id", workbench_id).execute()
        
        # Filter accounts that belong to this category by matching the master_sub_account
        # For simplicity, we'll match by searching the sub-account in the full_account_name
        category_account_ids = [a["id"] for a in accounts_res.data if category.lower() in a["full_account_name"].lower()]
        
        if not category_account_ids:
            return []
            
        # Fetch transaction entries for these accounts
        te_res = supabase.table("transaction_entries").select("amount, transaction_id, account_id").in_("account_id", category_account_ids).execute()
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
                acc_name = next((a["full_account_name"] for a in accounts_res.data if a["id"] == te["account_id"]), "Unknown")
                results.append({
                    "amount": te["amount"],
                    "date": t["transaction_date"],
                    "description": t["description"],
                    "account_name": acc_name
                })
                
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
