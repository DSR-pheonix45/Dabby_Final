"""
Universal Ledger read API — Trial Balance + transaction list.
Reads di_ledger_transactions / di_ledger_entries against di_accounts.
Also serves invoice-level Accounts Receivable / Payable off the
Business Event pipeline (business_events + event_settlements).
"""
from datetime import date, datetime
from fastapi import APIRouter, HTTPException
from supabase_client import supabase

router = APIRouter()

CATEGORY_NAMES = {"AST": "Assets", "LIA": "Liabilities", "EQU": "Equity", "REV": "Revenue", "EXP": "Expenses"}
CATEGORY_ORDER = ["AST", "LIA", "EQU", "REV", "EXP"]


def _r2(v):
    return round(float(v or 0), 2)


def _entries_for_workbench(workbench_id: str):
    txs = supabase.table("di_ledger_transactions").select("id").eq("workbench_id", workbench_id).execute().data or []
    tx_ids = [t["id"] for t in txs]
    entries = []
    for i in range(0, len(tx_ids), 100):
        chunk = tx_ids[i:i + 100]
        entries += supabase.table("di_ledger_entries").select("account_id, direction, amount").in_("transaction_id", chunk).execute().data or []
    return tx_ids, entries


def _balances(workbench_id: str):
    """Per-account net balance signed on its normal side (only accounts with activity)."""
    accts = supabase.table("di_accounts").select("id, code, name, category_code, normal_balance") \
        .eq("workbench_id", workbench_id).execute().data or []
    _, entries = _entries_for_workbench(workbench_id)
    agg = {a["id"]: {"debit": 0.0, "credit": 0.0} for a in accts}
    for e in entries:
        if e["account_id"] in agg:
            agg[e["account_id"]][e["direction"]] += float(e["amount"] or 0)
    rows = []
    for a in accts:
        d, c = _r2(agg[a["id"]]["debit"]), _r2(agg[a["id"]]["credit"])
        nb = a["normal_balance"]
        net = _r2(d - c) if nb == "debit" else _r2(c - d)
        rows.append({"account_id": a["id"], "code": a["code"], "name": a["name"],
                     "category": a["category_code"], "normal_balance": nb, "balance": net})
    return rows


def _cat(rows, cat):
    return sorted([{"code": r["code"], "name": r["name"], "amount": r["balance"]}
                   for r in rows if r["category"] == cat], key=lambda r: r["code"])


