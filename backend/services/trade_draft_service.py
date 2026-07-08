"""
Trade Draft Service
===================
Generates reviewable Trade Drafts from Analysis Notes.

Core principle:
  Trade Drafts are proposed business actions.
  They derive ALL data from the Analysis Note.
  They NEVER read from:
    - metadata.extracted_invoice
    - metadata.bank_statement
    - ocr_raw_output
    - raw_text

  The Analysis Note is the sole source of truth.

Lifecycle:
  Analysis Note (APPROVED or DRAFT with overall >= 0.85)
      ↓
  Trade Draft (PENDING_REVIEW)
      ↓
  Human Review → APPROVED / REJECTED
      ↓ (on APPROVED)
  Business Event (created by business_event_registry.py)
"""

from typing import Dict, Optional
from datetime import datetime, timezone
from supabase_client import supabase


# ──────────────────────────────────────────────────────────────────────────────
# Deterministic resolution maps
# ──────────────────────────────────────────────────────────────────────────────

# Which party field is the counterparty for each event type
COUNTERPARTY_FIELD_MAP: Dict[str, str] = {
    # We billed the customer → counterparty is the recipient
    "CUSTOMER_BILLED":          "recipient",
    "REVENUE_REVERSED":         "recipient",
    "PURCHASE_ORDER_CREATED":   "recipient",     # we ordered from a supplier
    "SALES_ORDER_CREATED":      "recipient",     # customer placed order with us

    # Vendor billed us → counterparty is the issuer (vendor)
    "VENDOR_BILLED":            "issuer",
    "VENDOR_PAYMENT_MADE":      "issuer",
    "VENDOR_ADJUSTMENT_ISSUED": "issuer",
    "EXPENSE_INCURRED":         "issuer",        # merchant is the issuer
    "LOAN_RECEIVED":            "issuer",        # lender is the issuer
    "INVESTMENT_RECEIVED":      "issuer",        # investor is the issuer

    # Customer paid us → counterparty is the recipient (who received)
    "CUSTOMER_PAYMENT_RECEIVED": "recipient",

    # Special-cased below
    "PAYROLL_INCURRED":         "_payroll",
    "BANK_ACTIVITY_RECORDED":   "_bank",
    "TAX_LIABILITY_CREATED":    "_tax",
    "TAX_PAID":                 "_tax",
    "PAYROLL_PAID":             "_payroll",
    "LOAN_REPAID":              "issuer",
    "CREDIT_NOTE_ISSUED":       "recipient",
    "DEBIT_NOTE_ISSUED":        "issuer",
    "UNCLASSIFIED":             "_unknown",
}

# Which amount field to use for each event type
AMOUNT_FIELD_MAP: Dict[str, str] = {
    "CUSTOMER_BILLED":           "total_amount",
    "VENDOR_BILLED":             "total_amount",
    "CUSTOMER_PAYMENT_RECEIVED": "total_amount",
    "VENDOR_PAYMENT_MADE":       "total_amount",
    "EXPENSE_INCURRED":          "total_amount",
    "CREDIT_NOTE_ISSUED":        "total_amount",
    "DEBIT_NOTE_ISSUED":         "total_amount",
    "REVENUE_REVERSED":          "total_amount",
    "VENDOR_ADJUSTMENT_ISSUED":  "total_amount",
    "PURCHASE_ORDER_CREATED":    "total_amount",
    "SALES_ORDER_CREATED":       "total_amount",
    "BANK_ACTIVITY_RECORDED":    "net_cash_flow",
    "PAYROLL_INCURRED":          "total_net_pay",
    "PAYROLL_PAID":              "total_net_pay",
    "LOAN_RECEIVED":             "principal_amount",
    "LOAN_REPAID":               "total_amount",
    "INVESTMENT_RECEIVED":       "investment_amount",
    "TAX_LIABILITY_CREATED":     "total_amount",
    "TAX_PAID":                  "total_amount",
    "UNCLASSIFIED":              "total_amount",
}

GENERATOR_VERSION = "1.0"


