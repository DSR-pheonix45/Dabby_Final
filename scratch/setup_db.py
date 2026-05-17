import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv('.env.local')

url = os.environ.get("VITE_SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") # Use service role for DDL
supabase: Client = create_client(url, key)

sql_commands = [
    """
    CREATE TABLE IF NOT EXISTS parties (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        workbench_id UUID REFERENCES workbenches(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('client', 'vendor', 'bank', 'lender', 'nbfc')),
        email TEXT,
        phone TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
    );
    """,
    """
    ALTER TABLE parties ENABLE ROW LEVEL SECURITY;
    """,
    """
    DROP POLICY IF EXISTS "Users can manage parties in their workbenches" ON parties;
    CREATE POLICY "Users can manage parties in their workbenches" ON parties
        FOR ALL USING (EXISTS (SELECT 1 FROM workbenches WHERE id = parties.workbench_id));
    """
]

def run_setup():
    # Since we can't run raw SQL via the client easily without a custom function,
    # we'll try to check if the table exists first.
    try:
        supabase.table("parties").select("id").limit(1).execute()
        print("Parties table already exists.")
    except Exception:
        print("Parties table missing. Please run the SQL in Supabase dashboard.")
        # I'll output the SQL for the user to run if I can't do it.
        # But wait, I can try to use a dummy insert to trigger creation if it was auto-created? No.

if __name__ == "__main__":
    run_setup()
