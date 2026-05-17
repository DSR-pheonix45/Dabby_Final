import uuid
from typing import List, Optional, Dict
from datetime import date
from supabase import Client

class LedgerService:
    def __init__(self, supabase: Client):
        self.supabase = supabase

    # --- Label System ---
    
    async def create_label(self, label_data: Dict):
        """
        Creates a new label in the COA.
        """
        response = self.supabase.table("labels").insert(label_data).execute()
        return response.data[0]

    async def get_labels(self, workbench_id: str, include_deleted: bool = False):
        """
        Fetches all labels for a workbench.
        """
        query = self.supabase.table("labels").select("*").eq("workbench_id", workbench_id)
        if not include_deleted:
            query = query.eq("is_deleted", False)
        
        response = query.execute()
        return response.data

    async def update_label(self, label_id: str, update_data: Dict):
        """
        Updates an existing label.
        """
        response = self.supabase.table("labels").update(update_data).eq("id", label_id).execute()
        return response.data[0]

    async def delete_label(self, label_id: str, soft_delete: bool = True):
        """
        Deletes a label (soft delete by default).
        """
        if soft_delete:
            response = self.supabase.table("labels").update({"is_deleted": True}).eq("id", label_id).execute()
        else:
            response = self.supabase.table("labels").delete().eq("id", label_id).execute()
        return response.data

    async def seed_basic_labels(self, workbench_id: str):
        """
        Pre-seeds basic labels for a new workbench.
        """
        basic_labels = []
        response = self.supabase.table("labels").insert(basic_labels).execute()
        return response.data

    # --- Transaction Engine ---

    async def record_transaction(self, workbench_id: str, from_label_id: str, to_label_id: str, amount: float, description: str, transaction_date: Optional[date] = None, 
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

        # Check if both labels exist and fetch their types
        labels_res = self.supabase.table("labels").select("id, name, type").in_("id", [from_label_id, to_label_id]).execute()
        existing_labels = {l["id"]: l for l in labels_res.data}
        
        if from_label_id not in existing_labels:
            print(f"[VALIDATION ERROR] Source label ID {from_label_id} not found in database.")
            raise ValueError(f"Source label with ID {from_label_id} not found or has been deleted.")
        if to_label_id not in existing_labels:
            print(f"[VALIDATION ERROR] Destination label ID {to_label_id} not found in database.")
            raise ValueError(f"Destination label with ID {to_label_id} not found or has been deleted.")

        source_label_data = existing_labels[from_label_id]
        
        # Check for sufficient funds if the source is an Asset account
        if source_label_data["type"] == "asset":
            current_balances = await self.get_balances(workbench_id)
            source_balance_info = current_balances.get(from_label_id, {"net": 0.0})
            # Handle cases where get_balances might return a direct float or a dict
            source_balance = source_balance_info.get("net", 0.0) if isinstance(source_balance_info, dict) else source_balance_info
            
            if source_balance < amount:
                print(f"[VALIDATION ERROR] Insufficient funds in '{source_label_data['name']}'. Balance: ₹{source_balance}, Requested: ₹{amount}")
                raise ValueError(f"Insufficient funds in '{source_label_data['name']}'. Current balance: ₹{source_balance}, required: ₹{amount}")

        # 1. Create Transaction Header
        transaction_header = {
            "workbench_id": workbench_id,
            "description": description,
            "transaction_date": str(transaction_date) if transaction_date else str(date.today()),
            "source_party_id": source_party_id,
            "source_entity_id": source_entity_id,
            "destination_party_id": destination_party_id,
            "destination_entity_id": destination_entity_id,
            "invoice_id": invoice_id
        }
        
        print(f"[DEBUG] Recording transaction for workbench: {workbench_id}")
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

    async def get_balances(self, workbench_id: str):
        """
        Computes SUM(amount) GROUP BY label_id for all labels in a workbench.
        """
        # Fetch all entries for labels in this workbench
        # Better: Use a JOIN or a View. 
        # For Phase 1, we can fetch all and aggregate in code or use a Supabase query.
        
        # Supabase doesn't support complex group by via JS/Python client easily without RPC.
        # We'll fetch all entries for the workbench's labels.
        
        # First, get all label IDs for this workbench
        labels = await self.get_labels(workbench_id)
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

    async def get_transactions_list(self, workbench_id: str):
        """
        Returns a list of transactions with their entries and labels.
        Manual join for parties/entities to avoid PGRST200 join errors.
        """
        # 1. Fetch transactions and their entries
        tx_res = self.supabase.table("transactions") \
            .select("*, transaction_entries(*, labels(*))") \
            .eq("workbench_id", workbench_id) \
            .order("transaction_date", desc=True) \
            .execute()
            
        transactions = tx_res.data
        if not transactions:
            return []

        # 2. Collect all party and entity IDs for batch fetching
        party_ids = set()
        entity_ids = set()
        for tx in transactions:
            if tx.get("source_party_id"): party_ids.add(tx["source_party_id"])
            if tx.get("destination_party_id"): party_ids.add(tx["destination_party_id"])
            if tx.get("source_entity_id"): entity_ids.add(tx["source_entity_id"])
            if tx.get("destination_entity_id"): entity_ids.add(tx["destination_entity_id"])

        # 3. Batch fetch names
        parties_map = {}
        if party_ids:
            p_res = self.supabase.table("parties").select("id, name").in_("id", list(party_ids)).execute()
            parties_map = {p["id"]: p["name"] for p in p_res.data}
            
        entities_map = {}
        if entity_ids:
            e_res = self.supabase.table("entities").select("id, name").in_("id", list(entity_ids)).execute()
            entities_map = {e["id"]: e["name"] for e in e_res.data}

        # 4. Format response
        formatted = []
        for tx in transactions:
            amount = 0
            labels_involved = []
            for entry in tx["transaction_entries"]:
                if entry.get("labels"):
                    labels_involved.append(entry["labels"]["name"])
                if entry["amount"] > 0:
                    amount = entry["amount"]
            
            formatted.append({
                "id": tx["id"],
                "description": tx["description"],
                "date": tx["transaction_date"],
                "amount": amount,
                "labels": labels_involved,
                "entries": tx["transaction_entries"],
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
