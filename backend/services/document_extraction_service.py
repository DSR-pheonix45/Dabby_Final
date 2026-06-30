"""
Accounting Document Extraction Engine.

Responsibility:
  1. Classify the uploaded document
  2. Extract structured information
  3. Return normalized JSON

This service does NOT perform bookkeeping, assign COA, or create
debit/credit entries. The Accounting Event Engine consumes the output.
"""

import os
import json
from typing import Dict, Optional

import google.generativeai as genai
from groq import Groq

from services.extraction_models import (
    ExtractionResult,
    ExtractionFlags,
    DocumentMetadata,
)

# ── System prompt: the full 13-step extraction specification ────────────

EXTRACTION_SYSTEM_PROMPT = """
You are an Accounting Document Extraction Engine.

Your responsibility is ONLY to:
1. Classify the uploaded document.
2. Extract structured information.
3. Return normalized JSON.

DO NOT:
- Guess ledger accounts.
- Create debit/credit entries.
- Perform bookkeeping.
- Assign Chart of Accounts.
- Infer accounting treatment unless explicitly asked.

------------------------------------------------------------
STEP 1 : CLASSIFY DOCUMENT
------------------------------------------------------------

Classify the document into EXACTLY ONE of the following:

- sales_invoice
- customer_payment
- vendor_invoice
- vendor_payment
- bank_statement
- expense_receipt
- payroll
- credit_note
- debit_note
- loan_agreement
- investment_agreement
- tax_document
- purchase_order
- sales_order
- unknown

Return a confidence score between 0 and 1.

------------------------------------------------------------
STEP 2 : EXTRACT DOCUMENT METADATA
------------------------------------------------------------

Extract into the "metadata" object:

document_type, confidence, document_date, currency, document_number, language

------------------------------------------------------------
STEP 3 : EXTRACT PARTIES
------------------------------------------------------------

Return in the "parties" object:

customer_name, vendor_name, payer_name, payee_name, gst_number, pan_number, address, email, phone

Only populate fields that exist.

------------------------------------------------------------
STEP 4 : EXTRACT FINANCIALS
------------------------------------------------------------

Return in the "financials" object:

subtotal, discount, tax_amount, shipping_amount, other_charges, round_off, total_amount, currency

------------------------------------------------------------
STEP 5 : PAYMENT DETAILS
------------------------------------------------------------

Extract into the "payment_details" object:

payment_method, payment_status, due_date, payment_date, bank_name, account_number, transaction_reference, cheque_number, upi_reference

------------------------------------------------------------
STEP 6 : LINE ITEMS
------------------------------------------------------------

Extract every item separately into the "line_items" array.

Each line item must contain:

description, quantity, unit, unit_price, discount, tax_rate, tax_amount, line_total, hsn_sac, sku

------------------------------------------------------------
STEP 7 : REFERENCES
------------------------------------------------------------

Extract into the "references" object:

invoice_number, purchase_order_number, sales_order_number, credit_note_number, debit_note_number, reference_invoice, contract_reference

------------------------------------------------------------
STEP 8 : BANK STATEMENT
------------------------------------------------------------

If the document is a bank statement, return in the "bank_statement" object:

bank_name, account_number, ifsc, statement_start, statement_end, opening_balance, closing_balance, transactions[]

Each transaction contains: date, description, amount, debit_credit, balance, reference

If the document is NOT a bank statement, set "bank_statement" to null.

------------------------------------------------------------
STEP 9 : PAYROLL
------------------------------------------------------------

If the document is a payroll document, return in the "payroll" object:

payroll_period, employees[]

Each employee contains: employee_name, employee_id, gross_salary, basic_salary, allowances, bonus, deductions, pf, esi, tds, net_salary

If the document is NOT a payroll document, set "payroll" to null.

------------------------------------------------------------
STEP 10 : AGREEMENTS
------------------------------------------------------------

If the document is a loan agreement, return in the "loan_agreement" object:

lender_name, principal_amount, interest_rate, loan_start_date, loan_end_date, emi, tenure

If the document is an investment agreement, return in the "investment_agreement" object:

investor_name, investment_amount, investment_date, security_type, shares_issued, share_price, valuation

If neither, set both to null.

------------------------------------------------------------
STEP 11 : TAX DOCUMENT
------------------------------------------------------------

If the document is a tax document, return in the "tax_document" object:

tax_type, filing_period, tax_amount, interest, penalty, due_date

If the document is NOT a tax document, set "tax_document" to null.

------------------------------------------------------------
STEP 12 : FLAGS
------------------------------------------------------------

Return in the "flags" object:

missing_invoice_number (bool), missing_party (bool), missing_date (bool), missing_amount (bool), duplicate_possible (bool), low_confidence (bool), handwritten (bool), multiple_documents (bool)

------------------------------------------------------------
STEP 13 : OUTPUT JSON
------------------------------------------------------------

Return ONLY valid JSON matching this exact top-level structure:

{
  "metadata": { ... },
  "parties": { ... },
  "financials": { ... },
  "payment_details": { ... },
  "line_items": [ ... ],
  "references": { ... },
  "bank_statement": null or { ... },
  "payroll": null or { ... },
  "loan_agreement": null or { ... },
  "investment_agreement": null or { ... },
  "tax_document": null or { ... },
  "flags": { ... }
}

Never explain.
Never use markdown.
Never guess missing values.
Use null if unavailable.
Never hallucinate.
"""


