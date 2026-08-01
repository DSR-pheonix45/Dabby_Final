from typing import Dict

class SequenceGenerator:
    """
    Atomic Sequence Generator:
    Assigns sequential 3-digit ALERX full codes (e.g. A-ACO-001, X-XAD-021)
    maintaining counters per group code per workbench session.
    """

    CLASS_PREFIX_MAP: Dict[str, str] = {
        "Assets": "A",
        "Liabilities": "L",
        "Equity": "E",
        "Revenue": "R",
        "Expenses": "X"
    }

    def __init__(self):
        self.counters: Dict[str, int] = {}

    def reset(self):
        self.counters = {}

    def generate_code(self, account_class: str, group_code: str) -> str:
        prefix = self.CLASS_PREFIX_MAP.get(account_class, "A")
        key = f"{prefix}-{group_code}"
        
        self.counters[key] = self.counters.get(key, 0) + 1
        seq_num = str(self.counters[key]).zfill(3)

        return f"{key}-{seq_num}"

sequence_generator = SequenceGenerator()
