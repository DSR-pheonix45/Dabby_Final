import requests

url = "http://localhost:8000/api/di/documents/upload"
data = {"workbench_id": "0fe2ed1f-2eed-4868-b464-a8bf23aa2e68"} # Replace with any uuid
files = {"file": ("test.pdf", b"dummy content", "application/pdf")}

response = requests.post(url, data=data, files=files)
print(response.status_code)
print(response.text)
