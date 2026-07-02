import os
import json
from typing import Dict, List, Optional
from datetime import datetime
from supabase_client import supabase


# ─── Document-type → Financial Activity mapping (single source of truth) ────────
# purchase_order and sales_order are NON_FINANCIAL: they produce NO journal entries.
DOCUMENT_TYPE_TO_TRADE_TYPE: Dict[str, str] = {
    "sales_invoice":            "Sales Invoice",
    "customer_payment_receipt": "Customer Payment",
    "vendor_invoice":           "Vendor Invoice",
    "vendor_payment_receipt":   "Vendor Payment",
    "expense_receipt":          "Expense Receipt",
    "bank_statement":           "Bank Statement",
    "payroll_register":         "Payroll",
    "credit_note":              "Credit Note",
    "debit_note":               "Debit Note",
    "loan_agreement":           "Loan",
    "investment_agreement":     "Investment",
    "tax_document":             "Tax Document",
    "manual_journal":           "Manual Journal",
    "purchase_order":           "Purchase Order",   # NON_FINANCIAL
    "sales_order":              "Sales Order",       # NON_FINANCIAL
}

TRADE_TYPE_TO_DIRECTION: Dict[str, str] = {
    "Sales Invoice":    "RECEIVABLE",
    "Customer Payment": "IMMEDIATE_SETTLEMENT",
    "Vendor Invoice":   "PAYABLE",
    "Vendor Payment":   "IMMEDIATE_SETTLEMENT",
    "Expense Receipt":  "IMMEDIATE_SETTLEMENT",
    "Bank Statement":   "TRANSFER",
    "Payroll":          "IMMEDIATE_SETTLEMENT",
    "Credit Note":      "RECEIVABLE",
    "Debit Note":       "PAYABLE",
    "Loan":             "TRANSFER",
    "Investment":       "TRANSFER",
    "Tax Document":     "PAYABLE",
    "Manual Journal":   "IMMEDIATE_SETTLEMENT",
    "Purchase Order":   "NON_FINANCIAL",
    "Sales Order":      "NON_FINANCIAL",
}

# Already-paid activity types that require a resolved entity (bank/cash/UPI)
PAID_ACTIVITY_TYPES: set = {
    "Customer Payment",
    "Vendor Payment",
    "Expense Receipt",
    "Payroll",
    "Loan",
    "Investment",
}

# Types that generate NO journal entries at all
NON_FINANCIAL_TYPES: set = {"Purchase Order", "Sales Order"}

# Confidence bands
CONFIDENCE_AUTO_CONFIRM = 0.85   # ≥ this → Ready (no errors)
CONFIDENCE_MANDATORY_REVIEW = 0.6  # < this → mandatory review, unresolved fields flagged


