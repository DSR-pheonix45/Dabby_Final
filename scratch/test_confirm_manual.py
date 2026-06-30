import requests

def run_test():
    confirm_url = "http://localhost:8000/api/documents/confirm-record"
    record_id = "f070a431-35ce-48c0-9896-b167545f11bf"
    resp = requests.post(confirm_url, json={"record_id": record_id})
    print(f"Status Code: {resp.status_code}")
    print(f"Body: {resp.text}")

if __name__ == "__main__":
    run_test()
