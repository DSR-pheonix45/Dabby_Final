import os
import sys
import requests
import json

# Add backend directory to sys.path
sys.path.append(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "backend"))
from supabase_client import supabase
from services.ledger_service import LedgerService

# Define different documents to test
documents_to_test = {
    "vendor_bill": {
        "filename": "vendor_bill.txt",
        "content": """INVOICE
Vendor: Dunder Mifflin Paper Company
Customer: Chirayu Marathe
Invoice Number: DM-9992
Date: 2026-06-10
Due Date: 2026-07-10
Currency: USD

Line Items:
1. Premium Copy Paper - Qty: 10 - Price: $45.00 each
2. Blue Ink Pens - Qty: 2 - Price: $12.50 each

Subtotal: $475.00
Tax: $25.00
Total: $500.00
Payment due upon receipt.
"""
    },
    "bank_statement": {
        "filename": "bank_statement.txt",
        "content": """HDFC Bank Statement
Account Holder: Chirayu Marathe
Account Number: 501003928122
Statement Date: 2026-06-30
Currency: INR

Statement Period: 2026-06-01 to 2026-06-30
Starting Balance: 50,000.00 INR

Transactions:
1. 2026-06-12 - CREDIT - Ref: NEFT-778822 - Amount: 25,000.00 INR
2. 2026-06-15 - DEBIT  - Ref: RENT-88229 - Amount: 15,000.00 INR
3. 2026-06-25 - DEBIT  - Ref: BILL-1229  - Amount: 2,500.00 INR

Ending Balance: 57,500.00 INR
"""
    }
}

async def run_multi_document_test():
    print("==================================================")
    print("RUNNING MULTI-DOCUMENT PIPELINE AUDIT")
    print("==================================================")

    workbench_id = "8e9cb841-953a-4979-bf4e-c2eee8bd197b"
    ledger_service = LedgerService(supabase)

    # 1. Fetch labels and parties
    labels = await ledger_service.get_labels(workbench_id)
    parties_res = supabase.table("parties").select("*").eq("workbench_id", workbench_id).execute()
    parties = parties_res.data or []

    for doc_type, data in documents_to_test.items():
        print(f"\n>>> TESTING DOCUMENT TYPE: {doc_type.upper()} ({data['filename']})")
        print("--------------------------------------------------")

        # Create temporary file
        temp_file = data["filename"]
        with open(temp_file, "w") as f:
            f.write(data["content"])

        # Call pipeline upload endpoint
        print("[PIPELINE] Uploading & executing OCR -> Intent -> Journal Generator...")
        try:
            url = "http://localhost:8000/api/documents/process-pipeline-upload"
            files = {"file": (temp_file, open(temp_file, "rb"), "text/plain")}
            payload = {"workbench_id": workbench_id}
            
            response = requests.post(url, files=files, data=payload)
            if response.status_code != 200:
                print(f"ERROR: API returned {response.status_code}")
                print(response.text)
                continue
                
            res = response.json()
            print("SUCCESS: Pipeline executed successfully.")
        except Exception as e:
            print(f"ERROR calling pipeline endpoint: {e}")
            continue
        finally:
            if os.path.exists(temp_file):
                os.remove(temp_file)

        # Print Staging results
        ocr = res.get("ocr_extraction", {})
        event = res.get("accounting_event", {})
        journal = res.get("draft_journal", {})
        record_id = res.get("record_id")

        print("\n1. OCR EXTRACTION RESULT:")
        print(f"   - Document Type: {ocr.get('metadata', {}).get('document_type')}")
        print(f"   - Total Amount:  {ocr.get('financials', {}).get('total_amount')} {ocr.get('metadata', {}).get('currency') or 'INR'}")
        
        print("\n2. ACCOUNTING INTENT RESULT:")
        print(f"   - Classified Event:   {event.get('event_type')}")
        print(f"   - Confidence Score:    {event.get('confidence')}")
        print(f"   - Payment Status:      {event.get('payment_status')}")
        print(f"   - Staging Record ID:   {record_id}")
        
        print("\n3. DRAFT DOUBLE-ENTRY JOURNAL:")
        print(f"   - Description: {journal.get('description')}")
        print("   - Entries:")
        for entry in journal.get("entries", []):
            print(f"     * [{entry.get('entry_type')}] Account Label: '{entry.get('label')}' -> Amount: {entry.get('amount')} (Party ID: {entry.get('party')})")
        print("--------------------------------------------------")

if __name__ == "__main__":
    import asyncio
    asyncio.run(run_multi_document_test())
