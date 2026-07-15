import asyncio
import os
import sys

# Set path to backend
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend')))

from dotenv import load_dotenv
load_dotenv(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '.env.local')))

async def main():
    try:
        from services.ai_service import ai_service
        print("AIService loaded")
        res = await ai_service.scan_company_master_import(b"test data", "text/plain")
        print("Result:", res)
    except Exception as e:
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
