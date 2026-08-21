// salesService.js - Complete Sales Module Data & Lifecycle Management Engine

import { diService } from './diService';
import { classifyDocumentParties } from '../utils/docPartyClassifier';

export const SALE_TYPES = [
  { id: 'pos', label: 'POS / Cash Sale', description: 'Walk-in / Immediate cash payment. Customer optional.' },
  { id: 'one_time_invoice', label: 'One-Time Invoice', description: 'Credit invoice issued to customer with payment due date.' },
  { id: 'project_milestone', label: 'Project / Milestone', description: 'Progressive milestone billing for contracts & projects.' },
  { id: 'recurring', label: 'Recurring Sale', description: 'Scheduled monthly/quarterly/annual billing.' },
  { id: 'subscription', label: 'Subscription', description: 'Subscription plans with separate billing & revenue recognition.' },
  { id: 'usage_based', label: 'Usage-Based', description: 'Metered consumption billing.' },
  { id: 'marketplace', label: 'Marketplace / 3rd Party', description: 'Gross sales with platform fee & commission settlement.' },
  { id: 'advance_preorder', label: 'Advance / Pre-order', description: 'Unearned customer advance receipt prior to fulfillment.' },
  { id: 'other', label: 'Other Business Sale', description: 'Custom sales transactions.' }
];

export const SALE_STATUSES = [
  'All',
  'Draft',
  'Recorded',
  'Invoiced',
  'Partially Paid',
  'Pending Settlement',
  'Completed',
  'Cancelled',
  'Returned'
];

// Helper to extract clean service/product line items from AI analysis notes & UFO data
export function extractDocLineItems(docObj) {
  if (!docObj) return [];
  const note = docObj.di_analysis_notes?.[0] || {};
  const data = note.extracted_data || {};

  const rawLineItems = (note.line_items && note.line_items.length > 0)
    ? note.line_items
    : (data.line_items || note.extracted_data?.line_items || data.items || note.items || []);

  const totalAmt = note.money?.total_amount !== undefined ? Number(note.money?.total_amount) : (Number(data.financials?.total_amount?.value) || 0);
  const taxAmt = note.taxes?.total_tax !== undefined ? Number(note.taxes?.total_tax) : (Number(data.financials?.total_tax?.value) || 0);
  const subtotalAmt = Math.max(0, totalAmt - taxAmt);

  if (Array.isArray(rawLineItems) && rawLineItems.length > 0) {
    const mapped = rawLineItems.map((item, idx) => {
      let rawName = item.description || item.name || item.item_name || item.product_name || item.title || item.item || '';
      if (typeof rawName === 'object' && rawName !== null) {
        rawName = rawName.value || rawName.description || rawName.name || rawName.text || '';
      }
      let nameStr = String(rawName || '').trim();

      let quantity = Number(item.quantity?.value ?? item.quantity ?? item.qty?.value ?? item.qty ?? 1);
      if (isNaN(quantity) || quantity <= 0) quantity = 1;

      let rate = Number(item.unit_price?.value ?? item.unit_price ?? item.rate?.value ?? item.rate ?? item.price?.value ?? item.price ?? 0);
      let tax = Number(item.tax?.value ?? item.tax ?? item.tax_amount?.value ?? item.tax_amount ?? 0);
      let total = Number(item.total?.value ?? item.total ?? item.amount?.value ?? item.amount ?? 0);

      if (total === 0 && rate > 0) {
        total = (quantity * rate) + tax;
      } else if (rate === 0 && total > 0) {
        rate = Math.max(0, (total - tax) / quantity);
      }

      if (!nameStr) {
        nameStr = `Service / Product Item #${idx + 1}`;
      }

      return {
        name: nameStr,
        quantity: quantity,
        rate: rate || (total > 0 ? total / quantity : subtotalAmt),
        discount: 0,
        tax: tax,
        total: total || ((quantity * (rate || subtotalAmt)) + tax)
      };
    });

    if (mapped.length > 0) return mapped;
  }

  // Fallback: Derive clean service/product description if no line items array exists
  let cleanDesc = note.summary || data.summary || data.document_metadata?.subject || data.subject || data.description || '';
  if (typeof cleanDesc === 'object' && cleanDesc !== null) {
    cleanDesc = cleanDesc.value || cleanDesc.text || '';
  }

  if (!cleanDesc || cleanDesc.length < 3) {
    const filename = (docObj.original_filename || '').replace(/\.[^/.]+$/, '');
    const sanitized = filename
      .replace(/^(INV|BILL|REC|SO|PO|DV)[_\-\s\d]+/i, '')
      .replace(/[_]/g, ' ')
      .trim();

    if (sanitized && !sanitized.toLowerCase().includes('voucher')) {
      cleanDesc = `${sanitized} (Product / Service)`;
    } else {
      const docType = (note.document_type || data.document_type || 'Commercial Invoice').replace(/_/g, ' ');
      cleanDesc = `${docType} - Product & Service Items`;
    }
  }

  return [
    {
      name: cleanDesc,
      quantity: 1,
      rate: subtotalAmt,
      discount: 0,
      tax: taxAmt,
      total: totalAmt
    }
  ];
}

