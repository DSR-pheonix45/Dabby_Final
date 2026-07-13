import sarvamai
from sarvamai.client import SarvamAI
import os
from dotenv import load_dotenv
load_dotenv()
api_key = os.getenv("SARVAM_API_KEY")
client = SarvamAI(api_subscription_key=api_key)
print(dir(client.document_intelligence))
