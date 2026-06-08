/**
 * Tally / Zoho Books import & normalization.
 *
 * Turns the exports those products produce into Datalis canonical rows so a
 * switching business can bring its existing books across in a few clicks.
 *
 * Canonical row shape (keys align with ColumnMapper / dataIngestionService):
 *   {
 *     transaction_date: 'YYYY-MM-DD',
 *     description:      string,
 *     counterparty:    string,   // party / contact name
 *     account:         string,   // ledger / account name
 *     debit:           number,   // outflow (>=0)
 *     credit:          number,   // inflow  (>=0)
 *     amount:          number,   // signed: credit - debit
 *     reference:       string,   // voucher / invoice number
 *     voucher_type:    string,   // Sales / Purchase / Payment / Journal ...
 *     source_format:   string
 *   }
 *
 * Pure functions only (DOMParser is a browser global) — unit-testable.
 */

export const SOURCE_FORMATS = {
  TALLY_XML: 'tally_xml',
  TALLY_DAYBOOK: 'tally_daybook',
  ZOHO_JOURNAL: 'zoho_journal',
  ZOHO_INVOICE: 'zoho_invoice',
  ZOHO_CONTACTS: 'zoho_contacts',
  ZOHO_COA: 'zoho_coa',
  GENERIC: 'generic',
};

const num = (v) => {
  if (v === null || v === undefined || v === '') return 0;
  const n = parseFloat(String(v).replace(/[₹,$\s]/g, '').replace(/,/g, ''));
  return isFinite(n) ? n : 0;
};

const lc = (s) => String(s || '').trim().toLowerCase();

/** Normalize many date shapes (incl. Tally YYYYMMDD) to YYYY-MM-DD. */
export function normalizeDate(value) {
  if (!value) return '';
  const s = String(value).trim();
  // Tally compact: 20240401
  if (/^\d{8}$/.test(s)) return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
  // ISO already
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  // DD/MM/YYYY or DD-MM-YYYY (Indian default)
  const m = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/);
  if (m) {
    let [, d, mo, y] = m;
    if (y.length === 2) y = `20${y}`;
    return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  const parsed = new Date(s);
  return isNaN(parsed) ? s : parsed.toISOString().slice(0, 10);
}

const hasAll = (headerSet, names) => names.every((n) => headerSet.has(lc(n)));
const hasAny = (headerSet, names) => names.some((n) => headerSet.has(lc(n)));

/** Detect the source format from headers (CSV) and/or raw text (XML) + filename. */
export function detectFormat({ headers = [], text = '', fileName = '' } = {}) {
  const name = lc(fileName);
  if (/<ENVELOPE|<TALLYMESSAGE|<VOUCHER/i.test(text)) return SOURCE_FORMATS.TALLY_XML;

  const H = new Set(headers.map(lc));

  // Zoho Books exports have very specific column names
  if (hasAll(H, ['journal date', 'account']) && hasAny(H, ['debit', 'credit'])) return SOURCE_FORMATS.ZOHO_JOURNAL;
  if (hasAny(H, ['invoice date', 'invoice number']) && hasAny(H, ['customer name', 'total'])) return SOURCE_FORMATS.ZOHO_INVOICE;
  if (hasAny(H, ['gst identification number (gstin)', 'gst treatment']) || (hasAny(H, ['contact name']) && hasAny(H, ['company name', 'billing state']))) return SOURCE_FORMATS.ZOHO_CONTACTS;
  if (hasAll(H, ['account name', 'account type'])) return SOURCE_FORMATS.ZOHO_COA;

  // Tally tabular exports (Daybook / Ledger to Excel/CSV)
  if (hasAny(H, ['vch type', 'voucher type', 'vch no.', 'vch no']) || (hasAny(H, ['particulars']) && hasAny(H, ['debit', 'credit']))) {
    return SOURCE_FORMATS.TALLY_DAYBOOK;
  }
  if (name.includes('tally')) return SOURCE_FORMATS.TALLY_DAYBOOK;
  if (name.includes('zoho')) return SOURCE_FORMATS.ZOHO_JOURNAL;
  return SOURCE_FORMATS.GENERIC;
}

