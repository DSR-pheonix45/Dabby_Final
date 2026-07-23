"""
Analysis Note Service
=====================
Converts OCR output + document classification into a canonical Analysis Note.

Core principles:
  - Business Reality, not accounting treatment.
  - Event candidate is DETERMINISTIC — no second AI call.
  - Settlement key enables future automatic matching across documents.
  - Three-dimensional confidence: ocr_quality + classification + field_completeness.
  - overall = min() — weakest dimension poisons the note.
  - review_status lifecycle: DRAFT → UNDER_REVIEW → APPROVED / REJECTED / SUPERSEDED.

Does NOT:
  - Generate journal entries
  - Suggest COA accounts
  - Call AI for event type resolution
"""

import uuid
import json
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any

from supabase_client import supabase


# ──────────────────────────────────────────────────────────────────────────────
# Deterministic Maps
# ──────────────────────────────────────────────────────────────────────────────

INTENT_MAP: Dict[str, str] = {
    "sales_invoice":             "CUSTOMER_BILLED",
    "customer_payment_receipt":  "PAYMENT_SNIPPET",
    "vendor_invoice":            "VENDOR_BILLED",
    "vendor_payment_receipt":    "PAYMENT_SNIPPET",
    "expense_receipt":           "PAYMENT_SNIPPET",
    "receipt":                   "PAYMENT_SNIPPET",
    "payroll_register":          "PAYROLL_INCURRED",

    "credit_note":               "REVENUE_REVERSED",
    "debit_note":                "VENDOR_ADJUSTMENT_ISSUED",
    "bank_statement":            "BANK_ACTIVITY_RECORDED",
    "loan_agreement":            "LOAN_RECEIVED",
    "investment_agreement":      "INVESTMENT_RECEIVED",
    "tax_document":              "TAX_LIABILITY_CREATED",
    "purchase_order":            "PURCHASE_ORDER_CREATED",
    "sales_order":               "SALES_ORDER_CREATED",
    "unknown":                   "UNCLASSIFIED",
}

CASH_DIRECTION_MAP: Dict[str, str] = {
    "sales_invoice":             "INBOUND",   # money expected to come in
    "customer_payment_receipt":  "INBOUND",
    "vendor_invoice":            "OUTBOUND",  # money expected to go out
    "vendor_payment_receipt":    "OUTBOUND",
    "expense_receipt":           "OUTBOUND",
    "payroll_register":          "OUTBOUND",
    "credit_note":               "INBOUND",   # reversal reduces AR
    "debit_note":                "OUTBOUND",
    "bank_statement":            "MIXED",
    "loan_agreement":            "INBOUND",   # loan proceeds received
    "investment_agreement":      "INBOUND",   # investment received
    "tax_document":              "OUTBOUND",
    "purchase_order":            "NONE",      # commitment only
    "sales_order":               "NONE",      # commitment only
    "unknown":                   "UNKNOWN",
}

# Required fields per document type for field_completeness scoring
REQUIRED_FIELDS: Dict[str, List[str]] = {
    "sales_invoice":             ["total_amount", "document_date", "issuer_name", "invoice_number"],
    "vendor_invoice":            ["total_amount", "document_date", "issuer_name", "invoice_number"],
    "customer_payment_receipt":  ["total_amount", "document_date", "issuer_name"],
    "vendor_payment_receipt":    ["total_amount", "document_date", "issuer_name"],
    "expense_receipt":           ["total_amount", "document_date", "merchant_name"],
    "bank_statement":            ["opening_balance", "closing_balance", "has_transactions"],
    "payroll_register":          ["total_net_pay",  "pay_period",    "has_employees"],
    "credit_note":               ["total_amount", "document_date", "reference_invoice"],
    "debit_note":                ["total_amount", "document_date"],
    "purchase_order":            ["total_amount", "document_date", "issuer_name"],
    "sales_order":               ["total_amount", "document_date"],
    "loan_agreement":            ["principal_amount", "document_date", "lender_name", "borrower_name"],
    "investment_agreement":      ["investment_amount", "document_date"],
    "tax_document":              ["total_amount", "document_date"],
    "unknown":                   [],
}

