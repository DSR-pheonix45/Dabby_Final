import os
import json
from typing import Dict, Optional
from groq import Groq

import google.generativeai as genai

class AIService:
    def __init__(self):
        groq_key = os.environ.get("VITE_GROQ_API_KEY") or os.environ.get("GROQ_API_KEY")
        gemini_key = os.environ.get("VITE_GEMINI_API_KEY") or os.environ.get("GEMINI_API_KEY")

        if groq_key:
            sanitized_key = groq_key.strip().strip('"').strip("'")
            self.groq_client = Groq(api_key=sanitized_key)
        else:
            self.groq_client = None

        if gemini_key:
            sanitized_gemini = gemini_key.strip().strip('"').strip("'")
            genai.configure(api_key=sanitized_gemini)
            self.gemini_model = genai.GenerativeModel('gemini-2.5-flash')
        else:
            self.gemini_model = None

    async def scan_invoice(self, file_content: str, filename: str) -> Dict:
        """
        Uses LLM to extract structured data from invoice text/content.
        """
        if not self.groq_client:
            # Fallback to gemini if groq is missing
            return await self.scan_document_vision(file_content.encode(), "text/plain", filename)

        system_prompt = """
        You are an expert financial AI. Analyze the document text content and extract the fields according to the Dabby OCR Contract (v1).
        
        Classify the document into one of the following exact 'document_type' string values:
        - 'sales_invoice' (Create Revenue event)
        - 'customer_payment_receipt' (Receive Customer Payment event)
        - 'vendor_invoice' (Receive Vendor Bill event)
        - 'vendor_payment_receipt' (Pay Vendor event)
        - 'bank_statement' (Import Bank Transactions event)
        - 'expense_receipt' (Record Expense event)
        - 'payroll_register' (Process Payroll event)
        - 'credit_note' (Reverse Revenue event)
        - 'debit_note' (Vendor Adjustment event)
        - 'loan_agreement' (Create Loan event)
        - 'investment_agreement' (Raise Capital event)
        - 'tax_document' (Tax Liability event)
        - 'purchase_order' (Procurement Commitment event)
        - 'sales_order' (Revenue Pipeline event)
        - 'manual_journal' (Manual Journal event)

        RULES:
        1. OCR is ONLY responsible for extracting facts and metadata. Do NOT output ledger accounts (e.g. do not suggest debit_account or credit_account keys).
        2. Any mandatory classification fields specified in the Dabby OCR Contract (v1) that do not have their own standard keys in the Generic JSON Schema below MUST be placed inside the "additional_fields" dictionary (e.g. payment_method, employees, filing_period, bank_name, statement period, lender, principal).

        Return ONLY a JSON object adhering exactly to this schema:
        {
          "document_type": "vendor_invoice", // Classify into one of the types above
          "confidence": 0.98,

          "document_metadata": {
            "document_id": null,
            "document_date": "YYYY-MM-DD", // Extract date of document issue/creation
            "currency": "INR", // 3-letter currency code (e.g. USD, INR)
            "language": "en"
          },

          "parties": {
            "vendor_name": null, // Name of the vendor/merchant if applicable
            "customer_name": null, // Name of customer/recipient if applicable
            "gst_number": null
          },

          "financials": {
            "subtotal": 0, // Numeric amount
            "tax_amount": 0, // Numeric amount
            "discount": 0, // Numeric amount
            "total_amount": 0 // Numeric amount
          },

          "line_items": [
            {
              "description": "",
              "quantity": 1,
              "unit_price": 0,
              "amount": 0,
              "tax_rate": 18,
              "tax_amount": 0
            }
          ],

          "references": {
            "invoice_number": null, // Invoice/bill/receipt reference number
            "purchase_order": null,
            "reference_invoice": null,
            "transaction_reference": null
          },

          "additional_fields": {}
        }
        
        Ensure numbers are represented as floats or integers, and missing/unknown string values are represented as null.
        """
        
        user_msg = f"Document Filename: {filename}\nContent:\n{file_content[:15000]}"
        
        try:
            completion = self.groq_client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_msg}
                ],
                response_format={"type": "json_object"}
            )
            return json.loads(completion.choices[0].message.content)
        except Exception as e:
            print(f"[ERROR] AI Invoice Scan failed: {str(e)}")
            raise e

    async def scan_document_vision(self, file_bytes: bytes, mime_type: str, filename: str) -> Dict:
        """
        Uses Gemini Vision to extract data from images or PDFs.
        """
        # If text/csv/txt file, delegate to text-based extraction
        is_text = (mime_type or "").startswith("text/") or filename.endswith(".csv") or filename.endswith(".txt")
        if is_text:
            try:
                text_content = file_bytes.decode("utf-8", errors="ignore")
                return await self.scan_invoice(text_content, filename)
            except Exception as text_err:
                print(f"[WARNING] Text decoding failed, falling back to vision: {text_err}")

        if not self.gemini_model:
            raise ValueError("GEMINI_API_KEY not configured")

        prompt = """
        You are an expert financial AI. Analyze this document and extract the fields according to the Dabby OCR Contract (v1).
        
        Classify the document into one of the following exact 'document_type' string values:
        - 'sales_invoice'
        - 'customer_payment_receipt'
        - 'vendor_invoice'
        - 'vendor_payment_receipt'
        - 'bank_statement'
        - 'expense_receipt'
        - 'payroll_register'
        - 'credit_note'
        - 'debit_note'
        - 'loan_agreement'
        - 'investment_agreement'
        - 'tax_document'
        - 'purchase_order'
        - 'sales_order'
        - 'manual_journal'

        RULES:
        1. OCR is ONLY responsible for extracting facts and metadata. Do NOT output ledger accounts (e.g. do not suggest debit_account or credit_account keys).
        2. Any mandatory classification fields specified in the Dabby OCR Contract (v1) that do not have their own standard keys in the Generic JSON Schema below MUST be placed inside the "additional_fields" dictionary (e.g. payment_method, employees, filing_period, bank_name, statement period, lender, principal).

        Return ONLY a JSON object adhering exactly to this schema:
        {
          "document_type": "vendor_invoice", // Classify into one of the types above
          "confidence": 0.98,

          "document_metadata": {
            "document_id": null,
            "document_date": "YYYY-MM-DD", // Extract date of document issue/creation
            "currency": "INR", // 3-letter currency code (e.g. USD, INR)
            "language": "en"
          },

          "parties": {
            "vendor_name": null, // Name of the vendor/merchant if applicable
            "customer_name": null, // Name of customer/recipient if applicable
            "gst_number": null
          },

          "financials": {
            "subtotal": 0, // Numeric amount
            "tax_amount": 0, // Numeric amount
            "discount": 0, // Numeric amount
            "total_amount": 0 // Numeric amount
          },

          "line_items": [
            {
              "description": "",
              "quantity": 1,
              "unit_price": 0,
              "amount": 0,
              "tax_rate": 18,
              "tax_amount": 0
            }
          ],

          "references": {
            "invoice_number": null, // Invoice/bill/receipt reference number
            "purchase_order": null,
            "reference_invoice": null,
            "transaction_reference": null
          },

          "additional_fields": {}
        }
        
        Ensure numbers are represented as floats or integers, and missing/unknown string values are represented as null.
        """

        try:
            schema = {
                "type": "OBJECT",
                "properties": {
                    "document_type": {"type": "STRING"},
                    "confidence": {"type": "NUMBER"},
                    "document_metadata": {
                        "type": "OBJECT",
                        "properties": {
                            "document_id": {"type": "STRING"},
                            "document_date": {"type": "STRING"},
                            "currency": {"type": "STRING"},
                            "language": {"type": "STRING"}
                        }
                    },
                    "parties": {
                        "type": "OBJECT",
                        "properties": {
                            "vendor_name": {"type": "STRING"},
                            "customer_name": {"type": "STRING"},
                            "gst_number": {"type": "STRING"}
                        }
                    },
                    "financials": {
                        "type": "OBJECT",
                        "properties": {
                            "subtotal": {"type": "NUMBER"},
                            "tax_amount": {"type": "NUMBER"},
                            "discount": {"type": "NUMBER"},
                            "total_amount": {"type": "NUMBER"}
                        }
                    },
                    "line_items": {
                        "type": "ARRAY",
                        "items": {
                            "type": "OBJECT",
                            "properties": {
                                "description": {"type": "STRING"},
                                "quantity": {"type": "NUMBER"},
                                "unit_price": {"type": "NUMBER"},
                                "amount": {"type": "NUMBER"},
                                "tax_rate": {"type": "NUMBER"},
                                "tax_amount": {"type": "NUMBER"}
                            }
                        }
                    },
                    "references": {
                        "type": "OBJECT",
                        "properties": {
                            "invoice_number": {"type": "STRING"},
                            "purchase_order": {"type": "STRING"},
                            "reference_invoice": {"type": "STRING"},
                            "transaction_reference": {"type": "STRING"}
                        }
                    },
                    "additional_fields": {
                        "type": "OBJECT"
                    }
                },
                "required": ["document_type", "confidence", "document_metadata", "parties", "financials", "line_items", "references", "additional_fields"]
            }

            response = self.gemini_model.generate_content(
                [prompt, {"mime_type": mime_type, "data": file_bytes}],
                generation_config={
                    "response_mime_type": "application/json",
                    "response_schema": schema
                }
            )
            
            # Safer text extraction
            if not response.candidates or not response.candidates[0].content.parts:
                print(f"[ERROR] Gemini returned no candidates. Blocked? {response.prompt_feedback}")
                raise ValueError("Gemini failed to generate a response (possibly blocked by safety filters)")

            text = response.text.strip()
            print(f"[DEBUG] Gemini Raw Response: {text[:500]}...")
            if text.startswith("```json"):
                text = text[7:-3].strip()
            elif text.startswith("```"):
                text = text[3:-3].strip()
                
            try:
                return json.loads(text)
            except json.JSONDecodeError as je:
                print(f"[ERROR] Failed to parse Gemini JSON: {je}")
                print(f"Full Text: {text}")
                raise ValueError(f"AI returned invalid JSON: {str(je)}")
        except Exception as e:
            print(f"[ERROR] Gemini Vision Scan failed: {str(e)}")
            if hasattr(e, 'response'):
                print(f"[DEBUG] Gemini Error Response: {e.response}")
            raise e

    async def categorize_transaction(self, description: str, accounts: list) -> Dict:
        """
        Maps a transaction description to the most appropriate workbench account.
        """
        if not self.groq_client:
            raise ValueError("GROQ_API_KEY not configured")

        system_prompt = """
        You are an expert accountant. Given a transaction description and a list of possible Chart of Account entries, 
        select the single most appropriate account for the entry.
        
        Rules:
        1. Only pick one account.
        2. Return ONLY a JSON object with: {"account_id": "uuid", "account_name": "string", "confidence": float, "reasoning": "string"}.
        3. If no account fits well, pick the closest one but set confidence low.
        """
        
        accounts_ctx = "\n".join([f"- {a['id']}: {a['full_account_name']} (Account Code: {a['account_code']})" for a in accounts])
        user_msg = f"Transaction Description: {description}\n\nAvailable Accounts:\n{accounts_ctx}"
        
        try:
            completion = self.groq_client.chat.completions.create(
                model="llama-3.1-8b-instant", # Use smaller model for fast classification
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_msg}
                ],
                response_format={"type": "json_object"}
            )
            return json.loads(completion.choices[0].message.content)
        except Exception as e:
            print(f"[ERROR] AI Categorization failed: {str(e)}")
            return {"account_id": None, "error": str(e)}

ai_service = AIService()
