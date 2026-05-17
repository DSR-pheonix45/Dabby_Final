from fastapi import APIRouter, HTTPException
from typing import List, Optional, Dict
from pydantic import BaseModel
from datetime import date
from supabase_client import supabase
from services.ledger_service import LedgerService
from services.ai_service import ai_service
import uuid

router = APIRouter()
ledger_service = LedgerService(supabase)

class PartyCreate(BaseModel):
    workbench_id: str
    name: str
    category: str # individual, corporation, group
    email: Optional[str] = None
    phone: Optional[str] = None
    is_self: bool = False

class EntityCreate(BaseModel):
    party_id: str
    name: str
    type: str # bank, cash, property, legal_rep, upi
    metadata: Dict = {}

class InvoiceCreate(BaseModel):
    workbench_id: str
    party_id: str
    invoice_number: str
    amount: float
    issue_date: date
    due_date: Optional[date] = None
    description: Optional[str] = None
    items_json: Optional[List[Dict]] = []
    revenue_label_id: str # The Credit side (Revenue)
    ar_label_id: str      # The Debit side (AR Asset)
    doc_id: Optional[str] = None

class PaymentRequest(BaseModel):
    amount: float
    payment_date: date
    bank_label_id: str # The Debit side (Bank Asset)
    ar_label_id: str   # The Credit side (AR Asset)
    description: Optional[str] = None
    doc_id: Optional[str] = None


class BillCreate(BaseModel):
    workbench_id: str
    party_id: str
    bill_number: str
    amount: float
    issue_date: date
    due_date: Optional[date] = None
    category: str = "expense"
    description: Optional[str] = None
    items_json: Optional[List[Dict]] = []
    expense_label_id: str # The Debit side (Expense)
    ap_label_id: str      # The Credit side (AP Liability)
    doc_id: Optional[str] = None

class BillPaymentRequest(BaseModel):
    amount: float
    payment_date: date
    bank_label_id: str # The Credit side (Bank Asset)
    ap_label_id: str   # The Debit side (AP Liability)
    description: Optional[str] = None
    doc_id: Optional[str] = None


@router.post("/parties")
async def create_party(party: PartyCreate):
    try:
        response = supabase.table("parties").insert(party.dict()).execute()
        return response.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/parties/{workbench_id}")
async def list_parties(workbench_id: str):
    try:
        # Fetch parties with their entities
        response = supabase.table("parties").select("*, entities(*)").eq("workbench_id", workbench_id).execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/parties/initialize-self/{workbench_id}")
async def initialize_self_party(workbench_id: str):
    """
    Ensures a 'Self' party exists for the workbench.
    """
    try:
        # Check if already exists
        existing = supabase.table("parties").select("*").eq("workbench_id", workbench_id).eq("is_self", True).execute()
        if existing.data:
            return existing.data[0]
        
        # Create Self Party
        # Fetch workbench name to use as party name
        wb = supabase.table("workbenches").select("name").eq("id", workbench_id).execute()
        wb_name = wb.data[0]["name"] if wb.data else "My Company"
        
        party_res = supabase.table("parties").insert({
            "workbench_id": workbench_id,
            "name": wb_name,
            "category": "corporation",
            "is_self": True
        }).execute()
        
        return party_res.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/entities")
async def create_entity(entity: EntityCreate):
    try:
        # 1. Create the Entity (Vessel)
        response = supabase.table("entities").insert(entity.dict()).execute()
        new_entity = response.data[0]
        
        # 2. Automatically Create a Shadow Label for this Vessel
        # Fetch party to determine parenting
        party_res = supabase.table("parties").select("*").eq("id", entity.party_id).single().execute()
        party = party_res.data
        
        # Determine Parenting Pillar
        # We look for Level 2 Sub-accounts
        parent_sub_name = "Bank Accounts" # Default for self
        label_type = "asset"
        
        if not party.get("is_self"):
            # This is an external party. We check if they have invoices (Client) or bills (Vendor)
            # For simplicity in this version, we'll use 'Accounts Receivable (AR)' as default for clients
            # and 'Accounts Payable (AP)' for vendors.
            # We can distinguish by party category or metadata if needed.
            # For now, let's assume all external parties start in AR unless specified.
            parent_sub_name = "Accounts Receivable (AR)"
            label_type = "asset"
        
        # Find the parent sub-account ID
        parent_res = supabase.table("coa_accounts") \
            .select("id") \
            .eq("workbench_id", party["workbench_id"]) \
            .eq("name", parent_sub_name) \
            .eq("level", 2) \
            .execute()
        
        parent_id = parent_res.data[0]["id"] if parent_res.data else None
        
        # Create the Shadow Label
        # Note: We are using the existing 'labels' table. 
        # We'll use the 'sub_account' field to store the parent pillar name for now 
        # as a fallback since we might not have the is_shadow column yet.
        label_data = {
            "workbench_id": party["workbench_id"],
            "name": f"{party['name']} - {new_entity['name']}",
            "type": label_type,
            "sub_account": parent_sub_name,
            "is_system": False,
            "is_shadow": True,
            "vessel_id": new_entity["id"]
        }
        
        # If the migration was run, we can add these. If not, the insert will still work (Supabase ignores unknown columns usually)
        # But to be safe, let's try to keep it compatible.
        
        # 3. Save the Label and Link back to Entity
        label_res = supabase.table("labels").insert(label_data).execute()
        if label_res.data:
            label_id = label_res.data[0]["id"]
            # Update the entity with its shadow label ID
            supabase.table("entities").update({"label_id": label_id}).eq("id", new_entity["id"]).execute()
            new_entity["label_id"] = label_id
        
        return new_entity
    except Exception as e:
        print(f"[ERROR] create_entity: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/parties/{party_id}")
