"""
Document Classifier
===================
Determines document type before Analysis Note generation.

Strategy (two-pass):
  1. Heuristic pass  — keyword/pattern matching against raw_text and filename.
                       Fast, free, no AI. Produces confident results for
                       clearly-labelled documents.
  2. LLM pass        — Groq/Gemini classification prompt.
                       Only invoked when heuristic confidence < 0.70.
                       Classification-ONLY prompt — no accounting logic.

Failure handling:
  If confidence < 0.60 after both passes → document_type = 'unknown'.
  The pipeline HALTS for this document. It is NEVER defaulted to any
  real document type. A misclassified loan agreement is more dangerous
  than a stalled pipeline.

Output contract:
  {
    "document_type": str,           # one of 14 canonical types or 'unknown'
    "confidence": float,            # 0–1
    "reasoning": str,
    "classification_method": str,   # 'heuristic' | 'llm' | 'combined'
    "classification_signals": list  # evidence list
  }
"""

import json
import re
from typing import Dict, List, Optional, Tuple

# ──────────────────────────────────────────────────────────────────────────────
# Constants
# ──────────────────────────────────────────────────────────────────────────────

VALID_DOCUMENT_TYPES = {
    "sales_invoice",
    "vendor_invoice",
    "customer_payment_receipt",
    "vendor_payment_receipt",
    "expense_receipt",
    "bank_statement",
    "payroll_register",
    "credit_note",
    "debit_note",
    "purchase_order",
    "sales_order",
    "loan_agreement",
    "investment_agreement",
    "tax_document",
    "unknown",
}

# Confidence thresholds
CONFIDENCE_HEURISTIC_SKIP_LLM = 0.85   # heuristic this confident → skip LLM call
CONFIDENCE_LLM_TRIGGER         = 0.70   # heuristic below this → run LLM
CONFIDENCE_MIN_ACCEPTABLE       = 0.60   # below this → 'unknown', pipeline halts

