import requests
import traceback
import sys

url = "http://localhost:8000/api/di/documents/upload"
data = {"workbench_id": "0fe2ed1f-2eed-4868-b464-a8bf23aa2e68"} # Just some UUID
files = {"file": ("test.pdf", b"dummy content", "application/pdf")}

try:
    response = requests.post(url, data=data, files=files)
    print("STATUS:", response.status_code)
    print("RESPONSE:", response.text)
except Exception as e:
    print("CONNECTION FAILED:")
    traceback.print_exc()
