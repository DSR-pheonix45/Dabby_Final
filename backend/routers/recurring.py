"""
Recurring transactions — schedule rent, salaries, subscriptions, EMIs once and
let Dabby post them automatically when due. (Run `/run-due` from a cron/edge
scheduler, or manually from the UI.)
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import date, timedelta
from supabase_client import supabase
from services.ledger_service import LedgerService

router = APIRouter()
ledger_service = LedgerService(supabase)


class RecurringCreate(BaseModel):
    workbench_id: str
    description: str
    from_label_id: str
    to_label_id: str
    amount: float
    frequency: str = "monthly"          # daily|weekly|monthly|quarterly|yearly
    next_run_date: date
    end_date: Optional[date] = None
    party_id: Optional[str] = None


def _advance(d: date, frequency: str) -> date:
    if frequency == "daily":
        return d + timedelta(days=1)
    if frequency == "weekly":
        return d + timedelta(weeks=1)
    if frequency == "yearly":
        return date(d.year + 1, d.month, min(d.day, 28))
    months = 3 if frequency == "quarterly" else 1   # default monthly
    m = d.month - 1 + months
    y = d.year + m // 12
    m = m % 12 + 1
    return date(y, m, min(d.day, 28))               # clamp to avoid Feb-30 etc.


@router.post("/")
async def create_recurring(r: RecurringCreate):
    try:
        data = r.dict()
        data["next_run_date"] = str(r.next_run_date)
        if r.end_date:
            data["end_date"] = str(r.end_date)
        res = supabase.table("recurring_transactions").insert(data).execute()
        return res.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{workbench_id}")
async def list_recurring(workbench_id: str):
    try:
        res = supabase.table("recurring_transactions").select("*") \
            .eq("workbench_id", workbench_id).order("next_run_date").execute()
        return res.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/{recurring_id}/toggle")
async def toggle_recurring(recurring_id: str, active: bool):
    try:
        res = supabase.table("recurring_transactions").update({"active": active}) \
            .eq("id", recurring_id).execute()
        return res.data[0] if res.data else {}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{recurring_id}")
async def delete_recurring(recurring_id: str):
    try:
        supabase.table("recurring_transactions").delete().eq("id", recurring_id).execute()
        return {"deleted": recurring_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class RecurringInvoiceCreate(BaseModel):
    workbench_id: str
    party_id: str
    description: Optional[str] = None
    taxable_amount: float
    gst_rate: float = 0
    place_of_supply: Optional[str] = None
    revenue_label_id: str
    ar_label_id: str
    items_json: Optional[list] = []
    frequency: str = "monthly"
    next_run_date: date
    end_date: Optional[date] = None


@router.post("/invoices")
async def create_recurring_invoice(r: RecurringInvoiceCreate):
    try:
        data = r.dict()
        data["next_run_date"] = str(r.next_run_date)
        if r.end_date:
            data["end_date"] = str(r.end_date)
        res = supabase.table("recurring_invoices").insert(data).execute()
        return res.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/invoices/{workbench_id}")
async def list_recurring_invoices(workbench_id: str):
    try:
        res = supabase.table("recurring_invoices").select("*, parties(name)") \
            .eq("workbench_id", workbench_id).order("next_run_date").execute()
        return res.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/run-due/{workbench_id}")
async def run_due(workbench_id: str, as_of: str = None):
    """
    Post every active recurring transaction whose next_run_date is due (<= today),
    advancing each schedule. Safe to call repeatedly — it only posts what's due.
    """
    try:
        today = date.fromisoformat(as_of) if as_of else date.today()
        due = supabase.table("recurring_transactions").select("*") \
            .eq("workbench_id", workbench_id).eq("active", True) \
            .lte("next_run_date", today.isoformat()).execute().data or []

        posted = []
        for r in due:
            run_date = date.fromisoformat(r["next_run_date"])
            # Catch up on any missed cycles, but never post past end_date / today.
            end = date.fromisoformat(r["end_date"]) if r.get("end_date") else None
            while run_date <= today and (end is None or run_date <= end):
                try:
                    tx = await ledger_service.record_transaction(
                        workbench_id=workbench_id,
                        from_label_id=r["from_label_id"],
                        to_label_id=r["to_label_id"],
                        amount=float(r["amount"]),
                        description=f"[Recurring] {r['description']}",
                        transaction_date=run_date,
                        source_party_id=r.get("party_id"),
                    )
                    posted.append({"recurring_id": r["id"], "date": run_date.isoformat(),
                                   "transaction_id": tx["transaction"]["id"]})
                except Exception as post_err:
                    print(f"[RECURRING] Failed to post {r['id']} for {run_date}: {post_err}")
                    break
                run_date = _advance(run_date, r["frequency"])

            update = {"next_run_date": run_date.isoformat(), "last_run_date": today.isoformat()}
            if end and run_date > end:
                update["active"] = False
            supabase.table("recurring_transactions").update(update).eq("id", r["id"]).execute()

        return {"posted": len(posted), "details": posted}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
