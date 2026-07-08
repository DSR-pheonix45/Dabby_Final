"""
Bank Statement Parser
=====================
Extracted from ai_service.py and promoted to a dedicated module.

Responsibilities:
  - Dedicated Gemini Vision call for image/PDF bank statements
  - Dedicated Groq text call for digital text bank statements
  - KPI computation engine (pure deterministic, no AI)
  - Beneficiary grouping and normalization
  - Balance validation
  - Mapping raw extraction into canonical Analysis Note format

Does NOT:
  - Generate journal entries
  - Suggest accounting treatment
  - Output COA accounts
"""

import json
import re
from typing import Dict, Optional


# ──────────────────────────────────────────────────────────────────────────────
# Gemini schema for bank statement vision extraction
# ──────────────────────────────────────────────────────────────────────────────
BANK_STATEMENT_GEMINI_SCHEMA = {
    "type": "OBJECT",
    "properties": {
        "statement_summary": {
            "type": "OBJECT",
            "properties": {
                "bank_name":            {"type": "STRING"},
                "account_holder_name":  {"type": "STRING"},
                "account_number":       {"type": "STRING"},
                "customer_id":          {"type": "STRING"},
                "branch":               {"type": "STRING"},
                "ifsc":                 {"type": "STRING"},
                "micr":                 {"type": "STRING"},
                "currency":             {"type": "STRING"},
                "statement_start_date": {"type": "STRING"},
                "statement_end_date":   {"type": "STRING"},
                "opening_balance":      {"type": "NUMBER"},
                "closing_balance":      {"type": "NUMBER"},
                "total_credits":        {"type": "NUMBER"},
                "total_debits":         {"type": "NUMBER"},
            },
            "required": ["bank_name", "account_holder_name", "account_number",
                         "opening_balance", "closing_balance"],
        },
        "transactions": {
            "type": "ARRAY",
            "items": {
                "type": "OBJECT",
                "properties": {
                    "date":                 {"type": "STRING"},
                    "value_date":           {"type": "STRING"},
                    "debit_amount":         {"type": "NUMBER"},
                    "credit_amount":        {"type": "NUMBER"},
                    "balance":              {"type": "NUMBER"},
                    "payment_mode":         {"type": "STRING"},
                    "beneficiary_name":     {"type": "STRING"},
                    "beneficiary_bank":     {"type": "STRING"},
                    "beneficiary_account":  {"type": "STRING"},
                    "reference_number":     {"type": "STRING"},
                    "cheque_number":        {"type": "STRING"},
                    "branch_code":          {"type": "STRING"},
                    "location":             {"type": "STRING"},
                    "internal_prefix":      {"type": "STRING"},
                    "category":             {"type": "STRING"},
                    "raw_particulars":      {"type": "STRING"},
                },
                "required": ["date", "raw_particulars", "balance"],
            },
        },
    },
    "required": ["statement_summary", "transactions"],
}

BANK_STATEMENT_VISION_PROMPT = """
You are an expert financial document parser specializing in Indian bank statements.
Your objective is to accurately extract statement-level details and all transaction rows.

GENERAL RULES:
1. Extract information exactly as printed. Do not hallucinate values.
2. Preserve original narration in a Raw Particulars field.
3. Interpret transaction narrations to identify payment mode, beneficiary, bank, references.
4. If a field cannot be identified confidently, return null. Do not guess beneficiary names.
5. All monetary values must be numeric.
6. Dates should be returned in YYYY-MM-DD format.
7. Maintain transaction order.

NARRATION PARSING RULES:
- SAK is NOT a payment mode. When narration starts with SAK/ or SAK, treat SAK as internal_prefix.
  Do NOT classify it as beneficiary, payment mode, or bank.
  Use the next token to determine transaction type.
  E.g., SAK/CASH WDL means Payment Mode: Cash Withdrawal, Internal Prefix: SAK.
- Examples:
  - SAK/CASH WDL/SAK431881998/125/DOMBIVLI/(SELF) → Payment Mode: Cash Withdrawal, Internal Prefix: SAK, Reference: SAK431881998, Branch: 125, Location: DOMBIVLI, Beneficiary: SELF
  - NEFT/HDFCH00099710200/ADVAIT BUILDERS DEVELOPERS/HDFC BANK/0001 → Payment Mode: NEFT, Reference: HDFCH00099710200, Beneficiary: ADVAIT BUILDERS DEVELOPERS, Beneficiary Bank: HDFC BANK, Branch: 0001
  - RTGS/UBINR22025032001939320/SHREE SWAMI SAMARTH AS/UNION BANK OF INDIA → Payment Mode: RTGS, Reference: UBINR22025032001939320, Beneficiary: SHREE SWAMI SAMARTH AS, Beneficiary Bank: UNION BANK OF INDIA
  - CLG/000332/030425/ICICI BANK → Payment Mode: Cheque Clearing, Cheque Number: 000332, Value Date: 2025-04-03, Beneficiary Bank: ICICI BANK
  - SAK NEFT/RTGS Charges → Category: Bank Charges, Payment Mode: Charges, Charge Type: NEFT/RTGS

Recognize these payment modes:
  NEFT, RTGS, IMPS, UPI, Cash Withdrawal, Cash Deposit, ATM, POS,
  ECS, NACH, Cheque, Cheque Clearing, Interest, Bank Charges, GST,
  Internal Transfer, Unknown

Recognize internal prefixes: SAK, SK, INT, TRF, MB, etc.

Return ONLY a JSON object matching the requested schema. Do NOT perform any totals or averages.
"""

