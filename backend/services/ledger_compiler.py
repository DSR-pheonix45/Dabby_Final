"""
V2 Accounting Compiler (Phase 4 + 5)
====================================
Turns an immutable Business Event into balanced double-entry postings in the
Universal Ledger (di_ledger_transactions / di_ledger_entries), against the
workbench Chart of Accounts (di_accounts).

Deterministic. No AI. Design goals:
  • GST-aware 3-leg splits for billing events
  • Account roles resolved to real di_accounts, auto-provisioned from
    di_template_accounts when the workbench hasn't seeded them yet
  • Never crash on a rounding imbalance — route the difference to Suspense
  • Idempotent — one ledger transaction per Business Event
"""
from decimal import Decimal, ROUND_HALF_UP
from datetime import datetime, timezone
from typing import Dict, List, Optional, Tuple
from supabase_client import supabase


def q2(v) -> float:
    try:
        return float(Decimal(str(v or 0)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))
    except Exception:
        return 0.0


# ── Role → preferred di_template_accounts codes (first found / provisioned) ──
ROLE_CODES: Dict[str, List[str]] = {
    "bank":                 ["1100", "1000"],   # Bank Accounts, else Cash
    "cash":                 ["1000"],
    "accounts_receivable":  ["1200"],
    "accounts_payable":     ["2000"],
    "revenue":              ["4000", "4100"],
    "expense":              ["5999", "5000"],    # Misc Expenses / COGS
    "input_tax_credit":     ["1600"],
    "tax_payable":          ["2200"],
    "salary_expense":       ["5200"],
    "salary_payable":       ["2300"],
    "loans":                ["2400"],
    "capital":              ["3000"],
    "inventory":            ["1300"],
    "suspense":             ["5999"],            # Miscellaneous Expenses
}

# Events that never post to the ledger (operational only)
NON_POSTING = {
    "PURCHASE_ORDER_CREATED", "SALES_ORDER_CREATED", 
    "BANK_ACTIVITY_RECORDED", "UNCLASSIFIED",
    "LOAN_RECEIVED", "LOAN_REPAID", "INVESTMENT_RECEIVED", 
    "PAYROLL_INCURRED", "PAYROLL_PAID"
}


def build_postings(event_type: str, total: float, tax: float, net: float, is_manual: bool = False) -> List[Tuple[str, str, float]]:
    """Return [(role, 'debit'|'credit', amount)] for an event type (GST-aware)."""
    t, x = q2(total), q2(tax)
    n = q2(net) if net else q2(t - x)
    
    asset_role = "cash" if is_manual else "bank"

    if event_type == "CUSTOMER_BILLED":
        if x > 0:
            return [("accounts_receivable", "debit", t), ("revenue", "credit", n), ("tax_payable", "credit", x)]
        return [("accounts_receivable", "debit", t), ("revenue", "credit", t)]

    if event_type == "VENDOR_BILLED":
        if x > 0:
            return [("expense", "debit", n), ("input_tax_credit", "debit", x), ("accounts_payable", "credit", t)]
        return [("expense", "debit", t), ("accounts_payable", "credit", t)]

    if event_type == "CUSTOMER_PAYMENT_RECEIVED":
        return [(asset_role, "debit", t), ("accounts_receivable", "credit", t)]
    if event_type == "VENDOR_PAYMENT_MADE":
        return [("accounts_payable", "debit", t), (asset_role, "credit", t)]
    if event_type == "PAYROLL_INCURRED":
        return [("salary_expense", "debit", t), ("salary_payable", "credit", t)]
    if event_type == "PAYROLL_PAID":
        return [("salary_payable", "debit", t), (asset_role, "credit", t)]
    if event_type == "LOAN_RECEIVED":
        return [(asset_role, "debit", t), ("loans", "credit", t)]
    if event_type == "LOAN_REPAID":
        return [("loans", "debit", t), (asset_role, "credit", t)]
    if event_type == "INVESTMENT_RECEIVED":
        return [(asset_role, "debit", t), ("capital", "credit", t)]
    if event_type == "TAX_PAID":
        return [("tax_payable", "debit", t), (asset_role, "credit", t)]
    if event_type == "TAX_LIABILITY_CREATED":
        return [("expense", "debit", t), ("tax_payable", "credit", t)]
    if event_type == "EXPENSE_INCURRED":
        return [("expense", "debit", t), (asset_role, "credit", t)]
    if event_type == "CREDIT_NOTE_ISSUED":
        return [("revenue", "debit", t), ("accounts_receivable", "credit", t)]
    if event_type == "DEBIT_NOTE_ISSUED":
        return [("expense", "debit", t), ("accounts_payable", "credit", t)]
    return []


