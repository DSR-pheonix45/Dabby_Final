"""
TDS Form 26Q (quarterly TDS return on non-salary payments) builder.
Derives deductee-wise rows from bills that captured a TDS deduction.
"""


def _round(x):
    return round(float(x or 0), 2)


def build_26q(quarter: str, fy: str, deductor: dict, bills: list) -> dict:
    """
    deductor: { tan, name, pan }
    bills: dicts with party_name, party_pan, tds_section, tds_rate, tds_amount,
           taxable_amount(or amount), issue_date
    Returns a 26Q-style structure with deductee rows and challan totals.
    """
    rows = []
    total_paid = 0.0
    total_tds = 0.0
    by_section = {}
    for b in bills:
        tds = _round(b.get("tds_amount"))
        if tds <= 0:
            continue
        paid = _round(b.get("taxable_amount") or b.get("amount"))
        section = b.get("tds_section") or "194C"
        rows.append({
            "deductee_name": b.get("party_name") or "Unknown",
            "pan": (b.get("party_pan") or "PANNOTAVBL").upper(),
            "section": section,
            "date_of_payment": str(b.get("issue_date") or "")[:10],
            "amount_paid": paid,
            "tds_rate": _round(b.get("tds_rate")),
            "tds_deducted": tds,
        })
        total_paid += paid
        total_tds += tds
        by_section[section] = _round(by_section.get(section, 0) + tds)

    return {
        "form": "26Q",
        "fy": fy,
        "quarter": quarter,
        "deductor": deductor,
        "summary": {
            "deductee_count": len(rows),
            "total_amount_paid": _round(total_paid),
            "total_tds_deducted": _round(total_tds),
            "by_section": by_section,
        },
        "deductees": rows,
    }
