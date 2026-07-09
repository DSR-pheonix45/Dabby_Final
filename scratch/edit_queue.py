import sys

filepath = r'c:\Users\Medhansh Pc\Desktop\Dabby_Final\backend\services\queue_service.py'
with open(filepath, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
skip = False
for line in lines:
    if line.strip() == '# ── Check Feature Flags for Phase 2 Routing ──────────────────────────':
        skip = True
        # Insert our new finishing logic here instead
        new_lines.append('        meta["job_state"] = "COMPLETED"\n')
        new_lines.append('        final_doc_status = "analyzed"\n\n')
        new_lines.append('        async with db_lock:\n')
        new_lines.append('            supabase.table("workbench_documents").update({\n')
        new_lines.append('                "document_type": doc_type,\n')
        new_lines.append('                "status":        final_doc_status,\n')
        new_lines.append('                "metadata":      meta,\n')
        new_lines.append('            }).eq("id", doc_id).execute()\n\n')
        new_lines.append('        print(f"[WORKER] Finished doc {doc_id}. AnalysisNote={analysis_note_id}, DocStatus={final_doc_status}")\n\n')
    
    if skip and line.strip().startswith('except Exception as e:'):
        skip = False

    if not skip:
        if line.strip() == 'from services.trade_draft_service import trade_draft_service':
            continue
        new_lines.append(line)

with open(filepath, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)