async def delete_party(party_id: str):
    try:
        response = supabase.table("parties").delete().eq("id", party_id).execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/entities/{entity_id}")
async def delete_entity(entity_id: str):
    try:
        response = supabase.table("entities").delete().eq("id", entity_id).execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- Invoice Endpoints ---

@router.post("/invoices")
async def create_invoice(invoice: InvoiceCreate):
    try:
        # 1. Create Invoice Record
        invoice_data = invoice.dict()
        invoice_data["balance_due"] = invoice.amount
        invoice_data["status"] = "sent"
        
        # Convert date objects to strings for supabase
        invoice_data["issue_date"] = str(invoice.issue_date)
        if invoice.due_date:
            invoice_data["due_date"] = str(invoice.due_date)
            
        res = supabase.table("invoices").insert(invoice_data).execute()
        new_invoice = res.data[0]
        
        # 2. Record Financial Transaction (Dr AR, Cr Revenue)
        tx_res = await ledger_service.record_transaction(
            workbench_id=invoice.workbench_id,
            from_label_id=invoice.revenue_label_id,
            to_label_id=invoice.ar_label_id,
            amount=invoice.amount,
            description=f"Invoice Issued: {invoice.invoice_number}",
            transaction_date=invoice.issue_date,
            destination_party_id=invoice.party_id,
            invoice_id=new_invoice["id"]
        )
        
        # 3. Record Inventory Impact for each item
        if invoice.items_json:
            from services.inventory_service import InventoryService
            inventory_service = InventoryService(supabase)
            
            transaction_id = tx_res["transaction"]["id"]
            for item in invoice.items_json:
                item_id = item.get("item_id")
                quantity = float(item.get("quantity", 0))
                
                if item_id and quantity > 0:
                    try:
                        await inventory_service.record_sale_impact(
                            workbench_id=invoice.workbench_id,
                            item_id=item_id,
                            quantity=quantity,
                            transaction_id=transaction_id,
                            transaction_date=invoice.issue_date
                        )
                    except Exception as inv_err:
                        print(f"[ERROR] Failed to record inventory impact for item {item_id}: {inv_err}")
                        # We don't fail the whole invoice if inventory fails, but we should log it
        
        # 4. Link Document if provided
        if invoice.doc_id:
            try:
                transaction_id = tx_res["transaction"]["id"]
                supabase.table("workbench_documents").update({
                    "transaction_id": transaction_id
                }).eq("id", invoice.doc_id).execute()
            except Exception as doc_err:
                print(f"[ERROR] Failed to link document {invoice.doc_id} to transaction: {doc_err}")
        
        return new_invoice
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/invoices/{workbench_id}")
async def list_invoices(workbench_id: str):
    try:
        res = supabase.table("invoices").select("*, parties(name), labels!revenue_label_id(name), ar_label:labels!ar_label_id(name)").eq("workbench_id", workbench_id).order("created_at", desc=True).execute()
        return res.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/invoices/scan/{doc_id}")
async def scan_invoice_doc(doc_id: str):
    try:
        # 1. Fetch document metadata
        doc_res = supabase.table("workbench_documents").select("*").eq("id", doc_id).single().execute()
        doc = doc_res.data
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found")
        
        print(f"[DEBUG] Scanning document: {doc_id}")
        print(f"[DEBUG] File Path: {doc.get('file_path')}")
        print(f"[DEBUG] Mime Type: {doc.get('mime_type')}")

        # 2. Download file content from Storage
        try:
            path = doc["file_path"]
            print(f"[DEBUG] Attempting download from Doc_vault_Raw: {path}")
            file_data = supabase.storage.from_("Doc_vault_Raw").download(path)
        except Exception as storage_err:
            print(f"[ERROR] Storage download failed for {path}: {storage_err}")
            raise HTTPException(status_code=500, detail=f"Failed to retrieve document: {str(storage_err)}")

        # 3. Process with AI Vision
        extracted = await ai_service.scan_document_vision(
            file_bytes=file_data,
            mime_type=doc.get("mime_type", "image/png"), # Fallback to png
            filename=doc["filename"]
        )
        
        # 4. Update document metadata with extracted info
        try:
            supabase.table("workbench_documents").update({
                "metadata": {**doc.get("metadata", {}), "extracted_invoice": extracted}
            }).eq("id", doc_id).execute()
        except Exception as db_err:
            print(f"[WARNING] Failed to update document metadata: {db_err}")
            # Non-fatal, we still return extracted data
        
        return extracted
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"[ERROR] scan_invoice_doc CRASH: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"AI Engine Error: {str(e)}")