/** Case-insensitive header accessor for a row object. */
function pick(row, ...keys) {
  const map = {};
  for (const k of Object.keys(row)) map[lc(k)] = row[k];
  for (const k of keys) {
    const v = map[lc(k)];
    if (v !== undefined && v !== null && v !== '') return v;
  }
  return '';
}

function mapTallyDaybook(rows) {
  return rows.map((r) => {
    const debit = num(pick(r, 'debit', 'dr', 'withdrawal'));
    const credit = num(pick(r, 'credit', 'cr', 'deposit'));
    return {
      transaction_date: normalizeDate(pick(r, 'date', 'transaction date')),
      description: pick(r, 'narration', 'particulars', 'description') || '',
      counterparty: pick(r, 'party', 'particulars', 'party ledger') || '',
      account: pick(r, 'ledger', 'particulars', 'account') || '',
      debit,
      credit,
      amount: credit - debit,
      reference: pick(r, 'vch no.', 'vch no', 'voucher no', 'reference') || '',
      voucher_type: pick(r, 'vch type', 'voucher type') || '',
      source_format: SOURCE_FORMATS.TALLY_DAYBOOK,
    };
  });
}

function mapZohoJournal(rows) {
  return rows.map((r) => {
    const debit = num(pick(r, 'debit'));
    const credit = num(pick(r, 'credit'));
    return {
      transaction_date: normalizeDate(pick(r, 'journal date', 'date')),
      description: pick(r, 'description', 'notes') || '',
      counterparty: pick(r, 'contact name', 'customer name', 'vendor name') || '',
      account: pick(r, 'account') || '',
      debit,
      credit,
      amount: credit - debit,
      reference: pick(r, 'journal number', 'reference number') || '',
      voucher_type: 'Journal',
      source_format: SOURCE_FORMATS.ZOHO_JOURNAL,
    };
  });
}

function mapZohoInvoice(rows) {
  return rows.map((r) => {
    const total = num(pick(r, 'total', 'invoice total', 'amount'));
    return {
      transaction_date: normalizeDate(pick(r, 'invoice date', 'date')),
      description: pick(r, 'item name', 'item desc', 'subject') || 'Invoice',
      counterparty: pick(r, 'customer name', 'contact name') || '',
      account: 'Accounts Receivable',
      debit: total, // AR debit
      credit: 0,
      amount: -total,
      reference: pick(r, 'invoice number', 'invoice id') || '',
      voucher_type: 'Sales',
      source_format: SOURCE_FORMATS.ZOHO_INVOICE,
    };
  });
}

/** Zoho Contacts -> party records (separate canonical shape). */
export function mapZohoContacts(rows) {
  return rows.map((r) => ({
    name: pick(r, 'contact name', 'display name', 'company name') || '',
    company: pick(r, 'company name') || '',
    gstin: pick(r, 'gst identification number (gstin)', 'gstin') || '',
    state_code: '',
    state: pick(r, 'billing state', 'place of contact(with state code)') || '',
    email: pick(r, 'email', 'email id') || '',
    phone: pick(r, 'phone', 'mobilephone', 'mobile') || '',
    party_type: lc(pick(r, 'contact type')) === 'vendor' ? 'vendor' : 'customer',
    source_format: SOURCE_FORMATS.ZOHO_CONTACTS,
  }));
}

/** Zoho Chart of Accounts -> label seed records. */
export function mapZohoCOA(rows) {
  const TYPE_MAP = {
    asset: 'asset', 'other asset': 'asset', 'fixed asset': 'asset', cash: 'asset', bank: 'asset', stock: 'asset',
    'accounts receivable': 'asset',
    liability: 'liability', 'other liability': 'liability', 'long term liability': 'liability',
    'accounts payable': 'liability', 'credit card': 'liability',
    equity: 'equity',
    income: 'revenue', 'other income': 'revenue',
    expense: 'expense', 'other expense': 'expense', 'cost of goods sold': 'expense',
  };
  return rows.map((r) => {
    const rawType = lc(pick(r, 'account type'));
    return {
      name: pick(r, 'account name') || '',
      type: TYPE_MAP[rawType] || 'expense',
      sub_account: pick(r, 'account type') || 'General',
      code: pick(r, 'account code') || '',
      source_format: SOURCE_FORMATS.ZOHO_COA,
    };
  });
}

