import os
import json
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
from supabase import Client

class InvestorService:
    def __init__(self, supabase: Client):
        self.supabase = supabase
        # Ensure directories exist
        self.base_storage = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "storage")
        self.snapshot_dir = os.path.join(self.base_storage, "snapshots")
        self.share_dir = os.path.join(self.base_storage, "shares")
        self.invite_dir = os.path.join(self.base_storage, "invites")
        
        os.makedirs(self.snapshot_dir, exist_ok=True)
        os.makedirs(self.share_dir, exist_ok=True)
        os.makedirs(self.invite_dir, exist_ok=True)



    async def get_intelligence(self, workbench_id: str) -> Dict[str, Any]:
        """
        Generates a compressed financial intelligence layer and saves a snapshot for AI context.
        """
        # 1. Fetch transactions and their entries with label metadata
        # Correct join for our schema: transactions -> transaction_entries -> labels
        res = self.supabase.table("transactions").select('''
            id,
            description,
            transaction_date,
            transaction_entries (
                amount,
                labels (
                    name,
                    type,
                    sub_account
                )
            )
        ''').eq("workbench_id", workbench_id).execute()
        
        transactions = res.data or []

        # 2. Aggregation Logic
        total_revenue = 0
        total_expense = 0
        recent_expense = 0
        cash_balance = 0
        ar_balance = 0
        
        monthly_data = {}

        for tx in transactions:
            date_str = tx["transaction_date"]
            month_key = date_str[:7]
            tx_date = datetime.strptime(date_str, "%Y-%m-%d")
            
            if month_key not in monthly_data:
                monthly_data[month_key] = {"revenue": 0, "expense": 0}

            for entry in tx.get("transaction_entries", []):
                label = entry.get("labels")
                if not label: continue
                
                amount = float(entry["amount"])
                label_type = label["type"].lower()
                sub_acc = label.get("sub_account", "").lower()
                
                # REVENUE: Sum the absolute values of all revenue credits
                if label_type == "revenue":
                    val = abs(amount)
                    total_revenue += val
                    monthly_data[month_key]["revenue"] += val
                
                # EXPENSES: Sum the absolute values of all expense debits
                elif label_type == "expense":
                    val = abs(amount)
                    total_expense += val
                    monthly_data[month_key]["expense"] += val
                    # Recent burn (last 30 days)
                    if tx_date > (datetime.now() - timedelta(days=30)):
                        recent_expense += val

                # ASSETS: Cash, Bank, UPI, Inventory
                elif label_type == "asset":
                    # Broad match for anything that represents liquidity or inventory
                    if any(kw in sub_acc for kw in ["cash", "bank", "equivalent", "upi", "inventory", "liquid"]):
                        cash_balance += amount
                    elif "receivable" in sub_acc:
                        ar_balance += amount

        # 3. Calculate Trust Metrics
        doc_res = self.supabase.table("workbench_documents").select("id").eq("workbench_id", workbench_id).execute()
        doc_count = len(doc_res.data or [])
        tx_count = len(transactions)
        completeness = (doc_count / tx_count * 100) if tx_count > 0 else 100

        # 4. Narrative Engine
        avg_burn = recent_expense # Using last 30 days as current burn
        current_month = datetime.now().strftime("%Y-%m")
        prev_month = (datetime.now().replace(day=1) - timedelta(days=1)).strftime("%Y-%m")
        
        curr_rev = monthly_data.get(current_month, {}).get("revenue", 0)
        prev_rev = monthly_data.get(prev_month, {}).get("revenue", 0)
        growth_rate = ((curr_rev - prev_rev) / prev_rev * 100) if prev_rev > 0 else 0

        avg_burn = total_expense / 6 if total_expense > 0 else 0
        runway = (cash_balance / avg_burn) if avg_burn > 0 else 0

        intelligence_payload = {
            "meta": {
                "workbench_id": workbench_id,
                "timestamp": datetime.now().isoformat(),
                "snapshot_id": f"snap_{int(datetime.now().timestamp())}"
            },
            "summary": {
                "headline": f"Revenue grew {growth_rate:.1f}% MoM" if growth_rate != 0 else "Financial operations stabilized.",
                "subtext": f"Current runway is {runway:.1f} months with {completeness:.1f}% data verification completeness.",
                "growth_signal": "positive" if growth_rate > 0 else "neutral"
            },
            "kpis": [
                {"label": "REVENUE", "value": total_revenue, "trend": growth_rate, "type": "currency"},
                {"label": "BURN RATE", "value": avg_burn, "trend": 0, "type": "currency"},
                {"label": "CASH POSITION", "value": cash_balance, "trend": 0, "type": "currency"},
                {"label": "RUNWAY", "value": runway, "trend": 0, "type": "months"},
                {"label": "RECEIVABLES", "value": ar_balance, "trend": 0, "type": "currency"}
            ],
            "trust": {
                "confidence_score": min(100, (completeness * 0.7 + 30)),
                "data_completeness": completeness,
                "is_ledger_verified": True,
                "last_updated": datetime.now().isoformat()
            },
            "trends": [
                {"month": m, "revenue": d["revenue"], "expense": d["expense"]} 
                for m, d in sorted(monthly_data.items())
            ]
        }

        # 5. SAVE SNAPSHOT FOR AI CONSULTANT
        self._save_snapshot(workbench_id, intelligence_payload)

        return intelligence_payload

    async def get_financial_statements(self, workbench_id: str) -> Dict[str, Any]:
        """
        Generates P&L, Balance Sheet, and MIS data based on the ledger.
        """
        # Fetch all labels for the workbench
        labels_res = self.supabase.table("labels").select("*").eq("workbench_id", workbench_id).execute()
        labels = labels_res.data or []
        
        # Fetch current balances
        from services.ledger_service import LedgerService
        ledger_service = LedgerService(self.supabase)
        balances = await ledger_service.get_balances(workbench_id)
        
        # Initialize statement structures
        pl = {"revenue": [], "expenses": [], "total_revenue": 0, "total_expenses": 0, "net_profit": 0}
        bs = {"assets": [], "liabilities": [], "equity": [], "total_assets": 0, "total_liabilities": 0, "total_equity": 0}
        mis = {"categories": {}, "monthly_trends": {}}
        
        for l in labels:
            lid = l["id"]
            ltype = l["type"].lower()
            balance_info = balances.get(lid, {"net": 0, "gross": 0})
            # Net balance is the standard for BS (Assets/Liabilities)
            # Gross volume is often used for P&L (Total Sales/Total Expense)
            net_val = balance_info.get("net", 0)
            gross_val = balance_info.get("gross", 0)
            
            if ltype == "revenue":
                item = {"name": l["name"], "amount": gross_val, "sub_account": l["sub_account"]}
                pl["revenue"].append(item)
                pl["total_revenue"] += gross_val
            elif ltype == "expense":
                item = {"name": l["name"], "amount": gross_val, "sub_account": l["sub_account"]}
                pl["expenses"].append(item)
                pl["total_expenses"] += gross_val
                
                # MIS Categorization
                cat = l["sub_account"] or "Other"
                if cat not in mis["categories"]: mis["categories"][cat] = 0
                mis["categories"][cat] += gross_val
                
            elif ltype == "asset":
                item = {"name": l["name"], "amount": net_val, "sub_account": l["sub_account"]}
                bs["assets"].append(item)
                bs["total_assets"] += net_val
            elif ltype == "liability":
                # Liabilities are usually negative in net balance (credits)
                val = abs(net_val)
                item = {"name": l["name"], "amount": val, "sub_account": l["sub_account"]}
                bs["liabilities"].append(item)
                bs["total_liabilities"] += val
            elif ltype == "equity":
                val = abs(net_val)
                item = {"name": l["name"], "amount": val, "sub_account": l["sub_account"]}
                bs["equity"].append(item)
                bs["total_equity"] += val
        
        pl["net_profit"] = pl["total_revenue"] - pl["total_expenses"]
        
        # Add Interpretation (from intelligence layer)
        intel = await self.get_intelligence(workbench_id)
        interpretation = {
            "headline": intel["summary"]["headline"],
            "subtext": intel["summary"]["subtext"],
            "signals": [
                {"type": "growth", "msg": "Positive revenue trajectory" if intel["summary"]["growth_signal"] == "positive" else "Stable revenue"},
                {"type": "risk", "msg": f"Runway of {intel['kpis'][3]['value']:.1f} months" if intel['kpis'][3]['value'] < 12 else "Strong capital runway"},
                {"type": "audit", "msg": f"{intel['trust']['data_completeness']:.1f}% Doc Coverage"}
            ]
        }
        
        return {
            "pl": pl,
            "bs": bs,
            "mis": mis,
            "interpretation": interpretation
        }

    def _save_snapshot(self, workbench_id: str, data: Dict[str, Any]):
        try:
            filename = f"investor_snapshot_{workbench_id}.json"
            filepath = os.path.join(self.snapshot_dir, filename)
            
            with open(filepath, "w") as f:
                json.dump(data, f, indent=2)
            
            print(f"[DEBUG] Investor snapshot saved for AI Consultant: {filepath}")
        except Exception as e:
            print(f"[ERROR] Failed to save investor snapshot: {str(e)}")

    async def create_share_link(self, workbench_id: str, password: str) -> str:
        """
        Creates a shareable link ID and stores the password.
        """
        import uuid
        share_id = str(uuid.uuid4())
        share_data = {
            "workbench_id": workbench_id,
            "password": password,
            "created_at": datetime.now().isoformat()
        }
        
        filepath = os.path.join(self.share_dir, f"{share_id}.json")
        with open(filepath, "w") as f:
            json.dump(share_data, f)
            
        return share_id

    async def get_shared_snapshot(self, share_id: str, password: str) -> Dict[str, Any]:
        """
        Verifies password and returns the snapshot for a share link.
        """
        filepath = os.path.join(self.share_dir, f"{share_id}.json")
        if not os.path.exists(filepath):
            raise Exception("Share link not found or expired")
            
        with open(filepath, "r") as f:
            share_data = json.load(f)
            
        if share_data["password"] != password:
            raise Exception("Incorrect password")
            
        workbench_id = share_data["workbench_id"]
        return await self.get_intelligence(workbench_id)

    async def create_invite(self, workbench_id: str, email: str, role: str) -> str:
        """
        Creates a unique invite token for a specific email and role.
        """
        import uuid
        token = str(uuid.uuid4())
        invite_data = {
            "token": token,
            "workbench_id": workbench_id,
            "email": email,
            "role": role,
            "status": "pending",
            "created_at": datetime.now().isoformat()
        }
        
        filepath = os.path.join(self.invite_dir, f"{token}.json")
        with open(filepath, "w") as f:
            json.dump(invite_data, f)
            
        return token

    async def accept_invite(self, token: str, user_id: str) -> Dict[str, Any]:
        """
        Processes the invite and adds the user to workbench_members.
        """
        filepath = os.path.join(self.invite_dir, f"{token}.json")
        if not os.path.exists(filepath):
            raise Exception("Invitation not found or expired")
            
        with open(filepath, "r") as f:
            invite_data = json.load(f)
            
        if invite_data["status"] != "pending":
            raise Exception("Invitation already used or cancelled")
            
        # Add to workbench_members
        member_data = {
            "workbench_id": invite_data["workbench_id"],
            "user_id": user_id,
            "role": invite_data["role"]
        }
        
        res = self.supabase.table("workbench_members").insert(member_data).execute()
        if not res.data:
            raise Exception("Failed to join workbench")
            
        # Mark invite as accepted
        invite_data["status"] = "accepted"
        invite_data["accepted_by"] = user_id
        invite_data["accepted_at"] = datetime.now().isoformat()
        
        with open(filepath, "w") as f:
            json.dump(invite_data, f)
            
        return {"workbench_id": invite_data["workbench_id"]}


