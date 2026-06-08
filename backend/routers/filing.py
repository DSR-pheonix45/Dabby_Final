"""
Compliance filing endpoints: GSTR-1, GSTR-3B, TDS 26Q, and GST e-invoice payloads.
Returns portal-ready JSON derived from the stored invoices/bills + party tax ids.
"""
from fastapi import APIRouter, HTTPException
from supabase_client import supabase
from services import gst_returns_service as g1
from services import tds_service
from services import einvoice_service

router = APIRouter()


def _parties_map(workbench_id: str):
    rows = supabase.table("parties").select("id, name, gstin, pan, state_code").eq("workbench_id", workbench_id).execute().data or []
    return {r["id"]: r for r in rows}


def _wb(workbench_id: str):
    try:
        return supabase.table("workbenches").select("*").eq("id", workbench_id).single().execute().data or {}
    except Exception:
        return {}


def _enrich_invoices(workbench_id: str, period: str):
    pm = _parties_map(workbench_id)
    invs = supabase.table("invoices").select("*").eq("workbench_id", workbench_id).execute().data or []
    out = []
    for inv in invs:
        if period and not str(inv.get("issue_date", ""))[:7] == period:
            continue
        p = pm.get(inv.get("party_id"), {})
        inv = {**inv, "party_gstin": p.get("gstin"), "party_pan": p.get("pan"),
               "party_name": p.get("name"), "party_state_code": p.get("state_code")}
        out.append(inv)
    return out


def _enrich_bills(workbench_id: str, period: str = None):
    pm = _parties_map(workbench_id)
    bills = supabase.table("bills").select("*").eq("workbench_id", workbench_id).execute().data or []
    out = []
    for b in bills:
        if period and not str(b.get("issue_date", ""))[:7] == period:
            continue
        p = pm.get(b.get("party_id"), {})
        out.append({**b, "party_pan": p.get("pan"), "party_name": p.get("name")})
    return out


@router.get("/gstr1/{workbench_id}")
async def gstr1(workbench_id: str, period: str):
    try:
        wb = _wb(workbench_id)
        invoices = _enrich_invoices(workbench_id, period)
        return g1.build_gstr1(period, wb.get("gstin") or "", invoices)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/gstr3b/{workbench_id}")
async def gstr3b(workbench_id: str, period: str):
    try:
        wb = _wb(workbench_id)
        invoices = _enrich_invoices(workbench_id, period)
        bills = _enrich_bills(workbench_id, period)
        return g1.build_gstr3b(period, wb.get("gstin") or "", invoices, bills)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/tds26q/{workbench_id}")
async def tds26q(workbench_id: str, quarter: str = "Q1", fy: str = ""):
    try:
        wb = _wb(workbench_id)
        bills = _enrich_bills(workbench_id)
        deductor = {"tan": wb.get("tan") or "", "name": wb.get("name") or "", "pan": wb.get("pan") or ""}
        return tds_service.build_26q(quarter, fy, deductor, bills)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/einvoice/{invoice_id}")
async def einvoice(invoice_id: str):
    try:
        inv = supabase.table("invoices").select("*").eq("id", invoice_id).single().execute().data
        if not inv:
            raise HTTPException(status_code=404, detail="Invoice not found")
        wb = _wb(inv["workbench_id"])
        pm = _parties_map(inv["workbench_id"])
        buyer_p = pm.get(inv.get("party_id"), {})
        seller = {"gstin": wb.get("gstin"), "legal_name": wb.get("legal_name") or wb.get("name"),
                  "state_code": wb.get("state_code"), "pincode": wb.get("pincode"), "address": wb.get("address")}
        buyer = {"gstin": buyer_p.get("gstin"), "legal_name": buyer_p.get("name"),
                 "state_code": buyer_p.get("state_code"), "address": buyer_p.get("address")}
        payload = einvoice_service.build_einvoice_payload(inv, seller, buyer, inv.get("items_json") or [])
        result = await einvoice_service.irp_client.generate_irn(payload)
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
