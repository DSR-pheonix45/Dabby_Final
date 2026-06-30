import os
from groq import Groq
from dotenv import load_dotenv

def list_models():
    # Load env
    env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env.local")
    if os.path.exists(env_path):
        load_dotenv(env_path)
    else:
        env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env")
        load_dotenv(env_path)

    groq_key = os.environ.get("VITE_GROQ_API_KEY") or os.environ.get("GROQ_API_KEY")
    if not groq_key:
        print("ERROR: VITE_GROQ_API_KEY / GROQ_API_KEY not configured")
        return
    client = Groq(api_key=groq_key.strip().strip('"').strip("'"))
    models = client.models.list()
    for m in models.data:
        print(f"ID: {m.id} | Owned By: {m.owned_by}")

if __name__ == "__main__":
    list_models()