# Settlement key extraction rules: doc_type → (primary_ref, fallback_refs...)
SETTLEMENT_KEY_RULES: Dict[str, List[str]] = {
    "sales_invoice":             ["invoice_number", "so_number"],
    "vendor_invoice":            ["invoice_number", "po_number"],
    "customer_payment_receipt":  ["reference_invoice", "invoice_number", "transaction_reference"],
    "vendor_payment_receipt":    ["reference_invoice", "invoice_number", "transaction_reference"],
    "expense_receipt":           ["receipt_number", "transaction_reference"],
    "payroll_register":          ["payroll_period", "register_number"],
    "credit_note":               ["reference_invoice", "invoice_number"],
    "debit_note":                ["reference_invoice", "invoice_number"],
    "purchase_order":            ["po_number", "invoice_number"],
    "sales_order":               ["so_number", "invoice_number"],
    "loan_agreement":            ["agreement_number", "loan_reference"],
    "investment_agreement":      ["agreement_number", "transaction_reference"],
    "tax_document":              ["challan_number", "filing_period"],
    "bank_statement":            ["statement_period", "account_number"],
    "unknown":                   [],
}

GENERATOR_VERSION = "1.0"


# ──────────────────────────────────────────────────────────────────────────────
# Analysis Note Service
# ──────────────────────────────────────────────────────────────────────────────