BANK_STATEMENT_TEXT_PROMPT = """
You are an expert financial document parser specializing in Indian bank statements.
Extract statement-level details and all transaction rows from the text content.

GENERAL RULES:
1. Extract information exactly as printed. Do not hallucinate values.
2. Preserve original narration in a Raw Particulars field.
3. If a field cannot be identified confidently, return null.
4. All monetary values must be numeric.
5. Dates in YYYY-MM-DD format.
6. Maintain transaction order.

NARRATION PARSING RULES:
- SAK is NOT a payment mode. Treat as internal_prefix.
- Recognize: NEFT, RTGS, IMPS, UPI, Cash Withdrawal, Cash Deposit, ATM, POS,
  ECS, NACH, Cheque, Cheque Clearing, Interest, Bank Charges, GST,
  Internal Transfer, Unknown.

Return ONLY a JSON object with this schema:
{
  "statement_summary": {
    "bank_name": null, "account_holder_name": null, "account_number": null,
    "customer_id": null, "branch": null, "ifsc": null, "micr": null,
    "currency": "INR",
    "statement_start_date": "YYYY-MM-DD", "statement_end_date": "YYYY-MM-DD",
    "opening_balance": 0.0, "closing_balance": 0.0,
    "total_credits": 0.0, "total_debits": 0.0
  },
  "transactions": [
    {
      "date": "YYYY-MM-DD", "value_date": "YYYY-MM-DD",
      "debit_amount": null, "credit_amount": null, "balance": 0.0,
      "payment_mode": null, "beneficiary_name": null, "beneficiary_bank": null,
      "beneficiary_account": null, "reference_number": null,
      "cheque_number": null, "branch_code": null, "location": null,
      "internal_prefix": null,
      "category": null,
      "raw_particulars": ""
    }
  ]
}
"""


