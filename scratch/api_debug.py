import requests
import json

url = "http://localhost:8000/api/ledger/transactions"
payload = {
    "workbench_id": "0338e803-e024-4bae-bfcd-e0f88262770d",
    "from_label_id": "5d89b121-adb6-4d0f-a444-1d4fdd47d38f",
    "to_label_id": "762bf5da-3d97-4445-9c30-5e4426a1bdb6",
    "amount": 100.0,
    "description": "API Debug Transaction",
    "transaction_date": "2026-05-04"
}

try:
    response = requests.post(url, json=payload)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"ERROR: {e}")
