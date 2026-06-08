"""
Cash-flow forecast: projects cash position forward from current bank/cash balances,
expected AR inflows (unpaid invoices by due date), AP outflows (unpaid bills by due
date), and recurring transactions. Derives a runway estimate. No data stored.
"""
from fastapi import APIRouter, HTTPException
from datetime import date
from supabase_client import supabase
from services.ledger_service import LedgerService, money

router = APIRouter()
ledger_service = LedgerService(supabase)

CASH_KEYWORDS = ("cash", "bank", "wallet", "upi", "petty")


def _month_key(d: date):
    return f"{d.year}-{d.month:02d}"


def _add_months(d: date, n: int):
    m = d.month - 1 + n
    return date(d.year + m // 12, m % 12 + 1, 1)


@router.get("/{workbench_id}")
async def forecast(workbench_id: str, months: int = 6):
    try:
        labels = await ledger_service.get_labels(workbench_id)
        balances = await ledger_service.get_balances(workbench_id)
        ltype = {l["id"]: l["type"] for l in labels}

        # Current cash = net of cash/bank asset labels (fallback: all assets).
        cash_ids = [l["id"] for l in labels if l["type"] == "asset"
                    and any(k in f"{l.get('sub_account','')} {l.get('name','')}".lower() for k in CASH_KEYWORDS)]
        if not cash_ids:
            cash_ids = [l["id"] for l in labels if l["type"] == "asset"]
        current_cash = money(sum(balances.get(i, {}).get("net", 0) for i in cash_ids))

        today = date.today()
        horizon = [_add_months(today.replace(day=1), i) for i in range(months)]
        keys = [_month_key(m) for m in horizon]
        inflow = {k: 0.0 for k in keys}
        outflow = {k: 0.0 for k in keys}

        # AR inflows: unpaid invoices by due month
        for inv in (supabase.table("invoices").select("balance_due, due_date, status").eq("workbench_id", workbench_id).neq("status", "paid").execute().data or []):
            due = inv.get("due_date")
            if not due:
                continue
            k = _month_key(date.fromisoformat(str(due)[:10]))
            if k in inflow:
                inflow[k] += float(inv.get("balance_due") or 0)

        # AP outflows: unpaid bills by due month
        for b in (supabase.table("bills").select("balance_due, due_date, status").eq("workbench_id", workbench_id).neq("status", "paid").execute().data or []):
            due = b.get("due_date")
            if not due:
                continue
            k = _month_key(date.fromisoformat(str(due)[:10]))
            if k in outflow:
                outflow[k] += float(b.get("balance_due") or 0)

        # Recurring transactions -> per-month factor; outflow if destination is expense.
        factor = {"weekly": 4.33, "monthly": 1, "quarterly": 1 / 3, "yearly": 1 / 12, "daily": 30}
        for r in (supabase.table("recurring_transactions").select("*").eq("workbench_id", workbench_id).eq("active", True).execute().data or []):
            amt = float(r.get("amount") or 0) * factor.get(r.get("frequency"), 1)
            dest_type = ltype.get(r.get("to_label_id"))
            bucket = outflow if dest_type in ("expense", "liability") else inflow
            for k in keys:
                bucket[k] += amt

        running = current_cash
        series = []
        for k in keys:
            net = money(inflow[k] - outflow[k])
            running = money(running + net)
            series.append({"period": k, "inflow": money(inflow[k]), "outflow": money(outflow[k]),
                           "net": net, "closing_cash": running})

        # Runway: months until cash would go negative at the average monthly net burn.
        avg_net = money(sum(s["net"] for s in series) / (len(series) or 1))
        runway_months = None
        if avg_net < 0:
            runway_months = round(current_cash / abs(avg_net), 1) if current_cash > 0 else 0

        return {
            "current_cash": current_cash,
            "avg_monthly_net": avg_net,
            "runway_months": runway_months,
            "series": series,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
