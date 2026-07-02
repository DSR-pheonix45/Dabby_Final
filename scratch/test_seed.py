import os
import asyncio
from supabase import create_client
from services.ledger_service import LedgerService

async def test():
    supabase_url = "https://rdwrxipstlogfthhveim.supabase.co"
    service_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkd3J4aXBzdGxvZ2Z0aGh2ZWltIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzU2MzM2MiwiZXhwIjoyMDg5MTM5MzYyfQ.i3ZhTBfC6DxGrsoNvL4kV2BmSJME3YABHbCH-2vIl_I"
    supabase = create_client(supabase_url, service_key)
    
    wb_id = "2d057275-8914-40bd-a836-a453f58dfee3"
    
    custom_labels = [
      { 'type': 'revenue', 'sub_account': 'Operating Revenue', 'name': 'SaaS Revenue' },
      { 'type': 'revenue', 'sub_account': 'Operating Revenue', 'name': 'Consulting Income' },
      { 'type': 'revenue', 'sub_account': 'Operating Revenue', 'name': 'Service Fees' },
      { 'type': 'expense', 'sub_account': 'Software & Subscriptions', 'name': 'Cloud Hosting' },
      { 'type': 'expense', 'sub_account': 'Software & Subscriptions', 'name': 'Software Subscriptions' },
      { 'type': 'expense', 'sub_account': 'Salaries & Wages', 'name': 'Employee Salaries' },
      { 'type': 'expense', 'sub_account': 'Marketing & Advertising', 'name': 'Digital Ads' },
      { 'type': 'asset', 'sub_account': 'Bank Accounts', 'name': 'HDFC Bank Account' },
      { 'type': 'asset', 'sub_account': 'Accounts Receivable (AR)', 'name': 'Accounts Receivable' },
      { 'type': 'liability', 'sub_account': 'Accounts Payable (AP)', 'name': 'Accounts Payable' }
    ]
    
    service = LedgerService(supabase)
    try:
        res = await service.seed_basic_labels(wb_id, custom_labels)
        print("Success:", res)
    except Exception as e:
        import traceback
        traceback.print_exc()

asyncio.run(test())
