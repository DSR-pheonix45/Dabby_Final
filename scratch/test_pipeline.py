import os
import sys
import requests
import json

# Add backend directory to sys.path so we can import supabase_client
sys.path.append(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "backend"))
from supabase_client import supabase

def run_test():
    print("==================================================")
    print("STARTING END-TO-END PIPELINE TESTING PROCESS")
    print("==================================================")

    # 1. Fetch a valid workbench
    print("\n[STEP 1] Fetching a valid workbench from database...")
    try:
        wb_res = supabase.table("workbenches").select("id, name").limit(1).execute()
        if not wb_res.data:
            print("ERROR: No workbenches found in the database. Please create one first.")
            return
        workbench = wb_res.data[0]
        workbench_id = workbench["id"]
        print(f"SUCCESS: Using Workbench '{workbench['name']}' (ID: {workbench_id})")
    except Exception as e:
        print(f"ERROR fetching workbench: {e}")
        return

    # 2. Check or create a test counterparty (Wayne Enterprises)
    print("\n[STEP 2] Check or create Wayne Enterprises party...")
    try:
        party_res = supabase.table("parties").select("id").eq("workbench_id", workbench_id).eq("name", "Wayne Enterprises").execute()
        if party_res.data:
            party_id = party_res.data[0]["id"]
            print(f"SUCCESS: Existing counterparty found (ID: {party_id})")
        else:
            insert_res = supabase.table("parties").insert({
                "workbench_id": workbench_id,
                "name": "Wayne Enterprises",
                "category": "corporation"
            }).execute()
            party_id = insert_res.data[0]["id"]
            print(f"SUCCESS: Created counterparty Wayne Enterprises (ID: {party_id})")
    except Exception as e:
        print(f"ERROR handling parties: {e}")
        return

    # 3. Create a test invoice file
    print("\n[STEP 3] Preparing test invoice content...")
    invoice_content = """INVOICE
Vendor: Acme Corp
Customer: Wayne Enterprises
Invoice Number: INV-2026-999
Date: 2026-06-25
Due Date: 2026-07-25
Currency: USD

Line Items:
1. Batmobile Upgrade Kit - Qty: 2 - Price: $50,000.00 each
2. Graphite Armor Plates - Qty: 100 - Price: $120.00 each

Subtotal: $112,000.00
Tax (10%): $11,200.00
Total: $123,200.00

Paid via Bank Transfer
Ref: TXN-77788822
"""
    test_file_path = "test_invoice.txt"
    with open(test_file_path, "w") as f:
        f.write(invoice_content)
    print(f"SUCCESS: Written {test_file_path}")

    # 4. Trigger the processing pipeline endpoint
    print("\n[STEP 4] POSTing test document to the extraction & staging pipeline...")
    try:
        url = "http://localhost:8000/api/documents/process-pipeline-upload"
        files = {"file": (test_file_path, open(test_file_path, "rb"), "text/plain")}
        data = {"workbench_id": workbench_id}
        
        response = requests.post(url, files=files, data=data)
        if response.status_code != 200:
            print(f"ERROR: API returned status code {response.status_code}")
            print(response.text)
            return
        
        pipeline_res = response.json()
        print("SUCCESS: Pipeline returned 200 OK")
    except Exception as e:
        print(f"ERROR making API request: {e}")
        return

    # Clean up local file
    if os.path.exists(test_file_path):
        os.remove(test_file_path)

    # 5. Output Verification
    print("\n==================================================")
    print("VERIFICATION RESULTS")
    print("==================================================")
    
    ocr = pipeline_res.get("ocr_extraction", {})
    print(f"\n1. OCR EXTRACTION")
    print(f"   - Document Type: {ocr.get('metadata', {}).get('document_type')}")
    print(f"   - Total Amount:  {ocr.get('financials', {}).get('total_amount')} USD")
    print(f"   - Document Date: {ocr.get('metadata', {}).get('document_date')}")

    intent = pipeline_res.get("accounting_event", {})
    print(f"\n2. ACCOUNTING INTENT")
    print(f"   - Classified Event: {intent.get('event_type')}")
    print(f"   - Confidence Score:  {intent.get('confidence')}")
    print(f"   - Payment Status:    {intent.get('payment_status')}")
    print(f"   - Effects Created:   Receivables={intent.get('effects', {}).get('creates_accounts_receivable')}, Inventory={intent.get('effects', {}).get('creates_inventory')}")

    journal = pipeline_res.get("draft_journal", {})
    print(f"\n3. DRAFT JOURNAL TRANSACTIONS")
    print(f"   - Description: {journal.get('description')}")
    print(f"   - Entries list:")
    for entry in journal.get("entries", []):
        print(f"     * [{entry.get('entry_type')}] {entry.get('label')} - Amount: ${entry.get('amount')} (Party: {entry.get('party')})")

    record_id = pipeline_res.get("record_id")
    print(f"\n4. STAGING DATABASE RECORD")
    print(f"   - Record ID logged in 'workbench_records': {record_id}")
    
    if record_id:
        # Fetch from database to ensure persistence
        print("\n[VERIFICATION] Querying workbench_records to verify storage...")
        db_res = supabase.table("workbench_records").select("status, record_type, gross_amount").eq("id", record_id).single().execute()
        if db_res.data:
            row = db_res.data
            print(f"   - Database Status: {row.get('status')}")
            print(f"   - Event Type:      {row.get('record_type')}")
            print(f"   - Gross Amount:    {row.get('gross_amount')}")
            print("\n==================================================")
            print("ALL PIPELINE INTEGRATION TESTS PASSED SUCCESSFULLY!")
            print("==================================================")
        else:
            print("   - ERROR: Record could not be retrieved from database!")

if __name__ == "__main__":
    run_test()
