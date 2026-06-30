import os
from dotenv import load_dotenv

def check():
    env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env.local")
    if os.path.exists(env_path):
        load_dotenv(env_path)
        print("Loaded .env.local")
    else:
        env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env")
        load_dotenv(env_path)
        print("Loaded .env")

    keys = ["GEMINI_API_KEY", "VITE_GEMINI_API_KEY", "GROQ_API_KEY", "VITE_GROQ_API_KEY"]
    for k in keys:
        val = os.environ.get(k)
        print(f"Key: {k} | Exists: {val is not None} | Length: {len(val) if val else 0}")

if __name__ == "__main__":
    check()
