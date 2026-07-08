"""
Settlement Engine
=================
Deterministic three-pass settlement matching for Business Events.

Principle:
  No AI. No LLM. No prompts. No ML.

  Settlement is purely structural:
    1. Exact settlement_key match       (confidence 1.0)
    2. Invoice reference match          (confidence 0.90)
    3. Amount + counterparty match      (confidence 0.75)

  Economic completion — not accounting completion.

  An invoice is "settled" when a payment receipt references it.
  The ledger treatment is handled downstream by the Accounting Compiler.

Triggered:
  - Automatically when a new Business Event is created (via BusinessEventRegistry)
  - Manually via POST /api/settlements/recalculate/{workbench_id}
"""

from typing import Dict, List, Optional, Tuple
from datetime import datetime, timezone, date
from supabase_client import supabase


# ──────────────────────────────────────────────────────────────────────────────
# Complementary event type pairs — which events settle each other
# ──────────────────────────────────────────────────────────────────────────────
SETTLEMENT_PAIRS: List[Tuple[str, str]] = [
    ("CUSTOMER_BILLED",      "CUSTOMER_PAYMENT_RECEIVED"),
    ("VENDOR_BILLED",        "VENDOR_PAYMENT_MADE"),
    ("LOAN_RECEIVED",        "LOAN_REPAID"),
    ("TAX_LIABILITY_CREATED","TAX_PAID"),
    ("PAYROLL_INCURRED",     "PAYROLL_PAID"),
    # Credit/debit notes settle against their originating invoice
    ("CUSTOMER_BILLED",      "CREDIT_NOTE_ISSUED"),
    ("VENDOR_BILLED",        "DEBIT_NOTE_ISSUED"),
]

# Build a reverse-lookup: given an event_type, what types can settle it?
SETTLES_MAP: Dict[str, List[str]] = {}
for opener, settler in SETTLEMENT_PAIRS:
    SETTLES_MAP.setdefault(opener,  []).append(settler)
    SETTLES_MAP.setdefault(settler, []).append(opener)

# Amount tolerance for Pass 3 (±1%)
AMOUNT_TOLERANCE = 0.01

# Date window for Pass 3 (90 days)
DATE_WINDOW_DAYS = 90


