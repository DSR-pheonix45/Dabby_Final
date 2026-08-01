from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

class UniversalCOAObject(BaseModel):
    external_id: Optional[str] = None
    source_erp: str = "generic" # tally, zoho, quickbooks, sap, oracle, odoo, generic
    account_name: str
    account_code: Optional[str] = None
    account_type: Optional[str] = None
    parent_account: Optional[str] = None
    description: Optional[str] = None
    currency: Optional[str] = "INR"
    is_active: bool = True
    metadata: Dict[str, Any] = Field(default_factory=dict)

class StructuralFlags(BaseModel):
    is_sub_account: bool = False
    is_header_group: bool = False
    hierarchy_depth: int = 1
    parent_chain: Optional[str] = None
    is_summary_total: bool = False

class ProcessedLedgerItem(BaseModel):
    external_id: Optional[str] = None
    original_name: str
    original_type: Optional[str] = None
    parent_name: Optional[str] = None
    normalized_name: str
    flags: StructuralFlags
    semantic_tags: Dict[str, Any] = Field(default_factory=dict)
    mapped_class: str # Assets, Liabilities, Equity, Revenue, Expenses
    mapped_group_code: str # ACO, LAP, ROP, XDC, etc.
    generated_full_code: str # A-ACO-001
    confidence_score: float # 0.0 to 1.0
    mapping_source: str # rule, dictionary, llm, user_override
    ai_reasoning: Optional[str] = None
    validation_status: str = "valid" # valid, warning, rejected
    validation_notes: Optional[str] = None

class COATranslationJobSummary(BaseModel):
    job_id: str
    workbench_id: str
    source_erp: str
    file_name: str
    total_ledgers: int
    auto_mapped_count: int
    ai_assisted_count: int
    manual_review_count: int
    status: str
    confidence_distribution: Dict[str, int]

class OverrideRequestPayload(BaseModel):
    workbench_id: str
    job_id: str
    ledger_id: Optional[str] = None
    raw_account_name: str
    corrected_class: str
    corrected_group_code: str

class CommitTranslationPayload(BaseModel):
    workbench_id: str
    job_id: str
    confirmed_ledgers: Optional[List[Dict[str, Any]]] = None
