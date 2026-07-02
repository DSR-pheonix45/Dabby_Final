import os
from datetime import datetime
from typing import Dict, List, Optional
from fastapi import APIRouter, HTTPException, Depends
from supabase_client import supabase
from services.ruleset_service import ruleset_service
from services.ledger_service import LedgerService

router = APIRouter()

@router.get("/workbench/{workbench_id}")
async def list_workbench_rulesets(workbench_id: str):
    try:
        # Fetch all rulesets
        res = supabase.table("rulesets").select("*").eq("workbench_id", workbench_id).eq("is_deleted", False).order("updated_at", desc=True).execute()
        rulesets = res.data or []
        
        # Attach version details
        if rulesets:
            r_ids = [r["id"] for r in rulesets]
            ver_res = supabase.table("ruleset_versions").select("ruleset_id, version, prompt, created_at").in_("ruleset_id", r_ids).order("created_at", desc=True).execute()
            
            # Map latest version info
            ver_map = {}
            for ver in (ver_res.data or []):
                ver_map.setdefault(ver["ruleset_id"], []).append(ver)
                
            for r in rulesets:
                r_versions = ver_map.get(r["id"], [])
                r["latest_version"] = r_versions[0]["version"] if r_versions else "1.0"
                r["versions"] = r_versions
                
        return rulesets
    except Exception as e:
        print(f"[ERROR] list_workbench_rulesets: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{ruleset_id}")
