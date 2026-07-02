import os
from datetime import datetime
from typing import Dict, List, Optional
from fastapi import APIRouter, HTTPException, Depends
from supabase_client import supabase

router = APIRouter()

@router.get("/workbench/{workbench_id}")
async def get_workbench_trades(workbench_id: str, status: Optional[str] = None):
    try:
        query = supabase.table("trades").select("*").eq("workbench_id", workbench_id)
        if status and status != "All":
            query = query.eq("status", status)
        res = query.order("created_at", desc=True).execute()
        trades = res.data or []
        if not trades:
            return []
        
        # Fetch all parties and entities for these trades
        trade_ids = [t["id"] for t in trades]
        
        tp_res = supabase.table("trade_parties").select("*, parties(*)").in_("trade_id", trade_ids).execute()
        te_res = supabase.table("trade_entities").select("*, entities(*)").in_("trade_id", trade_ids).execute()
        
        # Map them
        tp_map = {}
        for tp in (tp_res.data or []):
            tp_map.setdefault(tp["trade_id"], []).append(tp)
            
        te_map = {}
        for te in (te_res.data or []):
            te_map.setdefault(te["trade_id"], []).append(te)
            
        for t in trades:
            t["trade_parties"] = tp_map.get(t["id"], [])
            t["trade_entities"] = te_map.get(t["id"], [])
            
        return trades
    except Exception as e:
        import traceback
        print(f"[ERROR] get_workbench_trades fail: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{trade_id}")
async def get_trade(trade_id: str):
    try:
        t_res = supabase.table("trades").select("*").eq("id", trade_id).single().execute()
        trade = t_res.data
        if not trade:
            raise HTTPException(status_code=404, detail="Trade not found")
        
        tp_res = supabase.table("trade_parties").select("*, parties(*)").eq("trade_id", trade_id).execute()
        te_res = supabase.table("trade_entities").select("*, entities(*)").eq("trade_id", trade_id).execute()
        
        trade["trade_parties"] = tp_res.data or []
        trade["trade_entities"] = te_res.data or []
        
        # Fetch document filename/mime_type details if linked
        if trade.get("document_id"):
            d_res = supabase.table("workbench_documents").select("filename, mime_type, file_path").eq("id", trade["document_id"]).execute()
            if d_res.data:
                trade["document"] = d_res.data[0]
        
        # Add dynamic validation warnings
        from services.trade_service import trade_service
        parties_list = [tp["parties"] for tp in (tp_res.data or []) if tp.get("parties")]
        trade["validation_issues"] = trade_service.validate_trade_sync(trade, parties_list, te_res.data or [])
        
        return trade
    except Exception as e:
        import traceback
        print(f"[ERROR] get_trade fail: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{trade_id}")
