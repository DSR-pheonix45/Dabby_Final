"""
Indian GST + TDS computation engine.

Pure, deterministic functions — no DB / network — so they are trivially testable
and reusable by routers, the AI layer, and report generation.

GST model
---------
- Intra-state supply (supplier state == place of supply):  CGST + SGST, each = rate/2
- Inter-state supply (supplier state != place of supply):  IGST = full rate
- State is derived from the first two digits of a GSTIN (the state code) when an
  explicit state code is not supplied.

TDS model
---------
- Tax Deducted at Source on certain expense payments. Returns the TDS amount and
  the net payable to the vendor (gross - TDS). Rates are configurable per section.
"""

from decimal import Decimal, ROUND_HALF_UP

# Standard GST slabs (for validation / UI hints)
GST_SLABS = [0, 0.25, 3, 5, 12, 18, 28]

# Common TDS sections -> (resident rate %, note). Rates are indicative defaults and
# should be reviewed against the current Finance Act; they are configurable per call.
TDS_SECTIONS = {
    "194C":  {"rate": 2.0, "rate_individual": 1.0, "desc": "Payments to contractors"},
    "194J":  {"rate": 10.0, "rate_technical": 2.0, "desc": "Professional / technical fees"},
    "194I":  {"rate": 10.0, "rate_plant": 2.0, "desc": "Rent (land/building)"},
    "194H":  {"rate": 5.0, "desc": "Commission or brokerage"},
    "194Q":  {"rate": 0.1, "desc": "Purchase of goods > 50L"},
    "194A":  {"rate": 10.0, "desc": "Interest other than securities"},
}


def _money(x) -> Decimal:
    """Coerce to a 2dp Decimal, guarding against float artefacts and bad input."""
    try:
        return Decimal(str(x if x is not None else 0)).quantize(Decimal("0.01"), ROUND_HALF_UP)
    except Exception:
        return Decimal("0.00")


def _f(d: Decimal) -> float:
    return float(d)


def state_code_from_gstin(gstin: str):
    """First two characters of a GSTIN are the numeric state code (e.g. '27' = MH)."""
    if gstin and len(gstin) >= 2 and gstin[:2].isdigit():
        return gstin[:2]
    return None


def is_interstate(supplier_state: str, place_of_supply: str) -> bool:
    """Inter-state when both states are known and differ. Defaults to intra-state."""
    if not supplier_state or not place_of_supply:
        return False
    return str(supplier_state).strip() != str(place_of_supply).strip()


def compute_gst(taxable_amount, rate, supplier_state=None, place_of_supply=None,
                supplier_gstin=None, customer_gstin=None) -> dict:
    """
    Returns a GST breakdown for a taxable value at the given rate (percent).

    Output keys (all 2dp floats):
      taxable_amount, rate, cgst, sgst, igst, total_tax, total_amount, interstate
    """
    taxable = _money(taxable_amount)
    rate_d = Decimal(str(rate or 0))

    supplier_state = supplier_state or state_code_from_gstin(supplier_gstin)
    place_of_supply = place_of_supply or state_code_from_gstin(customer_gstin)
    interstate = is_interstate(supplier_state, place_of_supply)

    total_tax = _money(taxable * rate_d / Decimal("100"))

    if interstate:
        igst = total_tax
        cgst = sgst = Decimal("0.00")
    else:
        # split half/half; put any rounding remainder on CGST so cgst+sgst == total_tax
        sgst = _money(total_tax / 2)
        cgst = _money(total_tax - sgst)
        igst = Decimal("0.00")

    return {
        "taxable_amount": _f(taxable),
        "rate": float(rate_d),
        "cgst": _f(cgst),
        "sgst": _f(sgst),
        "igst": _f(igst),
        "total_tax": _f(total_tax),
        "total_amount": _f(taxable + total_tax),
        "interstate": interstate,
    }


def compute_gst_from_items(items, supplier_state=None, place_of_supply=None,
                           supplier_gstin=None, customer_gstin=None) -> dict:
    """
    Aggregate GST across line items. Each item may carry:
      quantity, unit_price (or price), gst_rate (percent), taxable_amount (optional override)
    Returns the summed breakdown plus per-item detail.
    """
    sub = Decimal("0.00")
    cgst = sgst = igst = total_tax = Decimal("0.00")
    detail = []
    for it in (items or []):
        qty = Decimal(str(it.get("quantity", 1) or 1))
        unit = Decimal(str(it.get("unit_price", it.get("price", 0)) or 0))
        taxable = _money(it.get("taxable_amount") if it.get("taxable_amount") is not None else qty * unit)
        rate = it.get("gst_rate", it.get("rate", 0)) or 0
        line = compute_gst(taxable, rate, supplier_state, place_of_supply,
                           supplier_gstin, customer_gstin)
        sub += taxable
        cgst += _money(line["cgst"])
        sgst += _money(line["sgst"])
        igst += _money(line["igst"])
        total_tax += _money(line["total_tax"])
        detail.append({**it, **line})

    return {
        "taxable_amount": _f(sub),
        "cgst": _f(cgst),
        "sgst": _f(sgst),
        "igst": _f(igst),
        "total_tax": _f(total_tax),
        "total_amount": _f(sub + total_tax),
        "items": detail,
    }


def compute_tds(amount, section=None, rate=None, deductee_type="company") -> dict:
    """
    Compute TDS on a (taxable) payment.

    - `rate` (percent) takes precedence if provided.
    - else `section` looks up a default rate (individual/HUF gets the lower 194C rate).
    Returns: { base, tds_rate, tds_amount, net_payable, section }
    """
    base = _money(amount)
    resolved_rate = None

    if rate is not None:
        resolved_rate = Decimal(str(rate))
    elif section and section in TDS_SECTIONS:
        cfg = TDS_SECTIONS[section]
        if section == "194C" and deductee_type in ("individual", "huf"):
            resolved_rate = Decimal(str(cfg.get("rate_individual", cfg["rate"])))
        else:
            resolved_rate = Decimal(str(cfg["rate"]))
    else:
        resolved_rate = Decimal("0")

    tds = _money(base * resolved_rate / Decimal("100"))
    return {
        "base": _f(base),
        "tds_rate": float(resolved_rate),
        "tds_amount": _f(tds),
        "net_payable": _f(base - tds),
        "section": section,
    }