const getStorageKey = (workbenchId) => `dabby_sales_${workbenchId}`;
const getArStorageKey = (workbenchId) => `dabby_ar_items_${workbenchId}`;

// Legacy demo sales IDs to purge completely
const DEMO_IDS_TO_PURGE = ['SAL-1001', 'SAL-1002', 'SAL-1003'];

export const salesService = {
  // Fetch all user-recorded sales for a workbench (WITHOUT demo items)
  getSales(workbenchId) {
    if (!workbenchId) return [];
    if (typeof window === 'undefined') return [];
    
    const key = getStorageKey(workbenchId);
    const stored = localStorage.getItem(key);
    
    if (!stored) {
      localStorage.setItem(key, JSON.stringify([]));
      return [];
    }
    
    try {
      const parsed = JSON.parse(stored) || [];
      // Clean out any legacy hardcoded demo entries & replace legacy voucher item names
      const cleaned = parsed.filter(s => !DEMO_IDS_TO_PURGE.includes(s.id)).map(sale => {
        if (sale.items && Array.isArray(sale.items)) {
          const updatedItems = sale.items.map(item => {
            if (item.name && (item.name.includes('Doc Vault Voucher') || item.name.includes('Sales Voucher'))) {
              const rawName = item.name;
              const match = rawName.match(/\(([^)]+)\)/);
              const filename = match ? match[1] : rawName;
              const sanitized = filename
                .replace(/\.[^/.]+$/, '')
                .replace(/^(INV|BILL|REC|SO|PO|DV)[_\-\s\d]+/i, '')
                .replace(/[_]/g, ' ')
                .trim();
              return {
                ...item,
                name: sanitized ? `${sanitized} (Product / Service)` : 'Commercial Product / Service Item'
              };
            }
            return item;
          });
          return { ...sale, items: updatedItems };
        }
        return sale;
      });
      if (cleaned.length !== parsed.length || JSON.stringify(cleaned) !== stored) {
        localStorage.setItem(key, JSON.stringify(cleaned));
      }
      return cleaned;
    } catch (e) {
      console.error("Error parsing sales storage:", e);
      return [];
    }
  },

  // Save sales array to localStorage
  saveSales(workbenchId, sales) {
    if (!workbenchId) return;
    const key = getStorageKey(workbenchId);
    localStorage.setItem(key, JSON.stringify(sales));
    this.syncAllToAR(workbenchId, sales);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent("sales:updated", { detail: { workbenchId } }));
      window.dispatchEvent(new CustomEvent("ledger:updated"));
    }
  },

  // Auto-pull ALL sales documents from Doc Vault and merge with recorded sales
  async getSalesWithDocVault(workbenchId, activeWorkbench) {
    const recordedSales = this.getSales(workbenchId);

    if (!workbenchId || !activeWorkbench) return recordedSales;

    try {
      const allDocs = await diService.getDocuments(workbenchId).catch(() => []);
      
      // Filter sales-related documents from Doc Vault
      const salesDocs = allDocs.filter(doc => {
        const classified = classifyDocumentParties(doc, activeWorkbench);
        const note = doc.di_analysis_notes?.[0] || {};
        const rawType = (note.document_type || note.extracted_data?.document_type || '').toLowerCase();
        
        return (
          classified.classification === 'sales_invoice' ||
          rawType.includes('sales') ||
          rawType.includes('customer') ||
          rawType.includes('credit_note')
        );
      });

      // Map Doc Vault documents into dynamic Sale transaction objects
      const docVaultSales = salesDocs.map(doc => {
        const note = doc.di_analysis_notes?.[0] || {};
        const data = note.extracted_data || {};
        const classified = classifyDocumentParties(doc, activeWorkbench);
        
        const customerName = classified.externalParty?.name || note.parties?.customer?.name || data.parties?.customer?.value || "Customer";
        const refNo = data.document?.reference_number?.value || doc.original_filename;
        const totalAmt = note.money?.total_amount !== undefined ? Number(note.money?.total_amount) : (Number(data.financials?.total_amount?.value) || 0);
        const taxAmt = note.taxes?.total_tax !== undefined ? Number(note.taxes?.total_tax) : (Number(data.financials?.total_tax?.value) || 0);
        const subtotalAmt = Math.max(0, totalAmt - taxAmt);

        const logs = doc.di_document_processing_logs || [];
        const isSettled = logs.some(l => l.stage === 'post' && l.status === 'success');

        const derivedStatus = isSettled ? 'Completed' : 'Invoiced';
        const derivedPaymentStatus = isSettled ? 'Paid' : 'Unpaid';
        const amountPaid = isSettled ? totalAmt : 0;
        const amountDue = isSettled ? 0 : totalAmt;

        const items = extractDocLineItems(doc);

        return {
          id: `DV-${doc.id.slice(0, 8)}`,
          doc_id: doc.id,
          workbench_id: workbenchId,
          sale_type: 'one_time_invoice',
          status: derivedStatus,
          payment_status: derivedPaymentStatus,
          fulfillment_status: 'Fulfilled',
          customer: { id: `cust_${doc.id}`, name: customerName },
          date: doc.created_at ? doc.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
          due_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
          reference_number: refNo,
          items: items,
          subtotal: subtotalAmt,
          discount_total: 0,
          tax_total: taxAmt,
          grand_total: totalAmt,
          amount_paid: amountPaid,
          amount_due: amountDue,
          payments: isSettled ? [
            {
              id: `pay_dv_${doc.id}`,
              date: doc.created_at ? doc.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
              amount: totalAmt,
              method: 'Bank / Direct Settlement',
              account: 'HDFC Bank Main',
              reference: refNo
            }
          ] : [],
          documents: [{ id: doc.id, original_filename: doc.original_filename, storage_path: doc.storage_path }],
          accounting_entries: [
            { debit_account: `Accounts Receivable — ${customerName}`, credit_account: 'Sales Revenue', amount: subtotalAmt },
            { debit_account: `Accounts Receivable — ${customerName}`, credit_account: 'GST Tax Payable', amount: taxAmt }
          ],
          isFromDocVault: true,
          created_at: doc.created_at || new Date().toISOString(),
          updated_at: doc.created_at || new Date().toISOString()
        };
      });

      // Merge user recorded sales with Doc Vault sales, skipping duplicates
      const mergedSales = [...recordedSales];

      docVaultSales.forEach(dvSale => {
        const exists = mergedSales.some(s => 
          s.documents?.some(d => d.id === dvSale.doc_id) || 
          s.reference_number === dvSale.reference_number
        );
        if (!exists) {
          mergedSales.push(dvSale);
        }
      });

      mergedSales.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      // Sync combined unpaid receivables to AR
      this.syncAllToAR(workbenchId, mergedSales);
      return mergedSales;
    } catch (err) {
      console.error("Error building sales from Doc Vault:", err);
      return recordedSales;
    }
  },

  // Record a new sale transaction
  recordSale(workbenchId, salePayload) {
    const sales = this.getSales(workbenchId);
    
    // Auto-generate Sale ID
    const count = sales.length + 1001;
    const saleId = salePayload.id || `SAL-${count}`;

    // Compute line items totals
    const items = (salePayload.items || []).map(item => {
      const qty = Number(item.quantity) || 1;
      const rate = Number(item.rate) || 0;
      const discount = Number(item.discount) || 0;
      const tax = Number(item.tax) || 0;
      const lineSubtotal = (qty * rate) - discount;
      const lineTotal = lineSubtotal + tax;
      return {
        ...item,
        quantity: qty,
        rate: rate,
        discount: discount,
        tax: tax,
        subtotal: lineSubtotal,
        total: lineTotal
      };
    });

    const subtotal = items.reduce((sum, i) => sum + i.subtotal, 0);
    const discount_total = items.reduce((sum, i) => sum + (i.discount || 0), 0);
    const tax_total = items.reduce((sum, i) => sum + (i.tax || 0), 0);
    const grand_total = Number(salePayload.grand_total) || (subtotal + tax_total);

    const isPos = salePayload.sale_type === 'pos';
    const amountPaid = isPos ? grand_total : (Number(salePayload.amount_paid) || 0);
    const amountDue = Math.max(0, grand_total - amountPaid);

    let derivedStatus = salePayload.status || 'Recorded';
    let derivedPaymentStatus = 'Unpaid';

    if (amountPaid >= grand_total && grand_total > 0) {
      derivedPaymentStatus = 'Paid';
      derivedStatus = 'Completed';
    } else if (amountPaid > 0) {
      derivedPaymentStatus = 'Partially Paid';
      derivedStatus = 'Partially Paid';
    } else if (salePayload.sale_type === 'one_time_invoice') {
      derivedStatus = 'Invoiced';
    }

    const customer = salePayload.customer || (isPos ? { id: 'anonymous', name: 'Walk-in / Anonymous Customer' } : { id: 'unknown', name: 'Standard Customer' });

    const accountingEntries = salePayload.accounting_entries || [];
    if (accountingEntries.length === 0) {
      if (isPos) {
        accountingEntries.push(
          { debit_account: salePayload.payment_account || 'Cash / Bank Main', credit_account: 'Sales Revenue', amount: subtotal },
          { debit_account: salePayload.payment_account || 'Cash / Bank Main', credit_account: 'GST Tax Payable', amount: tax_total }
        );
      } else {
        accountingEntries.push(
          { debit_account: `Accounts Receivable — ${customer.name}`, credit_account: 'Sales Revenue', amount: subtotal },
          { debit_account: `Accounts Receivable — ${customer.name}`, credit_account: 'GST Tax Payable', amount: tax_total }
        );
      }
    }

    const newSale = {
      id: saleId,
      workbench_id: workbenchId,
      sale_type: salePayload.sale_type || 'one_time_invoice',
      status: derivedStatus,
      payment_status: derivedPaymentStatus,
      fulfillment_status: salePayload.fulfillment_status || (isPos ? 'Fulfilled' : 'Unfulfilled'),
      customer: customer,
      date: salePayload.date || new Date().toISOString().split('T')[0],
      due_date: salePayload.due_date || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      reference_number: salePayload.reference_number || `INV-${new Date().getFullYear()}-${count}`,
      items: items,
      subtotal: subtotal,
      discount_total: discount_total,
      tax_total: tax_total,
      grand_total: grand_total,
      amount_paid: amountPaid,
      amount_due: amountDue,
      marketplace_details: salePayload.marketplace_details || null,
      recurring_details: salePayload.recurring_details || null,
      project_details: salePayload.project_details || null,
      payments: isPos ? [
        {
          id: `pay_${Date.now()}`,
          date: salePayload.date || new Date().toISOString().split('T')[0],
          amount: grand_total,
          method: salePayload.payment_method || 'Cash',
          account: salePayload.payment_account || 'Cash / Bank Main',
          reference: salePayload.reference_number || 'POS Receipt'
        }
      ] : (salePayload.payments || []),
      documents: salePayload.documents || [],
      accounting_entries: accountingEntries,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    sales.unshift(newSale);
    this.saveSales(workbenchId, sales);
    return newSale;
  },

  // Record payment / settlement against a sale
  recordPayment(workbenchId, saleId, paymentData) {
    const sales = this.getSales(workbenchId);
    const index = sales.findIndex(s => s.id === saleId);

    if (index === -1) {
      // If payment is being recorded against a Doc Vault sale that hasn't been saved in localStorage yet, create local record
      const payAmt = Number(paymentData.amount) || 0;
      const newSale = this.recordSale(workbenchId, {
        id: saleId,
        sale_type: 'one_time_invoice',
        status: 'Partially Paid',
        customer: { id: `cust_${Date.now()}`, name: paymentData.customerName || 'Customer' },
        reference_number: saleId,
        grand_total: payAmt,
        amount_paid: payAmt,
        payments: [{
          id: `pay_${Date.now()}`,
          date: paymentData.date || new Date().toISOString().split('T')[0],
          amount: payAmt,
          method: paymentData.method || 'Bank Transfer',
          account: paymentData.account || 'HDFC Bank Main',
          reference: paymentData.reference || `SETTLE-${Date.now().toString().slice(-6)}`
        }]
      });
      return newSale;
    }

    const sale = sales[index];
    const payAmt = Number(paymentData.amount) || 0;
    if (payAmt <= 0) throw new Error("Payment amount must be greater than 0");

    const newPaid = sale.amount_paid + payAmt;
    const newDue = Math.max(0, sale.grand_total - newPaid);

    let newPaymentStatus = 'Partially Paid';
    let newStatus = 'Partially Paid';

    if (newPaid >= sale.grand_total) {
      newPaymentStatus = newPaid > sale.grand_total ? 'Overpaid' : 'Paid';
      newStatus = 'Completed';
    }

    const newPaymentObj = {
      id: `pay_${Date.now()}`,
      date: paymentData.date || new Date().toISOString().split('T')[0],
      amount: payAmt,
      method: paymentData.method || 'Bank Transfer',
      account: paymentData.account || 'HDFC Bank Main',
      reference: paymentData.reference || `REF-${Date.now().toString().slice(-6)}`,
      notes: paymentData.notes || ''
    };

    const updatedSale = {
      ...sale,
      amount_paid: newPaid,
      amount_due: newDue,
      payment_status: newPaymentStatus,
      status: newStatus,
      payments: [...sale.payments, newPaymentObj],
      accounting_entries: [
        ...sale.accounting_entries,
        {
          debit_account: paymentData.account || 'Bank Account',
          credit_account: `Accounts Receivable — ${sale.customer?.name || 'Customer'}`,
          amount: payAmt,
          description: `Customer payment received for ${sale.reference_number}`
        }
      ],
      updated_at: new Date().toISOString()
    };

    sales[index] = updatedSale;
    this.saveSales(workbenchId, sales);
    return updatedSale;
  },

  // Record a Return / Credit Note (Rule 14 & 19: Reversal adjustment without erasing original sale)
  recordReturn(workbenchId, saleId, returnData) {
    const sales = this.getSales(workbenchId);
    const index = sales.findIndex(s => s.id === saleId);
    if (index === -1) throw new Error("Sale transaction not found");

    const sale = sales[index];
    const refundAmt = Number(returnData.refundAmount) || sale.grand_total;

    const creditNoteRef = `CN-${Date.now().toString().slice(-6)}`;

    const updatedSale = {
      ...sale,
      status: 'Returned',
      credit_note: {
        reference: creditNoteRef,
        date: new Date().toISOString().split('T')[0],
        reason: returnData.reason || 'Customer Return',
        amount: refundAmt
      },
      accounting_entries: [
        ...sale.accounting_entries,
        {
          debit_account: 'Sales Returns & Allowances',
          credit_account: sale.payment_status === 'Paid' ? 'Cash / Bank' : `Accounts Receivable — ${sale.customer?.name}`,
          amount: refundAmt,
          description: `Credit Note ${creditNoteRef} issued for sale ${sale.reference_number}`
        }
      ],
      updated_at: new Date().toISOString()
    };

    sales[index] = updatedSale;
    this.saveSales(workbenchId, sales);
    return updatedSale;
  },

  // Import / create sale directly from Doc Vault document
  importFromDocVault(workbenchId, docObj) {
    const note = docObj.di_analysis_notes?.[0] || {};
    const data = note.extracted_data || {};
    
    const partyName = note.parties?.customer?.name || data.parties?.customer?.value || "Extracted Customer";
    const refNo = data.document?.reference_number?.value || docObj.original_filename;
    const totalAmt = note.money?.total_amount !== undefined ? Number(note.money?.total_amount) : (Number(data.financials?.total_amount?.value) || 0);
    const taxAmt = note.taxes?.total_tax !== undefined ? Number(note.taxes?.total_tax) : (Number(data.financials?.total_tax?.value) || 0);

    const existing = this.getSales(workbenchId);
    const isDuplicate = existing.some(s => 
      s.reference_number === refNo || 
      (s.customer?.name === partyName && Math.abs(s.grand_total - totalAmt) < 1)
    );

    if (isDuplicate) {
      throw new Error(`Probable duplicate detected! An invoice with ref "${refNo}" or amount ${totalAmt} already exists in Sales.`);
    }

    return this.recordSale(workbenchId, {
      sale_type: 'one_time_invoice',
      status: 'Invoiced',
      customer: { id: `cust_${Date.now()}`, name: partyName },
      reference_number: refNo,
      date: docObj.created_at ? docObj.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
      items: extractDocLineItems(docObj),
      grand_total: totalAmt,
      documents: [{ id: docObj.id, original_filename: docObj.original_filename, storage_path: docObj.storage_path }]
    });
  },

  // Sync unpaid credit sales automatically into OPS -> Accounts Receivable (AR)
  syncAllToAR(workbenchId, sales) {
    if (typeof window === 'undefined') return;
    const arKey = getArStorageKey(workbenchId);

    const arItems = sales
      .filter(s => s.sale_type !== 'pos' && s.amount_due > 0 && s.status !== 'Cancelled' && s.status !== 'Returned')
      .map(s => {
        const daysOut = Math.max(0, Math.floor((new Date() - new Date(s.date)) / (1000 * 60 * 60 * 24)));
        const isOverdue = new Date(s.due_date) < new Date();
        return {
          id: `ar_${s.id}`,
          sale_id: s.id,
          customer: s.customer?.name || 'Customer',
          invoiceNumber: s.reference_number,
          date: s.date,
          dueDate: s.due_date,
          totalAmount: s.grand_total,
          paid: s.amount_paid,
          left: s.amount_due,
          daysOutstanding: daysOut,
          status: isOverdue ? 'Overdue' : 'Outstanding',
          rep: 'Sales Dept'
        };
      });

    localStorage.setItem(arKey, JSON.stringify(arItems));
    window.dispatchEvent(new CustomEvent("ar:updated", { detail: { workbenchId, count: arItems.length } }));
  },

  markAsPosted(workbenchId, saleId) {
    if (!workbenchId || !saleId) return null;
    const key = getStorageKey(workbenchId);
    const stored = localStorage.getItem(key);
    if (!stored) return null;
    try {
      const sales = JSON.parse(stored);
      const updated = sales.map(s => {
        if (s.id === saleId) {
          return { ...s, is_posted: true, status: 'Posted' };
        }
        return s;
      });
      localStorage.setItem(key, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent("ledger:updated", { detail: { workbenchId, saleId } }));
      return updated.find(s => s.id === saleId);
    } catch (e) {
      return null;
    }
  }
};
