import csv
import xml.etree.ElementTree as ET
from typing import List
from adapters.base_adapter import BaseERPAdapter
from schemas.coa_translation import UniversalCOAObject

class SAPAdapter(BaseERPAdapter):
    def can_handle(self, file_content: bytes, filename: str, mime_type: str = "") -> bool:
        fn = filename.lower()
        if "sap" in fn or "oracle" in fn or "gl_account" in fn:
            return True
        try:
            text = file_content[:1000].decode("utf-8", errors="ignore").lower()
            if "chartofaccounts" in text or "glaccount" in text or "cost center" in text:
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
        name_idx, code_idx, type_idx, parent_idx = -1, -1, -1, -1

        for row in reader:
            clean_row = [r.strip() for r in row]
            if not clean_row or not any(clean_row):
                continue

            if not headers:
                lower_row = [r.lower() for r in clean_row]
                if any("gl" in r or "account" in r or "saknr" in r or "txt50" in r for r in lower_row):
                    headers = lower_row
                    for idx, col in enumerate(headers):
                        if any(k in col for k in ["txt50", "name", "description", "gl_account_name"]):
                            name_idx = idx
                        elif any(k in col for k in ["saknr", "code", "account_id", "gl_account_number"]):
                            code_idx = idx
                        elif any(k in col for k in ["type", "ktokt", "account_group"]):
                            type_idx = idx
                        elif any(k in col for k in ["parent", "group", "hierarchy"]):
                            parent_idx = idx
                    continue

            acc_name = clean_row[name_idx] if name_idx >= 0 and name_idx < len(clean_row) else clean_row[0]
            acc_code = clean_row[code_idx] if code_idx >= 0 and code_idx < len(clean_row) else None
            acc_type = clean_row[type_idx] if type_idx >= 0 and type_idx < len(clean_row) else None
            acc_parent = clean_row[parent_idx] if parent_idx >= 0 and parent_idx < len(clean_row) else None

            if acc_name and not any(kw in acc_name.lower() for kw in ["gl account", "txt50", "saknr"]):
                results.append(UniversalCOAObject(
                    source_erp="sap",
                    account_name=acc_name,
                    account_code=acc_code,
                    account_type=acc_type,
                    parent_account=acc_parent,
                    metadata={"sap_oracle": True}
                ))

        return results
