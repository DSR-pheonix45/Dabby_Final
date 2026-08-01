import csv
import io
from typing import List
from adapters.base_adapter import BaseERPAdapter
from schemas.coa_translation import UniversalCOAObject

class CSVGenericAdapter(BaseERPAdapter):
    def can_handle(self, file_content: bytes, filename: str, mime_type: str = "") -> bool:
        # Fallback adapter that can handle any text/csv/tsv file
        return True

    def is_binary_garbage(self, str_val: str) -> bool:
        if not str_val or not isinstance(str_val, str):
            return True
        if any(b in str_val for b in ["PK\x03\x04", "[Content_Types]", "xl/worksheets", "xml"]):
            return True
        clean_ascii = "".join([c for c in str_val if 32 <= ord(c) <= 126])
        return len(clean_ascii) < len(str_val) * 0.75 or len(clean_ascii.strip()) == 0

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
                for idx, col in enumerate(lower_row):
                    if any(k in col for k in ["account", "ledger", "particular", "name", "title"]):
                        if name_idx == -1:
                            name_idx = idx
                    elif any(k in col for k in ["code", "no.", "id", "sl.no"]):
                        if code_idx == -1:
                            code_idx = idx
                    elif any(k in col for k in ["type", "group", "class", "category"]):
                        if type_idx == -1:
                            type_idx = idx
                    elif any(k in col for k in ["parent", "under", "head"]):
                        if parent_idx == -1:
                            parent_idx = idx

                if name_idx >= 0:
                    headers = lower_row
                    continue

            # Fallback if no header row found
            if name_idx == -1:
                name_idx = 0
                if len(clean_row) > 1:
                    type_idx = 1

            acc_name = clean_row[name_idx] if name_idx >= 0 and name_idx < len(clean_row) else clean_row[0]
            acc_code = clean_row[code_idx] if code_idx >= 0 and code_idx < len(clean_row) else None
            acc_type = clean_row[type_idx] if type_idx >= 0 and type_idx < len(clean_row) else None
            acc_parent = clean_row[parent_idx] if parent_idx >= 0 and parent_idx < len(clean_row) else None

            if acc_name and not self.is_binary_garbage(acc_name):
                # Filter obvious header rows
                if any(hdr_term in acc_name.lower() for hdr_term in ["account name", "ledger name", "sl.no", "particulars", "account type"]):
                    continue
                results.append(UniversalCOAObject(
                    source_erp="generic",
                    account_name=acc_name,
                    account_code=acc_code,
                    account_type=acc_type,
                    parent_account=acc_parent
                ))

        return results
