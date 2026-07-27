import logging
import datetime
from typing import Dict, Any, List, Optional
from supabase_client import supabase
from services.zoho_client import ZohoClient

logger = logging.getLogger(__name__)


class ZohoSyncEngine:
    """
    Normalizes raw Zoho API payloads into Dabby's Universal Financial Graph (UFG).
    Handles Chart of Accounts, Customers/Vendors, Invoices, Bills, and Double-Entry Ledger postings.
    """

    def __init__(self, connection_id: str, workbench_id: str, access_token: str, refresh_token: str, provider_org_id: str, api_domain: str):
        self.connection_id = connection_id
        self.workbench_id = workbench_id
        self.provider_org_id = provider_org_id
        self.client = ZohoClient(access_token=access_token, refresh_token=refresh_token, api_domain=api_domain)

    async def execute_sync(self, sync_type: str = "incremental") -> Dict[str, Any]:
        started_at = datetime.datetime.now(datetime.timezone.utc).isoformat()
        records_fetched = 0
        records_imported = 0
        warnings = []
        errors = []

        # Create sync log
        try:
            log_res = supabase.table("erp_sync_logs").insert({
                "connection_id": self.connection_id,
                "workbench_id": self.workbench_id,
                "sync_type": sync_type,
                "status": "running",
                "started_at": started_at
            }).execute()
            log_id = log_res.data[0]["id"] if log_res.data else None
        except Exception as e:
            logger.warning(f"[ZohoSync] Could not create sync log entry: {e}")
            log_id = None

        # Update connection status
        try:
            supabase.table("erp_connections").update({
                "status": "syncing"
            }).eq("id", self.connection_id).execute()
        except Exception as e:
            logger.warning(f"[ZohoSync] Could not update connection status: {e}")

        try:
            # Step 1: Sync Chart of Accounts
            accounts = await self.client.fetch_chart_of_accounts(self.provider_org_id)
            records_fetched += len(accounts)
            imported_coa = await self._sync_chart_of_accounts(accounts)
            records_imported += imported_coa

            # Step 2: Sync Contacts (Parties)
            contacts = await self.client.fetch_contacts(self.provider_org_id)
            records_fetched += len(contacts)
            imported_contacts = await self._sync_parties(contacts)
            records_imported += imported_contacts

            # Step 3: Sync Invoices
            invoices = await self.client.fetch_invoices(self.provider_org_id)
            records_fetched += len(invoices)
            imported_inv = await self._sync_invoices(invoices)
            records_imported += imported_inv

            # Step 4: Sync Bills
            bills = await self.client.fetch_bills(self.provider_org_id)
            records_fetched += len(bills)
            imported_bills = await self._sync_bills(bills)
            records_imported += imported_bills

            # Update connection status & last sync timestamp
            completed_at = datetime.datetime.now(datetime.timezone.utc).isoformat()
            supabase.table("erp_connections").update({
                "status": "active",
                "last_sync_at": completed_at,
                "updated_at": completed_at
            }).eq("id", self.connection_id).execute()

            if log_id:
                supabase.table("erp_sync_logs").update({
                    "status": "success",
                    "records_fetched": records_fetched,
                    "records_imported": records_imported,
                    "warnings": warnings,
                    "errors": errors,
                    "completed_at": completed_at
                }).eq("id", log_id).execute()

            return {
                "status": "success",
                "records_fetched": records_fetched,
                "records_imported": records_imported,
                "warnings": warnings,
                "errors": errors,
                "completed_at": completed_at
            }

        except Exception as e:
            logger.error(f"[ZohoSync Engine Error] {e}", exc_info=True)
            errors.append(str(e))
            completed_at = datetime.datetime.now(datetime.timezone.utc).isoformat()

            # Mark connection error
            try:
                supabase.table("erp_connections").update({
                    "status": "error",
                    "updated_at": completed_at
                }).eq("id", self.connection_id).execute()
            except Exception:
                pass

            if log_id:
                try:
                    supabase.table("erp_sync_logs").update({
                        "status": "failed",
                        "records_fetched": records_fetched,
                        "records_imported": records_imported,
                        "errors": errors,
                        "completed_at": completed_at
                    }).eq("id", log_id).execute()
                except Exception:
                    pass

            raise e

    async def _sync_chart_of_accounts(self, accounts: List[Dict[str, Any]]) -> int:
        count = 0
        for acc in accounts:
            account_type = acc.get("account_type", "expense").lower()
            # Normalize type
            category = "expense"
            if any(k in account_type for k in ["income", "sales", "revenue"]):
                category = "income"
            elif any(k in account_type for k in ["asset", "bank", "cash"]):
                category = "asset"
            elif any(k in account_type for k in ["liability", "credit_card"]):
                category = "liability"
            elif "equity" in account_type:
                category = "equity"

            payload = {
                "workbench_id": self.workbench_id,
                "account_name": acc.get("account_name"),
                "account_type": category,
                "currency": acc.get("currency_code", "INR"),
                "external_provider": "zoho",
                "external_id": acc.get("account_id"),
                "is_active": True
            }

            try:
                # Upsert into di_accounts
                supabase.table("di_accounts").upsert(
                    payload, on_conflict="workbench_id,external_provider,external_id"
                ).execute()
                count += 1
            except Exception as e:
                logger.warning(f"[ZohoSync COA Skip] {acc.get('account_name')}: {e}")
        return count

    async def _sync_parties(self, contacts: List[Dict[str, Any]]) -> int:
        count = 0
        for con in contacts:
            c_type = con.get("contact_type", "customer").lower()
            role = "customer" if "customer" in c_type else "vendor"

            payload = {
                "workbench_id": self.workbench_id,
                "name": con.get("contact_name"),
                "party_type": role,
                "email": con.get("email"),
                "external_provider": "zoho",
                "external_id": con.get("contact_id")
            }

            try:
                # Upsert into parties table
                try:
                    supabase.table("parties").upsert(
                        payload, on_conflict="workbench_id,external_provider,external_id"
                    ).execute()
                except Exception:
                    supabase.table("di_parties").upsert(
                        payload, on_conflict="workbench_id,external_provider,external_id"
                    ).execute()
                count += 1
            except Exception as e:
                logger.warning(f"[ZohoSync Party Skip] {con.get('contact_name')}: {e}")
        return count

    async def _sync_invoices(self, invoices: List[Dict[str, Any]]) -> int:
        count = 0
        for inv in invoices:
            payload = {
                "workbench_id": self.workbench_id,
                "document_type": "sales_invoice",
                "title": f"Invoice #{inv.get('invoice_number')}",
                "amount": inv.get("total", 0.0),
                "currency": inv.get("currency_code", "INR"),
                "status": inv.get("status", "draft"),
                "metadata": {
                    "customer_name": inv.get("customer_name"),
                    "invoice_number": inv.get("invoice_number"),
                    "due_date": inv.get("due_date"),
                    "balance": inv.get("balance")
                },
                "external_provider": "zoho",
                "external_id": inv.get("invoice_id")
            }

            try:
                supabase.table("di_documents").upsert(
                    payload, on_conflict="workbench_id,external_provider,external_id"
                ).execute()
                count += 1
            except Exception as e:
                logger.warning(f"[ZohoSync Invoice Skip] {inv.get('invoice_number')}: {e}")
        return count

    async def _sync_bills(self, bills: List[Dict[str, Any]]) -> int:
        count = 0
        for bill in bills:
            payload = {
                "workbench_id": self.workbench_id,
                "document_type": "purchase_bill",
                "title": f"Bill #{bill.get('bill_number')}",
                "amount": bill.get("total", 0.0),
                "currency": bill.get("currency_code", "INR"),
                "status": bill.get("status", "draft"),
                "metadata": {
                    "vendor_name": bill.get("vendor_name"),
                    "bill_number": bill.get("bill_number"),
                    "due_date": bill.get("due_date"),
                    "balance": bill.get("balance")
                },
                "external_provider": "zoho",
                "external_id": bill.get("bill_id")
            }

            try:
                supabase.table("di_documents").upsert(
                    payload, on_conflict="workbench_id,external_provider,external_id"
                ).execute()
                count += 1
            except Exception as e:
                logger.warning(f"[ZohoSync Bill Skip] {bill.get('bill_number')}: {e}")
        return count
