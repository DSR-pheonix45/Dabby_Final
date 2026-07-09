from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from supabase_client import supabase

router = APIRouter()

class COATemplateSeed(BaseModel):
    workbench_id: str
    template_id: str

@router.get("/templates")
async def get_coa_templates():
    try:
        res = supabase.table("di_coa_templates").select("*").execute()
        return res.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/accounts/{workbench_id}")
async def get_accounts(workbench_id: str):
    try:
        res = supabase.table("di_accounts").select("*").eq("workbench_id", workbench_id).execute()
        return res.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/seed")
async def seed_accounts_from_template(payload: COATemplateSeed):
    try:
        # 1. Fetch template accounts
        templates_res = supabase.table("di_template_accounts").select("*").execute()
        if not templates_res.data:
            raise HTTPException(status_code=500, detail="No template accounts found in global seeder.")
        
        # 2. Insert into di_accounts for this workbench
        accounts_to_insert = []
        for t in templates_res.data:
            accounts_to_insert.append({
                "workbench_id": payload.workbench_id,
                "template_account_code": t['code'],
                "code": t['code'],
                "name": t['name'],
                "category_code": t['category_code'],
                "normal_balance": t['normal_balance'],
                "is_postable": t['is_postable'],
                "is_system": True,
                "sort_order": t['sort_order']
            })
        
        inserted_accounts_res = supabase.table("di_accounts").insert(accounts_to_insert).execute()
        inserted_accounts = inserted_accounts_res.data
        
        # Build mapping from template_account_code to new di_accounts id
        code_to_account_id = {acc['code']: acc['id'] for acc in inserted_accounts}

        # 3. Fetch global AI labels
        labels_res = supabase.table("di_ai_labels").select("*").execute()
        if labels_res.data:
            # 4. Insert into di_workbench_labels
            labels_to_insert = []
            for l in labels_res.data:
                target_account_id = code_to_account_id.get(l['default_account_code'])
                if target_account_id:
                    labels_to_insert.append({
                        "workbench_id": payload.workbench_id,
                        "template_label_id": l['id'],
                        "name": l['name'],
                        "ledger_account_id": target_account_id,
                        "confidence_threshold": l['confidence_threshold']
                    })
            
            if labels_to_insert:
                supabase.table("di_workbench_labels").insert(labels_to_insert).execute()
                
        # 5. Insert Custom Demo Accounts
        demo_accounts = [
            {
                "workbench_id": payload.workbench_id,
                "code": "1800",
                "name": "Demo Tech Asset",
                "category_code": "AST",
                "normal_balance": "debit",
                "is_postable": True,
                "is_system": False,
                "sort_order": 90
            },
            {
                "workbench_id": payload.workbench_id,
                "code": "5990",
                "name": "Demo SaaS Subscription",
                "category_code": "EXP",
                "normal_balance": "debit",
                "is_postable": True,
                "is_system": False,
                "sort_order": 115
            }
        ]
        supabase.table("di_accounts").insert(demo_accounts).execute()

        # 6. Insert Demo Document and Journal Transaction
        import uuid
        from datetime import datetime
        
        doc_id = str(uuid.uuid4())
        supabase.table("di_documents").insert({
            "id": doc_id,
            "workbench_id": payload.workbench_id,
            "storage_path": f"{payload.workbench_id}/demo_invoice_aws.pdf",
            "original_filename": "demo_invoice_aws.pdf",
            "mime_type": "application/pdf",
            "size_bytes": 102400,
            "file_hash": doc_id
        }).execute()
        
        # Insert analysis note with proposed journals
        mock_analysis_data = {
            "predicted_label": "Software & SaaS",
            "reasoning": "This is a demo invoice for AWS cloud hosting.",
            "document_metadata": {
                "document_type": "Invoice",
                "date": datetime.now().strftime("%Y-%m-%d"),
                "reference_number": "AWS-123456"
            },
            "parties": {
                "vendor": "Amazon Web Services",
                "buyer": "Dabby User"
            },
            "financials": {
                "total_amount": 250.00,
                "tax_amount": 20.00,
                "subtotal": 230.00,
                "currency": "USD"
            },
            "proposed_journal_entries": [
                { "account": "5990 Demo SaaS Subscription", "type": "debit", "amount": 250.00 },
                { "account": "2000 Accounts Payable", "type": "credit", "amount": 250.00 }
            ]
        }
        
        supabase.table("di_analysis_notes").insert({
            "document_id": doc_id,
            "classification_type": "software & saas",
            "extracted_data": mock_analysis_data,
            "reasoning": "Mock generated for pitch demo.",
            "confidence": 0.99
        }).execute()
        
        return {"status": "success", "message": "Financial Language, Demo Labels, and Demo Journals successfully seeded."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