@router.post("/invoices/{invoice_id}/payment")
async def record_payment(invoice_id: str, req: PaymentRequest):
    try:
        # 1. Fetch current invoice
        inv_res = supabase.table("invoices").select("*").eq("id", invoice_id).single().execute()
        invoice = inv_res.data
        if not invoice:
            raise HTTPException(status_code=404, detail="Invoice not found")
            
        new_balance = float(invoice["balance_due"]) - req.amount
        status = "paid" if new_balance <= 0 else "partial"
        
        # 2. Update Invoice
        supabase.table("invoices").update({
            "balance_due": max(0, new_balance),
            "status": status
        }).eq("id", invoice_id).execute()
        
        # 3. Record Financial Transaction (Dr Bank, Cr AR)
        tx_res = await ledger_service.record_transaction(
            workbench_id=invoice["workbench_id"],
            from_label_id=req.ar_label_id,
            to_label_id=req.bank_label_id,
            amount=req.amount,
            description=req.description or f"Payment received for Inv {invoice['invoice_number']}",
            transaction_date=req.payment_date,
            source_party_id=invoice["party_id"],
            invoice_id=invoice_id
        )
        
        # 4. Link Document if provided
        if req.doc_id:
            try:
                supabase.table("workbench_documents").update({
                    "transaction_id": tx_res["transaction"]["id"]
                }).eq("id", req.doc_id).execute()
            except Exception as doc_err:
                print(f"[ERROR] Failed to link document {req.doc_id} to payment: {doc_err}")

        
        return {"status": "success", "new_balance": new_balance}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/metrics/ar/{workbench_id}")
