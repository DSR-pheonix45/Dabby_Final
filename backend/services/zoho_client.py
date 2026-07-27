import os
import time
import logging
from typing import List, Dict, Any, Optional
import httpx

logger = logging.getLogger(__name__)

ZOHO_CLIENT_ID = os.environ.get("ZOHO_CLIENT_ID", "")
ZOHO_CLIENT_SECRET = os.environ.get("ZOHO_CLIENT_SECRET", "")
ZOHO_REDIRECT_URI = os.environ.get("ZOHO_REDIRECT_URI", "http://localhost:5173/onboarding")

DEFAULT_ACCOUNTS_DOMAIN = "https://accounts.zoho.in"
DEFAULT_API_DOMAIN = "https://www.zohoapis.in"
SCOPES = "ZohoBooks.fullaccess.all"


class ZohoClient:
    """
    Low-level Zoho Books REST API Client.
    Manages multi-datacenter domains (.in, .com, .eu), token refresh, pagination, rate limiting.
    """

    def __init__(self, access_token: Optional[str] = None, refresh_token: Optional[str] = None, api_domain: str = DEFAULT_API_DOMAIN):
        self.access_token = access_token
        self.refresh_token = refresh_token
        self.api_domain = api_domain.rstrip('/')
        self.accounts_domain = DEFAULT_ACCOUNTS_DOMAIN

    @staticmethod
    def get_auth_url(redirect_uri: Optional[str] = None, state: Optional[str] = None) -> str:
        r_uri = redirect_uri or ZOHO_REDIRECT_URI
        client_id = os.environ.get("ZOHO_CLIENT_ID", "MOCK_CLIENT_ID")
        base_url = f"{DEFAULT_ACCOUNTS_DOMAIN}/oauth/v2/auth"
        params = f"?response_type=code&client_id={client_id}&scope={SCOPES}&redirect_uri={r_uri}&access_type=offline&prompt=consent"
        if state:
            params += f"&state={state}"
        return base_url + params

    @classmethod
    async def exchange_code(cls, code: str, redirect_uri: Optional[str] = None) -> Dict[str, Any]:
        """Exchanges OAuth authorization code for access_token and refresh_token."""
        client_id = os.environ.get("ZOHO_CLIENT_ID", "")
        client_secret = os.environ.get("ZOHO_CLIENT_SECRET", "")
        r_uri = redirect_uri or ZOHO_REDIRECT_URI

        # Fallback for dev / mock mode if credentials not provided
        if not client_id or not client_secret:
            logger.warning("[ZohoClient] ZOHO_CLIENT_ID / SECRET not configured. Returning mock tokens.")
            return {
                "access_token": f"mock_access_{code}",
                "refresh_token": f"mock_refresh_{code}",
                "api_domain": DEFAULT_API_DOMAIN,
                "token_expires_at": time.time() + 3600,
                "is_mock": True
            }

        url = f"{DEFAULT_ACCOUNTS_DOMAIN}/oauth/v2/token"
        data = {
            "grant_type": "authorization_code",
            "client_id": client_id,
            "client_secret": client_secret,
            "redirect_uri": r_uri,
            "code": code
        }

        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(url, data=data)
            payload = resp.json()

        if "error" in payload:
            raise ValueError(f"Zoho OAuth token error: {payload.get('error')}")

        return {
            "access_token": payload.get("access_token"),
            "refresh_token": payload.get("refresh_token"),
            "api_domain": payload.get("api_domain", DEFAULT_API_DOMAIN),
            "token_expires_at": time.time() + payload.get("expires_in", 3600),
            "is_mock": False
        }

    async def ensure_active_token(self) -> str:
        """Refreshes access token if refresh_token is available."""
        if self.access_token and not self.access_token.startswith("mock_"):
            return self.access_token

        if not self.refresh_token or self.refresh_token.startswith("mock_"):
            return self.access_token or "mock_access_token"

        client_id = os.environ.get("ZOHO_CLIENT_ID", "")
        client_secret = os.environ.get("ZOHO_CLIENT_SECRET", "")
        url = f"{self.accounts_domain}/oauth/v2/token"
        data = {
            "grant_type": "refresh_token",
            "client_id": client_id,
            "client_secret": client_secret,
            "refresh_token": self.refresh_token
        }

        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(url, data=data)
            payload = resp.json()

        if "access_token" in payload:
            self.access_token = payload["access_token"]
            return self.access_token
        return self.access_token or ""

    async def _request(self, method: str, path: str, org_id: Optional[str] = None, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Performs authenticated request to Zoho Books API with retries."""
        token = await self.ensure_active_token()
        url = f"{self.api_domain}/books/v3{path}"
        headers = {"Authorization": f"Zoho-oauthtoken {token}"}
        req_params = params or {}
        if org_id:
            req_params["organization_id"] = org_id

        # Mock mode safety
        if token.startswith("mock_"):
            logger.info(f"[ZohoClient Mock] {method} {path}")
            return {"code": 0, "message": "success", "mock": True}

        async with httpx.AsyncClient(timeout=30.0) as client:
            for attempt in range(3):
                resp = await client.request(method, url, headers=headers, params=req_params)
                if resp.status_code == 429:
                    time.sleep(2 ** attempt)  # Backoff
                    continue
                resp.raise_for_status()
                data = resp.json()
                if data.get("code") != 0 and "organizations" not in data:
                    logger.warning(f"[Zoho API Warning] {data.get('message')}")
                return data
        raise RuntimeError(f"Zoho API call failed for path {path} after retries")

    async def list_organizations(self) -> List[Dict[str, Any]]:
        """Fetch all linked Zoho Organizations for the authenticated user."""
        if self.access_token and self.access_token.startswith("mock_"):
            return [
                {
                    "organization_id": "90001827",
                    "name": "Acme Global Solutions Pvt Ltd",
                    "currency_code": "INR",
                    "fiscal_year_start_month": "April",
                    "country": "India"
                },
                {
                    "organization_id": "90001899",
                    "name": "Starlight Ventures (Zoho US)",
                    "currency_code": "USD",
                    "fiscal_year_start_month": "January",
                    "country": "United States"
                }
            ]

        data = await self._request("GET", "/organizations")
        return data.get("organizations", [])

    async def fetch_chart_of_accounts(self, org_id: str) -> List[Dict[str, Any]]:
        """Paginated fetch for Chart of Accounts."""
        if self.access_token and self.access_token.startswith("mock_"):
            return [
                {"account_id": "zoho_acc_101", "account_name": "Sales A/c", "account_type": "income", "currency_code": "INR"},
                {"account_id": "zoho_acc_102", "account_name": "Consulting Revenue", "account_type": "income", "currency_code": "INR"},
                {"account_id": "zoho_acc_201", "account_name": "Freight Outward", "account_type": "expense", "currency_code": "INR"},
                {"account_id": "zoho_acc_202", "account_name": "Office Rent", "account_type": "expense", "currency_code": "INR"},
                {"account_id": "zoho_acc_301", "account_name": "HDFC Bank Account", "account_type": "bank", "currency_code": "INR"}
            ]

        accounts = []
        page = 1
        has_more = True
        while has_more and page <= 10:
            res = await self._request("GET", "/chartofaccounts", org_id=org_id, params={"page": page, "per_page": 200})
            items = res.get("chartofaccounts", [])
            accounts.extend(items)
            page_context = res.get("page_context", {})
            has_more = page_context.get("has_more_page", False)
            page += 1
        return accounts

    async def fetch_contacts(self, org_id: str, contact_type: str = "all") -> List[Dict[str, Any]]:
        """Paginated fetch for Contacts (Customers & Vendors)."""
        if self.access_token and self.access_token.startswith("mock_"):
            return [
                {"contact_id": "zoho_con_1", "contact_name": "Tech Corp Pvt Ltd", "contact_type": "customer", "email": "billing@techcorp.in", "gst_no": "27AAACT1234A1Z1"},
                {"contact_id": "zoho_con_2", "contact_name": "Global Supplies LLP", "contact_type": "vendor", "email": "info@globalsupplies.com", "gst_no": "27BBBGS5678B1Z5"}
            ]

        contacts = []
        page = 1
        has_more = True
        while has_more and page <= 10:
            params = {"page": page, "per_page": 200}
            if contact_type != "all":
                params["contact_type"] = contact_type
            res = await self._request("GET", "/contacts", org_id=org_id, params=params)
            items = res.get("contacts", [])
            contacts.extend(items)
            page_context = res.get("page_context", {})
            has_more = page_context.get("has_more_page", False)
            page += 1
        return contacts

    async def fetch_invoices(self, org_id: str, last_modified_time: Optional[str] = None) -> List[Dict[str, Any]]:
        """Paginated fetch for Sales Invoices."""
        if self.access_token and self.access_token.startswith("mock_"):
            return [
                {
                    "invoice_id": "zoho_inv_901",
                    "invoice_number": "INV-2026-001",
                    "customer_name": "Tech Corp Pvt Ltd",
                    "customer_id": "zoho_con_1",
                    "date": "2026-07-01",
                    "due_date": "2026-07-31",
                    "total": 125000.0,
                    "balance": 0.0,
                    "status": "paid",
                    "currency_code": "INR"
                }
            ]

        invoices = []
        page = 1
        has_more = True
        while has_more and page <= 10:
            params = {"page": page, "per_page": 200}
            if last_modified_time:
                params["last_modified_time"] = last_modified_time
            res = await self._request("GET", "/invoices", org_id=org_id, params=params)
            items = res.get("invoices", [])
            invoices.extend(items)
            page_context = res.get("page_context", {})
            has_more = page_context.get("has_more_page", False)
            page += 1
        return invoices

    async def fetch_bills(self, org_id: str, last_modified_time: Optional[str] = None) -> List[Dict[str, Any]]:
        """Paginated fetch for Purchase Bills."""
        if self.access_token and self.access_token.startswith("mock_"):
            return [
                {
                    "bill_id": "zoho_bill_501",
                    "bill_number": "BILL-2026-089",
                    "vendor_name": "Global Supplies LLP",
                    "vendor_id": "zoho_con_2",
                    "date": "2026-07-05",
                    "due_date": "2026-08-05",
                    "total": 45000.0,
                    "balance": 45000.0,
                    "status": "unpaid",
                    "currency_code": "INR"
                }
            ]

        bills = []
        page = 1
        has_more = True
        while has_more and page <= 10:
            params = {"page": page, "per_page": 200}
            if last_modified_time:
                params["last_modified_time"] = last_modified_time
            res = await self._request("GET", "/bills", org_id=org_id, params=params)
            items = res.get("bills", [])
            bills.extend(items)
            page_context = res.get("page_context", {})
            has_more = page_context.get("has_more_page", False)
            page += 1
        return bills