class BankStatementParser:
    """
    Dedicated parser for bank statement documents.

    This class is responsible ONLY for:
      1. Calling the AI to extract raw data from the document
      2. Computing KPIs deterministically
      3. Returning a normalized dict that analysis_note_service can wrap
         into a canonical Analysis Note.

    It does NOT generate journal entries, COA mappings, or accounting advice.
    """

    def __init__(self, gemini_model, groq_pool_execute):
        """
        Args:
            gemini_model: initialized genai.GenerativeModel instance
            groq_pool_execute: GroqPool.execute callable
        """
        self._gemini = gemini_model
        self._groq_execute = groq_pool_execute

    # ──────────────────────────────────────────────────────────────────────
    # Public API
    # ──────────────────────────────────────────────────────────────────────

    async def parse_vision(self, file_bytes: bytes, mime_type: str, filename: str) -> Dict:
        """
        Extract bank statement data from an image or PDF using Gemini Vision.
        Returns normalized KPI dict.
        """
        try:
            response = self._gemini.generate_content(
                [BANK_STATEMENT_VISION_PROMPT,
                 {"mime_type": mime_type, "data": file_bytes}],
                generation_config={
                    "response_mime_type": "application/json",
                    "response_schema": BANK_STATEMENT_GEMINI_SCHEMA,
                }
            )
            raw_data = json.loads(response.text.strip())
            return self.compute_kpis(raw_data)
        except Exception as e:
            print(f"[BankStatementParser] Vision extraction failed: {e}")
            raise

    async def parse_text(self, text_content: str, filename: str) -> Dict:
        """
        Extract bank statement data from plain text using Groq/Llama.
        Returns normalized KPI dict.
        """
        user_msg = f"Document Filename: {filename}\nContent:\n{text_content[:20000]}"
        try:
            completion = self._groq_execute(
                lambda client: client.chat.completions.create(
                    model="llama-3.3-70b-versatile",
                    messages=[
                        {"role": "system", "content": BANK_STATEMENT_TEXT_PROMPT},
                        {"role": "user",   "content": user_msg},
                    ],
                    response_format={"type": "json_object"},
                )
            )
            raw_data = json.loads(completion.choices[0].message.content)
            return self.compute_kpis(raw_data)
        except Exception as e:
            print(f"[BankStatementParser] Text extraction failed: {e}")
            raise

    async def parse_page_raw(
        self,
        file_bytes: bytes,
        mime_type: str,
        filename: str,
        is_text: bool,
        page_text: Optional[str] = None,
    ) -> Dict:
        """
        Per-page extraction for the parallel page worker.
        Returns raw extraction dict (NOT post-processed — that happens at aggregation).
        """
        if is_text:
            user_msg = f"Document Page Content:\n{page_text or ''}"
            completion = self._groq_execute(
                lambda client: client.chat.completions.create(
                    model="llama-3.3-70b-versatile",
                    messages=[
                        {"role": "system", "content": BANK_STATEMENT_TEXT_PROMPT},
                        {"role": "user",   "content": user_msg},
                    ],
                    response_format={"type": "json_object"},
                )
            )
            return json.loads(completion.choices[0].message.content)
        else:
            if not self._gemini:
                raise ValueError("GEMINI_API_KEY not configured")
            response = self._gemini.generate_content(
                [BANK_STATEMENT_VISION_PROMPT,
                 {"mime_type": mime_type, "data": file_bytes}],
                generation_config={
                    "response_mime_type": "application/json",
                    "response_schema": BANK_STATEMENT_GEMINI_SCHEMA,
                }
            )
            if not response.candidates or not response.candidates[0].content.parts:
                raise ValueError("Gemini returned no candidates for bank statement page")
            return json.loads(response.text.strip())

    def aggregate_pages(self, pages_meta: dict) -> Dict:
        """
        Merge multi-page bank statement extraction results.
        Takes the statement_summary from the first successful page;
        concatenates transactions from all pages in order.
        """
        merged_summary = {}
        merged_transactions = []

        for page_num in sorted(pages_meta.keys(), key=lambda x: int(x)):
            page = pages_meta[page_num]
            if page.get("status") != "COMPLETED":
                continue
            result = page.get("result") or {}
            summary = result.get("statement_summary") or {}
            txns    = result.get("transactions") or []

            if not merged_summary and summary:
                merged_summary = summary

            # Carry over closing balance from summary if first page
            if summary.get("opening_balance") is not None and not merged_summary.get("opening_balance"):
                merged_summary["opening_balance"] = summary["opening_balance"]
            if summary.get("closing_balance") is not None:
                merged_summary["closing_balance"] = summary["closing_balance"]
            if summary.get("statement_start_date") and not merged_summary.get("statement_start_date"):
                merged_summary["statement_start_date"] = summary["statement_start_date"]
            if summary.get("statement_end_date"):
                merged_summary["statement_end_date"] = summary["statement_end_date"]

            merged_transactions.extend(txns)

        return {"statement_summary": merged_summary, "transactions": merged_transactions}

    def compute_kpis(self, extracted: Dict) -> Dict:
        """
        Pure deterministic KPI engine. No AI. No accounting.

        Input:  raw extraction dict { statement_summary, transactions }
        Output: enriched dict with:
                  - statement_summary (original)
                  - transactions (enriched with row_number, type, amount)
                  - transaction_summary (KPIs)
                  - payment_mode_summary
                  - beneficiary_summary
                  - validation (balance reconciliation)
        """
        summary      = extracted.get("statement_summary") or {}
        transactions = extracted.get("transactions") or []

        # ── Statement period duration ──────────────────────────
        duration = None
        start_str = summary.get("statement_start_date") or summary.get("start_date")
        end_str   = summary.get("statement_end_date")   or summary.get("end_date")
        if start_str and end_str:
            try:
                from datetime import datetime
                sd = datetime.strptime(start_str[:10], "%Y-%m-%d")
                ed = datetime.strptime(end_str[:10],   "%Y-%m-%d")
                duration = (ed - sd).days
            except Exception:
                pass

        # ── Row numbering + amount normalisation ──────────────
        for idx, tx in enumerate(transactions):
            tx["row_number"] = idx + 1
            cr = tx.get("credit_amount")
            dr = tx.get("debit_amount")
            cr_val = float(cr) if cr is not None else 0.0
            dr_val = float(dr) if dr is not None else 0.0
            tx["credit_amount"] = cr_val if cr is not None else None
            tx["debit_amount"]  = dr_val if dr is not None else None
            tx["amount"] = cr_val if cr_val > 0 else dr_val
            tx["type"]   = "Credit" if cr_val > 0 else "Debit"

        # ── Beneficiary grouping ───────────────────────────────
        groups: dict = {}
        for tx in transactions:
            b_name   = (tx.get("beneficiary_name") or "").strip()
            raw_part = (tx.get("raw_particulars")  or "").strip()
            if b_name and b_name.lower() not in ("null", "none", "unknown"):
                key = "b_" + b_name.lower()
            else:
                norm = self._normalize_narration(raw_part)
                key  = "p_" + norm if norm else f"row_{tx['row_number']}"
            groups.setdefault(key, []).append(tx)

        # Resolve names within groups
        for group_txs in groups.values():
            resolved = next(
                (tx.get("beneficiary_name") for tx in group_txs
                 if (tx.get("beneficiary_name") or "").strip().lower()
                 not in ("", "null", "none", "unknown")),
                None
            )
            if resolved:
                for tx in group_txs:
                    tx["beneficiary_name"] = resolved
            else:
                row_nums = sorted(tx["row_number"] for tx in group_txs)
                label = (f"Unknown Entity (Rows: {', '.join(map(str, row_nums))})"
                         if len(row_nums) > 1 else f"Unknown Entity (Row {row_nums[0]})")
                for tx in group_txs:
                    tx["beneficiary_name"] = label

        # ── KPI computation ────────────────────────────────────
        credit_count = debit_count = 0
        credit_total = debit_total = highest_credit = highest_debit = 0.0
        unique_dates: set = set()

        payment_mode_buckets = {
            "NEFT": {"count": 0, "amount": 0.0},
            "RTGS": {"count": 0, "amount": 0.0},
            "IMPS": {"count": 0, "amount": 0.0},
            "UPI":  {"count": 0, "amount": 0.0},
            "Cash": {"count": 0, "amount": 0.0},
            "Cheque": {"count": 0, "amount": 0.0},
            "Charges":  {"count": 0, "amount": 0.0},
            "Interest": {"count": 0, "amount": 0.0},
            "Others":   {"count": 0, "amount": 0.0},
        }
        beneficiaries: dict = {}

        for tx in transactions:
            tx_date = tx.get("date")
            if tx_date:
                unique_dates.add(tx_date)

            cr_val = tx["credit_amount"] or 0.0
            dr_val = tx["debit_amount"]  or 0.0

            if cr_val > 0:
                credit_count += 1
                credit_total += cr_val
                highest_credit = max(highest_credit, cr_val)
            if dr_val > 0:
                debit_count += 1
                debit_total += dr_val
                highest_debit = max(highest_debit, dr_val)

            # Payment mode bucketing
            mode_raw = (tx.get("payment_mode") or "").strip().upper()
            if   "NEFT" in mode_raw:   bucket = "NEFT"
            elif "RTGS" in mode_raw:   bucket = "RTGS"
            elif "IMPS" in mode_raw:   bucket = "IMPS"
            elif "UPI"  in mode_raw:   bucket = "UPI"
            elif any(k in mode_raw for k in
                     ["CASH", "ATM", "POS", "WITHDRAWAL", "DEPOSIT"]): bucket = "Cash"
            elif any(k in mode_raw for k in
                     ["CHEQUE", "CLG", "CLEARING"]):                   bucket = "Cheque"
            elif any(k in mode_raw for k in
                     ["CHARGE", "GST", "FEE", "TAX", "PENALTY"]):      bucket = "Charges"
            elif "INTEREST" in mode_raw or mode_raw == "INT":          bucket = "Interest"
            else:                                                        bucket = "Others"

            tx_amt = cr_val if cr_val > 0 else dr_val
            payment_mode_buckets[bucket]["count"]  += 1
            payment_mode_buckets[bucket]["amount"] += tx_amt

            # Beneficiary aggregation
            b_name = (tx.get("beneficiary_name") or "").strip()
            if b_name:
                b_key = b_name.lower()
                if b_key not in beneficiaries:
                    beneficiaries[b_key] = {
                        "beneficiary_name": b_name,
                        "beneficiary_bank": tx.get("beneficiary_bank"),
                        "credit_count": 0, "debit_count": 0,
                        "total_credits": 0.0, "total_debits": 0.0,
                        "first_transaction_date": tx_date,
                        "last_transaction_date":  tx_date,
                    }
                b = beneficiaries[b_key]
                if cr_val > 0:
                    b["credit_count"]  += 1
                    b["total_credits"] += cr_val
                if dr_val > 0:
                    b["debit_count"]  += 1
                    b["total_debits"] += dr_val
                if tx_date:
                    if not b["first_transaction_date"] or tx_date < b["first_transaction_date"]:
                        b["first_transaction_date"] = tx_date
                    if not b["last_transaction_date"] or tx_date > b["last_transaction_date"]:
                        b["last_transaction_date"] = tx_date

        # ── Payment mode summary ───────────────────────────────
        payment_mode_summary = [
            {"mode": k, "count": v["count"], "amount": round(v["amount"], 2)}
            for k, v in payment_mode_buckets.items()
        ]

        # ── Beneficiary summary ────────────────────────────────
        beneficiary_summary = []
        largest_b_name = None
        largest_b_vol  = 0.0
        for b in beneficiaries.values():
            vol = b["total_credits"] + b["total_debits"]
            if vol > largest_b_vol:
                largest_b_vol  = vol
                largest_b_name = b["beneficiary_name"]
            beneficiary_summary.append({
                "beneficiary_name":       b["beneficiary_name"],
                "beneficiary_bank":       b["beneficiary_bank"],
                "credit_count":           b["credit_count"],
                "debit_count":            b["debit_count"],
                "total_credits":          round(b["total_credits"], 2),
                "total_debits":           round(b["total_debits"],  2),
                "net_amount":             round(b["total_credits"] - b["total_debits"], 2),
                "first_transaction_date": b["first_transaction_date"],
                "last_transaction_date":  b["last_transaction_date"],
            })

        largest_mode = (
            max(payment_mode_summary, key=lambda x: x["amount"])["mode"]
            if transactions else None
        )

        # ── Balance reconciliation ─────────────────────────────
        def _safe_float(v):
            if v is None: return None
            try:   return float(str(v).replace(",", "").strip())
            except: return None

        opening_bal       = _safe_float(summary.get("opening_balance")) or 0.0
        closing_bal       = _safe_float(summary.get("closing_balance")) or 0.0
        reported_credits  = _safe_float(summary.get("total_credits"))
        reported_debits   = _safe_float(summary.get("total_debits"))
        expected_closing  = opening_bal + credit_total - debit_total
        diff              = round(abs(expected_closing - closing_bal), 2)
        balance_verified  = diff <= 1.0

        transaction_summary = {
            "opening_balance":        opening_bal,
            "closing_balance":        closing_bal,
            "statement_duration_days": duration,
            "total_transactions":     len(transactions),
            "credit_count":           credit_count,
            "debit_count":            debit_count,
            "credit_total":           round(credit_total, 2),
            "debit_total":            round(debit_total,  2),
            "net_cash_flow":          round(credit_total - debit_total, 2),
            "highest_credit":         round(highest_credit, 2),
            "highest_debit":          round(highest_debit, 2),
            "average_credit":         round(credit_total / credit_count, 2) if credit_count else 0.0,
            "average_debit":          round(debit_total  / debit_count,  2) if debit_count  else 0.0,
            "active_transaction_days": len(unique_dates),
            "largest_beneficiary":    largest_b_name,
            "largest_payment_mode":   largest_mode,
        }

        validation = {
            "balance_verified":    balance_verified,
            "difference":          diff,
            "expected_closing":    round(expected_closing, 2),
            "calculated_credits":  round(credit_total, 2),
            "calculated_debits":   round(debit_total,  2),
            "reported_credits":    reported_credits,
            "reported_debits":     reported_debits,
        }

        return {
            "statement_summary":    summary,
            "transaction_summary":  transaction_summary,
            "payment_mode_summary": payment_mode_summary,
            "beneficiary_summary":  beneficiary_summary,
            "transactions":         transactions,
            "validation":           validation,
        }

    # ──────────────────────────────────────────────────────────────────────
    # Private helpers
    # ──────────────────────────────────────────────────────────────────────

    @staticmethod
    def _normalize_narration(text: str) -> str:
        if not text:
            return ""
        text = re.sub(r'\b\d{2}[-/\.]\d{2}[-/\.]\d{2,4}\b', '', text)
        text = re.sub(r'\b\d{4}[-/\.]\d{2}[-/\.]\d{2}\b',   '', text)
        text = re.sub(r'\b\d{6,}\b', '', text)
        text = re.sub(r'[^a-zA-Z\s]', '', text)
        return ' '.join(text.split()).strip().lower()