async def get_ar_metrics(workbench_id: str):
    try:
        # Fetch all non-paid invoices
        res = supabase.table("invoices").select("*").eq("workbench_id", workbench_id).neq("status", "paid").execute()
        invoices = res.data
        
        total_receivable = sum(float(inv["balance_due"]) for inv in invoices)
        
        # Calculate Aging
        today = date.today()
        aging = {"0-30": 0, "31-60": 0, "61-90": 0, "90+": 0}
        
        for inv in invoices:
            issue_date = date.fromisoformat(inv["issue_date"])
            days_old = (today - issue_date).days
            if days_old <= 30: aging["0-30"] += float(inv["balance_due"])
            elif days_old <= 60: aging["31-60"] += float(inv["balance_due"])
            elif days_old <= 90: aging["61-90"] += float(inv["balance_due"])
            else: aging["90+"] += float(inv["balance_due"])
            
        # Simple DSO calculation (Days Sales Outstanding)
        # DSO = (AR / Annual Revenue) * 365
        # For simplicity, we'll just show average days old of outstanding invoices
        if invoices:
            avg_days = sum((today - date.fromisoformat(inv["issue_date"])).days for inv in invoices) / len(invoices)
        else:
            avg_days = 0
            
        # Gross Revenue Calculation from Ledger
        labels = await ledger_service.get_labels(workbench_id)
        revenue_label_ids = [l["id"] for l in labels if l["type"] == "revenue"]
        
        balances = await ledger_service.get_balances(workbench_id)
        total_sales_revenue = sum(balances.get(lid, {}).get("gross", 0) for lid in revenue_label_ids)
            
        return {
            "total_receivable": total_receivable,
            "total_sales_revenue": total_sales_revenue,
            "aging": aging,
            "dso": round(avg_days, 1)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- Bill / AP Endpoints ---

@router.post("/bills")
async def create_bill(bill: BillCreate):
    try:
        # 1. Create Bill Record
        bill_data = bill.dict()
        bill_data["balance_due"] = bill.amount
        bill_data["status"] = "unpaid"
        
        bill_data["issue_date"] = str(bill.issue_date)
        if bill.due_date:
            bill_data["due_date"] = str(bill.due_date)
            
        res = supabase.table("bills").insert(bill_data).execute()
        new_bill = res.data[0]
        
        # 2. Record Financial Transaction (Dr Expense, Cr AP)
        await ledger_service.record_transaction(
            workbench_id=bill.workbench_id,
            from_label_id=bill.ap_label_id,     # Source of obligation (Liability)
            to_label_id=bill.expense_label_id, # Destination of value (Expense)
            amount=bill.amount,
            description=f"Bill Recorded: {bill.bill_number}",
            transaction_date=bill.issue_date,
            source_party_id=bill.party_id,
            bill_id=new_bill["id"]
        )
        
        # 3. Link Document if provided
        if bill.doc_id:
            try:
                transaction_id = tx_res["transaction"]["id"]
                supabase.table("workbench_documents").update({
                    "transaction_id": transaction_id
                }).eq("id", bill.doc_id).execute()
            except Exception as doc_err:
                print(f"[ERROR] Failed to link document {bill.doc_id} to transaction: {doc_err}")
        
        return new_bill
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/bills/{workbench_id}")
async def list_bills(workbench_id: str):
    try:
        res = supabase.table("bills").select("*, parties(name), labels!expense_label_id(name), ap_label:labels!ap_label_id(name)").eq("workbench_id", workbench_id).order("created_at", desc=True).execute()
        return res.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/bills/{bill_id}/payment")
async def record_bill_payment(bill_id: str, req: BillPaymentRequest):
    try:
        # 1. Fetch current bill
        bill_res = supabase.table("bills").select("*").eq("id", bill_id).single().execute()
        bill = bill_res.data
        if not bill:
            raise HTTPException(status_code=404, detail="Bill not found")
            
        new_balance = float(bill["balance_due"]) - req.amount
        status = "paid" if new_balance <= 0 else "partial"
        
        # 2. Update Bill
        supabase.table("bills").update({
            "balance_due": max(0, new_balance),
            "status": status
        }).eq("id", bill_id).execute()
        
        # 3. Record Financial Transaction (Dr AP, Cr Bank)
        tx_res = await ledger_service.record_transaction(
            workbench_id=bill["workbench_id"],
            from_label_id=req.bank_label_id, # Source of value (Bank Asset)
            to_label_id=req.ap_label_id,    # Destination (Reducing Liability)
            amount=req.amount,
            description=req.description or f"Payment made for Bill {bill['bill_number']}",
            transaction_date=req.payment_date,
            destination_party_id=bill["party_id"],
            bill_id=bill_id
        )
        
        # 4. Link Document if provided
        if req.doc_id:
            try:
                supabase.table("workbench_documents").update({
                    "transaction_id": tx_res["transaction"]["id"]
                }).eq("id", req.doc_id).execute()
            except Exception as doc_err:
                print(f"[ERROR] Failed to link document {req.doc_id} to bill payment: {doc_err}")

        
        return {"status": "success", "new_balance": new_balance}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/metrics/ap/{workbench_id}")
async def get_ap_metrics(workbench_id: str):
    try:
        # Fetch all non-paid bills
        res = supabase.table("bills").select("*").eq("workbench_id", workbench_id).neq("status", "paid").execute()
        bills = res.data
        
        total_payable = sum(float(b["balance_due"]) for b in bills)
        
        # Calculate Aging
        today = date.today()
        aging = {"0-30": 0, "31-60": 0, "61-90": 0, "90+": 0}
        
        for b in bills:
            issue_date = date.fromisoformat(b["issue_date"])
            days_old = (today - issue_date).days
            if days_old <= 30: aging["0-30"] += float(b["balance_due"])
            elif days_old <= 60: aging["31-60"] += float(b["balance_due"])
            elif days_old <= 90: aging["61-90"] += float(b["balance_due"])
            else: aging["90+"] += float(b["balance_due"])
            
        if bills:
            avg_days = sum((today - date.fromisoformat(b["issue_date"])).days for b in bills) / len(bills)
        else:
            avg_days = 0
            
        # Gross Expense Calculation from Ledger
        labels = await ledger_service.get_labels(workbench_id)
        expense_label_ids = [l["id"] for l in labels if l["type"] == "expense"]
        
        balances = await ledger_service.get_balances(workbench_id)
        total_gross_expense = sum(balances.get(lid, {}).get("gross", 0) for lid in expense_label_ids)
            
        return {
            "total_payable": total_payable,
            "total_gross_expense": total_gross_expense,
            "aging": aging,
            "dpo": round(avg_days, 1) # Days Payable Outstanding
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/entities/workbench/{workbench_id}")
async def list_workbench_entities(workbench_id: str):
    try:
        # Fetch all entities for the workbench
        res = supabase.table("entities") \
            .select("*, parties!inner(*)") \
            .eq("parties.workbench_id", workbench_id) \
            .execute()
        return res.data
    except Exception as e:
        print(f"[ERROR] list_workbench_entities: {e}")
        raise HTTPException(status_code=500, detail=str(e))
