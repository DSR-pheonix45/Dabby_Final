// salesService.js - Complete Sales Module Data & Lifecycle Management Engine

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

const getStorageKey = (workbenchId) => `dabby_sales_${workbenchId}`;
const getArStorageKey = (workbenchId) => `dabby_ar_items_${workbenchId}`;

// Initial demo seed data if local storage is empty
const INITIAL_DEMO_SALES = (workbenchId) => [
  {
    id: `SAL-1001`,
    workbench_id: workbenchId,
    sale_type: 'one_time_invoice',
    status: 'Invoiced',
    payment_status: 'Unpaid',
    fulfillment_status: 'Fulfilled',
    customer: { id: 'cust_01', name: 'Datalis Technologies Pvt Ltd', gstin: '27AABCD1234E1Z5' },
    date: '2026-08-10',
    due_date: '2026-09-10',
    reference_number: 'INV-2026-001',
    items: [
      { name: 'Enterprise SaaS Software License', quantity: 1, rate: 50000, discount: 5000, tax: 8100, total: 53100, is_inventory: false }
    ],
    subtotal: 45000,
    discount_total: 5000,
    tax_total: 8100,
    grand_total: 53100,
    amount_paid: 0,
    amount_due: 53100,
    payments: [],
    documents: [{ id: 'doc_1', original_filename: 'Sales_Invoice_INV-001.pdf' }],
    accounting_entries: [
      { debit_account: 'Accounts Receivable', credit_account: 'Sales Revenue', amount: 45000 },
      { debit_account: 'Accounts Receivable', credit_account: 'GST Tax Payable', amount: 8100 }
    ],
    created_at: new Date(Date.now() - 5 * 86400000).toISOString()
  },
  {
    id: `SAL-1002`,
    workbench_id: workbenchId,
    sale_type: 'pos',
    status: 'Completed',
    payment_status: 'Paid',
    fulfillment_status: 'Fulfilled',
    customer: { id: 'anonymous', name: 'Walk-in / Anonymous Customer' },
    date: '2026-08-14',
    reference_number: 'POS-2026-089',
    items: [
      { name: 'Custom Apparel - Suit Outfit', quantity: 1, rate: 4000, discount: 0, tax: 720, total: 4720, is_inventory: true }
    ],
    subtotal: 4000,
    discount_total: 0,
    tax_total: 720,
    grand_total: 4720,
    amount_paid: 4720,
    amount_due: 0,
    payments: [
      { id: 'pay_pos_1', date: '2026-08-14', amount: 4720, method: 'UPI / Cash', account: 'HDFC Bank Main', reference: 'UPI-9821038' }
    ],
    documents: [],
    accounting_entries: [
      { debit_account: 'HDFC Bank Main Account', credit_account: 'Sales Revenue', amount: 4000 },
      { debit_account: 'HDFC Bank Main Account', credit_account: 'GST Tax Payable', amount: 720 },
      { debit_account: 'Cost of Goods Sold (COGS)', credit_account: 'Finished Goods Inventory', amount: 2200 }
    ],
    created_at: new Date(Date.now() - 1 * 86400000).toISOString()
  },
  {
    id: `SAL-1003`,
    workbench_id: workbenchId,
    sale_type: 'marketplace',
    status: 'Pending Settlement',
    payment_status: 'Partially Paid',
    fulfillment_status: 'Fulfilled',
    customer: { id: 'mkt_amazon', name: 'Amazon Marketplace' },
    date: '2026-08-12',
    reference_number: 'AMZ-SETTLE-882',
    items: [
      { name: 'Bulk Product Batch Sales (Gross)', quantity: 20, rate: 2500, discount: 0, tax: 9000, total: 59000, is_inventory: true }
    ],
    subtotal: 50000,
    discount_total: 0,
    tax_total: 9000,
    grand_total: 59000,
    marketplace_details: {
      gross_sales: 59000,
      returns: 2000,
      commission: 5900,
      platform_fees: 1500,
      shipping_charges: 1200,
      net_settlement: 48400
    },
    amount_paid: 30000,
    amount_due: 18400,
    payments: [
      { id: 'pay_amz_1', date: '2026-08-13', amount: 30000, method: 'Bank Transfer', account: 'Axis Bank Corp', reference: 'NEFT-AMZ-001' }
    ],
    documents: [],
    accounting_entries: [
      { debit_account: 'Amazon Marketplace Clearing', credit_account: 'Gross Sales Revenue', amount: 50000 },
      { debit_account: 'Marketplace Commission Expense', credit_account: 'Amazon Marketplace Clearing', amount: 5900 },
      { debit_account: 'Axis Bank Corp', credit_account: 'Amazon Marketplace Clearing', amount: 30000 }
    ],
    created_at: new Date(Date.now() - 3 * 86400000).toISOString()
  }
];

export const salesService = {
  // Fetch all sales for a workbench
  getSales(workbenchId) {
    if (!workbenchId) return [];
    if (typeof window === 'undefined') return [];
    
    const key = getStorageKey(workbenchId);
    const stored = localStorage.getItem(key);
    
    if (!stored) {
      const initial = INITIAL_DEMO_SALES(workbenchId);
      localStorage.setItem(key, JSON.stringify(initial));
      this.syncAllToAR(workbenchId, initial);
      return initial;
    }
    
    try {
      return JSON.parse(stored) || [];
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

    // Default Customer fallback for POS
    const customer = salePayload.customer || (isPos ? { id: 'anonymous', name: 'Walk-in / Anonymous Customer' } : { id: 'unknown', name: 'Standard Customer' });

    // Generate Double Entry Accounting Impact
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
    if (index === -1) throw new Error("Sale transaction not found");

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
    const totalAmt = note.money?.total_amount !== undefined ? note.money?.total_amount : (data.financials?.total_amount?.value || 0);
    const taxAmt = note.taxes?.total_tax !== undefined ? note.taxes?.total_tax : (data.financials?.total_tax?.value || 0);

    // Duplicate prevention check (Rule 25)
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
      date: note.dates?.document_date || new Date().toISOString().split('T')[0],
      items: [
        { name: `Sales Voucher (${docObj.original_filename})`, quantity: 1, rate: totalAmt - taxAmt, discount: 0, tax: taxAmt, total: totalAmt }
      ],
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
  }
};
