from typing import Optional, Tuple
from supabase_client import supabase

class LearningEngine:
    """
    Tenant-isolated Learning Engine:
    Stores user corrections to coa_user_corrections table in Supabase.
    Checks stored corrections first on re-imports to achieve 100% precision.
    """

    async def get_stored_override(self, workbench_id: str, raw_account_name: str) -> Optional[Tuple[str, str]]:
        if not workbench_id or not raw_account_name:
            return None

        try:
            res = supabase.table("coa_user_corrections") \
                .select("corrected_class, corrected_group_code") \
                .eq("workbench_id", workbench_id) \
                .eq("raw_account_name", raw_account_name.strip()) \
                .execute()

            if res.data and len(res.data) > 0:
                item = res.data[0]
                return item["corrected_class"], item["corrected_group_code"]
        except Exception:
            pass

        return None

    async def record_override(self, workbench_id: str, raw_account_name: str, corrected_class: str, corrected_group_code: str):
        if not workbench_id or not raw_account_name:
            return

        try:
            payload = {
                "workbench_id": workbench_id,
                "raw_account_name": raw_account_name.strip(),
                "corrected_class": corrected_class,
                "corrected_group_code": corrected_group_code
            }
            supabase.table("coa_user_corrections").upsert(payload, on_conflict="workbench_id,raw_account_name").execute()
        except Exception as e:
            print("Failed to record learning override:", e)

learning_engine = LearningEngine()
