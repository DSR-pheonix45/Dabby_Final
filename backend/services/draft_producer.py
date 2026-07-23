"""
Draft Producer  (Phase 3 entry point — the missing "analysis note -> event" step)
=================================================================================
Classifies a UFO analysis note (di_analysis_notes) into a Trade Draft
(status=PENDING_REVIEW). A human reviews it, then the Business Event Registry
converts the approved draft into an immutable Business Event.

Deterministic classification: document_type -> event_type + which party is the
counterparty. No LLM here — the UFO already carries the classification.
"""
import re
from typing import Dict, Optional, Tuple
from supabase_client import supabase


def _clean_date(raw) -> Optional[str]:
    """Return a valid YYYY-MM-DD or None (AI often emits 'N/A', '', etc.)."""
    if isinstance(raw, str) and re.match(r"^\d{4}-\d{2}-\d{2}", raw.strip()):
        return raw.strip()[:10]
    return None


# document_type -> (event_type, counterparty_side)
# counterparty_side: 'issuer' | 'recipient' | 'either'
DOC_TYPE_MAP: Dict[str, Tuple[str, str]] = {
    "sales_invoice":         ("CUSTOMER_BILLED", "recipient"),
    "tax_invoice":           ("CUSTOMER_BILLED", "recipient"),
    "invoice":               ("CUSTOMER_BILLED", "recipient"),
    "vendor_invoice":        ("VENDOR_BILLED", "issuer"),
    "purchase_invoice":      ("VENDOR_BILLED", "issuer"),
    "bill":                  ("VENDOR_BILLED", "issuer"),
    "quotation":             ("QUOTATION_OFFERED", "recipient"),
    "quote":                 ("QUOTATION_OFFERED", "recipient"),
    "proforma_invoice":      ("PROFORMA_ESTIMATE_ISSUED", "recipient"),
    "estimate":              ("PROFORMA_ESTIMATE_ISSUED", "recipient"),
    "customer_payment":      ("CUSTOMER_PAYMENT_RECEIVED", "issuer"),
    "receipt":               ("CUSTOMER_PAYMENT_RECEIVED", "issuer"),
    "vendor_payment":        ("VENDOR_PAYMENT_MADE", "recipient"),
    "payment_advice":        ("VENDOR_PAYMENT_MADE", "recipient"),
    "bank_statement":        ("BANK_ACTIVITY_RECORDED", "either"),
    "payroll_register":      ("PAYROLL_INCURRED", "either"),
    "payroll":               ("PAYROLL_INCURRED", "either"),
    "credit_note":           ("CREDIT_NOTE_ISSUED", "recipient"),
    "debit_note":            ("DEBIT_NOTE_ISSUED", "issuer"),
    "purchase_order":        ("PURCHASE_ORDER_CREATED", "issuer"),
    "sales_order":           ("SALES_ORDER_CREATED", "recipient"),
    "expense_receipt":       ("EXPENSE_INCURRED", "issuer"),
    "opex_expense":          ("OPEX_EXPENSE_INCURRED", "issuer"),
    "cogs_expense":          ("COGS_EXPENSE_INCURRED", "issuer"),
    "petty_cash_topup":      ("PETTY_CASH_TOPUP", "issuer"),
    "loan_agreement":        ("LOAN_RECEIVED", "either"),
    "investment_agreement":  ("INVESTMENT_RECEIVED", "either"),
    "tax_document":          ("TAX_PAID", "either"),
    "gst_challan":           ("TAX_PAID", "either"),
}


def _norm(s: Optional[str]) -> str:
    return (s or "").strip().lower().replace(" ", "_").replace("-", "_")


def infer_event(doc_type: Optional[str]) -> Tuple[str, str]:
    key = _norm(doc_type)
    if key in DOC_TYPE_MAP:
        return DOC_TYPE_MAP[key]
    for k, mapping in DOC_TYPE_MAP.items():
        if k in key or (key and key in k):
            return mapping
    return ("UNCLASSIFIED", "either")


