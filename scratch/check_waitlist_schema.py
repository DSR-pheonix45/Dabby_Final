import requests
import json

url = "https://rdwrxipstlogfthhveim.supabase.co/rest/v1/"
service_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkd3J4aXBzdGxvZ2Z0aGh2ZWltIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzU2MzM2MiwiZXhwIjoyMDg5MTM5MzYyfQ.i3ZhTBfC6DxGrsoNvL4kV2BmSJME3YABHbCH-2vIl_I"
headers = {
    "apikey": service_key,
    "Authorization": f"Bearer {service_key}"
}

r = requests.get(url, headers=headers)
if r.status_code == 200:
    schema = r.json()
    waitlist_schema = schema.get("definitions", {}).get("waitlist", {})
    print("Waitlist Table Definition:")
    print(json.dumps(waitlist_schema, indent=2))
else:
    print("Failed to fetch schema:", r.status_code, r.text)
