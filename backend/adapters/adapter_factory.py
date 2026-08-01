from typing import List, Optional
from adapters.base_adapter import BaseERPAdapter
from adapters.tally_adapter import TallyAdapter
from adapters.zoho_adapter import ZohoAdapter
from adapters.quickbooks_adapter import QuickBooksAdapter
from adapters.sap_adapter import SAPAdapter
from adapters.csv_generic_adapter import CSVGenericAdapter

class AdapterFactory:
    def __init__(self):
        self.adapters: List[BaseERPAdapter] = [
            TallyAdapter(),
            ZohoAdapter(),
            QuickBooksAdapter(),
            SAPAdapter(),
            CSVGenericAdapter() # Always fallback
        ]

    def get_adapter(self, file_content: bytes, filename: str, explicit_erp: Optional[str] = None) -> BaseERPAdapter:
        if explicit_erp:
            erp_lower = explicit_erp.lower()
            if "tally" in erp_lower:
                return TallyAdapter()
            elif "zoho" in erp_lower:
                return ZohoAdapter()
            elif "quickbooks" in erp_lower or "qbo" in erp_lower:
                return QuickBooksAdapter()
            elif "sap" in erp_lower or "oracle" in erp_lower:
                return SAPAdapter()

        for adapter in self.adapters:
            if adapter.can_handle(file_content, filename):
                return adapter

        return CSVGenericAdapter()

adapter_factory = AdapterFactory()
