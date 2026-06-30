from datetime import datetime
from typing import Dict, List, Optional
from supabase_client import supabase

class AccountingCompiler:
    def compile_trade_activities(self, trade_id: str, executed_activities: List[Dict], executed_by: Optional[str] = None) -> Dict:
        """
        Takes the executed list of operational activities for a trade,
        determines the appropriate double-entry journal postings,
        validates balancing, and registers the ledger records.
        """
        # 1. Fetch trade details
        trade_res = supabase.table("trades").select("*").eq("id", trade_id).single().execute()
        trade = trade_res.data
        if not trade:
            raise ValueError(f"Trade {trade_id} not found for accounting compilation")
            
        workbench_id = trade["workbench_id"]
        
        # 2. Fetch trade labels to resolve default COA accounts
        labels_map = {}
        try:
            labels_res = supabase.table("trade_labels").select("label_id, role").eq("trade_id", trade_id).execute()
            labels_map = {l["role"]: l["label_id"] for l in (labels_res.data or [])}
        except Exception:
            pass

        debit_postings = []
        credit_postings = []
        
        for activity in executed_activities:
            activity_type = activity["activity_type"]
            amount = float(activity["amount"])
            
            # Resolve target label ID
            label_id = activity.get("entity_id") or activity.get("target_id")
            if not label_id:
                if activity_type in ("CREATE_RECEIVABLE", "REMOVE_RECEIVABLE"):
                    label_id = labels_map.get("asset")
                elif activity_type in ("CREATE_PAYABLE", "REMOVE_PAYABLE"):
                    label_id = labels_map.get("liability")
                elif activity_type == "CREATE_ASSET":
                    label_id = labels_map.get("asset")
                    
            action = activity.get("action")
            if not action:
                if activity_type in ("ADD_EXPENSE", "ADD_INPUT_GST", "CREATE_RECEIVABLE", "CREATE_ASSET", "REMOVE_PAYABLE", "INCREASE_LABEL"):
                    action = "DEBIT"
                elif activity_type in ("CREATE_PAYABLE", "ADD_REVENUE", "ADD_OUTPUT_GST", "REMOVE_RECEIVABLE", "SUBTRACT_BANK", "DECREASE_LABEL"):
                    action = "CREDIT"
                    
            if action == "DEBIT":
                if label_id:
                    debit_postings.append({
                        "label_id": label_id,
                        "amount": amount
                    })
            elif action == "CREDIT":
                if label_id:
                    credit_postings.append({
                        "label_id": label_id,
                        "amount": amount
                    })
        
        if not debit_postings and not credit_postings:
            print("[WARNING] No accounting postings generated for trade activities")
            return {"status": "No Entries"}
            
        # 3. Strict Double-Entry Validation
        sum_debits = sum(d["amount"] for d in debit_postings)
        sum_credits = sum(c["amount"] for c in credit_postings)
        
        # Rounding check to prevent floating-point discrepancies
        if abs(sum_debits - sum_credits) > 0.01:
            raise ValueError(
                f"Double-entry validation failed: Debits (₹{sum_debits}) must equal Credits (₹{sum_credits}). "
                f"Difference: ₹{abs(sum_debits - sum_credits)}"
            )
            
        # 4. Insert Transaction Header
        tx_header = {
            "workbench_id": workbench_id,
            "description": trade.get("description") or f"Double-entry journal for {trade.get('trade_type')}",
            "transaction_date": trade.get("invoice_date") or datetime.utcnow().date().isoformat(),
            "source_party_id": trade.get("party_id"),
            "created_at": datetime.utcnow().isoformat()
        }
        
        tx_res = supabase.table("transactions").insert(tx_header).execute()
        if not tx_res.data:
            raise RuntimeError("Failed to create ledger transaction header")
            
        tx_id = tx_res.data[0]["id"]
        
        # 5. Insert Entries
        entries = []
        for d in debit_postings:
            entries.append({
                "transaction_id": tx_id,
                "label_id": d["label_id"],
                "amount": d["amount"]
            })
            
        for c in credit_postings:
            entries.append({
                "transaction_id": tx_id,
                "label_id": c["label_id"],
                "amount": -c["amount"]
            })
            
        supabase.table("transaction_entries").insert(entries).execute()
        
        # Update trade status/references in database
        supabase.table("trades").update({
            "status": "Approved",
            "reviewed_by": executed_by,
            "updated_at": datetime.utcnow().isoformat()
        }).eq("id", trade_id).execute()
        
        # Link document to the transaction header
        doc_id = trade.get("document_id")
        if doc_id:
            try:
                supabase.table("workbench_documents").update({
                    "transaction_id": tx_id
                }).eq("id", doc_id).execute()
            except Exception as doc_err:
                print(f"[WARNING] Failed to link document to compiled transaction: {doc_err}")
                
        return {
            "status": "Success",
            "transaction_id": tx_id,
            "debitted": sum_debits,
            "credited": sum_credits
        }

# Instantiate service singleton
accounting_compiler = AccountingCompiler()
