"""
Journal Generator

Responsibility:
  Convert an Accounting Event into Journal Transactions based on double-entry rules,
  using the workbench's active Chart of Accounts (labels) and Party list.
"""

import os
import json
from typing import Dict, List
from groq import Groq
import google.generativeai as genai

JOURNAL_SYSTEM_PROMPT = """
You are Dabby's Journal Generator.

Your responsibility is to convert the Accounting Event into balanced Journal Transactions.

Rules:
1. Every transaction must follow double-entry accounting.
2. Every journal must balance: Total Debit = Total Credit.
3. Every journal must reference:
   - document_id
   - accounting_event_id
   - source_type
   - source_reference
4. Each entry in the entries array must contain:
   - label: The database label ID (from Chart of Accounts / Labels list).
   - party: The database party ID (from Parties list, if applicable, otherwise null).
   - entry_type: "Debit" or "Credit" (exact capitalization).
   - amount: A positive number (always positive, do not use signed numbers here).
5. The sum of all Debit entries (and the sum of all Credit entries) must exactly equal the transaction's total amount, which is found in "accounting_event.financials.total_amount". Do not invent or guess these values; you must distribute this exact total amount across the entries (e.g. splitting into subtotal and tax entries if appropriate, but keeping total debits and credits equal to the total_amount).

--------------------------------------------------
ACCOUNT MAPPING GUIDELINES
--------------------------------------------------
Based on the "accounting_event.event_type", map the Debit/Credit entries to the best matching Label IDs (which are the UUIDs under the "id" field in the chart_of_accounts list). NEVER use the name strings for the "label" field.

1. generate_revenue:
   - Debit: Accounts Receivable (Asset) or Cash & Equivalents (if paid)
   - Credit: Product Sales / Service Revenue / SaaS Revenue / Consulting Income (Revenue)
   - Credit: Tax Liability / Accrued Expenses / Accounts Payable (if tax is applicable)

2. receive_vendor_bill:
   - Debit: Expense (e.g. Salary & Wages, Rent & Utilities, Marketing & Advertising, Office Supplies, Cloud Hosting, Software Subscriptions, Digital Ads) or Fixed Assets / Inventory
   - Credit: Accounts Payable (Liability)

3. pay_vendor:
   - Debit: Accounts Payable (Liability) or Expense
   - Credit: HDFC Bank Account / Cash & Equivalents (Asset)

4. receive_customer_payment:
   - Debit: HDFC Bank Account / Cash & Equivalents (Asset)
   - Credit: Accounts Receivable (Asset)

5. record_employee_expense:
   - Debit: Expense (e.g. Salary & Wages, Office Supplies, Rent & Utilities)
   - Credit: HDFC Bank Account / Cash & Equivalents / Accounts Payable

6. process_payroll:
   - Debit: Salary & Wages / Employee Salaries (Expense)
   - Credit: HDFC Bank Account / Cash & Equivalents (Asset)

7. raise_loan:
   - Debit: HDFC Bank Account / Cash & Equivalents (Asset)
   - Credit: Short-term Borrowings / Long-term Borrowings (Liability)

8. raise_equity:
   - Debit: HDFC Bank Account / Cash & Equivalents (Asset)
   - Credit: Common Stock / Retained Earnings / Capital Contributions (Equity)

For other/unknown events, map appropriately using double-entry logic. Always map the "label" field to the database UUID of the matching account, NEVER the account name string.

--------------------------------------------------
OUTPUT FORMAT
--------------------------------------------------
Return ONLY valid JSON in this exact structure:
{
    "journal_id": "",
    "document_id": "",
    "event_id": "",
    "source_type": "",
    "transaction_date": "",
    "description": "",
    "entries": [
        {
            "label": "",
            "party": "",
            "entry_type": "",
            "amount": 0
        }
    ]
}

Never explain.
Never use markdown.
Return valid JSON only.
"""

