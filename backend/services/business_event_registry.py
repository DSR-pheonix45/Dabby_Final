"""
Business Event Registry
=======================
Converts approved Trade Drafts into immutable Business Events.

Core principle:
  Business Events are the verified, immutable record of financial reality.
  They are NEVER updated in place.
  Re-processing creates a new event; the old is marked SUPERSEDED.

Flow:
  Trade Draft (APPROVED)
      ↓
  Apply reviewer overrides (if any)
      ↓
  Insert business_events (status = OPEN)
      ↓
  Update trade_draft.business_event_id
      ↓
  Trigger settlement matching engine
"""

from typing import Dict, Optional
from datetime import datetime, timezone
from supabase_client import supabase


VALID_EVENT_TYPES = {
    "CUSTOMER_BILLED",
    "CUSTOMER_PAYMENT_RECEIVED",
    "VENDOR_BILLED",
    "VENDOR_PAYMENT_MADE",
    "PAYROLL_INCURRED",
    "PAYROLL_PAID",
    "LOAN_RECEIVED",
    "LOAN_REPAID",
    "INVESTMENT_RECEIVED",
    "TAX_LIABILITY_CREATED",
    "TAX_PAID",
    "PURCHASE_ORDER_CREATED",
    "SALES_ORDER_CREATED",
    "CREDIT_NOTE_ISSUED",
    "DEBIT_NOTE_ISSUED",
    "BANK_ACTIVITY_RECORDED",
    "EXPENSE_INCURRED",
    "UNCLASSIFIED",
}