class AnalysisNoteService:
    """
    Generates and stores canonical Analysis Notes from OCR + classification output.
    """

    def __init__(self, bank_statement_parser=None):
        """
        Args:
            bank_statement_parser: BankStatementParser instance (injected)
        """
        self._bank_parser = bank_statement_parser

    # ──────────────────────────────────────────────────────────────────────
    # Public: Generate and store
    # ──────────────────────────────────────────────────────────────────────

    async def generate_and_store(
        self,
        document_id: str,
        user_id: str,
        ocr_output: Dict,          # raw OCR extraction output
        classification: Dict,      # document_classifier output
        existing_processed: Optional[Dict] = None,  # optional pre-processed data (e.g. bank KPIs)
    ) -> Dict:
        """
        Generate a canonical Analysis Note and persist it to the database.

        Steps:
          1. Compute event candidate (deterministic)
          2. Extract structured fields from OCR output
          3. Compute field completeness
          4. Build three-dimensional confidence
          5. Determine review_status and routing
          6. Persist to analysis_notes table
          7. Update user_documents.analysis_note_id

        Returns the stored analysis_note record.
        """
        doc_type   = classification.get("document_type", "unknown")
        clf_conf   = float(classification.get("confidence", 0.0))
        ocr_conf   = float(ocr_output.get("confidence", 0.0)) if ocr_output else 0.0

        # ── 1. Deterministic event candidate ──────────────────
        event_candidate = self._resolve_event_candidate(doc_type, clf_conf)

        # ── 2. Extract structured fields ───────────────────────
        if doc_type == "bank_statement":
            note_fields = self._build_bank_statement_fields(ocr_output, existing_processed)
        else:
            note_fields = self._build_generic_fields(doc_type, ocr_output)

        # ── 3. Settlement key ──────────────────────────────────
        settlement_key = self._resolve_settlement_key(doc_type, note_fields["references"])

        # ── 4. Business context ────────────────────────────────
        business_context = self._build_business_context(doc_type, note_fields)

        # ── 5. Three-dimensional confidence ───────────────────
        field_completeness = self._compute_field_completeness(doc_type, note_fields)
        confidence = {
            "ocr_quality":        round(ocr_conf, 3),
            "classification":     round(clf_conf, 3),
            "field_completeness": round(field_completeness, 3),
            "overall":            round(min(ocr_conf, clf_conf, field_completeness), 3),
        }

        # ── 6. Review status ───────────────────────────────────
        overall = confidence["overall"]
        review_status = "DRAFT"
        # Auto-approve high-confidence notes on creation
        if overall >= 0.85 and doc_type != "unknown":
            review_status = "DRAFT"  # still DRAFT — Trade Engine routing handles it

        # ── 7. Supersede old notes ─────────────────────────────
        await self._supersede_existing_notes(document_id)

        # ── 8. Persist ─────────────────────────────────────────
        note_row = {
            "document_id":       document_id,
            "user_id":      user_id,
            "document_type":     doc_type,
            "confidence":        confidence,
            "document_metadata": note_fields["document_metadata"],
            "parties":           note_fields["parties"],
            "amounts":           note_fields["amounts"],
            "dates":             note_fields["dates"],
            "document_references": note_fields["references"],
            "business_context":  business_context,
            "line_items":        note_fields.get("line_items", []),
            "evidence":          note_fields.get("evidence", {}),
            "settlement":        note_fields.get("settlement", {}),
            "settlement_key":    settlement_key,
            "event_candidate":   event_candidate,
            "review_status":     review_status,
            "is_superseded":     False,
            "generator_version": GENERATOR_VERSION,
        }

        result = supabase.table("analysis_notes").insert(note_row).execute()
        if not result.data:
            raise RuntimeError(f"[AnalysisNoteService] DB insert failed for document {document_id}")

        stored_note = result.data[0]
        note_id     = stored_note["id"]

        # ── 9. Backlink on user_documents ─────────────────
        supabase.table("user_documents").update({
            "analysis_note_id": note_id
        }).eq("id", document_id).execute()

        print(f"[AnalysisNoteService] Note {note_id} generated for doc {document_id} "
              f"| type={doc_type} | overall={overall:.2f} | event={event_candidate['event_type']}")

        return stored_note

    async def get_for_document(self, document_id: str) -> Optional[Dict]:
        """Fetch the latest (non-superseded) Analysis Note for a document."""
        result = (
            supabase.table("analysis_notes")
                    .select("*")
                    .eq("document_id", document_id)
                    .eq("is_superseded", False)
                    .order("created_at", desc=True)
                    .limit(1)
                    .execute()
        )
        return result.data[0] if result.data else None

    async def list_for_workbench(
        self,
        user_id: str,
        review_status: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> List[Dict]:
        """List Analysis Notes for a workbench, optionally filtered by review_status."""
        q = (
            supabase.table("analysis_notes")
                    .select("*")
                    .eq("user_id", user_id)
                    .eq("is_superseded", False)
                    .order("created_at", desc=True)
                    .limit(limit)
                    .offset(offset)
        )
        if review_status:
            q = q.eq("review_status", review_status)
        result = q.execute()
        return result.data or []

    async def update_review_status(
        self,
        note_id: str,
        new_status: str,
        reviewed_by: Optional[str] = None,
        review_notes: Optional[str] = None,
    ) -> Dict:
        """
        Update the lifecycle status of an Analysis Note.
        Valid transitions: DRAFT → UNDER_REVIEW → APPROVED | REJECTED
        """
        valid = {"DRAFT", "UNDER_REVIEW", "APPROVED", "REJECTED", "SUPERSEDED"}
        if new_status not in valid:
            raise ValueError(f"Invalid review_status: {new_status}")

        payload: Dict[str, Any] = {"review_status": new_status}
        if reviewed_by:   payload["reviewed_by"]  = reviewed_by
        if review_notes:  payload["review_notes"]  = review_notes
        if new_status in ("APPROVED", "REJECTED"):
            payload["reviewed_at"] = datetime.now(timezone.utc).isoformat()
        if new_status == "SUPERSEDED":
            payload["is_superseded"] = True

        result = supabase.table("analysis_notes").update(payload).eq("id", note_id).execute()
        return result.data[0] if result.data else {}

    async def find_linked_by_settlement_key(
        self, user_id: str, settlement_key: str
    ) -> List[Dict]:
        """
        Find all Analysis Notes in a workbench that share a settlement key.
        Enables invoice → payment matching.
        """
        result = (
            supabase.table("analysis_notes")
                    .select("id, document_id, document_type, settlement_key, event_candidate, amounts, dates")
                    .eq("user_id", user_id)
                    .eq("settlement_key", settlement_key)
                    .eq("is_superseded", False)
                    .execute()
        )
        return result.data or []

    # ──────────────────────────────────────────────────────────────────────
    # Private: Deterministic event candidate
    # ──────────────────────────────────────────────────────────────────────

    @staticmethod
    def _resolve_event_candidate(document_type: str, classification_confidence: float) -> Dict:
        """
        Deterministic mapping. No AI. No second LLM call.
        Confidence is inherited directly from the classifier.
        """
        event_type = INTENT_MAP.get(document_type, "UNCLASSIFIED")
        return {
            "event_type":  event_type,
            "confidence":  round(classification_confidence, 3),
            "reasoning":   f"Deterministic mapping from document_type='{document_type}'",
        }

    # ──────────────────────────────────────────────────────────────────────
    # Private: Settlement key
    # ──────────────────────────────────────────────────────────────────────

    @staticmethod
    def _resolve_settlement_key(document_type: str, references: Dict) -> Optional[str]:
        """
        Extract the cross-document linkage key from references.
        Returns None if no suitable reference is found.
        """
        for field in SETTLEMENT_KEY_RULES.get(document_type, []):
            val = references.get(field)
            if val and str(val).strip() not in ("", "null", "None"):
                return str(val).strip()
        return None

    # ──────────────────────────────────────────────────────────────────────
    # Private: Business context
    # ──────────────────────────────────────────────────────────────────────

    @staticmethod
    def _build_business_context(document_type: str, note_fields: Dict) -> Dict:
        intent         = INTENT_MAP.get(document_type, "UNCLASSIFIED")
        cash_direction = CASH_DIRECTION_MAP.get(document_type, "UNKNOWN")

        effect_map = {
            "CUSTOMER_BILLED":          "A customer has been billed. Revenue is expected.",
            "CUSTOMER_PAYMENT_RECEIVED":"A customer has paid. Cash has been received.",
            "VENDOR_BILLED":            "A vendor has billed us. A liability has been incurred.",
            "VENDOR_PAYMENT_MADE":      "A payment has been made to a vendor.",
            "EXPENSE_INCURRED":         "A business expense has been incurred.",
            "PAYROLL_INCURRED":         "Payroll has been processed. Salaries are due.",
            "REVENUE_REVERSED":         "A previously issued invoice has been reversed.",
            "VENDOR_ADJUSTMENT_ISSUED": "A debit note has been issued against a vendor.",
            "BANK_ACTIVITY_RECORDED":   "Bank account activity has been recorded for reconciliation.",
            "LOAN_RECEIVED":            "A loan has been received. A liability has been created.",
            "INVESTMENT_RECEIVED":      "An investment has been received. Equity has been issued.",
            "TAX_LIABILITY_CREATED":    "A tax obligation has been recorded.",
            "PURCHASE_ORDER_CREATED":   "A purchase commitment has been created. No cash movement yet.",
            "SALES_ORDER_CREATED":      "A sales commitment has been created. No cash movement yet.",
            "UNCLASSIFIED":             "Document could not be classified. Manual review required.",
        }

        return {
            "intent":          intent,
            "cash_direction":  cash_direction,
            "economic_effect": effect_map.get(intent, ""),
        }

    # ──────────────────────────────────────────────────────────────────────
    # Private: Field builders
    # ──────────────────────────────────────────────────────────────────────

    def _build_generic_fields(self, doc_type: str, ocr_output: Dict) -> Dict:
        """
        Build normalized Analysis Note fields from generic OCR extraction output.
        Handles: invoices, receipts, orders, agreements, payroll, tax documents.
        """
        # The OCR output from ai_service uses these keys
        doc_meta   = ocr_output.get("document_metadata") or {}
        parties    = ocr_output.get("parties")            or {}
        financials = ocr_output.get("financials")         or {}
        refs       = ocr_output.get("references")         or {}
        add_fields = ocr_output.get("additional_fields")  or {}
        line_items = ocr_output.get("line_items")         or []

        # ── Parties ────────────────────────────────────────────
        normalized_parties = {
            "issuer": {
                "name":    parties.get("vendor_name") or add_fields.get("issuer_name"),
                "gstin":   parties.get("gst_number"),
                "address": parties.get("vendor_address") or add_fields.get("issuer_address"),
            },
            "recipient": {
                "name":    parties.get("customer_name") or add_fields.get("recipient_name"),
                "gstin":   parties.get("customer_gst")  or add_fields.get("recipient_gst"),
                "address": parties.get("customer_address") or add_fields.get("recipient_address"),
            },
        }

        # Swap issuer/recipient for sales invoices (we are the issuer)
        if doc_type in ("sales_invoice", "sales_order", "credit_note"):
            normalized_parties["issuer"]["name"] = (
                parties.get("customer_name") or
                normalized_parties["issuer"]["name"]
            )

        # ── Amounts ────────────────────────────────────────────
        amounts = {
            "subtotal":     self._safe_float(financials.get("subtotal")),
            "tax_amount":   self._safe_float(financials.get("tax_amount")),
            "discount":     self._safe_float(financials.get("discount")),
            "total_amount": self._safe_float(financials.get("total_amount")),
            "currency":     doc_meta.get("currency") or "INR",
        }
        # Merge additional amount fields for special doc types
        if doc_type == "loan_agreement":
            amounts["principal_amount"] = self._safe_float(add_fields.get("principal"))
            amounts["interest_rate"]    = self._safe_float(add_fields.get("interest_rate"))
        if doc_type == "investment_agreement":
            amounts["investment_amount"] = self._safe_float(add_fields.get("investment_amount"))
        if doc_type == "payroll_register":
            amounts["total_gross_pay"]  = self._safe_float(add_fields.get("total_gross_pay"))
            amounts["total_deductions"] = self._safe_float(add_fields.get("total_deductions"))
            amounts["total_net_pay"]    = self._safe_float(add_fields.get("total_net_pay"))

        # ── Dates ──────────────────────────────────────────────
        dates = {
            "document_date": doc_meta.get("document_date"),
            "due_date":      refs.get("due_date") or add_fields.get("due_date"),
            "payment_date":  add_fields.get("payment_date"),
            "period_start":  add_fields.get("period_start") or add_fields.get("filing_period_start"),
            "period_end":    add_fields.get("period_end")   or add_fields.get("filing_period_end"),
        }

        # ── References ─────────────────────────────────────────
        normalized_refs = {
            "invoice_number":        refs.get("invoice_number"),
            "po_number":             refs.get("purchase_order") or add_fields.get("po_number"),
            "so_number":             add_fields.get("so_number"),
            "reference_invoice":     refs.get("reference_invoice"),
            "transaction_reference": refs.get("transaction_reference"),
            "agreement_number":      add_fields.get("agreement_number"),
            "challan_number":        add_fields.get("challan_number"),
            "filing_period":         add_fields.get("filing_period"),
            "payroll_period":        add_fields.get("payroll_period"),
            "loan_reference":        add_fields.get("loan_reference"),
            "receipt_number":        add_fields.get("receipt_number"),
            "account_number":        add_fields.get("account_number"),
        }

        # ── Line items ─────────────────────────────────────────
        canonical_line_items = []
        for item in (line_items or []):
            canonical_line_items.append({
                "description": item.get("description"),
                "quantity":    self._safe_float(item.get("quantity")),
                "unit_price":  self._safe_float(item.get("unit_price")),
                "amount":      self._safe_float(item.get("amount")),
                "tax_rate":    self._safe_float(item.get("tax_rate")),
                "tax_amount":  self._safe_float(item.get("tax_amount")),
            })

        # ── Evidence ───────────────────────────────────────────
        evidence = {
            "ocr_extraction_method":  ocr_output.get("extraction_method", "unknown"),
            "document_language":      doc_meta.get("language", "en"),
            "extraction_confidence":  ocr_output.get("confidence"),
        }

        return {
            "document_metadata": {
                "document_id":     doc_meta.get("document_id"),
                "document_date":   doc_meta.get("document_date"),
                "currency":        doc_meta.get("currency", "INR"),
                "language":        doc_meta.get("language", "en"),
            },
            "parties":    normalized_parties,
            "amounts":    amounts,
            "dates":      dates,
            "references": normalized_refs,
            "line_items": canonical_line_items,
            "evidence":   evidence,
            "settlement": {},
        }

    def _build_bank_statement_fields(
        self, ocr_output: Dict, processed: Optional[Dict]
    ) -> Dict:
        """
        Build Analysis Note fields from a bank statement KPI result.
        Uses pre-processed KPI data if available; falls back to raw ocr_output.
        """
        kpis = processed or ocr_output or {}
        stmt = kpis.get("statement_summary") or {}
        txn_summary = kpis.get("transaction_summary") or {}
        validation  = kpis.get("validation")          or {}
        transactions = kpis.get("transactions")       or []

        parties = {
            "issuer": {
                "bank_name":      stmt.get("bank_name"),
                "account_holder": stmt.get("account_holder_name"),
                "account_number": stmt.get("account_number"),
                "branch":         stmt.get("branch"),
                "ifsc":           stmt.get("ifsc"),
            }
        }

        amounts = {
            "opening_balance": self._safe_float(stmt.get("opening_balance")),
            "closing_balance": self._safe_float(stmt.get("closing_balance")),
            "total_credits":   self._safe_float(txn_summary.get("credit_total") or stmt.get("total_credits")),
            "total_debits":    self._safe_float(txn_summary.get("debit_total")  or stmt.get("total_debits")),
            "net_cash_flow":   self._safe_float(txn_summary.get("net_cash_flow")),
            "currency":        stmt.get("currency", "INR"),
        }

        dates = {
            "document_date": stmt.get("statement_start_date"),
            "period_start":  stmt.get("statement_start_date"),
            "period_end":    stmt.get("statement_end_date"),
        }

        refs = {
            "account_number":  stmt.get("account_number"),
            "statement_period": (
                f"{stmt.get('statement_start_date', '')} to {stmt.get('statement_end_date', '')}"
                if stmt.get("statement_start_date") else None
            ),
        }

        # Map transactions to canonical line_item format
        canonical_txns = []
        for tx in transactions:
            canonical_txns.append({
                "transaction_date": tx.get("date"),
                "description":      tx.get("raw_particulars"),
                "reference_number": tx.get("reference_number"),
                "debit":            self._safe_float(tx.get("debit_amount")),
                "credit":           self._safe_float(tx.get("credit_amount")),
                "balance":          self._safe_float(tx.get("balance")),
                "counterparty":     tx.get("beneficiary_name"),
                "payment_mode":     tx.get("payment_mode"),
                "category":         tx.get("category"),
            })

        settlement = {
            "balance_verified":   validation.get("balance_verified"),
            "difference":         validation.get("difference"),
            "expected_closing":   validation.get("expected_closing"),
            "calculated_credits": validation.get("calculated_credits"),
            "calculated_debits":  validation.get("calculated_debits"),
        }

        evidence = {
            "total_transactions":  len(transactions),
            "payment_mode_summary": kpis.get("payment_mode_summary", []),
        }

        return {
            "document_metadata": {
                "document_date": stmt.get("statement_start_date"),
                "currency":      stmt.get("currency", "INR"),
                "language":      "en",
            },
            "parties":    parties,
            "amounts":    amounts,
            "dates":      dates,
            "references": refs,
            "line_items": canonical_txns,
            "evidence":   evidence,
            "settlement": settlement,
        }

    # ──────────────────────────────────────────────────────────────────────
    # Private: Field completeness scoring
    # ──────────────────────────────────────────────────────────────────────

    def _compute_field_completeness(self, doc_type: str, note_fields: Dict) -> float:
        """
        Deterministic. No AI. Scores 0–1 based on required fields being populated.
        """
        required = REQUIRED_FIELDS.get(doc_type, [])
        if not required:
            return 1.0  # unknown doc: completeness not assessable, don't penalise

        def _is_present(path: str) -> bool:
            """Check a dotted-path field across the note_fields structure."""
            amounts = note_fields.get("amounts", {})
            dates   = note_fields.get("dates", {})
            refs    = note_fields.get("references", {})
            parties = note_fields.get("parties", {})
            issuer  = parties.get("issuer", {}) if isinstance(parties.get("issuer"), dict) else {}
            recip   = parties.get("recipient", {}) if isinstance(parties.get("recipient"), dict) else {}

            checks = {
                "total_amount":     amounts.get("total_amount"),
                "document_date":    dates.get("document_date"),
                "issuer_name":      issuer.get("name") or issuer.get("bank_name"),
                "merchant_name":    issuer.get("name"),
                "invoice_number":   refs.get("invoice_number"),
                "reference_invoice":refs.get("reference_invoice"),
                "opening_balance":  amounts.get("opening_balance"),
                "closing_balance":  amounts.get("closing_balance"),
                "has_transactions": bool(note_fields.get("line_items")),
                "total_net_pay":    amounts.get("total_net_pay"),
                "pay_period":       dates.get("period_start"),
                "has_employees":    bool(note_fields.get("line_items")),
                "principal_amount": amounts.get("principal_amount"),
                "lender_name":      issuer.get("name"),
                "borrower_name":    recip.get("name"),
                "investment_amount":amounts.get("investment_amount"),
            }
            val = checks.get(path)
            return val is not None and str(val).strip() not in ("", "None", "null", "0", "0.0")

        populated = sum(1 for f in required if _is_present(f))
        total     = len(required)
        ratio     = populated / total

        # Score mapping
        if ratio == 1.0:   return 1.00
        if ratio >= 0.75:  return 0.85
        if ratio >= 0.50:  return 0.50
        if ratio >= 0.25:  return 0.20
        return 0.0

    # ──────────────────────────────────────────────────────────────────────
    # Private: Supersede old notes
    # ──────────────────────────────────────────────────────────────────────

    async def _supersede_existing_notes(self, document_id: str) -> None:
        """Mark all existing active notes for this document as SUPERSEDED."""
        existing = (
            supabase.table("analysis_notes")
                    .select("id")
                    .eq("document_id", document_id)
                    .eq("is_superseded", False)
                    .execute()
        )
        if existing.data:
            ids = [row["id"] for row in existing.data]
            for note_id in ids:
                supabase.table("analysis_notes").update({
                    "review_status": "SUPERSEDED",
                    "is_superseded": True,
                }).eq("id", note_id).execute()
            print(f"[AnalysisNoteService] Superseded {len(ids)} existing note(s) for doc {document_id}")

    # ──────────────────────────────────────────────────────────────────────
    # Private: Utility
    # ──────────────────────────────────────────────────────────────────────

    @staticmethod
    def _safe_float(val: Any) -> Optional[float]:
        if val is None:
            return None
        if isinstance(val, (int, float)):
            return float(val)
        try:
            return float(str(val).replace(",", "").strip())
        except (ValueError, TypeError):
            return None


# Singleton instance — injected with bank parser in queue_service.py
analysis_note_service = AnalysisNoteService()
