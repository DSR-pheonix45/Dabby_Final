from datetime import datetime
from typing import Dict, List, Optional
from supabase_client import supabase


class AccountingCompiler:
    def compile_trade_activities(
        self,
        trade_id: str,
        executed_activities: List[Dict],
        executed_by: Optional[str] = None
    ) -> Dict:
        """
        Stage 10-11: Compiles executed trade activities into double-entry
        transaction_entries and commits them to the immutable ledger.
        Stage 12: Recomputes COA balances and emits audit log immediately after commit.

        This is the ONLY place that writes to transactions / transaction_entries.
        Idempotent: if a transaction already exists for this trade, skips the insert
        and jumps straight to Stage 12 recompute.
        After this returns, workbench_accounts.current_amount will be up to date.
        """
        # ─── Stage 10: Fetch trade and resolve label map ───────────────────────
        trade_res = supabase.table("trades").select("*").eq("id", trade_id).single().execute()
        trade = trade_res.data
        if not trade:
            raise ValueError(f"Trade {trade_id} not found for accounting compilation")

        workbench_id = trade["workbench_id"]

        # ─── Idempotency guard: check if transaction already exists ────────────
        # Prevents duplicate ledger entries when /execute is retried after Stage 12 failure.
        doc_id = trade.get("document_id")
        if doc_id:
            existing_doc = supabase.table("workbench_documents").select("transaction_id").eq("id", doc_id).execute()
            if existing_doc.data and existing_doc.data[0].get("transaction_id"):
                existing_tx_id = existing_doc.data[0]["transaction_id"]
                print(f"[INFO] Transaction {existing_tx_id} already exists for trade {trade_id}. Skipping ledger insert, running Stage 12 only.")
                try:
                    from services.trade_service import trade_service
                    recompute_result = trade_service.recompute_coa_balances(workbench_id)
                except Exception as e:
                    recompute_result = {"status": "error", "message": str(e)}
                return {
                    "status": "Success (already compiled \u2014 Stage 12 rerun)",
                    "transaction_id": existing_tx_id,
                    "debited": 0,
                    "credited": 0,
                    "stage_12": recompute_result
                }

        # Labels map from trade metadata (most reliable source)
        labels_map: Dict[str, str] = {}
        try:
            from services.trade_service import trade_service
            meta = trade_service._get_trade_metadata(trade)
            for rl in meta.get("resolved_labels", []):
                labels_map[rl["role"]] = rl["label_id"]
        except Exception as e:
            print(f"[DEBUG] Failed loading labels from trade metadata: {e}")

        if not labels_map:
            try:
                labels_res = supabase.table("trade_labels").select("label_id, role").eq("trade_id", trade_id).execute()
                labels_map = {l["role"]: l["label_id"] for l in (labels_res.data or [])}
            except Exception:
                pass

        # ─── Pre-load ALL workbench account types for fallback label resolution ──
        # Priority for each posting: activity.target_id → labels_map[role] → typed_fallback[type]
        # If still unbalanced, the difference goes to Suspense (created on demand).
        typed_fallback: Dict[str, Optional[str]] = {
            "expense":   None,  # first expense account
            "revenue":   None,  # first revenue account
            "asset":     None,  # first bank/cash/asset account
            "liability": None,  # first AP/liability account (ap_label_id)
            "equity":    None,  # first equity account
            "suspense":  None,  # suspense/clearing
        }
        ap_label_id: Optional[str] = None
        ar_label_id: Optional[str] = None

        try:
            wa_res = supabase.table("workbench_accounts")\
                .select("id, full_account_name, master_accounts(account_name)")\
                .eq("workbench_id", workbench_id)\
                .eq("is_active", True)\
                .execute()

            for acc in (wa_res.data or []):
                n = acc["full_account_name"].lower()
                master_name = (acc.get("master_accounts") or {}).get("account_name", "").lower()

                # Determine account type
                if "asset" in master_name or "bank" in n or "cash" in n or "upi" in n:
                    acc_type = "asset"
                elif "liabilit" in master_name or "payable" in n:
                    acc_type = "liability"
                elif "equity" in master_name or "capital" in n or "equity" in n:
                    acc_type = "equity"
                elif "rev" in master_name or "income" in master_name or "sales" in n or "revenue" in n:
                    acc_type = "revenue"
                elif "exp" in master_name or "expense" in n or "cost" in n or "wages" in n or "salary" in n:
                    acc_type = "expense"
                else:
                    acc_type = "expense"  # safe default

                # First-match wins for each type
                if typed_fallback[acc_type] is None:
                    typed_fallback[acc_type] = acc["id"]

                # Special pre-resolves for AP / AR
                if not ap_label_id and ("payable" in n or acc_type == "liability"):
                    ap_label_id = acc["id"]
                if not ar_label_id and ("receivable" in n or "ar" in n):
                    ar_label_id = acc["id"]

                # Suspense / clearing
                if typed_fallback["suspense"] is None and ("suspense" in n or "clearing" in n or "unmatched" in n):
                    typed_fallback["suspense"] = acc["id"]

        except Exception as e:
            print(f"[DEBUG] Failed loading workbench accounts for compiler fallback: {e}")

        # Determine matched ruleset (for audit log)
        matched_ruleset_id: Optional[str] = None
        try:
            from services.trade_service import trade_service as ts
            meta = ts._get_trade_metadata(trade)
            matched_ruleset_id = meta.get("matched_ruleset_id")
        except Exception:
            pass

        # ─── Build double-entry postings from activities ───────────────────────
        debit_postings: List[Dict] = []
        credit_postings: List[Dict] = []

        for activity in executed_activities:
            activity_type = activity.get("activity_type", "")
            amount = float(activity["amount"])

            # Skip non-ledger activities
            if activity_type in ("UPDATE_PARTY", "UPDATE_ENTITY", "UPDATE_STOCK", "CONSUME_BUDGET"):
                continue

            # ── Resolve target label ───────────────────────────────────────────
            # Priority: activity.entity_id / target_id → labels_map role → typed fallback
            label_id = activity.get("entity_id") or activity.get("target_id")

            if not label_id:
                if activity_type in ("CREATE_RECEIVABLE", "REMOVE_RECEIVABLE"):
                    label_id = labels_map.get("asset") or ar_label_id or typed_fallback["asset"]
                elif activity_type in ("CREATE_PAYABLE", "REMOVE_PAYABLE"):
                    label_id = labels_map.get("liability") or ap_label_id or typed_fallback["liability"]
                elif activity_type == "CREATE_ASSET":
                    label_id = labels_map.get("asset") or typed_fallback["asset"]
                elif activity_type in ("ADD_EXPENSE", "ADD_INPUT_GST"):
                    label_id = labels_map.get("expense") or typed_fallback["expense"]
                elif activity_type in ("ADD_REVENUE", "ADD_OUTPUT_GST"):
                    label_id = labels_map.get("revenue") or typed_fallback["revenue"]
                elif activity_type == "INCREASE_LABEL":
                    # Try expense first (common for payroll/misc), then asset
                    label_id = (labels_map.get("expense") or labels_map.get("asset")
                                or typed_fallback["expense"] or typed_fallback["asset"])
                elif activity_type == "DECREASE_LABEL":
                    label_id = (labels_map.get("liability") or labels_map.get("asset")
                                or typed_fallback["liability"] or typed_fallback["asset"])

            # ── Resolve action direction ────────────────────────────────────────
            action = activity.get("action")
            if not action:
                if activity_type in ("ADD_EXPENSE", "ADD_INPUT_GST", "CREATE_RECEIVABLE",
                                     "CREATE_ASSET", "REMOVE_PAYABLE", "INCREASE_LABEL"):
                    action = "DEBIT"
                elif activity_type in ("CREATE_PAYABLE", "ADD_REVENUE", "ADD_OUTPUT_GST",
                                       "REMOVE_RECEIVABLE", "SUBTRACT_BANK", "DECREASE_LABEL"):
                    action = "CREDIT"

            if action == "DEBIT" and label_id:
                debit_postings.append({"label_id": label_id, "amount": amount})
            elif action == "CREDIT" and label_id:
                credit_postings.append({"label_id": label_id, "amount": amount})
            else:
                print(f"[WARNING] Compiler: activity '{activity_type}' dropped — "
                      f"no label resolved (action={action}, label_id={label_id}). "
                      f"Trade type: {trade.get('trade_type')}, workbench: {workbench_id}")

        if not debit_postings and not credit_postings:
            print("[WARNING] No accounting postings generated for trade activities")
            return {"status": "No Entries"}

        # ─── Stage 10b: Balance / Suspense routing ────────────────────────────
        # Rule: never crash on imbalance. Route the gap to a Suspense account.
        # The accountant clears Suspense later with a manual journal or self-deposit.
        sum_debits  = sum(d["amount"] for d in debit_postings)
        sum_credits = sum(c["amount"] for c in credit_postings)
        diff = round(sum_debits - sum_credits, 2)

        if abs(diff) > 0.01:
            # Suspense resolution priority (pure lookup — never CREATE to avoid schema issues):
            # 1. Existing "suspense/clearing" named account
            # 2. Any liability account in the workbench (AP is fine for temp routing)
            # 3. Any workbench account at all (last resort)
            suspense_id = typed_fallback["suspense"]

            if not suspense_id:
                try:
                    sus_res = supabase.table("workbench_accounts")\
                        .select("id")\
                        .eq("workbench_id", workbench_id)\
                        .ilike("full_account_name", "%suspense%")\
                        .execute()
                    if sus_res.data:
                        suspense_id = sus_res.data[0]["id"]
                except Exception:
                    pass

            if not suspense_id:
                # Fall back to any liability account already in the workbench
                # BUT only if it's not already being used in this journal (prevents netting bug)
                already_used = {p["label_id"] for p in debit_postings + credit_postings}
                candidate = typed_fallback.get("liability") or ap_label_id
                if candidate and candidate not in already_used:
                    suspense_id = candidate

            if not suspense_id:
                # Last resort: any account in the workbench that's not already posted
                already_used = {p["label_id"] for p in debit_postings + credit_postings}
                try:
                    any_res = supabase.table("workbench_accounts")\
                        .select("id")\
                        .eq("workbench_id", workbench_id)\
                        .eq("is_active", True)\
                        .execute()
                    for row in (any_res.data or []):
                        if row["id"] not in already_used:
                            suspense_id = row["id"]
                            break
                except Exception:
                    pass


            if suspense_id:
                # diff > 0  → debits > credits → add credit to suspense
                # diff < 0  → credits > debits → add debit to suspense
                if diff > 0:
                    credit_postings.append({"label_id": suspense_id, "amount": abs(diff)})
                else:
                    debit_postings.append({"label_id": suspense_id, "amount": abs(diff)})
                print(
                    f"[Stage 10b] Imbalance ₹{abs(diff):.2f} routed to account {suspense_id}. "
                    f"Trade: {trade_id}, Type: {trade.get('trade_type')}"
                )
                sum_debits  = sum(d["amount"] for d in debit_postings)
                sum_credits = sum(c["amount"] for c in credit_postings)
            else:
                # Structured error for the Resolve Modal to parse
                missing = []
                if not typed_fallback.get("expense"):
                    missing.append("Expense account (e.g. 'Operating Expenses')")
                if not typed_fallback.get("liability"):
                    missing.append("Liability account (e.g. 'Accounts Payable')")
                if not typed_fallback.get("asset"):
                    missing.append("Asset/Bank account (e.g. 'Cash' or 'Bank')")
                raise ValueError(
                    f"RESOLVE:MISSING_COA_ACCOUNTS:"
                    f"Debits ₹{sum_debits:.2f} ≠ Credits ₹{sum_credits:.2f}. "
                    f"Missing: {'; '.join(missing) if missing else 'unknown account type'}. "
                    f"Please add the missing Chart of Accounts labels first."
                )

        # Final guard (should never fire after suspense routing above)
        if abs(sum_debits - sum_credits) > 0.01:
            raise ValueError(
                f"Double-entry validation failed: Debits (₹{sum_debits:.2f}) must equal "
                f"Credits (₹{sum_credits:.2f}). Difference: ₹{abs(sum_debits - sum_credits):.2f}"
            )

        # ─── Stage 11: Commit to immutable ledger ─────────────────────────────
        # Insert transaction header
        tx_header = {
            "workbench_id": workbench_id,
            "description": trade.get("description") or f"Journal for {trade.get('trade_type')}",
            "transaction_date": trade.get("invoice_date") or datetime.utcnow().date().isoformat(),
            "source_party_id": trade.get("party_id"),
            "created_at": datetime.utcnow().isoformat()
        }

        tx_res = supabase.table("transactions").insert(tx_header).execute()
        if not tx_res.data:
            raise RuntimeError("Failed to create ledger transaction header")

        tx_id = tx_res.data[0]["id"]

        # Insert transaction entries (debits positive, credits negative)
        entries: List[Dict] = []
        for d in debit_postings:
            entries.append({"transaction_id": tx_id, "label_id": d["label_id"], "amount":  d["amount"]})
        for c in credit_postings:
            entries.append({"transaction_id": tx_id, "label_id": c["label_id"], "amount": -c["amount"]})

        supabase.table("transaction_entries").insert(entries).execute()

        # Mark trade as Approved (immutable from this point — only adjustments can offset)
        supabase.table("trades").update({
            "status": "Approved",
            "reviewed_by": executed_by,
            "updated_at": datetime.utcnow().isoformat()
        }).eq("id", trade_id).execute()

        # Update document status → RECORD_CREATED → PROCESSED
        doc_id = trade.get("document_id")
        if doc_id:
            try:
                supabase.table("workbench_documents").update({
                    "transaction_id": tx_id,
                    "status": "RECORD_CREATED"
                }).eq("id", doc_id).execute()
            except Exception as doc_err:
                print(f"[WARNING] Failed to link document to compiled transaction: {doc_err}")

        # ─── Stage 12: Recompute views & emit audit log ────────────────────────
        # This MUST run synchronously here. If it's skipped or not awaited,
        # COA will show stale balances even though ledger rows are correct.
        try:
            from services.trade_service import trade_service
            recompute_result = trade_service.recompute_coa_balances(workbench_id)
            print(f"[Stage 12] Recompute result: {recompute_result}")
        except Exception as stage12_err:
            # Non-fatal — ledger is already committed, flag but don't rollback
            print(f"[ERROR] Stage 12 COA recompute failed (ledger committed): {stage12_err}")
            recompute_result = {"status": "error", "message": str(stage12_err)}

        # Emit audit log
        try:
            from services.trade_service import trade_service
            trade_service.emit_audit_log(
                workbench_id=workbench_id,
                trade_id=trade_id,
                transaction_ids=[tx_id],
                executed_by=executed_by,
                ruleset_id=matched_ruleset_id
            )
        except Exception as audit_err:
            print(f"[WARNING] Stage 12 audit log emission failed: {audit_err}")

        # Mark document as fully processed
        if doc_id:
            try:
                supabase.table("workbench_documents").update({
                    "status": "PROCESSED"
                }).eq("id", doc_id).execute()
            except Exception:
                pass

        return {
            "status": "Success",
            "transaction_id": tx_id,
            "debited": sum_debits,
            "credited": sum_credits,
            "stage_12": recompute_result
        }


# Singleton
accounting_compiler = AccountingCompiler()