class TradeService:
    def __init__(self):
        pass

    # ── Private helpers ────────────────────────────────────────────────────────

    def _get_trade_metadata(self, trade: Dict) -> Dict:
        if not trade:
            return {}
        if "metadata" in trade and trade["metadata"]:
            return trade["metadata"]
        notes_str = trade.get("notes") or ""
        if "---METADATA---" in notes_str:
            try:
                parts = notes_str.split("---METADATA---")
                return json.loads(parts[1].strip())
            except Exception:
                pass
        return {}

    async def _fetch_forex_rate(self, from_currency: str, to_currency: str) -> Optional[float]:
        if not from_currency or not to_currency or from_currency.upper() == to_currency.upper():
            return 1.0
        try:
            import httpx
            url = f"https://open.er-api.com/v6/latest/{from_currency.upper()}"
            async with httpx.AsyncClient() as client:
                response = await client.get(url, timeout=2.0)
                if response.status_code == 200:
                    data = response.json()
                    rates = data.get("rates") or {}
                    rate = rates.get(to_currency.upper())
                    if rate:
                        return float(rate)
        except Exception as e:
            print(f"[WARNING] Forex API request failed: {e}")
        return None

    def _resolve_our_company(self, workbench_id: str) -> Dict:
        res = supabase.table("parties").select("*").eq("workbench_id", workbench_id).eq("is_self", True).execute()
        if res.data:
            return res.data[0]
        create_res = supabase.table("parties").insert({
            "workbench_id": workbench_id,
            "name": "Our Company",
            "category": "corporation",
            "is_self": True
        }).execute()
        return create_res.data[0]

    def _resolve_counterparty(self, workbench_id: str, name: str, trade_type: str) -> Dict:
        if not name:
            name = "Unknown Counterparty"
        res = supabase.table("parties").select("*").eq("workbench_id", workbench_id).execute()
        cleaned = name.strip().lower()
        for party in (res.data or []):
            if party["name"].strip().lower() == cleaned:
                return party
        category = "individual" if trade_type == "Payroll" else "corporation"
        create_res = supabase.table("parties").insert({
            "workbench_id": workbench_id,
            "name": name,
            "category": category,
            "is_self": False
        }).execute()
        return create_res.data[0]

    def _resolve_entity(self, party_id: str, extracted_invoice: Dict) -> Optional[Dict]:
        res = supabase.table("entities").select("*").eq("party_id", party_id).execute()
        entities = res.data or []
        if not entities:
            return None
        add_fields = extracted_invoice.get("additional_fields") or {}
        bank_name = add_fields.get("bank_name") or add_fields.get("bank") or ""
        payment_method = add_fields.get("payment_method") or ""
        upi = add_fields.get("upi") or add_fields.get("upi_id") or ""
        search_terms = [s.strip().lower() for s in [bank_name, payment_method, upi] if s.strip()]
        if not search_terms:
            return entities[0] if len(entities) == 1 else None
        for ent in entities:
            ent_name = ent["name"].lower()
            for term in search_terms:
                if term in ent_name or ent_name in term:
                    return ent
        return entities[0] if len(entities) == 1 else None

    def _resolve_labels(self, workbench_id: str, trade_type: str, extracted: Dict) -> List[Dict]:
        res = supabase.table("workbench_accounts").select(
            "id, full_account_name, master_accounts(account_name)"
        ).eq("workbench_id", workbench_id).eq("is_active", True).execute()
        raw_accounts = res.data or []

        accounts = []
        for acc in raw_accounts:
            master = acc.get("master_accounts") or {}
            acc_name = master.get("account_name") or ""
            acc_type = "expense"
            n = acc_name.lower()
            if "asset" in n:
                acc_type = "asset"
            elif "liabilit" in n:
                acc_type = "liability"
            elif "equity" in n:
                acc_type = "equity"
            elif "rev" in n or "income" in n:
                acc_type = "revenue"
            elif "exp" in n:
                acc_type = "expense"
            accounts.append({"id": acc["id"], "full_account_name": acc["full_account_name"], "type": acc_type})

        target_type, role = "expense", "expense"
        if trade_type in ("Sales Invoice", "Customer Payment", "Sales Order", "Credit Note"):
            target_type, role = "revenue", "revenue"
        elif trade_type in ("Loan", "Investment"):
            target_type, role = "asset", "asset"
        elif trade_type in ("Vendor Invoice", "Expense Receipt", "Vendor Payment", "Payroll", "Tax Document", "Debit Note"):
            target_type, role = "expense", "expense"

        keywords = []
        for it in (extracted.get("line_items") or []):
            desc_item = it.get("description") or it.get("name") or ""
            if desc_item:
                keywords.append(desc_item.lower())
        desc = (extracted.get("description") or "").lower()
        if desc:
            keywords.append(desc)

        resolved = []
        for acc in accounts:
            acc_name = acc["full_account_name"].lower()
            for kw in keywords:
                if acc_name in kw or kw in acc_name:
                    resolved.append({"label_id": acc["id"], "role": role, "detected_name": acc["full_account_name"]})
                    break

        if not resolved:
            default_acc = next((a for a in accounts if a["type"] == target_type), None)
            if default_acc:
                resolved.append({"label_id": default_acc["id"], "role": role, "detected_name": default_acc["full_account_name"]})
        return resolved

    def _generate_summary(self, trade: Dict, party_name: str) -> str:
        trade_type = trade.get("trade_type", "Trade")
        amount = trade.get("amount")
        currency = trade.get("currency") or "INR"
        confidence = int((trade.get("confidence") or 1.0) * 100)
        status = trade.get("status") or "Needs Review"
        formatted_amount = f"{currency} {float(amount):,.2f}" if amount is not None else "Missing"
        return (
            f"**{trade_type} detected**\n\n"
            f"**Counterparty:**\n{party_name}\n\n"
            f"**Amount:**\n{formatted_amount}\n\n"
            f"**Status:**\n{status}\n\n"
            f"**Confidence:**\n{confidence}%"
        )

    def _find_account_by_keyword(self, accounts: List[Dict], *keywords: str) -> Optional[str]:
        """Finds a workbench account ID by matching keywords against full_account_name."""
        for kw in keywords:
            kw_l = kw.lower()
            match = next((a["id"] for a in accounts if kw_l in a["full_account_name"].lower()), None)
            if match:
                return match
        return None

    def _get_entity_label_id(self, entity_id: Optional[str], accounts: List[Dict]) -> Optional[str]:
        """Resolves the COA label_id linked to an entity (bank/cash vessel)."""
        if not entity_id:
            return None
        try:
            ent_res = supabase.table("entities").select("label_id").eq("id", entity_id).execute()
            if ent_res.data:
                return ent_res.data[0].get("label_id")
        except Exception:
            pass
        return None

    # ── Public API ─────────────────────────────────────────────────────────────

    async def create_trade_from_document(self, doc_id: str) -> Dict:
        """
        Executes Stages 1-9 of the 12-stage Financial Engine pipeline.
        Stages 10-12 are triggered by the /execute endpoint.
        """
        # ─── Stage 1: Fetch OCR result (already done by worker) ──────────────
        doc_res = supabase.table("workbench_documents").select("*").eq("id", doc_id).single().execute()
        doc = doc_res.data
        if not doc:
            raise ValueError(f"Document {doc_id} not found")

        # Update status to AI_PARSED to reflect Stage 2 starting
        try:
            supabase.table("workbench_documents").update({"status": "AI_PARSING"}).eq("id", doc_id).execute()
        except Exception:
            pass

        metadata = doc.get("metadata") or {}
        extracted = metadata.get("extracted_invoice") or {}
        workbench_id = doc["workbench_id"]

        # ─── Stage 2: Detect business activity ───────────────────────────────
        raw_doc_type = (extracted.get("document_type") or doc.get("document_type") or "expense_receipt").lower()
        trade_type = DOCUMENT_TYPE_TO_TRADE_TYPE.get(raw_doc_type, "Expense Receipt")
        trade_direction = TRADE_TYPE_TO_DIRECTION.get(trade_type, "IMMEDIATE_SETTLEMENT")
        confidence = float(extracted.get("confidence") or 0.95)

        # ─── Stage 3: Resolve trade context & direction ───────────────────────
        # NON_FINANCIAL types skip Stages 7 and 10-11 entirely.
        is_non_financial = trade_type in NON_FINANCIAL_TYPES

        financials = extracted.get("financials") or {}
        gross_amount = extracted.get("total") or financials.get("total_amount") or financials.get("total") or None
        tax_amount   = extracted.get("tax")   or financials.get("tax_amount")   or financials.get("tax")   or 0.0
        net_amount   = extracted.get("subtotal") or financials.get("subtotal") or financials.get("net_amount") or None

        if gross_amount is None and net_amount is not None:
            gross_amount = float(net_amount) + float(tax_amount or 0)
        if gross_amount is None:
            gross_amount = 0.0
        if net_amount is None:
            net_amount = float(gross_amount) - float(tax_amount)

        doc_meta = extracted.get("document_metadata") or {}
        currency = doc_meta.get("currency") or "INR"

        # ─── Stage 4: Resolve parties ────────────────────────────────────────
        parties_data = extracted.get("parties") or {}
        our_company_party = self._resolve_our_company(workbench_id)

        if trade_type in ("Vendor Invoice", "Expense Receipt", "Vendor Payment",
                          "Debit Note", "Purchase Order", "Payroll", "Tax Document"):
            counterparty_name = parties_data.get("vendor_name")
        elif trade_type in ("Sales Invoice", "Customer Payment", "Sales Order",
                            "Credit Note"):
            counterparty_name = parties_data.get("customer_name")
        else:
            counterparty_name = None

        if not counterparty_name:
            counterparty_name = (parties_data.get("vendor_name") or
                                  parties_data.get("customer_name") or
                                  "Unknown Counterparty")

        counterparty = self._resolve_counterparty(workbench_id, counterparty_name, trade_type)

        # ─── Stage 5: Resolve entities (only for already-paid activities) ─────
        # Single-pass ruleset match for all stages 5 & 6
        ruleset_res = supabase.table("rulesets")\
            .select("*")\
            .eq("workbench_id", workbench_id)\
            .eq("document_type", raw_doc_type)\
            .eq("status", "Active")\
            .execute()
        active_rulesets = ruleset_res.data or []

        var_values = {}
        for category in ["document_metadata", "parties", "financials", "references", "additional_fields"]:
            cat_data = extracted.get(category) or {}
            for k, v in cat_data.items():
                var_values[k] = v
        for k, v in extracted.items():
            if not isinstance(v, (dict, list)):
                var_values[k] = v

        from services.ruleset_service import ruleset_service as _ruleset_service
        ruleset_actions = {}
        matched_ruleset = None
        for r in active_rulesets:
            ver_res = supabase.table("ruleset_versions").select("*").eq("ruleset_id", r["id"]).order("created_at", desc=True).execute()
            if ver_res.data:
                logic = ver_res.data[0].get("structured_logic") or {}
                conditions = logic.get("conditions") or []
                if _ruleset_service.evaluate_conditions(conditions, var_values):
                    matched_ruleset = r
                    for act in (logic.get("actions") or []):
                        ruleset_actions[act.get("action")] = act.get("value")
                    break

        our_company_entity = None
        if trade_type in PAID_ACTIVITY_TYPES:
            # Try ruleset-driven entity resolution first
            for action_key in ("set_debit_entity", "set_credit_entity"):
                if action_key in ruleset_actions:
                    ent_name = ruleset_actions[action_key]
                    ents = supabase.table("entities").select("*, parties(*)").eq("name", ent_name).execute()
                    matched = next(
                        (e for e in (ents.data or [])
                         if e.get("parties", {}).get("is_self") is True
                         and e["parties"]["workbench_id"] == workbench_id),
                        None
                    )
                    if matched:
                        our_company_entity = matched
                        break

            # Fallback to OCR field matching
            if not our_company_entity:
                our_company_entity = self._resolve_entity(our_company_party["id"], extracted)

        counterparty_entity = self._resolve_entity(counterparty["id"], extracted)

        # ─── Stage 6: Resolve labels & CoA ────────────────────────────────────
        resolved_labels = []

        # Ruleset-driven label resolution
        if "set_debit_account" in ruleset_actions:
            acc_name = ruleset_actions["set_debit_account"]
            acc_res = supabase.table("workbench_accounts").select("id").eq("full_account_name", acc_name).eq("workbench_id", workbench_id).execute()
            if acc_res.data:
                role = "expense" if ("expense" in acc_name.lower() or "cogs" in acc_name.lower()) else "asset"
                resolved_labels.append({"label_id": acc_res.data[0]["id"], "role": role, "detected_name": acc_name})

        if "set_credit_account" in ruleset_actions:
            acc_name = ruleset_actions["set_credit_account"]
            acc_res = supabase.table("workbench_accounts").select("id").eq("full_account_name", acc_name).eq("workbench_id", workbench_id).execute()
            if acc_res.data:
                role = "revenue" if "rev" in acc_name.lower() else "liability"
                resolved_labels.append({"label_id": acc_res.data[0]["id"], "role": role, "detected_name": acc_name})

        if not resolved_labels:
            resolved_labels = self._resolve_labels(workbench_id, trade_type, extracted)

        # ─── Stage 7: Forex conversion & journal data prep ────────────────────
        # NON_FINANCIAL types skip this stage — no journal lines are generated.
        wb_info = supabase.table("workbenches").select("currency").eq("id", workbench_id).single().execute()
        base_currency = wb_info.data.get("currency") if wb_info.data else "INR"

        forex_failed = False
        forex_rate = 1.0

        if not is_non_financial and currency.upper() != base_currency.upper():
            resolved_rate = await self._fetch_forex_rate(currency, base_currency)
            if resolved_rate is not None:
                forex_rate = float(resolved_rate)
            else:
                forex_failed = True  # Forces Stage 9 review per spec

        original_gross = float(gross_amount)
        original_tax   = float(tax_amount)
        original_net   = float(net_amount)
        converted_gross = original_gross * forex_rate
        converted_tax   = original_tax   * forex_rate
        converted_net   = original_net   * forex_rate

        invoice_date_str = doc_meta.get("document_date") or doc_meta.get("date")
        invoice_date = None
        if invoice_date_str:
            try:
                invoice_date = datetime.strptime(invoice_date_str[:10], "%Y-%m-%d").date().isoformat()
            except Exception:
                invoice_date = None

        add_fields = extracted.get("additional_fields") or {}
        due_date_str = add_fields.get("due_date") or add_fields.get("payment_due_date")
        due_date = None
        if due_date_str:
            try:
                due_date = datetime.strptime(due_date_str[:10], "%Y-%m-%d").date().isoformat()
            except Exception:
                due_date = None

        references = extracted.get("references") or {}
        invoice_number = (references.get("invoice_number") or
                          references.get("bill_number") or
                          references.get("reference") or
                          references.get("transaction_reference"))

        notes = extracted.get("description") or f"Automatically generated from {doc['filename']}"
        description = f"{trade_type} - {counterparty['name']}"

        metadata_dict = {
            "original_currency": currency,
            "original_gross": original_gross,
            "original_tax": original_tax,
            "original_net": original_net,
            "forex_rate": forex_rate,
            "forex_failed": forex_failed,
            "is_non_financial": is_non_financial,
            "reference_invoice": references.get("reference_invoice"),  # for credit/debit notes
            "resolved_labels": [
                {"label_id": rl["label_id"], "role": rl["role"], "detected_name": rl["detected_name"]}
                for rl in resolved_labels
            ]
        }
        serialized_notes = f"{notes}\n---METADATA---\n{json.dumps(metadata_dict)}"

        # Insert draft trade (always starts as Needs Review)
        trade_payload = {
            "workbench_id": workbench_id,
            "document_id": doc_id,
            "analysis_note_id": doc_id,
            "trade_type": trade_type,
            "trade_direction": trade_direction,
            "status": "Needs Review",
            "confidence": confidence,
            "amount": converted_gross,
            "currency": base_currency,
            "invoice_number": invoice_number,
            "invoice_date": invoice_date,
            "due_date": due_date,
            "description": description,
            "notes": serialized_notes
        }

        trade_res = supabase.table("trades").insert(trade_payload).execute()
        if not trade_res.data:
            raise RuntimeError("Failed to insert trade into database")

        trade = trade_res.data[0]
        trade_id = trade["id"]

        # Insert trade parties
        supabase.table("trade_parties").insert([
            {"trade_id": trade_id, "party_id": our_company_party["id"], "role": "our_company",  "detected_name": our_company_party["name"]},
            {"trade_id": trade_id, "party_id": counterparty["id"],       "role": "counterparty", "detected_name": counterparty_name}
        ]).execute()

        # Insert trade entities
        entities_to_insert = []
        if our_company_entity:
            entities_to_insert.append({"trade_id": trade_id, "entity_id": our_company_entity["id"], "role": "our_company",  "detected_name": our_company_entity["name"]})
        if counterparty_entity:
            entities_to_insert.append({"trade_id": trade_id, "entity_id": counterparty_entity["id"], "role": "counterparty", "detected_name": counterparty_entity["name"]})
        if entities_to_insert:
            supabase.table("trade_entities").insert(entities_to_insert).execute()

        # Insert trade labels
        if resolved_labels:
            try:
                supabase.table("trade_labels").insert([
                    {"trade_id": trade_id, "label_id": rl["label_id"], "role": rl["role"], "detected_name": rl["detected_name"]}
                    for rl in resolved_labels
                ]).execute()
            except Exception as e:
                print(f"[WARNING] Resolved labels insert failed: {e}")

        # ─── Stage 7b: Generate activities (skip for NON_FINANCIAL) ──────────
        if not is_non_financial:
            self.generate_activities_for_trade(trade_id)

        # ─── Stage 8: Sync validation checks ─────────────────────────────────
        validation_results = self.validate_trade_sync(
            trade,
            [our_company_party, counterparty],
            entities_to_insert,
            resolved_labels,
            [] if is_non_financial else []  # activities fetched inside validate if needed
        )
        has_critical_issues = any(v["type"] == "error" for v in validation_results)

        # ─── Stage 9: Gated review status ────────────────────────────────────
        # 0.85/0.6 bands are source of truth.
        # < 0.6 → mandatory review regardless of errors.
        # 0.6–0.85 → pre-filled for review.
        # ≥ 0.85 and no critical errors → Ready.
        # Forex failure always forces review.
        if forex_failed or has_critical_issues or confidence < CONFIDENCE_AUTO_CONFIRM:
            final_status = "Needs Review"
        else:
            final_status = "Ready"

        # Mandatory check for low-confidence: flag (status stays Needs Review)
        if confidence < CONFIDENCE_MANDATORY_REVIEW:
            final_status = "Needs Review"

        summary = self._generate_summary(trade, counterparty["name"])
        updated_res = supabase.table("trades").update({
            "status": final_status,
            "description": summary
        }).eq("id", trade_id).execute()

        # Update document status to AI_PARSED
        try:
            supabase.table("workbench_documents").update({"status": "AI_PARSED"}).eq("id", doc_id).execute()
        except Exception:
            pass

        return updated_res.data[0] if updated_res.data else trade

    # ── Stage 8: Validation ────────────────────────────────────────────────────

    def validate_trade_sync(
        self,
        trade: Dict,
        parties: List[Dict],
        trade_entities: List[Dict],
        trade_labels: List[Dict] = [],
        activities: List[Dict] = []
    ) -> List[Dict]:
        """Runs all Stage 8 validation rules synchronously."""
        issues = []
        meta = self._get_trade_metadata(trade)
        trade_type = trade.get("trade_type", "")
        is_non_financial = trade_type in NON_FINANCIAL_TYPES or meta.get("is_non_financial", False)

        # 1. Unknown counterparty
        counterparty = next((p for p in parties if not p.get("is_self")), None)
        if not counterparty or "Unknown" in counterparty.get("name", ""):
            issues.append({"type": "error", "message": "Unknown Vendor: Please resolve the vendor/customer."})

        # 2. Unknown label (skip for NON_FINANCIAL)
        if not is_non_financial and not trade_labels:
            issues.append({"type": "warning", "message": "Unknown Label: No Chart of Accounts labels/accounts resolved for this trade."})

        # 3. Duplicate invoice number
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

        # 4. Missing date
        if not trade.get("invoice_date"):
            issues.append({"type": "error", "message": "Missing Date: Invoice date could not be parsed."})

        # 5. Missing / zero amount (skip for NON_FINANCIAL — POs can be zero)
        gross = trade.get("amount")
        if not is_non_financial:
            if gross is None or gross == 0:
                issues.append({"type": "error", "message": "Missing Amount: Total amount is missing or zero."})
            elif float(gross) < 0:
                issues.append({"type": "error", "message": "Negative Amount: Gross amount cannot be negative."})

        # 6. Missing currency
        if not trade.get("currency"):
            issues.append({"type": "error", "message": "Missing Currency: Currency is not specified."})

        # 7. Confidence — WARNING only below 0.8 (display signal, not a gate)
        confidence = float(trade.get("confidence") or 1.0)
        if confidence < 0.8:
            issues.append({
                "type": "warning",
                "message": f"Low Confidence: OCR extraction confidence is {confidence * 100:.0f}% (below 80% warning threshold)."
            })

        # 8. Amount / tax mismatch
        forex_rate = float(meta.get("forex_rate") or 1.0)
        if not is_non_financial and gross is not None:
            tax = float(meta.get("original_tax") or 0.0) * forex_rate
            net = float(meta.get("original_net") or (float(meta.get("original_gross") or 0.0) - float(meta.get("original_tax") or 0.0))) * forex_rate
            if abs(float(gross) - (float(net) + float(tax))) > 0.01:
                issues.append({"type": "warning", "message": f"Amount mismatch: Gross ({gross}) ≠ Net ({net:.2f}) + Tax ({tax:.2f})."})

        # 9. Negative balance check
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
                                issues.append({"type": "error", "message": f"Negative Balance: Account '{acc_name}' has insufficient funds (Balance: ₹{curr:.2f}, Required: ₹{act['amount']:.2f})"})
                    except Exception:
                        pass

        # 10. Budget overrun
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
                                    issues.append({"type": "warning", "message": f"Budget Overrun: Spend on '{lbl_name}' (₹{actual + float(act['amount']):.2f}) will exceed budget (₹{limit:.2f})"})
                    except Exception:
                        pass

        # 11. Missing entity for already-paid activities
        if trade_type in PAID_ACTIVITY_TYPES:
            our_company_ent = next((te for te in trade_entities if te.get("role") == "our_company" and te.get("entity_id")), None)
            if not our_company_ent:
                issues.append({"type": "error", "message": "Missing Payment Vessel: Paid activities require a bank/cash account entity."})

        # 12. Forex failure → always forces review
        if meta.get("forex_failed") is True:
            issues.append({"type": "error", "message": "Forex Rate Resolution Failure: Could not fetch currency exchange rate. Manual review required."})

        return issues

    def get_trade_validation(self, trade_id: str) -> List[Dict]:
        trade_res = supabase.table("trades").select("*").eq("id", trade_id).single().execute()
        trade = trade_res.data
        if not trade:
            return []
        tp_res = supabase.table("trade_parties").select("*, parties(*)").eq("trade_id", trade_id).execute()
        parties = [tp["parties"] for tp in tp_res.data if tp.get("parties")]
        te_res = supabase.table("trade_entities").select("*").eq("trade_id", trade_id).execute()
        trade_entities = te_res.data or []

        trade_labels = []
        meta = self._get_trade_metadata(trade)
        for rl in meta.get("resolved_labels", []):
            trade_labels.append({"label_id": rl["label_id"], "role": rl["role"], "detected_name": rl["detected_name"]})
        if not trade_labels:
            try:
                tl_res = supabase.table("trade_labels").select("*").eq("trade_id", trade_id).execute()
                trade_labels = tl_res.data or []
            except Exception:
                pass

        try:
            act_res = supabase.table("trade_activities").select("*").eq("trade_id", trade_id).execute()
            activities = act_res.data or []
        except Exception:
            activities = []

        return self.validate_trade_sync(trade, parties, trade_entities, trade_labels, activities)

    # ── Stage 7: Generate financial activities sequence ────────────────────────

    def generate_activities_for_trade(self, trade_id: str) -> List[Dict]:
        """
        Stage 7: Fill the journal template for the trade's document_type.
        purchase_order / sales_order → returns [] (no ledger entries).
        """
        trade_res = supabase.table("trades").select("*").eq("id", trade_id).single().execute()
        trade = trade_res.data
        if not trade:
            return []

        trade_type = trade["trade_type"]

        # NON_FINANCIAL — no journal entries, no activities
        if trade_type in NON_FINANCIAL_TYPES:
            print(f"[INFO] Trade {trade_id} is NON_FINANCIAL ({trade_type}). No activities generated.")
            return []

        workbench_id = trade["workbench_id"]
        meta = self._get_trade_metadata(trade)
        forex_rate   = float(meta.get("forex_rate") or 1.0)
        gross_amount = float(trade.get("amount") or 0.0)
        tax_amount   = float(meta.get("original_tax") or 0.0) * forex_rate
        net_amount   = float(meta.get("original_net") or
                             (float(meta.get("original_gross") or 0.0) - float(meta.get("original_tax") or 0.0))) * forex_rate

        # Load labels
        labels_map: Dict[str, str] = {}
        for rl in meta.get("resolved_labels", []):
            labels_map[rl["role"]] = rl["label_id"]
        if not labels_map:
            try:
                tl_res = supabase.table("trade_labels").select("label_id, role").eq("trade_id", trade_id).execute()
                labels_map = {rl["role"]: rl["label_id"] for rl in (tl_res.data or [])}
            except Exception:
                pass

        # Load entities
        entities_map: Dict[str, str] = {}
        try:
            te_res = supabase.table("trade_entities").select("entity_id, role").eq("trade_id", trade_id).execute()
            entities_map = {re["role"]: re["entity_id"] for re in (te_res.data or [])}
        except Exception:
            pass

        # Load parties
        counterparty_name = "Unknown"
        counterparty_id = None
        try:
            tp_res = supabase.table("trade_parties").select("party_id, role, detected_name").eq("trade_id", trade_id).execute()
            for rp in (tp_res.data or []):
                if rp["role"] == "counterparty":
                    counterparty_name = rp["detected_name"] or "Unknown"
                    counterparty_id = rp["party_id"]
        except Exception:
            pass

        # Load all workbench accounts for label lookups
        accs_res = supabase.table("workbench_accounts").select(
            "id, full_account_name, master_accounts(account_name)"
        ).eq("workbench_id", workbench_id).execute()
        raw_accounts = accs_res.data or []
        accounts = []
        for acc in raw_accounts:
            master = acc.get("master_accounts") or {}
            acc_name = master.get("account_name") or ""
            n = acc_name.lower()
            acc_type = ("asset" if "asset" in n else
                        "liability" if "liabilit" in n else
                        "equity" if "equity" in n else
                        "revenue" if "rev" in n or "income" in n else
                        "expense")
            accounts.append({"id": acc["id"], "full_account_name": acc["full_account_name"], "type": acc_type})

        # Resolve common account IDs
        expense_lbl   = labels_map.get("expense")   or self._find_account_by_keyword(accounts, "expense", "cost")
        revenue_lbl   = labels_map.get("revenue")   or self._find_account_by_keyword(accounts, "revenue", "income", "sales")
        asset_lbl     = labels_map.get("asset")     or self._find_account_by_keyword(accounts, "receivable")
        liability_lbl = labels_map.get("liability") or self._find_account_by_keyword(accounts, "payable")

        our_entity_id  = entities_map.get("our_company")
        entity_bank_lbl = self._get_entity_label_id(our_entity_id, accounts)
        if not entity_bank_lbl:
            entity_bank_lbl = self._find_account_by_keyword(accounts, "bank", "cash", "upi")

        g_amt = float(gross_amount)
        n_amt = float(net_amount)
        t_amt = float(tax_amount)

        activities: List[Dict] = []

        # ── Journal patterns per spec ─────────────────────────────────────────

        if trade_type == "Sales Invoice":
            # Dr Accounts Receivable / Cr Revenue (+ Cr Output GST if tax)
            # If no output GST account: Cr Revenue (GROSS) to keep journals balanced
            ar_lbl = asset_lbl or self._find_account_by_keyword(accounts, "receivable")
            output_gst_lbl = None
            if t_amt > 0:
                output_gst_lbl = self._find_account_by_keyword(accounts, "output gst", "tax liability", "gst payable", "vat output")

            activities.append({"type": "CREATE_RECEIVABLE", "action": "DEBIT", "target_type": "invoices",
                                "amount": g_amt, "party_id": counterparty_id,
                                "metadata": {"description": f"AR for {counterparty_name}"}})

            if output_gst_lbl and t_amt > 0:
                activities.append({"type": "ADD_REVENUE",    "action": "CREDIT", "target_type": "workbench_accounts",
                                   "target_id": revenue_lbl, "amount": n_amt,
                                   "metadata": {"description": "Revenue (net)"}})
                activities.append({"type": "ADD_OUTPUT_GST", "action": "CREDIT", "target_type": "workbench_accounts",
                                   "target_id": output_gst_lbl, "amount": t_amt,
                                   "metadata": {"description": "Output GST / Tax Liability"}})
            else:
                # No GST account — credit full gross to revenue
                activities.append({"type": "ADD_REVENUE", "action": "CREDIT", "target_type": "workbench_accounts",
                                   "target_id": revenue_lbl, "amount": g_amt,
                                   "metadata": {"description": "Revenue (gross — no GST account configured)"}})

            activities.append({"type": "UPDATE_PARTY", "action": "INCREASE", "target_type": "parties",
                               "party_id": counterparty_id, "amount": g_amt})


        elif trade_type == "Customer Payment":
            # Dr Entity (bank/cash) / Cr Accounts Receivable
            activities.append({"type": "REMOVE_RECEIVABLE", "action": "CREDIT", "target_type": "invoices",            "amount": g_amt, "party_id": counterparty_id, "metadata": {"description": "Settle AR"}})
            activities.append({"type": "INCREASE_LABEL",    "action": "DEBIT",  "target_type": "workbench_accounts",  "target_id": entity_bank_lbl, "amount": g_amt})
            activities.append({"type": "UPDATE_PARTY",      "action": "DECREASE","target_type": "parties",            "party_id": counterparty_id, "amount": g_amt})
            if our_entity_id:
                activities.append({"type": "UPDATE_ENTITY", "action": "INCREASE", "target_type": "entities", "entity_id": our_entity_id, "amount": g_amt})

        elif trade_type == "Vendor Invoice":
            # Dr Expense / Cr Accounts Payable
            # If a dedicated Input GST account exists: Dr Expense (net) + Dr Input GST (tax) / Cr AP (gross)
            # If NOT: Dr Expense (GROSS) / Cr AP (GROSS) — always balanced, no Suspense needed
            ap_lbl = liability_lbl or self._find_account_by_keyword(accounts, "payable", "accounts payable")
            input_gst_lbl = None
            if t_amt > 0:
                input_gst_lbl = self._find_account_by_keyword(accounts, "input gst", "gst input", "tax credit", "vat input")

            activities.append({"type": "CREATE_PAYABLE", "action": "CREDIT", "target_type": "bills",
                                "amount": g_amt, "party_id": counterparty_id,
                                "metadata": {"description": f"AP for {counterparty_name}"}})

            if input_gst_lbl and t_amt > 0:
                # Full split: net → expense, tax → GST account
                activities.append({"type": "ADD_EXPENSE",   "action": "DEBIT", "target_type": "workbench_accounts",
                                   "target_id": expense_lbl, "amount": n_amt,
                                   "metadata": {"description": "Expense (net)"}})
                activities.append({"type": "ADD_INPUT_GST", "action": "DEBIT", "target_type": "workbench_accounts",
                                   "target_id": input_gst_lbl, "amount": t_amt,
                                   "metadata": {"description": "Input GST / Tax Credit"}})
            else:
                # No GST account — debit full gross to expense so journals always balance
                activities.append({"type": "ADD_EXPENSE", "action": "DEBIT", "target_type": "workbench_accounts",
                                   "target_id": expense_lbl, "amount": g_amt,
                                   "metadata": {"description": "Expense (gross — no GST account configured)"}})

            activities.append({"type": "UPDATE_PARTY", "action": "INCREASE", "target_type": "parties",
                               "party_id": counterparty_id, "amount": g_amt})


        elif trade_type == "Vendor Payment":
            # Dr Accounts Payable / Cr Entity (bank/cash)
            activities.append({"type": "REMOVE_PAYABLE", "action": "DEBIT",  "target_type": "bills",              "amount": g_amt, "party_id": counterparty_id, "metadata": {"description": "Settle AP"}})
            activities.append({"type": "DECREASE_LABEL", "action": "CREDIT", "target_type": "workbench_accounts", "target_id": entity_bank_lbl, "amount": g_amt})
            activities.append({"type": "UPDATE_PARTY",   "action": "DECREASE","target_type": "parties",           "party_id": counterparty_id, "amount": g_amt})
            if our_entity_id:
                activities.append({"type": "UPDATE_ENTITY", "action": "DECREASE", "target_type": "entities", "entity_id": our_entity_id, "amount": g_amt})

        elif trade_type == "Expense Receipt":
            # Dr Expense / Cr Entity (bank/cash) — no AP, already paid
            activities.append({"type": "ADD_EXPENSE",    "action": "DEBIT",  "target_type": "workbench_accounts", "target_id": expense_lbl, "amount": g_amt})
            activities.append({"type": "DECREASE_LABEL", "action": "CREDIT", "target_type": "workbench_accounts", "target_id": entity_bank_lbl, "amount": g_amt})
            if our_entity_id:
                activities.append({"type": "UPDATE_ENTITY", "action": "DECREASE", "target_type": "entities", "entity_id": our_entity_id, "amount": g_amt})

        elif trade_type == "Bank Statement":
            # Per-line: each line is either matched AR/AP or Dr/Cr Entity vs Suspense
            suspense_lbl = self._find_account_by_keyword(accounts, "suspense", "clearing", "unmatched")
            activities.append({"type": "INCREASE_LABEL", "action": "DEBIT",  "target_type": "workbench_accounts", "target_id": entity_bank_lbl, "amount": g_amt, "metadata": {"description": "Bank reconciliation inflow"}})
            activities.append({"type": "DECREASE_LABEL", "action": "CREDIT", "target_type": "workbench_accounts", "target_id": suspense_lbl or liability_lbl, "amount": g_amt, "metadata": {"description": "Suspense / matched entry"}})
            if our_entity_id:
                activities.append({"type": "UPDATE_ENTITY", "action": "INCREASE", "target_type": "entities", "entity_id": our_entity_id, "amount": g_amt})

        elif trade_type == "Payroll":
            # Dr Payroll Expense / Cr Entity (net pay) + Cr Tax Liability (withholdings)
            payroll_exp_lbl = (self._find_account_by_keyword(accounts, "payroll expense", "salary", "wages") or expense_lbl)
            tds_lbl = self._find_account_by_keyword(accounts, "tds", "tax liability", "withholding")
            activities.append({"type": "ADD_EXPENSE",    "action": "DEBIT",  "target_type": "workbench_accounts", "target_id": payroll_exp_lbl, "amount": g_amt, "metadata": {"description": "Payroll Expense"}})
            activities.append({"type": "DECREASE_LABEL", "action": "CREDIT", "target_type": "workbench_accounts", "target_id": entity_bank_lbl, "amount": n_amt, "metadata": {"description": "Net Pay to employees"}})
            if t_amt > 0:
                activities.append({"type": "ADD_OUTPUT_GST", "action": "CREDIT", "target_type": "workbench_accounts", "target_id": tds_lbl, "amount": t_amt, "metadata": {"description": "TDS / Withholding Tax"}})
            if our_entity_id:
                activities.append({"type": "UPDATE_ENTITY", "action": "DECREASE", "target_type": "entities", "entity_id": our_entity_id, "amount": n_amt})

        elif trade_type == "Credit Note":
            # Dr Revenue / Cr Accounts Receivable — reverses a sales_invoice
            ref_invoice_id = meta.get("reference_invoice")
            activities.append({"type": "DECREASE_LABEL",    "action": "DEBIT",  "target_type": "workbench_accounts", "target_id": revenue_lbl, "amount": g_amt, "metadata": {"description": "Reverse Revenue", "reference_invoice": ref_invoice_id}})
            activities.append({"type": "REMOVE_RECEIVABLE",  "action": "CREDIT", "target_type": "invoices",            "amount": g_amt, "party_id": counterparty_id, "metadata": {"description": "AR Adjustment (Credit Note)", "reference_invoice": ref_invoice_id}})
            activities.append({"type": "UPDATE_PARTY",       "action": "DECREASE","target_type": "parties",            "party_id": counterparty_id, "amount": g_amt})

        elif trade_type == "Debit Note":
            # Dr Accounts Payable / Cr Expense — vendor adjustment
            ref_invoice_id = meta.get("reference_invoice")
            activities.append({"type": "REMOVE_PAYABLE", "action": "DEBIT",  "target_type": "bills",              "amount": g_amt, "party_id": counterparty_id, "metadata": {"description": "Vendor Adjustment (Debit Note)", "reference_invoice": ref_invoice_id}})
            activities.append({"type": "DECREASE_LABEL", "action": "CREDIT", "target_type": "workbench_accounts", "target_id": expense_lbl, "amount": g_amt, "metadata": {"description": "Reverse Expense / AP Adjustment"}})
            activities.append({"type": "UPDATE_PARTY",   "action": "DECREASE","target_type": "parties",           "party_id": counterparty_id, "amount": g_amt})

        elif trade_type == "Loan":
            # Dr Entity (bank, inflow) / Cr Liability (Loan Payable)
            loan_lbl = self._find_account_by_keyword(accounts, "loan payable", "loan", "borrowing", "long-term liability")
            activities.append({"type": "INCREASE_LABEL", "action": "DEBIT",  "target_type": "workbench_accounts", "target_id": entity_bank_lbl, "amount": g_amt, "metadata": {"description": "Loan proceeds received"}})
            activities.append({"type": "INCREASE_LABEL", "action": "CREDIT", "target_type": "workbench_accounts", "target_id": loan_lbl or liability_lbl, "amount": g_amt, "metadata": {"description": "Loan Payable (liability created)"}})
            if our_entity_id:
                activities.append({"type": "UPDATE_ENTITY", "action": "INCREASE", "target_type": "entities", "entity_id": our_entity_id, "amount": g_amt})

        elif trade_type == "Investment":
            # Dr Entity (bank, inflow) / Cr Equity
            equity_lbl = self._find_account_by_keyword(accounts, "equity", "share capital", "paid-up capital", "capital")
            activities.append({"type": "INCREASE_LABEL", "action": "DEBIT",  "target_type": "workbench_accounts", "target_id": entity_bank_lbl, "amount": g_amt, "metadata": {"description": "Investment proceeds received"}})
            activities.append({"type": "INCREASE_LABEL", "action": "CREDIT", "target_type": "workbench_accounts", "target_id": equity_lbl or liability_lbl, "amount": g_amt, "metadata": {"description": "Equity raised (capital)"}})
            if our_entity_id:
                activities.append({"type": "UPDATE_ENTITY", "action": "INCREASE", "target_type": "entities", "entity_id": our_entity_id, "amount": g_amt})

        elif trade_type == "Tax Document":
            # Dr Tax Expense / Cr Tax Liability
            tax_exp_lbl = self._find_account_by_keyword(accounts, "tax expense", "income tax", "tax")
            tax_liab_lbl = self._find_account_by_keyword(accounts, "tax liability", "tax payable", "gst payable")
            activities.append({"type": "ADD_EXPENSE",    "action": "DEBIT",  "target_type": "workbench_accounts", "target_id": tax_exp_lbl or expense_lbl, "amount": g_amt, "metadata": {"description": "Tax Expense"}})
            activities.append({"type": "CREATE_PAYABLE", "action": "CREDIT", "target_type": "workbench_accounts", "target_id": tax_liab_lbl or liability_lbl, "amount": g_amt, "metadata": {"description": "Tax Liability due"}})

        elif trade_type == "Manual Journal":
            # User-defined Dr/Cr lines — still balance-validated at Stage 8
            # We create a symmetric pair using resolved labels as best effort
            debit_lbl  = labels_map.get("expense") or labels_map.get("asset") or expense_lbl
            credit_lbl = labels_map.get("liability") or labels_map.get("revenue") or liability_lbl or revenue_lbl
            activities.append({"type": "INCREASE_LABEL", "action": "DEBIT",  "target_type": "workbench_accounts", "target_id": debit_lbl,  "amount": g_amt, "metadata": {"description": "Manual Journal Debit"}})
            activities.append({"type": "INCREASE_LABEL", "action": "CREDIT", "target_type": "workbench_accounts", "target_id": credit_lbl, "amount": g_amt, "metadata": {"description": "Manual Journal Credit"}})

        else:
            # Generic fallback — should not normally be reached
            print(f"[WARNING] Unrecognised trade_type '{trade_type}' — using generic fallback journal.")
            activities.append({"type": "INCREASE_LABEL", "action": "DEBIT",  "target_type": "workbench_accounts", "target_id": expense_lbl or asset_lbl, "amount": g_amt})
            activities.append({"type": "DECREASE_LABEL", "action": "CREDIT", "target_type": "workbench_accounts", "target_id": liability_lbl or revenue_lbl, "amount": g_amt})

        # Persist activities to DB
        try:
            activities_to_insert = [
                {
                    "trade_id":      trade_id,
                    "sequence":      i + 1,
                    "activity_type": act["type"],
                    "action":        act.get("action"),
                    "target_type":   act.get("target_type"),
                    "target_id":     act.get("target_id"),
                    "party_id":      act.get("party_id"),
                    "entity_id":     act.get("entity_id"),
                    "amount":        float(act["amount"]),
                    "status":        "Pending",
                    "metadata":      act.get("metadata") or {}
                }
                for i, act in enumerate(activities)
            ]
            if activities_to_insert:
                supabase.table("trade_activities").insert(activities_to_insert).execute()
            return activities_to_insert
        except Exception as e:
            print(f"[WARNING] Inserting activities failed: {e}")
            return []

    # ── Stage 12: Recompute COA / ledger views ─────────────────────────────────

    def recompute_coa_balances(self, workbench_id: str) -> Dict:
        """
        Stage 12 — Recomputes workbench_accounts.current_amount for every account
        in the workbench by summing transaction_entries.amount WHERE label_id matches.
        Must be called immediately after Stage 11 commits entries to the ledger.
        Failure to call this is the primary cause of COA appearing unchanged after /execute.
        """
        try:
            # 1. Fetch all label IDs for this workbench
            labels_res = supabase.table("workbench_accounts")\
                .select("id")\
                .eq("workbench_id", workbench_id)\
                .eq("is_active", True)\
                .execute()
            label_ids = [row["id"] for row in (labels_res.data or [])]
            if not label_ids:
                return {"status": "No accounts found", "updated": 0}

            # 2. Fetch all transaction_entries for these labels
            entries_res = supabase.table("transaction_entries")\
                .select("label_id, amount")\
                .in_("label_id", label_ids)\
                .execute()

            # 3. Sum amounts per label_id
            sums: Dict[str, float] = {lid: 0.0 for lid in label_ids}
            for entry in (entries_res.data or []):
                lid = entry["label_id"]
                if lid in sums:
                    sums[lid] += float(entry["amount"])

            # 4. Bulk-update each workbench_account
            updated_count = 0
            for lid, total in sums.items():
                try:
                    supabase.table("workbench_accounts")\
                        .update({"current_amount": total})\
                        .eq("id", lid)\
                        .execute()
                    updated_count += 1
                except Exception as upd_err:
                    print(f"[WARNING] Stage 12: Failed to update account {lid}: {upd_err}")

            print(f"[Stage 12] COA recompute complete for workbench {workbench_id}. Updated {updated_count} accounts.")
            return {"status": "success", "updated": updated_count}
        except Exception as e:
            print(f"[ERROR] Stage 12 COA recompute failed for workbench {workbench_id}: {e}")
            return {"status": "error", "message": str(e)}

    def emit_audit_log(
        self,
        workbench_id: str,
        trade_id: str,
        transaction_ids: List[str],
        executed_by: Optional[str],
        ruleset_id: Optional[str] = None
    ):
        """
        Stage 12b — Writes a structured audit log entry referencing the document,
        the ruleset (if one fired), the confirming user, and the resulting transaction IDs.
        """
        try:
            supabase.table("audit_logs").insert({
                "trade_id": trade_id,
                "user_id": executed_by,
                "action": "STAGE_12_COMMIT",
                "old_value": {},
                "new_value": {"transaction_ids": transaction_ids},
                "metadata": {
                    "workbench_id": workbench_id,
                    "ruleset_id": ruleset_id,
                    "confirmed_by": executed_by,
                    "timestamp": datetime.utcnow().isoformat()
                }
            }).execute()
        except Exception as e:
            print(f"[WARNING] Stage 12 audit log failed: {e}")


trade_service = TradeService()
