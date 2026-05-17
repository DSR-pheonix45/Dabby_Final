import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv('../.env.local')

url = os.getenv('SUPABASE_URL') or os.getenv('VITE_SUPABASE_URL')
key = os.getenv('SUPABASE_SERVICE_ROLE_KEY') or os.getenv('VITE_SUPABASE_ANON_KEY')

supabase = create_client(url, key)

workbench_id = '0338e803-e024-4bae-bfcd-e0f88262770d'

res = supabase.table('labels').select('id, name, type').eq('workbench_id', workbench_id).execute()
for label in res.data:
    print(f"ID: {label['id']} | Name: {label['name']} | Type: {label['type']}")
