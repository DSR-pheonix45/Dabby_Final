from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional, Any
from pydantic import BaseModel
from supabase_client import supabase
from auth import get_current_user
from datetime import date, datetime, timezone

router = APIRouter()

class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    assigned_to: Optional[str] = None
    priority: str = "medium"
    status: str = "open"
    due_date: Optional[date] = None
    entity_type: Optional[str] = None
    entity_id: Optional[str] = None
    source: str = "manual"
    metadata: Optional[dict] = {}

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    assigned_to: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    due_date: Optional[date] = None
    metadata: Optional[dict] = None

@router.get("/{workbench_id}")
async def list_tasks(workbench_id: str, user = Depends(get_current_user)):
    try:
        # Check user's role in the workbench
        member_res = supabase.table("workbench_members").select("role").eq("workbench_id", workbench_id).eq("user_id", user["id"]).execute()
        role = member_res.data[0]["role"] if member_res.data else "viewer"

        # Fetch tasks for the workbench, ordering by created_at
        query = supabase.table("workbench_tasks").select("*").eq("workbench_id", workbench_id)
        
        if role not in ["owner", "admin"]:
            query = query.or_(f"assigned_to.eq.{user['id']},created_by.eq.{user['id']}")
            
        tasks_res = query.order("created_at", desc=True).execute()
        tasks = tasks_res.data or []
        
        if tasks:
            user_ids = list({t["assigned_to"] for t in tasks if t.get("assigned_to")})
            if user_ids:
                users_res = supabase.table("users").select("id, name, email").in_("id", user_ids).execute()
                users_map = {u["id"]: u for u in (users_res.data or [])}
                for t in tasks:
                    t["assigned_user"] = users_map.get(t["assigned_to"], {})
                    
        return tasks
    except Exception as e:
        print(f"[ERROR] list_tasks: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{workbench_id}")
async def create_task(workbench_id: str, task: TaskCreate, user = Depends(get_current_user)):
    try:
        task_data = task.dict()
        task_data["workbench_id"] = workbench_id
        task_data["created_by"] = user["id"]
        
        if task.due_date:
            task_data["due_date"] = str(task.due_date)
            
        res = supabase.table("workbench_tasks").insert(task_data).execute()
        if not res.data:
            raise HTTPException(status_code=400, detail="Failed to create task")
            
        created_task = res.data[0]
        
        # Log activity
        supabase.table("activity_logs").insert({
            "workbench_id": workbench_id,
            "user_id": user["id"],
            "action_type": "task_created",
            "entity_type": "task",
            "entity_id": created_task["id"],
            "description": f"Created task: {created_task['title']}"
        }).execute()
        
        # Notification if assigned to someone else
        if created_task.get("assigned_to") and created_task["assigned_to"] != user["id"]:
            supabase.table("notifications").insert({
                "workbench_id": workbench_id,
                "user_id": created_task["assigned_to"],
                "title": "New Task Assigned",
                "message": f"You have been assigned to: {created_task['title']}",
                "link": f"/dashboard/workbench/members"
            }).execute()

        return created_task
    except Exception as e:
        print(f"[ERROR] create_task: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/{workbench_id}/{task_id}")
async def update_task(workbench_id: str, task_id: str, task: TaskUpdate, user = Depends(get_current_user)):
    try:
        update_data = task.dict(exclude_unset=True)
        
        if "due_date" in update_data and update_data["due_date"]:
            update_data["due_date"] = str(update_data["due_date"])
            
        # Check if marking as complete
        if update_data.get("status") == "completed":
            update_data["completed_at"] = datetime.now(timezone.utc).isoformat()
            
        res = supabase.table("workbench_tasks").update(update_data).eq("workbench_id", workbench_id).eq("id", task_id).execute()
        if not res.data:
            raise HTTPException(status_code=400, detail="Task not found or update failed")
            
        updated_task = res.data[0]
        
        # Log activity
        action = "task_completed" if update_data.get("status") == "completed" else "task_updated"
        desc_prefix = "Completed" if action == "task_completed" else "Updated"
        supabase.table("activity_logs").insert({
            "workbench_id": workbench_id,
            "user_id": user["id"],
            "action_type": action,
            "entity_type": "task",
            "entity_id": task_id,
            "description": f"{desc_prefix} task: {updated_task['title']}"
        }).execute()

        return updated_task
    except Exception as e:
        print(f"[ERROR] update_task: {e}")
        raise HTTPException(status_code=500, detail=str(e))

class TaskComment(BaseModel):
    comment: str

@router.post("/{workbench_id}/{task_id}/comments")
async def add_task_comment(workbench_id: str, task_id: str, payload: TaskComment, user = Depends(get_current_user)):
    try:
        task_res = supabase.table("workbench_tasks").select("metadata, title").eq("workbench_id", workbench_id).eq("id", task_id).execute()
        if not task_res.data:
            raise HTTPException(status_code=404, detail="Task not found")
        
        task = task_res.data[0]
        meta = task.get("metadata") or {}
        comments = meta.get("comments") or []
        
        new_comment = {
            "user_id": user["id"],
            "comment": payload.comment,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        comments.append(new_comment)
        meta["comments"] = comments

        res = supabase.table("workbench_tasks").update({"metadata": meta}).eq("workbench_id", workbench_id).eq("id", task_id).execute()
        
        supabase.table("activity_logs").insert({
            "workbench_id": workbench_id,
            "user_id": user["id"],
            "action_type": "task_comment_added",
            "entity_type": "task",
            "entity_id": task_id,
            "description": f"Added comment on task: {task['title']}"
        }).execute()
        
        return res.data[0] if res.data else {"status": "added", "comment": new_comment}
    except Exception as e:
        print(f"[ERROR] add_task_comment: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{workbench_id}/{task_id}")
async def delete_task(workbench_id: str, task_id: str, user = Depends(get_current_user)):
    try:
        supabase.table("workbench_tasks").delete().eq("workbench_id", workbench_id).eq("id", task_id).execute()
        return {"status": "deleted"}
    except Exception as e:
        print(f"[ERROR] delete_task: {e}")
        raise HTTPException(status_code=500, detail=str(e))

