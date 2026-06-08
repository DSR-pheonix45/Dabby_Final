"""
GSTR-1 and GSTR-3B return builders.

Produces the JSON structures the GST portal's offline tool accepts, derived from
the invoices (outward/output tax) and bills (inward/input tax) that already carry
a CGST/SGST/IGST breakdown. Pure functions — no DB.
"""
from collections import defaultdict


def _round(x):
    return round(float(x or 0), 2)


def _period(period_iso_or_mmyyyy: str) -> str:
    """Normalize a period to GST 'MMYYYY'. Accepts 'YYYY-MM' or 'MMYYYY'."""
    s = (period_iso_or_mmyyyy or "").strip()
    if "-" in s:  # YYYY-MM
        y, m = s.split("-")[:2]
        return f"{int(m):02d}{y}"
    return s


def build_gstr1(period: str, gstin: str, invoices: list) -> dict:
    """
    invoices: list of dicts with keys:
      invoice_number, issue_date, amount(gross), taxable_amount, cgst, sgst, igst,
      gst_rate, place_of_supply, is_interstate, party_gstin, party_state_code, items_json
    Splits into B2B (party has GSTIN) and B2CS (no GSTIN), plus an HSN summary.
    """
    b2b_map = defaultdict(list)
    b2cs_map = defaultdict(lambda: {"txval": 0, "iamt": 0, "camt": 0, "samt": 0})
    hsn_map = defaultdict(lambda: {"txval": 0, "iamt": 0, "camt": 0, "samt": 0, "qty": 0, "val": 0, "desc": ""})

    for inv in invoices:
        gross = _round(inv.get("amount"))
        txval = _round(inv.get("taxable_amount") or (gross - _round(inv.get("total_tax"))))
        rate = _round(inv.get("gst_rate"))
        pos = (inv.get("place_of_supply") or "")[:2]
        item = {
            "num": 1,
            "itm_det": {
                "txval": txval, "rt": rate,
                "iamt": _round(inv.get("igst")), "camt": _round(inv.get("cgst")), "samt": _round(inv.get("sgst")),
                "csamt": 0,
            },
        }
        inv_obj = {
            "inum": inv.get("invoice_number"),
            "idt": _fmt_date(inv.get("issue_date")),
            "val": gross,
            "pos": pos or "NA",
            "rchrg": "N",
            "inv_typ": "R",
            "itms": [item],
        }
        ctin = inv.get("party_gstin")
        if ctin:
            b2b_map[ctin].append(inv_obj)
        else:
            key = (rate, pos or "NA")
            agg = b2cs_map[key]
            agg["txval"] += txval
            agg["iamt"] += _round(inv.get("igst"))
            agg["camt"] += _round(inv.get("cgst"))
            agg["samt"] += _round(inv.get("sgst"))

        # HSN summary from line items
        for li in (inv.get("items_json") or []):
            hsn = str(li.get("hsn_code") or li.get("hsn") or "")
            h = hsn_map[hsn]
            h["desc"] = li.get("name") or li.get("description") or h["desc"]
            h["qty"] += _round(li.get("quantity"))
            h["val"] += _round(li.get("amount") or (_round(li.get("quantity")) * _round(li.get("unit_price") or li.get("price"))))

    b2b = [{"ctin": ctin, "inv": invs} for ctin, invs in b2b_map.items()]
    b2cs = [{"sply_ty": "INTRA" if not _interstate(pos, gstin) else "INTER", "rt": rate,
             "typ": "OE", "pos": pos,
             "txval": _round(v["txval"]), "iamt": _round(v["iamt"]),
             "camt": _round(v["camt"]), "samt": _round(v["samt"])}
            for (rate, pos), v in b2cs_map.items()]
    hsn = {"data": [{"num": i + 1, "hsn_sc": k, "desc": v["desc"][:30], "uqc": "NOS",
                     "qty": _round(v["qty"]), "val": _round(v["val"]), "txval": _round(v["txval"]),
                     "iamt": _round(v["iamt"]), "camt": _round(v["camt"]), "samt": _round(v["samt"])}
                    for i, (k, v) in enumerate(hsn_map.items()) if k]}

    return {"gstin": gstin, "fp": _period(period), "version": "GST3.0.4", "hash": "hash",
            "b2b": b2b, "b2cs": b2cs, "hsn": hsn}


def build_gstr3b(period: str, gstin: str, invoices: list, bills: list) -> dict:
    """Summary return: outward taxable supplies (from invoices) and ITC (from bills)."""
    osup = {"txval": 0, "iamt": 0, "camt": 0, "samt": 0, "csamt": 0}
    for inv in invoices:
        osup["txval"] += _round(inv.get("taxable_amount"))
        osup["iamt"] += _round(inv.get("igst"))
        osup["camt"] += _round(inv.get("cgst"))
        osup["samt"] += _round(inv.get("sgst"))

    itc = {"iamt": 0, "camt": 0, "samt": 0, "csamt": 0}
    for b in bills:
        itc["iamt"] += _round(b.get("igst"))
        itc["camt"] += _round(b.get("cgst"))
        itc["samt"] += _round(b.get("sgst"))

    osup = {k: _round(v) for k, v in osup.items()}
    itc = {k: _round(v) for k, v in itc.items()}
    net_payable = _round((osup["iamt"] + osup["camt"] + osup["samt"]) - (itc["iamt"] + itc["camt"] + itc["samt"]))

    return {
        "gstin": gstin,
        "ret_period": _period(period),
        "sup_details": {"osup_det": osup},
        "itc_elg": {"itc_avl": [{"ty": "ISRC", **itc}]},
        "computed": {"net_gst_payable": net_payable},
    }


def _fmt_date(d):
    s = str(d or "")[:10]
    if "-" in s and len(s) == 10:  # YYYY-MM-DD -> DD-MM-YYYY (GST format)
        y, m, dd = s.split("-")
        return f"{dd}-{m}-{y}"
    return s


def _interstate(pos_state, gstin):
    supplier_state = (gstin or "")[:2]
    return bool(pos_state and supplier_state and pos_state != supplier_state)
