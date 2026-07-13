import requests
import os
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv("SARVAM_API_KEY")

def test_sarvam_vision():
    # Let's try synchronous endpoint first if it exists, or the async one
    # I will just do a GET to see what it returns
    url = "https://api.sarvam.ai/document-intelligence/upload-url"
    headers = {
        "api-subscription-key": api_key,
        "Content-Type": "application/json"
    }
    data = {"file_name": "test.pdf"}
    response = requests.post(url, headers=headers, json=data)
    print("Response:", response.status_code, response.text)

if __name__ == "__main__":
    test_sarvam_vision()
