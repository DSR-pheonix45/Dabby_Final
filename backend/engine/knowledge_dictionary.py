from typing import Dict, List, Optional, Tuple

class KnowledgeDictionary:
    """
    Expandable financial ontology dictionary mapping business terms & synonyms
    to standard ALERX Classes (A, L, E, R, X) and 18 Group Codes.
    """

    # Group code maps:
    # Assets: ACO, AAR, AIN, AFA, AOT
    # Liabilities: LAP, LST, LDE, LOT
    # Equity: ESC, ERE, EOU
    # Revenue: ROP, RCR
    # Expenses: XDC, XPE, XTE, XAD

    KEYWORD_MAPPINGS: List[Tuple[List[str], str, str]] = [
        # Assets (A)
        (["bank", "petty cash", "cash in hand", "hdfc", "icici", "sbi", "axis bank", "stripe", "razorpay", "paypal"], "Assets", "ACO"),
        (["debtor", "receivable", "client invoice", "unbilled revenue", "trade receivable", "customer outstanding"], "Assets", "AAR"),
        (["raw material", "stock", "inventory", "work-in-progress", "wip", "finished goods", "merchandise"], "Assets", "AIN"),
        (["computer", "laptop", "machinery", "equipment", "furniture", "vehicle", "office premises", "software ip"], "Assets", "AFA"),
        (["input gst", "cgst input", "sgst input", "igst input", "tds receivable", "prepaid expense", "prepaid insurance", "security deposit", "rent deposit"], "Assets", "AOT"),

        # Liabilities (L)
        (["creditor", "payable", "vendor bill", "trade payable", "subcontractor payable", "supplier outstanding"], "Liabilities", "LAP"),
        (["output gst", "cgst output", "sgst output", "igst output", "gst payable", "tds payable", "pf payable", "esi payable", "sales tax payable", "vat payable"], "Liabilities", "LST"),
        (["overdraft", "bank loan", "credit line", "working capital loan", "borrowing", "term loan", "promoter loan"], "Liabilities", "LDE"),
        (["accrued expense", "outstanding expense", "customer advance", "deferred revenue", "provision for tax"], "Liabilities", "LOT"),

        # Equity (E)
        (["share capital", "paid-up capital", "equity capital", "partner capital", "owner capital", "corpus fund"], "Equity", "ESC"),
        (["retained earnings", "general reserve", "accumulated profit", "surplus", "retained surplus"], "Equity", "ERE"),
        (["drawings", "owner drawings", "partner drawings", "securities premium"], "Equity", "EOU"),

        # Revenue (R)
        (["sales", "operating revenue", "subscription revenue", "arr", "mrr", "service income", "consulting fee", "product sales", "contract revenue"], "Revenue", "ROP"),
        (["interest income", "forex gain", "other income", "scrap sales", "asset sale gain", "dividend income"], "Revenue", "RCR"),

        # Expenses (X)
        (["cogs", "cost of goods sold", "raw material consumed", "cloud infrastructure", "aws", "gcp", "azure", "freight", "customs duty", "factory power"], "Expenses", "XDC"),
        (["salary", "salaries", "wages", "payroll", "staff welfare", "employee benefits", "director remuneration", "bonus", "stipend"], "Expenses", "XPE"),
        (["software subscription", "saas tool", "github", "jira", "slack", "notion", "domain", "hosting", "it tools"], "Expenses", "XTE"),
        (["rent", "office rent", "utility", "electricity", "water", "marketing", "advertising", "legal fee", "audit fee", "bank charges", "depreciation", "travel", "conveyance"], "Expenses", "XAD")
    ]

    def lookup(self, text: str) -> Optional[Tuple[str, str]]:
        txt = text.lower()
        for keywords, cls, grp in self.KEYWORD_MAPPINGS:
            for kw in keywords:
                if kw in txt:
                    return cls, grp
        return None

knowledge_dictionary = KnowledgeDictionary()
