import os

def replace_in_file(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        print(f"Error reading {filepath}: {e}")
        return

    original_content = content

    replacements = {
        "workbench_id": "user_id",
        "WorkbenchId": "UserId",
        "workbenchId": "userId",
        "workbench_documents": "user_documents",
        "workbench_usage": "user_usage",
        "/workbench/": "/user/",
        "/workbenches/": "/users/",
        "workbenches": "users", # Might be risky, but let's see. 
        # Actually, let's just do the ones we are sure about.
    }
    
    # Safe list of replacements
    safe_replacements = [
        ("workbench_id", "user_id"),
        ("WorkbenchId", "UserId"),
        ("workbenchId", "userId"),
        ("workbench_documents", "user_documents"),
        ("workbench_usage", "user_usage"),
        ("/workbench/", "/user/"),
        ("/workbenches/", "/users/"),
        ("activeWorkbench", "activeUser"),
        ("availableWorkbenches", "availableUsers"),
        ("selectedWorkbenchId", "selectedUserId"),
        ("Workbench title", "User title"),
        ("workbenchContext", "userContext"),
        ("workbench_name", "user_name"),
        ("workbenchName", "userName"),
        ("workbench_members", "user_members"), # This table is dropped but just in case
    ]

    for old, new in safe_replacements:
        content = content.replace(old, new)
        
    if content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated {filepath}")

for root, dirs, files in os.walk('backend'):
    for file in files:
        if file.endswith('.py') or file.endswith('.sql'):
            replace_in_file(os.path.join(root, file))

for root, dirs, files in os.walk('src'):
    for file in files:
        if file.endswith('.js') or file.endswith('.jsx'):
            replace_in_file(os.path.join(root, file))
