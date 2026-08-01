import json
from typing import Dict, Any, Optional, Tuple
from services.groq_pool import groq_pool

class LLMResolver:
    """
    Constrained LLM Fallback Resolver:
    Called ONLY when deterministic rules and dictionaries have low confidence.
    Prohibited from inventing new group codes; must select strictly from Dabby's 18 ALERX groups.
    """

    ALLOWED_GROUPS = [
        "ACO", "AAR", "AIN", "AFA", "AOT",
        "LAP", "LST", "LDE", "LOT",
        "ESC", "ERE", "EOU",
        "ROP", "RCR", "XDC", "XPE", "XTE", "XAD"
    ]

    async def resolve(
        self,
        account_name: str,
        account_type: Optional[str] = None,
        parent_account: Optional[str] = None,
        industry: Optional[str] = None
    ) -> Tuple[str, str, float, str]:
        prompt = f"""
        You are an expert financial accountant. Map the following ledger account to Dabby's ALERX Chart of Accounts taxonomy.

        Ledger Name: "{account_name}"
        ERP Account Type: "{account_type or 'Unknown'}"
        Parent Category: "{parent_account or 'None'}"
        Industry Context: "{industry or 'General'}"

        Allowed Group Codes:
        - Assets: ACO (Cash & Bank), AAR (Receivables), AIN (Inventory), AFA (Fixed Assets), AOT (Tax & Other Assets)
        - Liabilities: LAP (Payables), LST (Statutory & Tax Liabilities), LDE (Debt & Loans), LOT (Accruals & Other Liabilities)
        - Equity: ESC (Share Capital), ERE (Retained Earnings), EOU (Drawings/Other Equity)
        - Revenue: ROP (Operating Revenue), RCR (Other Income)
        - Expenses: XDC (Direct Costs/COGS), XPE (Personnel/Salaries), XTE (Tech & Tools), XAD (Admin/Operating Expenses)

        Return ONLY a raw JSON object with keys:
        - "account_class": (One of ["Assets", "Liabilities", "Equity", "Revenue", "Expenses"])
        - "group_code": (Must be one of the Allowed Group Codes above)
        - "confidence": (Number between 0.80 and 0.95)
        - "reason": (Brief 1-sentence explanation)
        """

        try:
            raw_response = await groq_pool.execute_prompt(prompt, temperature=0.1, max_tokens=150)
            cleaned = raw_response.strip().replace("```json", "").replace("```", "").strip()
            parsed = json.loads(cleaned)

            cls = parsed.get("account_class", "Expenses")
            grp = parsed.get("group_code", "XAD")
            conf = float(parsed.get("confidence", 0.85))
            reason = str(parsed.get("reason", "LLM fallback mapping"))

            if grp not in self.ALLOWED_GROUPS:
                grp = "XAD"
                cls = "Expenses"

            return cls, grp, min(max(conf, 0.80), 0.94), f"LLM_RESOLVER: {reason}"
        except Exception as e:
            # Safe fallback if AI fails or times out
            return "Expenses", "XAD", 0.80, "LLM_FALLBACK_DEFAULT"

llm_resolver = LLMResolver()
