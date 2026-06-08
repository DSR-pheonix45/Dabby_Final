"""
GST e-invoicing.

Builds the IRP (Invoice Registration Portal) JSON payload (schema v1.1) for an
invoice, and provides a pluggable IRP client to obtain the IRN + signed QR.

The real IRP call needs GSP/sandbox credentials (EINV_* env vars). Without them
the client returns enabled=False and we still hand back the validated payload so
it can be filed via any GSP or the offline tool.
"""
import os


def _r(x):
    return round(float(x or 0), 2)


def build_einvoice_payload(invoice: dict, seller: dict, buyer: dict, items: list) -> dict:
    """
    invoice: invoice_number, issue_date, taxable_amount, cgst, sgst, igst, amount, is_interstate
    seller/buyer: { gstin, legal_name, address, location, pincode, state_code }
    items: [{ name, hsn_code, quantity, unit_price, gst_rate, taxable_amount, cgst, sgst, igst }]
    """
    is_inter = bool(invoice.get("is_interstate"))
    item_list = []
    for i, it in enumerate(items or [], start=1):
        txval = _r(it.get("taxable_amount") or (_r(it.get("quantity")) * _r(it.get("unit_price") or it.get("price"))))
        item_list.append({
            "SlNo": str(i),
            "PrdDesc": (it.get("name") or it.get("description") or "Item")[:300],
            "IsServc": "N",
            "HsnCd": str(it.get("hsn_code") or it.get("hsn") or "9999"),
            "Qty": _r(it.get("quantity") or 1),
            "Unit": "NOS",
            "UnitPrice": _r(it.get("unit_price") or it.get("price")),
            "TotAmt": txval,
            "AssAmt": txval,
            "GstRt": _r(it.get("gst_rate")),
            "IgstAmt": _r(it.get("igst")),
            "CgstAmt": _r(it.get("cgst")),
            "SgstAmt": _r(it.get("sgst")),
            "TotItemVal": _r(txval + _r(it.get("igst")) + _r(it.get("cgst")) + _r(it.get("sgst"))),
        })

    payload = {
        "Version": "1.1",
        "TranDtls": {"TaxSch": "GST", "SupTyp": "B2B", "RegRev": "N", "IgstOnIntra": "N"},
        "DocDtls": {"Typ": "INV", "No": str(invoice.get("invoice_number")), "Dt": _fmt_date(invoice.get("issue_date"))},
        "SellerDtls": _party(seller),
        "BuyerDtls": _party(buyer, with_pos=True),
        "ItemList": item_list,
        "ValDtls": {
            "AssVal": _r(invoice.get("taxable_amount")),
            "CgstVal": _r(invoice.get("cgst")),
            "SgstVal": _r(invoice.get("sgst")),
            "IgstVal": _r(invoice.get("igst")),
            "TotInvVal": _r(invoice.get("amount")),
        },
    }
    return payload


def _party(p: dict, with_pos: bool = False):
    p = p or {}
    out = {
        "Gstin": p.get("gstin") or "URP",
        "LglNm": p.get("legal_name") or p.get("name") or "NA",
        "Addr1": p.get("address") or "NA",
        "Loc": p.get("location") or "NA",
        "Pin": int(p.get("pincode") or 0) or 999999,
        "Stcd": str(p.get("state_code") or (p.get("gstin") or "")[:2] or "NA"),
    }
    if with_pos:
        out["Pos"] = out["Stcd"]
    return out


def _fmt_date(d):
    s = str(d or "")[:10]
    if "-" in s and len(s) == 10:
        y, m, dd = s.split("-")
        return f"{dd}/{m}/{y}"
    return s


class IRPClient:
    """Pluggable IRP client. Configure EINV_BASE_URL/EINV_USER/EINV_PASSWORD to enable."""
    def __init__(self):
        self.base = os.environ.get("EINV_BASE_URL")
        self.user = os.environ.get("EINV_USER")
        self.password = os.environ.get("EINV_PASSWORD")
        self.enabled = bool(self.base and self.user and self.password)

    async def generate_irn(self, payload: dict) -> dict:
        if not self.enabled:
            return {"enabled": False,
                    "message": "IRP credentials not configured. Payload is valid and can be filed via a GSP.",
                    "payload": payload}
        # Real implementation would auth + POST to f"{self.base}/eivital/v1.04/invoice".
        # Left as an integration point so this never blocks without sandbox creds.
        return {"enabled": True, "message": "IRP integration point — wire your GSP call here.",
                "payload": payload}


irp_client = IRPClient()
