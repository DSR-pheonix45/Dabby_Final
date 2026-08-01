import csv
import json
from typing import List
from adapters.base_adapter import BaseERPAdapter
from schemas.coa_translation import UniversalCOAObject

class QuickBooksAdapter(BaseERPAdapter):
    def can_handle(self, file_content: bytes, filename: str, mime_type: str = "") -> bool:
        fn = filename.lower()
        if "quickbooks" in fn or "qbo" in fn or "qbd" in fn:
            return True
        try:
            text = file_content[:1000].decode("utf-8", errors="ignore").lower()
            if "quickbooks" in text or "detail type" in text or "sub-account" in text:
                return True
        except Exception:
            pass
        return False

    def parse(self, file_content: bytes, filename: str) -> List[UniversalCOAObject]:
        text = file_content.decode("utf-8", errors="ignore")
        results: List[UniversalCOAObject] = []

        # Check JSON format
        if text.strip().startswith("{") or text.strip().startswith("["):
            try:
                data = json.loads(text)
                items = data.get("QueryResponse", {}).get("Account", []) if isinstance(data, dict) else data
                for item in items:
                    if isinstance(item, dict):
                        name = item.get("Name") or item.get("FullyQualifiedName") or ""
                        acc_type = item.get("AccountType") or item.get("Classification") or ""
                        parent = item.get("ParentRef", {}).get("name") if isinstance(item.get("ParentRef"), dict) else None
                        if name:
                            results.append(UniversalCOAObject(
                                external_id=str(item.get("Id", "")),
                                source_erp="quickbooks",
                                account_name=name,
                                account_type=acc_type,
                                parent_account=parent,
                                metadata={"qb_detail_type": item.get("AccountSubType")}
                            ))
                if results:
                    return results
            except Exception:
                pass

        # CSV format
        lines = [line for line in text.splitlines() if line.strip()]
        if not lines:
            return results

        reader = csv.reader(lines)
        headers = []
        name_idx, type_idx, detail_type_idx, desc_idx = -1, -1, -1, -1

        for row in reader:
            clean_row = [r.strip() for r in row]
            if not clean_row or not any(clean_row):
                continue

            if not headers:
                lower_row = [r.lower() for r in clean_row]
                if any("account" in r or "type" in r for r in lower_row):
                    headers = lower_row
                    for idx, col in enumerate(headers):
                        if "account" in col or "name" in col:
                            name_idx = idx
                        elif col == "type" or "account type" in col:
                            type_idx = idx
                        elif "detail type" in col or "sub-type" in col:
                            detail_type_idx = idx
                        elif "description" in col:
                            desc_idx = idx
                    continue

            acc_name = clean_row[name_idx] if name_idx >= 0 and name_idx < len(clean_row) else clean_row[0]
            acc_type = clean_row[type_idx] if type_idx >= 0 and type_idx < len(clean_row) else None
            detail_type = clean_row[detail_type_idx] if detail_type_idx >= 0 and detail_type_idx < len(clean_row) else None
            acc_desc = clean_row[desc_idx] if desc_idx >= 0 and desc_idx < len(clean_row) else None

            # Handle colon separated QuickBooks sub-accounts: "Expenses:Travel:Airfare"
            parent = None
            if ":" in acc_name:
                parts = acc_name.split(":")
                acc_name = parts[-1].strip()
                parent = ":".join(parts[:-1]).strip()

            if acc_name and not any(kw in acc_name.lower() for kw in ["account", "detail type", "total"]):
                results.append(UniversalCOAObject(
                    source_erp="quickbooks",
                    account_name=acc_name,
                    account_type=acc_type,
                    parent_account=parent,
                    description=acc_desc,
                    metadata={"detail_type": detail_type}
                ))

        return results
