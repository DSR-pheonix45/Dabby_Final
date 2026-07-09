import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Try local first, then root
dotenv.config({ path: path.join(__dirname, '.env.local') });
if (!process.env.VITE_SUPABASE_URL) {
  dotenv.config({ path: path.join(__dirname, '.env') });
}

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
    console.error("Missing Supabase credentials in .env");
    process.exit(1);
}

const supabase = createClient(url, key);

async function seed() {
    const workbenchId = process.argv[2] || "0fe2ed1f-2eed-4868-b464-a8bf23aa2e68";
    console.log("Seeding Workbench:", workbenchId);

    // 1. Parties
    const parties = [
        { workbench_id: workbenchId, name: "AWS Cloud Services", party_type: "vendor", email: "billing@aws.com" },
        { workbench_id: workbenchId, name: "Acme Corp", party_type: "customer", email: "ap@acme.com" },
        { workbench_id: workbenchId, name: "WeWork", party_type: "vendor", email: "invoices@wework.com" },
        { workbench_id: workbenchId, name: "Global Tech", party_type: "customer", email: "finance@globaltech.com" },
        { workbench_id: workbenchId, name: "Legal Counsel LLC", party_type: "vendor", email: "billing@legalcounsel.com" }
    ];
    
    console.log("Inserting Parties...");
    const { error: pErr } = await supabase.from('parties').insert(parties);
    if (pErr) console.error("Party error:", pErr.message);
    else console.log("Parties inserted.");

    // 2. Ledger Accounts
    const accounts = [
        { workbench_id: workbenchId, code: "1000", name: "Cash", category_code: "AST", normal_balance: "debit", is_postable: true, is_system: true },
        { workbench_id: workbenchId, code: "2000", name: "Accounts Payable", category_code: "LIA", normal_balance: "credit", is_postable: true, is_system: true },
        { workbench_id: workbenchId, code: "1200", name: "Accounts Receivable", category_code: "AST", normal_balance: "debit", is_postable: true, is_system: true },
        { workbench_id: workbenchId, code: "4000", name: "Software Revenue", category_code: "REV", normal_balance: "credit", is_postable: true, is_system: false },
        { workbench_id: workbenchId, code: "5990", name: "SaaS Subscription", category_code: "EXP", normal_balance: "debit", is_postable: true, is_system: false },
        { workbench_id: workbenchId, code: "5000", name: "Rent Expense", category_code: "EXP", normal_balance: "debit", is_postable: true, is_system: false }
    ];

    console.log("Inserting Accounts...");
    const { error: aErr } = await supabase.from('di_accounts').insert(accounts);
    if (aErr) console.error("Account error:", aErr.message);
    else console.log("Accounts inserted.");

    // 3. Documents
    const crypto = await import('crypto');
    const docId1 = crypto.randomUUID();
    const docId2 = crypto.randomUUID();
    const docId3 = crypto.randomUUID();

    const docs = [
        { id: docId1, original_filename: "aws_june_invoice.pdf", mime_type: "application/pdf", size_bytes: 145000, workbench_id: workbenchId, storage_path: `${workbenchId}/aws_june_invoice.pdf`, file_hash: crypto.randomUUID() },
        { id: docId2, original_filename: "wework_lease_july.pdf", mime_type: "application/pdf", size_bytes: 210000, workbench_id: workbenchId, storage_path: `${workbenchId}/wework_lease_july.pdf`, file_hash: crypto.randomUUID() },
        { id: docId3, original_filename: "legal_retainer.pdf", mime_type: "application/pdf", size_bytes: 85000, workbench_id: workbenchId, storage_path: `${workbenchId}/legal_retainer.pdf`, file_hash: crypto.randomUUID() },
    ];

    console.log("Inserting Documents...");
    const { error: dErr } = await supabase.from('di_documents').insert(docs);
    if (dErr) console.error("Docs error:", dErr.message);
    else console.log("Documents inserted.");

    // 4. Analysis Notes
    const analysisNotes = [
        {
            document_id: docId1,
            classification_type: "expense",
            confidence: 0.98,
            reasoning: "Mock JSON analysis for pitch demo.",
            extracted_data: {
                predicted_label: "Operating Expense",
                reasoning: "Extracted from aws_june_invoice.pdf processing.",
                document_metadata: { document_type: "Invoice", date: new Date().toISOString() },
                financials: { total_amount: 1000.00, currency: "USD" },
                proposed_journal_entries: [
                    { account: "5990 SaaS Subscription", type: "debit", amount: 1000.00 },
                    { account: "2000 Accounts Payable", type: "credit", amount: 1000.00 }
                ]
            }
        },
        {
            document_id: docId2,
            classification_type: "expense",
            confidence: 0.99,
            reasoning: "Mock JSON analysis for pitch demo.",
            extracted_data: {
                predicted_label: "Rent",
                reasoning: "Extracted from wework_lease_july.pdf processing.",
                document_metadata: { document_type: "Lease", date: new Date().toISOString() },
                financials: { total_amount: 12000.00, currency: "USD" },
                proposed_journal_entries: [
                    { account: "5000 Rent Expense", type: "debit", amount: 12000.00 },
                    { account: "2000 Accounts Payable", type: "credit", amount: 12000.00 }
                ]
            }
        },
        {
            document_id: docId3,
            classification_type: "expense",
            confidence: 0.85,
            reasoning: "Mock JSON analysis for pitch demo.",
            extracted_data: {
                predicted_label: "Legal",
                reasoning: "Extracted from legal_retainer.pdf processing.",
                document_metadata: { document_type: "Contract", date: new Date().toISOString() },
                financials: { total_amount: 5500.00, currency: "USD" },
                proposed_journal_entries: [
                    { account: "Legal Expense", type: "debit", amount: 5500.00 },
                    { account: "2000 Accounts Payable", type: "credit", amount: 5500.00 }
                ]
            }
        }
    ];

    console.log("Inserting Analysis Notes...");
    const { error: anErr } = await supabase.from('di_analysis_notes').insert(analysisNotes);
    if (anErr) console.error("Analysis Notes error:", anErr.message);
    else console.log("Analysis Notes inserted.");

    console.log("Demo seed complete!");
}

seed();
