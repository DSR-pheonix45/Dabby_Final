import csv
import io
from typing import List
from adapters.base_adapter import BaseERPAdapter
from schemas.coa_translation import UniversalCOAObject

class ZohoAdapter(BaseERPAdapter):
    def can_handle(self, file_content: bytes, filename: str, mime_type: str = "") -> bool:
        fn = filename.lower()
        if "zoho" in fn:
            return True
        try:
            text = file_content[:1000].decode("utf-8", errors="ignore").lower()
            if "zoho" in text or ("account name" in text and "account type" in text and "parent account" in text):
                return True
        except Exception:
            pass
        return False

    def parse(self, file_content: bytes, filename: str) -> List[UniversalCOAObject]:
        text = file_content.decode("utf-8", errors="ignore")
        results: List[UniversalCOAObject] = []

        lines = [line for line in text.splitlines() if line.strip()]
        if not lines:
            return results

        reader = csv.reader(lines)
        headers = []
        name_idx, code_idx, type_idx, parent_idx, desc_idx = -1, -1, -1, -1, -1

        for row_idx, row in enumerate(reader):
            clean_row = [r.strip() for r in row]
            if not clean_row or not any(clean_row):
                continue

            if not headers:
                lower_row = [r.lower() for r in clean_row]
                if any("account" in r for r in lower_row):
                    headers = lower_row
                    for idx, col in enumerate(headers):
                        if "account name" in col or "ledger" in col or col == "name":
                            name_idx = idx
                        elif "account code" in col or "code" in col:
                            code_idx = idx
                        elif "account type" in col or "type" in col:
                            type_idx = idx
                        elif "parent" in col:
                            parent_idx = idx
                        elif "description" in col or "desc" in col:
                            desc_idx = idx
                    continue

            # Process data rows
            acc_name = clean_row[name_idx] if name_idx >= 0 and name_idx < len(clean_row) else (clean_row[0] if clean_row else "")
            acc_code = clean_row[code_idx] if code_idx >= 0 and code_idx < len(clean_row) else None
            acc_type = clean_row[type_idx] if type_idx >= 0 and type_idx < len(clean_row) else None
            acc_parent = clean_row[parent_idx] if parent_idx >= 0 and parent_idx < len(clean_row) else None
            acc_desc = clean_row[desc_idx] if desc_idx >= 0 and desc_idx < len(clean_row) else None

            if acc_name and not any(kw in acc_name.lower() for kw in ["account name", "sl.no", "total"]):
                results.append(UniversalCOAObject(
                    source_erp="zoho",
                    account_name=acc_name,
                    account_code=acc_code,
                    account_type=acc_type,
                    parent_account=acc_parent,
                    description=acc_desc,
                    metadata={"zoho_export": True}
                ))

        return results