class SettlementEngine:
    """
    Three-pass deterministic settlement matching engine.
    """

    # ──────────────────────────────────────────────────────────────────────
    # Public: Match a single new event
    # ──────────────────────────────────────────────────────────────────────

    async def match_event(self, event_id: str) -> Dict:
        """
        Run all three settlement passes for a newly created Business Event.
        Returns a summary of what was matched.
        """
        event_res = (
            supabase.table("business_events")
                    .select("*")
                    .eq("id", event_id)
                    .single()
                    .execute()
        )
        if not event_res.data:
            raise ValueError(f"Business Event {event_id} not found")

        event = event_res.data

        if event.get("is_superseded") or event.get("event_status") in ("SUPERSEDED", "CANCELLED"):
            return {"matched": False, "reason": "Event is superseded or cancelled"}

        results = []

        # ── Pass 1: Exact settlement_key match ─────────────────
        if event.get("settlement_key"):
            match = await self._pass1_settlement_key(event)
            if match:
                results.append(match)
                return {"matched": True, "method": "settlement_key", "match": match}

        # ── Pass 2: Invoice reference match ────────────────────
        match = await self._pass2_invoice_reference(event)
        if match:
            results.append(match)
            return {"matched": True, "method": "invoice_reference", "match": match}

        # ── Pass 3: Amount + Counterparty match ────────────────
        match = await self._pass3_amount_counterparty(event)
        if match:
            results.append(match)
            return {"matched": True, "method": "amount_counterparty", "match": match}

        # ── No match found ─────────────────────────────────────
        return {"matched": False, "passes_run": 3}

    # ──────────────────────────────────────────────────────────────────────
    # Public: Recalculate all OPEN events in a workbench
    # ──────────────────────────────────────────────────────────────────────

    async def recalculate_workbench(self, workbench_id: str) -> Dict:
        """
        Re-run settlement matching for all OPEN events in a workbench.
        Safe to call multiple times — idempotent.
        """
        open_events = (
            supabase.table("business_events")
                    .select("id")
                    .eq("workbench_id", workbench_id)
                    .eq("event_status", "OPEN")
                    .eq("is_superseded", False)
                    .execute()
        )

        matched_count = 0
        unmatched_count = 0
        errors = []

        for row in (open_events.data or []):
            try:
                result = await self.match_event(row["id"])
                if result.get("matched"):
                    matched_count += 1
                else:
                    unmatched_count += 1
            except Exception as e:
                errors.append({"event_id": row["id"], "error": str(e)})

        return {
            "workbench_id":   workbench_id,
            "total_checked":  len(open_events.data or []),
            "matched":        matched_count,
            "unmatched":      unmatched_count,
            "errors":         errors,
        }

    async def get_settlements_for_event(self, event_id: str) -> List[Dict]:
        """Fetch all settlement records for a Business Event (as either side)."""
        result_a = (
            supabase.table("event_settlements")
                    .select("*, business_events!event_id_b(event_type, counterparty, amount, event_date)")
                    .eq("event_id_a", event_id)
                    .execute()
        )
        result_b = (
            supabase.table("event_settlements")
                    .select("*, business_events!event_id_a(event_type, counterparty, amount, event_date)")
                    .eq("event_id_b", event_id)
                    .execute()
        )
        return (result_a.data or []) + (result_b.data or [])

    # ──────────────────────────────────────────────────────────────────────
    # Pass 1 — Exact settlement_key match
    # ──────────────────────────────────────────────────────────────────────

    async def _pass1_settlement_key(self, event: Dict) -> Optional[Dict]:
        """
        Find OPEN events in same workbench with same settlement_key
        and a complementary event type.
        """
        complementary_types = SETTLES_MAP.get(event["event_type"], [])
        if not complementary_types:
            return None

        candidates = (
            supabase.table("business_events")
                    .select("*")
                    .eq("workbench_id", event["workbench_id"])
                    .eq("settlement_key", event["settlement_key"])
                    .in_("event_type", complementary_types)
                    .in_("event_status", ["OPEN", "PARTIALLY_SETTLED"])
                    .eq("is_superseded", False)
                    .neq("id", event["id"])
                    .execute()
        )

        for candidate in (candidates.data or []):
            match = await self._create_settlement(
                event_a=event,
                event_b=candidate,
                settlement_key=event["settlement_key"],
                method="settlement_key",
                confidence=1.0,
            )
            if match:
                return match

        return None

    # ──────────────────────────────────────────────────────────────────────
    # Pass 2 — Invoice reference match
    # ──────────────────────────────────────────────────────────────────────

    async def _pass2_invoice_reference(self, event: Dict) -> Optional[Dict]:
        """
        Check event_metadata for invoice_number and cross-match against
        other events' settlement_key or event_metadata invoice references.
        """
        metadata       = event.get("event_metadata") or {}
        amounts_meta   = metadata.get("amounts") or {}
        refs           = metadata.get("document_references") or {}

        invoice_number = refs.get("invoice_number") or refs.get("reference_invoice")
        if not invoice_number:
            return None

        complementary_types = SETTLES_MAP.get(event["event_type"], [])
        if not complementary_types:
            return None

        # Search by settlement_key containing the invoice number
        candidates = (
            supabase.table("business_events")
                    .select("*")
                    .eq("workbench_id", event["workbench_id"])
                    .in_("event_type", complementary_types)
                    .in_("event_status", ["OPEN", "PARTIALLY_SETTLED"])
                    .eq("is_superseded", False)
                    .neq("id", event["id"])
                    .execute()
        )

        for candidate in (candidates.data or []):
            # Check if candidate's settlement_key contains our invoice_number
            cand_key = candidate.get("settlement_key") or ""
            if invoice_number.lower() in cand_key.lower() or cand_key.lower() in invoice_number.lower():
                match = await self._create_settlement(
                    event_a=event,
                    event_b=candidate,
                    settlement_key=invoice_number,
                    method="invoice_reference",
                    confidence=0.90,
                )
                if match:
                    return match

        return None

    # ──────────────────────────────────────────────────────────────────────
    # Pass 3 — Amount + Counterparty match
    # ──────────────────────────────────────────────────────────────────────

    async def _pass3_amount_counterparty(self, event: Dict) -> Optional[Dict]:
        """
        Match by same counterparty + same amount (±1%) + within 90 days
        + complementary event type.
        """
        if not event.get("counterparty") or event.get("amount") is None:
            return None

        amount     = float(event["amount"])
        lower_amt  = amount * (1 - AMOUNT_TOLERANCE)
        upper_amt  = amount * (1 + AMOUNT_TOLERANCE)

        complementary_types = SETTLES_MAP.get(event["event_type"], [])
        if not complementary_types:
            return None

        candidates = (
            supabase.table("business_events")
                    .select("*")
                    .eq("workbench_id", event["workbench_id"])
                    .eq("counterparty", event["counterparty"])
                    .in_("event_type", complementary_types)
                    .in_("event_status", ["OPEN", "PARTIALLY_SETTLED"])
                    .eq("is_superseded", False)
                    .neq("id", event["id"])
                    .gte("amount", lower_amt)
                    .lte("amount", upper_amt)
                    .execute()
        )

        event_date = self._parse_date(event.get("event_date"))

        for candidate in (candidates.data or []):
            # Date window check
            cand_date = self._parse_date(candidate.get("event_date"))
            if event_date and cand_date:
                diff_days = abs((event_date - cand_date).days)
                if diff_days > DATE_WINDOW_DAYS:
                    continue

            match = await self._create_settlement(
                event_a=event,
                event_b=candidate,
                settlement_key=None,
                method="amount_counterparty",
                confidence=0.75,
            )
            if match:
                return match

        return None

    # ──────────────────────────────────────────────────────────────────────
    # Private: Create settlement record
    # ──────────────────────────────────────────────────────────────────────

    async def _create_settlement(
        self,
        event_a: Dict,
        event_b: Dict,
        settlement_key: Optional[str],
        method: str,
        confidence: float,
    ) -> Optional[Dict]:
        """
        Create an event_settlements record and update both events' statuses.
        Idempotent — checks for existing pair before inserting.
        """
        # Determine which is "opener" (invoice/loan) vs "settler" (payment/repayment)
        opener_types  = {pair[0] for pair in SETTLEMENT_PAIRS}
        settler_types = {pair[1] for pair in SETTLEMENT_PAIRS}

        if event_a["event_type"] in opener_types:
            opener, settler = event_a, event_b
        elif event_b["event_type"] in opener_types:
            opener, settler = event_b, event_a
        else:
            opener, settler = event_a, event_b  # both could be openers — use event_a

        original_amount  = float(opener.get("amount") or 0.0)
        settled_amount   = float(settler.get("amount") or 0.0)
        amount_matched   = min(original_amount, settled_amount)

        # Determine settlement completeness
        if original_amount > 0 and settled_amount >= original_amount * 0.99:
            settlement_status = "SETTLED"
        elif amount_matched > 0:
            settlement_status = "PARTIALLY_SETTLED"
        else:
            settlement_status = "OPEN"

        # Idempotency: check existing pair
        existing = (
            supabase.table("event_settlements")
                    .select("id")
                    .eq("event_id_a", opener["id"])
                    .eq("event_id_b", settler["id"])
                    .execute()
        )
        if existing.data:
            print(f"[SettlementEngine] Settlement pair already exists: {opener['id']} ↔ {settler['id']}")
            return existing.data[0]

        # Insert settlement record
        settlement_row = {
            "workbench_id":      opener["workbench_id"],
            "event_id_a":        opener["id"],
            "event_id_b":        settler["id"],
            "settlement_key":    settlement_key,
            "match_method":      method,
            "match_confidence":  confidence,
            "original_amount":   original_amount,
            "amount_matched":    amount_matched,
            "settlement_status": settlement_status,
            "settled_at":        datetime.now(timezone.utc).isoformat() if settlement_status == "SETTLED" else None,
        }

        result = supabase.table("event_settlements").insert(settlement_row).execute()
        if not result.data:
            return None

        settlement = result.data[0]

        # Update opener event status
        supabase.table("business_events").update({
            "event_status": settlement_status
        }).eq("id", opener["id"]).execute()

        # Update settler event status
        supabase.table("business_events").update({
            "event_status": settlement_status
        }).eq("id", settler["id"]).execute()

        print(
            f"[SettlementEngine] Matched {opener['id']} ({opener['event_type']}) ↔ "
            f"{settler['id']} ({settler['event_type']}) | "
            f"method={method} | confidence={confidence} | status={settlement_status}"
        )

        return settlement

    # ──────────────────────────────────────────────────────────────────────
    # Private: Utilities
    # ──────────────────────────────────────────────────────────────────────

    @staticmethod
    def _parse_date(date_str: Optional[str]) -> Optional[date]:
        if not date_str:
            return None
        try:
            return datetime.strptime(str(date_str)[:10], "%Y-%m-%d").date()
        except (ValueError, TypeError):
            return None


settlement_engine = SettlementEngine()