async def update_trade(trade_id: str, payload: Dict):
    try:
        # Fetch trade to ensure it exists
        t_res = supabase.table("trades").select("*").eq("id", trade_id).single().execute()
        trade = t_res.data
        if not trade:
            raise HTTPException(status_code=404, detail="Trade not found")
        
        # Fields to update
        update_fields = {}
        for field in ["trade_type", "trade_direction", "amount", "gross_amount", "tax_amount", "net_amount", "currency", "invoice_number", "invoice_date", "due_date", "description", "notes", "status"]:
            if field in payload:
                update_fields[field] = payload[field]
                
        # If gross_amount is set, update amount as well for legacy compatibility
        if "gross_amount" in payload:
            update_fields["amount"] = payload["gross_amount"]
        elif "amount" in payload:
            update_fields["gross_amount"] = payload["amount"]
        
        update_fields["updated_at"] = datetime.utcnow().isoformat()
        
        # Perform update
        if update_fields:
            try:
                t_res = supabase.table("trades").update(update_fields).eq("id", trade_id).execute()
                trade = t_res.data[0]
            except Exception as e:
                print(f"[WARNING] Extended fields update failed, attempting fallback: {e}")
                # Remove newly added columns
                fallback_fields = {k: v for k, v in update_fields.items() if k not in ["gross_amount", "tax_amount", "net_amount"]}
                t_res = supabase.table("trades").update(fallback_fields).eq("id", trade_id).execute()
                trade = t_res.data[0]
            
        # Handle party updates (counterparty)
        if "party_id" in payload:
            party_id = payload["party_id"]
            tp_res = supabase.table("trade_parties").select("*").eq("trade_id", trade_id).eq("role", "counterparty").execute()
            
            if party_id:
                p_res = supabase.table("parties").select("*").eq("id", party_id).single().execute()
                party_name = p_res.data["name"] if p_res.data else "Resolved Counterparty"
                
                if tp_res.data:
                    supabase.table("trade_parties").update({
                        "party_id": party_id,
                        "detected_name": party_name
                    }).eq("id", tp_res.data[0]["id"]).execute()
                else:
                    supabase.table("trade_parties").insert({
                        "trade_id": trade_id,
                        "party_id": party_id,
                        "role": "counterparty",
                        "detected_name": party_name
                    }).execute()
            else:
                if tp_res.data:
                    supabase.table("trade_parties").update({
                        "party_id": None
                    }).eq("id", tp_res.data[0]["id"]).execute()

        # Handle counterparty entity updates
        if "entity_id" in payload:
            entity_id = payload["entity_id"]
            te_res = supabase.table("trade_entities").select("*").eq("trade_id", trade_id).eq("role", "counterparty").execute()
            
            if entity_id:
                e_res = supabase.table("entities").select("*").eq("id", entity_id).single().execute()
                ent_name = e_res.data["name"] if e_res.data else "Resolved Entity"
                
                if te_res.data:
                    supabase.table("trade_entities").update({
                        "entity_id": entity_id,
                        "detected_name": ent_name
                    }).eq("id", te_res.data[0]["id"]).execute()
                else:
                    supabase.table("trade_entities").insert({
                        "trade_id": trade_id,
                        "entity_id": entity_id,
                        "role": "counterparty",
                        "detected_name": ent_name
                    }).execute()
            else:
                if te_res.data:
                    supabase.table("trade_entities").update({
                        "entity_id": None
                    }).eq("id", te_res.data[0]["id"]).execute()

        # Handle our entity updates
        if "our_entity_id" in payload:
            our_entity_id = payload["our_entity_id"]
            te_res = supabase.table("trade_entities").select("*").eq("trade_id", trade_id).eq("role", "our_company").execute()
            
            if our_entity_id:
                e_res = supabase.table("entities").select("*").eq("id", our_entity_id).single().execute()
                ent_name = e_res.data["name"] if e_res.data else "Resolved Entity"
                
                if te_res.data:
                    supabase.table("trade_entities").update({
                        "entity_id": our_entity_id,
                        "detected_name": ent_name
                    }).eq("id", te_res.data[0]["id"]).execute()
                else:
                    supabase.table("trade_entities").insert({
                        "trade_id": trade_id,
                        "entity_id": our_entity_id,
                        "role": "our_company",
                        "detected_name": ent_name
                    }).execute()
            else:
                if te_res.data:
                    supabase.table("trade_entities").update({
                        "entity_id": None
                    }).eq("id", te_res.data[0]["id"]).execute()

        # Handle label updates
        if "label_id" in payload:
            label_id = payload["label_id"]
            try:
                tl_res = supabase.table("trade_labels").select("*").eq("trade_id", trade_id).execute()
                
                if label_id:
                    l_res = supabase.table("workbench_accounts").select("name, type").eq("id", label_id).single().execute()
                    label_name = l_res.data["name"] if l_res.data else "Resolved Label"
                    label_role = l_res.data["type"] if l_res.data else "expense"
                    
                    if tl_res.data:
                        supabase.table("trade_labels").update({
                            "label_id": label_id,
                            "role": label_role,
                            "detected_name": label_name
                        }).eq("id", tl_res.data[0]["id"]).execute()
                    else:
                        supabase.table("trade_labels").insert({
                            "trade_id": trade_id,
                            "label_id": label_id,
                            "role": label_role,
                            "detected_name": label_name
                        }).execute()
                else:
                    if tl_res.data:
                        supabase.table("trade_labels").delete().eq("id", tl_res.data[0]["id"]).execute()
            except Exception as e:
                print(f"[WARNING] Update trade_labels failed: {e}")
                    
        # Re-evaluate validations and regenerate summary
        from services.trade_service import trade_service
        
        tp_fresh = supabase.table("trade_parties").select("*, parties(*)").eq("trade_id", trade_id).execute()
        te_fresh = supabase.table("trade_entities").select("*").eq("trade_id", trade_id).execute()
        
        tl_data = []
        try:
            tl_fresh = supabase.table("trade_labels").select("*").eq("trade_id", trade_id).execute()
            tl_data = tl_fresh.data or []
        except Exception as e:
            print(f"[WARNING] Query trade_labels failed: {e}")
            
        parties_list = [tp["parties"] for tp in (tp_fresh.data or []) if tp.get("parties")]
        val_issues = trade_service.validate_trade_sync(trade, parties_list, te_fresh.data or [], tl_data)
        
        # Auto update status based on validation if not explicitly set
        if "status" not in payload:
            has_critical_issues = any(v["type"] == "error" for v in val_issues)
            final_status = "Ready" if not has_critical_issues else "Needs Review"
            if final_status != trade["status"]:
                supabase.table("trades").update({"status": final_status}).eq("id", trade_id).execute()
                trade["status"] = final_status

        # Update summary
        counterparty_name = next((p["name"] for p in parties_list if not p.get("is_self")), "Unknown")
        new_summary = trade_service._generate_summary(trade, counterparty_name)
        supabase.table("trades").update({"description": new_summary}).eq("id", trade_id).execute()
        trade["description"] = new_summary
        
        return {"status": "success", "trade": trade}
    except Exception as e:
        import traceback
        print(f"[ERROR] update_trade fail: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/process-document/{doc_id}")
