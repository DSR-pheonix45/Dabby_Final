import json
from typing import Dict, Any, List

class UFOMapper:
    """
    Normalizes the raw, unstructured JSON from the AI into the strict
    Universal Financial Object (UFO) schema columns.
    Strips out `.value` and `.confidence` wrappers.
    """

    @staticmethod
    def _extract_value(field: Any) -> Any:
        if isinstance(field, dict) and "value" in field:
            return field["value"]
        return field

    @staticmethod
    def normalize(analysis_data: dict) -> dict:
        doc_type_raw = analysis_data.get("document_type", "Unknown")
        doc_type = UFOMapper._extract_value(doc_type_raw)
        
        # 1. Parties
        # The extraction schema uses vendor/customer; tolerate legacy issuer/recipient keys too.
        raw_parties = analysis_data.get("parties", {})

        def _party_name(*keys):
            for k in keys:
                v = UFOMapper._extract_value(raw_parties.get(k, ""))
                if v:
                    return v
            return ""

        parties = {
            "issuer": {
                "name": _party_name("vendor", "issuer", "issuer_name", "vendor_name", "seller"),
                "address": _party_name("vendor_address", "issuer_address"),
                "gstin": _party_name("vendor_gstin", "issuer_gstin", "gstin")
            },
            "recipient": {
                "name": _party_name("customer", "recipient", "recipient_name", "customer_name", "buyer", "bill_to"),
                "address": _party_name("customer_address", "recipient_address"),
                "gstin": _party_name("customer_gstin", "recipient_gstin")
            }
        }

        # 2. Money  (schema: financials.total_amount / tax_amount / currency)
        raw_financials = analysis_data.get("financials", {})

        def _num(v):
            try:
                return float(v)
            except (TypeError, ValueError):
                return 0.0

        total = _num(UFOMapper._extract_value(raw_financials.get("total_amount", 0)))
        tax = _num(UFOMapper._extract_value(
            raw_financials.get("tax_amount", raw_financials.get("total_tax", 0))))
        subtotal = _num(UFOMapper._extract_value(raw_financials.get("subtotal", 0)))
        if not subtotal and total:
            subtotal = round(total - tax, 2)
        money = {
            "total_amount": total,
            "subtotal": subtotal,
            "currency": UFOMapper._extract_value(raw_financials.get("currency", "INR"))
        }

        # 3. Taxes
        taxes = {
            "total_tax": tax,
            "tax_lines": []
        }
        raw_tax_lines = UFOMapper._extract_value(raw_financials.get("taxes", []))
        if isinstance(raw_tax_lines, list):
            for t in raw_tax_lines:
                taxes["tax_lines"].append({
                    "type": UFOMapper._extract_value(t.get("type", "")),
                    "amount": UFOMapper._extract_value(t.get("amount", 0)),
                    "rate": UFOMapper._extract_value(t.get("rate", 0))
                })

        # 4. Dates
        raw_doc = analysis_data.get("document", {})
        dates = {
            "document_date": UFOMapper._extract_value(raw_doc.get("date", "")),
            "due_date": UFOMapper._extract_value(raw_doc.get("due_date", "")),
            "period_start": UFOMapper._extract_value(raw_doc.get("period_start", "")),
            "period_end": UFOMapper._extract_value(raw_doc.get("period_end", ""))
        }

        # 5. Line Items / Transactions
        raw_line_items = UFOMapper._extract_value(analysis_data.get("line_items", []))
        raw_transactions = UFOMapper._extract_value(analysis_data.get("transactions", []))
        
        line_items = []
        # If it's a bank statement, we likely have transactions instead of line items
        if isinstance(raw_transactions, list) and len(raw_transactions) > 0:
            for tx in raw_transactions:
                line_items.append({
                    "date": UFOMapper._extract_value(tx.get("date", "")),
                    "description": UFOMapper._extract_value(tx.get("description", "")),
                    "reference": UFOMapper._extract_value(tx.get("reference", "")),
                    "debit": UFOMapper._extract_value(tx.get("debit", 0)),
                    "credit": UFOMapper._extract_value(tx.get("credit", 0)),
                    "balance": UFOMapper._extract_value(tx.get("balance", 0))
                })
        elif isinstance(raw_line_items, list):
            for item in raw_line_items:
                line_items.append({
                    "description": UFOMapper._extract_value(item.get("description", "")),
                    "quantity": UFOMapper._extract_value(item.get("quantity", 1)),
                    "unit_price": UFOMapper._extract_value(item.get("unit_price", 0)),
                    "total": UFOMapper._extract_value(item.get("total", 0))
                })

        return {
            "document_type": str(doc_type) if doc_type else "Unknown",
            "parties": parties,
            "money": money,
            "taxes": taxes,
            "dates": dates,
            "line_items": line_items
        }
