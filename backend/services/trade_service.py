import os
from typing import Dict, List, Optional
from datetime import datetime
from supabase_client import supabase

class TradeService:
    def __init__(self):
        pass

    async def create_trade_from_document(self, doc_id: str) -> Dict:
        """
        Executes the 12-stage Financial Engine pipeline for an analyzed document:
        1. Parse Analysis Note
        2. Detect Business Activity
        3. Resolve Trade Context
        4. Resolve Parties
        5. Resolve Entities
        6. Resolve Labels (Chart of Accounts)
        7. Generate Financial Activities Sequence (saved to trade_activities)
        8. Human Review (status starts as Needs Review/Draft)
        """
        # Fetch document
        doc_res = supabase.table("workbench_documents").select("*").eq("id", doc_id).single().execute()
        doc = doc_res.data
        if not doc:
            raise ValueError(f"Document {doc_id} not found")

        metadata = doc.get("metadata") or {}
        extracted = metadata.get("extracted_invoice") or {}
        workbench_id = doc["workbench_id"]

        # STAGE 1 & 2: Parse and Detect Business Activity
        raw_doc_type = extracted.get("document_type") or doc.get("document_type") or "expense_receipt"
        trade_type = self._map_to_trade_type(raw_doc_type)
        confidence = float(extracted.get("confidence") or 0.95)

        # STAGE 3: Resolve Trade Context
        trade_direction = self._map_to_trade_direction(trade_type)

        # Extract values
        financials = extracted.get("financials") or {}
        gross_amount = extracted.get("total") or financials.get("total_amount") or financials.get("total") or None
        tax_amount = extracted.get("tax") or financials.get("tax_amount") or financials.get("tax") or None
        net_amount = extracted.get("subtotal") or financials.get("subtotal") or financials.get("net_amount") or None
        
        if gross_amount is None and net_amount is not None:
            gross_amount = float(net_amount) + float(tax_amount or 0)
        
        amount = gross_amount # Legacy backward compatibility
        doc_meta = extracted.get("document_metadata") or {}
        currency = doc_meta.get("currency") or "INR"
        
        invoice_date_str = doc_meta.get("document_date") or doc_meta.get("date")
        invoice_date = None
        if invoice_date_str:
            try:
                invoice_date = datetime.strptime(invoice_date_str[:10], "%Y-%m-%d").date().isoformat()
            except Exception:
                invoice_date = None

        due_date = None
        add_fields = extracted.get("additional_fields") or {}
        due_date_str = add_fields.get("due_date") or add_fields.get("payment_due_date")
        if due_date_str:
            try:
                due_date = datetime.strptime(due_date_str[:10], "%Y-%m-%d").date().isoformat()
            except Exception:
                due_date = None

        references = extracted.get("references") or {}
        invoice_number = references.get("invoice_number") or references.get("bill_number") or references.get("reference")

        # STAGE 4: Resolve Parties
        parties_data = extracted.get("parties") or {}
        our_company_party = self._resolve_our_company(workbench_id)
        
        counterparty_name = None
        if trade_type in ["Vendor Invoice", "Expense Receipt", "Vendor Payment", "Debit Note", "Credit Note", "Purchase Order"]:
            counterparty_name = parties_data.get("vendor_name")
        elif trade_type in ["Sales Invoice", "Customer Payment", "Sales Order"]:
            counterparty_name = parties_data.get("customer_name")
            
        if not counterparty_name:
            counterparty_name = parties_data.get("vendor_name") or parties_data.get("customer_name") or "Unknown Counterparty"

        counterparty = self._resolve_counterparty(workbench_id, counterparty_name, trade_type)

        # STAGE 5: Resolve Entities
        our_company_entity = self._resolve_entity(our_company_party["id"], extracted)
        counterparty_entity = self._resolve_entity(counterparty["id"], extracted)

        # Default initial status
        status = "Needs Review"
        if confidence < 0.8:
            status = "Needs Review"

        description = f"{trade_type} - {counterparty['name']}"
        notes = extracted.get("description") or f"Automatically generated from {doc['filename']}"

        # Insert draft trade
        trade_payload = {
            "workbench_id": workbench_id,
            "document_id": doc_id,
            "analysis_note_id": doc_id,
            "trade_type": trade_type,
            "trade_direction": trade_direction,
            "status": status,
            "confidence": confidence,
            "amount": amount,
            "gross_amount": gross_amount,
            "tax_amount": tax_amount,
            "net_amount": net_amount,
            "currency": currency,
            "invoice_number": invoice_number,
            "invoice_date": invoice_date,
            "due_date": due_date,
            "description": description,
            "notes": notes
        }

        trade_res = supabase.table("trades").insert(trade_payload).execute()
        if not trade_res.data:
            raise RuntimeError("Failed to insert trade into database")
        
        trade = trade_res.data[0]
        trade_id = trade["id"]

        # Insert trade parties
        supabase.table("trade_parties").insert([
            {
                "trade_id": trade_id,
                "party_id": our_company_party["id"],
                "role": "our_company",
                "detected_name": our_company_party["name"]
            },
            {
                "trade_id": trade_id,
                "party_id": counterparty["id"],
                "role": "counterparty",
                "detected_name": counterparty_name
            }
        ]).execute()

        # Insert trade entities if resolved
        entities_to_insert = []
        if our_company_entity:
            entities_to_insert.append({
                "trade_id": trade_id,
                "entity_id": our_company_entity["id"],
                "role": "our_company",
                "detected_name": our_company_entity["name"]
            })
        if counterparty_entity:
            entities_to_insert.append({
                "trade_id": trade_id,
                "entity_id": counterparty_entity["id"],
                "role": "counterparty",
                "detected_name": counterparty_entity["name"]
            })
        if entities_to_insert:
            supabase.table("trade_entities").insert(entities_to_insert).execute()

        # STAGE 6: Resolve Labels (Chart of Accounts labels mapping)
        resolved_labels = self._resolve_labels(workbench_id, trade_type, extracted)
        labels_map = {}
        if resolved_labels:
            try:
                labels_to_insert = [
                    {
                        "trade_id": trade_id,
                        "label_id": rl["label_id"],
                        "role": rl["role"],
                        "detected_name": rl["detected_name"]
                    }
                    for rl in resolved_labels
                ]
                supabase.table("trade_labels").insert(labels_to_insert).execute()
                labels_map = {rl["role"]: rl["label_id"] for rl in resolved_labels}
            except Exception as e:
                print(f"[WARNING] Resolved labels insert failed: {e}")

        # STAGE 7: Generate Financial Activities Sequence (Deterministic sequence)
        activities = self.generate_activities_for_trade(trade_id)

        # STAGE 7: Summary & STAGE 8: Validation
        summary = self._generate_summary(trade, counterparty["name"])
        
        # Run validation engine dynamically
        validation_results = self.validate_trade_sync(trade, [our_company_party, counterparty], entities_to_insert, resolved_labels, activities)
        
        # Update trade summary and status
        has_critical_issues = any(v["type"] == "error" for v in validation_results)
        final_status = "Ready" if (not has_critical_issues and confidence >= 0.8) else "Needs Review"

        updated_res = supabase.table("trades").update({
            "status": final_status,
            "notes": notes,
            "description": summary
        }).eq("id", trade_id).execute()

        return updated_res.data[0] if updated_res.data else trade

    def validate_trade_sync(self, trade: Dict, parties: List[Dict], trade_entities: List[Dict], trade_labels: List[Dict] = [], activities: List[Dict] = []) -> List[Dict]:
        """
        Runs Stage 12 Validation rules sync for a trade.
        """
        issues = []
        
        # 1. Unknown Vendor/Counterparty
        counterparty = next((p for p in parties if p.get("is_self") is False), None)
        if not counterparty or "Unknown" in counterparty.get("name", ""):
            issues.append({"type": "error", "message": "Unknown Vendor: Please resolve the vendor/customer."})
            
        # 2. Unknown Label
        if not trade_labels:
            issues.append({"type": "warning", "message": "Unknown Label: No Chart of Accounts labels/accounts resolved for this trade."})

        # 3. Duplicate Invoice & Reference
        invoice_number = trade.get("invoice_number")
        if invoice_number:
            dup_res = supabase.table("trades").select("id").eq("invoice_number", invoice_number).eq("workbench_id", trade["workbench_id"]).execute()
            other_trades = [t["id"] for t in (dup_res.data or []) if t["id"] != trade.get("id")]
            if other_trades:
                issues.append({"type": "error", "message": f"Duplicate Reference: Reference/Invoice '{invoice_number}' already exists in this workbench."})
                if counterparty:
                    tp_res = supabase.table("trade_parties").select("trade_id").in_("trade_id", other_trades).eq("party_id", counterparty["id"]).execute()
                    if tp_res.data:
                        issues.append({"type": "error", "message": f"Duplicate Invoice: Invoice '{invoice_number}' already registered for {counterparty['name']}."})

        # 4. Missing Date
        if not trade.get("invoice_date"):
            issues.append({"type": "error", "message": "Missing Date: Invoice date could not be parsed."})

        # 5. Missing Amount
        gross = trade.get("gross_amount") or trade.get("amount")
        if gross is None or gross == 0:
            issues.append({"type": "error", "message": "Missing Amount: Total amount is missing or zero."})
        elif float(gross) < 0:
            issues.append({"type": "error", "message": "Negative Amount: Gross amount cannot be negative."})
            
        # 6. Missing Currency
        if not trade.get("currency"):
            issues.append({"type": "error", "message": "Missing Currency: Currency is not specified."})

        # 7. Confidence below threshold
        confidence = float(trade.get("confidence") or 1.0)
        if confidence < 0.8:
            issues.append({"type": "warning", "message": f"Confidence below threshold: OCR extraction confidence is {(confidence*100):.0f}% (threshold is 80%)."})

        # 8. Amount and Tax Mismatches
        tax = trade.get("tax_amount")
        net = trade.get("net_amount")
        if gross is not None and tax is not None and net is not None:
            if abs(float(gross) - (float(net) + float(tax))) > 0.01:
                issues.append({"type": "warning", "message": f"Amount mismatch: Gross amount ({gross}) does not match Net ({net}) + Tax ({tax})."})

        # 9. Negative Balance check
        for act in activities:
            if act.get("type") in ("SUBTRACT_BANK", "DECREASE_LABEL"):
                bank_id = act.get("target_id") or act.get("entity_id")
                if bank_id:
                    try:
                        b_res = supabase.table("workbench_accounts").select("current_amount, full_account_name").eq("id", bank_id).execute()
                        if b_res.data:
                            curr = float(b_res.data[0]["current_amount"] or 0)
                            acc_name = b_res.data[0]["full_account_name"]
                            if curr < float(act["amount"]):
                                issues.append({"type": "error", "message": f"Negative Balance Rule: Account '{acc_name}' has insufficient funds (Balance: ₹{curr:.2f}, Required: ₹{act['amount']:.2f})"})
                    except Exception:
                        pass

        # 10. Budget Overrun check
        for act in activities:
            if act.get("type") in ("ADD_EXPENSE", "INCREASE_LABEL"):
                label_id = act.get("target_id")
                if label_id:
                    try:
                        l_res = supabase.table("workbench_accounts").select("full_account_name").eq("id", label_id).execute()
                        if l_res.data:
                            lbl_name = l_res.data[0]["full_account_name"]
                            bud_res = supabase.table("budgets").select("*").eq("workbench_id", trade["workbench_id"]).eq("name", lbl_name).execute()
                            if bud_res.data:
                                b = bud_res.data[0]
                                limit = float(b["total_amount"])
                                actual_res = supabase.table("view_budget_vs_actual").select("actual_amount").eq("id", b["id"]).execute()
                                actual = float(actual_res.data[0]["actual_amount"] if actual_res.data else 0)
                                if actual + float(act["amount"]) > limit:
                                    issues.append({"type": "warning", "message": f"Budget Overrun: Spend on '{lbl_name}' (₹{(actual + float(act['amount'])):.2f}) will exceed category budget (₹{limit:.2f})"})
                    except Exception:
                        pass
                
        return issues

    def get_trade_validation(self, trade_id: str) -> List[Dict]:
        """
        Retrieves a trade and returns validation results dynamically.
        """
        trade_res = supabase.table("trades").select("*").eq("id", trade_id).single().execute()
        trade = trade_res.data
        if not trade:
            return []

        # Get parties
        tp_res = supabase.table("trade_parties").select("*, parties(*)").eq("trade_id", trade_id).execute()
        parties = [tp["parties"] for tp in tp_res.data if tp.get("parties")]

        # Get entities
        te_res = supabase.table("trade_entities").select("*").eq("trade_id", trade_id).execute()
        trade_entities = te_res.data or []

        # Get labels
        tl_res = supabase.table("trade_labels").select("*").eq("trade_id", trade_id).execute()
        trade_labels = tl_res.data or []

        # Get activities
        try:
            act_res = supabase.table("trade_activities").select("*").eq("trade_id", trade_id).execute()
            activities = act_res.data or []
        except Exception:
            activities = []

        return self.validate_trade_sync(trade, parties, trade_entities, trade_labels, activities)

    def _resolve_labels(self, workbench_id: str, trade_type: str, extracted: Dict) -> List[Dict]:
        """
        Stage 6: Resolve Labels
        Finds matching workbench_accounts for the trade based on keywords.
        """
        res = supabase.table("workbench_accounts").select("id, full_account_name, master_accounts(account_name)").eq("workbench_id", workbench_id).eq("is_active", True).execute()
        raw_accounts = res.data or []
        
        accounts = []
        for acc in raw_accounts:
            master = acc.get("master_accounts") or {}
            acc_name = master.get("account_name") or ""
            acc_type = "expense"
            if "asset" in acc_name.lower():
                acc_type = "asset"
            elif "liabilit" in acc_name.lower():
                acc_type = "liability"
            elif "equity" in acc_name.lower():
                acc_type = "equity"
            elif "rev" in acc_name.lower():
                acc_type = "revenue"
            elif "exp" in acc_name.lower():
                acc_type = "expense"
                
            accounts.append({
                "id": acc["id"],
                "full_account_name": acc["full_account_name"],
                "type": acc_type
            })
            
        resolved = []
        items = extracted.get("line_items") or []
        desc = (extracted.get("description") or "").lower()
        
        keywords = []
        for it in items:
            desc_item = it.get("description") or it.get("name") or ""
            if desc_item:
                keywords.append(desc_item.lower())
        if desc:
            keywords.append(desc)
            
        target_type = "expense"
        role = "expense"
        if trade_type in ["Sales Invoice", "Customer Payment", "Sales Order"]:
            target_type = "revenue"
            role = "revenue"
        elif trade_type in ["Vendor Invoice", "Expense Receipt", "Vendor Payment"]:
            target_type = "expense"
            role = "expense"
        elif trade_type in ["Investment", "Loan"]:
            target_type = "asset"
            role = "asset"
            
        for acc in accounts:
            acc_name = acc["full_account_name"].lower()
            
            for kw in keywords:
                if acc_name in kw or kw in acc_name:
                    resolved.append({
                        "label_id": acc["id"],
                        "role": role,
                        "detected_name": acc["full_account_name"]
                    })
                    break
                    
        if not resolved and accounts:
            default_acc = next((a for a in accounts if a["type"].lower() == target_type), None)
            if default_acc:
                resolved.append({
                    "label_id": default_acc["id"],
                    "role": role,
                    "detected_name": default_acc["full_account_name"]
                })
                
        return resolved

    def _map_to_trade_type(self, doc_type: str) -> str:
        mapping = {
            "sales_invoice": "Sales Invoice",
            "customer_payment_receipt": "Customer Payment",
            "vendor_invoice": "Vendor Invoice",
            "vendor_payment_receipt": "Vendor Payment",
            "bank_statement": "Bank Statement",
            "expense_receipt": "Expense Receipt",
            "payroll_register": "Payroll",
            "credit_note": "Credit Note",
            "debit_note": "Debit Note",
            "loan_agreement": "Loan",
            "investment_agreement": "Investment",
            "tax_document": "Expense Receipt",
            "purchase_order": "Purchase Order",
            "sales_order": "Sales Order",
            "manual_journal": "Manual Trade"
        }
        return mapping.get(doc_type.lower(), "Expense Receipt")

    def _map_to_trade_direction(self, trade_type: str) -> str:
        mapping = {
            "Vendor Invoice": "PAYABLE",
            "Sales Invoice": "RECEIVABLE",
            "Expense Receipt": "IMMEDIATE_SETTLEMENT",
            "Vendor Payment": "IMMEDIATE_SETTLEMENT",
            "Customer Payment": "IMMEDIATE_SETTLEMENT",
            "Payroll": "IMMEDIATE_SETTLEMENT",
            "Investment": "TRANSFER",
            "Loan": "TRANSFER",
            "Bank Statement": "TRANSFER",
            "Credit Note": "PAYABLE", # Credit note reverses invoice
            "Debit Note": "PAYABLE",
            "Purchase Order": "NON_FINANCIAL",
            "Sales Order": "NON_FINANCIAL",
            "Manual Trade": "IMMEDIATE_SETTLEMENT"
        }
        return mapping.get(trade_type, "IMMEDIATE_SETTLEMENT")

    def _resolve_our_company(self, workbench_id: str) -> Dict:
        """
        Locates or creates the self-representing party for this workbench.
        """
        res = supabase.table("parties").select("*").eq("workbench_id", workbench_id).eq("is_self", True).execute()
        if res.data:
            return res.data[0]
        
        # Create default
        payload = {
            "workbench_id": workbench_id,
            "name": "Our Company",
            "category": "corporation",
            "is_self": True
        }
        create_res = supabase.table("parties").insert(payload).execute()
        return create_res.data[0]

    def _resolve_counterparty(self, workbench_id: str, name: str, trade_type: str) -> Dict:
        """
        Finds a party by name, or inserts a new draft party.
        """
        if not name:
            name = "Unknown Counterparty"

        # Search matching case-insensitive name in same workbench
        res = supabase.table("parties").select("*").eq("workbench_id", workbench_id).execute()
        
        cleaned_search = name.strip().lower()
        for party in (res.data or []):
            if party["name"].strip().lower() == cleaned_search:
                return party

        # Category mapping
        category = "corporation"
        if trade_type == "Payroll":
            category = "individual"

        # Insert draft party
        payload = {
            "workbench_id": workbench_id,
            "name": name,
            "category": category,
            "is_self": False
        }
        create_res = supabase.table("parties").insert(payload).execute()
        return create_res.data[0]

    def _resolve_entity(self, party_id: str, extracted_invoice: Dict) -> Optional[Dict]:
        """
        Tries to resolve an entity for a resolved party based on bank / UPI details in OCR.
        """
        # Fetch entities for this party
        res = supabase.table("entities").select("*").eq("party_id", party_id).execute()
        entities = res.data or []
        if not entities:
            return None

        # Look in additional fields / payment metadata
        add_fields = extracted_invoice.get("additional_fields") or {}
        bank_name = add_fields.get("bank_name") or add_fields.get("bank") or ""
        payment_method = add_fields.get("payment_method") or ""
        upi = add_fields.get("upi") or add_fields.get("upi_id") or ""

        search_terms = [bank_name, payment_method, upi]
        search_terms = [s.strip().lower() for s in search_terms if isinstance(s, str) and s.strip()]

        if not search_terms:
            # Fallback: if only 1 entity exists, link it automatically
            if len(entities) == 1:
                return entities[0]
            return None

        # Find best match
        for ent in entities:
            ent_name = ent["name"].lower()
            for term in search_terms:
                if term in ent_name or ent_name in term:
                    return ent

        # If no match but only 1 entity, return it
        if len(entities) == 1:
            return entities[0]

        return None

    def _generate_summary(self, trade: Dict, party_name: str) -> str:
        """
        Creates a clean business summary.
        """
        trade_type = trade.get("trade_type", "Trade")
        amount = trade.get("amount")
        currency = trade.get("currency") or "INR"
        confidence = int((trade.get("confidence") or 1.0) * 100)
        status = trade.get("status") or "Needs Review"

        formatted_amount = f"{currency} {float(amount):,.2f}" if amount is not None else "Missing"

        summary = (
            f"**{trade_type} detected**\n\n"
            f"**Counterparty:**\n{party_name}\n\n"
            f"**Amount:**\n{formatted_amount}\n\n"
            f"**Status:**\n{status}\n\n"
            f"**Expected Trade:**\nPurchase/Sale of Goods\n\n"
            f"**Confidence:**\n{confidence}%"
        )
        return summary

    def generate_activities_for_trade(self, trade_id: str) -> List[Dict]:
        """
        Generates sequenced trade activities for a trade dynamically.
        """
        # Fetch trade
        trade_res = supabase.table("trades").select("*").eq("id", trade_id).single().execute()
        trade = trade_res.data
        if not trade:
            return []
            
        workbench_id = trade["workbench_id"]
        trade_type = trade["trade_type"]
        gross_amount = trade.get("gross_amount") or trade.get("amount") or 0.0
        tax_amount = trade.get("tax_amount") or 0.0
        net_amount = trade.get("net_amount") or gross_amount
        
        # Get trade labels
        labels_map = {}
        try:
            tl_res = supabase.table("trade_labels").select("label_id, role").eq("trade_id", trade_id).execute()
            labels_map = {rl["role"]: rl["label_id"] for rl in (tl_res.data or [])}
        except Exception:
            pass
        
        # Get trade entities
        entities_map = {}
        try:
            te_res = supabase.table("trade_entities").select("entity_id, role").eq("trade_id", trade_id).execute()
            entities_map = {re["role"]: re["entity_id"] for re in (te_res.data or [])}
        except Exception:
            pass
        
        # Get trade parties
        parties_map = {}
        counterparty_name = "Unknown"
        counterparty_id = None
        try:
            tp_res = supabase.table("trade_parties").select("party_id, role, detected_name").eq("trade_id", trade_id).execute()
            parties_map = {rp["role"]: rp["party_id"] for rp in (tp_res.data or [])}
            counterparty_name = next((rp["detected_name"] for rp in (tp_res.data or []) if rp["role"] == "counterparty"), "Unknown")
            counterparty_id = parties_map.get("counterparty")
        except Exception:
            pass
        
        # Query account labels for default mapping checks
        accs_res = supabase.table("workbench_accounts").select("id, full_account_name, master_accounts(account_name)").eq("workbench_id", workbench_id).execute()
        raw_accounts = accs_res.data or []
        accounts = []
        for acc in raw_accounts:
            master = acc.get("master_accounts") or {}
            acc_name = master.get("account_name") or ""
            acc_type = "expense"
            if "asset" in acc_name.lower():
                acc_type = "asset"
            elif "liabilit" in acc_name.lower():
                acc_type = "liability"
            elif "equity" in acc_name.lower():
                acc_type = "equity"
            elif "rev" in acc_name.lower():
                acc_type = "revenue"
            elif "exp" in acc_name.lower():
                acc_type = "expense"
                
            accounts.append({
                "id": acc["id"],
                "full_account_name": acc["full_account_name"],
                "type": acc_type
            })
        
        expense_lbl = labels_map.get("expense")
        revenue_lbl = labels_map.get("revenue")
        asset_lbl = labels_map.get("asset")
        liability_lbl = labels_map.get("liability")
        
        our_company_entity_id = entities_map.get("our_company")
        counterparty_entity_id = entities_map.get("counterparty")
        
        activities = []
        g_amt = float(gross_amount)
        n_amt = float(net_amount)
        t_amt = float(tax_amount)

        if trade_type == "Vendor Invoice":
            activities.append({
                "type": "CREATE_PAYABLE",
                "action": "CREDIT",
                "target_type": "bills",
                "amount": g_amt,
                "party_id": counterparty_id,
                "metadata": {"description": f"Accounts Payable for {counterparty_name}"}
            })
            activities.append({
                "type": "ADD_EXPENSE",
                "action": "DEBIT",
                "target_type": "workbench_accounts",
                "amount": n_amt,
                "target_id": expense_lbl,
                "metadata": {"description": f"Expense matching {trade_type}"}
            })
            if t_amt > 0:
                input_gst_lbl = next((a["id"] for a in accounts if "gst" in a["full_account_name"].lower() and "input" in a["full_account_name"].lower()), None)
                activities.append({
                    "type": "ADD_INPUT_GST",
                    "action": "DEBIT",
                    "target_type": "workbench_accounts",
                    "amount": t_amt,
                    "target_id": input_gst_lbl,
                    "metadata": {"description": "Input GST Portion"}
                })
            activities.append({
                "type": "UPDATE_PARTY",
                "action": "INCREASE",
                "target_type": "parties",
                "party_id": counterparty_id,
                "amount": g_amt
            })
            
        elif trade_type == "Sales Invoice":
            activities.append({
                "type": "CREATE_RECEIVABLE",
                "action": "DEBIT",
                "target_type": "invoices",
                "amount": g_amt,
                "party_id": counterparty_id,
                "metadata": {"description": f"Accounts Receivable for {counterparty_name}"}
            })
            activities.append({
                "type": "ADD_REVENUE",
                "action": "CREDIT",
                "target_type": "workbench_accounts",
                "amount": n_amt,
                "target_id": revenue_lbl,
                "metadata": {"description": f"Revenue matching {trade_type}"}
            })
            if t_amt > 0:
                output_gst_lbl = next((a["id"] for a in accounts if "gst" in a["full_account_name"].lower() and "output" in a["full_account_name"].lower()), None)
                activities.append({
                    "type": "ADD_OUTPUT_GST",
                    "action": "CREDIT",
                    "target_type": "workbench_accounts",
                    "amount": t_amt,
                    "target_id": output_gst_lbl,
                    "metadata": {"description": "Output GST Portion"}
                })
            activities.append({
                "type": "UPDATE_PARTY",
                "action": "INCREASE",
                "target_type": "parties",
                "party_id": counterparty_id,
                "amount": g_amt
            })

        elif trade_type == "Customer Payment":
            bank_lbl = None
            if counterparty_entity_id:
                try:
                    ent_res = supabase.table("entities").select("label_id").eq("id", counterparty_entity_id).execute()
                    if ent_res.data:
                        bank_lbl = ent_res.data[0]["label_id"]
                except Exception:
                    pass
            if not bank_lbl:
                bank_lbl = next((a["id"] for a in accounts if a["type"] == "asset" and ("bank" in a["full_account_name"].lower() or "cash" in a["full_account_name"].lower())), None)
                
            activities.append({
                "type": "REMOVE_RECEIVABLE",
                "action": "CREDIT",
                "target_type": "invoices",
                "amount": g_amt,
                "party_id": counterparty_id,
                "metadata": {"description": "Settle Accounts Receivable"}
            })
            activities.append({
                "type": "INCREASE_LABEL",
                "action": "DEBIT",
                "target_type": "workbench_accounts",
                "target_id": bank_lbl,
                "amount": g_amt
            })
            activities.append({
                "type": "UPDATE_PARTY",
                "action": "DECREASE",
                "target_type": "parties",
                "party_id": counterparty_id,
                "amount": g_amt
            })
            if counterparty_entity_id:
                activities.append({
                    "type": "UPDATE_ENTITY",
                    "action": "INCREASE",
                    "target_type": "entities",
                    "entity_id": counterparty_entity_id,
                    "amount": g_amt
                })

        elif trade_type == "Vendor Payment":
            bank_lbl = None
            if our_company_entity_id:
                try:
                    ent_res = supabase.table("entities").select("label_id").eq("id", our_company_entity_id).execute()
                    if ent_res.data:
                        bank_lbl = ent_res.data[0]["label_id"]
                except Exception:
                    pass
            if not bank_lbl:
                bank_lbl = next((a["id"] for a in accounts if a["type"] == "asset" and ("bank" in a["full_account_name"].lower() or "cash" in a["full_account_name"].lower())), None)
                
            activities.append({
                "type": "REMOVE_PAYABLE",
                "action": "DEBIT",
                "target_type": "bills",
                "amount": g_amt,
                "party_id": counterparty_id,
                "metadata": {"description": "Settle Accounts Payable"}
            })
            activities.append({
                "type": "DECREASE_LABEL",
                "action": "CREDIT",
                "target_type": "workbench_accounts",
                "target_id": bank_lbl,
                "amount": g_amt
            })
            activities.append({
                "type": "UPDATE_PARTY",
                "action": "DECREASE",
                "target_type": "parties",
                "party_id": counterparty_id,
                "amount": g_amt
            })
            if our_company_entity_id:
                activities.append({
                    "type": "UPDATE_ENTITY",
                    "action": "DECREASE",
                    "target_type": "entities",
                    "entity_id": our_company_entity_id,
                    "amount": g_amt
                })
                
        elif trade_type == "Expense Receipt":
            bank_lbl = None
            if our_company_entity_id:
                try:
                    ent_res = supabase.table("entities").select("label_id").eq("id", our_company_entity_id).execute()
                    if ent_res.data:
                        bank_lbl = ent_res.data[0]["label_id"]
                except Exception:
                    pass
            if not bank_lbl:
                bank_lbl = next((a["id"] for a in accounts if a["type"] == "asset" and ("bank" in a["full_account_name"].lower() or "cash" in a["full_account_name"].lower())), None)
                
            activities.append({
                "type": "ADD_EXPENSE",
                "action": "DEBIT",
                "target_type": "workbench_accounts",
                "target_id": expense_lbl,
                "amount": g_amt
            })
            activities.append({
                "type": "DECREASE_LABEL",
                "action": "CREDIT",
                "target_type": "workbench_accounts",
                "target_id": bank_lbl,
                "amount": g_amt
            })
            if our_company_entity_id:
                activities.append({
                    "type": "UPDATE_ENTITY",
                    "action": "DECREASE",
                    "target_type": "entities",
                    "entity_id": our_company_entity_id,
                    "amount": g_amt
                })
                
        elif trade_type == "Asset Purchase":
            bank_lbl = None
            if our_company_entity_id:
                try:
                    ent_res = supabase.table("entities").select("label_id").eq("id", our_company_entity_id).execute()
                    if ent_res.data:
                        bank_lbl = ent_res.data[0]["label_id"]
                except Exception:
                    pass
            if not bank_lbl:
                bank_lbl = next((a["id"] for a in accounts if a["type"] == "asset" and ("bank" in a["full_account_name"].lower() or "cash" in a["full_account_name"].lower())), None)
                
            activities.append({
                "type": "CREATE_ASSET",
                "action": "DEBIT",
                "target_type": "assets",
                "target_id": asset_lbl,
                "amount": g_amt,
                "metadata": {"asset_name": trade.get("description") or "New Equipment", "useful_life": 5, "depreciation_method": "Straight Line"}
            })
            activities.append({
                "type": "DECREASE_LABEL",
                "action": "CREDIT",
                "target_type": "workbench_accounts",
                "target_id": bank_lbl,
                "amount": g_amt
            })
            if our_company_entity_id:
                activities.append({
                    "type": "UPDATE_ENTITY",
                    "action": "DECREASE",
                    "target_type": "entities",
                    "entity_id": our_company_entity_id,
                    "amount": g_amt
                })
        else:
            activities.append({
                "type": "INCREASE_LABEL",
                "action": "DEBIT",
                "target_type": "workbench_accounts",
                "target_id": expense_lbl or asset_lbl,
                "amount": g_amt
            })
            activities.append({
                "type": "DECREASE_LABEL",
                "action": "CREDIT",
                "target_type": "workbench_accounts",
                "target_id": liability_lbl or revenue_lbl,
                "amount": g_amt
            })

        # Save to trade_activities table
        activities_to_insert = []
        try:
            activities_to_insert = [
                {
                    "trade_id": trade_id,
                    "sequence": i + 1,
                    "activity_type": act["type"],
                    "action": act.get("action"),
                    "target_type": act.get("target_type"),
                    "target_id": act.get("target_id") or act.get("entity_id"),
                    "party_id": act.get("party_id"),
                    "entity_id": act.get("entity_id"),
                    "amount": act["amount"],
                    "status": "Pending",
                    "metadata": act.get("metadata") or {}
                }
                for i, act in enumerate(activities)
            ]
            if activities_to_insert:
                supabase.table("trade_activities").insert(activities_to_insert).execute()
        except Exception as e:
            print(f"[WARNING] Inserting activities failed: {e}")
            
        return activities_to_insert

trade_service = TradeService()
