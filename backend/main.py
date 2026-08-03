import os
import sys
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Add the current directory to sys.path so imports work
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Load env variables
env_path = os.path.join(os.path.dirname(__file__), '..', '.env.local')
if os.path.exists(env_path):
    load_dotenv(env_path)
else:
    env_path = os.path.join(os.path.dirname(__file__), '..', '.env')
    load_dotenv(env_path)


import auth
from routers import ai, coa, ledger, ops, context, inventory, investor, tasks, budgets, assets, rulesets, plans, superadmin, ingestion, settlements, collaboration, di_coa, di_documents, di_ledger, workbench_accounts, petty_cash, coa_translation

app = FastAPI(title="Datalis API", description="FastAPI Backend for Datalis", version="1.0.0")


# Configure CORS.
# In production the frontend calls /api/* on its own origin (Vercel) and Vercel
# rewrites that server-side to this backend, so CORS usually isn't triggered.
# We still allow localhost (dev) + any *.vercel.app + an optional FRONTEND_ORIGIN
# (comma-separated) for direct browser calls / previews.
_extra_origins = [o.strip() for o in os.environ.get("FRONTEND_ORIGIN", "").split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5174",
        "http://localhost:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:5173",
    ] + _extra_origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Include Routers
app.include_router(ai.router, prefix="/api/ai", tags=["AI"])
app.include_router(budgets.router, prefix="/api/budgets", tags=["Budgets"])
app.include_router(ledger.router, prefix="/api/ledger", tags=["Ledger"])
app.include_router(coa.router, prefix="/api/coa", tags=["Chart of Accounts"])
app.include_router(coa_translation.router, prefix="/api/coa-translation", tags=["Universal COA Translation"])
app.include_router(ingestion.router, prefix="/api/ingestion", tags=["Data Ingestion"])
app.include_router(superadmin.router, prefix="/api/superadmin", tags=["Superadmin"])
app.include_router(tasks.router, prefix="/api/tasks", tags=["Tasks"])
app.include_router(plans.router, prefix="/api/plans", tags=["Plans"])
app.include_router(investor.router, prefix="/api/investor", tags=["Investor"])
app.include_router(rulesets.router, prefix="/api/rulesets", tags=["Rulesets"])
app.include_router(inventory.router, prefix="/api/inventory", tags=["Inventory"])
app.include_router(collaboration.router, prefix="/api/collaboration", tags=["Collaboration"])
app.include_router(context.router, prefix="/api/context", tags=["Context Analysis"])
app.include_router(di_coa.router, prefix="/api/di/coa", tags=["Document Intelligence COA"])
app.include_router(di_documents.router, prefix="/api/di/documents", tags=["Document Intelligence Vault"])
app.include_router(di_ledger.router, prefix="/api/di/ledger", tags=["Universal Ledger"])
app.include_router(settlements.router, prefix="/api/settlements", tags=["Settlements"])
app.include_router(workbench_accounts.router, prefix="/api/workbench-accounts", tags=["Workbench Accounts"])
app.include_router(petty_cash.router, prefix="/api/petty-cash", tags=["Petty Cash"])

@app.get("/health")
def health_check():
    return {"status": "healthy"}

@app.on_event("startup")
async def startup_event():
    from services import queue_service
    queue_service.start_worker()
    print("[STARTUP] Document processing queue worker launched successfully")
    
    # Auto-seed Groq API Key if table is empty
    try:
        from supabase_client import supabase
        res = supabase.table("groq_api_keys").select("id").limit(1).execute()
        if not res.data:
            env_key = os.environ.get("VITE_GROQ_API_KEY") or os.environ.get("GROQ_API_KEY")
            if env_key:
                sanitized = env_key.strip().strip('"').strip("'")
                supabase.table("groq_api_keys").insert({
                    "api_key": sanitized,
                    "label": "Primary Env Key",
                    "status": "active"
                }).execute()
                print("[STARTUP] Successfully seeded primary Groq API key from environment variables into database.")
    except Exception as e:
        print(f"[STARTUP] Warning: Could not seed Groq key (table may not exist yet): {e}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
    # Touch to reload: 2026-07-05T12:33:00
