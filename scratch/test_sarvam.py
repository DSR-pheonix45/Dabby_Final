import os
import requests

api_key = "sk_n2y6yc8k_OdPMYIbzAsS4KyBRxkIKpUV8"
try:
    from sarvamai.client import SarvamAI
    client = SarvamAI(api_subscription_key=api_key)
    print("Sarvam client initialized!")
except Exception as e:
    print(f"Error initializing Sarvam client: {e}")
