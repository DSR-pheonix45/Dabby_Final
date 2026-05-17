import os
from groq import Groq
from dotenv import load_dotenv

load_dotenv('.env.local')
groq_key = os.environ.get("VITE_GROQ_API_KEY")
print(f"Groq Key present: {bool(groq_key)}")

if groq_key:
    client = Groq(api_key=groq_key.strip().strip('"').strip("'"))
    try:
        chat_completion = client.chat.completions.create(
            messages=[{"role": "user", "content": "Hello"}],
            model="llama-3.1-8b-instant",
        )
        print(f"Groq Response: {chat_completion.choices[0].message.content}")
    except Exception as e:
        print(f"Groq Error: {e}")


