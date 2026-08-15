// generatorStore.js - Persistent local state helper for Generator Documents

const STORAGE_KEYS = {
  INVOICES: 'dabby_generator_invoices',
  POS: 'dabby_generator_pos',
  CREDIT_NOTES: 'dabby_generator_credit_notes',
  DISCOUNT_TAGS: 'dabby_generator_discount_tags',
};

// Initial default discount tags
const DEFAULT_DISCOUNT_TAGS = [
  { id: 'tag_1', code: 'WELCOME10', type: 'percentage', value: 10, minOrder: 1000, validUntil: '2026-12-31', active: true, desc: '10% Welcome Discount' },
  { id: 'tag_2', code: 'FESTIVE500', type: 'flat', value: 500, minOrder: 5000, validUntil: '2026-12-31', active: true, desc: 'Flat ₹500 off on orders over ₹5,000' },
  { id: 'tag_3', code: 'BULK15', type: 'percentage', value: 15, minOrder: 25000, validUntil: '2026-12-31', active: true, desc: '15% Off for Bulk Procurement' },
  { id: 'tag_4', code: 'REF-PATEL', type: 'flat', value: 1000, minOrder: 10000, validUntil: '2026-12-31', active: true, desc: '₹1,000 Referral credit from Patel Enterprise' },
];

// Initial mock invoices array (empty by default so only real issued/uploaded invoices appear)
const DEFAULT_INVOICES = [];

export const getStoredInvoices = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.INVOICES);
    return data ? JSON.parse(data) : DEFAULT_INVOICES;
  } catch (e) {
    return DEFAULT_INVOICES;
  }
};

export const saveInvoice = (invoice) => {
  try {
    const invoices = getStoredInvoices();
    const updated = [invoice, ...invoices.filter(i => i.id !== invoice.id)];
    localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error('Failed to save invoice', e);
  }
};

export const getStoredPOs = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.POS);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
};

export const savePO = (po) => {
  try {
    const pos = getStoredPOs();
    const updated = [po, ...pos.filter(p => p.id !== po.id)];
    localStorage.setItem(STORAGE_KEYS.POS, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error('Failed to save PO', e);
  }
};

export const getStoredCreditNotes = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.CREDIT_NOTES);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
};

export const saveCreditNote = (creditNote) => {
  try {
    const cns = getStoredCreditNotes();
    const updated = [creditNote, ...cns.filter(c => c.id !== creditNote.id)];
    localStorage.setItem(STORAGE_KEYS.CREDIT_NOTES, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error('Failed to save Credit Note', e);
  }
};

export const getStoredDiscountTags = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.DISCOUNT_TAGS);
    return data ? JSON.parse(data) : DEFAULT_DISCOUNT_TAGS;
  } catch (e) {
    return DEFAULT_DISCOUNT_TAGS;
  }
};

export const saveDiscountTag = (tag) => {
  try {
    const tags = getStoredDiscountTags();
    const updated = [tag, ...tags.filter(t => t.id !== tag.id)];
    localStorage.setItem(STORAGE_KEYS.DISCOUNT_TAGS, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error('Failed to save discount tag', e);
  }
};
