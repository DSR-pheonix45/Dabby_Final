from typing import Dict, List, Tuple, Optional

class IndustryOntology:
    """
    Industry-specific ontology overlays that refine semantic feature vectors
    and classification rules based on business sector & domain context.
    """

    INDUSTRY_OVERLAYS: Dict[str, List[Tuple[List[str], str, str]]] = {
        "saas": [
            (["aws", "gcp", "azure", "openai", "cloud credits", "api cost", "datadog", "cloudflare"], "Expenses", "XDC"),
            (["mrr", "arr", "saas subscription", "stripe billing"], "Revenue", "ROP"),
            (["deferred revenue", "unearned subscription"], "Liabilities", "LOT"),
            (["github", "jira", "figma", "linear", "vercel", "sentry"], "Expenses", "XTE")
        ],
        "construction": [
            (["retention money", "ra bills", "contract progress billing"], "Assets", "AAR"),
            (["mobilization advance", "client advance"], "Liabilities", "LOT"),
            (["subcontractor charges", "site material", "cement", "steel", "heavy machinery rental"], "Expenses", "XDC"),
            (["security deposit", "emd deposit"], "Assets", "AOT")
        ],
        "manufacturing": [
            (["raw material inventory", "work in progress", "wip", "finished goods inventory"], "Assets", "AIN"),
            (["factory power", "plant maintenance", "direct labor", "freight in"], "Expenses", "XDC"),
            (["machinery & equipment", "plant & building"], "Assets", "AFA")
        ],
        "retail": [
            (["merchandise stock", "store inventory"], "Assets", "AIN"),
            (["pos sales", "counter sales", "e-commerce revenue"], "Revenue", "ROP"),
            (["store rent", "mall maintenance"], "Expenses", "XAD")
        ],
        "non-profit": [
            (["grants receivable", "pledges receivable"], "Assets", "AAR"),
            (["donor contributions", "grant income", "donations"], "Revenue", "ROP"),
            (["corpus fund", "endowment reserve"], "Equity", "ESC")
        ]
    }

    def get_overlay_mapping(self, industry: str, text: str) -> Optional[Tuple[str, str]]:
        if not industry:
            return None
        
        ind_key = industry.lower()
        matched_overlay = None

        for k in self.INDUSTRY_OVERLAYS:
            if k in ind_key:
                matched_overlay = self.INDUSTRY_OVERLAYS[k]
                break

        if not matched_overlay:
            return None

        txt = text.lower()
        for keywords, cls, grp in matched_overlay:
            if any(kw in txt for kw in keywords):
                return cls, grp

        return None

industry_ontology = IndustryOntology()
