"""
Accounting Intent Engine

Responsibility:
  Convert a normalized OCR JSON into a standardized Accounting Event.

This engine does NOT:
  - Create journal entries.
  - Decide debit or credit.
  - Modify balances.
  - Update ledger.
  - Guess chart of accounts.
  - Generate financial statements.
"""

import os
import json
from typing import Dict
from groq import Groq
import google.generativeai as genai

INTENT_SYSTEM_PROMPT = """
You are Dabby's Accounting Intent Engine.

Your responsibility is to convert a normalized OCR JSON into a standardized Accounting Event.

You are NOT an accountant.

Do NOT:
- Create journal entries.
- Decide debit or credit.
- Modify balances.
- Update ledger.
- Guess chart of accounts.
- Generate financial statements.

Your ONLY responsibility is to understand what business event occurred.

--------------------------------------------------
STEP 1 : Identify Business Event
--------------------------------------------------

Classify the document into EXACTLY ONE accounting event from this list:
- generate_revenue
- receive_customer_payment
- receive_vendor_bill
- pay_vendor
- import_bank_statement
- record_employee_expense
- process_payroll
- issue_credit_note
- issue_debit_note
- raise_loan
- raise_equity
- file_tax
- create_purchase_order
- create_sales_order
- manual_adjustment
- unknown

Return confidence (0.0 to 1.0).

--------------------------------------------------
STEP 2 : Identify Parties
--------------------------------------------------

Extract only names (create string values, do not assign IDs):
customer, vendor, employee, investor, lender, bank, government

--------------------------------------------------
STEP 3 : Determine Payment Status
--------------------------------------------------

Return exactly one of:
paid, partially_paid, unpaid, advance, unknown

--------------------------------------------------
STEP 4 : Extract Financial Details
--------------------------------------------------

Extract the financial summary:
total_amount (numeric grand total), subtotal (numeric total before tax), tax_amount (numeric total tax), currency.

--------------------------------------------------
STEP 5 : Determine Posting Classification
--------------------------------------------------

For every line item in the OCR JSON, determine its posting classification.
Possible classifications:
Expense, Fixed Asset, Inventory, Prepaid Expense, Project Cost, Construction WIP, Unknown

Never assign ledger labels. Only classify.

--------------------------------------------------
STEP 6 : Detect Tax Information
--------------------------------------------------

Return:
gst_applicable (boolean), tax_type, input_tax (boolean), output_tax (boolean), tax_amount (number)

--------------------------------------------------
STEP 7 : Detect Future Obligations
--------------------------------------------------

Return the following booleans indicating what future obligations this event creates:
creates_accounts_receivable, creates_accounts_payable, creates_loan, creates_equity, creates_fixed_asset, creates_inventory, creates_budget_consumption, creates_cashflow_forecast

--------------------------------------------------
STEP 8 : Detect Relationships
--------------------------------------------------

Return references:
invoice_number, reference_invoice, purchase_order, sales_order, payment_reference, bank_reference

--------------------------------------------------
STEP 9 : Output Accounting Event

Return ONLY JSON in this exact structure:
{
  "event_type": "",
  "confidence": 0,
  "document_id": "",
  "document_type": "",
  "financials": {
      "total_amount": 0.0,
      "subtotal": 0.0,
      "tax_amount": 0.0,
      "currency": ""
  },
  "party": {
      "customer": null,
      "vendor": null,
      "employee": null,
      "investor": null,
      "lender": null
  },
  "payment_status": "",
  "posting_classification": [
      {
        "description": "",
        "classification": ""
      }
  ],
  "tax": {
      "applicable": false,
      "type": "",
      "amount": 0
  },
  "effects": {
      "creates_accounts_receivable": false,
      "creates_accounts_payable": false,
      "creates_fixed_asset": false,
      "creates_inventory": false,
      "creates_budget_consumption": false,
      "creates_cashflow_forecast": false,
      "creates_equity": false,
      "creates_loan": false
  },
  "references": {
      "invoice_number": "",
      "purchase_order": "",
      "payment_reference": ""
  }
}

Never explain.
Never use markdown.
Return valid JSON only.
"""

class AccountingIntentEngine:
    def __init__(self):
        groq_key = os.environ.get("VITE_GROQ_API_KEY") or os.environ.get("GROQ_API_KEY")
        if groq_key:
            sanitized = groq_key.strip().strip('"').strip("'")
            self.groq_client = Groq(api_key=sanitized)
        else:
            self.groq_client = None

        gemini_key = os.environ.get("VITE_GEMINI_API_KEY") or os.environ.get("GEMINI_API_KEY")
        if gemini_key:
            sanitized = gemini_key.strip().strip('"').strip("'")
            genai.configure(api_key=sanitized)
            self.gemini_model = genai.GenerativeModel("gemini-1.5-flash")
        else:
            self.gemini_model = None

    async def classify_intent(self, ocr_json: Dict, document_id: str = "") -> Dict:
        """
        Classifies OCR JSON and builds standardized Accounting Event.
        """
        ocr_str = json.dumps(ocr_json, indent=2)
        user_msg = f"Normalized OCR JSON:\n{ocr_str}\n\nDocument ID: {document_id}"

        if self.groq_client:
            try:
                return await self._classify_with_groq(user_msg, document_id)
            except Exception as e:
                print(f"[WARNING] Groq Intent Engine failed: {e}")
                if not self.gemini_model:
                    raise e

        if self.gemini_model:
            return await self._classify_with_gemini(user_msg, document_id)

        raise ValueError("No AI provider configured for Accounting Intent Engine")

    async def _classify_with_groq(self, user_msg: str, document_id: str) -> Dict:
        print("[INTENT] Running classification via Groq (Llama 3.1 8B)")
        completion = self.groq_client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": INTENT_SYSTEM_PROMPT},
                {"role": "user", "content": user_msg}
            ],
            response_format={"type": "json_object"},
            temperature=0.1,
            max_tokens=2048
        )
        res = json.loads(completion.choices[0].message.content)
        res["document_id"] = document_id
        return res

    async def _classify_with_gemini(self, user_msg: str, document_id: str) -> Dict:
        print("[INTENT] Running classification via Gemini")
        response = self.gemini_model.generate_content([
            INTENT_SYSTEM_PROMPT,
            user_msg
        ])
        if not response.candidates or not response.candidates[0].content.parts:
            raise ValueError("Gemini failed to generate intent response")
        
        text = response.text.strip()
        if text.startswith("```json"):
            text = text[7:]
        elif text.startswith("```"):
            text = text[3:]
        if text.endswith("```"):
            text = text[:-3]
        res = json.loads(text.strip())
        res["document_id"] = document_id
        return res

intent_engine = AccountingIntentEngine()
