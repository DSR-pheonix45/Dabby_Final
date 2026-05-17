import uuid
from typing import List, Optional, Dict
from datetime import date
from supabase import Client
from services.ledger_service import LedgerService

class InventoryService:
    def __init__(self, supabase: Client):
        self.supabase = supabase
        self.ledger_service = LedgerService(supabase)

    # --- Item Management ---

    async def create_item(self, item_data: Dict):
        # stock_level is not a column in 'items' table
        initial_stock = item_data.pop("stock_level", 0)
        
        response = self.supabase.table("items").insert(item_data).execute()
        item = response.data[0]
        
        if initial_stock > 0:
            # Create initial stock ledger entry as an adjustment
            self.supabase.table("stock_ledger").insert({
                "item_id": item["id"],
                "quantity_change": initial_stock,
                "unit_cost": item_data.get("price", 0), # Default to selling price if cost not known
                "reason": "adjustment",
                "metadata": {"note": "Initial stock at creation"}
            }).execute()
            
        return item

    async def get_items(self, workbench_id: str):
        response = self.supabase.table("items").select("*").eq("workbench_id", workbench_id).eq("is_deleted", False).execute()
        return response.data

    async def get_item(self, item_id: str):
        response = self.supabase.table("items").select("*").eq("id", item_id).single().execute()
        return response.data

    # --- Stock Logic ---

    async def get_stock_level(self, item_id: str):
        """
        Returns the current quantity on hand for an item.
        """
        response = self.supabase.table("stock_ledger").select("quantity_change").eq("item_id", item_id).execute()
        total = sum(float(row["quantity_change"]) for row in response.data)
        return total

    async def calculate_fifo_cogs(self, item_id: str, quantity_to_sell: float):
        """
        Calculates the COGS for selling 'quantity_to_sell' units using FIFO.
        Returns (total_cost, batches_used)
        """
        # 1. Fetch all positive movements (purchases/returns)
        pos_res = self.supabase.table("stock_ledger") \
            .select("id, quantity_change, unit_cost, created_at") \
            .eq("item_id", item_id) \
            .gt("quantity_change", 0) \
            .order("created_at") \
            .execute()
        
        # 2. Fetch all negative movements (sales/adjustments)
        neg_res = self.supabase.table("stock_ledger") \
            .select("quantity_change") \
            .eq("item_id", item_id) \
            .lt("quantity_change", 0) \
            .execute()
        
        total_sold_before = abs(sum(float(row["quantity_change"]) for row in neg_res.data))
        
        # 3. Skip already sold quantities from positive batches
        batches = []
        remaining_to_skip = total_sold_before
        
        for row in pos_res.data:
            qty = float(row["quantity_change"])
            cost = float(row["unit_cost"])
            
            if remaining_to_skip >= qty:
                remaining_to_skip -= qty
                continue
            elif remaining_to_skip > 0:
                available = qty - remaining_to_skip
                batches.append({"qty": available, "cost": cost})
                remaining_to_skip = 0
            else:
                batches.append({"qty": qty, "cost": cost})

        # 4. Consume from remaining batches
        total_cost = 0.0
        remaining_to_sell = quantity_to_sell
        
        for batch in batches:
            if remaining_to_sell <= 0:
                break
            
            take = min(batch["qty"], remaining_to_sell)
            total_cost += take * batch["cost"]
            remaining_to_sell -= take
            
        if remaining_to_sell > 0:
            # Handle negative inventory case: use the cost of the last known batch or 0
            last_cost = batches[-1]["cost"] if batches else 0
            total_cost += remaining_to_sell * last_cost
            
        return total_cost

    # --- Core Flows ---

    async def record_purchase(self, workbench_id: str, item_id: str, quantity: float, unit_cost: float, 
                              source_entity_id: str, description: str, transaction_date: Optional[date] = None):
        """
        Purchase Flow: +Stock, Debit Inventory Asset, Credit Source (Bank/AP)
        """
        item = await self.get_item(item_id)
        if not item:
            raise ValueError("Item not found.")
            
        if item["type"] == 'service':
             raise ValueError("Cannot purchase services into stock. Services have no stock layer.")

        if not item["inventory_label_id"]:
            raise ValueError("Item does not have a linked Inventory Asset account.")

        total_amount = quantity * unit_cost

        # 1. Financial Entry
        # Dr Inventory Asset, Cr Source Entity
        tx_res = await self.ledger_service.record_transaction(
            workbench_id=workbench_id,
            from_label_id=source_entity_id, # Source of money (Label ID for Bank/AP)
            to_label_id=item["inventory_label_id"], # Destination of value (Inventory Asset)
            amount=total_amount,
            description=description or f"Purchase: {item['name']} x {quantity}",
            transaction_date=transaction_date
        )
        
        transaction_id = tx_res["transaction"]["id"]

        # 2. Stock Ledger Entry
        stock_entry = {
            "item_id": item_id,
            "transaction_id": transaction_id,
            "quantity_change": quantity,
            "unit_cost": unit_cost,
            "reason": "purchase"
        }
        self.supabase.table("stock_ledger").insert(stock_entry).execute()

        return tx_res

    async def record_sale(self, workbench_id: str, item_id: str, quantity: float, selling_price: float, 
                          destination_entity_id: str, description: str, transaction_date: Optional[date] = None):
        """
        Sale Flow: 
        1. Revenue: Dr Destination (Bank/AR), Cr Revenue
        2. COGS: Dr COGS, Cr Inventory Asset
        3. Stock: -Quantity
        """
        item = await self.get_item(item_id)
        if not item or not item["revenue_label_id"] or not item["cogs_label_id"] or not item["inventory_label_id"]:
            raise ValueError("Item missing linked accounts (Revenue/COGS/Inventory).")

        # Step 1: Record Revenue
        total_revenue = quantity * selling_price
        rev_tx = await self.ledger_service.record_transaction(
            workbench_id=workbench_id,
            from_label_id=item["revenue_label_id"], # Source of value (Revenue account)
            to_label_id=destination_entity_id,     # Destination of money (Bank/AR)
            amount=total_revenue,
            description=description or f"Sale: {item['name']} x {quantity}",
            transaction_date=transaction_date
        )
        
        # If it's a service, we stop here (no COGS or stock movement)
        if item["type"] == 'service':
            return {
                "revenue_transaction": rev_tx,
                "stock_impact": 0,
                "margin": total_revenue # Full margin for services in this simplified model
            }

        # Step 2: Calculate COGS
        total_cogs = await self.calculate_fifo_cogs(item_id, quantity)
        avg_unit_cost = total_cogs / quantity if quantity > 0 else 0

        # Step 3: Record COGS / Inventory Movement Financially
        # Dr COGS, Cr Inventory Asset
        cogs_tx = await self.ledger_service.record_transaction(
            workbench_id=workbench_id,
            from_label_id=item["inventory_label_id"], # Source of value (Inventory Asset)
            to_label_id=item["cogs_label_id"],      # Destination of value (COGS Expense)
            amount=total_cogs,
            description=f"COGS for {item['name']} sale (tx: {rev_tx['transaction']['id']})",
            transaction_date=transaction_date
        )

        # Step 4: Record Stock Movement
        stock_entry = {
            "item_id": item_id,
            "transaction_id": rev_tx["transaction"]["id"],
            "quantity_change": -quantity,
            "unit_cost": avg_unit_cost,
            "reason": "sale"
        }
        self.supabase.table("stock_ledger").insert(stock_entry).execute()

        return {
            "revenue_transaction": rev_tx,
            "cogs_transaction": cogs_tx,
            "stock_impact": -quantity,
            "margin": total_revenue - total_cogs
        }

    async def record_sale_impact(self, workbench_id: str, item_id: str, quantity: float, transaction_id: str, transaction_date: Optional[date] = None):
        """
        Records only the COGS and Stock side of a sale. 
        Used when the revenue part is already handled (e.g. in an Invoice).
        """
        item = await self.get_item(item_id)
        if not item:
            return None
            
        if item["type"] == 'service':
            # Services don't impact stock or COGS in this model
            return None

        if not item["cogs_label_id"] or not item["inventory_label_id"]:
            print(f"[WARNING] Item {item_id} missing COGS or Inventory labels. Skipping stock impact.")
            return None

        # 1. Calculate COGS
        total_cogs = await self.calculate_fifo_cogs(item_id, quantity)
        avg_unit_cost = total_cogs / quantity if quantity > 0 else 0

        # 2. Record COGS / Inventory Movement Financially
        # Dr COGS, Cr Inventory Asset
        cogs_tx = await self.ledger_service.record_transaction(
            workbench_id=workbench_id,
            from_label_id=item["inventory_label_id"], # Source: Inventory Asset
            to_label_id=item["cogs_label_id"],      # Destination: COGS Expense
            amount=total_cogs,
            description=f"COGS: {item['name']} x {quantity} (Invoice Tx: {transaction_id})",
            transaction_date=transaction_date
        )

        # 3. Record Stock Movement
        stock_entry = {
            "item_id": item_id,
            "transaction_id": transaction_id,
            "quantity_change": -quantity,
            "unit_cost": avg_unit_cost,
            "reason": "sale"
        }
        self.supabase.table("stock_ledger").insert(stock_entry).execute()

        return cogs_tx
