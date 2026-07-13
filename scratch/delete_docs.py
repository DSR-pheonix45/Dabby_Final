import os
import sys
from dotenv import load_dotenv

sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env.local'))
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

from supabase_client import supabase

import httpx

def delete_all_docs():
    try:
        from supabase_client import url, key
        headers = {
            "apikey": key,
            "Authorization": f"Bearer {key}"
        }
        # Delete all records from di_documents using REST API
        with httpx.Client() as client:
            resp = client.delete(f"{url}/rest/v1/di_documents?id=not.is.null", headers=headers)
            if resp.status_code >= 400:
                print(f"Failed to delete docs: {resp.text}")
            else:
                print("Successfully deleted all documents from di_documents.")
                
        # Let's also delete from di_document_processing_logs and di_analysis_notes just in case
        with httpx.Client() as client:
            client.delete(f"{url}/rest/v1/di_document_processing_logs?id=not.is.null", headers=headers)
            client.delete(f"{url}/rest/v1/di_analysis_notes?id=not.is.null", headers=headers)
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    delete_all_docs()