# ──────────────────────────────────────────────────────────────────────────────
# Heuristic rules
# Each entry: (document_type, weight, patterns)
# patterns are matched against: filename (lowercased) + raw_text (lowercased, first 3000 chars)
# ──────────────────────────────────────────────────────────────────────────────
HEURISTIC_RULES: List[Tuple[str, float, List[str]]] = [
    # ── Sales Invoice ────────────────────────────────────────────────────────
    ("sales_invoice", 0.90, [
        r"\btax\s+invoice\b", r"\bsales\s+invoice\b", r"\binvoice\s+no\.?\s*[:\-]",
        r"\binvoice\s+number\b", r"\bgstin\b.*\bsold\s+to\b", r"\bto\s+pay\b",
        r"\bpayment\s+due\b", r"\bsubtotal\b.*\bgst\b",
    ]),
    # ── Vendor Invoice ───────────────────────────────────────────────────────
    ("vendor_invoice", 0.88, [
        r"\bbill\s+(to|from)\b", r"\bpurchase\s+invoice\b", r"\bvendor\s+invoice\b",
        r"\bsupplier\s+invoice\b", r"\bbill\s+no\.?\s*[:\-]", r"\bsupply\s+of\b",
    ]),
    # ── Customer Payment Receipt ─────────────────────────────────────────────
    ("customer_payment_receipt", 0.90, [
        r"\bpayment\s+receipt\b", r"\breceipt\s+no\.?\s*[:\-]",
        r"\bamount\s+received\b", r"\bpayment\s+received\b",
        r"\backnowledgement\s+of\s+payment\b",
    ]),
    # ── Vendor Payment Receipt ───────────────────────────────────────────────
    ("vendor_payment_receipt", 0.88, [
        r"\bpayment\s+voucher\b", r"\bpaid\s+to\b.*\bvendor\b",
        r"\boutward\s+payment\b", r"\badvance\s+payment\s+to\b",
    ]),
    # ── Expense Receipt ──────────────────────────────────────────────────────
    ("expense_receipt", 0.85, [
        r"\bcash\s+receipt\b", r"\bstore\s+receipt\b", r"\bfuel\s+receipt\b",
        r"\bhotel\s+receipt\b", r"\brestaurant\s+receipt\b",
        r"\bexpense\s+receipt\b", r"\bpetty\s+cash\b",
    ]),
    # ── Bank Statement ───────────────────────────────────────────────────────
    ("bank_statement", 0.95, [
        r"\bbank\s+statement\b", r"\baccount\s+statement\b",
        r"\bopening\s+balance\b", r"\bclosing\s+balance\b",
        r"\bwithdrawal\b.*\bdeposit\b", r"\bdebit\b.*\bcredit\b.*\bbalance\b",
        r"\bifsc\b", r"\bmicr\b",
    ]),
    # ── Payroll Register ─────────────────────────────────────────────────────
    ("payroll_register", 0.92, [
        r"\bpayroll\s+register\b", r"\bsalary\s+register\b",
        r"\bsalary\s+slip\b", r"\bpay\s+slip\b", r"\bpayslip\b",
        r"\bbasic\s+salary\b", r"\bpf\s+deduction\b", r"\besic\b.*\bpf\b",
        r"\bnet\s+pay\b.*\bemployee\b",
    ]),
    # ── Credit Note ──────────────────────────────────────────────────────────
    ("credit_note", 0.92, [
        r"\bcredit\s+note\b", r"\bcredit\s+memo\b", r"\brefund\s+note\b",
        r"\bcn\s*no\.?\s*[:\-]",
    ]),
    # ── Debit Note ───────────────────────────────────────────────────────────
    ("debit_note", 0.92, [
        r"\bdebit\s+note\b", r"\bdebit\s+memo\b", r"\bdn\s*no\.?\s*[:\-]",
    ]),
    # ── Purchase Order ───────────────────────────────────────────────────────
    ("purchase_order", 0.93, [
        r"\bpurchase\s+order\b", r"\bpo\s+no\.?\s*[:\-]", r"\bp\.?o\.?\s+number\b",
        r"\border\s+to\s+supply\b",
    ]),
    # ── Sales Order ──────────────────────────────────────────────────────────
    ("sales_order", 0.90, [
        r"\bsales\s+order\b", r"\bso\s+no\.?\s*[:\-]", r"\bcustomer\s+order\b",
        r"\bconfirmation\s+of\s+order\b",
    ]),
    # ── Loan Agreement ───────────────────────────────────────────────────────
    ("loan_agreement", 0.93, [
        r"\bloan\s+agreement\b", r"\bterm\s+loan\b", r"\bsanction\s+letter\b",
        r"\bprincipal\s+amount\b.*\brepayment\b", r"\bborrower\b.*\blender\b",
        r"\bemi\b.*\brepayment\b",
    ]),
    # ── Investment Agreement ─────────────────────────────────────────────────
    ("investment_agreement", 0.93, [
        r"\binvestment\s+agreement\b", r"\bshare\s+subscription\b",
        r"\bterm\s+sheet\b", r"\bshare\s+purchase\s+agreement\b",
        r"\bseries\s+[a-z]\s+funding\b", r"\bconvertible\s+note\b",
        r"\bsafe\s+agreement\b",
    ]),
    # ── Tax Document ─────────────────────────────────────────────────────────
    ("tax_document", 0.90, [
        r"\bchallan\b.*\btax\b", r"\btds\s+certificate\b", r"\bform\s+16\b",
        r"\bgst\s+return\b", r"\bgstr[\-\s]\d\b", r"\bincome\s+tax\s+return\b",
        r"\bitr[\-\s]\d\b", r"\btax\s+deducted\s+at\s+source\b",
    ]),
]

# LLM classification prompt — NO accounting logic
LLM_CLASSIFICATION_PROMPT = """
You are a document classification specialist. Your ONLY job is to identify the type of a financial document.

You must classify into EXACTLY ONE of these types:
- sales_invoice         : Invoice issued by us (letterhead has Archzona / Archzona LLP / our company details) to a customer/vendor
- vendor_invoice        : Invoice received from a supplier/vendor (letterhead has anyone else's details)
- customer_payment_receipt : Proof of payment received from a customer
- vendor_payment_receipt   : Proof of payment made to a vendor
- expense_receipt       : Receipt for a small expense (meals, fuel, travel, etc.)
- bank_statement        : Bank account statement from a bank (Do NOT classify this as tax_document)
- payroll_register      : Payroll/salary register or payslip
- credit_note           : Credit note issued to reverse a previous invoice
- debit_note            : Debit note issued as a vendor adjustment
- purchase_order        : Purchase order issued to a supplier
- sales_order           : Sales order from or to a customer
- loan_agreement        : Agreement for a loan (bank or private)
- investment_agreement  : Agreement for equity investment, SAFE, convertible note
- tax_document          : Tax filing, TDS certificate, GST return, income tax return (Excludes bank statements)
- unknown               : Cannot classify with confidence

LETTERHEAD / ISSUER RULES FOR INVOICES:
1. Look at the top of the invoice (the letterhead, logo, header, or issuing party details):
   - If the letterhead / issuer details contain "Archzona", "Archzona LLP", or our company name -> classify as 'sales_invoice' (invoice sent by us).
   - If the letterhead / issuer details belong to ANY OTHER vendor/company (and our details appear under 'Bill To' / 'Customer') -> classify as 'vendor_invoice' (invoice received from vendor).

RULES:
1. Return ONLY a JSON object. No explanation outside the JSON.
2. Do NOT suggest accounting treatment, journal entries, or COA accounts.
3. If you are not at least 60% confident, return unknown.
4. Confidence must be a float between 0.0 and 1.0.

Return this exact schema:
{
  "document_type": "...",
  "confidence": 0.0,
  "reasoning": "..."
}
"""



