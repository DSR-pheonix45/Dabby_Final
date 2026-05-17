import os
import sys

print("\n" + "="*40)
print("   DATALIS ENGINE DIAGNOSTIC")
print("="*40)
print(f"Python Location: {sys.executable}")
print(f"Python Version:  {sys.version}")
print(f"Current Path:    {os.getcwd()}")

print("\n--- Testing Imports ---")
try:
    import fastapi
    print("✅ fastapi: OK")
except Exception as e:
    print(f"❌ fastapi: FAILED ({e})")

try:
    from dotenv import load_dotenv
    print("✅ python-dotenv: OK")
except Exception as e:
    print(f"❌ python-dotenv: FAILED ({e})")

try:
    import groq
    print("✅ groq: OK")
except Exception as e:
    print(f"❌ groq: FAILED ({e})")

try:
    import supabase
    print("✅ supabase: OK")
except Exception as e:
    print(f"❌ supabase: FAILED ({e})")

print("\n--- Testing .env.local ---")
env_path = os.path.join(os.path.dirname(__file__), '..', '.env.local')
print(f"Target Path: {os.path.abspath(env_path)}")
if os.path.exists(env_path):
    print("✅ .env.local found!")
else:
    print("❌ .env.local NOT FOUND at this path")

print("="*40 + "\n")