@router.get("/trial-balance/{workbench_id}")
async def trial_balance(workbench_id: str):
    try:
        accts = supabase.table("di_accounts").select("id, code, name, category_code, normal_balance") \
            .eq("workbench_id", workbench_id).execute().data or []
        tx_ids, entries = _entries_for_workbench(workbench_id)

        agg = {a["id"]: {"debit": 0.0, "credit": 0.0} for a in accts}
        for e in entries:
            if e["account_id"] in agg:
                agg[e["account_id"]][e["direction"]] += float(e["amount"] or 0)

        rows = []
        for a in accts:
            d, c = _r2(agg[a["id"]]["debit"]), _r2(agg[a["id"]]["credit"])
            nb = a["normal_balance"]
            net = _r2(d - c) if nb == "debit" else _r2(c - d)
            # place the net balance on its normal side (contra balances flip)
            if nb == "debit":
                tb_debit, tb_credit = (net, 0.0) if net >= 0 else (0.0, -net)
            else:
                tb_credit, tb_debit = (net, 0.0) if net >= 0 else (0.0, -net)
            rows.append({
                "account_id": a["id"], "code": a["code"], "name": a["name"],
                "category": a["category_code"], "normal_balance": nb,
                "debit": _r2(tb_debit), "credit": _r2(tb_credit),
                "raw_debit": d, "raw_credit": c, "balance": net,
            })

        groups = []
        for cat in CATEGORY_ORDER:
            cat_rows = sorted([r for r in rows if r["category"] == cat], key=lambda r: r["code"])
            if cat_rows:
                groups.append({
                    "category": cat, "name": CATEGORY_NAMES.get(cat, cat),
                    "accounts": cat_rows,
                    "total": _r2(sum(r["balance"] for r in cat_rows)),
                })

        total_debit = _r2(sum(r["debit"] for r in rows))
        total_credit = _r2(sum(r["credit"] for r in rows))
        return {
            "groups": groups,
            "total_debit": total_debit,
            "total_credit": total_credit,
            "balanced": abs(total_debit - total_credit) < 0.01,
            "transaction_count": len(tx_ids),
            "account_count": len(rows),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/transactions/{workbench_id}")
async def ledger_transactions(workbench_id: str, limit: int = 50):
    try:
        txs = supabase.table("di_ledger_transactions") \
            .select("*, business_events(event_type, counterparty)") \
            .eq("workbench_id", workbench_id).order("created_at", desc=True).limit(limit).execute().data or []
        accts = {a["id"]: a for a in (supabase.table("di_accounts").select("id, code, name")
                                      .eq("workbench_id", workbench_id).execute().data or [])}
        for t in txs:
            ent = supabase.table("di_ledger_entries").select("account_id, direction, amount, memo") \
                .eq("transaction_id", t["id"]).execute().data or []
            t["entries"] = [{
                "code": accts.get(e["account_id"], {}).get("code"),
                "account": accts.get(e["account_id"], {}).get("name"),
                "direction": e["direction"],
                "amount": _r2(e["amount"]),
            } for e in ent]
        return txs
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/pnl/{workbench_id}")
async def profit_and_loss(workbench_id: str):
    """Profit & Loss: revenue - expenses = net profit."""
    try:
        rows = _balances(workbench_id)
        revenue = _cat(rows, "REV")
        expenses = _cat(rows, "EXP")
        total_revenue = _r2(sum(r["amount"] for r in revenue))
        total_expenses = _r2(sum(r["amount"] for r in expenses))
        net_profit = _r2(total_revenue - total_expenses)
        return {
            "revenue": revenue,
            "expenses": expenses,
            "total_revenue": total_revenue,
            "total_expenses": total_expenses,
            "net_profit": net_profit,
            "margin_pct": _r2(net_profit / total_revenue * 100) if total_revenue else 0,
            "is_profit": net_profit >= 0,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/balance-sheet/{workbench_id}")
async def balance_sheet(workbench_id: str):
    """Balance Sheet: Assets = Liabilities + Equity (incl. current-year earnings)."""
    try:
        rows = _balances(workbench_id)
        assets = _cat(rows, "AST")
        liabilities = _cat(rows, "LIA")
        equity = _cat(rows, "EQU")

        total_assets = _r2(sum(r["amount"] for r in assets))
        total_liabilities = _r2(sum(r["amount"] for r in liabilities))
        equity_from_accounts = _r2(sum(r["amount"] for r in equity))

        # Net profit rolls into equity as current-year earnings
        total_revenue = _r2(sum(r["balance"] for r in rows if r["category"] == "REV"))
        total_expenses = _r2(sum(r["balance"] for r in rows if r["category"] == "EXP"))
        current_year_earnings = _r2(total_revenue - total_expenses)

        equity_lines = list(equity)
        if abs(current_year_earnings) > 0.001:
            equity_lines.append({"code": "3200", "name": "Current Year Earnings", "amount": current_year_earnings})
        total_equity = _r2(equity_from_accounts + current_year_earnings)

        return {
            "assets": assets,
            "liabilities": liabilities,
            "equity": equity_lines,
            "total_assets": total_assets,
            "total_liabilities": total_liabilities,
            "total_equity": total_equity,
            "liabilities_plus_equity": _r2(total_liabilities + total_equity),
            "current_year_earnings": current_year_earnings,
            "balanced": abs(total_assets - (total_liabilities + total_equity)) < 0.01,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Accounts Receivable / Payable (Business Event pipeline) ─────────────────

def _workbench_document_ids(workbench_id: str):
    docs = supabase.table("di_documents").select("id").eq("workbench_id", workbench_id).execute().data or []
    return [d["id"] for d in docs]


def _settled_by_event(event_ids):
    """Sum amount_matched per event across event_settlements (either leg)."""
    settled = {eid: 0.0 for eid in event_ids}
    if not event_ids:
        return settled
    for col in ("event_id_a", "event_id_b"):
        for i in range(0, len(event_ids), 100):
            chunk = event_ids[i:i + 100]
            rows = supabase.table("event_settlements").select(f"{col}, amount_matched, settlement_status") \
                .in_(col, chunk).execute().data or []
            for r in rows:
                eid = r[col]
                if eid in settled:
                    settled[eid] += float(r.get("amount_matched") or 0)
    return settled


def _parse_date(s):
    if not s:
        return None
    try:
        return datetime.strptime(str(s)[:10], "%Y-%m-%d").date()
    except (ValueError, TypeError):
        return None


def _ar_ap_rows(workbench_id: str, event_type: str):
    """Invoice-level open receivables/payables from business_events."""
    doc_ids = _workbench_document_ids(workbench_id)
    if not doc_ids:
        return []
    events = []
    for i in range(0, len(doc_ids), 100):
        chunk = doc_ids[i:i + 100]
        events += supabase.table("business_events") \
            .select("id, counterparty, amount, event_date, settlement_key, event_status, event_metadata, document_id") \
            .in_("document_id", chunk).eq("event_type", event_type).eq("is_superseded", False).execute().data or []

    settled = _settled_by_event([e["id"] for e in events])
    today = date.today()
    rows = []
    for e in events:
        if e.get("event_status") == "CANCELLED":
            continue
        amount = float(e.get("amount") or 0)
        paid = _r2(settled.get(e["id"], 0.0))
        outstanding = _r2(amount - paid)
        meta = e.get("event_metadata") or {}
        dates = meta.get("dates") or {}
        issue = _parse_date(e.get("event_date")) or _parse_date(dates.get("document_date"))
        due = _parse_date(dates.get("due_date")) or (issue if issue else None)
        days_out = (today - issue).days if issue else 0
        days_left = (due - today).days if due else None
        if outstanding <= 0.01:
            status = "Paid"
        elif due and today > due:
            status = "Overdue"
        elif days_left is not None and 0 <= days_left <= 7:
            status = "Due Soon"
        else:
            status = "Outstanding"
        rows.append({
            "id": e["id"],
            "counterparty": e.get("counterparty") or "Unknown",
            "reference": e.get("settlement_key") or f"BE-{str(e['id'])[:8]}",
            "date": str(issue) if issue else None,
            "dueDate": str(due) if due else None,
            "amount": amount,
            "outstanding": outstanding,
            "paid": paid,
            "daysOutstanding": max(days_out, 0),
            "daysRemaining": days_left,
            "status": status,
        })
    rows.sort(key=lambda r: r["date"] or "", reverse=True)
    return rows


@router.get("/receivables/{workbench_id}")
async def receivables(workbench_id: str):
    """Open customer invoices (CUSTOMER_BILLED events) with aging + KPIs."""
    try:
        rows = _ar_ap_rows(workbench_id, "CUSTOMER_BILLED")
        open_rows = [r for r in rows if r["status"] != "Paid"]
        total = _r2(sum(r["outstanding"] for r in open_rows))
        overdue_rows = [r for r in open_rows if r["status"] == "Overdue"]
        overdue = _r2(sum(r["outstanding"] for r in overdue_rows))
        dso = round(sum(r["daysOutstanding"] for r in open_rows) / len(open_rows)) if open_rows else 0
        customers_overdue = len({r["counterparty"] for r in overdue_rows})
        return {
            "data": [{
                "id": r["id"], "customer": r["counterparty"], "invoiceNumber": r["reference"],
                "date": r["date"], "dueDate": r["dueDate"], "amount": r["outstanding"],
                "daysOutstanding": r["daysOutstanding"], "status": r["status"], "rep": "—",
            } for r in open_rows],
            "kpis": {"total": total, "overdue": overdue, "dso": dso, "customersWithOverdue": customers_overdue},
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/payables/{workbench_id}")
async def payables(workbench_id: str):
    """Open vendor bills (VENDOR_BILLED events) with aging + KPIs."""
    try:
        rows = _ar_ap_rows(workbench_id, "VENDOR_BILLED")
        open_rows = [r for r in rows if r["status"] != "Paid"]
        total = _r2(sum(r["outstanding"] for r in open_rows))
        overdue = _r2(sum(r["outstanding"] for r in open_rows if r["status"] == "Overdue"))
        due_this_week = _r2(sum(r["outstanding"] for r in open_rows
                                if r["daysRemaining"] is not None and 0 <= r["daysRemaining"] <= 7))
        dpo = round(sum(r["daysOutstanding"] for r in open_rows) / len(open_rows)) if open_rows else 0
        return {
            "data": [{
                "id": r["id"], "vendor": r["counterparty"], "billNumber": r["reference"],
                "date": r["date"], "dueDate": r["dueDate"], "amount": r["outstanding"],
                "daysRemaining": r["daysRemaining"] if r["daysRemaining"] is not None else 0,
                "status": r["status"], "terms": "—",
            } for r in open_rows],
            "kpis": {"total": total, "dueThisWeek": due_this_week, "overdue": overdue, "dpo": dpo},
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Per-document completion status (invoice value vs matched payment snippets) ──
# Openers are obligations that get settled by payments. For these we compare the
# invoice value against the sum of matched settlement snippets:
#   paid == invoice  -> Completed
#   paid <  invoice  -> Partially Completed (difference is shown)
OPENER_EVENT_TYPES = {
    "CUSTOMER_BILLED", "VENDOR_BILLED", "LOAN_RECEIVED",
    "TAX_LIABILITY_CREATED", "PAYROLL_INCURRED",
}


@router.get("/document-status/{workbench_id}")
async def document_status(workbench_id: str):
    """Map document_id -> completion status once posted as a Business Event.

    posted invoices/bills report {invoice_value, paid, difference, status}
    where status is 'completed' when fully settled, else 'partially_completed'.
    Non-opener posted events (payments, expenses, bank) report 'completed'.
    """
    try:
        doc_ids = _workbench_document_ids(workbench_id)
        if not doc_ids:
            return {}
        events = []
        for i in range(0, len(doc_ids), 100):
            chunk = doc_ids[i:i + 100]
            events += supabase.table("business_events") \
                .select("id, document_id, event_type, amount, event_status, created_at") \
                .in_("document_id", chunk).eq("is_superseded", False).execute().data or []

        # Latest non-superseded event per document
        events.sort(key=lambda e: e.get("created_at") or "")
        latest = {}
        for e in events:
            if e.get("event_status") == "CANCELLED":
                continue
            latest[e["document_id"]] = e

        settled = _settled_by_event([e["id"] for e in latest.values()])
        out = {}
        for doc_id, e in latest.items():
            invoice_value = _r2(e.get("amount") or 0)
            etype = e.get("event_type")
            if etype in OPENER_EVENT_TYPES and invoice_value > 0:
                paid = _r2(settled.get(e["id"], 0.0))
                difference = _r2(invoice_value - paid)
                status = "completed" if difference <= 0.01 else "partially_completed"
            else:
                paid = invoice_value
                difference = 0.0
                status = "completed"
            out[doc_id] = {
                "posted": True,
                "event_id": e["id"],
                "event_type": etype,
                "invoice_value": invoice_value,
                "paid": paid,
                "difference": difference,
                "status": status,
            }
        return out
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