async def get_ruleset(ruleset_id: str):
    try:
        res = supabase.table("rulesets").select("*").eq("id", ruleset_id).single().execute()
        ruleset = res.data
        if not ruleset:
            raise HTTPException(status_code=404, detail="Ruleset not found")
            
        ver_res = supabase.table("ruleset_versions").select("*").eq("ruleset_id", ruleset_id).order("created_at", desc=True).execute()
        ruleset["versions"] = ver_res.data or []
        ruleset["latest_version"] = ruleset["versions"][0] if ruleset["versions"] else None
        
        return ruleset
    except Exception as e:
        print(f"[ERROR] get_ruleset: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("")
async def create_ruleset(payload: Dict):
    try:
        workbench_id = payload.get("workbench_id")
        name = payload.get("name")
        description = payload.get("description", "")
        document_type = payload.get("document_type")
        prompt = payload.get("prompt", "")
        structured_logic = payload.get("structured_logic", {})
        status = payload.get("status", "Draft")
        
        if not workbench_id or not name or not document_type:
            raise HTTPException(status_code=400, detail="Missing required parameters: workbench_id, name, document_type")

        # If trying to make active, verify no other active ruleset exists for this doc type
        if status == "Active":
            active_check = supabase.table("rulesets").select("id").eq("workbench_id", workbench_id).eq("document_type", document_type).eq("status", "Active").execute()
            if active_check.data:
                raise HTTPException(status_code=400, detail=f"An active ruleset already exists for document type '{document_type}'. Please disable it first.")

        # Create ruleset
        ruleset_payload = {
            "workbench_id": workbench_id,
            "name": name,
            "description": description,
            "document_type": document_type,
            "status": status,
            "version": "1.0",
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }
        res = supabase.table("rulesets").insert(ruleset_payload).execute()
        if not res.data:
            raise HTTPException(status_code=500, detail="Failed to create ruleset record")
            
        ruleset = res.data[0]
        ruleset_id = ruleset["id"]
        
        # Create initial version
        version_payload = {
            "ruleset_id": ruleset_id,
            "version": "1.0",
            "prompt": prompt,
            "structured_logic": structured_logic,
            "created_at": datetime.utcnow().isoformat()
        }
        supabase.table("ruleset_versions").insert(version_payload).execute()
        
        return ruleset
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] create_ruleset: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{ruleset_id}")
async def update_ruleset(ruleset_id: str, payload: Dict):
    try:
        # Check if ruleset exists
        check_res = supabase.table("rulesets").select("*").eq("id", ruleset_id).single().execute()
        ruleset = check_res.data
        if not ruleset:
            raise HTTPException(status_code=404, detail="Ruleset not found")
            
        workbench_id = ruleset["workbench_id"]
        doc_type = payload.get("document_type") or ruleset["document_type"]
        
        update_fields = {}
        for field in ["name", "description", "status", "version", "is_deleted", "document_type"]:
            if field in payload:
                update_fields[field] = payload[field]

        # Prevent duplicate Active rulesets
        if update_fields.get("status") == "Active" or (update_fields.get("document_type") and ruleset.get("status") == "Active"):
            active_check = supabase.table("rulesets").select("id").eq("workbench_id", workbench_id).eq("document_type", doc_type).eq("status", "Active").execute()
            active_other = [r["id"] for r in (active_check.data or []) if r["id"] != ruleset_id]
            if active_other:
                raise HTTPException(status_code=400, detail=f"An active ruleset already exists for document type '{doc_type}'. Please disable it first.")

        update_fields["updated_at"] = datetime.utcnow().isoformat()
        res = supabase.table("rulesets").update(update_fields).eq("id", ruleset_id).execute()

        if update_fields.get("status") == "Active":
            try:
                pending_docs = supabase.table("workbench_documents")\
                    .select("id")\
                    .eq("workbench_id", workbench_id)\
                    .eq("document_type", doc_type)\
                    .eq("status", "Needs Ruleset")\
                    .execute()
                
                if pending_docs.data:
                    from services.trade_service import trade_service
                    import asyncio
                    for doc in pending_docs.data:
                        print(f"[RULESET ENGINE] Auto-processing pending doc {doc['id']} since ruleset is now Active")
                        asyncio.create_task(trade_service.create_trade_from_document(doc["id"]))
            except Exception as auto_err:
                print(f"[WARNING] Failed to auto-process pending documents: {auto_err}")
        
        return res.data[0] if res.data else ruleset
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] update_ruleset: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{ruleset_id}/version")
async def create_ruleset_version(ruleset_id: str, payload: Dict):
    try:
        check_res = supabase.table("rulesets").select("*").eq("id", ruleset_id).single().execute()
        ruleset = check_res.data
        if not ruleset:
            raise HTTPException(status_code=404, detail="Ruleset not found")

        version = payload.get("version")
        prompt = payload.get("prompt")
        structured_logic = payload.get("structured_logic")
        
        if not version or not prompt or not structured_logic:
            raise HTTPException(status_code=400, detail="Missing required parameters: version, prompt, structured_logic")

        version_payload = {
            "ruleset_id": ruleset_id,
            "version": version,
            "prompt": prompt,
            "structured_logic": structured_logic,
            "created_at": datetime.utcnow().isoformat()
        }
        ver_res = supabase.table("ruleset_versions").insert(version_payload).execute()
        
        # Update parent ruleset version number and updated timestamp
        supabase.table("rulesets").update({
            "version": version,
            "updated_at": datetime.utcnow().isoformat()
        }).eq("id", ruleset_id).execute()
        
        return ver_res.data[0] if ver_res.data else {}
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] create_ruleset_version: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/generate-logic")
async def generate_logic(payload: Dict):
    try:
        prompt = payload.get("prompt")
        doc_type = payload.get("document_type")
        workbench_id = payload.get("workbench_id")
        available_variables = payload.get("available_variables", [])
        
        if not prompt or not doc_type or not workbench_id:
            raise HTTPException(status_code=400, detail="Missing required fields: prompt, document_type, workbench_id")

        # Fetch Chart of Accounts labels for mapping options
        ledger_service = LedgerService(supabase)
        accounts = await ledger_service.get_labels(workbench_id)

        structured_logic = await ruleset_service.generate_ruleset_logic(prompt, doc_type, available_variables, accounts)
        return {"structured_logic": structured_logic}
    except Exception as e:
        print(f"[ERROR] generate_logic endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/simulate")
async def simulate_ruleset(payload: Dict):
    try:
        ruleset_id = payload.get("ruleset_id")
        doc_id = payload.get("document_id")
        
        if not ruleset_id or not doc_id:
            raise HTTPException(status_code=400, detail="Missing required fields: ruleset_id, document_id")

        preview = await ruleset_service.execute_ruleset(ruleset_id, doc_id, simulated=True)
        return preview
    except Exception as e:
        print(f"[ERROR] simulate_ruleset endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))
