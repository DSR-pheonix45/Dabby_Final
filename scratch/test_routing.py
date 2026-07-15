from fastapi import FastAPI, APIRouter
from fastapi.testclient import TestClient

router = APIRouter()

@router.get("/{workbench_id}")
async def get_accounts(workbench_id: str):
    return {"msg": "get"}

@router.post("/")
async def create_account():
    return {"msg": "post"}

app = FastAPI()
app.include_router(router, prefix="/api/workbench-accounts")

client = TestClient(app)

print("GET /api/workbench-accounts/123", client.get("/api/workbench-accounts/123").status_code)
print("POST /api/workbench-accounts/", client.post("/api/workbench-accounts/").status_code)
print("POST /api/workbench-accounts", client.post("/api/workbench-accounts").status_code)
