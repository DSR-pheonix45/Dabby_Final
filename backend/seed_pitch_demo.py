import os
import sys
import uuid
import json
from datetime import datetime
from dotenv import load_dotenv

# Load env variables
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env.local'))
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

from supabase_client import supabase

def seed_demo(workbench_id: str):
    print(f"Starting seed for workbench: {workbench_id}")
    
    # 1. Seed Parties
    print("Seeding Parties...")
    parties = [
        {"workbench_id": workbench_id, "name": "AWS Cloud Services", "party_type": "vendor", "email": "billing@aws.com"},
        {"workbench_id": workbench_id, "name": "Acme Corp", "party_type": "customer", "email": "ap@acme.com"},
        {"workbench_id": workbench_id, "name": "WeWork", "party_type": "vendor", "email": "invoices@wework.com"},
        {"workbench_id": workbench_id, "name": "Global Tech", "party_type": "customer", "email": "finance@globaltech.com"},
        {"workbench_id": workbench_id, "name": "Legal Counsel LLC", "party_type": "vendor", "email": "billing@legalcounsel.com"}
    ]
    try:
        supabase.table("parties").insert(parties).execute()
        print("  ✅ Parties seeded.")
    except Exception as e:
        print(f"  ❌ Error seeding parties: {e}")

    # 2. Seed di_accounts (Ledger Values)
    print("Seeding Ledger Values (di_accounts)...")
    accounts = [
        {"workbench_id": workbench_id, "code": "1000", "name": "Cash", "category_code": "AST", "normal_balance": "debit", "is_postable": True, "is_system": True},
        {"workbench_id": workbench_id, "code": "2000", "name": "Accounts Payable", "category_code": "LIA", "normal_balance": "credit", "is_postable": True, "is_system": True},
        {"workbench_id": workbench_id, "code": "1200", "name": "Accounts Receivable", "category_code": "AST", "normal_balance": "debit", "is_postable": True, "is_system": True},
        {"workbench_id": workbench_id, "code": "4000", "name": "Software Revenue", "category_code": "REV", "normal_balance": "credit", "is_postable": True, "is_system": False},
        {"workbench_id": workbench_id, "code": "5990", "name": "SaaS Subscription", "category_code": "EXP", "normal_balance": "debit", "is_postable": True, "is_system": False},
        {"workbench_id": workbench_id, "code": "5000", "name": "Rent Expense", "category_code": "EXP", "normal_balance": "debit", "is_postable": True, "is_system": False}
    ]
    try:
        supabase.table("di_accounts").insert(accounts).execute()
        print("  ✅ Ledger Values seeded.")
    except Exception as e:
        print(f"  ❌ Error seeding accounts: {e}")

    # 3. Seed Documents & Analysis Notes (Invoices and JSON)
    print("Seeding Documents and JSON Analysis Notes...")
    try:
        docs = [
            {"id": str(uuid.uuid4()), "original_filename": "aws_june_invoice.pdf", "mime_type": "application/pdf", "size_bytes": 145000, "workbench_id": workbench_id, "storage_path": f"{workbench_id}/aws_june_invoice.pdf", "file_hash": str(uuid.uuid4())},
            {"id": str(uuid.uuid4()), "original_filename": "wework_lease_july.pdf", "mime_type": "application/pdf", "size_bytes": 210000, "workbench_id": workbench_id, "storage_path": f"{workbench_id}/wework_lease_july.pdf", "file_hash": str(uuid.uuid4())},
            {"id": str(uuid.uuid4()), "original_filename": "legal_retainer.pdf", "mime_type": "application/pdf", "size_bytes": 85000, "workbench_id": workbench_id, "storage_path": f"{workbench_id}/legal_retainer.pdf", "file_hash": str(uuid.uuid4())},
        ]
        
        for doc in docs:
            supabase.table("di_documents").insert(doc).execute()
            
            # Seed JSON analysis note
            analysis = {
                "predicted_label": "Operating Expense",
                "reasoning": f"Extracted from {doc['original_filename']} processing.",
                "document_metadata": {
                    "document_type": "Invoice",
                    "date": datetime.now().strftime("%Y-%m-%d"),
                },
                "financials": {
                    "total_amount": 1000.00,
                    "currency": "USD"
                },
                "proposed_journal_entries": [
                    { "account": "Expense Account", "type": "debit", "amount": 1000.00 },
                    { "account": "Accounts Payable", "type": "credit", "amount": 1000.00 }
                ]
            }
            supabase.table("di_analysis_notes").insert({
                "document_id": doc["id"],
                "classification_type": "expense",
                "extracted_data": analysis,
                "reasoning": "Mock JSON analysis for pitch demo.",
                "confidence": 0.98
            }).execute()

        print("  ✅ Documents & Analysis Notes seeded.")
    except Exception as e:
        print(f"  ❌ Error seeding documents: {e}")

    print("\n--- Seed Complete ---")
    print("NOTE: The Business Engine and OPS modules (AR/AP, Budgets, Journals) use the robust mock UI data hooks pre-wired in React to fully demo the pipeline without database dependencies during the pitch!")

if __name__ == "__main__":
    # If workbench_id passed as arg, use it. Otherwise use the user's active one.
    wb_id = sys.argv[1] if len(sys.argv) > 1 else "0fe2ed1f-2eed-4868-b464-a8bf23aa2e68"
    seed_demo(wb_id)