class DocumentExtractionService:
    """
    Extracts structured accounting data from uploaded documents.
    Uses Gemini Vision for images/PDFs and Groq for text content.
    """

    def __init__(self):
        # ── Gemini (Vision – images & PDFs) ──
        gemini_key = (
            os.environ.get("VITE_GEMINI_API_KEY")
            or os.environ.get("GEMINI_API_KEY")
        )
        if gemini_key:
            sanitized = gemini_key.strip().strip('"').strip("'")
            genai.configure(api_key=sanitized)
            self.gemini_model = genai.GenerativeModel("gemini-1.5-flash")
        else:
            self.gemini_model = None

        # ── Groq (Text – fast extraction from plain text) ──
        groq_key = (
            os.environ.get("VITE_GROQ_API_KEY")
            or os.environ.get("GROQ_API_KEY")
        )
        if groq_key:
            sanitized = groq_key.strip().strip('"').strip("'")
            self.groq_client = Groq(api_key=sanitized)
        else:
            self.groq_client = None

    # ── Public API ──────────────────────────────────────────────────────

    async def extract(
        self,
        file_bytes: bytes,
        mime_type: str,
        filename: str,
    ) -> Dict:
        """
        Main entry point.  Classifies & extracts structured data from any
        accounting document.  Returns a dict matching ExtractionResult.
        """
        is_image_or_pdf = mime_type.startswith("image/") or mime_type == "application/pdf"

        if is_image_or_pdf:
            raw = await self._extract_with_vision(file_bytes, mime_type, filename)
        else:
            raw = await self._extract_with_text(file_bytes, filename)

        # Validate through Pydantic (coerces types, fills defaults)
        if isinstance(raw, dict):
            raw.pop("flags", None)
        result = ExtractionResult.model_validate(raw)

        # Post-process: compute flags if the LLM didn't set them
        result.flags = self._compute_flags(result)

        return result.model_dump()

    async def extract_from_text(self, text_content: str, filename: str) -> Dict:
        """
        Extract from raw text content (e.g. already-parsed CSV or text).
        """
        raw = await self._extract_with_text(text_content.encode("utf-8"), filename)
        if isinstance(raw, dict):
            raw.pop("flags", None)
        result = ExtractionResult.model_validate(raw)
        result.flags = self._compute_flags(result)
        return result.model_dump()

    # ── Private: Vision extraction (Gemini) ─────────────────────────────

    async def _extract_with_vision(
        self, file_bytes: bytes, mime_type: str, filename: str
    ) -> Dict:
        if mime_type == "application/pdf":
            import io
            from pypdf import PdfReader
            try:
                reader = PdfReader(io.BytesIO(file_bytes))
                text = ""
                for page in reader.pages:
                    t = page.extract_text()
                    if t:
                        text += t + "\n"
                
                if text.strip():
                    print(f"[EXTRACT] PDF Fallback: Extracted {len(text)} chars using pypdf. Routing to Groq.")
                    return await self._extract_with_text(text.encode("utf-8"), filename)
            except Exception as pdf_err:
                print(f"[WARNING] PDF text extraction fallback failed: {pdf_err}")

        # Local macOS native OCR fallback using Apple's Vision Framework via ocrmac
        try:
            from ocrmac import ocrmac
            import tempfile
            # Determine appropriate file extension suffix
            suffix = ".pdf" if mime_type == "application/pdf" else ".png"
            with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
                tmp_path = tmp.name
                tmp.write(file_bytes)
                
            print(f"[EXTRACT] Native macOS OCR: Scanning {filename}...")
            annotations = ocrmac.OCR(tmp_path).recognize()
            try:
                os.remove(tmp_path)
            except Exception:
                pass
                
            extracted_text = " ".join([ann[0] for ann in annotations])
            if extracted_text.strip():
                print(f"[EXTRACT] Native macOS OCR: Successfully extracted {len(extracted_text)} chars. Routing to Groq Text model.")
                return await self._extract_with_text(extracted_text.encode("utf-8"), filename)
            else:
                print("[WARNING] Native macOS OCR returned empty text.")
        except Exception as ocr_err:
            print(f"[WARNING] Native macOS OCR failed: {ocr_err}")

        # Final fallback to standard Vision API (if Gemini configured)
        if self.gemini_model:
            return await self._extract_with_vision_gemini_fallback(file_bytes, mime_type, filename)

        print("[WARNING] OCR failed or returned empty. Falling back to empty text extraction.")
        return await self._extract_with_text(b"", filename)

    async def _extract_with_groq_vision(
        self, file_bytes: bytes, mime_type: str, filename: str
    ) -> Dict:
        import base64
        print(f"[EXTRACT] Using Groq Vision (llama-3.2-11b-vision-preview) for: {filename} ({mime_type})")
        
        image_base64 = base64.b64encode(file_bytes).decode("utf-8")
        image_url = f"data:{mime_type};base64,{image_base64}"
        
        user_msg = f"Document Filename: {filename}"
        
        try:
            completion = self.groq_client.chat.completions.create(
                model="llama-3.2-11b-vision-preview",
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": EXTRACTION_SYSTEM_PROMPT},
                            {"type": "text", "text": user_msg},
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": image_url
                                }
                            }
                        ]
                    }
                ],
                response_format={"type": "json_object"},
                temperature=0.1,
                max_tokens=4096,
            )
            return self._parse_llm_json(completion.choices[0].message.content)
        except Exception as e:
            print(f"[ERROR] Groq Vision extraction failed: {e}")
            raise

    async def _extract_with_vision_gemini_fallback(
        self, file_bytes: bytes, mime_type: str, filename: str
    ) -> Dict:

        print(f"[EXTRACT] Using Gemini Vision for: {filename} ({mime_type})")

        try:
            response = self.gemini_model.generate_content([
                EXTRACTION_SYSTEM_PROMPT,
                {"mime_type": mime_type, "data": file_bytes},
            ])

            if not response.candidates or not response.candidates[0].content.parts:
                print(f"[ERROR] Gemini returned no candidates. Feedback: {response.prompt_feedback}")
                raise ValueError("Gemini failed to generate a response (possibly blocked by safety filters)")

            return self._parse_llm_json(response.text)

        except Exception as e:
            print(f"[ERROR] Gemini Vision extraction failed: {e}")
            raise

    # ── Private: Text extraction (Groq → Gemini fallback) ───────────────

    async def _extract_with_text(self, file_bytes: bytes, filename: str) -> Dict:
        text_content = file_bytes.decode("utf-8", errors="replace")
        if len(text_content) > 12000:
            print(f"[EXTRACT] Truncating text content from {len(text_content)} to 12000 characters to respect Groq TPM rate limits.")
            text_content = text_content[:12000]

        # Try Groq first (faster, cheaper)
        if self.groq_client:
            try:
                return await self._extract_with_groq(text_content, filename)
            except Exception as e:
                print(f"[WARNING] Groq extraction failed: {e}")
                if not self.gemini_model:
                    raise e

        # Fallback to Gemini text mode
        if self.gemini_model:
            return await self._extract_with_gemini_text(text_content, filename)

        raise ValueError("No AI provider configured. Set GROQ_API_KEY or GEMINI_API_KEY.")

    async def _extract_with_groq(self, text_content: str, filename: str) -> Dict:
        print(f"[EXTRACT] Using Groq (Llama 3.1 8B) for: {filename}")

        user_msg = f"Document Filename: {filename}\n\nContent:\n{text_content[:30000]}"

        completion = self.groq_client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": EXTRACTION_SYSTEM_PROMPT},
                {"role": "user", "content": user_msg},
            ],
            response_format={"type": "json_object"},
            temperature=0.1,
            max_tokens=4096,
        )

        return json.loads(completion.choices[0].message.content)

    async def _extract_with_gemini_text(self, text_content: str, filename: str) -> Dict:
        if not self.gemini_model:
            raise ValueError("GEMINI_API_KEY not configured")

        print(f"[EXTRACT] Using Gemini (text mode) for: {filename}")

        user_msg = f"Document Filename: {filename}\n\nContent:\n{text_content[:30000]}"

        response = self.gemini_model.generate_content([
            EXTRACTION_SYSTEM_PROMPT,
            user_msg,
        ])

        if not response.candidates or not response.candidates[0].content.parts:
            raise ValueError("Gemini failed to generate a response")

        return self._parse_llm_json(response.text)

    # ── Helpers ─────────────────────────────────────────────────────────

    @staticmethod
    def _parse_llm_json(raw_text: str) -> Dict:
        """Strip markdown fences and parse JSON from LLM output."""
        text = raw_text.strip()

        # Remove markdown code fences
        if text.startswith("```json"):
            text = text[7:]
        elif text.startswith("```"):
            text = text[3:]
        if text.endswith("```"):
            text = text[:-3]
        text = text.strip()

        try:
            return json.loads(text)
        except json.JSONDecodeError as e:
            print(f"[ERROR] Failed to parse LLM JSON: {e}")
            print(f"[DEBUG] Raw text (first 500 chars): {text[:500]}")
            raise ValueError(f"AI returned invalid JSON: {e}")

    @staticmethod
    def _compute_flags(result: ExtractionResult) -> ExtractionFlags:
        """
        Post-process: compute quality flags from the extracted data.
        LLM-provided flags are used as a base, then we layer on
        deterministic checks.
        """
        flags = result.flags or ExtractionFlags()

        meta = result.metadata
        parties = result.parties
        financials = result.financials
        refs = result.references

        # Missing invoice number
        if refs is None or refs.invoice_number is None:
            if meta and meta.document_type in (
                "sales_invoice", "vendor_invoice", "credit_note", "debit_note"
            ):
                flags.missing_invoice_number = True

        # Missing party
        if parties is None or (
            parties.customer_name is None
            and parties.vendor_name is None
            and parties.payer_name is None
            and parties.payee_name is None
        ):
            flags.missing_party = True

        # Missing date
        if meta is None or meta.document_date is None:
            flags.missing_date = True

        # Missing amount
        if financials is None or financials.total_amount is None:
            if meta and meta.document_type not in ("bank_statement", "payroll"):
                flags.missing_amount = True

        # Low confidence
        if meta and meta.confidence is not None and meta.confidence < 0.6:
            flags.low_confidence = True

        return flags


# Module-level singleton
extraction_service = DocumentExtractionService()
