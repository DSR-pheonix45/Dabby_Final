import xml.etree.ElementTree as ET
import csv
import io
from typing import List
from adapters.base_adapter import BaseERPAdapter
from schemas.coa_translation import UniversalCOAObject

class TallyAdapter(BaseERPAdapter):
    def can_handle(self, file_content: bytes, filename: str, mime_type: str = "") -> bool:
        fn = filename.lower()
        if "tally" in fn:
            return True
        # Check XML root tag for TALLYMESSAGE or ENVELOPE
        try:
            sample = file_content[:500].decode("utf-8", errors="ignore").lower()
            if "<tallymessage" in sample or "<envelope" in sample or "tally" in sample:
                return True
        except Exception:
            pass
        return False

    def parse(self, file_content: bytes, filename: str) -> List[UniversalCOAObject]:
        text = file_content.decode("utf-8", errors="ignore")
        results: List[UniversalCOAObject] = []

        # Try parsing XML format first
        if "<envelope" in text.lower() or "<tallymessage" in text.lower():
            try:
                root = ET.fromstring(text)
                # Find all LEDGER nodes
                for ledger in root.findall(".//LEDGER"):
                    name = ledger.get("NAME") or ""
                    if not name:
                        name_elem = ledger.find("NAME")
                        if name_elem is not None:
                            name = name_elem.text or ""
                    
                    parent_elem = ledger.find("PARENT")
                    parent = parent_elem.text if parent_elem is not None else ""

                    if name.strip():
                        results.append(UniversalCOAObject(
                            external_id=name.strip(),
                            source_erp="tally",
                            account_name=name.strip(),
                            parent_account=parent.strip() if parent else None,
                            account_type=parent.strip() if parent else None,
                            metadata={"tally_xml": True}
                        ))
                if results:
                    return results
            except Exception:
                pass

        # Fallback to CSV / TSV parsing for Tally Export spreadsheets
        lines = [line for line in text.splitlines() if line.strip()]
        if lines:
            reader = csv.reader(lines)
            header = None
            for row in reader:
                if not row or not any(row):
                    continue
                row_str = [r.strip() for r in row]
                if not header:
                    # Check if row looks like header
                    if any("name" in r.lower() or "ledger" in r.lower() or "particular" in r.lower() for r in row_str):
                        header = [r.lower() for r in row_str]
                        continue
                
                acc_name = row_str[0] if len(row_str) > 0 else ""
                acc_parent = row_str[1] if len(row_str) > 1 else ""

                if acc_name and not any(h_kw in acc_name.lower() for h_kw in ["ledger", "particulars", "sl.no", "account name"]):
                    results.append(UniversalCOAObject(
                        source_erp="tally",
                        account_name=acc_name,
                        parent_account=acc_parent if acc_parent else None,
                        account_type=acc_parent if acc_parent else None,
                        metadata={"format": "csv"}
                    ))

        return results
