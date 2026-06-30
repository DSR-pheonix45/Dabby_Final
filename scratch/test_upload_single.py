import requests
import os

def run_test():
    filepath = "/Users/chirayumarathe/Documents/Dabby_Final/backend/routers/0338e803-e024-4bae-bfcd-e0f88262770d/5f3wwj1zvy.pdf"
    upload_url = "http://localhost:8000/api/documents/process-pipeline-upload"
    workbench_id = "8e9cb841-953a-4979-bf4e-c2eee8bd197b"
    
    with open(filepath, "rb") as f:
        files = {"file": ("5f3wwj1zvy.pdf", f, "application/pdf")}
        data = {"workbench_id": workbench_id}
        print("Sending request...")
        resp = requests.post(upload_url, files=files, data=data, timeout=60)
        print(f"Status Code: {resp.status_code}")
        print(f"Response: {resp.text}")

if __name__ == "__main__":
    run_test()
