import uuid
from typing import List, Optional, Dict
from datetime import date
from supabase import Client

class LedgerService:
    def __init__(self, supabase: Client):
        self.supabase = supabase

    # --- Label System (User Accounts) ---
    
    async def generate_unique_account_code(self, user_id: str, master_account_code: str, sub_account_code: str) -> str:
        """
        Generates a unique 4-character account code for a workbench.
        For example: Master Code 'A', Sub Code '01'. Base is 'A01'.
        If 'A01' exists, we try 'A011', 'A012', ..., 'A019', 'A01A', ..., 'A01Z'.
        If Sub Code is '001', Base is 'A001'. Since this is already 4 characters,
        if 'A001' exists, we can use a suffix or increment.
        """
        base_code = f"{master_account_code}{sub_account_code}"
        res = self.supabase.table("user_accounts")\
            .select("account_code")\
            .eq("user_id", user_id)\
            .like("account_code", f"{master_account_code}%")\
            .execute()
        
        existing_codes = {row["account_code"] for row in res.data}
        
        if base_code not in existing_codes:
            return base_code[:4]
            
        if len(base_code) <= 3:
            for char in "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ":
                candidate = f"{base_code}{char}"
                if candidate not in existing_codes:
                    return candidate
        else:
            prefix = base_code[:3]
            for char in "123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ0":
                candidate = f"{prefix}{char}"
                if candidate not in existing_codes:
                    return candidate
                    
        import random, string
        while True:
            suffix = "".join(random.choices(string.ascii_uppercase + string.digits, k=3))
            candidate = f"{master_account_code}{suffix}"[:4]
            if candidate not in existing_codes:
                return candidate

    async def create_label(self, label_data: Dict):
        """
        Creates a new workbench account (label) linked to master account and sub-account.
        """
        master_id = label_data["master_account_id"]
        sub_id = label_data["master_sub_account_id"]
        
        # 1. Fetch master account code
        master_res = self.supabase.table("master_accounts").select("account_code").eq("id", master_id).single().execute()
        if not master_res.data:
            raise ValueError(f"Master Account with ID {master_id} not found")
        master_code = master_res.data["account_code"]
        
        # 2. Fetch master sub-account code
        sub_res = self.supabase.table("master_sub_accounts").select("sub_account_code").eq("id", sub_id).single().execute()
        if not sub_res.data:
            raise ValueError(f"Master Sub-Account with ID {sub_id} not found")
        sub_code = sub_res.data["sub_account_code"]
        
        # 3. Generate unique account code
        account_code = await self.generate_unique_account_code(label_data["user_id"], master_code, sub_code)
        
        # 4. Insert workbench account
        insert_payload = {
            "user_id": label_data["user_id"],
            "master_account_id": master_id,
            "master_sub_account_id": sub_id,
            "account_code": account_code,
            "full_account_name": label_data["full_account_name"],
            "custom_sub_type": label_data.get("custom_sub_type"),
            "description": label_data.get("description"),
            "current_amount": label_data.get("current_amount", 0.0),
            "is_active": True
        }
        
        response = self.supabase.table("user_accounts").insert(insert_payload).execute()
        return response.data[0]

    def get_or_create_exact_label(
        self,
        user_id: str,
        role: str,
        account_name: str,
        sub_account_hint: Optional[str] = None
    ) -> str:
        """
        Ensures an exact label (user_accounts) exists for the given workbench and role/name.
        If a matching label exists, returns its ID.
        If not, auto-provisions a new label under the appropriate Master & Sub account.
        """
        if not user_id or not account_name:
            raise ValueError("user_id and account_name are required to resolve/create exact label")
            
        clean_name = account_name.strip()
        
        # 1. Look for existing account label by exact or substring match
        try:
            existing_res = self.supabase.table("user_accounts")\
                .select("id, full_account_name")\
                .eq("user_id", user_id)\
                .eq("is_active", True)\
                .execute()
            
            for acc in (existing_res.data or []):
                fn = (acc.get("full_account_name") or "").strip()
                if fn.lower() == clean_name.lower():
                    return acc["id"]
                # Substring match for counterparty name
                if len(clean_name) > 3 and clean_name.lower() in fn.lower():
                    return acc["id"]
        except Exception as e:
            print(f"[DEBUG] Error searching existing user_accounts: {e}")

        # 2. Determine Master Pillar Name
        role_lower = (role or "").lower()
        if role_lower in ("asset", "ar", "bank", "cash", "input_gst", "input_tax_credit", "receivable"):
            pillar_name = "ASSETS"
        elif role_lower in ("liability", "ap", "output_gst", "tax_payable", "payable", "loans"):
            pillar_name = "LIABILITIES"
        elif role_lower in ("equity", "capital"):
            pillar_name = "EQUITY"
        elif role_lower in ("revenue", "income", "sales"):
            pillar_name = "REVENUE"
        else:
            pillar_name = "EXPENSES"

        # 3. Query Master Accounts & Sub-Accounts
        try:
            master_acc_res = self.supabase.table("master_accounts")\
                .select("id, account_code")\
                .eq("account_name", pillar_name)\
                .limit(1)\
                .execute()
            
            master_data = master_acc_res.data if master_acc_res.data else []
            if not master_data:
                # Fallback to any master account
                master_data = self.supabase.table("master_accounts").select("id, account_code").limit(1).execute().data or []
                
            if master_data:
                master_acc = master_data[0]
                master_id = master_acc["id"]
                master_code = master_acc["account_code"]
                
                master_subs_res = self.supabase.table("master_sub_accounts")\
                    .select("id, sub_account_code, sub_account_name")\
                    .eq("master_account_id", master_id)\
                    .execute()
                
                subs = master_subs_res.data or []
                selected_sub = None
                
                # Match sub_account_hint if provided
                if sub_account_hint:
                    selected_sub = next((s for s in subs if sub_account_hint.lower() in s["sub_account_name"].lower()), None)
                    
                # Match by role if hint not found
                if not selected_sub:
                    if role_lower in ("ar", "receivable"):
                        selected_sub = next((s for s in subs if "receivable" in s["sub_account_name"].lower()), None)
                    elif role_lower in ("ap", "payable"):
                        selected_sub = next((s for s in subs if "payable" in s["sub_account_name"].lower()), None)
                    elif role_lower in ("bank", "cash"):
                        selected_sub = next((s for s in subs if "bank" in s["sub_account_name"].lower() or "cash" in s["sub_account_name"].lower()), None)
                    elif role_lower in ("input_gst", "input_tax_credit"):
                        selected_sub = next((s for s in subs if "gst" in s["sub_account_name"].lower() or "tax" in s["sub_account_name"].lower()), None)
                    elif role_lower in ("output_gst", "tax_payable"):
                        selected_sub = next((s for s in subs if "gst" in s["sub_account_name"].lower() or "tax" in s["sub_account_name"].lower()), None)
                    elif role_lower == "revenue":
                        selected_sub = next((s for s in subs if "operating" in s["sub_account_name"].lower() or "revenue" in s["sub_account_name"].lower()), None)
                    elif role_lower == "expense":
                        selected_sub = next((s for s in subs if "operating" in s["sub_account_name"].lower() or "cogs" in s["sub_account_name"].lower() or "expense" in s["sub_account_name"].lower()), None)

                if not selected_sub and subs:
                    selected_sub = subs[0]
                    
                if selected_sub:
                    sub_id = selected_sub["id"]
                    sub_code = selected_sub["sub_account_code"]

                    account_code = f"{master_code}{sub_code}"[:4]
                    existing_res = self.supabase.table("user_accounts").select("account_code").eq("user_id", user_id).execute()
                    existing_codes = {row["account_code"] for row in (existing_res.data or [])}
                    
                    if account_code in existing_codes:
                        for char in "123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ0":
                            cand = f"{master_code}{sub_code[:2]}{char}"[:4]
                            if cand not in existing_codes:
                                account_code = cand
                                break

                    insert_payload = {
                        "user_id": user_id,
                        "master_account_id": master_id,
                        "master_sub_account_id": sub_id,
                        "account_code": account_code,
                        "full_account_name": clean_name,
                        "description": f"Auto-provisioned label for {clean_name}",
                        "current_amount": 0.0,
                        "is_active": True
                    }
                    
                    ins_res = self.supabase.table("user_accounts").insert(insert_payload).execute()
                    if ins_res.data:
                        print(f"[LedgerService] Provisioned exact label '{clean_name}' ({account_code}) for workbench {user_id}")
                        return ins_res.data[0]["id"]
        except Exception as err:
            print(f"[ERROR] Failed to auto-provision exact label '{clean_name}': {err}")

        # Fallback to any existing label in the workbench if insertion fails
        try:
            fb = self.supabase.table("user_accounts").select("id").eq("user_id", user_id).eq("is_active", True).limit(1).execute()
            if fb.data:
                return fb.data[0]["id"]
        except Exception:
            pass

        raise RuntimeError(f"Could not resolve or create exact label for '{clean_name}'")

    async def get_labels(self, user_id: str, include_deleted: bool = False):
        """
        Fetches all workbench accounts (labels) for a workbench,
        joining master_accounts and master_sub_accounts to provide
        type and sub_account for frontend compatibility.
        """
        try:
            query = self.supabase.table("user_accounts") \
                .select("*, master_accounts(account_code, account_name), master_sub_accounts(sub_account_code, sub_account_name)") \
                .eq("user_id", user_id)
                
            if not include_deleted:
                query = query.eq("is_active", True)
            
            response = query.execute()
            
            mapped_labels = []
            name_map = {
                "ASSETS": "asset",
                "LIABILITIES": "liability",
                "EQUITY": "equity",
                "REVENUE": "revenue",
                "EXPENSES": "expense",
                "INCOME": "revenue"
            }
            
            for item in response.data:
                m_acc = item.get("master_accounts") or {}
                m_sub = item.get("master_sub_accounts") or {}
                
                raw_type = m_acc.get("account_name", "EXPENSES")
                mapped_type = name_map.get(raw_type.upper(), "expense")
                
                mapped_labels.append({
                    "id": item["id"],
                    "user_id": item["user_id"],
                    "master_account_id": item["master_account_id"],
                    "master_sub_account_id": item["master_sub_account_id"],
                    "account_code": item["account_code"],
                    "name": item["full_account_name"],
                    "full_account_name": item["full_account_name"],
                    "type": mapped_type,
                    "sub_account": m_sub.get("sub_account_name", "General"),
                    "custom_sub_type": item.get("custom_sub_type"),
                    "description": item.get("description"),
                    "current_amount": float(item.get("current_amount") or 0.0),
                    "is_active": item.get("is_active", True),
                    "is_shadow": item.get("is_shadow", False),
                    "vessel_id": item.get("vessel_id"),
                    "created_at": item.get("created_at"),
                    "updated_at": item.get("updated_at")
                })
                
            return mapped_labels
        except Exception as e:
            print(f"[ERROR] Failed to get_labels: {str(e)}")
            raise e

    async def update_label(self, label_id: str, update_data: Dict):
        """
        Updates an existing workbench account.
        """
        response = self.supabase.table("user_accounts").update(update_data).eq("id", label_id).execute()
        return response.data[0]

    async def delete_label(self, label_id: str, soft_delete: bool = True):
        """
        Deletes a workbench account (soft delete by default).
        """
        if soft_delete:
            response = self.supabase.table("user_accounts").update({"is_active": False}).eq("id", label_id).execute()
        else:
            response = self.supabase.table("user_accounts").delete().eq("id", label_id).execute()
        return response.data

    async def seed_basic_labels(self, user_id: str, custom_labels: Optional[List] = None):
        """
        Pre-seeds basic workbench accounts for a new workbench.
        """
        try:
            wb_res = self.supabase.table("users").select("*").eq("id", user_id).maybe_single().execute()
            if not wb_res.data:
                raise ValueError("Workbench not found")
            wb = wb_res.data
            
            # If custom labels are provided, map and insert them directly
            if custom_labels:
                master_accs_res = self.supabase.table("master_accounts").select("*").eq("is_active", True).execute()
                master_subs_res = self.supabase.table("master_sub_accounts").select("*").eq("is_active", True).execute()
                
                master_accounts = {acc["account_name"].upper(): acc for acc in master_accs_res.data}
                
                name_map = {
                    "asset": "ASSETS",
                    "liability": "LIABILITIES",
                    "equity": "EQUITY",
                    "revenue": "REVENUE",
                    "income": "REVENUE",
                    "expense": "EXPENSES"
                }
                
                subs_by_master = {}
                for sub in master_subs_res.data:
                    m_id = sub["master_account_id"]
                    if m_id not in subs_by_master:
                        subs_by_master[m_id] = []
                    subs_by_master[m_id].append(sub)
                
                # Fetch existing account codes for this workbench to prevent collisions
                existing_res = self.supabase.table("user_accounts").select("account_code").eq("user_id", user_id).execute()
                existing_codes = {row["account_code"] for row in existing_res.data}
                used_codes_in_batch = set()
                
                def get_unique_code(master_code, sub_code):
                    base_code = f"{master_code}{sub_code}"
                    if base_code not in existing_codes and base_code not in used_codes_in_batch:
                        return base_code[:4]
                    
                    if len(base_code) <= 3:
                        for char in "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ":
                            candidate = f"{base_code}{char}"
                            if candidate not in existing_codes and candidate not in used_codes_in_batch:
                                return candidate
                    else:
                        prefix = base_code[:3]
                        for char in "123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ0":
                            candidate = f"{prefix}{char}"
                            if candidate not in existing_codes and candidate not in used_codes_in_batch:
                                return candidate
                                
                    # Suffix fallback
                    import random, string
                    while True:
                        suffix = "".join(random.choices(string.ascii_uppercase + string.digits, k=2))
                        candidate = f"{master_code}{suffix}"
                        if candidate not in existing_codes and candidate not in used_codes_in_batch:
                            return candidate

                user_accounts_to_insert = []
                for item in custom_labels:
                    p_type = item.get("type", "expense").lower()
                    pillar_name = name_map.get(p_type, "EXPENSES")
                    m_acc = master_accounts.get(pillar_name)
                    if not m_acc:
                        continue
                        
                    subs = subs_by_master.get(m_acc["id"], [])
                    sub_name_target = item.get("sub_account", "")
                    m_sub = next((s for s in subs if s["sub_account_name"].lower() == sub_name_target.lower()), None)
                    if not m_sub:
                        m_sub = next((s for s in subs if sub_name_target.lower() in s["sub_account_name"].lower()), None)
                    if not m_sub and subs:
                        m_sub = subs[0]
                    if not m_sub:
                        continue
                        
                    account_code = get_unique_code(m_acc['account_code'], m_sub['sub_account_code'])
                    used_codes_in_batch.add(account_code)
                    
                    user_accounts_to_insert.append({
                        "user_id": user_id,
                        "master_account_id": m_acc["id"],
                        "master_sub_account_id": m_sub["id"],
                        "account_code": account_code,
                        "full_account_name": item.get("name", "Unnamed Account"),
                        "description": f"Custom seeded label under {m_sub['sub_account_name']}",
                        "current_amount": 0.0,
                        "is_active": True
                    })
                    
                if user_accounts_to_insert:
                    self.supabase.table("user_accounts").insert(user_accounts_to_insert).execute()
                return {"status": "success", "message": f"Seeded {len(user_accounts_to_insert)} custom accounts successfully"}
            
            # Seeding default template
            from services.coa_seeder import seed_coa
            res = seed_coa(
                self.supabase, 
                user_id, 
                wb.get("business_type") or "services", 
                "small", 
                wb.get("industry") or "others"
            )
            if res.get("status") == "error":
                raise ValueError(res.get("message", "Seeding failed"))
            return res
        except Exception as e:
            print(f"[ERROR] Failed to seed ledger labels: {str(e)}")
            raise e

    # --- Transaction Engine ---

    async def record_transaction(self, user_id: str, from_label_id: str, to_label_id: str, amount: float, description: str, transaction_date: Optional[date] = None, 
                                 source_party_id: Optional[str] = None, source_entity_id: Optional[str] = None, 
                                 destination_party_id: Optional[str] = None, destination_entity_id: Optional[str] = None,
                                 invoice_id: Optional[str] = None):
        """
        Records a strict double-entry transaction.
        Entry 1: to_label_id   +amount
        Entry 2: from_label_id  -amount
        """
        print(f"[DEBUG] record_transaction: amount={amount}, from={from_label_id}, to={to_label_id}, desc={description}")
        
        if amount <= 0:
            print(f"[VALIDATION ERROR] Amount must be positive. Received: {amount}")
            raise ValueError("Amount must be positive. Use labels to indicate direction.")

        # Check if both workbench accounts exist and fetch their types
        accounts_res = self.supabase.table("user_accounts").select("id, full_account_name, master_account_id").in_("id", [from_label_id, to_label_id]).eq("user_id", user_id).execute()
        existing_accounts = {a["id"]: a for a in accounts_res.data}
        
        if from_label_id not in existing_accounts:
            print(f"[VALIDATION ERROR] Source account ID {from_label_id} not found in workbench {user_id}.")
            raise ValueError(f"Source account with ID {from_label_id} not found.")
        if to_label_id not in existing_accounts:
            print(f"[VALIDATION ERROR] Destination account ID {to_label_id} not found in workbench {user_id}.")
            raise ValueError(f"Destination account with ID {to_label_id} not found.")

        source_account_data = existing_accounts[from_label_id]
        
        # Get master account type to check if it's an asset
        master_account_res = self.supabase.table("master_accounts").select("account_code").eq("id", source_account_data["master_account_id"]).execute()
        if master_account_res.data:
            account_code = master_account_res.data[0]["account_code"]
            is_asset = account_code == "A"  # 'A' for Assets
            
            # Check for sufficient funds if the source is an Asset account
            if is_asset:
                current_balances = await self.get_balances(user_id)
                source_balance_info = current_balances.get(from_label_id, {"net": 0.0})
                # Handle cases where get_balances might return a direct float or a dict
                source_balance = source_balance_info.get("net", 0.0) if isinstance(source_balance_info, dict) else source_balance_info
                
                if source_balance < amount:
                    print(f"[VALIDATION ERROR] Insufficient funds in '{source_account_data['full_account_name']}'. Balance: ₹{source_balance}, Requested: ₹{amount}")
                    raise ValueError(f"Insufficient funds in '{source_account_data['full_account_name']}'. Current balance: ₹{source_balance}, required: ₹{amount}")

        # 1. Create Transaction Header
        transaction_header = {
            "user_id": user_id,
            "description": description,
            "transaction_date": str(transaction_date) if transaction_date else str(date.today()),
            "source_party_id": source_party_id,
            "source_entity_id": source_entity_id,
            "destination_party_id": destination_party_id,
            "destination_entity_id": destination_entity_id,
            "invoice_id": invoice_id
        }
        
        print(f"[DEBUG] Recording transaction for workbench: {user_id}")
        print(f"[DEBUG] Header: {transaction_header}")
        
        try:
            tx_resp = self.supabase.table("transactions").insert(transaction_header).execute()
            print(f"[DEBUG] Transaction header response: {tx_resp.data}")
            if not tx_resp.data:
                raise Exception("Failed to create transaction header (no data returned)")
            transaction_id = tx_resp.data[0]["id"]
        except Exception as e:
            print(f"[ERROR] Transaction header creation failed: {str(e)}")
            raise Exception(f"Database error creating transaction: {str(e)}")

        # 2. Create Entries
        entries = [
            {
                "transaction_id": transaction_id,
                "label_id": to_label_id,
                "amount": amount # Positive (Destination)
            },
            {
                "transaction_id": transaction_id,
                "label_id": from_label_id,
                "amount": -amount # Negative (Source)
            }
        ]
        
        try:
            print(f"[DEBUG] Creating entries: {entries}")
            entries_resp = self.supabase.table("transaction_entries").insert(entries).execute()
            print(f"[DEBUG] Entries response: {entries_resp.data}")
            if not entries_resp.data:
                raise Exception("Failed to create transaction entries (no data returned)")
        except Exception as e:
            print(f"[ERROR] Transaction entries creation failed: {str(e)}")
            # Optional: Rollback transaction header here if needed (not easy in REST without RPC)
            raise Exception(f"Database error creating entries: {str(e)}")
        
        return {
            "transaction": tx_resp.data[0],
            "entries": entries_resp.data
        }

    # --- Analytics & Lists ---

    async def get_balances(self, user_id: str):
        """
        Computes SUM(amount) GROUP BY label_id for all labels in a workbench.
        """
        # Fetch all entries for labels in this workbench
        # Better: Use a JOIN or a View. 
        # For Phase 1, we can fetch all and aggregate in code or use a Supabase query.
        
        # Supabase doesn't support complex group by via JS/Python client easily without RPC.
        # We'll fetch all entries for the workbench's labels.
        
        # First, get all label IDs for this workbench
        labels = await self.get_labels(user_id)
        label_ids = [l["id"] for l in labels]
        
        if not label_ids:
            return {}

        response = self.supabase.table("transaction_entries") \
            .select("label_id, amount") \
            .in_("label_id", label_ids) \
            .execute()
        
        balances = {l["id"]: {"gross": 0.0, "net": 0.0} for l in labels}
        
        # We need to know which side is "Marked" (Gross) based on account type
        # Assets/Expenses: Marked = Positive entries
        # Liabilities/Equity/Revenue: Marked = Negative entries
        
        label_types = {l["id"]: l["type"] for l in labels}
        positives = {l["id"]: 0.0 for l in labels}
        negatives = {l["id"]: 0.0 for l in labels}
        
        for entry in response.data:
            lid = entry["label_id"]
            amount = float(entry["amount"])
            
            # Update Net
            balances[lid]["net"] += amount
            
            # Track volume
            if amount > 0:
                positives[lid] += amount
            else:
                negatives[lid] += abs(amount)
        
        # Calculate Gross (Marked) based on account type
        for lid in balances:
            ltype = label_types[lid]
            if ltype in ["asset", "expense"]:
                # Natural side is positive. Marked is total increases.
                balances[lid]["gross"] = positives[lid]
            else:
                # Natural side is negative. Marked is total increases (credits).
                # But if they only have payments (positives), show that as volume.
                balances[lid]["gross"] = max(positives[lid], negatives[lid])
            
        return balances

    async def get_transactions_list(self, user_id: str):
        """
        Returns a list of transactions with their entries and labels.
        Uses in-memory joins to bypass potential PostgREST foreign key relationship failures.
        """
        try:
            # 1. Fetch transactions
            tx_res = self.supabase.table("transactions") \
                .select("*") \
                .eq("user_id", user_id) \
                .order("transaction_date", desc=True) \
                .execute()
                
            transactions = tx_res.data
            if not transactions:
                return []
                
            tx_ids = [tx["id"] for tx in transactions]
            
            # 2. Fetch all entries for these transactions in one batch
            entries_res = self.supabase.table("transaction_entries") \
                .select("*") \
                .in_("transaction_id", tx_ids) \
                .execute()
                
            # 3. Fetch all workbench accounts for the workbench to map names
            labels = await self.get_labels(user_id)
            labels_map = {l["id"]: l for l in labels}
            
            # 4. Group entries by transaction_id and attach mapped account info
            entries_by_tx = {}
            for entry in entries_res.data:
                tx_id = entry["transaction_id"]
                if tx_id not in entries_by_tx:
                    entries_by_tx[tx_id] = []
                    
                # Map label info to entry
                lid = entry["label_id"]
                if lid in labels_map:
                    entry["user_accounts"] = {
                        "id": lid,
                        "full_account_name": labels_map[lid]["full_account_name"]
                    }
                    entry["labels"] = {
                        "id": lid,
                        "name": labels_map[lid]["full_account_name"]
                    }
                
                entries_by_tx[tx_id].append(entry)
                
            # 5. Collect party and entity IDs for batch fetching
            party_ids = set()
            entity_ids = set()
            for tx in transactions:
                if tx.get("source_party_id"): party_ids.add(tx["source_party_id"])
                if tx.get("destination_party_id"): party_ids.add(tx["destination_party_id"])
                if tx.get("source_entity_id"): entity_ids.add(tx["source_entity_id"])
                if tx.get("destination_entity_id"): entity_ids.add(tx["destination_entity_id"])
                
            # 6. Batch fetch names for parties and entities
            parties_map = {}
            if party_ids:
                p_res = self.supabase.table("parties").select("id, name").in_("id", list(party_ids)).execute()
                parties_map = {p["id"]: p["name"] for p in p_res.data}
                
            entities_map = {}
            if entity_ids:
                e_res = self.supabase.table("entities").select("id, name").in_("id", list(entity_ids)).execute()
                entities_map = {e["id"]: e["name"] for e in e_res.data}
                
            # 7. Format final response
            formatted = []
            for tx in transactions:
                tx_id = tx["id"]
                tx_entries = entries_by_tx.get(tx_id, [])
                
                amount = 0
                accounts_involved = []
                for entry in tx_entries:
                    if entry.get("user_accounts"):
                        accounts_involved.append(entry["user_accounts"]["full_account_name"])
                    if entry["amount"] > 0:
                        amount = entry["amount"]
                        
                formatted.append({
                    "id": tx["id"],
                    "description": tx["description"],
                    "date": tx["transaction_date"],
                    "amount": amount,
                    "accounts": accounts_involved,
                    "entries": tx_entries,
                    "source": {
                        "party": parties_map.get(tx["source_party_id"]),
                        "entity": entities_map.get(tx["source_entity_id"])
                    } if tx.get("source_party_id") or tx.get("source_entity_id") else None,
                    "destination": {
                        "party": parties_map.get(tx["destination_party_id"]),
                        "entity": entities_map.get(tx["destination_entity_id"])
                    } if tx.get("destination_party_id") or tx.get("destination_entity_id") else None
                })
                
            return formatted
        except Exception as e:
            print(f"[ERROR] get_transactions_list failed: {str(e)}")
            import traceback
            traceback.print_exc()
            raise e
