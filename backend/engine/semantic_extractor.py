from typing import Dict, Any, Optional
from schemas.coa_translation import UniversalCOAObject, StructuralFlags

class SemanticExtractor:
    """
    Extracts multi-dimensional semantic feature vectors from normalized account text,
    parent ancestry, structural flags, tax context, and ERP attributes.
    """

    TAX_PATTERNS = ["gst", "tds", "vat", "sales tax", "pf", "esi", "income tax", "customs"]
    BANK_PATTERNS = ["bank", "cash", "petty cash", "stripe", "razorpay", "paypal"]

    def extract_features(self, item: UniversalCOAObject, flags: StructuralFlags, normalized_name: str) -> Dict[str, Any]:
        combined_text = f"{normalized_name} {flags.parent_chain or ''} {item.account_type or ''} {item.description or ''}".lower()
        
        is_tax = any(t in combined_text for t in self.TAX_PATTERNS)
        is_bank = any(b in combined_text for b in self.BANK_PATTERNS)
        is_payroll = any(p in combined_text for p in ["salary", "payroll", "wages", "stipend", "bonus"])

        # Detect class hint from ERP type or parent lineage
        class_hint = None
        if item.account_type:
            at = item.account_type.lower()
            if "asset" in at:
                class_hint = "Assets"
            elif "liab" in at or "payable" in at:
                class_hint = "Liabilities"
            elif "equity" in at or "capital" in at:
                class_hint = "Equity"
            elif "rev" in at or "income" in at or "sale" in at:
                class_hint = "Revenue"
            elif "exp" in at or "cost" in at:
                class_hint = "Expenses"

        return {
            "normalized_name": normalized_name,
            "parent_chain": flags.parent_chain,
            "is_sub_account": flags.is_sub_account,
            "is_header_group": flags.is_header_group,
            "is_summary_total": flags.is_summary_total,
            "is_tax": is_tax,
            "is_bank": is_bank,
            "is_payroll": is_payroll,
            "class_hint": class_hint
        }

semantic_extractor = SemanticExtractor()