class TradeDraftService:
    """
    Reads from analysis_notes. Produces trade_drafts.
    Never reads from OCR metadata or raw extraction fields.
    """

    # ──────────────────────────────────────────────────────────────────────
    # Public API
    # ──────────────────────────────────────────────────────────────────────

    async def create_draft_from_analysis_note(
        self,
        analysis_note_id: str,
        pipeline_version: str = "v2",
    ) -> Dict:
        """
        Generate a Trade Draft from an Analysis Note.

        Returns the stored trade_draft record.
        Raises ValueError if the note is not eligible (unknown type, superseded).
        """
        # ── 1. Fetch Analysis Note ─────────────────────────────
        note_res = (
            supabase.table("analysis_notes")
                    .select("*")
                    .eq("id", analysis_note_id)
                    .single()
                    .execute()
        )
        if not note_res.data:
            raise ValueError(f"Analysis Note {analysis_note_id} not found")

        note = note_res.data

        if note.get("is_superseded"):
            raise ValueError(
                f"Analysis Note {analysis_note_id} is superseded. "
                "Use the latest note for this document."
            )

        event_candidate = note.get("event_candidate") or {}
        event_type      = event_candidate.get("event_type", "UNCLASSIFIED")

        if event_type == "UNCLASSIFIED":
            raise ValueError(
                f"Analysis Note {analysis_note_id} has event_type=UNCLASSIFIED. "
                "Document must be reviewed and classified before a Trade Draft can be generated."
            )

        # ── 2. Resolve counterparty ────────────────────────────
        counterparty_name = self._resolve_counterparty(event_type, note)

        # ── 3. Resolve amount ──────────────────────────────────
        amount   = self._resolve_amount(event_type, note)
        currency = (note.get("amounts") or {}).get("currency", "INR")

        # ── 4. Resolve event date ──────────────────────────────
        dates      = note.get("dates") or {}
        event_date = dates.get("document_date") or dates.get("period_start")

        # ── 5. Settlement key ──────────────────────────────────
        settlement_key = note.get("settlement_key")

        # ── 6. Reviewer notes for low-confidence notes ─────────
        confidence     = note.get("confidence") or {}
        overall        = float(confidence.get("overall", 0.0)) if isinstance(confidence, dict) else 0.0
        reviewer_notes = None
        if overall < 0.85:
            reviewer_notes = (
                f"Low confidence note (overall={overall:.2f}). "
                f"OCR quality={confidence.get('ocr_quality', 0):.2f}, "
                f"classification={confidence.get('classification', 0):.2f}, "
                f"field completeness={confidence.get('field_completeness', 0):.2f}. "
                "Please verify all fields before approving."
            )

        # ── 7. Supersede any existing pending draft ────────────
        await self._supersede_existing_drafts(analysis_note_id)

        # ── 8. Persist Trade Draft ─────────────────────────────
        draft_row = {
            "workbench_id":      note["workbench_id"],
            "analysis_note_id":  analysis_note_id,
            "document_id":       note.get("document_id"),
            "event_type":        event_type,
            "counterparty_name": counterparty_name,
            "amount":            amount,
            "currency":          currency,
            "event_date":        event_date,
            "settlement_key":    settlement_key,
            "status":            "PENDING_REVIEW",
            "reviewer_notes":    reviewer_notes,
            "pipeline_version":  pipeline_version,
            "generator_version": GENERATOR_VERSION,
        }

        result = supabase.table("trade_drafts").insert(draft_row).execute()
        if not result.data:
            raise RuntimeError(
                f"[TradeDraftService] DB insert failed for analysis_note {analysis_note_id}"
            )

        draft = result.data[0]
        print(
            f"[TradeDraftService] Draft {draft['id']} created | "
            f"event={event_type} | counterparty={counterparty_name} | "
            f"amount={amount} {currency} | settlement_key={settlement_key}"
        )
        return draft

    async def get_draft(self, draft_id: str) -> Optional[Dict]:
        """Fetch a Trade Draft with its embedded Analysis Note summary."""
        draft_res = (
            supabase.table("trade_drafts")
                    .select("*, analysis_notes(document_type, confidence, document_metadata, parties, amounts, dates, event_candidate, settlement_key, business_context)")
                    .eq("id", draft_id)
                    .single()
                    .execute()
        )
        return draft_res.data if draft_res.data else None

    async def list_for_workbench(
        self,
        workbench_id: str,
        status: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> list:
        """List Trade Drafts for a workbench."""
        q = (
            supabase.table("trade_drafts")
                    .select("*, analysis_notes(document_type, confidence, event_candidate, settlement_key)")
                    .eq("workbench_id", workbench_id)
                    .order("created_at", desc=True)
                    .limit(limit)
                    .offset(offset)
        )
        if status:
            q = q.eq("status", status)
        result = q.execute()
        return result.data or []

    async def update_override_fields(self, draft_id: str, overrides: Dict) -> Dict:
        """
        Update reviewer override fields on a Trade Draft.

        Editable fields: override_counterparty, override_amount,
        override_event_date, override_settlement_key, override_event_type,
        reviewer_notes.

        The analysis_note_id is immutable and cannot be changed.
        """
        allowed = {
            "override_counterparty",
            "override_amount",
            "override_event_date",
            "override_settlement_key",
            "override_event_type",
            "reviewer_notes",
        }
        payload = {k: v for k, v in overrides.items() if k in allowed}
        if not payload:
            raise ValueError("No valid override fields provided")

        result = (
            supabase.table("trade_drafts")
                    .update(payload)
                    .eq("id", draft_id)
                    .execute()
        )
        return result.data[0] if result.data else {}

    async def reject_draft(
        self, draft_id: str, reviewed_by: Optional[str] = None, reason: Optional[str] = None
    ) -> Dict:
        """Reject a Trade Draft."""
        payload = {
            "status":      "REJECTED",
            "reviewed_at": datetime.now(timezone.utc).isoformat(),
        }
        if reviewed_by: payload["reviewed_by"]   = reviewed_by
        if reason:      payload["reviewer_notes"] = reason

        result = (
            supabase.table("trade_drafts")
                    .update(payload)
                    .eq("id", draft_id)
                    .execute()
        )
        return result.data[0] if result.data else {}

    async def set_legacy_comparison_trade(self, draft_id: str, trade_id: str) -> None:
        """Store the legacy Trade Engine output for parallel-run comparison."""
        supabase.table("trade_drafts").update({
            "legacy_trade_id_for_comparison": trade_id
        }).eq("id", draft_id).execute()

    # ──────────────────────────────────────────────────────────────────────
    # Private: Counterparty resolution
    # ──────────────────────────────────────────────────────────────────────

    def _resolve_counterparty(self, event_type: str, note: Dict) -> Optional[str]:
        """
        Deterministic counterparty resolution from Analysis Note parties.
        Never reads from OCR metadata or raw extraction.
        """
        parties = note.get("parties") or {}

        field = COUNTERPARTY_FIELD_MAP.get(event_type, "_unknown")

        if field == "_payroll":
            return "Payroll"
        if field == "_tax":
            return "Tax Authority"
        if field == "_bank":
            issuer = parties.get("issuer") or {}
            return (
                issuer.get("bank_name") or
                issuer.get("name") or
                "Bank"
            )
        if field == "_unknown":
            return "Unknown Counterparty"

        party_data = parties.get(field) or {}
        return (
            party_data.get("name") or
            party_data.get("bank_name") or
            party_data.get("account_holder") or
            "Unknown Counterparty"
        )

    # ──────────────────────────────────────────────────────────────────────
    # Private: Amount resolution
    # ──────────────────────────────────────────────────────────────────────

    def _resolve_amount(self, event_type: str, note: Dict) -> Optional[float]:
        """
        Deterministic amount resolution from Analysis Note amounts.
        Uses AMOUNT_FIELD_MAP to determine which field to read.
        """
        amounts    = note.get("amounts") or {}
        field_name = AMOUNT_FIELD_MAP.get(event_type, "total_amount")
        val        = amounts.get(field_name)

        if val is not None:
            try:
                return float(val)
            except (TypeError, ValueError):
                pass

        # Fallback chain: try other amount fields
        for fallback in ("total_amount", "net_cash_flow", "total_net_pay", "principal_amount"):
            val = amounts.get(fallback)
            if val is not None:
                try:
                    return float(val)
                except (TypeError, ValueError):
                    continue

        return None

    # ──────────────────────────────────────────────────────────────────────
    # Private: Supersede existing drafts
    # ──────────────────────────────────────────────────────────────────────

    async def _supersede_existing_drafts(self, analysis_note_id: str) -> None:
        """Mark any existing non-terminal drafts for this note as SUPERSEDED."""
        existing = (
            supabase.table("trade_drafts")
                    .select("id")
                    .eq("analysis_note_id", analysis_note_id)
                    .in_("status", ["PENDING_REVIEW"])
                    .execute()
        )
        if existing.data:
            for row in existing.data:
                supabase.table("trade_drafts").update({
                    "status": "SUPERSEDED"
                }).eq("id", row["id"]).execute()
            print(
                f"[TradeDraftService] Superseded {len(existing.data)} "
                f"existing draft(s) for note {analysis_note_id}"
            )


trade_draft_service = TradeDraftService()
