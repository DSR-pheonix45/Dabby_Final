import os
import json
import traceback
from datetime import datetime, date
from typing import Dict, List, Optional
from groq import Groq
from supabase_client import supabase
from services.ledger_service import LedgerService

class RulesetService:
    def __init__(self):
        groq_key = os.environ.get("VITE_GROQ_API_KEY") or os.environ.get("GROQ_API_KEY")
        if groq_key:
            sanitized_key = groq_key.strip().strip('"').strip("'")
            self.groq_client = Groq(api_key=sanitized_key)
        else:
            self.groq_client = None

    async def generate_ruleset_logic(self, prompt: str, doc_type: str, available_variables: List[str], active_accounts: List[Dict]) -> Dict:
        """
        Uses AI (Groq/Llama) to translate a natural language ruleset description into structured execution logic JSON.
        """
        if not self.groq_client:
            raise ValueError("GROQ_API_KEY not configured on backend")

        # Compile account choices context
        account_choices = "\n".join([
            f"- Account Name: \"{acc['full_account_name']}\" (Type: {acc['type']}, Sub-account: {acc['sub_account']})"
            for acc in active_accounts
        ])

        system_prompt = f"""
        You are an expert financial system compiler. Translate the user's natural language business rules into a structured execution logic JSON for Dabby.
        
        The document type is: '{doc_type}'
        
        Available OCR Variables you can map:
        {json.dumps(available_variables)}
        
        Available Chart of Accounts (COA) labels in this company:
        {account_choices}
        
        Output MUST be ONLY a JSON object with this exact schema:
        {{
          "event_name": "String name of the event, e.g. Customer Sale",
          "conditions": [
            {{
              "field": "String ocr field name (e.g. vendor_name, total_amount, description)",
              "operator": "equals" or "contains" or "greater_than" or "less_than",
              "value": "Value to match against"
            }}
          ],
          "actions": [
            {{
              "action": "set_debit_account" or "set_credit_account" or "set_debit_entity" or "set_credit_entity",
              "value": "Exact name of account or entity (e.g. 'Expense:Server Hosting', 'HDFC Bank')"
            }}
          ]
        }}
        
        CRITICAL RULES:
        1. Conditions check OCR field variables like vendor_name, total_amount, etc.
        2. Actions list specify debit/credit accounts (from the available COA labels list) or bank/cash/UPI entities (e.g. bank name).
        3. Do not map any account names that are not in the provided lists.
        """

        try:
            completion = self.groq_client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"User Prompt:\n{prompt}"}
                ],
                response_format={"type": "json_object"}
            )
            structured_logic = json.loads(completion.choices[0].message.content)
            return structured_logic
        except Exception as e:
            print(f"[ERROR] AI Ruleset logic generation failed: {str(e)}")
            raise e

    def evaluate_conditions(self, conditions: List[Dict], var_values: Dict) -> bool:
        """
        Evaluates a list of ruleset conditions against the document's OCR values.
        """
        if not conditions:
            return True
            
        for cond in conditions:
            field = cond.get("field")
            op = cond.get("operator")
            target_val = cond.get("value")
            
            if not field or not op:
                continue
                
            actual_val = var_values.get(field)
            if actual_val is None:
                # Check nested path
                actual_val = var_values.get(f"extracted_invoice.{field}")
                if actual_val is None:
                    return False
                    
            actual_str = str(actual_val).strip().lower()
            target_str = str(target_val).strip().lower()
            
            if op == "equals":
                try:
                    if float(actual_val) == float(target_val):
                        continue
                except (ValueError, TypeError):
                    pass
                if actual_str != target_str:
                    return False
            elif op == "contains":
                if target_str not in actual_str:
                    return False
            elif op == "greater_than":
                try:
                    if float(actual_val) <= float(target_val):
                        return False
                except (ValueError, TypeError):
                    return False
            elif op == "less_than":
                try:
                    if float(actual_val) >= float(target_val):
                        return False
                except (ValueError, TypeError):
                    return False
        return True

    async def execute_ruleset(self, ruleset_id: str, doc_id: str, simulated: bool = False) -> Dict:
        """
        Evaluates active ruleset version on document and returns simulation details or triggers trade creation.
        """
        # 1. Fetch document and analysis note metadata
        doc_res = supabase.table("workbench_documents").select("*").eq("id", doc_id).single().execute()
        doc = doc_res.data
        if not doc:
            raise ValueError(f"Document {doc_id} not found")

        workbench_id = doc["workbench_id"]
        metadata = doc.get("metadata") or {}
        extracted = metadata.get("extracted_invoice") or {}
        if not extracted:
            raise ValueError(f"No Analysis Notes/OCR data found on document {doc_id}")

        # 2. Fetch active ruleset version
        version_res = supabase.table("ruleset_versions").select("*").eq("ruleset_id", ruleset_id).order("created_at", desc=True).execute()
        if not version_res.data:
            raise ValueError("No versions found for the specified ruleset")
        
        active_version = version_res.data[0]
        logic = active_version.get("structured_logic") or {}
        
        # 3. Resolve OCR Variables from extracted note
        var_values = {}
        for category in ["document_metadata", "parties", "financials", "references", "additional_fields"]:
            cat_data = extracted.get(category) or {}
            for k, v in cat_data.items():
                var_values[k] = v
                
        # Root level fallbacks
        for k, v in extracted.items():
            if not isinstance(v, (dict, list)):
                var_values[k] = v

        # 4. Evaluate conditions
        conditions = logic.get("conditions") or []
        conditions_met = self.evaluate_conditions(conditions, var_values)
        
        if not conditions_met:
            return {
                "status": "Skipped",
                "reason": "Conditions not met",
                "simulated": simulated
            }

        # 5. Fetch Chart of Accounts labels/accounts
        ledger_service = LedgerService(supabase)
        accounts = await ledger_service.get_labels(workbench_id)
        accounts_map = {acc["full_account_name"]: acc for acc in accounts}

        # 6. Parse Actions
        actions = logic.get("actions") or []
        resolved_debits = []
        resolved_credits = []
        resolved_entities = []

        total_amount = float(var_values.get("total_amount") or var_values.get("total") or 0.0)

        for act in actions:
            action_type = act.get("action")
            val = act.get("value")
            
            if action_type == "set_debit_account":
                if val in accounts_map:
                    resolved_debits.append({
                        "label_id": accounts_map[val]["id"],
                        "account_name": val,
                        "amount": total_amount
                    })
            elif action_type == "set_credit_account":
                if val in accounts_map:
                    resolved_credits.append({
                        "label_id": accounts_map[val]["id"],
                        "account_name": val,
                        "amount": total_amount
                    })
            elif action_type in ("set_credit_entity", "set_debit_entity"):
                resolved_entities.append({
                    "role": "our_company" if "credit" in action_type else "counterparty",
                    "entity_name": val,
                    "action_type": action_type
                })

        event_name = logic.get("event_name") or "Ruleset Event"

        if simulated:
            return {
                "simulated": True,
                "conditions_met": True,
                "event_name": event_name,
                "resolved_debits": resolved_debits,
                "resolved_credits": resolved_credits,
                "resolved_entities": resolved_entities,
                "logic": logic
            }
            
        # Non-simulated path: Delegate to trade_service
        # (This is handled inside create_trade_from_document, so we just return metadata)
        return {
            "status": "Matched",
            "event_name": event_name,
            "resolved_debits": resolved_debits,
            "resolved_credits": resolved_credits,
            "resolved_entities": resolved_entities
        }

ruleset_service = RulesetService()
