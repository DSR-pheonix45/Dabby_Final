"""
Pydantic models for the 13-step Accounting Document Extraction Engine.
Every field is Optional with a default of None — the LLM only populates
what it can confidently extract from the document.
"""

from typing import List, Optional
from pydantic import BaseModel, Field


# ── Step 1 + 2: Document Classification & Metadata ──────────────────────

class DocumentMetadata(BaseModel):
    document_type: Optional[str] = Field(
        None,
        description="One of: sales_invoice, customer_payment, vendor_invoice, vendor_payment, "
                    "bank_statement, expense_receipt, payroll, credit_note, debit_note, "
                    "loan_agreement, investment_agreement, tax_document, purchase_order, "
                    "sales_order, unknown"
    )
    confidence: Optional[float] = Field(None, ge=0, le=1)
    document_date: Optional[str] = None
    currency: Optional[str] = None
    document_number: Optional[str] = None
    language: Optional[str] = None


# ── Step 3: Parties ─────────────────────────────────────────────────────

class PartyInfo(BaseModel):
    customer_name: Optional[str] = None
    vendor_name: Optional[str] = None
    payer_name: Optional[str] = None
    payee_name: Optional[str] = None
    gst_number: Optional[str] = None
    pan_number: Optional[str] = None
    address: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None


# ── Step 4: Financials ──────────────────────────────────────────────────

class Financials(BaseModel):
    subtotal: Optional[float] = None
    discount: Optional[float] = None
    tax_amount: Optional[float] = None
    shipping_amount: Optional[float] = None
    other_charges: Optional[float] = None
    round_off: Optional[float] = None
    total_amount: Optional[float] = None
    currency: Optional[str] = None


# ── Step 5: Payment Details ─────────────────────────────────────────────

class PaymentDetails(BaseModel):
    payment_method: Optional[str] = None
    payment_status: Optional[str] = None
    due_date: Optional[str] = None
    payment_date: Optional[str] = None
    bank_name: Optional[str] = None
    account_number: Optional[str] = None
    transaction_reference: Optional[str] = None
    cheque_number: Optional[str] = None
    upi_reference: Optional[str] = None


# ── Step 6: Line Items ──────────────────────────────────────────────────

class LineItem(BaseModel):
    description: Optional[str] = None
    quantity: Optional[float] = None
    unit: Optional[str] = None
    unit_price: Optional[float] = None
    discount: Optional[float] = None
    tax_rate: Optional[float] = None
    tax_amount: Optional[float] = None
    line_total: Optional[float] = None
    hsn_sac: Optional[str] = None
    sku: Optional[str] = None


# ── Step 7: References ──────────────────────────────────────────────────

class References(BaseModel):
    invoice_number: Optional[str] = None
    purchase_order_number: Optional[str] = None
    sales_order_number: Optional[str] = None
    credit_note_number: Optional[str] = None
    debit_note_number: Optional[str] = None
    reference_invoice: Optional[str] = None
    contract_reference: Optional[str] = None


# ── Step 8: Bank Statement ──────────────────────────────────────────────

class BankTransaction(BaseModel):
    date: Optional[str] = None
    description: Optional[str] = None
    amount: Optional[float] = None
    debit_credit: Optional[str] = None
    balance: Optional[float] = None
    reference: Optional[str] = None


class BankStatement(BaseModel):
    bank_name: Optional[str] = None
    account_number: Optional[str] = None
    ifsc: Optional[str] = None
    statement_start: Optional[str] = None
    statement_end: Optional[str] = None
    opening_balance: Optional[float] = None
    closing_balance: Optional[float] = None
    transactions: Optional[List[BankTransaction]] = None


# ── Step 9: Payroll ─────────────────────────────────────────────────────

class Employee(BaseModel):
    employee_name: Optional[str] = None
    employee_id: Optional[str] = None
    gross_salary: Optional[float] = None
    basic_salary: Optional[float] = None
    allowances: Optional[float] = None
    bonus: Optional[float] = None
    deductions: Optional[float] = None
    pf: Optional[float] = None
    esi: Optional[float] = None
    tds: Optional[float] = None
    net_salary: Optional[float] = None


class Payroll(BaseModel):
    payroll_period: Optional[str] = None
    employees: Optional[List[Employee]] = None


# ── Step 10: Agreements ─────────────────────────────────────────────────

class LoanAgreement(BaseModel):
    lender_name: Optional[str] = None
    principal_amount: Optional[float] = None
    interest_rate: Optional[float] = None
    loan_start_date: Optional[str] = None
    loan_end_date: Optional[str] = None
    emi: Optional[float] = None
    tenure: Optional[str] = None


class InvestmentAgreement(BaseModel):
    investor_name: Optional[str] = None
    investment_amount: Optional[float] = None
    investment_date: Optional[str] = None
    security_type: Optional[str] = None
    shares_issued: Optional[float] = None
    share_price: Optional[float] = None
    valuation: Optional[float] = None


# ── Step 11: Tax Document ───────────────────────────────────────────────

class TaxDocument(BaseModel):
    tax_type: Optional[str] = None
    filing_period: Optional[str] = None
    tax_amount: Optional[float] = None
    interest: Optional[float] = None
    penalty: Optional[float] = None
    due_date: Optional[str] = None


# ── Step 12: Flags ──────────────────────────────────────────────────────

class ExtractionFlags(BaseModel):
    missing_invoice_number: bool = False
    missing_party: bool = False
    missing_date: bool = False
    missing_amount: bool = False
    duplicate_possible: bool = False
    low_confidence: bool = False
    handwritten: bool = False
    multiple_documents: bool = False


# ── Step 13: Top-Level Extraction Result ────────────────────────────────

class ExtractionResult(BaseModel):
    """Complete output of the Document Extraction Engine."""
    metadata: Optional[DocumentMetadata] = None
    parties: Optional[PartyInfo] = None
    financials: Optional[Financials] = None
    payment_details: Optional[PaymentDetails] = None
    line_items: Optional[List[LineItem]] = None
    references: Optional[References] = None
    bank_statement: Optional[BankStatement] = None
    payroll: Optional[Payroll] = None
    loan_agreement: Optional[LoanAgreement] = None
    investment_agreement: Optional[InvestmentAgreement] = None
    tax_document: Optional[TaxDocument] = None
    flags: Optional[ExtractionFlags] = None
