/**
 * Deterministic document -> ledger routing (mirrors backend draft_producer.DOC_TYPE_MAP
 * + ledger_compiler). Given a document_type (or an already-resolved event_type),
 * returns where the document lands in OPS / the ledger so the UI can show the user
 * "this becomes a Receivable / Payable / settles AP" before and after posting.
 */

const norm = (s) => (s || '').toString().trim().toLowerCase().replace(/[\s-]+/g, '_');

// document_type -> event_type (mirror of backend DOC_TYPE_MAP)
const DOC_TYPE_TO_EVENT = {
  sales_invoice: 'CUSTOMER_BILLED',
  tax_invoice: 'CUSTOMER_BILLED',
  invoice: 'CUSTOMER_BILLED',
  vendor_invoice: 'VENDOR_BILLED',
  purchase_invoice: 'VENDOR_BILLED',
  bill: 'VENDOR_BILLED',
  customer_payment: 'CUSTOMER_PAYMENT_RECEIVED',
  customer_payment_receipt: 'CUSTOMER_PAYMENT_RECEIVED',
  receipt: 'CUSTOMER_PAYMENT_RECEIVED',
  vendor_payment: 'VENDOR_PAYMENT_MADE',
  vendor_payment_receipt: 'VENDOR_PAYMENT_MADE',
  payment_advice: 'VENDOR_PAYMENT_MADE',
  bank_statement: 'BANK_ACTIVITY_RECORDED',
  payroll_register: 'PAYROLL_INCURRED',
  payroll: 'PAYROLL_INCURRED',
  credit_note: 'CREDIT_NOTE_ISSUED',
  debit_note: 'DEBIT_NOTE_ISSUED',
  purchase_order: 'PURCHASE_ORDER_CREATED',
  sales_order: 'SALES_ORDER_CREATED',
  expense_receipt: 'EXPENSE_INCURRED',
  loan_agreement: 'LOAN_RECEIVED',
  investment_agreement: 'INVESTMENT_RECEIVED',
  tax_document: 'TAX_PAID',
  gst_challan: 'TAX_PAID',
};

// event_type -> where it shows up + how to describe it
const EVENT_ROUTING = {
  CUSTOMER_BILLED:            { key: 'receivable',        label: 'Receivable',        where: 'Accounts Receivable', hint: 'Customer owes you',      tone: 'teal' },
  CUSTOMER_PAYMENT_RECEIVED:  { key: 'settles_receivable', label: 'Receipt Draft',     where: 'Drafts (Pending Link)', hint: 'In draft. Link to an invoice to settle AR.', tone: 'green' },
  VENDOR_BILLED:             { key: 'payable',           label: 'Payable',           where: 'Accounts Payable',    hint: 'You owe the vendor',     tone: 'amber' },
  VENDOR_PAYMENT_MADE:       { key: 'settles_payable',   label: 'Receipt Draft',     where: 'Drafts (Pending Link)', hint: 'In draft. Link to an invoice to settle AP.', tone: 'blue' },
  CREDIT_NOTE_ISSUED:        { key: 'receivable',        label: 'Credit Note',       where: 'Accounts Receivable', hint: 'Reduces a receivable',   tone: 'green' },
  DEBIT_NOTE_ISSUED:         { key: 'payable',           label: 'Debit Note',        where: 'Accounts Payable',    hint: 'Reduces a payable',      tone: 'blue' },
  EXPENSE_INCURRED:          { key: 'expense',           label: 'Expense Draft',     where: 'Drafts (Pending Link)', hint: 'In draft. Link to an invoice or expense.', tone: 'rose' },
  PAYROLL_INCURRED:          { key: 'payroll',           label: 'Payroll',           where: 'Profit & Loss',       hint: 'Salary expense',         tone: 'purple' },
  BANK_ACTIVITY_RECORDED:    { key: 'bank',              label: 'Bank Activity',     where: 'Bank / Ledger',       hint: 'Bank movement',          tone: 'slate' },
  TAX_PAID:                  { key: 'tax',               label: 'Tax',               where: 'Tax Ledger',          hint: 'Tax payment',            tone: 'slate' },
  TAX_LIABILITY_CREATED:     { key: 'tax',               label: 'Tax Liability',     where: 'Tax Ledger',          hint: 'Tax owed',               tone: 'slate' },
  LOAN_RECEIVED:             { key: 'other',             label: 'Loan',              where: 'Balance Sheet',       hint: 'Liability',              tone: 'slate' },
  INVESTMENT_RECEIVED:       { key: 'other',             label: 'Investment',        where: 'Balance Sheet',       hint: 'Equity',                 tone: 'slate' },
};


const UNCLASSIFIED = { key: 'other', label: 'Unclassified', where: 'Not routed yet', hint: 'Needs review to classify', tone: 'slate' };

export function inferEventType(documentType) {
  const key = norm(documentType);
  if (DOC_TYPE_TO_EVENT[key]) return DOC_TYPE_TO_EVENT[key];
  // fuzzy contains match, same as backend fallback
  for (const [k, ev] of Object.entries(DOC_TYPE_TO_EVENT)) {
    if (key && (key.includes(k) || k.includes(key))) return ev;
  }
  return 'UNCLASSIFIED';
}

/**
 * @param {string} documentType e.g. "sales_invoice"
 * @param {string} [eventType]  optional pre-resolved event type
 * @param {string} [partyName]  optional issuer/party name for letterhead check
 * @returns routing meta: { key, label, where, hint, tone, eventType }
 */
export function financialRouting(documentType, eventType, partyName) {
  let ev = eventType;
  if (!ev) {
    const dtKey = norm(documentType);
    const p = (partyName || '').toLowerCase().trim();
    if (dtKey.includes('invoice') || dtKey.includes('bill')) {
      if (p && !p.includes('archzona')) {
        ev = 'VENDOR_BILLED';
      } else if (p && p.includes('archzona')) {
        ev = 'CUSTOMER_BILLED';
      } else {
        ev = inferEventType(documentType);
      }
    } else {
      ev = inferEventType(documentType);
    }
  }
  const meta = EVENT_ROUTING[ev] || UNCLASSIFIED;
  return { ...meta, eventType: ev };
}


// Tailwind class sets per tone (kept here so cards/inspector stay consistent)
export const ROUTING_TONE = {
  teal:   'bg-teal-500/10 text-teal-400 border-teal-500/20',
  green:  'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  amber:  'bg-amber-500/10 text-amber-400 border-amber-500/20',
  blue:   'bg-blue-500/10 text-blue-400 border-blue-500/20',
  rose:   'bg-rose-500/10 text-rose-400 border-rose-500/20',
  purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  slate:  'bg-white/5 text-gray-400 border-white/10',
};