class JournalGenerator:
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

    async def generate_journal(
        self,
        event_json: Dict,
        coa_labels: List[Dict],
        party_list: List[Dict],
        document_id: str = "",
        event_id: str = ""
    ) -> Dict:
        """
        Converts Accounting Event into a balanced Journal Transaction mapped to DB entities.
        """
        # Clean labels to minimal representation to keep prompt small
        clean_coa = []
        for l in coa_labels:
            clean_coa.append({
                "id": l.get("id"),
                "name": l.get("name") or l.get("full_account_name"),
                "type": l.get("type"),
                "sub_account": l.get("sub_account")
            })

        # Clean parties to minimal representation
        clean_parties = []
        for p in party_list:
            clean_parties.append({
                "id": p.get("id"),
                "name": p.get("name"),
                "category": p.get("category"),
                "is_self": p.get("is_self")
            })

        payload = {
            "accounting_event": event_json,
            "chart_of_accounts": clean_coa,
            "parties": clean_parties,
            "document_id": document_id,
            "event_id": event_id
        }

        user_msg = json.dumps(payload, indent=2)

        ai_journal = None
        if self.groq_client:
            try:
                ai_journal = await self._generate_with_groq(user_msg)
            except Exception as e:
                print(f"[WARNING] Groq Journal Generator failed: {e}")

        if not ai_journal and self.gemini_model:
            try:
                ai_journal = await self._generate_with_gemini(user_msg)
            except Exception as e:
                print(f"[WARNING] Gemini Journal Generator failed: {e}")

        if ai_journal and self._is_valid_journal(ai_journal, coa_labels):
            print("[JOURNAL] Using AI generated journal entries.")
            return ai_journal
        else:
            print("[JOURNAL] AI journal invalid or unbalanced. Applying deterministic template.")
            return self._generate_deterministic(event_json, coa_labels, party_list, document_id, event_id)

    def _is_valid_journal(self, journal: Dict, coa_labels: List[Dict]) -> bool:
        if not isinstance(journal, dict):
            return False
        entries = journal.get("entries")
        if not isinstance(entries, list) or not entries:
            return False
            
        coa_ids = {str(l["id"]) for l in coa_labels}
        total_debits = 0.0
        total_credits = 0.0
        
        for e in entries:
            if not isinstance(e, dict):
                return False
            label = e.get("label")
            if not label or str(label) not in coa_ids:
                return False
            entry_type = e.get("entry_type")
            if entry_type not in ("Debit", "Credit"):
                return False
            try:
                amt = float(e.get("amount") or 0.0)
            except (ValueError, TypeError):
                return False
                
            if amt < 0:
                return False
                
            if entry_type == "Debit":
                total_debits += amt
            else:
                total_credits += amt
                
        if total_debits == 0 or abs(total_debits - total_credits) > 0.01:
            return False
            
        return True

    def _generate_deterministic(
        self,
        event_json: Dict,
        coa_labels: List[Dict],
        party_list: List[Dict],
        document_id: str,
        event_id: str
    ) -> Dict:
        event_type = event_json.get("event_type", "unknown")
        financials = event_json.get("financials") or {}
        
        total_amount = float(financials.get("total_amount") or 0.0)
        subtotal = float(financials.get("subtotal") or total_amount)
        tax_amount = float(financials.get("tax_amount") or 0.0)
        
        if total_amount == 0.0:
            total_amount = subtotal + tax_amount
        if subtotal == 0.0:
            subtotal = total_amount - tax_amount

        external_party_id = None
        for p in party_list:
            if not p.get("is_self"):
                external_party_id = p.get("id")
                break
        if not external_party_id and party_list:
            external_party_id = party_list[0].get("id")

        def find_label(type_filter: str, name_keywords: list) -> str:
            for l in coa_labels:
                l_type = str(l.get("type", "")).lower()
                l_name = str(l.get("full_account_name", "")).lower()
                if l_type == type_filter.lower():
                    if any(kw in l_name for kw in name_keywords):
                        return l["id"]
            for l in coa_labels:
                l_type = str(l.get("type", "")).lower()
                if l_type == type_filter.lower():
                    return l["id"]
            if coa_labels:
                return coa_labels[0]["id"]
            return ""

        entries = []
        desc = f"Posted event: {event_type.replace('_', ' ').capitalize()}"

        if event_type == "generate_revenue":
            ar_id = find_label("asset", ["receivable", "debtor", "bank", "cash"])
            rev_id = find_label("revenue", ["sales", "revenue", "income"])
            tax_id = find_label("liability", ["tax", "payable", "accrued"])
            
            entries.append({"label": ar_id, "party": external_party_id, "entry_type": "Debit", "amount": total_amount})
            entries.append({"label": rev_id, "party": None, "entry_type": "Credit", "amount": subtotal})
            if tax_amount > 0:
                entries.append({"label": tax_id, "party": None, "entry_type": "Credit", "amount": tax_amount})
                
        elif event_type == "receive_vendor_bill":
            exp_id = find_label("expense", ["hosting", "subscription", "rent", "utilities", "marketing", "supplies", "salary"])
            ap_id = find_label("liability", ["payable", "creditor"])
            tax_id = find_label("asset", ["tax", "prepaid", "input", "receivable"])
            if not tax_id:
                tax_id = find_label("liability", ["tax", "payable", "accrued"])
                
            entries.append({"label": exp_id, "party": None, "entry_type": "Debit", "amount": subtotal})
            if tax_amount > 0:
                entries.append({"label": tax_id, "party": None, "entry_type": "Debit", "amount": tax_amount})
            entries.append({"label": ap_id, "party": external_party_id, "entry_type": "Credit", "amount": total_amount})

        elif event_type == "pay_vendor":
            ap_id = find_label("liability", ["payable", "creditor"])
            bank_id = find_label("asset", ["bank", "cash", "equivalent"])
            
            entries.append({"label": ap_id, "party": external_party_id, "entry_type": "Debit", "amount": total_amount})
            entries.append({"label": bank_id, "party": None, "entry_type": "Credit", "amount": total_amount})

        elif event_type == "receive_customer_payment":
            bank_id = find_label("asset", ["bank", "cash", "equivalent"])
            ar_id = find_label("asset", ["receivable", "debtor"])
            
            entries.append({"label": bank_id, "party": None, "entry_type": "Debit", "amount": total_amount})
            entries.append({"label": ar_id, "party": external_party_id, "entry_type": "Credit", "amount": total_amount})

        elif event_type == "process_payroll":
            wage_id = find_label("expense", ["salary", "wage", "payroll"])
            bank_id = find_label("asset", ["bank", "cash", "equivalent"])
            
            entries.append({"label": wage_id, "party": external_party_id, "entry_type": "Debit", "amount": total_amount})
            entries.append({"label": bank_id, "party": None, "entry_type": "Credit", "amount": total_amount})

        elif event_type == "raise_loan":
            bank_id = find_label("asset", ["bank", "cash", "equivalent"])
            loan_id = find_label("liability", ["borrowing", "loan"])
            
            entries.append({"label": bank_id, "party": None, "entry_type": "Debit", "amount": total_amount})
            entries.append({"label": loan_id, "party": external_party_id, "entry_type": "Credit", "amount": total_amount})

        elif event_type == "raise_equity":
            bank_id = find_label("asset", ["bank", "cash", "equivalent"])
            eq_id = find_label("equity", ["stock", "capital", "contribution", "retained"])
            
            entries.append({"label": bank_id, "party": None, "entry_type": "Debit", "amount": total_amount})
            entries.append({"label": eq_id, "party": external_party_id, "entry_type": "Credit", "amount": total_amount})

        else:
            bank_id = find_label("asset", ["bank", "cash", "equivalent"])
            ar_id = find_label("asset", ["receivable", "debtor"])
            
            entries.append({"label": bank_id, "party": None, "entry_type": "Debit", "amount": total_amount})
            entries.append({"label": ar_id, "party": None, "entry_type": "Credit", "amount": total_amount})

        debits = sum(e["amount"] for e in entries if e["entry_type"] == "Debit")
        credits = sum(e["amount"] for e in entries if e["entry_type"] == "Credit")
        diff = debits - credits
        if abs(diff) > 0.001 and len(entries) >= 2:
            last = entries[-1]
            if last["entry_type"] == "Credit":
                last["amount"] += diff
            else:
                last["amount"] -= diff

        return {
            "journal_id": "",
            "document_id": document_id,
            "event_id": event_id,
            "source_type": "accounting_event",
            "transaction_date": str(financials.get("date") or event_json.get("references", {}).get("invoice_date") or ""),
            "description": desc,
            "entries": entries
        }

    async def _generate_with_groq(self, user_msg: str) -> Dict:
        print("[JOURNAL] Running journal generation via Groq (Llama 3.1 8B)")
        completion = self.groq_client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": JOURNAL_SYSTEM_PROMPT},
                {"role": "user", "content": user_msg}
            ],
            response_format={"type": "json_object"},
            temperature=0.1,
            max_tokens=2048
        )
        return json.loads(completion.choices[0].message.content)

    async def _generate_with_gemini(self, user_msg: str) -> Dict:
        print("[JOURNAL] Running journal generation via Gemini")
        response = self.gemini_model.generate_content([
            JOURNAL_SYSTEM_PROMPT,
            user_msg
        ])
        if not response.candidates or not response.candidates[0].content.parts:
            raise ValueError("Gemini failed to generate journal response")

        text = response.text.strip()
        if text.startswith("```json"):
            text = text[7:]
        elif text.startswith("```"):
            text = text[3:]
        if text.endswith("```"):
            text = text[:-3]
        return json.loads(text.strip())

journal_generator = JournalGenerator()
