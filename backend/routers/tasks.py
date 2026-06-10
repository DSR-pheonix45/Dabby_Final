from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from pydantic import BaseModel
from supabase_client import supabase
from datetime import date
from .auth_utils import require_membership, get_user_id_from_header

router = APIRouter()

class TaskCreate(BaseModel):
    workbench_id: str
    title: str
    description: Optional[str] = None
    assigned_to: Optional[str] = None
    priority: str = "medium"
    due_date: Optional[date] = None

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    assigned_to: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    due_date: Optional[date] = None

@router.get("/{workbench_id}")
async def list_tasks(workbench_id: str, x_user_id: str = Depends(get_user_id_from_header)):
    try:
        await require_membership(workbench_id, x_user_id)
        # 1. Fetch tasks
        tasks_res = supabase.table("workbench_tasks").select("*").eq("workbench_id", workbench_id).order("created_at", desc=True).execute()
        tasks = tasks_res.data
        if not tasks:
            return []

        # 2. Batch fetch user names to avoid join errors
        user_ids = list(set(t["assigned_to"] for t in tasks if t["assigned_to"]))
        user_map = {}
        if user_ids:
            users_res = supabase.table("users").select("id, name").in_("id", user_ids).execute()
            user_map = {u["id"]: u["name"] for u in users_res.data}

        # 3. Merge names into task objects
        for t in tasks:
            if t["assigned_to"]:
                t["assigned_user"] = {"name": user_map.get(t["assigned_to"], "Unknown Member")}
            else:
                t["assigned_user"] = None
        
        return tasks
    except Exception as e:
        print(f"[ERROR] list_tasks: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/")
async def create_task(task: TaskCreate, x_user_id: str = Depends(get_user_id_from_header)):
    try:
        task_data = task.dict()
        await require_membership(task.workbench_id, x_user_id)
        # Convert date to string for Supabase serialization
        if task.due_date:
            task_data["due_date"] = str(task.due_date)
            
        res = supabase.table("workbench_tasks").insert(task_data).execute()
        if not res.data:
            raise HTTPException(status_code=400, detail="Failed to create task")
        return res.data[0]
    except Exception as e:
        print(f"[ERROR] create_task: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/{task_id}")
async def update_task(task_id: str, task: TaskUpdate, x_user_id: str = Depends(get_user_id_from_header)):
    try:
        update_data = task.dict(exclude_unset=True)
        # Ensure the requester is a member of the task's workbench
        t = supabase.table("workbench_tasks").select("workbench_id").eq("id", task_id).maybe_single().execute().data
        if not t:
            raise HTTPException(status_code=404, detail="Task not found")
        await require_membership(t["workbench_id"], x_user_id)
        # Convert date to string for Supabase serialization
        if "due_date" in update_data and update_data["due_date"]:
            update_data["due_date"] = str(update_data["due_date"])
            
        res = supabase.table("workbench_tasks").update(update_data).eq("id", task_id).execute()
        if not res.data:
            raise HTTPException(status_code=400, detail="Task not found or update failed")
        return res.data[0]
    except Exception as e:
        print(f"[ERROR] update_task: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{task_id}")
async def delete_task(task_id: str, x_user_id: str = Depends(get_user_id_from_header)):
    try:
        t = supabase.table("workbench_tasks").select("workbench_id").eq("id", task_id).maybe_single().execute().data
        if not t:
            raise HTTPException(status_code=404, detail="Task not found")
        await require_membership(t["workbench_id"], x_user_id)
        supabase.table("workbench_tasks").delete().eq("id", task_id).execute()
        return {"status": "deleted"}
    except Exception as e:
        print(f"[ERROR] delete_task: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{workbench_id}/members")
async def list_workbench_members(workbench_id: str, x_user_id: str = Depends(get_user_id_from_header)):
    try:
        await require_membership(workbench_id, x_user_id)
        # 1. Fetch members
        res = supabase.table("workbench_members").select("*").eq("workbench_id", workbench_id).execute()
        members = res.data
        if not members:
            return []

        # 2. Batch fetch user names
        user_ids = list(set(m["user_id"] for m in members))
        user_map = {}
        if user_ids:
            users_res = supabase.table("users").select("id, name, email").in_("id", user_ids).execute()
            user_map = {u["id"]: {"name": u["name"], "email": u["email"]} for u in users_res.data}

        # 3. Merge
        for m in members:
            m["users"] = user_map.get(m["user_id"])
            
        return members
    except Exception as e:
        print(f"[ERROR] list_workbench_members: {e}")
        raise HTTPException(status_code=500, detail=str(e))