def _num(v):
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


class DraftProducer:
    async def generate_from_document(self, document_id: str, user_id: Optional[str] = None) -> Dict:
        """
        Build a PENDING_REVIEW trade_draft from a document's latest UFO note (Path B).
        Idempotent: reuses an existing pending draft for the same document.
        """
        # 1. Document + its analysis notes
        doc_res = (
            supabase.table("di_documents")
            .select("*, di_analysis_notes(*)")
            .eq("id", document_id)
            .single()
            .execute()
        )
        doc = doc_res.data
        if not doc:
            raise ValueError(f"Document {document_id} not found")
        notes = doc.get("di_analysis_notes") or []
        if not notes:
            raise ValueError("Document has no analysis note yet — run analysis first")
        note = sorted(notes, key=lambda n: n.get("created_at") or "", reverse=True)[0]

        # 2. Resolve owning user (events are user-scoped; documents are workbench-scoped)
        if not user_id:
            wb = supabase.table("workbenches").select("created_by").eq("id", doc["workbench_id"]).single().execute()
            user_id = (wb.data or {}).get("created_by")
        if not user_id:
            raise ValueError("Could not resolve owning user for document")

        # 3. Classify from the UFO
        doc_type = note.get("document_type") or note.get("classification_type") or ""
        event_type, side = infer_event(doc_type)

        parties = note.get("parties") or {}
        issuer = (parties.get("issuer") or {}).get("name")
        recipient = (parties.get("recipient") or {}).get("name")
        counterparty = {"issuer": issuer, "recipient": recipient, "either": issuer or recipient}.get(side)
        counterparty = counterparty or issuer or recipient

        money = note.get("money") or {}
        amount = _num(money.get("total_amount")) or _num(money.get("subtotal"))
        currency = money.get("currency") or "INR"

        dates = note.get("dates") or {}
        event_date = _clean_date(dates.get("document_date"))

        # 4. Idempotency — reuse an open pending draft for this document
        existing = (
            supabase.table("trade_drafts")
            .select("*")
            .eq("document_id", document_id)
            .eq("status", "PENDING_REVIEW")
            .execute()
        )
        if existing.data:
            return existing.data[0]

        draft_row = {
            "user_id":           user_id,
            "analysis_note_id":  note["id"],
            "document_id":       document_id,
            "event_type":        event_type,
            "counterparty_name": counterparty,
            "amount":            amount,
            "event_date":        event_date,
            "currency":          currency,
            "status":            "PENDING_REVIEW",
        }
        res = supabase.table("trade_drafts").insert(draft_row).execute()
        if not res.data:
            raise RuntimeError("Failed to create trade draft")

        print(f"[DraftProducer] draft {res.data[0]['id']} | {event_type} | {counterparty} | {amount} {currency}")
        return res.data[0]

    async def generate_from_payload(self, payload: Dict, user_id: str) -> Dict:
        """Create a PENDING_REVIEW trade draft directly from a Stage 0 Generator payload (Path A)."""
        doc_type = payload.get("document_type") or payload.get("type") or "sales_invoice"
        event_type, side = infer_event(doc_type)

        draft_row = {
            "user_id":           user_id,
            "document_id":       payload.get("document_id"),
            "event_type":        event_type,
            "counterparty_name": payload.get("party") or payload.get("counterparty_name") or "Direct Expense",
            "amount":            _num(payload.get("amount") or payload.get("total_amount")),
            "event_date":        _clean_date(payload.get("date") or payload.get("event_date")),
            "currency":          payload.get("currency") or "INR",
            "status":            "PENDING_REVIEW",
            "metadata":          payload.get("metadata") or {}
        }
        res = supabase.table("trade_drafts").insert(draft_row).execute()
        return res.data[0] if res.data and len(res.data) > 0 else draft_row


draft_producer = DraftProducer()

