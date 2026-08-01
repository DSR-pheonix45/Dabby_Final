from typing import Dict, Any, Optional, Tuple
from schemas.coa_translation import UniversalCOAObject, StructuralFlags

class RuleEngine:
    """
    Configurable, priority-ranked deterministic Rule Engine.
    Executes rules before AI, returning (class, group_code, confidence_score, rule_name).
    """

    def evaluate(self, item: UniversalCOAObject, flags: StructuralFlags, normalized_name: str, features: Dict[str, Any], industry: Optional[str] = None) -> Optional[Tuple[str, str, float, str]]:
        name_lower = normalized_name.lower()
        parent_lower = (flags.parent_chain or "").lower()
        type_lower = (item.account_type or "").lower()
        comb = f"{name_lower} {parent_lower} {type_lower}"

        # Rule 1: Cash & Bank Accounts -> ACO
        if any(b in comb for b in ["bank account", "petty cash", "cash in hand", "current account", "savings account"]):
            if not any(l in comb for l in ["loan", "overdraft"]):
                return "Assets", "ACO", 0.98, "RULE_CASH_BANK"

        # Rule 2: Trade Receivables / Debtors -> AAR
        if any(r in comb for r in ["trade debtors", "accounts receivable", "client receivable", "unbilled revenue"]):
            return "Assets", "AAR", 0.96, "RULE_RECEIVABLES"

        # Rule 3: Trade Payables / Creditors -> LAP
        if any(p in comb for p in ["trade creditors", "accounts payable", "vendor payable", "supplier payable"]):
            return "Liabilities", "LAP", 0.96, "RULE_PAYABLES"

        # Rule 4: Statutory & Tax Liabilities -> LST
        if any(t in comb for t in ["output gst", "cgst output", "sgst output", "igst output", "tds payable", "pf payable", "esi payable"]):
            return "Liabilities", "LST", 0.97, "RULE_STATUTORY_TAX"

        # Rule 5: Input Tax Credits -> AOT
        if any(t in comb for t in ["input gst", "cgst input", "sgst input", "igst input", "tds receivable"]):
            return "Assets", "AOT", 0.97, "RULE_INPUT_TAX"

        # Rule 6: Salaries & Payroll Expenses -> XPE
        if features.get("is_payroll") or any(s in comb for s in ["salary", "wages", "payroll", "staff welfare"]):
            return "Expenses", "XPE", 0.96, "RULE_SALARY_PAYROLL"

        # Rule 7: Cost of Goods Sold (COGS) -> XDC
        if any(c in comb for c in ["cost of goods sold", "cogs", "raw material consumed"]):
            return "Expenses", "XDC", 0.97, "RULE_COGS"

        # Rule 8: Paid-Up Equity Share Capital -> ESC
        if any(e in comb for e in ["share capital", "paid-up capital", "owner capital", "equity share capital"]):
            return "Equity", "ESC", 0.98, "RULE_SHARE_CAPITAL"

        # Rule 9: Retained Earnings -> ERE
        if any(e in comb for e in ["retained earnings", "general reserve", "accumulated profit"]):
            return "Equity", "ERE", 0.98, "RULE_RETAINED_EARNINGS"

        # Rule 10: Operating Revenue -> ROP
        if any(r in comb for r in ["sales revenue", "operating revenue", "subscription revenue", "saas mrr", "service income"]):
            return "Revenue", "ROP", 0.96, "RULE_OPERATING_REVENUE"

        return None

rule_engine = RuleEngine()
