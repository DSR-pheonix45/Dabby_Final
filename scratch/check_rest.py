import json
import urllib.request

url = "https://rdwrxipstlogfthhveim.supabase.co/rest/v1/workbenches?select=*"
headers = {
    "apikey": "sb_publishable_lajEsk-4nacDOF3Fgg_VXw_wDlj12YT",
    "Authorization": "Bearer sb_publishable_lajEsk-4nacDOF3Fgg_VXw_wDlj12YT"
}

req = urllib.request.Request(url, headers=headers)
try:
    with urllib.request.urlopen(req) as response:
        data = json.loads(response.read().decode())
        print(f"Total workbenches from REST: {len(data)}")
        for r in data:
            print(f"ID: {r['id']}, Name: {r['name']}")
except Exception as e:
    print("Error:", e)
