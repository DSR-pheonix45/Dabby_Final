import os
import datetime
from typing import Callable, Any, List, Dict
from groq import Groq
from supabase_client import supabase

class GroqPool:
    @staticmethod
    def get_keys_from_db() -> List[Dict]:
        """
        Fetches all active keys from the database, sorted so that the
        least-recently used key is tried first.
        """
        try:
            res = supabase.table("groq_api_keys") \
                .select("*") \
                .neq("status", "invalid") \
                .order("last_used_at") \
                .execute()
            raw_keys = res.data or []
            now = datetime.datetime.now(datetime.timezone.utc)
            valid_keys = []
            for k in raw_keys:
                status = k.get("status")
                if status == "active":
                    valid_keys.append(k)
                elif status == "rate_limited":
                    last_used_str = k.get("last_used_at")
                    if last_used_str:
                        try:
                            # Replace Z with +00:00 for ISO parsing if needed
                            dt = datetime.datetime.fromisoformat(last_used_str.replace("Z", "+00:00"))
                            if (now - dt).total_seconds() > 60:
                                valid_keys.append(k)
                        except Exception:
                            valid_keys.append(k)
                    else:
                        valid_keys.append(k)
            return valid_keys
        except Exception as e:
            # Table might not exist yet if migration wasn't run
            print(f"[GROQ_POOL] Warning: Failed to query groq_api_keys from DB (table may not exist yet): {e}")
            return []

    @staticmethod
    def update_key_status(key_id: str, status: str, failure_increment: int = 0):
        """
        Updates the health status of a database key on failure.
        """
        try:
            update_data = {"status": status}
            
            # Fetch current failure count to increment it
            if failure_increment > 0:
                res = supabase.table("groq_api_keys").select("failure_count").eq("id", key_id).single().execute()
                current = res.data.get("failure_count") if res.data else 0
                update_data["failure_count"] = current + failure_increment
                
            supabase.table("groq_api_keys").update(update_data).eq("id", key_id).execute()
            print(f"[GROQ_POOL] Key {key_id} status updated to '{status}' (failures +{failure_increment})")
        except Exception as e:
            print(f"[GROQ_POOL] Failed to update key status for {key_id}: {e}")

    @staticmethod
    def update_key_success(key_id: str):
        """
        Resets failure count and updates last_used_at on a successful API execution.
        """
        try:
            supabase.table("groq_api_keys").update({
                "last_used_at": datetime.datetime.utcnow().isoformat(),
                "failure_count": 0,
                "status": "active"
            }).eq("id", key_id).execute()
        except Exception as e:
            print(f"[GROQ_POOL] Failed to update key success metrics for {key_id}: {e}")

    @classmethod
    def execute(cls, fn: Callable[[Groq], Any]) -> Any:
        """
        Executes the provided API call lambda function against the Groq client pool.
        Cycles through keys and updates key health status in real-time.
        """
        db_keys = cls.get_keys_from_db()
        
        # 1. Build candidates pool
        candidates = []
        for dk in db_keys:
            candidates.append({
                "id": dk["id"],
                "api_key": dk["api_key"],
                "source": "db"
            })
            
        # 2. Add fallback from environment variable
        env_key = os.environ.get("VITE_GROQ_API_KEY") or os.environ.get("GROQ_API_KEY")
        if env_key:
            sanitized = env_key.strip().strip('"').strip("'")
            # Only append if not already loaded from the database
            if not any(dk["api_key"] == sanitized for dk in db_keys):
                candidates.append({
                    "id": None,
                    "api_key": sanitized,
                    "source": "env"
                })
                
        if not candidates:
            raise ValueError("No GROQ API keys are configured (neither in database nor in environment variables).")

        last_error = None
        for cand in candidates:
            api_key = cand["api_key"]
            try:
                # Initialize client and run the query
                client = Groq(api_key=api_key)
                result = fn(client)
                
                # Success -> update database metrics
                if cand["id"]:
                    cls.update_key_success(cand["id"])
                    
                return result
            except Exception as e:
                last_error = e
                err_str = str(e).lower()
                print(f"[GROQ_POOL] Groq call failed using key ending with '...{api_key[-6:]}'. Error: {e}")
                
                # Update database key status on errors
                if cand["id"]:
                    status = "active"
                    if "rate limit" in err_str or "429" in err_str or "limit_exceeded" in err_str:
                        status = "rate_limited"
                    elif "unauthorized" in err_str or "invalid api key" in err_str or "401" in err_str:
                        status = "invalid"
                    
                    cls.update_key_status(cand["id"], status, failure_increment=1)
                
                # Rotate and try the next key
                continue
                
        # If all keys failed, raise the final exception
        if last_error:
            raise last_error
        raise Exception("Failed to execute function against Groq pool.")

    @classmethod
    def execute_with_model_fallback(
        cls, 
        fn_builder: Callable[[str], Callable[[Groq], Any]], 
        models: List[str] = None
    ) -> Any:
        """
        Tries executing a request with primary model. If a rate limit, quota, 404, or model access error occurs,
        automatically falls back to secondary models.
        """
        if not models:
            models = ["llama-3.1-8b-instant", "llama-3.3-70b-versatile", "llama3-70b-8192", "llama3-8b-8192", "mixtral-8x7b-32768", "gemma2-9b-it"]
            
        last_error = None
        for m in models:
            try:
                fn = fn_builder(m)
                return cls.execute(fn)
            except Exception as e:
                last_error = e
                print(f"[GROQ_POOL] Model '{m}' failed ({e}). Falling back to next model in list...")
                continue
        if last_error:
            raise last_error
        raise Exception("All Groq fallback models failed.")
