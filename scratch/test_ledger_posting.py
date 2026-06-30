import os
import sys
import asyncio

# Add backend directory to sys.path
sys.path.append(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "backend"))
from supabase_client import supabase
from services.ledger_service import LedgerService

async def run_direct_ledger_test():
    print("==================================================")
    print("DIRECT DYNAMICS & DOUBLE-ENTRY LEDGER ARITHMETIC TEST")
    print("==================================================")

    workbench_id = "8e9cb841-953a-4979-bf4e-c2eee8bd197b"
    ledger_service = LedgerService(supabase)

    # 1. Fetch labels and identify AR and Revenue accounts
    print("\n[STEP 1] Fetching active Chart of Accounts (labels)...")
    labels = await ledger_service.get_labels(workbench_id)
    
    ar_label = None
    rev_label = None
    
    for l in labels:
        name = l["name"].lower()
        if l["type"] == "asset" and ("receivable" in name or "debtors" in name):
            ar_label = l
        if l["type"] == "revenue" and ("revenue" in name or "sales" in name or "income" in name):
            rev_label = l

    # Fallback to first asset and revenue label if not specifically found by name
    if not ar_label:
        ar_label = next((l for l in labels if l["type"] == "asset"), None)
    if not rev_label:
        rev_label = next((l for l in labels if l["type"] == "revenue"), None)

    if not ar_label or not rev_label:
        print("ERROR: Could not find suitable Asset and Revenue labels to run the test.")
        return

    print(f"SUCCESS: Target Accounts for Double-Entry Journal:")
    print(f"   * Destination Account (Debit): {ar_label['name']} (ID: {ar_label['id']})")
    print(f"   * Source Account (Credit):      {rev_label['name']} (ID: {rev_label['id']})")

    # 2. Fetch current balances before transaction
    print("\n[STEP 2] Fetching dynamic account balances BEFORE posting transaction...")
    balances_before = await ledger_service.get_balances(workbench_id)
    
    ar_bal_before = balances_before.get(ar_label["id"], {"net": 0.0, "gross": 0.0})
    rev_bal_before = balances_before.get(rev_label["id"], {"net": 0.0, "gross": 0.0})
    
    print(f"   * {ar_label['name']} (Asset)  -> Net Balance: {ar_bal_before['net']} | Gross: {ar_bal_before['gross']}")
    print(f"   * {rev_label['name']} (Revenue) -> Net Balance: {rev_bal_before['net']} | Gross: {rev_bal_before['gross']}")

    # 3. Post a direct transaction
    test_amount = 15000.0
    print(f"\n[STEP 3] Posting direct balanced trade of {test_amount}...")
    try:
        tx_res = await ledger_service.record_transaction(
            workbench_id=workbench_id,
            from_label_id=rev_label["id"],  # Value source (Sales Revenue)
            to_label_id=ar_label["id"],     # Value destination (Accounts Receivable)
            amount=test_amount,
            description="Integration Verification: Staging to Ledger Posting Test"
        )
        print("SUCCESS: Transaction header and entries created in database.")
        print(f"   * Transaction ID: {tx_res['transaction']['id']}")
    except Exception as e:
        print(f"ERROR recording transaction: {e}")
        return

    # 4. Fetch balances after transaction
    print("\n[STEP 4] Fetching dynamic account balances AFTER posting transaction...")
    balances_after = await ledger_service.get_balances(workbench_id)
    
    ar_bal_after = balances_after.get(ar_label["id"], {"net": 0.0, "gross": 0.0})
    rev_bal_after = balances_after.get(rev_label["id"], {"net": 0.0, "gross": 0.0})
    
    print(f"   * {ar_label['name']} (Asset)  -> Net Balance: {ar_bal_after['net']} | Gross: {ar_bal_after['gross']}")
    print(f"   * {rev_label['name']} (Revenue) -> Net Balance: {rev_bal_after['net']} | Gross: {rev_bal_after['gross']}")

    # 5. Verify dynamic arithmetic logic
    print("\n==================================================")
    print("VERIFYING ARITHMETIC RULES")
    print("==================================================")
    
    # Asset (Debit) balance should increase by +amount
    ar_diff = ar_bal_after["net"] - ar_bal_before["net"]
    print(f"Debit Account '{ar_label['name']}' (Asset):")
    print(f"   - Expected increase: +{test_amount}")
    print(f"   - Actual change:     {ar_diff}")
    
    # Revenue (Credit) balance should increase by +amount in natural terms
    # Note: in raw net, it goes down by -amount in entries, but the frontend/ledger 
    # presentation negates it for Credit accounts: net = -raw_net.
    rev_diff = -(rev_bal_after["net"] - rev_bal_before["net"])
    print(f"\nCredit Account '{rev_label['name']}' (Revenue):")
    print(f"   - Expected increase: +{test_amount}")
    print(f"   - Actual change:     {rev_diff}")

    if abs(ar_diff - test_amount) < 0.01 and abs(rev_diff - test_amount) < 0.01:
        print("\n==================================================")
        print("ALL DOUBLE-ENTRY AND DYNAMIC BALANCE TESTS PASSED!")
        print("==================================================")
    else:
        print("\nERROR: Arithmetic verification failed!")

if __name__ == "__main__":
    asyncio.run(run_direct_ledger_test())
