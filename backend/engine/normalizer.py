import re
from typing import Dict

class Normalizer:
    """
    STAGE 2 PRE-PROCESSING ENGINE:
    Dictionary-driven term cleaning, abbreviation expansion, unicode stripping,
    and canonical formatting for account names and sub-account parent terms.
    """

    TERM_DICTIONARY: Dict[str, str] = {
        r"\ba/c\b": "Account",
        r"\bacc\b": "Account",
        r"\baccts\b": "Accounts",
        r"\bdr\b": "Debtors",
        r"\bcr\b": "Creditors",
        r"\brecv\b": "Receivable",
        r"\breceivables\b": "Receivable",
        r"\bpayables\b": "Payable",
        r"\bexp\b": "Expense",
        r"\bexps\b": "Expenses",
        r"\binc\b": "Income",
        r"\bgst\s+inp\b": "Input GST",
        r"\bgst\s+out\b": "Output GST",
        r"\bcgst\b": "CGST",
        r"\bsgst\b": "SGST",
        r"\bigst\b": "IGST",
        r"\btds\b": "TDS",
        r"\bpf\b": "Provident Fund",
        r"\besi\b": "ESI",
        r"\bchq\b": "Cheque",
        r"\bbal\b": "Balance",
        r"\bmfg\b": "Manufacturing",
        r"\badmin\b": "Administrative",
        r"\bprof\b": "Professional",
        r"\bsrv\b": "Service",
        r"\bsrvc\b": "Service",
        r"\bsub\b": "Subscription",
        r"\btech\b": "Technology",
        r"\badv\b": "Advance"
    }

    def normalize_text(self, raw_text: str) -> str:
        if not raw_text or not isinstance(raw_text, str):
            return ""

        # Stripping non-printable unicode / garbage
        cleaned = re.sub(r"[^\x20-\x7E]", " ", raw_text)
        
        # Standardize spaces and casing
        cleaned = re.sub(r"\s+", " ", cleaned).strip()

        # Dictionary replacement
        for pattern, replacement in self.TERM_DICTIONARY.items():
            cleaned = re.sub(pattern, replacement, cleaned, flags=re.IGNORECASE)

        # Final space cleanup
        cleaned = re.sub(r"\s+", " ", cleaned).strip()
        return cleaned

normalizer = Normalizer()
