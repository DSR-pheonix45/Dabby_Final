import os
import json
from typing import Dict, Optional
from groq import Groq
import google.generativeai as genai
from services.groq_pool import GroqPool

GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-2.0-flash")

class AIService:
    def __init__(self):
        gemini_key = os.environ.get("VITE_GEMINI_API_KEY") or os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")

        if gemini_key:
            sanitized_gemini = gemini_key.strip().strip('"').strip("'")
            genai.configure(api_key=sanitized_gemini)
            try:
                self.gemini_model = genai.GenerativeModel(GEMINI_MODEL)
            except Exception:
                self.gemini_model = genai.GenerativeModel("gemini-2.0-flash")
        else:
            self.gemini_model = None

    async def scan_invoice(self, file_content: str, filename: str) -> Dict:
        """
        Uses LLM to extract structured data from invoice text/content.
        """
        from services.document_classifier import DocumentClassifier
        classifier = DocumentClassifier(GroqPool.execute, self.gemini_model)
        class_data = classifier.classify(file_content, filename)
        doc_type = class_data.get("document_type", "unknown")
        
        print(f"[DEBUG] Document classified as: {doc_type}")
        if doc_type == "bank_statement":
            return await self.extract_bank_statement_text(file_content, filename)

        system_prompt = """
        You are an expert financial AI. Analyze the document text content and extract the fields according to the Dabby OCR Contract (v1).
        
        Classify the document into one of the following exact 'document_type' string values:
        - 'sales_invoice' (Create Revenue event - Invoice issued by us where letterhead has Archzona / Archzona LLP details)
        - 'customer_payment_receipt' (Receive Customer Payment event)
        - 'vendor_invoice' (Receive Vendor Bill event - Invoice received from vendor where letterhead has vendor details)
        - 'vendor_payment_receipt' (Pay Vendor event)
        - 'bank_statement' (Import Bank Transactions event)
        - 'expense_receipt' (Record Expense event)
        - 'payroll_register' (Process Payroll event)
        - 'credit_note' (Reverse Revenue event)
        - 'debit_note' (Vendor Adjustment event)
        - 'loan_agreement' (Create Loan event)
        - 'investment_agreement' (Raise Capital event)
        - 'tax_document' (Tax Liability event, do NOT use for bank statements)
        - 'purchase_order' (Procurement Commitment event)
        - 'sales_order' (Revenue Pipeline event)

        INVOICE LETTERHEAD CLASSIFICATION RULE:
        - Inspect the document letterhead / header (issuing party):
        - If the letterhead / issuer name contains "Archzona", "Archzona LLP", or our entity details -> classify as 'sales_invoice' (invoice sent by us).
        - If the letterhead / issuer contains ANY OTHER company details -> classify as 'vendor_invoice' (invoice received from vendor).

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
            completion = GroqPool.execute(
                lambda client: client.chat.completions.create(
                    model="llama-3.3-70b-versatile",
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_msg}
                    ],
                    response_format={"type": "json_object"}
                )
            )
            extracted = json.loads(completion.choices[0].message.content)
            if doc_type != "unknown" and extracted.get("document_type") in ("unknown", None, "vendor_invoice", "sales_invoice"):
                extracted["document_type"] = doc_type

            # Enforce letterhead rule post-extraction for invoices
            extracted_dt = extracted.get("document_type") or doc_type
            if extracted_dt in ("vendor_invoice", "sales_invoice"):
                parties = extracted.get("parties") or {}
                vendor_name = (parties.get("vendor_name") or "").lower()
                customer_name = (parties.get("customer_name") or "").lower()
                content_head = (file_content or "")[:1500].lower()
                
                if "archzona" in vendor_name or "archzona llp" in vendor_name or "archzona" in content_head[:500]:
                    extracted["document_type"] = "sales_invoice"
                elif "archzona" in customer_name:
                    extracted["document_type"] = "vendor_invoice"

            return extracted

        except Exception as e:
            print(f"[WARNING] Groq scan failed, attempting fallback to Gemini: {str(e)}")
            # Fallback to gemini if groq fails or has no keys configured
            return await self.scan_document_vision(file_content.encode(), "text/plain", filename)


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

        # 1. Classify the document type first
        class_prompt = """
        You are a document classification specialist. Identify the type of this financial document.
        Return ONLY a JSON object with this exact schema:
        {
          "document_type": "bank_statement", // One of: sales_invoice, vendor_invoice, customer_payment_receipt, vendor_payment_receipt, bank_statement, expense_receipt, payroll_register, credit_note, debit_note, purchase_order, sales_order, loan_agreement, investment_agreement, tax_document (do not use for bank statements), unknown
          "confidence": 0.95
        }
        """
        class_schema = {
            "type": "OBJECT",
            "properties": {
                "document_type": {"type": "STRING"},
                "confidence": {"type": "NUMBER"}
            },
            "required": ["document_type", "confidence"]
        }
        try:
            class_res = self.gemini_model.generate_content(
                [class_prompt, {"mime_type": mime_type, "data": file_bytes}],
                generation_config={
                    "response_mime_type": "application/json",
                    "response_schema": class_schema
                }
            )
            class_text = class_res.text.strip()
            if class_text.startswith("```json"):
                class_text = class_text[7:-3].strip()
            elif class_text.startswith("```"):
                class_text = class_text[3:-3].strip()
            class_data = json.loads(class_text)
            doc_type = class_data.get("document_type", "unknown")
            print(f"[DEBUG] Gemini Vision classified document as: {doc_type}")
        except Exception as e:
            print(f"[WARNING] Gemini Vision classification failed, defaulting to unknown: {e}")
            doc_type = "unknown"

        if doc_type == "bank_statement":
            return await self.extract_bank_statement_vision(file_bytes, mime_type, filename)

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
        - 'tax_document' (do NOT use for bank statements)
        - 'purchase_order'
        - 'sales_order'


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
                extracted = json.loads(text)
                if doc_type != "unknown" and extracted.get("document_type") in ("unknown", None, "vendor_invoice", "sales_invoice"):
                    extracted["document_type"] = doc_type

                # Enforce letterhead rule post-extraction for invoices
                extracted_dt = extracted.get("document_type") or doc_type
                if extracted_dt in ("vendor_invoice", "sales_invoice"):
                    parties = extracted.get("parties") or {}
                    vendor_name = (parties.get("vendor_name") or "").lower()
                    customer_name = (parties.get("customer_name") or "").lower()
                    
                    if "archzona" in vendor_name or "archzona llp" in vendor_name:
                        extracted["document_type"] = "sales_invoice"
                    elif "archzona" in customer_name:
                        extracted["document_type"] = "vendor_invoice"

                return extracted

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
            completion = GroqPool.execute(
                lambda client: client.chat.completions.create(
                    model="llama-3.1-8b-instant", # Use smaller model for fast classification
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_msg}
                    ],
                    response_format={"type": "json_object"}
                )
            )
            return json.loads(completion.choices[0].message.content)
        except Exception as e:
            print(f"[ERROR] AI Categorization failed: {str(e)}")
            return {"account_id": None, "error": str(e)}

    async def extract_bank_statement_vision(self, file_bytes: bytes, mime_type: str, filename: str) -> Dict:
        """
        Runs dedicated Gemini Vision call to extract raw bank statement data,
        then processes KPIs and generates analysis note.
        """
        prompt = """
        You are an expert financial document parser specializing in Indian bank statements.
        Your objective is to accurately extract statement-level details and all transaction rows from the bank statement.

        GENERAL RULES:
        1. Extract information exactly as printed. Do not hallucinate values.
        2. Preserve original narration in a Raw Particulars field.
        3. Interpret transaction narrations to identify payment mode, beneficiary, bank, references, etc.
        4. If a field cannot be identified confidently, return null. Do not guess beneficiary names.
        5. All monetary values must be numeric.
        6. Dates should be returned in YYYY-MM-DD format.
        7. Maintain transaction order.
        8. CRITICAL: You MUST extract EVERY SINGLE transaction row from the document. Do not omit, truncate, skip, or summarize ANY rows. Failure to extract all rows will result in severe data loss.
        9. Withdrawals, payments, and deductions MUST be placed in 'debit_amount'. Deposits, receipts, and additions MUST be placed in 'credit_amount'.
        9. EXPLICITLY IGNORE any "Charge Statement" or fee summary tables at the end of the document. Only extract actual account ledger transactions.
        10. DECODE the party/beneficiary name directly from the particular/narration and place it in the 'beneficiary_name' field. Strip out transaction prefixes (like NEFT, RTGS, IMPS), reference numbers, and bank codes to isolate the clean party name.

        NARRATION PARSING RULES:
        - SAK is NOT a payment mode. When narration starts with SAK/ or SAK, treat SAK as internal_prefix. Do NOT classify it as beneficiary, payment mode, or bank. Use the next token to determine transaction type. E.g., SAK/CASH WDL means Payment Mode: Cash Withdrawal, Internal Prefix: SAK.
        - Examples of narration parsing:
          - SAK/CASH WDL/SAK431881998/125/DOMBIVLI/(SELF) -> Payment Mode: Cash Withdrawal, Internal Prefix: SAK, Reference Number: SAK431881998, Branch Code: 125, Location: DOMBIVLI, Beneficiary: SELF.
          - NEFT/HDFCH00099710200/ADVAIT BUILDERS DEVELOPERS/HDFC BANK/0001 -> Payment Mode: NEFT, Reference Number: HDFCH00099710200, Beneficiary: ADVAIT BUILDERS DEVELOPERS, Beneficiary Bank: HDFC BANK, Branch Code: 0001.
          - RTGS/UBINR22025032001939320/SHREE SWAMI SAMARTH AS/UNION BANK OF INDIA -> Payment Mode: RTGS, Reference Number: UBINR22025032001939320, Beneficiary: SHREE SWAMI SAMARTH AS, Beneficiary Bank: UNION BANK OF INDIA.
          - CLG/000332/030425/ICICI BANK -> Payment Mode: Cheque Clearing, Cheque Number: 000332, Value Date (Cheque Date): 2025-04-03, Beneficiary Bank: ICICI BANK.
          - SAK NEFT/RTGS Charges -> Category: Bank Charges, Payment Mode: Charges, Charge Type: NEFT/RTGS.

        Recognize these payment modes:
        - NEFT
        - RTGS
        - IMPS
        - UPI
        - Cash Withdrawal
        - Cash Deposit
        - ATM
        - POS
        - ECS
        - NACH
        - Cheque
        - Cheque Clearing
        - Interest
        - Bank Charges
        - GST
        - Internal Transfer
        - Unknown

        Recognize internal prefixes: SAK, SK, INT, TRF, MB, etc.

        Return ONLY a JSON object matching the requested schema. Do NOT perform any totals or averages.
        """

        schema = {
            "type": "OBJECT",
            "properties": {
                "statement_summary": {
                    "type": "OBJECT",
                    "properties": {
                        "bank_name": {"type": "STRING"},
                        "account_holder_name": {"type": "STRING"},
                        "account_number": {"type": "STRING"},
                        "customer_id": {"type": "STRING"},
                        "branch": {"type": "STRING"},
                        "ifsc": {"type": "STRING"},
                        "micr": {"type": "STRING"},
                        "currency": {"type": "STRING"},
                        "statement_start_date": {"type": "STRING"},
                        "statement_end_date": {"type": "STRING"},
                        "opening_balance": {"type": "NUMBER"},
                        "closing_balance": {"type": "NUMBER"},
                        "total_credits": {"type": "NUMBER"},
                        "total_debits": {"type": "NUMBER"}
                    },
                    "required": ["bank_name", "account_holder_name", "account_number", "opening_balance", "closing_balance"]
                },
                "transactions": {
                    "type": "ARRAY",
                    "items": {
                        "type": "OBJECT",
                        "properties": {
                            "date": {"type": "STRING"},
                            "value_date": {"type": "STRING"},
                            "debit_amount": {"type": "NUMBER"},
                            "credit_amount": {"type": "NUMBER"},
                            "balance": {"type": "NUMBER"},
                            "payment_mode": {"type": "STRING"},
                            "beneficiary_name": {"type": "STRING"},
                            "beneficiary_bank": {"type": "STRING"},
                            "beneficiary_account": {"type": "STRING"},
                            "reference_number": {"type": "STRING"},
                            "cheque_number": {"type": "STRING"},
                            "branch_code": {"type": "STRING"},
                            "location": {"type": "STRING"},
                            "internal_prefix": {"type": "STRING"},
                            "category": {"type": "STRING"},
                            "raw_particulars": {"type": "STRING"}
                        },
                        "required": ["date", "raw_particulars", "balance"]
                    }
                }
            },
            "required": ["statement_summary", "transactions"]
        }

        try:
            response = self.gemini_model.generate_content(
                [prompt, {"mime_type": mime_type, "data": file_bytes}],
                generation_config={
                    "response_mime_type": "application/json",
                    "response_schema": schema,
                    "max_output_tokens": 8192,
                }
            )
            raw_data = json.loads(response.text.strip())
            return await self.post_process_bank_statement(raw_data)
        except Exception as e:
            print(f"[ERROR] Dedicated vision bank statement scan failed: {e}")
            raise e

    async def extract_bank_statement_text(self, file_content: str, filename: str) -> Dict:
        """
        Runs dedicated Llama/Groq call to extract raw bank statement data from text,
        then processes KPIs and generates analysis note.
        """
        system_prompt = """
        You are an expert financial document parser specializing in Indian bank statements.
        Your objective is to accurately extract statement-level details and all transaction rows from the bank statement text content.

        GENERAL RULES:
        1. Extract information exactly as printed. Do not hallucinate values.
        2. Preserve original narration in a Raw Particulars field.
        3. Interpret transaction narrations to identify payment mode, beneficiary, bank, references, etc.
        4. If a field cannot be identified confidently, return null. Do not guess beneficiary names.
        5. All monetary values must be numeric.
        6. Dates should be returned in YYYY-MM-DD format.
        7. Maintain transaction order.
        8. CRITICAL: You MUST extract EVERY SINGLE transaction row from the document. Do not omit, truncate, skip, or summarize ANY rows. Failure to extract all rows will result in severe data loss.
        9. Withdrawals, payments, and deductions MUST be placed in 'debit_amount'. Deposits, receipts, and additions MUST be placed in 'credit_amount'.
        9. EXPLICITLY IGNORE any "Charge Statement" or fee summary tables at the end of the document. Only extract actual account ledger transactions.
        10. DECODE the party/beneficiary name directly from the particular/narration and place it in the 'beneficiary_name' field. Strip out transaction prefixes (like NEFT, RTGS, IMPS), reference numbers, and bank codes to isolate the clean party name.

        NARRATION PARSING RULES:
        - SAK is NOT a payment mode. When narration starts with SAK/ or SAK, treat SAK as internal_prefix. Do NOT classify it as beneficiary, payment mode, or bank. Use the next token to determine transaction type. E.g., SAK/CASH WDL means Payment Mode: Cash Withdrawal, Internal Prefix: SAK.

        Recognize these payment modes:
        - NEFT, RTGS, IMPS, UPI, Cash Withdrawal, Cash Deposit, ATM, POS, ECS, NACH, Cheque, Cheque Clearing, Interest, Bank Charges, GST, Internal Transfer, Unknown.

        Return ONLY a JSON object adhering exactly to this schema:
        {
          "statement_summary": {
            "bank_name": null,
            "account_holder_name": null,
            "account_number": null,
            "customer_id": null,
            "branch": null,
            "ifsc": null,
            "micr": null,
            "currency": "INR",
            "statement_start_date": "YYYY-MM-DD",
            "statement_end_date": "YYYY-MM-DD",
            "opening_balance": 0.0,
            "closing_balance": 0.0,
            "total_credits": 0.0,
            "total_debits": 0.0
          },
          "transactions": [
            {
              "date": "YYYY-MM-DD",
              "value_date": "YYYY-MM-DD",
              "debit_amount": null,
              "credit_amount": null,
              "balance": 0.0,
              "payment_mode": null,
              "beneficiary_name": null,
              "beneficiary_bank": null,
              "beneficiary_account": null,
              "reference_number": null,
              "cheque_number": null,
              "branch_code": null,
              "location": null,
              "internal_prefix": null,
              "category": null, // Classify transaction category: Customer Receipt, Vendor Payment, Cash Withdrawal, Cash Deposit, Salary, Loan, EMI, Bank Charges, Interest, GST, Internal Transfer, Tax, Utility, Cheque, Unknown
              "raw_particulars": ""
            }
          ]
        }
        """

        user_msg = f"Document Filename: {filename}\nContent:\n{file_content[:80000]}"

        try:
            completion = GroqPool.execute(
                lambda client: client.chat.completions.create(
                    model="llama-3.3-70b-versatile",
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_msg}
                    ],
                    response_format={"type": "json_object"},
                    max_tokens=8192,
                )
            )
            raw_data = json.loads(completion.choices[0].message.content)
            return await self.post_process_bank_statement(raw_data)
        except Exception as e:
            print(f"[WARNING] Dedicated text bank statement scan failed, falling back to vision: {e}")
            return await self.extract_bank_statement_vision(file_content.encode(), "text/plain", filename)

    async def post_process_bank_statement(self, raw_data: Dict) -> Dict:
        """
        Aggregates KPIs, performs validation, and generates AI analysis note.
        """
        kpis_data = self.process_bank_statement_kpi_engine(raw_data)
        analysis_note = await self.generate_bank_statement_analysis_note(kpis_data)
        return {
            "document_type": "bank_statement",
            "confidence": 0.99,
            "bank_statement": {
                "statement_summary": kpis_data["statement_summary"],
                "transaction_summary": kpis_data["transaction_summary"],
                "payment_mode_summary": kpis_data["payment_mode_summary"],
                "beneficiary_summary": kpis_data["beneficiary_summary"],
                "transactions": kpis_data["transactions"],
                "analysis_note": analysis_note,
                "validation": kpis_data["validation"]
            }
        }

    def process_bank_statement_kpi_engine(self, extracted: Dict) -> Dict:
        summary = extracted.get("statement_summary") or {}
        transactions = extracted.get("transactions") or []
        
        start_date_str = summary.get("statement_start_date") or summary.get("start_date")
        end_date_str = summary.get("statement_end_date") or summary.get("end_date")
        duration = None
        if start_date_str and end_date_str:
            try:
                from datetime import datetime
                sd = datetime.strptime(start_date_str[:10], "%Y-%m-%d")
                ed = datetime.strptime(end_date_str[:10], "%Y-%m-%d")
                duration = (ed - sd).days
            except Exception:
                duration = None

        def normalize_narration(text):
            if not text:
                return ""
            import re
            # Remove dates like DD/MM/YY or YYYY-MM-DD
            text = re.sub(r'\b\d{2}[-/\.]\d{2}[-/\.]\d{2,4}\b', '', text)
            text = re.sub(r'\b\d{4}[-/\.]\d{2}[-/\.]\d{2}\b', '', text)
            # Remove long numbers (like reference numbers, UPI transaction IDs, cheque numbers)
            text = re.sub(r'\b\d{6,}\b', '', text)
            # Keep only letters and basic words
            text = re.sub(r'[^a-zA-Z\s]', '', text)
            # Clean up whitespace
            text = ' '.join(text.split())
            return text.strip().lower()

        bank_name_val = (summary.get("bank_name") or "Bank").strip()

        # 1. Assign row numbers, parse amounts, apply robust party rules
        for idx, tx in enumerate(transactions):
            tx["row_number"] = idx + 1
            cr = tx.get("credit_amount")
            dr = tx.get("debit_amount")
            cr_val = float(cr) if cr is not None else 0.0
            dr_val = float(dr) if dr is not None else 0.0
            
            tx["credit_amount"] = cr_val if cr is not None else None
            tx["debit_amount"] = dr_val if dr is not None else None
            tx["amount"] = cr_val if cr_val > 0 else dr_val
            tx["type"] = "Credit" if cr_val > 0 else "Debit"

            # Apply strict party fallback rules based on narration
            raw_part = (tx.get("raw_particulars") or "").strip().lower()
            if "gst" in raw_part:
                tx["beneficiary_name"] = "Unknown Entity (GST)"
            elif "sak/" in raw_part or "cash wdl" in raw_part or "cash dep" in raw_part or "/self" in raw_part:
                tx["beneficiary_name"] = "Self"
            elif any(k in raw_part for k in ["monthly charge", "monthly avg bal", "service chrg", "service ch", "bank charge"]):
                tx["beneficiary_name"] = bank_name_val

        # 2. Bunch redundant or duplicate of those line item entries
        groups = {}
        for tx in transactions:
            b_name = (tx.get("beneficiary_name") or "").strip()
            raw_part = (tx.get("raw_particulars") or "").strip()
            
            # Determine bunch key
            if b_name and b_name.lower() not in ("null", "none", "unknown"):
                bunch_key = "b_" + b_name.lower()
            else:
                norm_part = normalize_narration(raw_part)
                bunch_key = "p_" + norm_part if norm_part else f"row_{tx['row_number']}"
                
            if bunch_key not in groups:
                groups[bunch_key] = []
            groups[bunch_key].append(tx)

        # 3. Resolve beneficiary names inside groups (and map unknown rows)
        for bunch_key, group_txs in groups.items():
            extracted_b_name = None
            for tx in group_txs:
                b_name = (tx.get("beneficiary_name") or "").strip()
                if b_name and b_name.lower() not in ("null", "none", "unknown"):
                    extracted_b_name = b_name
                    break
            
            if extracted_b_name:
                for tx in group_txs:
                    tx["beneficiary_name"] = extracted_b_name
            else:
                # Map to Unknown Entity with list of row numbers
                row_nums = sorted([tx["row_number"] for tx in group_txs])
                if len(row_nums) > 1:
                    lbl = f"Unknown Entity (Rows: {', '.join(map(str, row_nums))})"
                else:
                    lbl = f"Unknown Entity (Row {row_nums[0]})"
                for tx in group_txs:
                    tx["beneficiary_name"] = lbl

        # 4. Standard calculations over the updated transactions list
        total_tx = len(transactions)
        credit_count = 0
        debit_count = 0
        credit_total = 0.0
        debit_total = 0.0
        highest_credit = 0.0
        highest_debit = 0.0
        unique_dates = set()
        
        payment_mode_data = {
            "NEFT": {"count": 0, "amount": 0.0},
            "RTGS": {"count": 0, "amount": 0.0},
            "IMPS": {"count": 0, "amount": 0.0},
            "UPI": {"count": 0, "amount": 0.0},
            "Cash": {"count": 0, "amount": 0.0},
            "Cheque": {"count": 0, "amount": 0.0},
            "Charges": {"count": 0, "amount": 0.0},
            "Interest": {"count": 0, "amount": 0.0},
            "Others": {"count": 0, "amount": 0.0}
        }
        
        beneficiaries = {}
        
        for tx in transactions:
            tx_date = tx.get("date")
            if tx_date:
                unique_dates.add(tx_date)
                
            cr_val = tx["credit_amount"] or 0.0
            dr_val = tx["debit_amount"] or 0.0
            
            if cr_val > 0:
                credit_count += 1
                credit_total += cr_val
                if cr_val > highest_credit:
                    highest_credit = cr_val
            if dr_val > 0:
                debit_count += 1
                debit_total += dr_val
                if dr_val > highest_debit:
                    highest_debit = dr_val
                    
            # Map payment modes
            raw_mode = (tx.get("payment_mode") or "").strip().upper()
            mapped_mode = "Others"
            if "NEFT" in raw_mode:
                mapped_mode = "NEFT"
            elif "RTGS" in raw_mode:
                mapped_mode = "RTGS"
            elif "IMPS" in raw_mode:
                mapped_mode = "IMPS"
            elif "UPI" in raw_mode:
                mapped_mode = "UPI"
            elif any(k in raw_mode for k in ["CASH", "ATM", "POS", "WITHDRAWAL", "DEPOSIT"]):
                mapped_mode = "Cash"
            elif any(k in raw_mode for k in ["CHEQUE", "CLG", "CLEARING"]):
                mapped_mode = "Cheque"
            elif any(k in raw_mode for k in ["CHARGE", "GST", "FEE", "TAX", "PENALTY"]):
                mapped_mode = "Charges"
            elif "INTEREST" in raw_mode or "INT" in raw_mode:
                mapped_mode = "Interest"
                
            tx_amt = cr_val if cr_val > 0 else dr_val
            payment_mode_data[mapped_mode]["count"] += 1
            payment_mode_data[mapped_mode]["amount"] += tx_amt
            
            b_name = (tx.get("beneficiary_name") or "").strip()
            if b_name:
                b_key = b_name.lower()
                if b_key not in beneficiaries:
                    beneficiaries[b_key] = {
                        "beneficiary_name": b_name,
                        "beneficiary_bank": tx.get("beneficiary_bank") or None,
                        "credit_count": 0,
                        "debit_count": 0,
                        "total_credits": 0.0,
                        "total_debits": 0.0,
                        "first_transaction_date": tx_date,
                        "last_transaction_date": tx_date
                    }
                b_info = beneficiaries[b_key]
                if cr_val > 0:
                    b_info["credit_count"] += 1
                    b_info["total_credits"] += cr_val
                if dr_val > 0:
                    b_info["debit_count"] += 1
                    b_info["total_debits"] += dr_val
                if tx_date:
                    if not b_info["first_transaction_date"] or tx_date < b_info["first_transaction_date"]:
                        b_info["first_transaction_date"] = tx_date
                    if not b_info["last_transaction_date"] or tx_date > b_info["last_transaction_date"]:
                        b_info["last_transaction_date"] = tx_date

        payment_mode_summary = [
            {"mode": k, "count": v["count"], "amount": round(v["amount"], 2)}
            for k, v in payment_mode_data.items()
        ]
        
        beneficiary_summary = []
        largest_beneficiary_name = None
        largest_beneficiary_val = 0.0
        
        for b_info in beneficiaries.values():
            net = round(b_info["total_credits"] - b_info["total_debits"], 2)
            total_vol = b_info["total_credits"] + b_info["total_debits"]
            if total_vol > largest_beneficiary_val:
                largest_beneficiary_val = total_vol
                largest_beneficiary_name = b_info["beneficiary_name"]
                
            beneficiary_summary.append({
                "beneficiary_name": b_info["beneficiary_name"],
                "beneficiary_bank": b_info["beneficiary_bank"],
                "credit_count": b_info["credit_count"],
                "debit_count": b_info["debit_count"],
                "total_credits": round(b_info["total_credits"], 2),
                "total_debits": round(b_info["total_debits"], 2),
                "net_amount": net,
                "first_transaction_date": b_info["first_transaction_date"],
                "last_transaction_date": b_info["last_transaction_date"]
            })
            
        largest_payment_mode = max(payment_mode_summary, key=lambda x: x["amount"])["mode"] if total_tx > 0 else None
        
        def safe_float(val):
            if val is None:
                return None
            if isinstance(val, (int, float)):
                return float(val)
            try:
                return float(str(val).replace(",", "").strip())
            except ValueError:
                return None

        opening_bal = safe_float(summary.get("opening_balance")) or 0.0
        closing_bal = safe_float(summary.get("closing_balance")) or 0.0
        reported_credits = safe_float(summary.get("total_credits"))
        reported_debits = safe_float(summary.get("total_debits"))

        expected_closing = opening_bal + credit_total - debit_total
        diff = round(abs(expected_closing - closing_bal), 2)
        balance_verified = diff <= 1.0
        
        validation_res = {
            "balance_verified": balance_verified,
            "difference": diff,
            "expected_closing": round(expected_closing, 2),
            "calculated_credits": round(credit_total, 2),
            "calculated_debits": round(debit_total, 2),
            "reported_credits": reported_credits,
            "reported_debits": reported_debits
        }
        
        kpis = {
            "opening_balance": opening_bal,
            "closing_balance": closing_bal,
            "statement_duration": duration,
            "total_transactions": total_tx,
            "credit_count": credit_count,
            "debit_count": debit_count,
            "credit_total": round(credit_total, 2),
            "debit_total": round(debit_total, 2),
            "net_cash_flow": round(credit_total - debit_total, 2),
            "highest_credit": highest_credit,
            "highest_debit": highest_debit,
            "average_credit": round(credit_total / credit_count, 2) if credit_count > 0 else 0.0,
            "average_debit": round(debit_total / debit_count, 2) if debit_count > 0 else 0.0,
            "active_transaction_days": len(unique_dates),
            "largest_beneficiary": largest_beneficiary_name,
            "largest_payment_mode": largest_payment_mode
        }
        
        return {
            "statement_summary": summary,
            "transaction_summary": kpis,
            "payment_mode_summary": payment_mode_summary,
            "beneficiary_summary": beneficiary_summary,
            "transactions": transactions,
            "validation": validation_res
        }

    async def generate_bank_statement_analysis_note(self, kpis_data: Dict) -> str:
        system_prompt = """
        You are an expert credit analyst specializing in bank statements.
        Generate a concise, professional credit analyst style summary note.
        
        RULES:
        1. Do NOT perform any arithmetic calculations. Use only the provided statistics exactly as given.
        2. Keep the analysis concise, insightful, and clear.
        3. Structure the output into the following sections exactly:
           - EXECUTIVE SUMMARY
           - CASH FLOW SUMMARY
           - BENEFICIARY BEHAVIOUR
           - BANKING PATTERN
           - POTENTIAL RISK FLAGS
        """
        
        data_to_dump = {
            'statement_summary': kpis_data['statement_summary'],
            'transaction_summary': kpis_data['transaction_summary'],
            'payment_mode_summary': kpis_data['payment_mode_summary'],
            'beneficiary_summary': kpis_data['beneficiary_summary'],
            'validation': kpis_data['validation']
        }
        user_msg = f"Bank Statement Metrics:\n{json.dumps(data_to_dump, indent=2)}"
        
        try:
            response = self.gemini_model.generate_content(
                [system_prompt, user_msg]
            )
            return response.text.strip()
        except Exception as e:
            print(f"[WARNING] Gemini analysis note generation failed: {e}")
            return f"Bank statement summary successfully processed. Verified: {kpis_data['validation']['balance_verified']}."

    async def scan_document_page_raw(self, file_bytes: bytes, mime_type: str, filename: str, is_text: bool, page_text: Optional[str] = None, doc_type: str = "generic") -> Dict:
        """
        Extracts structured JSON from a single page's text or bytes without post-processing.
        """
        if doc_type == "bank_statement":
            system_prompt = """
            You are an expert financial document parser specializing in Indian bank statements.
            Your objective is to accurately extract statement-level details and all transaction rows from the bank statement.
            If a field cannot be identified confidently, return null. Do not guess beneficiary names.
            All monetary values must be numeric. Dates should be returned in YYYY-MM-DD format.
            Maintain transaction order.
            
            Recognize these payment modes:
            - NEFT, RTGS, IMPS, UPI, Cash Withdrawal, Cash Deposit, ATM, POS, ECS, NACH, Cheque, Cheque Clearing, Interest, Bank Charges, GST, Internal Transfer, Unknown.
            
            Return ONLY a JSON object adhering exactly to this schema:
            {
              "statement_summary": {
                "bank_name": null,
                "account_holder_name": null,
                "account_number": null,
                "customer_id": null,
                "branch": null,
                "ifsc": null,
                "micr": null,
                "currency": "INR",
                "statement_start_date": "YYYY-MM-DD",
                "statement_end_date": "YYYY-MM-DD",
                "opening_balance": 0.0,
                "closing_balance": 0.0,
                "total_credits": 0.0,
                "total_debits": 0.0
              },
              "transactions": [
                {
                  "date": "YYYY-MM-DD",
                  "value_date": "YYYY-MM-DD",
                  "debit_amount": null,
                  "credit_amount": null,
                  "balance": 0.0,
                  "payment_mode": null,
                  "beneficiary_name": null,
                  "beneficiary_bank": null,
                  "beneficiary_account": null,
                  "reference_number": null,
                  "cheque_number": null,
                  "branch_code": null,
                  "location": null,
                  "internal_prefix": null,
                  "category": null,
                  "raw_particulars": ""
                }
              ]
            }
            """
            schema = {
                "type": "OBJECT",
                "properties": {
                    "statement_summary": {
                        "type": "OBJECT",
                        "properties": {
                            "bank_name": {"type": "STRING"},
                            "account_holder_name": {"type": "STRING"},
                            "account_number": {"type": "STRING"},
                            "customer_id": {"type": "STRING"},
                            "branch": {"type": "STRING"},
                            "ifsc": {"type": "STRING"},
                            "micr": {"type": "STRING"},
                            "currency": {"type": "STRING"},
                            "statement_start_date": {"type": "STRING"},
                            "statement_end_date": {"type": "STRING"},
                            "opening_balance": {"type": "NUMBER"},
                            "closing_balance": {"type": "NUMBER"},
                            "total_credits": {"type": "NUMBER"},
                            "total_debits": {"type": "NUMBER"}
                        },
                        "required": ["bank_name", "account_holder_name", "account_number", "opening_balance", "closing_balance"]
                    },
                    "transactions": {
                        "type": "ARRAY",
                        "items": {
                            "type": "OBJECT",
                            "properties": {
                                "date": {"type": "STRING"},
                                "value_date": {"type": "STRING"},
                                "debit_amount": {"type": "NUMBER"},
                                "credit_amount": {"type": "NUMBER"},
                                "balance": {"type": "NUMBER"},
                                "payment_mode": {"type": "STRING"},
                                "beneficiary_name": {"type": "STRING"},
                                "beneficiary_bank": {"type": "STRING"},
                                "beneficiary_account": {"type": "STRING"},
                                "reference_number": {"type": "STRING"},
                                "cheque_number": {"type": "STRING"},
                                "branch_code": {"type": "STRING"},
                                "location": {"type": "STRING"},
                                "internal_prefix": {"type": "STRING"},
                                "category": {"type": "STRING"},
                                "raw_particulars": {"type": "STRING"}
                            },
                            "required": ["date", "raw_particulars", "balance"]
                        }
                    }
                },
                "required": ["statement_summary", "transactions"]
            }
        else:
            system_prompt = """
            You are an expert financial AI. Analyze the document text content and extract the fields according to the Dabby OCR Contract (v1).
            Classify the document into one of the following exact 'document_type' string values:
            - 'sales_invoice', 'customer_payment_receipt', 'vendor_invoice', 'vendor_payment_receipt', 'expense_receipt', 'payroll_register', 'credit_note', 'debit_note', 'loan_agreement', 'investment_agreement', 'tax_document', 'purchase_order', 'sales_order'.
            Return ONLY a JSON object adhering exactly to this schema:
            {
              "document_type": "vendor_invoice",
              "confidence": 0.98,
              "document_metadata": {
                "document_id": null,
                "document_date": "YYYY-MM-DD",
                "currency": "INR",
                "language": "en"
              },
              "parties": {
                "vendor_name": null,
                "customer_name": null,
                "gst_number": null
              },
              "financials": {
                "subtotal": 0,
                "tax_amount": 0,
                "discount": 0,
                "total_amount": 0
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
                "invoice_number": null,
                "purchase_order": null,
                "reference_invoice": null,
                "transaction_reference": null
              },
              "additional_fields": {}
            }
            """
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
                    "additional_fields": {"type": "OBJECT"}
                },
                "required": ["document_type", "confidence", "document_metadata", "parties", "financials", "line_items", "references", "additional_fields"]
            }

        if is_text:
            user_msg = f"Document Page Content:\n{page_text or ''}"
            completion = GroqPool.execute(
                lambda client: client.chat.completions.create(
                    model="llama-3.3-70b-versatile",
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_msg}
                    ],
                    response_format={"type": "json_object"}
                )
            )
            return json.loads(completion.choices[0].message.content)
        else:
            if not self.gemini_model:
                raise ValueError("GEMINI_API_KEY not configured")
                
            response = self.gemini_model.generate_content(
                [system_prompt, {"mime_type": mime_type, "data": file_bytes}],
                generation_config={
                    "response_mime_type": "application/json",
                    "response_schema": schema
                }
            )
            if not response.candidates or not response.candidates[0].content.parts:
                raise ValueError("Gemini failed to generate a response (possibly blocked by safety filters)")
                
            text = response.text.strip()
            if text.startswith("```json"):
                text = text[7:-3].strip()
            elif text.startswith("```"):
                text = text[3:-3].strip()
            return json.loads(text)

    def aggregate_pages(self, pages_dict: Dict) -> Dict:
        """
        Phase 8: Incremental/Final Aggregation of bank statement pages.
        """
        sorted_page_nums = sorted(int(p) for p in pages_dict.keys())
        
        aggregated_summary = {
            "bank_name": None,
            "account_holder_name": None,
            "account_number": None,
            "customer_id": None,
            "branch": None,
            "ifsc": None,
            "micr": None,
            "currency": "INR",
            "statement_start_date": None,
            "statement_end_date": None,
            "opening_balance": 0.0,
            "closing_balance": 0.0,
            "total_credits": 0.0,
            "total_debits": 0.0
        }
        
        aggregated_transactions = []
        opening_balance_set = False
        closing_balance_set = False
        
        for p_num in sorted_page_nums:
            p_data = pages_dict[str(p_num)]
            if p_data.get("status") != "COMPLETED":
                continue
                
            res = p_data.get("result") or {}
            if "bank_statement" in res:
                res = res["bank_statement"]
                
            summary = res.get("statement_summary") or {}
            txs = res.get("transactions") or []
            
            aggregated_transactions.extend(txs)
            
            for k in ["bank_name", "account_holder_name", "account_number", "customer_id", "branch", "ifsc", "micr", "currency"]:
                if not aggregated_summary.get(k) and summary.get(k):
                    aggregated_summary[k] = summary[k]
            
            if not aggregated_summary.get("statement_start_date") and summary.get("statement_start_date"):
                aggregated_summary["statement_start_date"] = summary["statement_start_date"]
            if summary.get("statement_end_date"):
                aggregated_summary["statement_end_date"] = summary["statement_end_date"]
                
            if not opening_balance_set and summary.get("opening_balance") is not None:
                try:
                    aggregated_summary["opening_balance"] = float(summary["opening_balance"])
                    opening_balance_set = True
                except (ValueError, TypeError):
                    pass
                    
            if summary.get("closing_balance") is not None:
                try:
                    aggregated_summary["closing_balance"] = float(summary["closing_balance"])
                    closing_balance_set = True
                except (ValueError, TypeError):
                    pass
            
            for k in ["total_credits", "total_debits"]:
                if (not aggregated_summary.get(k) or aggregated_summary.get(k) == 0.0) and summary.get(k):
                    try:
                        aggregated_summary[k] = float(summary[k])
                    except (ValueError, TypeError):
                        pass

        if not opening_balance_set and aggregated_transactions:
            first_tx = aggregated_transactions[0]
            if first_tx.get("balance") is not None:
                try:
                    aggregated_summary["opening_balance"] = float(first_tx["balance"])
                except (ValueError, TypeError):
                    pass
        if not closing_balance_set and aggregated_transactions:
            last_tx = aggregated_transactions[-1]
            if last_tx.get("balance") is not None:
                try:
                    aggregated_summary["closing_balance"] = float(last_tx["balance"])
                except (ValueError, TypeError):
                    pass
                    
        sum_credits = 0.0
        sum_debits = 0.0
        for tx in aggregated_transactions:
            sum_credits += float(tx.get("credit_amount") or 0.0)
            sum_debits += float(tx.get("debit_amount") or 0.0)
            
        if not aggregated_summary.get("total_credits"):
            aggregated_summary["total_credits"] = sum_credits
        if not aggregated_summary.get("total_debits"):
            aggregated_summary["total_debits"] = sum_debits
            
        return {
            "statement_summary": aggregated_summary,
            "transactions": aggregated_transactions
        }

    def aggregate_invoice_pages(self, pages_dict: Dict) -> Dict:
        """
        Aggregates results for non-bank-statement document pages.
        """
        sorted_page_nums = sorted(int(p) for p in pages_dict.keys())
        
        aggregated = {
            "document_type": None,
            "confidence": 1.0,
            "document_metadata": {
                "document_id": None,
                "document_date": None,
                "currency": "INR",
                "language": "en"
            },
            "parties": {
                "vendor_name": None,
                "customer_name": None,
                "gst_number": None
            },
            "financials": {
                "subtotal": 0.0,
                "tax_amount": 0.0,
                "discount": 0.0,
                "total_amount": 0.0
            },
            "line_items": [],
            "references": {
                "invoice_number": None,
                "purchase_order": None,
                "reference_invoice": None,
                "transaction_reference": None
            },
            "additional_fields": {}
        }
        
        confidences = []
        for p_num in sorted_page_nums:
            p_data = pages_dict[str(p_num)]
            if p_data.get("status") != "COMPLETED":
                continue
                
            res = p_data.get("result") or {}
            
            if res.get("confidence") is not None:
                confidences.append(float(res["confidence"]))
                
            if not aggregated["document_type"] and res.get("document_type"):
                aggregated["document_type"] = res["document_type"]
                
            for section in ["parties", "references", "document_metadata"]:
                if section not in res:
                    continue
                for k, v in res[section].items():
                    if not aggregated[section].get(k) and v:
                        aggregated[section][k] = v
            
            if res.get("line_items"):
                aggregated["line_items"].extend(res["line_items"])
                
            if res.get("financials"):
                f = res["financials"]
                for k in ["subtotal", "tax_amount", "discount", "total_amount"]:
                    if f.get(k):
                        aggregated["financials"][k] = max(aggregated["financials"][k], float(f[k]))
                        
            if res.get("additional_fields"):
                aggregated["additional_fields"].update(res["additional_fields"])
                
        if confidences:
            aggregated["confidence"] = round(sum(confidences) / len(confidences), 2)

        aggregated["extraction_method"] = "aggregated"
        return aggregated

    # ──────────────────────────────────────────────────────────────────────────
    # Phase 1: Canonical OCR Raw Output Contract
    # New method — additive, does not change existing methods.
    # ──────────────────────────────────────────────────────────────────────────

    def build_ocr_raw_output(
        self,
        aggregated_extraction: Dict,
        pages_meta: dict,
        extraction_method: str = "aggregated",
    ) -> Dict:
        """
        Builds the canonical OCR raw output contract from an aggregated extraction result.

        This is the stable input contract for:
          - DocumentClassifier
          - AnalysisNoteService

        Output:
        {
            "raw_text":   str,             # concatenated text from all pages
            "tables":     list,            # extracted table structures [{headers, rows}]
            "entities":   {                # named entities found
                "dates":         list,
                "amounts":       list,
                "organizations": list,
                "gstin_numbers": list,
                "bank_accounts": list,
            },
            "confidence":         float,   # from extraction
            "extraction_method":  str,     # gemini_vision | groq_text | aggregated | fallback
            "page_count":         int,
        }

        Does NOT:
          - Generate journal entries
          - Suggest accounting accounts
          - Infer document type (that is the classifier's job)
        """
        import re

        # ── Raw text: collect from pages ───────────────────────
        raw_text_parts = []
        page_count = 0
        for page_num in sorted(pages_meta.keys(), key=lambda x: int(x)):
            page = pages_meta[page_num]
            if page.get("status") != "COMPLETED":
                continue
            page_count += 1
            page_text = page.get("page_text") or ""
            if page_text:
                raw_text_parts.append(page_text)

        # Fallback: use the text embedded in the aggregated extraction
        if not raw_text_parts and aggregated_extraction:
            # Try to reconstruct from line items and metadata
            meta_text = ""
            if aggregated_extraction.get("document_metadata"):
                meta_text = json.dumps(aggregated_extraction["document_metadata"])
            if aggregated_extraction.get("parties"):
                meta_text += " " + json.dumps(aggregated_extraction["parties"])
            raw_text_parts.append(meta_text)

        raw_text = "\n".join(raw_text_parts)

        # ── Entity extraction (deterministic regex, no AI) ──────
        entities = self._extract_entities_from_text(raw_text)

        # ── Tables: stubbed — AI-extracted tables would go here ─
        # In future, Gemini structured table extraction can populate this.
        tables = []

        return {
            "raw_text":          raw_text,
            "tables":            tables,
            "entities":          entities,
            "confidence":        float(aggregated_extraction.get("confidence", 0.0)),
            "extraction_method": extraction_method,
            "page_count":        page_count or 1,
        }

    @staticmethod
    def _extract_entities_from_text(text: str) -> Dict:
        """
        Deterministic regex-based entity extraction. No AI.
        Extracts: dates, amounts, organizations (basic), GSTIN, account numbers.
        """
        import re

        if not text:
            return {
                "dates":         [],
                "amounts":       [],
                "organizations": [],
                "gstin_numbers": [],
                "bank_accounts": [],
            }

        # Dates: DD/MM/YYYY, YYYY-MM-DD, DD-MM-YYYY, DD Mon YYYY
        date_patterns = [
            r'\b\d{2}[/-]\d{2}[/-]\d{4}\b',
            r'\b\d{4}-\d{2}-\d{2}\b',
            r'\b\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4}\b',
        ]
        dates = []
        for p in date_patterns:
            dates.extend(re.findall(p, text, re.IGNORECASE))

        # Amounts: ₹ or Rs or numbers with commas/decimals
        amount_patterns = [
            r'₹\s*[\d,]+(?:\.\d{1,2})?',
            r'Rs\.?\s*[\d,]+(?:\.\d{1,2})?',
            r'\b\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?\b',
        ]
        amounts = []
        for p in amount_patterns:
            amounts.extend(re.findall(p, text))

        # GSTIN: 15-char alphanumeric pattern
        gstin_numbers = re.findall(
            r'\b\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}[Z]{1}[A-Z\d]{1}\b', text
        )

        # Bank account numbers: 9-18 digit sequences
        bank_accounts = re.findall(r'\b\d{9,18}\b', text)

        # Organizations: lines with "Ltd", "Pvt", "Inc", "LLP", "Co.", etc.
        org_patterns = re.findall(
            r'[A-Z][A-Za-z\s&,\.]+(?:Ltd|Pvt|Inc|LLP|Co\.|Corp|Private Limited|Limited)\.?',
            text
        )

        return {
            "dates":         list(set(dates))[:20],
            "amounts":       list(set(amounts))[:20],
            "organizations": [o.strip() for o in list(set(org_patterns))[:10]],
            "gstin_numbers": list(set(gstin_numbers)),
            "bank_accounts": list(set(bank_accounts))[:5],
        }

    async def scan_company_master_import(self, file_bytes: bytes, mime_type: str, filename: str = "") -> list:
        """
        Uses Groq (for text/XML/CSV) or Gemini Vision (for PDF/images) to extract Chart of Accounts / Ledgers 
        from an imported document and map them to Dabby's internal account structure.
        """
        prompt = """
        You are an expert accountant and AI assistant. Your task is to analyze the provided financial document (which could be a Trial Balance, P&L, Balance Sheet, or Chart of Accounts export from systems like Tally, Zoho, etc.) and extract all the ledger accounts mentioned in it.
        
        For each ledger account you find, extract its raw name and map it to Dabby's internal account structure:
        1. 'source_account': The exact account name or label extracted directly from the uploaded document (e.g., 'Repairs and Maintenance', 'Cost of Goods Sold', 'Employee Advance', 'Shipping Charge', 'Undeposited Funds', etc.).
        2. 'ledger': Dabby's mapped ledger name (clean, standard name).
        3. 'account_class': Must be exactly one of ["Assets", "Liabilities", "Equity", "Revenue", "Expenses"]
        4. 'group_code': A 3-letter prefix based on the following mapping:
           - Assets: ACO (Cash & Cash Equivalents), AAR (Accounts Receivable), AIN (Inventory), ATX (Tax & Operational Advances), AFA (Fixed & Intangible Assets)
           - Liabilities: LAP (Accounts Payable), LDE (Debt & Credit Lines), LST (Statutory & Tax Liabilities), LPR (Payroll Liabilities)
           - Equity: ESC (Share Capital), ERE (Retained Earnings & Option Pools)
           - Revenue: ROP (Operating Revenue), RCR (Contra-Revenue & Other Income)
           - Expenses: XDC (Direct Costs/COGS), XPE (Personnel Costs/OPEX), XMK (Marketing & Growth/OPEX), XTE (Technology & Internal Tools/OPEX), XAD (Administrative & Statutory Expenses)
        5. 'label': User-friendly label (can be same as source_account or ledger).
        
        Return ONLY a JSON object containing an array called "accounts" with the extracted and mapped data.
        """

        schema = {
            "type": "OBJECT",
            "properties": {
                "accounts": {
                    "type": "ARRAY",
                    "items": {
                        "type": "OBJECT",
                        "properties": {
                            "source_account": {"type": "STRING"},
                            "ledger": {"type": "STRING"},
                            "account_class": {"type": "STRING"},
                            "group_code": {"type": "STRING"},
                            "label": {"type": "STRING"}
                        },
                        "required": ["source_account", "ledger", "account_class", "group_code", "label"]
                    }
                }
            },
            "required": ["accounts"]
        }

        # Try to decode as text or extract Excel/PDF text to use Groq or Gemini text mode
        text_content = ""
        mime = (mime_type or "").lower()
        filename_lower = (filename or "").lower()
        is_pdf = mime == "application/pdf" or filename_lower.endswith(".pdf")
        
        if is_pdf:
            try:
                import fitz
                pdf_doc = fitz.open(stream=file_bytes, filetype="pdf")
                for page in pdf_doc:
                    text_content += page.get_text()
                pdf_doc.close()
            except Exception as e:
                print(f"[WARNING] PDF text extraction failed: {e}")
        elif filename_lower.endswith((".xlsx", ".xls")) or "excel" in mime or "spreadsheet" in mime:
            try:
                import pandas as pd
                import io
                sheet_dict = pd.read_excel(io.BytesIO(file_bytes), sheet_name=None)
                sheet_csvs = []
                for s_name, df in sheet_dict.items():
                    if not df.empty:
                        sheet_csvs.append(f"--- Sheet: {s_name} ---\n" + df.to_csv(index=False))
                text_content = "\n\n".join(sheet_csvs)
            except Exception as xl_err:
                print(f"[WARNING] Excel read_excel parsing failed: {xl_err}")
                try:
                    import pandas as pd
                    import io
                    dfs = pd.read_html(io.BytesIO(file_bytes))
                    sheet_csvs = [df.to_csv(index=False) for df in dfs if not df.empty]
                    text_content = "\n\n".join(sheet_csvs)
                except Exception as html_err:
                    print(f"[WARNING] Excel read_html parsing failed: {html_err}")
                    try:
                        decoded = file_bytes.decode("utf-8", errors="ignore")
                        if "<html" in decoded.lower() or "<table" in decoded.lower() or "," in decoded or "\t" in decoded:
                            text_content = decoded
                    except Exception:
                        pass
        else:
            try:
                text_content = file_bytes.decode("utf-8", errors="ignore")
            except Exception:
                pass

        def parse_accounts_json(raw_str: str) -> list:
            clean = raw_str.strip()
            if clean.startswith("```json"):
                clean = clean[7:]
            if clean.startswith("```"):
                clean = clean[3:]
            if clean.endswith("```"):
                clean = clean[:-3]
            clean = clean.strip()
            parsed = json.loads(clean)
            accounts_list = []
            if isinstance(parsed, list):
                accounts_list = parsed
            elif isinstance(parsed, dict):
                accounts_list = parsed.get("accounts", [])
            
            for acc in accounts_list:
                if isinstance(acc, dict):
                    if not acc.get("source_account"):
                        acc["source_account"] = acc.get("ledger") or acc.get("label") or "Extracted Account"
            return accounts_list
        
        # 1. Try Groq Pool first if text_content is available
        if text_content and len(text_content.strip()) > 30:
            from services.groq_pool import GroqPool
            try:
                user_msg = f"Document Filename: {filename}\nContent:\n{text_content[:80000]}"
                completion = GroqPool.execute(
                    lambda client: client.chat.completions.create(
                        model="llama-3.3-70b-versatile",
                        messages=[
                            {"role": "system", "content": prompt},
                            {"role": "user", "content": user_msg}
                        ],
                        response_format={"type": "json_object"}
                    )
                )
                accounts = parse_accounts_json(completion.choices[0].message.content)
                if accounts:
                    return accounts
            except Exception as e:
                print(f"[WARNING] Groq COA import failed, falling back to Gemini: {e}")

        # 2. Fallback to Gemini
        if not self.gemini_model:
            raise ValueError("GEMINI_API_KEY not configured")
        
        try:
            if text_content and len(text_content.strip()) > 30:
                user_msg = f"Document Filename: {filename}\nContent:\n{text_content[:80000]}"
                response = self.gemini_model.generate_content(
                    [prompt, user_msg],
                    generation_config={
                        "response_mime_type": "application/json",
                        "response_schema": schema
                    }
                )
            else:
                supported_vision_mimes = ("application/pdf", "image/jpeg", "image/png", "image/webp", "image/heic")
                target_mime = mime_type if mime_type in supported_vision_mimes else "application/pdf"
                if not (mime.startswith("image/") or mime == "application/pdf" or filename_lower.endswith((".pdf", ".png", ".jpg", ".jpeg"))):
                    raise ValueError(f"Unable to extract text content from {filename or 'uploaded document'}. Please upload a valid Excel (.xlsx), CSV, or PDF file.")

                response = self.gemini_model.generate_content(
                    [prompt, {"mime_type": target_mime, "data": file_bytes}],
                    generation_config={
                        "response_mime_type": "application/json",
                        "response_schema": schema
                    }
                )
            
            return parse_accounts_json(response.text)
        except Exception as e:
            print(f"[ERROR] Company Master Import scan failed: {str(e)}")
            raise ValueError(f"Failed to process document: {str(e)}")


ai_service = AIService()

