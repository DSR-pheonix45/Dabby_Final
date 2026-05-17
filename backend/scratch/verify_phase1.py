import asyncio
import uuid
import sys
import os
from datetime import date

# Add parent directory to path so we can import services and supabase_client
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from supabase_client import supabase
from services.ledger_service import LedgerService

async def main():
    ledger = LedgerService(supabase)
    
    # 1. Create a test workbench (or use an existing one)
    # We'll just generate a UUID for simulation if we don't want to create real records, 
    # but for true verification we need real records.
    # Let's try to create one in 'workbenches' if it exists.
    workbench_id = str(uuid.uuid4())
    print(f"Using Workbench ID: {workbench_id}")

    try:
        # Pre-seed labels
        print("\n--- Seeding Labels ---")
        seeded = await ledger.seed_basic_labels(workbench_id)
        for s in seeded:
            print(f"Seeded: {s['name']} ({s['type']}) - ID: {s['id']}")
        
        # Get Label IDs
        labels = {l['name']: l['id'] for l in seeded}
        bank_id = labels['Bank']
        rent_id = labels['Rent']
        revenue_id = labels['Sales Revenue']

        # Case 1: Simple Expense (Bank -> Rent)
        print("\n--- Case 1: Simple Expense (Bank -> Rent) ---")
        tx1 = await ledger.record_transaction(
            workbench_id=workbench_id,
            from_label_id=bank_id,
            to_label_id=rent_id,
            amount=25000,
            description="April Rent"
        )
        print(f"Transaction Recorded: {tx1['transaction']['id']}")
        for entry in tx1['entries']:
            print(f"  Entry: Label {entry['label_id']} Amount {entry['amount']}")

        # Case 2: Revenue (Customer -> Revenue)
        # First create a Customer label
        print("\n--- Case 2: Revenue (Customer -> Revenue) ---")
        customer_label = await ledger.create_label({
            "workbench_id": workbench_id,
            "name": "Customer A",
            "type": "asset",
            "sub_account": "Accounts Receivable"
        })
        customer_id = customer_label['id']
        
        tx2 = await ledger.record_transaction(
            workbench_id=workbench_id,
            to_label_id=revenue_id,
            from_label_id=customer_id,
            amount=50000,
            description="Project Payment"
        )
        print(f"Transaction Recorded: {tx2['transaction']['id']}")

        # Case 3: Multiple Transactions (Balance accumulation)
        print("\n--- Case 3: Multi-transaction ---")
        await ledger.record_transaction(
            workbench_id=workbench_id,
            from_label_id=bank_id,
            to_label_id=rent_id,
            amount=5000,
            description="Late Fee"
        )

        # Check Balances
        print("\n--- Final Balances ---")
        balances = await ledger.get_balances(workbench_id)
        for lid, data in balances.items():
            print(f"{data['name']}: {data['balance']}")

        # Verify Test Cases
        # Rent should be 25000 + 5000 = 30000
        # Bank should be -25000 - 5000 = -30000
        # Revenue should be +50000
        # Customer A should be -50000

    except Exception as e:
        print(f"ERROR: {e}")
        print("Note: Ensure the 'labels', 'transactions', and 'transaction_entries' tables exist in your Supabase DB.")

if __name__ == "__main__":
    asyncio.run(main())
