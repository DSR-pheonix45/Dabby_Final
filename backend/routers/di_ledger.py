"""
Universal Ledger read API — Trial Balance + transaction list.
Reads di_ledger_transactions / di_ledger_entries against di_accounts.
"""
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
        if d == 0 and c == 0:
            continue
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
            if d == 0 and c == 0:
                continue  # only accounts with activity
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
