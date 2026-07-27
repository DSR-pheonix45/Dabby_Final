import logging
from typing import Optional
from fastapi import APIRouter, HTTPException, Query, Depends
from pydantic import BaseModel
from supabase_client import supabase
from services.zoho_client import ZohoClient
from services.zoho_sync import ZohoSyncEngine

logger = logging.getLogger(__name__)
router = APIRouter()


class ConnectOrgRequest(BaseModel):
    workbench_id: str
    provider_org_id: str
    provider_org_name: str
    access_token: str
    refresh_token: str
    api_domain: Optional[str] = "https://www.zohoapis.in"


class SyncTriggerRequest(BaseModel):
    workbench_id: str
    sync_type: Optional[str] = "manual"


class OAuthCallbackRequest(BaseModel):
    code: str
    redirect_uri: Optional[str] = None


@router.get("/auth-url")
def get_zoho_auth_url(redirect_uri: Optional[str] = None, state: Optional[str] = None):
    """Generates Zoho OAuth Consent Authorization URL."""
    url = ZohoClient.get_auth_url(redirect_uri=redirect_uri, state=state)
    return {"auth_url": url}


@router.post("/callback")
async def handle_oauth_callback(body: OAuthCallbackRequest):
    """Exchanges authorization code for access_token, refresh_token, and api_domain."""
    try:
        token_data = await ZohoClient.exchange_code(code=body.code, redirect_uri=body.redirect_uri)
        return token_data
    except Exception as e:
        logger.error(f"[Zoho Auth Error] {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/organizations")
async def list_zoho_organizations(access_token: str, refresh_token: Optional[str] = None, api_domain: Optional[str] = "https://www.zohoapis.in"):
    """Lists linked Zoho Organizations for user selection during onboarding."""
    try:
        client = ZohoClient(access_token=access_token, refresh_token=refresh_token, api_domain=api_domain)
        orgs = await client.list_organizations()
        return {"organizations": orgs}
    except Exception as e:
        logger.error(f"[Zoho Orgs Error] {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/connect")
async def connect_zoho_organization(body: ConnectOrgRequest):
    """
    Binds a Zoho Organization 1:1 to a Dabby Workbench.
    Enforces UNIQUE(provider, provider_org_id) constraint.
    """
    try:
        # Check if org is already bound to another workbench
        existing_org = supabase.table("erp_connections").select("id, workbench_id").eq("provider", "zoho").eq("provider_org_id", body.provider_org_id).execute()
        if existing_org.data:
            existing_wb_id = existing_org.data[0]["workbench_id"]
            if existing_wb_id != body.workbench_id:
                raise HTTPException(
                    status_code=409,
                    detail="This Zoho Organization is already linked to another Dabby Workbench."
                )

        payload = {
            "workbench_id": body.workbench_id,
            "provider": "zoho",
            "provider_org_id": body.provider_org_id,
            "provider_org_name": body.provider_org_name,
            "api_domain": body.api_domain or "https://www.zohoapis.in",
            "access_token": body.access_token,
            "refresh_token": body.refresh_token,
            "status": "active",
            "updated_at": "now()"
        }

        # Upsert into erp_connections (1:1 Workbench binding)
        res = supabase.table("erp_connections").upsert(
            payload, on_conflict="workbench_id,provider"
        ).execute()

        conn_data = res.data[0] if res.data else payload

        # Trigger initial sync in background / inline
        try:
            engine = ZohoSyncEngine(
                connection_id=conn_data.get("id", ""),
                workbench_id=body.workbench_id,
                access_token=body.access_token,
                refresh_token=body.refresh_token,
                provider_org_id=body.provider_org_id,
                api_domain=body.api_domain or "https://www.zohoapis.in"
            )
            await engine.execute_sync(sync_type="full")
        except Exception as sync_err:
            logger.warning(f"[Zoho Connect Initial Sync Warning] {sync_err}")

        return {
            "status": "success",
            "message": f"Successfully connected {body.provider_org_name} to Workbench",
            "connection": conn_data
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[Zoho Connect Error] {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status")
def get_connection_status(workbench_id: str = Query(...)):
    """Returns active Zoho connection status and recent sync logs for a Workbench."""
    try:
        conn = supabase.table("erp_connections").select("*").eq("workbench_id", workbench_id).eq("provider", "zoho").execute()
        if not conn.data:
            return {"connected": False, "connection": None, "logs": []}

        connection = conn.data[0]
        logs = supabase.table("erp_sync_logs").select("*").eq("connection_id", connection["id"]).order("started_at", desc=True).limit(10).execute()

        return {
            "connected": True,
            "connection": {
                "id": connection["id"],
                "provider_org_id": connection.get("provider_org_id"),
                "provider_org_name": connection.get("provider_org_name"),
                "status": connection.get("status"),
                "last_sync_at": connection.get("last_sync_at"),
                "created_at": connection.get("created_at")
            },
            "logs": logs.data or []
        }
    except Exception as e:
        logger.error(f"[Zoho Status Error] {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/sync")
async def trigger_manual_sync(body: SyncTriggerRequest):
    """Triggers on-demand sync for a connected Workbench."""
    try:
        conn = supabase.table("erp_connections").select("*").eq("workbench_id", body.workbench_id).eq("provider", "zoho").execute()
        if not conn.data:
            raise HTTPException(status_code=404, detail="No active Zoho ERP connection found for this Workbench.")

        connection = conn.data[0]
        engine = ZohoSyncEngine(
            connection_id=connection["id"],
            workbench_id=body.workbench_id,
            access_token=connection.get("access_token", ""),
            refresh_token=connection.get("refresh_token", ""),
            provider_org_id=connection.get("provider_org_id", ""),
            api_domain=connection.get("api_domain", "https://www.zohoapis.in")
        )
        result = await engine.execute_sync(sync_type=body.sync_type or "manual")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[Zoho Manual Sync Error] {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/disconnect")
def disconnect_zoho_organization(workbench_id: str = Query(...)):
    """Unbinds and removes the Zoho ERP connection from the Workbench."""
    try:
        supabase.table("erp_connections").delete().eq("workbench_id", workbench_id).eq("provider", "zoho").execute()
        return {"status": "success", "message": "Zoho Books disconnected successfully"}
    except Exception as e:
        logger.error(f"[Zoho Disconnect Error] {e}")
        raise HTTPException(status_code=500, detail=str(e))
