from datetime import datetime
from typing import Dict, List, Optional
from supabase_client import supabase

class ActivityExecutor:
    def execute_activity(self, activity: Dict, executed_by: Optional[str] = None) -> Dict:
        """
        Executes a single financial activity:
        1. Validate
        2. Update Operational State
        3. Audit Log
        4. Return result
        """
        activity_id = activity["id"]
        activity_type = activity["activity_type"]
        amount = float(activity["amount"])
        trade_id = activity["trade_id"]
        
        # 1. Fetch trade context
        trade_res = supabase.table("trades").select("*").eq("id", trade_id).single().execute()
        trade = trade_res.data
        if not trade:
            raise ValueError(f"Trade {trade_id} not found for activity {activity_id}")
            
        workbench_id = trade["workbench_id"]
        
        # Create execution record
        exec_payload = {
            "activity_id": activity_id,
            "status": "Failed",
            "executed_by": executed_by,
            "started_at": datetime.utcnow().isoformat(),
            "previous_value": {},
            "new_value": {}
        }
        
        exec_res = supabase.table("trade_activity_execution").insert(exec_payload).execute()
        exec_id = exec_res.data[0]["id"] if exec_res.data else None

        try:
            previous_state = {}
            new_state = {}
            
            # 2. Mutate operational state based on activity type
            if activity_type == "CREATE_RECEIVABLE":
                # Create invoice record for customer — idempotent
                party_id = activity.get("party_id") or trade.get("party_id")
                invoice_number = trade.get("invoice_number") or f"INV-{trade_id[:8]}"

                # Idempotency: if invoice already exists, reuse it
                dup_check = supabase.table("invoices").select("id").eq("workbench_id", workbench_id).eq("invoice_number", invoice_number).execute()
                if dup_check.data:
                    print(f"[INFO] Invoice {invoice_number} already exists — reusing existing record (idempotent retry)")
                    new_state["invoice"] = {"id": dup_check.data[0]["id"], "reused": True}
                else:
                    inv_data = {
                        "workbench_id": workbench_id,
                        "party_id": party_id,
                        "invoice_number": invoice_number,
                        "amount": amount,
                        "balance_due": amount,
                        "issue_date": trade.get("invoice_date") or datetime.utcnow().date().isoformat(),
                        "due_date": trade.get("due_date"),
                        "status": "sent",
                        "description": trade.get("description")
                    }
                    try:
                        labels_res = supabase.table("trade_labels").select("label_id, role").eq("trade_id", trade_id).execute()
                        for label in (labels_res.data or []):
                            if label["role"] == "revenue":
                                inv_data["revenue_label_id"] = label["label_id"]
                            elif label["role"] == "asset":
                                inv_data["ar_label_id"] = label["label_id"]
                    except Exception:
                        pass
                    inv_res = supabase.table("invoices").insert(inv_data).execute()
                    new_state["invoice"] = inv_res.data[0] if inv_res.data else {}
                
            elif activity_type == "CREATE_PAYABLE":
                # Create bill record for vendor — idempotent
                party_id = activity.get("party_id") or trade.get("party_id")
                bill_number = trade.get("invoice_number") or f"BILL-{trade_id[:8]}"

                # Idempotency: if bill already exists, reuse it instead of failing
                dup_check = supabase.table("bills").select("id").eq("workbench_id", workbench_id).eq("bill_number", bill_number).execute()
                if dup_check.data:
                    print(f"[INFO] Bill {bill_number} already exists — reusing existing record (idempotent retry)")
                    new_state["bill"] = {"id": dup_check.data[0]["id"], "reused": True}
                else:
                    bill_data = {
                        "workbench_id": workbench_id,
                        "party_id": party_id,
                        "bill_number": bill_number,
                        "amount": amount,
                        "balance_due": amount,
                        "issue_date": trade.get("invoice_date") or datetime.utcnow().date().isoformat(),
                        "due_date": trade.get("due_date"),
                        "status": "unpaid",
                        "category": "expense",
                        "description": trade.get("description")
                    }
                    try:
                        labels_res = supabase.table("trade_labels").select("label_id, role").eq("trade_id", trade_id).execute()
                        for label in (labels_res.data or []):
                            if label["role"] == "expense":
                                bill_data["expense_label_id"] = label["label_id"]
                            elif label["role"] == "liability":
                                bill_data["ap_label_id"] = label["label_id"]
                    except Exception:
                        pass
                    bill_res = supabase.table("bills").insert(bill_data).execute()
                    new_state["bill"] = bill_res.data[0] if bill_res.data else {}

            elif activity_type in ("INCREASE_LABEL", "DECREASE_LABEL", "ADD_EXPENSE", "ADD_REVENUE", "ADD_INPUT_GST", "ADD_OUTPUT_GST"):
                label_id = activity.get("target_id") or activity.get("entity_id")
                if not label_id:
                    # Try fetching from trade_labels (may not exist)
                    try:
                        tl_res = supabase.table("trade_labels").select("label_id").eq("trade_id", trade_id).execute()
                        if tl_res.data:
                            label_id = tl_res.data[0]["label_id"]
                    except Exception:
                        pass
                
                if not label_id:
                    # Last resort: find a default expense/revenue account in the workbench
                    accs = supabase.table("workbench_accounts").select("id, full_account_name, master_accounts(account_name)").eq("workbench_id", workbench_id).eq("is_active", True).execute()
                    for acc in (accs.data or []):
                        master_name = (acc.get("master_accounts") or {}).get("account_name", "").lower()
                        if activity_type in ("ADD_EXPENSE", "ADD_INPUT_GST") and "exp" in master_name:
                            label_id = acc["id"]
                            break
                        elif activity_type in ("ADD_REVENUE", "ADD_OUTPUT_GST") and "rev" in master_name:
                            label_id = acc["id"]
                            break
                
                if not label_id:
                    print(f"[WARNING] No label resolved for {activity_type}, skipping balance update")
                    new_state["skipped"] = {"type": activity_type, "reason": "no_label_id"}
                else:
                    l_res = supabase.table("workbench_accounts").select("current_amount").eq("id", label_id).single().execute()
                    prev_val = float(l_res.data.get("current_amount") or 0.0)
                    previous_state["label_balance"] = {"label_id": label_id, "balance": prev_val}
                    
                    # Determine direction: INCREASE/ADD = positive, DECREASE = negative
                    if activity_type in ("INCREASE_LABEL", "ADD_EXPENSE", "ADD_INPUT_GST", "ADD_REVENUE", "ADD_OUTPUT_GST"):
                        change = amount
                    else:
                        change = -amount
                    new_val = prev_val + change
                    
                    supabase.table("workbench_accounts").update({"current_amount": new_val}).eq("id", label_id).execute()
                    new_state["label_balance"] = {"label_id": label_id, "balance": new_val}
                
            elif activity_type == "CREATE_ASSET":
                label_id = activity.get("entity_id") or activity.get("target_id")
                asset_name = activity.get("metadata", {}).get("asset_name") or trade.get("description") or "New Asset"
                useful_life = int(activity.get("metadata", {}).get("useful_life") or 5)
                dep_method = activity.get("metadata", {}).get("depreciation_method") or "Straight Line"
                salvage = float(activity.get("metadata", {}).get("salvage_value") or 0.0)
                
                asset_data = {
                    "workbench_id": workbench_id,
                    "label_id": label_id,
                    "trade_id": trade_id,
                    "name": asset_name,
                    "purchase_date": trade.get("invoice_date") or datetime.utcnow().date().isoformat(),
                    "purchase_value": amount,
                    "useful_life": useful_life,
                    "depreciation_method": dep_method,
                    "salvage_value": salvage,
                    "current_value": amount,
                    "status": "active"
                }
                asset_res = supabase.table("assets").insert(asset_data).execute()
                new_state["asset"] = asset_res.data[0] if asset_res.data else {}

            elif activity_type == "UPDATE_STOCK":
                item_id = activity.get("target_id")
                qty_change = float(activity.get("metadata", {}).get("quantity") or 0.0)
                unit_cost = float(activity.get("metadata", {}).get("unit_cost") or 0.0)
                reason = activity.get("metadata", {}).get("reason") or ("sale" if qty_change < 0 else "purchase")
                
                if not item_id:
                    raise ValueError("Item ID is required for stock updates")
                
                # Fetch previous stock level
                item_res = supabase.table("items").select("name").eq("id", item_id).single().execute()
                previous_state["item"] = item_res.data
                
                stock_data = {
                    "item_id": item_id,
                    "quantity_change": qty_change,
                    "unit_cost": unit_cost,
                    "reason": reason
                }
                stock_res = supabase.table("stock_ledger").insert(stock_data).execute()
                new_state["stock_ledger"] = stock_res.data[0] if stock_res.data else {}

            elif activity_type == "UPDATE_PARTY":
                party_id = activity.get("party_id") or trade.get("party_id")
                if not party_id:
                    raise ValueError("Party ID is required for party updates")
                    
                p_res = supabase.table("parties").select("outstanding_amount").eq("id", party_id).single().execute()
                prev_val = float(p_res.data.get("outstanding_amount") or 0.0)
                previous_state["party_outstanding"] = {"party_id": party_id, "amount": prev_val}
                
                # Settle party outstanding dynamically based on direction
                direction = activity.get("action") or "INCREASE"
                change = amount if direction == "INCREASE" else -amount
                new_val = prev_val + change
                
                supabase.table("parties").update({"outstanding_amount": new_val}).eq("id", party_id).execute()
                new_state["party_outstanding"] = {"party_id": party_id, "amount": new_val}

            elif activity_type == "UPDATE_ENTITY":
                entity_id = activity.get("entity_id")
                if not entity_id:
                    raise ValueError("Entity ID is required for entity balance updates")
                    
                ent_res = supabase.table("entities").select("balance").eq("id", entity_id).single().execute()
                prev_val = float(ent_res.data.get("balance") or 0.0)
                previous_state["entity_balance"] = {"entity_id": entity_id, "balance": prev_val}
                
                direction = activity.get("action") or "INCREASE"
                change = amount if direction == "INCREASE" else -amount
                new_val = prev_val + change
                
                supabase.table("entities").update({"balance": new_val}).eq("id", entity_id).execute()
                new_state["entity_balance"] = {"entity_id": entity_id, "balance": new_val}
                
            elif activity_type == "CONSUME_BUDGET":
                # Analytical validation done in Stage 12, here we just log it
                new_state["budget"] = {"consumed_amount": amount}
                
            elif activity_type in ("REMOVE_RECEIVABLE", "REMOVE_PAYABLE", "SUBTRACT_BANK"):
                # These are handled via invoice/bill settlement logic or label decrease
                # For now, log and skip operational mutation
                new_state["settlement"] = {"type": activity_type, "amount": amount}
                
            else:
                print(f"[WARNING] Unhandled activity type: {activity_type}, skipping operational mutation")
                new_state["skipped"] = {"type": activity_type, "amount": amount}

            # 3. Audit execution success
            finished_at = datetime.utcnow().isoformat()
            supabase.table("trade_activity_execution").update({
                "status": "Success",
                "previous_value": previous_state,
                "new_value": new_state,
                "finished_at": finished_at
            }).eq("id", exec_id).execute()
            
            # Mark activity status as Executed
            supabase.table("trade_activities").update({"status": "Executed"}).eq("id", activity_id).execute()
            
            # Log into immutable audit_logs
            audit_log_data = {
                "trade_id": trade_id,
                "activity_id": activity_id,
                "user_id": executed_by,
                "action": f"EXECUTE_{activity_type}",
                "old_value": previous_state,
                "new_value": new_state,
                "metadata": {"executed_by": executed_by, "timestamp": finished_at}
            }
            supabase.table("audit_logs").insert(audit_log_data).execute()
            
            return {"status": "Success", "activity_id": activity_id}

        except Exception as e:
            finished_at = datetime.utcnow().isoformat()
            supabase.table("trade_activity_execution").update({
                "status": "Failed",
                "finished_at": finished_at,
                "error_message": str(e)
            }).eq("id", exec_id).execute()
            
            # Mark activity status as Failed
            supabase.table("trade_activities").update({"status": "Failed"}).eq("id", activity_id).execute()
            raise e

# Instantiate service singleton
activity_executor = ActivityExecutor()
