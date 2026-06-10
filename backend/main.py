import os
import sys
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Add the current directory to sys.path so imports work
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Load env variables
env_local_path = os.path.join(os.path.dirname(__file__), '..', '.env.local')
env_path = os.path.join(os.path.dirname(__file__), '..', '.env')
print(f"[DEBUG] Loading environment from: {os.path.abspath(env_local_path)} and {os.path.abspath(env_path)}")
load_dotenv(env_local_path, override=True)
load_dotenv(env_path, override=False)

from routers import workbenches, ai, coa, ledger, ops, context, inventory, investor, tasks, budgets, records, subscriptions, usage
from jwt_middleware import JWTMiddleware

app = FastAPI(title="Datalis API", description="FastAPI Backend for Datalis", version="1.0.0")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
    "http://localhost:5176",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
    "http://127.0.0.1:5175",
    "http://127.0.0.1:5176",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add JWT verification middleware
app.add_middleware(JWTMiddleware)

app.include_router(workbenches.router, prefix="/api/workbenches", tags=["Workbenches"])
app.include_router(ai.router, prefix="/api/ai", tags=["AI"])
app.include_router(coa.router, prefix="/api/coa", tags=["COA"])
app.include_router(ledger.router, prefix="/api/ledger", tags=["Ledger"])
app.include_router(ops.router, prefix="/api/ops", tags=["Operations"])
app.include_router(context.router, prefix="/api/context", tags=["Context"])
app.include_router(inventory.router, prefix="/api/inventory", tags=["Inventory"])
app.include_router(investor.router, prefix="/api/investor", tags=["Investor"])
app.include_router(tasks.router, prefix="/api/tasks", tags=["Tasks"])
app.include_router(budgets.router, prefix="/api/budgets", tags=["Budgets"])
app.include_router(records.router, prefix="/api/records", tags=["Records"])
app.include_router(subscriptions.router, prefix="/api/subscriptions", tags=["Subscriptions"])
app.include_router(usage.router, prefix="/api/usage", tags=["Usage"])

@app.get("/health")
def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
