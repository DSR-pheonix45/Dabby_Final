"""
Reconciliation engine — checks the ledger against the sub-systems (AR/AP),
finds gaps (missing months), and produces a completeness % and a books-health
score. Replaces the missing `run-reconciliation` edge function with a real,
computed result. No data is stored (intelligence is derived, per the spec).
"""
from fastapi import APIRouter, HTTPException
from datetime import date
from supabase_client import supabase
from services.ledger_service import LedgerService, money

router = APIRouter()
ledger_service = LedgerService(supabase)

TOLERANCE = 1.0  # ₹ rounding tolerance before flagging a mismatch


def _find_label(labels, ltype, *keywords):
    pool = [l for l in labels if l.get("type") == ltype]
    for l in pool:
        hay = f"{l.get('sub_account','')} {l.get('name','')}".lower()
        if any(k in hay for k in keywords):
            return l
    return pool[0] if pool else None


@router.get("/{workbench_id}")
async def run_reconciliation(workbench_id: str):
    try:
        labels = await ledger_service.get_labels(workbench_id)
        balances = await ledger_service.get_balances(workbench_id)
        issues = []
        checks = []

        # --- AR: outstanding invoices vs AR ledger balance ---
        ar_label = _find_label(labels, "asset", "receivable", "a/r", "debtor")
        invoices = supabase.table("invoices").select("balance_due, status").eq("workbench_id", workbench_id).execute().data or []
        ar_outstanding = money(sum(float(i.get("balance_due") or 0) for i in invoices if i.get("status") != "paid"))
        if ar_label:
            ar_ledger = money(balances.get(ar_label["id"], {}).get("net", 0))
            diff = money(ar_ledger - ar_outstanding)
            ok = abs(diff) <= TOLERANCE
            checks.append({"name": "Accounts Receivable", "ledger": ar_ledger, "subsystem": ar_outstanding, "difference": diff, "ok": ok})
            if not ok:
                issues.append(f"AR mismatch: ledger ₹{ar_ledger} vs open invoices ₹{ar_outstanding} (diff ₹{diff})")

        # --- AP: outstanding bills vs AP ledger balance ---
        ap_label = _find_label(labels, "liability", "payable", "a/p", "creditor")
        bills = supabase.table("bills").select("balance_due, status").eq("workbench_id", workbench_id).execute().data or []
        ap_outstanding = money(sum(float(b.get("balance_due") or 0) for b in bills if b.get("status") != "paid"))
        if ap_label:
            ap_ledger = money(abs(balances.get(ap_label["id"], {}).get("net", 0)))  # liability natural-credit
            diff = money(ap_ledger - ap_outstanding)
            ok = abs(diff) <= TOLERANCE
            checks.append({"name": "Accounts Payable", "ledger": ap_ledger, "subsystem": ap_outstanding, "difference": diff, "ok": ok})
            if not ok:
                issues.append(f"AP mismatch: ledger ₹{ap_ledger} vs open bills ₹{ap_outstanding} (diff ₹{diff})")

        # --- Coverage: missing months across the transaction span ---
        txns = supabase.table("transactions").select("transaction_date").eq("workbench_id", workbench_id).execute().data or []
        months_with_data = set()
        dates = []
        for t in txns:
            try:
                d = date.fromisoformat(str(t["transaction_date"])[:10])
                months_with_data.add((d.year, d.month))
                dates.append(d)
            except Exception:
                continue

        coverage_pct = 100.0
        missing_months = 0
        if dates:
            lo, hi = min(dates), max(dates)
            total_months = (hi.year - lo.year) * 12 + (hi.month - lo.month) + 1
            missing_months = max(0, total_months - len(months_with_data))
            coverage_pct = round(len(months_with_data) / total_months * 100, 1) if total_months else 100.0
            if missing_months:
                issues.append(f"{missing_months} month(s) in the {lo.isoformat()}–{hi.isoformat()} range have no transactions")
        else:
            issues.append("No transactions recorded yet — upload documents or import your books to begin.")
            coverage_pct = 0.0

        # --- Health score: start at 100, deduct for each problem ---
        health = 100
        health -= sum(20 for c in checks if not c["ok"])     # 20 per reconciliation mismatch
        health -= min(30, missing_months * 5)                 # up to 30 for gaps
        if not dates:
            health = 0
        health = max(0, min(100, health))

        return {
            "completeness_percentage": coverage_pct,
            "health_score": health,
            "checks": checks,
            "missing_months": missing_months,
            "issues": issues,
            "reconciled_at": date.today().isoformat(),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