class LedgerCompiler:
    # ── account resolution (with auto-provision from templates) ──────────────
    def _resolve_account(self, workbench_id: str, role: str) -> Optional[str]:
        codes = ROLE_CODES.get(role, [])
        # 1. Existing workbench account by well-known code
        for code in codes:
            r = supabase.table("di_accounts").select("id").eq("workbench_id", workbench_id).eq("code", code).limit(1).execute()
            if r.data:
                return r.data[0]["id"]
        # 2. Auto-provision from di_template_accounts
        for code in codes:
            t = supabase.table("di_template_accounts").select("*").eq("code", code).limit(1).execute()
            if t.data:
                tpl = t.data[0]
                ins = supabase.table("di_accounts").insert({
                    "workbench_id": workbench_id,
                    "template_account_code": tpl["code"],
                    "code": tpl["code"],
                    "name": tpl["name"],
                    "category_code": tpl["category_code"],
                    "normal_balance": tpl["normal_balance"],
                    "is_postable": True,
                    "is_system": True,
                }).execute()
                if ins.data:
                    print(f"[LedgerCompiler] auto-provisioned account {tpl['code']} {tpl['name']} for wb {workbench_id}")
                    return ins.data[0]["id"]
        return None

    # ── public: compile a business event to the ledger ───────────────────────
    def compile_event(self, business_event_id: str, executed_by: Optional[str] = None) -> Dict:
        ev = supabase.table("business_events").select("*").eq("id", business_event_id).single().execute().data
        if not ev:
            raise ValueError(f"Business Event {business_event_id} not found")

        # Idempotency — already compiled?
        existing = supabase.table("di_ledger_transactions").select("id").eq("business_event_id", business_event_id).execute()
        if existing.data:
            return {"status": "already_compiled", "transaction_id": existing.data[0]["id"]}

        event_type = ev["event_type"]
        if event_type in NON_POSTING:
            return {"status": "no_entry", "reason": f"{event_type} does not post to the ledger"}

        total = ev.get("amount")
        if total is None or q2(total) <= 0:
            return {"status": "skipped", "reason": "event has no amount to post"}

        meta = ev.get("event_metadata") or {}
        tax = q2((meta.get("taxes") or {}).get("total_tax"))
        net = q2((meta.get("money") or {}).get("subtotal"))
        is_manual = meta.get("is_manual_settlement", False)

        # Resolve workbench (events are user-scoped; ledger is workbench-scoped)
        workbench_id = self._resolve_workbench(ev)
        if not workbench_id:
            raise ValueError("Could not resolve workbench for this event (no document linkage)")

        legs = build_postings(event_type, q2(total), tax, net, is_manual=is_manual)
        if not legs:
            return {"status": "no_entry", "reason": f"no posting rule for {event_type}"}

        # Resolve roles → accounts
        resolved: List[Dict] = []
        for role, direction, amount in legs:
            if q2(amount) <= 0:
                continue
            acct_id = self._resolve_account(workbench_id, role)
            if not acct_id:
                raise ValueError(f"Could not resolve/provision account for role '{role}'")
            resolved.append({"account_id": acct_id, "direction": direction, "amount": q2(amount), "role": role})

        # Balance check → route rounding gap to Suspense (never crash)
        debits = q2(sum(e["amount"] for e in resolved if e["direction"] == "debit"))
        credits = q2(sum(e["amount"] for e in resolved if e["direction"] == "credit"))
        diff = q2(debits - credits)
        if abs(diff) > 0.01:
            sus = self._resolve_account(workbench_id, "suspense")
            if not sus:
                raise ValueError(f"Unbalanced (Dr {debits} vs Cr {credits}) and no Suspense account available")
            resolved.append({
                "account_id": sus,
                "direction": "credit" if diff > 0 else "debit",
                "amount": abs(diff),
                "role": "suspense",
            })
            debits = q2(sum(e["amount"] for e in resolved if e["direction"] == "debit"))
            credits = q2(sum(e["amount"] for e in resolved if e["direction"] == "credit"))

        # Commit ledger transaction + entries
        tx = supabase.table("di_ledger_transactions").insert({
            "workbench_id": workbench_id,
            "business_event_id": business_event_id,
            "description": f"{event_type} — {ev.get('counterparty') or 'N/A'}",
            "transaction_date": ev.get("event_date") or datetime.now(timezone.utc).date().isoformat(),
            "currency": ev.get("currency", "INR"),
            "total_amount": q2(total),
            "created_by": executed_by,
        }).execute()
        tx_id = tx.data[0]["id"]

        supabase.table("di_ledger_entries").insert([
            {"transaction_id": tx_id, "account_id": e["account_id"], "direction": e["direction"],
             "amount": e["amount"], "memo": e["role"]}
            for e in resolved
        ]).execute()

        # Backlink + mark event compiled
        supabase.table("business_events").update({
            "transaction_id": tx_id,
            "compiled_at": datetime.now(timezone.utc).isoformat(),
        }).eq("id", business_event_id).execute()

        # Record a 'post' processing log so the document derives to "Posted"
        # in Doc Vault / Business Engine (deriveDocumentStatus looks for this).
        doc_id = ev.get("document_id")
        if doc_id:
            try:
                supabase.table("di_document_processing_logs").insert({
                    "document_id": doc_id,
                    "stage": "post",
                    "provider": "ledger_compiler",
                    "status": "success",
                }).execute()
            except Exception as log_err:
                print(f"[LedgerCompiler WARNING] could not write post log for doc {doc_id}: {log_err}")

        print(f"[LedgerCompiler] {event_type} -> tx {tx_id} | Dr {debits} = Cr {credits} | {len(resolved)} legs")
        return {
            "status": "compiled",
            "transaction_id": tx_id,
            "debits": debits,
            "credits": credits,
            "balanced": abs(q2(debits - credits)) < 0.01,
            "entries": [{"role": e["role"], "direction": e["direction"], "amount": e["amount"]} for e in resolved],
        }

    def _resolve_workbench(self, event: Dict) -> Optional[str]:
        meta = event.get("event_metadata") or {}
        if meta.get("workbench_id"):
            return meta["workbench_id"]
            
        doc_id = event.get("document_id")
        if doc_id:
            d = supabase.table("di_documents").select("workbench_id").eq("id", doc_id).limit(1).execute()
            if d.data:
                return d.data[0]["workbench_id"]
        # Fallback via analysis note -> document
        note_id = event.get("analysis_note_id")
        if note_id:
            n = supabase.table("di_analysis_notes").select("document_id").eq("id", note_id).limit(1).execute()
            if n.data and n.data[0].get("document_id"):
                d = supabase.table("di_documents").select("workbench_id").eq("id", n.data[0]["document_id"]).limit(1).execute()
                if d.data:
                    return d.data[0]["workbench_id"]
        return None


ledger_compiler = LedgerCompiler()
