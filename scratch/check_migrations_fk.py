import os
from supabase import create_client

supabase_url = "https://rdwrxipstlogfthhveim.supabase.co"
service_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkd3J4aXBzdGxvZ2Z0aGh2ZWltIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzU2MzM2MiwiZXhwIjoyMDg5MTM5MzYyfQ.i3ZhTBfC6DxGrsoNvL4kV2BmSJME3YABHbCH-2vIl_I"
supabase = create_client(supabase_url, service_key)

# We can query pg_constraint to find tables referencing labels
query = """
SELECT 
    conname AS constraint_name,
    conrelid::regclass AS table_name,
    a.attname AS column_name,
    confrelid::regclass AS foreign_table_name,
    af.attname AS foreign_column_name
FROM 
    pg_constraint c 
    JOIN pg_attribute a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
    JOIN pg_attribute af ON af.attnum = ANY(c.confkey) AND af.attrelid = c.confrelid
WHERE 
    confrelid::regclass::text = 'labels';
"""

# Since postgrest doesn't allow executing arbitrary raw SQL, let's look at the migrations in backend/migrations folder
# to see which tables reference labels.
print("Check migration SQL references to labels:")
for migration_file in os.listdir("backend/migrations"):
    if migration_file.endswith(".sql"):
        path = os.path.join("backend/migrations", migration_file)
        with open(path, "r", encoding="utf-8") as f:
            content = f.read()
            if "REFERENCES labels" in content or "references labels" in content:
                print(f"File {migration_file} references labels!")
