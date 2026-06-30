import os
import sys
import requests
import mimetypes
import time

def run_ocr_test():
    doc_dir = "/Users/chirayumarathe/Documents/Dabby_Final/backend/routers/0338e803-e024-4bae-bfcd-e0f88262770d"
    workbench_id = "8e9cb841-953a-4979-bf4e-c2eee8bd197b"
    
    upload_url = "http://127.0.0.1:8000/api/documents/process-pipeline-upload"
    confirm_url = "http://127.0.0.1:8000/api/documents/confirm-record"
    
    if not os.path.exists(doc_dir):
        print(f"ERROR: Directory not found: {doc_dir}")
        return

    files = sorted(os.listdir(doc_dir))
    print("==================================================")
    # Filter files to exclude hidden files
    test_files = [f for f in files if not f.startswith(".")]
    print(f"FOUND {len(test_files)} DOCUMENTS TO TEST IN {doc_dir}")
    print("==================================================")

    for i, filename in enumerate(test_files, 1):
        if i > 1:
            print("[INFO] Sleeping 5 seconds to prevent rate limits...")
            time.sleep(5)
        filepath = os.path.join(doc_dir, filename)
        mime_type, _ = mimetypes.guess_type(filepath)
        if not mime_type:
            if filename.endswith(".png"):
                mime_type = "image/png"
            elif filename.endswith(".pdf"):
                mime_type = "application/pdf"
            else:
                mime_type = "application/octet-stream"

        filesize_kb = os.path.getsize(filepath) / 1024.0
        
        print(f"\n[{i}/{len(test_files)}] TESTING FILE: {filename} ({mime_type}, {filesize_kb:.1f} KB)")
        print("-" * 50)
        
        if filesize_kb > 2000.0:
            print("[INFO] Skipping large file (> 2MB) to prevent localhost upload timeouts.")
            continue
        
        try:
            with open(filepath, "rb") as f:
                upload_files = {"file": (filename, f, mime_type)}
                payload = {"workbench_id": workbench_id}
                
                print("[API] Uploading & running OCR/intent pipeline...")
                resp = requests.post(upload_url, files=upload_files, data=payload, timeout=180)
                
            if resp.status_code != 200:
                print(f"❌ PIPELINE ERROR (Status {resp.status_code}):")
                print(resp.text)
                continue
                
            res = resp.json()
            ocr = res.get("ocr_extraction", {})
            event = res.get("accounting_event", {})
            journal = res.get("draft_journal", {})
            record_id = res.get("record_id")
            
            print("✅ PIPELINE SUCCESS:")
            print(f"   * Extracted Document Type: {ocr.get('metadata', {}).get('document_type')}")
            print(f"   * Total Amount: {ocr.get('financials', {}).get('total_amount')} {ocr.get('metadata', {}).get('currency') or 'CAD'}")
            print(f"   * Classified Event: {event.get('event_type')}")
            print(f"   * Confidence Score: {event.get('confidence')}")
            print(f"   * Record logged (ID): {record_id}")
            print(f"   * Draft Journal description: {journal.get('description')}")
            
            entries = journal.get("entries", [])
            print(f"   * Draft Journal Entries count: {len(entries)}")
            for entry in entries:
                print(f"     - [{entry.get('entry_type')}] Label: '{entry.get('label')}' | Amount: {entry.get('amount')}")
                
            # If record_id is present, let's test confirming/posting it to the ledger!
            if record_id:
                print(f"[API] Confirming & posting record {record_id} to ledger...")
                confirm_resp = requests.post(confirm_url, json={"record_id": record_id})
                if confirm_resp.status_code == 200:
                    print(f"   * ✅ Post Ledger Success: {confirm_resp.json()}")
                else:
                    print(f"   * ❌ Post Ledger Failed (Status {confirm_resp.status_code}): {confirm_resp.text}")
                    
        except Exception as e:
            print(f"❌ ERROR testing file {filename}: {e}")

if __name__ == "__main__":
    run_ocr_test()