async def process_document_trade(doc_id: str):
    try:
        from services.trade_service import trade_service
        # Update status to show pipeline has started
        try:
            supabase.table("workbench_documents").update({"status": "OCR_COMPLETE"}).eq("id", doc_id).execute()
        except Exception:
            pass

        # Clear existing trade for this document to avoid duplicates
        existing = supabase.table("trades").select("id").eq("document_id", doc_id).execute()
        if existing.data:
            for t in existing.data:
                supabase.table("trades").delete().eq("id", t["id"]).execute()

        trade = await trade_service.create_trade_from_document(doc_id)
        return {"status": "success", "trade": trade}
    except Exception as e:
        import traceback
        print(f"[ERROR] process_document_trade fail: {e}")
        traceback.print_exc()
        # Mark document as failed if pipeline crashes
        try:
            supabase.table("workbench_documents").update({"status": "PROCESSING_FAILED"}).eq("id", doc_id).execute()
        except Exception:
            pass
        raise HTTPException(status_code=500, detail=str(e))

@router.post("")
async def create_manual_trade(payload: Dict):
    try:
        workbench_id = payload.get("workbench_id")
        if not workbench_id:
            raise HTTPException(status_code=400, detail="Missing workbench_id")
            
        trade_type = payload.get("trade_type", "Manual Trade")
        trade_direction = payload.get("trade_direction", "IMMEDIATE_SETTLEMENT")
        
        trade_payload = {
            "workbench_id": workbench_id,
            "trade_type": trade_type,
            "trade_direction": trade_direction,
            "status": payload.get("status", "Draft"),
            "amount": payload.get("amount"),
            "currency": payload.get("currency", "INR"),
            "invoice_number": payload.get("invoice_number"),
            "invoice_date": payload.get("invoice_date"),
            "due_date": payload.get("due_date"),
            "description": payload.get("description", f"Manual {trade_type}"),
            "notes": payload.get("notes", "")
        }
        
        extended_payload = {
            **trade_payload,
            "gross_amount": payload.get("gross_amount"),
            "tax_amount": payload.get("tax_amount"),
            "net_amount": payload.get("net_amount")
        }
        
        # If gross_amount is set, update amount as well for legacy compatibility
        if payload.get("gross_amount") is not None:
            trade_payload["amount"] = payload["gross_amount"]
            extended_payload["amount"] = payload["gross_amount"]
        elif payload.get("amount") is not None:
            extended_payload["gross_amount"] = payload["amount"]
            
        try:
            res = supabase.table("trades").insert(extended_payload).execute()
        except Exception as e:
            print(f"[WARNING] Extended manual trade insert failed: {e}")
            res = supabase.table("trades").insert(trade_payload).execute()
            
        if not res.data:
            raise RuntimeError("Failed to create trade")
            
        trade = res.data[0]
        trade_id = trade["id"]
        
        # Link our company
        from services.trade_service import trade_service
        our_company = trade_service._resolve_our_company(workbench_id)
        
        supabase.table("trade_parties").insert({
            "trade_id": trade_id,
            "party_id": our_company["id"],
            "role": "our_company",
            "detected_name": our_company["name"]
        }).execute()
        
        # Link counterparty if selected
        counterparty_id = payload.get("party_id")
        if counterparty_id:
            p_res = supabase.table("parties").select("*").eq("id", counterparty_id).single().execute()
            if p_res.data:
                supabase.table("trade_parties").insert({
                    "trade_id": trade_id,
                    "party_id": counterparty_id,
                    "role": "counterparty",
                    "detected_name": p_res.data["name"]
                  }).execute()
                  
        # Link counterparty entity if selected
        counterparty_entity_id = payload.get("entity_id")
        if counterparty_entity_id:
            e_res = supabase.table("entities").select("name").eq("id", counterparty_entity_id).execute()
            if e_res.data:
                supabase.table("trade_entities").insert({
                    "trade_id": trade_id,
                    "entity_id": counterparty_entity_id,
                    "role": "counterparty",
                    "detected_name": e_res.data[0]["name"]
                }).execute()

        # Link our entity if selected
        our_entity_id = payload.get("our_entity_id")
        if our_entity_id:
            e_res = supabase.table("entities").select("name").eq("id", our_entity_id).execute()
            if e_res.data:
                supabase.table("trade_entities").insert({
                    "trade_id": trade_id,
                    "entity_id": our_entity_id,
                    "role": "our_company",
                    "detected_name": e_res.data[0]["name"]
                }).execute()

        # Link label if selected
        label_id = payload.get("label_id")
        if label_id:
            try:
                l_res = supabase.table("workbench_accounts").select("name, type").eq("id", label_id).single().execute()
                if l_res.data:
                    supabase.table("trade_labels").insert({
                        "trade_id": trade_id,
                        "label_id": label_id,
                        "role": l_res.data["type"] or "expense",
                        "detected_name": l_res.data["name"]
                    }).execute()
            except Exception as e:
                print(f"[WARNING] Link trade label failed: {e}")

        # Re-evaluate validations and status
        tp_fresh = supabase.table("trade_parties").select("*, parties(*)").eq("trade_id", trade_id).execute()
        te_fresh = supabase.table("trade_entities").select("*").eq("trade_id", trade_id).execute()
        
        tl_data = []
        try:
            tl_fresh = supabase.table("trade_labels").select("*").eq("trade_id", trade_id).execute()
            tl_data = tl_fresh.data or []
        except Exception as e:
            print(f"[WARNING] Query trade_labels failed: {e}")
            
        parties_list = [tp["parties"] for tp in (tp_fresh.data or []) if tp.get("parties")]
        val_issues = trade_service.validate_trade_sync(trade, parties_list, te_fresh.data or [], tl_data)
        
        has_critical_issues = any(v["type"] == "error" for v in val_issues)
        final_status = "Ready" if not has_critical_issues else "Needs Review"
        
        # Override with user selected status if specified
        if payload.get("status"):
            final_status = payload["status"]
            
        counterparty_name = next((p["name"] for p in parties_list if not p.get("is_self")), "Unknown")
        new_summary = trade_service._generate_summary(trade, counterparty_name)
        
        updated_res = supabase.table("trades").update({
            "status": final_status,
            "description": new_summary
        }).eq("id", trade_id).execute()
        
        if updated_res.data:
            trade = updated_res.data[0]
            
        return trade
    except Exception as e:
        import traceback
        print(f"[ERROR] create_manual_trade fail: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{trade_id}/activities")