/** Parse a Tally XML export (Daybook/voucher register) into canonical rows. */
export function parseTallyXML(xmlString) {
  if (typeof DOMParser === 'undefined') return [];
  const doc = new DOMParser().parseFromString(xmlString, 'text/xml');
  const vouchers = Array.from(doc.getElementsByTagName('VOUCHER'));
  const text = (el, tag) => {
    const n = el.getElementsByTagName(tag)[0];
    return n ? n.textContent.trim() : '';
  };
  const rows = [];
  for (const v of vouchers) {
    const date = normalizeDate(text(v, 'DATE'));
    const vchType = v.getAttribute('VCHTYPE') || text(v, 'VOUCHERTYPENAME');
    const party = text(v, 'PARTYLEDGERNAME');
    const narration = text(v, 'NARRATION');
    const ref = text(v, 'VOUCHERNUMBER');
    const entries = Array.from(v.getElementsByTagName('ALLLEDGERENTRIES.LIST'))
      .concat(Array.from(v.getElementsByTagName('LEDGERENTRIES.LIST')));
    for (const e of entries) {
      const ledger = text(e, 'LEDGERNAME');
      const amt = num(text(e, 'AMOUNT')); // Tally: negative = debit, positive = credit
      const isDeemedPositive = lc(text(e, 'ISDEEMEDPOSITIVE')) === 'yes';
      // In Tally, a deemed-positive entry is a debit (money out of that ledger view)
      const debit = amt < 0 || isDeemedPositive ? Math.abs(amt) : 0;
      const credit = amt > 0 && !isDeemedPositive ? Math.abs(amt) : 0;
      rows.push({
        transaction_date: date,
        description: narration || vchType,
        counterparty: party,
        account: ledger,
        debit,
        credit,
        amount: credit - debit,
        reference: ref,
        voucher_type: vchType,
        source_format: SOURCE_FORMATS.TALLY_XML,
      });
    }
  }
  return rows;
}

/**
 * Top-level entry: given a file's parsed rows (CSV) and/or raw text (XML),
 * detect the format and return { format, kind, rows }.
 *   kind: 'transactions' | 'parties' | 'accounts'
 */
export function normalizeImport({ rows = [], headers = [], text = '', fileName = '' } = {}) {
  const format = detectFormat({ headers, text, fileName });
  switch (format) {
    case SOURCE_FORMATS.TALLY_XML:
      return { format, kind: 'transactions', rows: parseTallyXML(text) };
    case SOURCE_FORMATS.TALLY_DAYBOOK:
      return { format, kind: 'transactions', rows: mapTallyDaybook(rows) };
    case SOURCE_FORMATS.ZOHO_JOURNAL:
      return { format, kind: 'transactions', rows: mapZohoJournal(rows) };
    case SOURCE_FORMATS.ZOHO_INVOICE:
      return { format, kind: 'transactions', rows: mapZohoInvoice(rows) };
    case SOURCE_FORMATS.ZOHO_CONTACTS:
      return { format, kind: 'parties', rows: mapZohoContacts(rows) };
    case SOURCE_FORMATS.ZOHO_COA:
      return { format, kind: 'accounts', rows: mapZohoCOA(rows) };
    default:
      return { format: SOURCE_FORMATS.GENERIC, kind: 'transactions', rows };
  }
}

export const FORMAT_LABELS = {
  [SOURCE_FORMATS.TALLY_XML]: 'Tally (XML export)',
  [SOURCE_FORMATS.TALLY_DAYBOOK]: 'Tally Daybook (Excel/CSV)',
  [SOURCE_FORMATS.ZOHO_JOURNAL]: 'Zoho Books — Journal',
  [SOURCE_FORMATS.ZOHO_INVOICE]: 'Zoho Books — Invoices',
  [SOURCE_FORMATS.ZOHO_CONTACTS]: 'Zoho Books — Contacts',
  [SOURCE_FORMATS.ZOHO_COA]: 'Zoho Books — Chart of Accounts',
  [SOURCE_FORMATS.GENERIC]: 'Generic spreadsheet',
};
