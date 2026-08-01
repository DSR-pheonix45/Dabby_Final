from typing import Tuple, Optional

class Validator:
    """
    Validation Engine:
    Detects impossible or illogical accounting mappings and suggests corrective actions.
    """

    IMPOSSIBLE_RULES = [
        # (Pattern, Forbidden Class, Correct Class, Correct Group, Error Note)
        (["salary", "payroll", "wages"], "Revenue", "Expenses", "XPE", "Salary cannot be Revenue; mapped to Expenses (XPE)."),
        (["bank loan", "overdraft", "credit line"], "Revenue", "Liabilities", "LDE", "Bank Loan cannot be Revenue; mapped to Liabilities (LDE)."),
        (["gst payable", "tds payable", "pf payable"], "Assets", "Liabilities", "LST", "Tax Payable cannot be Asset; mapped to Liabilities (LST)."),
        (["trade debtor", "customer receivable"], "Expenses", "Assets", "AAR", "Trade Receivable cannot be Expense; mapped to Assets (AAR)."),
        (["trade creditor", "vendor payable"], "Revenue", "Liabilities", "LAP", "Trade Payable cannot be Revenue; mapped to Liabilities (LAP).")
    ]

    def validate_mapping(self, account_name: str, mapped_class: str, mapped_group: str) -> Tuple[str, Optional[str], str, str]:
        """
        Returns (validation_status, validation_notes, corrected_class, corrected_group)
        validation_status: 'valid' | 'rejected' | 'warning'
        """
        name_lower = account_name.lower()

        for keywords, forbidden_cls, correct_cls, correct_grp, note in self.IMPOSSIBLE_RULES:
            if any(kw in name_lower for kw in keywords):
                if mapped_class == forbidden_cls:
                    return "rejected", note, correct_cls, correct_grp

        return "valid", None, mapped_class, mapped_group

validator = Validator()
