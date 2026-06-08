"""
Compliance calendar: auto-generate the standard Indian GST/TDS/payroll deadlines
so a business never misses a filing — one of the things they rely on Tally/Zoho for.
"""
from fastapi import APIRouter, HTTPException
from datetime import date
from supabase_client import supabase

router = APIRouter()


def _add_months(d: date, months: int) -> date:
    m = d.month - 1 + months
    y = d.year + m // 12
    m = m % 12 + 1
    return date(y, m, 1)


def _month_label(d: date) -> str:
    return d.strftime("%b %Y")


# (form, category, day-of-deadline-in-FOLLOWING-month, friendly name)
MONTHLY_DEADLINES = [
    ("GSTR-1",  "gst",     11, "GSTR-1 (Outward supplies)"),
    ("GSTR-3B", "gst",     20, "GSTR-3B (Summary return & tax payment)"),
    ("TDS",     "tds",      7, "TDS Payment"),
    ("PF/ESI",  "payroll", 15, "PF & ESI Contribution"),
]

# Quarterly TDS returns: filed the month AFTER each quarter ends.
QUARTERLY_TDS = [
    ("26Q Q1", date(1, 7, 31)),   # Apr-Jun -> 31 Jul
    ("26Q Q2", date(1, 10, 31)),  # Jul-Sep -> 31 Oct
    ("26Q Q3", date(1, 1, 31)),   # Oct-Dec -> 31 Jan (next year)
    ("26Q Q4", date(1, 5, 31)),   # Jan-Mar -> 31 May
]


@router.post("/generate/{workbench_id}")
async def generate_calendar(workbench_id: str, months: int = 6, start: str = None):
    """
    Generate (upsert) the next `months` of standard compliance deadlines for a
    workbench. Idempotent via the unique (workbench_id, form, deadline) index.
    """
    try:
        anchor = date.fromisoformat(start) if start else date.today().replace(day=1)
        rows = []
        for i in range(months):
            period_month = _add_months(anchor, i)
            # deadline falls in the following month
            due_month = _add_months(period_month, 1)
            for form, category, day, name in MONTHLY_DEADLINES:
                rows.append({
                    "workbench_id": workbench_id,
                    "name": name,
                    "form": form,
                    "period": _month_label(period_month),
                    "deadline": date(due_month.year, due_month.month, day).isoformat(),
                    "status": "pending",
                    "category": category,
                })

        # de-dupe within the batch by (form, deadline)
        seen = set()
        unique_rows = []
        for r in rows:
            key = (r["form"], r["deadline"])
            if key not in seen:
                seen.add(key)
                unique_rows.append(r)

        if unique_rows:
            supabase.table("compliances").upsert(
                unique_rows, on_conflict="workbench_id,form,deadline"
            ).execute()

        return {"generated": len(unique_rows), "from": anchor.isoformat(), "months": months}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{compliance_id}/file")
async def mark_filed(compliance_id: str):
    """Mark a compliance item as filed today."""
    try:
        res = supabase.table("compliances").update({
            "status": "filed",
            "filed_date": date.today().isoformat(),
        }).eq("id", compliance_id).execute()
        return res.data[0] if res.data else {}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
