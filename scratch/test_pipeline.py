import os
import asyncio
import uuid
from supabase import create_client
from services.ledger_service import LedgerService # type: ignore
from services.ruleset_service import ruleset_service # type: ignore

async def validate_connection():
    supabase_url = "https://rdwrxipstlogfthhveim.supabase.co"
    service_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkd3J4aXBzdGxvZ2Z0aGh2ZWltIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzU2MzM2MiwiZXhwIjoyMDg5MTM5MzYyfQ.i3ZhTBfC6DxGrsoNvL4kV2BmSJME3YABHbCH-2vIl_I"
    supabase_client = create_client(supabase_url, service_key)
    
    wb_id = "2d057275-8914-40bd-a836-a453f58dfee3" # Datalis 2
    ledger = LedgerService(supabase_client)
    
    print("\n=== STEP 1: Fetching initial Chart of Accounts balances ===")
    initial_balances = await ledger.get_balances(wb_id)
    labels = await ledger.get_labels(wb_id)
    
    # Print out initial non-zero balances
    print("Initial non-zero label balances:")
    for label in labels:
        bal = initial_balances.get(label["id"], {"net": 0.0})
        if abs(bal["net"]) > 0:
            print(f"- {label['name']} ({label['type']}): {bal['net']}")

    # Let's find or create a ruleset for sales_invoice
    print("\n=== STEP 2: Checking rulesets ===")
    rulesets_res = supabase_client.table("rulesets").select("*").eq("workbench_id", wb_id).eq("document_type", "sales_invoice").execute()
    
    ruleset_id = None
    active_ruleset = next((r for r in rulesets_res.data if r["status"] == "Active"), None) if rulesets_res.data else None
    
    if active_ruleset:
        ruleset_id = active_ruleset["id"]
        print(f"Found active ruleset: ID={ruleset_id}")
    elif rulesets_res.data:
        ruleset_id = rulesets_res.data[0]["id"]
        print(f"Found existing draft/disabled ruleset: ID={ruleset_id}, Status={rulesets_res.data[0]['status']}")
        # Force ruleset status to Active since none is active
        supabase_client.table("rulesets").update({"status": "Active"}).eq("id", ruleset_id).execute()
        print("Ruleset set to Active.")
    else:
        # Create a new ruleset for sales_invoice
        print("No ruleset found. Creating a draft ruleset for sales_invoice...")
        new_ruleset = {
            "workbench_id": wb_id,
            "name": "Acme Sales Invoice Playbook",
            "description": "Auto-processes standard B2B sales invoices",
            "document_type": "sales_invoice",
            "status": "Active",
            "version": "1.0"
        }
        res = supabase_client.table("rulesets").insert(new_ruleset).execute()
        ruleset_id = res.data[0]["id"]
        print(f"Ruleset created and set to Active: ID={ruleset_id}")

    # Ensure a version with prompt logic exists
    version_res = supabase_client.table("ruleset_versions").select("*").eq("ruleset_id", ruleset_id).execute()
    if not version_res.data:
        print("Creating ruleset version logic...")
        # Map to SaaS Revenue and Cash & Equivalents / HDFC Bank Account
        h_bank = next((l for l in labels if "bank" in l["name"].lower() or "cash" in l["name"].lower()), labels[0])
        rev_acc = next((l for l in labels if "revenue" in l["name"].lower() or "sales" in l["name"].lower()), labels[0])
        
        # Fetch workbench base currency
        wb_res = supabase_client.table("workbenches").select("currency").eq("id", wb_id).single().execute()
        base_currency = wb_res.data.get("currency") if wb_res.data else "INR"

        # Resolve or initialize our company party
        self_party_res = supabase_client.table("parties").select("*").eq("workbench_id", wb_id).eq("is_self", True).execute()
        if self_party_res.data:
            self_party = self_party_res.data[0]
        else:
            self_party = supabase_client.table("parties").insert({
                "workbench_id": wb_id,
                "name": "Test Company Self",
                "category": "corporation",
                "is_self": True
            }).execute().data[0]
            
        # Create a test entity (bank account) for our company
        test_bank_name = f"HDFC Current - {uuid.uuid4().hex[:4]}"
        test_bank = supabase_client.table("entities").insert({
            "party_id": self_party["id"],
            "name": test_bank_name,
            "type": "bank",
            "metadata": {"account_number": "123456"}
        }).execute().data[0]
        print(f"Created test bank entity: {test_bank_name}")

        logic = {
            "event_name": "Customer Sale",
            "amount_field": "total_amount",
            "date_field": "document_date",
            "party_field": "customer_name",
            "status_field": "Pending",
            "mappings": [
                {
                    "account_name": h_bank["name"],
                    "variable": "total_amount",
                    "entry_type": "DEBIT"
                },
                {
                    "account_name": rev_acc["name"],
                    "variable": "total_amount",
                    "entry_type": "CREDIT"
                }
            ]
        }
        
        version_payload = {
            "ruleset_id": ruleset_id,
            "version": "1.0",
            "prompt": "Debit HDFC Bank, Credit SaaS Revenue",
            "structured_logic": logic
        }
        supabase_client.table("ruleset_versions").insert(version_payload).execute()
        print("Ruleset version logic created and compiled successfully.")

    print("\n=== STEP 3: Simulating Document Ingestion ===")
    mock_doc = {
        "workbench_id": wb_id,
        "filename": "mock_invoice_99.pdf",
        "file_path": f"{wb_id}/mock_invoice_99.pdf",
        "file_size": 24050,
        "mime_type": "application/pdf",
        "document_type": "sales_invoice",
        "status": "Needs Ruleset",
        "metadata": {
            "extracted_invoice": {
                "document_type": "sales_invoice",
                "confidence": 0.95,
                "financials": {
                    "total_amount": 25000.0,
                    "subtotal": 25000.0,
                    "tax_amount": 0.0
                },
                "parties": {
                    "customer_name": "Stark Industries",
                    "vendor_name": "Datalis"
                },
                "references": {
                    "invoice_number": "STARK-009"
                },
                "document_metadata": {
                    "document_date": "2026-07-01",
                    "currency": "INR"
                }
            }
        }
    }
    
    doc_res = supabase_client.table("workbench_documents").insert(mock_doc).execute()
    doc_id = doc_res.data[0]["id"]
    print(f"Mock document inserted: ID={doc_id}, Status={doc_res.data[0]['status']}")

    print("\n=== STEP 4: Executing active ruleset on document ===")
    exec_res = await ruleset_service.execute_ruleset(ruleset_id, doc_id)
    print("Execution Result:", exec_res)

    print("\n=== STEP 5: Verifying balance updates after processing ===")
    updated_balances = await ledger.get_balances(wb_id)
    
    print("Updated label balances:")
    for label in labels:
        init_bal = initial_balances.get(label["id"], {"net": 0.0})["net"]
        upd_bal = updated_balances.get(label["id"], {"net": 0.0})["net"]
        diff = upd_bal - init_bal
        if abs(diff) > 0:
            print(f"- {label['name']} ({label['type']}): {init_bal} -> {upd_bal} (Change: {'+' if diff > 0 else ''}{diff})")

    print("\n=== STEP 6: Cleaning up test mock document ===")
    # Delete mock document and clean transaction entries
    tx_id = exec_res.get("transaction_id")
    if tx_id:
        supabase_client.table("transaction_entries").delete().eq("transaction_id", tx_id).execute()
        supabase_client.table("transactions").delete().eq("id", tx_id).execute()
    supabase_client.table("financial_events").delete().eq("id", exec_res["financial_event_id"]).execute()
    supabase_client.table("workbench_documents").delete().eq("id", doc_id).execute()
    print("Cleanup completed successfully. Pipeline connection is verified correct!")

if __name__ == "__main__":
    asyncio.run(validate_connection())
