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
            # Use 1.5-flash for higher rate limits on free tier
            self.gemini_model = genai.GenerativeModel('gemini-1.5-flash')
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
        You are an expert financial auditor. Extract the following details from the provided invoice content:
        1. Client/Recipient Name
        2. Vendor/Sender Name
        3. Invoice Number
        4. Date Issued (YYYY-MM-DD)
        5. Due Date (YYYY-MM-DD)
        6. Total Amount (Number)
        7. Currency (e.g. INR, USD)
        8. Items (List of objects: description, quantity, price, hsn_code)
        
        Return the result ONLY as a JSON object. If a field is missing, use null.
        """
        
        user_msg = f"Document Filename: {filename}\nContent:\n{file_content[:15000]}"
        
        try:
            completion = self.groq_client.chat.completions.create(
                model="llama-3.1-8b-instant",
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
        if not self.gemini_model:
            raise ValueError("GEMINI_API_KEY not configured")

        prompt = """
        Analyze this financial document (invoice, bill, or receipt) and extract:
        1. Vendor/Sender Name
        2. Client/Recipient Name
        3. Invoice/Bill Number
        4. Date Issued (YYYY-MM-DD)
        5. Due Date (YYYY-MM-DD)
        6. Total Amount (Numeric only)
        7. Currency (e.g. INR)
        8. Items (List of objects with: description, quantity, price, hsn_code)

        Return ONLY a JSON object. If a value is unknown, use null.
        """

        try:
            response = self.gemini_model.generate_content([
                prompt,
                {"mime_type": mime_type, "data": file_bytes}
            ])
            
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