async def get_trade_activities(trade_id: str):
    try:
        res = supabase.table("trade_activities").select("*").eq("trade_id", trade_id).order("sequence").execute()
        activities = res.data or []
        if not activities:
            from services.trade_service import trade_service
            activities = trade_service.generate_activities_for_trade(trade_id)
        return activities
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{trade_id}/save-activities")
async def save_trade_activities(trade_id: str, payload: Dict):
    try:
        activities = payload.get("activities") or []
        # Clear existing activities
        supabase.table("trade_activities").delete().eq("trade_id", trade_id).execute()
        
        # Insert updated activities
        to_insert = []
        for act in activities:
            to_insert.append({
                "trade_id": trade_id,
                "sequence": act["sequence"],
                "activity_type": act["activity_type"],
                "action": act.get("action") or ("CREDIT" if act["activity_type"].startswith("DECREASE") or act["activity_type"].startswith("SUBTRACT") or act["activity_type"].startswith("REMOVE") else "DEBIT"),
                "target_type": act.get("target_type") or "workbench_accounts",
                "target_id": act.get("target_id") or None,
                "party_id": act.get("party_id") or None,
                "entity_id": act.get("entity_id") or None,
                "amount": float(act["amount"]),
                "status": act.get("status", "Pending"),
                "metadata": act.get("metadata") or {}
            })
        if to_insert:
            supabase.table("trade_activities").insert(to_insert).execute()
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{trade_id}/audit-trail")
async def get_trade_audit_trail(trade_id: str):
    try:
        res = supabase.table("audit_logs").select("*").eq("trade_id", trade_id).order("created_at", desc=True).execute()
        return res.data or []
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{trade_id}/execute")
async def execute_trade_activities(trade_id: str, payload: Dict = None):
    """
    Stage 10-12: Execute confirmed trade activities → compile double-entry journal
    → recompute COA views (Stage 12). Only works on trades in Ready/Needs Review status.
    NON_FINANCIAL trades (purchase_order, sales_order) are blocked — they never post.

    This endpoint is fully idempotent:
    - Already-Settled/Approved trades: skips re-execution, runs Stage 12 COA recompute only.
    - Partial failures: resumes from the last failed activity.
    """
    try:
        from services.trade_service import trade_service, NON_FINANCIAL_TYPES
        from services.activity_executor import activity_executor
        from services.accounting_compiler import accounting_compiler

        # Validate trade exists and is executable
        t_check = supabase.table("trades").select("*").eq("id", trade_id).single().execute()
        if not t_check.data:
            raise HTTPException(status_code=404, detail="Trade not found")
        trade_check = t_check.data
        workbench_id = trade_check["workbench_id"]

        # Guard: NON_FINANCIAL types must never post journal entries
        if trade_check.get("trade_direction") == "NON_FINANCIAL" or trade_check.get("trade_type") in NON_FINANCIAL_TYPES:
            raise HTTPException(
                status_code=400,
                detail=f"Trade type '{trade_check.get('trade_type')}' is a commitment/pipeline entry — it does not post to the ledger."
            )

        # Already committed — just run Stage 12 COA recompute and return
        # This handles: trade was settled before, COA wasn't updated (e.g. Stage 12 bug in old code)
        if trade_check.get("status") in ("Settled", "Approved"):
            recompute_result = trade_service.recompute_coa_balances(workbench_id)
            return {
                "status": "Already committed — Stage 12 COA recompute triggered",
                "trade_status": trade_check.get("status"),
                "stage_12": recompute_result
            }

        # Check if a transaction already exists for this trade (handles partial compiler failure)
        already_compiled = False
        existing_tx_id = None
        doc_id = trade_check.get("document_id")
        if doc_id:
            doc_res = supabase.table("workbench_documents").select("transaction_id, status").eq("id", doc_id).execute()
            if doc_res.data and doc_res.data[0].get("transaction_id"):
                existing_tx_id = doc_res.data[0]["transaction_id"]
                already_compiled = True

        # Fetch activities
        act_res = supabase.table("trade_activities").select("*").eq("trade_id", trade_id).order("sequence").execute()
        activities = act_res.data or []

        if not activities:
            # Dynamically generate for legacy trades
            trade_service.generate_activities_for_trade(trade_id)
            act_res = supabase.table("trade_activities").select("*").eq("trade_id", trade_id).order("sequence").execute()
            activities = act_res.data or []

        if not activities:
            raise HTTPException(status_code=400, detail="No activities found for this trade. Ensure the financial engine migration has been applied.")

        executed_by = (payload or {}).get("user_id")

        # If transaction already compiled, skip activity execution and just settle + recompute
        if already_compiled:
            print(f"[INFO] Transaction {existing_tx_id} already compiled for trade {trade_id}. Settling and running Stage 12.")
            supabase.table("trades").update({
                "status": "Settled",
                "updated_at": datetime.utcnow().isoformat()
            }).eq("id", trade_id).execute()
            recompute_result = trade_service.recompute_coa_balances(workbench_id)
            return {
                "status": "Success (transaction already compiled — Stage 12 recomputed)",
                "transaction_id": existing_tx_id,
                "stage_12": recompute_result
            }

        # Execute each pending activity (Stage 10 — operational state)
        executed_list = []
        for act in activities:
            if act.get("status") == "Executed":
                executed_list.append(act)
                continue

            if not act.get("id"):
                print(f"[WARNING] Skipping activity without ID: {act.get('activity_type')}")
                continue

            res = activity_executor.execute_activity(act, executed_by)
            if res.get("status") == "Success":
                act["status"] = "Executed"
                executed_list.append(act)
            else:
                raise RuntimeError(f"Activity {act.get('id')} failed during execution")

        if not executed_list:
            raise HTTPException(status_code=400, detail="No activities could be executed.")

        # Stage 11: Compile to double-entry + Stage 12: Recompute COA (called inside compiler)
        compile_res = accounting_compiler.compile_trade_activities(trade_id, executed_list, executed_by)

        # Stage 11 final: Settled status
        supabase.table("trades").update({
            "status": "Settled",
            "updated_at": datetime.utcnow().isoformat()
        }).eq("id", trade_id).execute()

        return {
            "status": "Success",
            "executed_activities": len(executed_list),
            "accounting": compile_res
        }
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))



