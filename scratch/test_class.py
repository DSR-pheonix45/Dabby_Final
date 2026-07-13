import asyncio
import os
import json
from backend.services.ai_service import ai_service
from dotenv import load_dotenv

load_dotenv()

async def main():
    try:
        # Create a dummy image file (just any small bytes to see what the API throws)
        file_bytes = b"dummy pdf data"
        mime_type = "application/pdf"
        
        # Test just the classification step
        class_prompt = """
        You are a document classification specialist. Identify the type of this financial document.
        Return ONLY a JSON object with this exact schema:
        {
          "document_type": "bank_statement", // One of: sales_invoice, vendor_invoice, customer_payment_receipt, vendor_payment_receipt, bank_statement, expense_receipt, payroll_register, credit_note, debit_note, purchase_order, sales_order, loan_agreement, investment_agreement, tax_document, unknown
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
        
        res = ai_service.gemini_model.generate_content(
            [class_prompt, {"mime_type": mime_type, "data": file_bytes}],
            generation_config={
                "response_mime_type": "application/json",
                "response_schema": class_schema
            }
        )
        print("Response:", res.text)
    except Exception as e:
        print("Error:", e)

if __name__ == "__main__":
    asyncio.run(main())
