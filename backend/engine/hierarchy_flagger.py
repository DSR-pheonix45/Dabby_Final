import re
from typing import List, Tuple
from schemas.coa_translation import UniversalCOAObject, StructuralFlags

class HierarchyFlagger:
    """
    STAGE 1 PRE-PROCESSING ENGINE:
    Analyzes raw ERP accounts to extract structural hierarchy, parent ancestry paths,
    flag sub-accounts vs header groups, nesting levels, and summary total rows.
    """

    HEADER_GROUP_KEYWORDS = [
        "current assets", "fixed assets", "non-current assets", "other assets",
        "current liabilities", "long term liabilities", "non-current liabilities",
        "duties & taxes", "duties and taxes", "provisions", "trade payables", "trade receivables",
        "operating revenue", "direct income", "indirect income", "other income",
        "direct expenses", "indirect expenses", "cost of sales", "administrative expenses",
        "personnel expenses", "operating expenses", "capital account", "reserves & surplus"
    ]

    SUMMARY_TOTAL_KEYWORDS = [
        "total ", "grand total", "net total", "subtotal", "balance c/f", "balance b/f"
    ]

    def process(self, raw_accounts: List[UniversalCOAObject]) -> List[Tuple[UniversalCOAObject, StructuralFlags]]:
        processed = []
        
        # Build set of all parent accounts present in dataset
        declared_parents = set()
        for item in raw_accounts:
            if item.parent_account:
                declared_parents.add(item.parent_account.strip().lower())
            if ":" in item.account_name:
                parts = item.account_name.split(":")
                for p in parts[:-1]:
                    declared_parents.add(p.strip().lower())

        for item in raw_accounts:
            name_lower = item.account_name.strip().lower()

            # Check if summary total row
            is_summary_total = any(tk in name_lower for tk in self.SUMMARY_TOTAL_KEYWORDS)

            # Check if header group
            is_header_group = (
                name_lower in declared_parents or
                any(hk in name_lower for hk in self.HEADER_GROUP_KEYWORDS) or
                (item.account_type and "group" in item.account_type.lower())
            )

            # Compute parent chain and hierarchy depth
            parent_chain_parts = []
            if item.parent_account:
                parent_chain_parts.append(item.parent_account.strip())
            
            is_sub_account = bool(item.parent_account or ":" in item.account_name)
            
            if ":" in item.account_name:
                parts = [p.strip() for p in item.account_name.split(":") if p.strip()]
                if len(parts) > 1:
                    parent_chain_parts = parts[:-1]

            hierarchy_depth = len(parent_chain_parts) + (1 if not is_sub_account else 2)
            parent_chain = " > ".join(parent_chain_parts) if parent_chain_parts else None

            flags = StructuralFlags(
                is_sub_account=is_sub_account,
                is_header_group=is_header_group and not is_summary_total,
                hierarchy_depth=hierarchy_depth,
                parent_chain=parent_chain,
                is_summary_total=is_summary_total
            )

            processed.append((item, flags))

        return processed

hierarchy_flagger = HierarchyFlagger()
