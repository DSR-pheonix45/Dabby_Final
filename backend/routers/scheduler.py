"""
Automation: payment reminders (dunning), recurring-invoice generation, and a
single /tick entrypoint a cron/edge scheduler can hit to run everything due.
"""
from fastapi import APIRouter, HTTPException
from datetime import date
from supabase_client import supabase
from services.email_service import email_service
from services.ledger_service import LedgerService
from services import tax_service

router = APIRouter()
ledger_service = LedgerService(supabase)


def _advance(d: date, frequency: str) -> date:
    months = {"weekly": 0, "monthly": 1, "quarterly": 3, "yearly": 12}.get(frequency, 1)
    if frequency == "weekly":
        from datetime import timedelta
        return d + timedelta(weeks=1)
    m = d.month - 1 + months
    y = d.year + m // 12
    return date(y, m % 12 + 1, min(d.day, 28))


def _reminder_html(party_name, invoice_number, amount, due_date, wb_name):
    return f"""
    <div style="font-family:sans-serif">
      <p>Dear {party_name or 'Customer'},</p>
      <p>This is a friendly reminder that invoice <b>{invoice_number}</b> for
      <b>₹{float(amount or 0):,.2f}</b> was due on <b>{due_date}</b> and appears unpaid.</p>
      <p>Kindly arrange the payment at your earliest convenience.</p>
      <p>Regards,<br/>{wb_name or 'Accounts Team'}</p>
    </div>"""


@router.post("/reminders/{workbench_id}")
async def send_reminders(workbench_id: str, as_of: str = None):
    """Dunning: email the customer for every overdue, unpaid invoice."""
    try:
        today = date.fromisoformat(as_of) if as_of else date.today()
        wb = supabase.table("workbenches").select("name").eq("id", workbench_id).single().execute().data or {}
        invoices = supabase.table("invoices").select("*, parties(name, email)") \
            .eq("workbench_id", workbench_id).neq("status", "paid").execute().data or []
        sent, skipped, results = 0, 0, []
        for inv in invoices:
            due = inv.get("due_date")
            if not due or date.fromisoformat(str(due)[:10]) >= today:
                continue
            party = inv.get("parties") or {}
            email = party.get("email")
            html = _reminder_html(party.get("name"), inv.get("invoice_number"),
                                  inv.get("balance_due"), due, wb.get("name"))
            res = await email_service.send(email, f"Payment reminder: Invoice {inv.get('invoice_number')}", html)
            if res.get("sent"):
                sent += 1
            else:
                skipped += 1
            results.append({"invoice": inv.get("invoice_number"), "to": email, **res})
        return {"overdue": sent + skipped, "sent": sent, "skipped": skipped,
                "email_enabled": email_service.enabled, "results": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


async def _generate_due_invoices(workbench_id: str, today: date):
    """Create invoices from any due recurring-invoice templates (3-leg if GST)."""
    from routers.ops import create_invoice, InvoiceCreate, _ensure_label  # local import avoids cycle
    due = supabase.table("recurring_invoices").select("*").eq("workbench_id", workbench_id) \
        .eq("active", True).lte("next_run_date", today.isoformat()).execute().data or []
    generated = []
    for r in due:
        run_date = date.fromisoformat(r["next_run_date"])
        seq = int(r.get("last_invoice_number") or 0) + 1
        number = f"REC-{str(r['id'])[:6]}-{seq:04d}"
        try:
            model = InvoiceCreate(
                workbench_id=workbench_id, party_id=r["party_id"], invoice_number=number,
                amount=float(r["taxable_amount"]), issue_date=run_date,
                revenue_label_id=r["revenue_label_id"], ar_label_id=r["ar_label_id"],
                items_json=r.get("items_json") or [],
                taxable_amount=float(r["taxable_amount"]), gst_rate=float(r.get("gst_rate") or 0),
                place_of_supply=r.get("place_of_supply"),
                description=r.get("description") or "Recurring invoice",
            )
            await create_invoice(model)
            generated.append({"recurring_id": r["id"], "invoice_number": number})
            nxt = _advance(run_date, r["frequency"])
            update = {"next_run_date": nxt.isoformat(), "last_run_date": today.isoformat(),
                      "last_invoice_number": seq}
            if r.get("end_date") and nxt > date.fromisoformat(str(r["end_date"])[:10]):
                update["active"] = False
            supabase.table("recurring_invoices").update(update).eq("id", r["id"]).execute()
        except Exception as e:
            print(f"[scheduler] recurring invoice {r['id']} failed: {e}")
    return generated


@router.post("/tick/{workbench_id}")
async def tick(workbench_id: str, as_of: str = None):
    """Run everything due for a workbench. Safe to call repeatedly (idempotent-ish)."""
    try:
        today = date.fromisoformat(as_of) if as_of else date.today()
        # 1. Recurring journal transactions
        from routers.recurring import run_due
        rec = await run_due(workbench_id, as_of=today.isoformat())
        # 2. Recurring invoices
        invs = await _generate_due_invoices(workbench_id, today)
        # 3. Dunning reminders
        rem = await send_reminders(workbench_id, as_of=today.isoformat())
        return {"recurring_posted": rec.get("posted", 0),
                "invoices_generated": len(invs),
                "reminders_sent": rem.get("sent", 0),
                "as_of": today.isoformat()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
