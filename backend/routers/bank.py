"""
Bank statement reconciliation endpoint. The frontend parses the statement file
(CSV/Excel/PDF) into rows and posts them; we fetch the ledger and auto-match.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Optional
from supabase_client import supabase
from services.ledger_service import LedgerService
from services import bank_recon_service

router = APIRouter()
ledger_service = LedgerService(supabase)


class ReconcileRequest(BaseModel):
    lines: List[Dict]            # [{date, amount|debit|credit, description}]
    date_window: Optional[int] = 4
    amount_tol: Optional[float] = 1.0


@router.post("/reconcile/{workbench_id}")
async def reconcile(workbench_id: str, req: ReconcileRequest):
    try:
        ledger = await ledger_service.get_transactions_list(workbench_id)
        result = bank_recon_service.match_statement(
            req.lines, ledger, date_window=req.date_window or 4, amount_tol=req.amount_tol or 1.0
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
