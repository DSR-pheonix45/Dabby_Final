import sys
import os
import google.generativeai as genai
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../backend')))
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '../.env.local'))
load_dotenv(os.path.join(os.path.dirname(__file__), '../.env'))

key = os.environ.get("GEMINI_API_KEY")
if not key:
    print("NO KEY FOUND")
    sys.exit(1)

genai.configure(api_key=key)

print("Listing models...")
try:
    for m in genai.list_models():
        if 'generateContent' in m.supported_generation_methods:
            print(m.name)
except Exception as e:
    print(f"Error: {e}")