class DocumentClassifier:
    """
    Two-pass document classifier: heuristic → LLM.

    Failure contract: confidence < 0.60 → returns 'unknown'.
    Never defaults to a real document type on uncertainty.
    """

    def __init__(self, groq_pool_execute, gemini_model=None):
        """
        Args:
            groq_pool_execute: GroqPool.execute callable
            gemini_model: optional genai.GenerativeModel for fallback
        """
        self._groq_execute = groq_pool_execute
        self._gemini = gemini_model

    # ──────────────────────────────────────────────────────────────────────
    # Public API
    # ──────────────────────────────────────────────────────────────────────

    def classify(self, raw_text: str, filename: str, mime_type: str = "") -> Dict:
        """
        Synchronous two-pass classification.

        Returns:
          {
            "document_type": str,
            "confidence": float,
            "reasoning": str,
            "classification_method": str,   # 'heuristic' | 'llm' | 'combined'
            "classification_signals": list
          }
        """
        # ── Pass 1: Heuristic ──────────────────────────────────
        h_result = self._heuristic_pass(raw_text, filename)

        if h_result["confidence"] >= CONFIDENCE_HEURISTIC_SKIP_LLM:
            # Strong heuristic signal — skip LLM
            return {**h_result, "classification_method": "heuristic"}

        if h_result["confidence"] >= CONFIDENCE_LLM_TRIGGER:
            # Moderate heuristic — confirm with LLM
            l_result = self._llm_pass(raw_text, filename)
            return self._combine(h_result, l_result)

        # ── Pass 2: LLM (heuristic was weak) ──────────────────
        l_result = self._llm_pass(raw_text, filename)

        if l_result["confidence"] >= CONFIDENCE_MIN_ACCEPTABLE:
            return {**l_result, "classification_method": "llm",
                    "classification_signals": h_result.get("classification_signals", [])}

        # ── Both passes failed ─────────────────────────────────
        return self._unknown(
            reason=f"Heuristic confidence {h_result['confidence']:.2f}, "
                   f"LLM confidence {l_result['confidence']:.2f} — both below "
                   f"minimum threshold {CONFIDENCE_MIN_ACCEPTABLE}.",
            signals=h_result.get("classification_signals", []),
        )

    # ──────────────────────────────────────────────────────────────────────
    # Private: Heuristic pass
    # ──────────────────────────────────────────────────────────────────────

    def _heuristic_pass(self, raw_text: str, filename: str) -> Dict:
        search_corpus = (
            filename.lower() + " " +
            (raw_text or "")[:3000].lower()
        )

        scores: Dict[str, Tuple[float, List[str]]] = {}

        for doc_type, base_weight, patterns in HEURISTIC_RULES:
            matched_signals = []
            for pattern in patterns:
                if re.search(pattern, search_corpus):
                    matched_signals.append(pattern)

            if matched_signals:
                # Confidence scales with number of matched patterns
                match_ratio = len(matched_signals) / len(patterns)
                confidence  = base_weight * (0.5 + 0.5 * match_ratio)
                scores[doc_type] = (round(confidence, 3), matched_signals)

        if not scores:
            return self._unknown(
                reason="No heuristic patterns matched",
                signals=[],
                confidence=0.0,
            )

        best_type = max(scores, key=lambda k: scores[k][0])
        best_conf, best_signals = scores[best_type]

        # Check for ambiguity: if second-best is within 0.05 of best, lower confidence
        sorted_scores = sorted(scores.values(), key=lambda x: x[0], reverse=True)
        if len(sorted_scores) >= 2 and (sorted_scores[0][0] - sorted_scores[1][0]) < 0.05:
            best_conf = round(best_conf * 0.80, 3)  # penalise ambiguity

        # Letterhead rule for invoices: Check if Archzona / Archzona LLP is the issuer vs recipient
        if best_type in ("sales_invoice", "vendor_invoice"):
            header_text = (raw_text or "")[:1000].lower()
            # If Archzona appears in header before "bill to" / "customer" / "billed to"
            has_our_name_in_header = "archzona" in header_text or "archzona llp" in header_text
            bill_to_pos = min([header_text.find(kw) for kw in ["bill to", "billed to", "customer:", "buyer:"] if kw in header_text] or [9999])
            our_name_pos = min([header_text.find(kw) for kw in ["archzona", "archzona llp"] if kw in header_text] or [9999])

            if has_our_name_in_header and our_name_pos < bill_to_pos:
                best_type = "sales_invoice"
                best_conf = max(best_conf, 0.92)
                best_signals.append("letterhead: issuer is Archzona/Archzona LLP")
            elif our_name_pos > bill_to_pos and bill_to_pos < 9999:
                best_type = "vendor_invoice"
                best_conf = max(best_conf, 0.90)
                best_signals.append("letterhead: recipient is Archzona, issuer is vendor")

        return {
            "document_type":          best_type,
            "confidence":             best_conf,
            "reasoning":              f"Heuristic: matched {len(best_signals)} pattern(s) for '{best_type}'",
            "classification_signals": best_signals,
        }


    # ──────────────────────────────────────────────────────────────────────
    # Private: LLM pass
    # ──────────────────────────────────────────────────────────────────────

    def _llm_pass(self, raw_text: str, filename: str) -> Dict:
        user_msg = (
            f"Document Filename: {filename}\n\n"
            f"Document Text (first 4000 chars):\n{(raw_text or '')[:4000]}"
        )
        try:
            completion = self._groq_execute(
                lambda client: client.chat.completions.create(
                    model="llama-3.1-8b-instant",   # fast, small model for classification only
                    messages=[
                        {"role": "system", "content": LLM_CLASSIFICATION_PROMPT},
                        {"role": "user",   "content": user_msg},
                    ],
                    response_format={"type": "json_object"},
                    temperature=0.1,   # low temperature for deterministic classification
                )
            )
            result = json.loads(completion.choices[0].message.content)
            doc_type   = result.get("document_type", "unknown").lower().strip()
            confidence = float(result.get("confidence", 0.0))
            reasoning  = result.get("reasoning", "LLM classification")

            if doc_type not in VALID_DOCUMENT_TYPES:
                doc_type   = "unknown"
                confidence = 0.0
                reasoning  = f"LLM returned invalid type '{doc_type}' — treated as unknown"

            return {
                "document_type":          doc_type,
                "confidence":             round(confidence, 3),
                "reasoning":              reasoning,
                "classification_signals": [],
            }
        except Exception as e:
            print(f"[DocumentClassifier] LLM pass failed: {e}")
            return self._unknown(reason=f"LLM call failed: {e}", signals=[])

    # ──────────────────────────────────────────────────────────────────────
    # Private: Combine heuristic + LLM results
    # ──────────────────────────────────────────────────────────────────────

    def _combine(self, heuristic: Dict, llm: Dict) -> Dict:
        """
        Agreement → boost confidence.
        Disagreement → take LLM result at its own confidence (LLM is more semantic).
        """
        if heuristic["document_type"] == llm["document_type"]:
            # Agreement: boost to max of both, capped at 0.99
            combined_conf = min(0.99, max(heuristic["confidence"], llm["confidence"]) + 0.05)
            return {
                "document_type":          llm["document_type"],
                "confidence":             round(combined_conf, 3),
                "reasoning":              f"Heuristic + LLM agreement: {llm['reasoning']}",
                "classification_method":  "combined",
                "classification_signals": heuristic.get("classification_signals", []),
            }
        else:
            # Disagreement: use LLM result at its raw confidence
            if llm["confidence"] >= CONFIDENCE_MIN_ACCEPTABLE:
                return {
                    "document_type":          llm["document_type"],
                    "confidence":             llm["confidence"],
                    "reasoning":              (
                        f"LLM overrode heuristic. Heuristic said '{heuristic['document_type']}' "
                        f"({heuristic['confidence']:.2f}). LLM says '{llm['document_type']}' "
                        f"({llm['confidence']:.2f}). Using LLM."
                    ),
                    "classification_method":  "llm",
                    "classification_signals": heuristic.get("classification_signals", []),
                }
            else:
                return self._unknown(
                    reason=(
                        f"Heuristic/LLM disagreement: heuristic='{heuristic['document_type']}' "
                        f"({heuristic['confidence']:.2f}), llm='{llm['document_type']}' "
                        f"({llm['confidence']:.2f}). Neither meets minimum threshold."
                    ),
                    signals=heuristic.get("classification_signals", []),
                )

    # ──────────────────────────────────────────────────────────────────────
    # Private: Safe unknown result
    # ──────────────────────────────────────────────────────────────────────

    @staticmethod
    def _unknown(reason: str, signals: List[str], confidence: float = 0.0) -> Dict:
        return {
            "document_type":          "unknown",
            "confidence":             confidence,
            "reasoning":              reason,
            "classification_method":  "heuristic",
            "classification_signals": signals,
        }