@router.post("/workbench/{workbench_id}/recompute-coa")
async def recompute_coa_for_workbench(workbench_id: str):
    """
    Stage 12 manual trigger — recomputes workbench_accounts.current_amount
    from live transaction_entries for every account in the workbench.
    Use this whenever COA looks stale after a trade was committed.
    """
    try:
        from services.trade_service import trade_service
        result = trade_service.recompute_coa_balances(workbench_id)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{trade_id}/regenerate-activities")
async def regenerate_trade_activities(trade_id: str):
    """
    Deletes all pending (non-Executed) activities for a trade and re-generates
    them from scratch using the current trade amounts and the updated journal logic.
    Use this to fix trades that were generated with old/incorrect amounts (e.g.
    net-only expense instead of gross, or missing GST routing).
    """
    try:
        from services.trade_service import trade_service

        # Delete all non-executed activities
        supabase.table("trade_activities")\
            .delete()\
            .eq("trade_id", trade_id)\
            .neq("status", "Executed")\
            .execute()

        # Regenerate with fixed logic
        new_activities = trade_service.generate_activities_for_trade(trade_id)
        return {
            "status": "Regenerated",
            "activities_created": len(new_activities)
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{trade_id}/reset-for-retry")
async def reset_trade_for_retry(trade_id: str):
    """
    Full retry reset for a trade that got stuck in Approved/Settled state without
    correct COA posting. Clears ALL activities, unlinks the transaction (does NOT
    delete it — preserves audit trail), resets trade status to 'Needs Review',
    and regenerates activities with current amounts.
    """
    try:
        from services.trade_service import trade_service

        t_check = supabase.table("trades").select("*").eq("id", trade_id).single().execute()
        if not t_check.data:
            raise HTTPException(status_code=404, detail="Trade not found")
        trade = t_check.data

        # Delete ALL activities (including Executed ones — we'll re-run)
        supabase.table("trade_activities").delete().eq("trade_id", trade_id).execute()

        # Unlink document_id → transaction_id (so compiler doesn't skip via idempotency guard)
        if trade.get("document_id"):
            supabase.table("workbench_documents")\
                .update({"transaction_id": None})\
                .eq("id", trade["document_id"])\
                .execute()

        # Reset trade status
        supabase.table("trades").update({
            "status": "Needs Review",
            "updated_at": datetime.utcnow().isoformat()
        }).eq("id", trade_id).execute()

        # Regenerate activities with fixed amounts
        new_activities = trade_service.generate_activities_for_trade(trade_id)

        return {
            "status": "Reset complete — ready for re-execution",
            "activities_generated": len(new_activities),
            "trade_status": "Needs Review"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