class BusinessEventRegistry:
    """
    Creates and manages immutable Business Events.
    """

    def __init__(self, settlement_engine=None):
        self._settlement_engine = settlement_engine

    def inject_settlement_engine(self, engine) -> None:
        self._settlement_engine = engine

    # ──────────────────────────────────────────────────────────────────────
    # Public: Create from Trade Draft
    # ──────────────────────────────────────────────────────────────────────

    async def create_from_trade_draft(
        self,
        trade_draft_id: str,
        reviewed_by: Optional[str] = None,
    ) -> Dict:
        """
        Convert an APPROVED Trade Draft into an immutable Business Event.

        Steps:
          1. Fetch Trade Draft (must be PENDING_REVIEW — approval happens here)
          2. Apply reviewer overrides
          3. Supersede existing events for same document
          4. Insert Business Event
          5. Update trade_draft with business_event_id + mark APPROVED
          6. Trigger settlement engine
        """
        # ── 1. Fetch draft ─────────────────────────────────────
        draft_res = (
            supabase.table("trade_drafts")
                    .select("*")
                    .eq("id", trade_draft_id)
                    .single()
                    .execute()
        )
        if not draft_res.data:
            raise ValueError(f"Trade Draft {trade_draft_id} not found")

        draft = draft_res.data
        if draft["status"] not in ("PENDING_REVIEW",):
            raise ValueError(
                f"Trade Draft {trade_draft_id} has status '{draft['status']}'. "
                "Only PENDING_REVIEW drafts can be approved."
            )

        # ── 2. Apply reviewer overrides ────────────────────────
        event_type       = draft.get("override_event_type")     or draft["event_type"]
        counterparty     = draft.get("override_counterparty")   or draft.get("counterparty_name")
        amount           = draft.get("override_amount")         or draft.get("amount")
        event_date_raw   = draft.get("override_event_date")     or draft.get("event_date")
        settlement_key   = draft.get("override_settlement_key") or draft.get("settlement_key")

        # Validate event_type
        if event_type not in VALID_EVENT_TYPES:
            raise ValueError(f"Invalid event_type '{event_type}'")

        # Parse event_date
        event_date = None
        if event_date_raw:
            try:
                if isinstance(event_date_raw, str):
                    event_date = event_date_raw[:10]  # ISO date
                else:
                    event_date = str(event_date_raw)
            except Exception:
                pass

        # ── 3. Fetch metadata from Analysis Note ───────────────
        # event_metadata embeds line items for the Business Event
        event_metadata = await self._build_event_metadata(draft)

        # ── 4. Supersede existing open events for this document ─
        await self._supersede_existing_events(
            document_id=draft.get("document_id"),
            user_id=draft["user_id"],
        )

        # ── 5. Insert Business Event ───────────────────────────
        event_row = {
            "user_id":      draft["user_id"],
            "analysis_note_id":  draft["analysis_note_id"],
            "trade_draft_id":    trade_draft_id,
            "document_id":       draft.get("document_id"),
            "event_type":        event_type,
            "event_date":        event_date,
            "counterparty":      counterparty,
            "amount":            float(amount) if amount is not None else None,
            "currency":          draft.get("currency", "INR"),
            "settlement_key":    settlement_key,
            "event_status":      "OPEN",
            "event_metadata":    event_metadata,
            "is_superseded":     False,
            "legacy_trade_id":   draft.get("legacy_trade_id_for_comparison"),
        }

        event_result = supabase.table("business_events").insert(event_row).execute()
        if not event_result.data:
            raise RuntimeError(
                f"[BusinessEventRegistry] DB insert failed for draft {trade_draft_id}"
            )

        event    = event_result.data[0]
        event_id = event["id"]

        # ── 6. Mark Trade Draft as APPROVED ───────────────────
        approve_payload = {
            "status":           "APPROVED",
            "business_event_id": event_id,
            "reviewed_at":      datetime.now(timezone.utc).isoformat(),
        }
        if reviewed_by:
            approve_payload["reviewed_by"] = reviewed_by

        supabase.table("trade_drafts").update(approve_payload).eq("id", trade_draft_id).execute()

        print(
            f"[BusinessEventRegistry] Event {event_id} created | "
            f"type={event_type} | counterparty={counterparty} | "
            f"amount={amount} | settlement_key={settlement_key}"
        )

        # ── 7. Trigger settlement matching ─────────────────────
        if self._settlement_engine:
            try:
                await self._settlement_engine.match_event(event_id)
            except Exception as se:
                print(f"[BusinessEventRegistry WARNING] Settlement engine failed for {event_id}: {se}")
                # Non-fatal — event is stored; settlement runs on next recalculate

        return event

    # ──────────────────────────────────────────────────────────────────────
    # Public: Fetch / list
    # ──────────────────────────────────────────────────────────────────────

    async def get_event(self, event_id: str) -> Optional[Dict]:
        """Fetch a Business Event with its Trade Draft and Analysis Note summary."""
        result = (
            supabase.table("business_events")
                    .select("*, trade_drafts(status, reviewer_notes), di_analysis_notes(document_type, classification_type, confidence)")
                    .eq("id", event_id)
                    .single()
                    .execute()
        )
        return result.data if result.data else None

    async def list_for_workbench(
        self,
        user_id: str,
        event_status: Optional[str] = None,
        event_type: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> list:
        q = (
            supabase.table("business_events")
                    .select("*")
                    .eq("user_id", user_id)
                    .eq("is_superseded", False)
                    .order("event_date", desc=True, nullsfirst=False)
                    .limit(limit)
                    .offset(offset)
        )
        if event_status: q = q.eq("event_status", event_status)
        if event_type:   q = q.eq("event_type",   event_type)
        result = q.execute()
        return result.data or []

    async def cancel_event(self, event_id: str, reason: Optional[str] = None) -> Dict:
        """
        Cancel a Business Event.
        Creates a superseding CANCELLED record — never updates in place.
        """
        original_res = (
            supabase.table("business_events")
                    .select("*")
                    .eq("id", event_id)
                    .single()
                    .execute()
        )
        if not original_res.data:
            raise ValueError(f"Business Event {event_id} not found")

        original = original_res.data

        # Supersede original
        supabase.table("business_events").update({
            "is_superseded": True,
            "event_status":  "SUPERSEDED",
        }).eq("id", event_id).execute()

        # Insert cancellation record
        cancel_row = {**original}
        cancel_row.pop("id", None)
        cancel_row["event_status"]  = "CANCELLED"
        cancel_row["is_superseded"] = False
        cancel_row["superseded_by"] = None
        cancel_row["event_metadata"] = {
            **(original.get("event_metadata") or {}),
            "cancellation_reason": reason or "Manual cancellation",
            "original_event_id":   event_id,
        }

        result = supabase.table("business_events").insert(cancel_row).execute()
        new_event = result.data[0] if result.data else {}

        # Update original's superseded_by
        if new_event:
            supabase.table("business_events").update({
                "superseded_by": new_event["id"]
            }).eq("id", event_id).execute()

        return new_event

    # ──────────────────────────────────────────────────────────────────────
    # Private: Build event_metadata from Analysis Note
    # ──────────────────────────────────────────────────────────────────────

    async def _build_event_metadata(self, draft: Dict) -> Dict:
        """
        Embed relevant Analysis Note data into event_metadata.
        One event per document — all detail embedded here.
        """
        # The UFO analysis lives in di_analysis_notes with these columns:
        # document_type, classification_type, parties, money, taxes, dates, line_items.
        note_res = (
            supabase.table("di_analysis_notes")
                    .select("document_type, classification_type, parties, money, taxes, dates, line_items")
                    .eq("id", draft["analysis_note_id"])
                    .single()
                    .execute()
        )
        if not note_res.data:
            return {}

        note = note_res.data
        doc_type = (note.get("document_type") or note.get("classification_type") or "").lower()

        metadata = {
            "document_type": doc_type,
            "parties":       note.get("parties", {}),
            "money":         note.get("money", {}),
            "taxes":         note.get("taxes", {}),
            "dates":         note.get("dates", {}),
        }

        # Embed line items (invoices, receipts, orders, bank rows)
        line_items = note.get("line_items") or []
        if line_items:
            metadata["line_items"] = line_items

        # One event per payroll run — line items carry per-employee data
        if "payroll" in doc_type:
            metadata["payroll_employees"] = line_items
            metadata["payroll_summary"]   = note.get("money", {})

        # One event per bank statement — transactions embedded (capped)
        if "bank" in doc_type:
            metadata["transactions"]      = line_items[:200]
            metadata["transaction_count"] = len(line_items)

        return metadata

    # ──────────────────────────────────────────────────────────────────────
    # Private: Supersede existing events
    # ──────────────────────────────────────────────────────────────────────

    async def _supersede_existing_events(
        self, document_id: Optional[str], user_id: str
    ) -> None:
        """Mark existing non-superseded events for this document as SUPERSEDED."""
        if not document_id:
            return
        existing = (
            supabase.table("business_events")
                    .select("id")
                    .eq("document_id", document_id)
                    .eq("user_id", user_id)
                    .eq("is_superseded", False)
                    .neq("event_status", "CANCELLED")
                    .execute()
        )
        if existing.data:
            for row in existing.data:
                supabase.table("business_events").update({
                    "is_superseded": True,
                    "event_status":  "SUPERSEDED",
                }).eq("id", row["id"]).execute()
            print(
                f"[BusinessEventRegistry] Superseded {len(existing.data)} "
                f"existing event(s) for document {document_id}"
            )


from services.settlement_engine import settlement_engine
business_event_registry = BusinessEventRegistry(settlement_engine=settlement_engine)
