import React, { useState } from 'react';
import { 
  BsReceipt, 
  BsGraphUp, 
  BsPersonBadge, 
  BsBuilding, 
  BsBoxSeam, 
  BsCalculator, 
  BsCalendarCheck,
  BsCheckCircleFill, 
  BsArrowDownRight, 
  BsArrowUpRight,
  BsFileEarmarkSpreadsheet,
  BsArrowRightShort,
  BsShieldCheck,
  BsDiagram3,
  BsLink45Deg
} from 'react-icons/bs';
import { useWorkbench } from '../../../../context/WorkbenchContext';
import { formatCurrency } from '../../../../utils/currency';
import { apiFetch } from '../../../../lib/apiClient';

const parseNum = (val) => {
  if (val === undefined || val === null || val === '') return undefined;
  if (typeof val === 'number') return isNaN(val) ? undefined : val;
  if (typeof val === 'object' && val !== null) {
    if ('value' in val) return parseNum(val.value);
    if ('amount' in val) return parseNum(val.amount);
    if ('total' in val) return parseNum(val.total);
  }
  if (typeof val === 'string') {
    const cleaned = val.replace(/[^0-9.-]/g, '');
    if (!cleaned) return undefined;
    const n = parseFloat(cleaned);
    return isNaN(n) ? undefined : n;
  }
  return undefined;
};

const parseStr = (val, fallback = '') => {
  if (val === undefined || val === null) return fallback;
  if (typeof val === 'object' && val !== null && 'value' in val) return parseStr(val.value, fallback);
  if (typeof val === 'string') return val.trim() || fallback;
  return String(val) || fallback;
};

export default function VoucherEntryTab({ doc }) {
  const { activeWorkbench } = useWorkbench();
  const [mappedAccounts, setMappedAccounts] = useState({});
  const [mappingLoading, setMappingLoading] = useState({});

  const note = doc?.di_analysis_notes?.[0] || {};
  const ufo = note.extracted_data || {};
  
  // Flattened UFO properties with fallback
  const rawDocType = note.document_type || ufo.document_type || 'expense_receipt';
  const docTypeStr = parseStr(rawDocType, 'expense_receipt');
  const lowerDocType = docTypeStr.toLowerCase();
  const filename = (doc?.original_filename || '').toLowerCase();
  
  const isExpenseDoc = lowerDocType.includes('expense') || 
                       lowerDocType.includes('receipt') || 
                       lowerDocType.includes('claim') || 
                       lowerDocType.includes('opex') || 
                       lowerDocType.includes('petrol') || 
                       lowerDocType.includes('fuel') || 
                       lowerDocType.includes('allowance') || 
                       filename.includes('receipt') || 
                       filename.includes('clm-') || 
                       filename.includes('expense');

  const isVendorDoc = !isExpenseDoc && (
    lowerDocType.includes('vendor') || 
    lowerDocType.includes('bill') || 
    lowerDocType.includes('purchase') || 
    lowerDocType.includes('po') || 
    lowerDocType.includes('purchase_order')
  );

  const isBankStatement = lowerDocType.includes('bank_statement') || 
                         lowerDocType.includes('bank statement') || 
                         lowerDocType.includes('passbook') || 
                         lowerDocType.includes('statement');

  const money = note.money || ufo.financials || ufo.money || {};
  const taxes = note.taxes || ufo.taxes || {};
  const dates = note.dates || ufo.document_metadata || ufo.document || {};
  const parties = note.parties || ufo.parties || {};
  const lineItems = (note.line_items && note.line_items.length > 0) ? note.line_items : (ufo.line_items || doc?.line_items || []);

  const country = activeWorkbench?.country || 'India';
  const rawTotal = 
    parseNum(money.total_amount) ??
    parseNum(money.grand_total) ??
    parseNum(money.subtotal) ??
    parseNum(money.amount) ??
    parseNum(ufo.financials?.total_amount) ??
    parseNum(ufo.financials?.grand_total) ??
    parseNum(ufo.financials?.subtotal) ??
    parseNum(ufo.total_amount) ??
    parseNum(ufo.grand_total) ??
    parseNum(ufo.amount) ??
    parseNum(doc?.total_amount) ??
    parseNum(doc?.amount);

  const lineItemsSum = lineItems.reduce((acc, i) => {
    const itemTotal = parseNum(i.total) ?? parseNum(i.amount) ?? parseNum(i.taxable_value) ?? 
      ((parseNum(i.rate) ?? parseNum(i.unit_price) ?? 0) * (parseNum(i.quantity) ?? parseNum(i.qty) ?? 1));
    return acc + (itemTotal || 0);
  }, 0);

  const grandTotal = (rawTotal !== undefined && !isNaN(rawTotal)) ? rawTotal : lineItemsSum;

  const rawTax = parseNum(taxes.total_tax) ?? parseNum(taxes.tax_amount) ?? parseNum(money.tax_amount) ?? parseNum(ufo.financials?.tax_amount);
  const totalTax = (rawTax !== undefined && !isNaN(rawTax)) ? rawTax : (grandTotal > 0 ? Math.round((grandTotal * 0.18 / 1.18) * 100) / 100 : 0);

  const rawSubtotal = parseNum(money.subtotal) ?? parseNum(money.taxable_amount) ?? parseNum(ufo.financials?.subtotal);
  const subtotal = (rawSubtotal !== undefined && !isNaN(rawSubtotal)) ? rawSubtotal : Math.max(0, grandTotal - totalTax);

  const cgst = parseNum(taxes.cgst) ?? (totalTax > 0 ? Math.round((totalTax / 2) * 100) / 100 : 0);
  const sgst = parseNum(taxes.sgst) ?? (totalTax > 0 ? Math.round((totalTax / 2) * 100) / 100 : 0);
  const igst = parseNum(taxes.igst) ?? 0;

  // Header Details
  const invoiceNo = parseStr(dates.invoice_number) || parseStr(dates.invoice_no) || parseStr(ufo.invoice_number) || parseStr(dates.reference_number) || (isExpenseDoc ? 'EXP-REC' : 'INV-1024');
  const invoiceDate = parseStr(dates.document_date) || parseStr(dates.invoice_date) || parseStr(dates.date) || new Date().toISOString().split('T')[0];
  const dueDate = parseStr(dates.due_date) || invoiceDate;
  const placeOfSupply = parseStr(dates.place_of_supply) || 'Maharashtra (27)';
  const reverseCharge = dates.reverse_charge ? 'Yes' : 'No';
  const natureOfSupply = parseStr(dates.nature_of_supply) || (isExpenseDoc ? 'Direct OPEX Expense' : 'B2B Taxable Supply');

  // Parties
  const issuerPartyName = parseStr(parties.issuer?.name) || 
                          parseStr(parties.seller?.name) || 
                          parseStr(parties.vendor?.name) || 
                          parseStr(ufo.parties?.vendor?.value) || 
                          parseStr(ufo.parties?.vendor) || 
                          parseStr(ufo.parties?.issuer) || 
                          (isExpenseDoc ? 'Venktesh Automobiles' : 'Vendor Merchant');

  const recipientPartyName = parseStr(parties.recipient?.name) || 
                             parseStr(parties.customer?.name) || 
                             parseStr(ufo.parties?.customer?.value) || 
                             parseStr(ufo.parties?.customer) || 
                             parseStr(ufo.parties?.recipient) || 
                             activeWorkbench?.name || 
                             'Datalis Private Limited';

  const seller = parties.issuer || parties.seller || parties.vendor || {
    name: issuerPartyName,
    gstin: '27AAACA0000A1Z5',
    pan: 'AAACA0000A',
    address: 'Fuel Station & Retail Premises',
    state_code: '27',
    bank_details: 'UPI / Direct Petty Cash'
  };

  const customer = parties.recipient || parties.customer || parties.buyer || {
    name: recipientPartyName,
    customer_code: 'CUST-8841',
    gstin: '27BBBCA1111B1Z2',
    address: activeWorkbench?.address?.street || 'Company Office',
    state: 'Maharashtra',
    country: 'India',
    pan: 'BBBCA1111B'
  };

  // Line Items
  const items = lineItems.length > 0 ? lineItems : [
    {
      description: isExpenseDoc ? 'Fuel / Travel Allowance Reimbursement' : 'Cloud Subscription & License',
      sku: isExpenseDoc ? 'SKU-OPEX' : 'SKU-CS-10',
      hsn_sac: '998313',
      quantity: 1,
      unit: 'NOS',
      rate: grandTotal,
      discount: 0,
      taxable_value: subtotal,
      gst_rate: 18,
      cgst: cgst,
      sgst: sgst,
      igst: igst,
      total: grandTotal
    }
  ];

  // Calculated inventory & COGS estimates
  const totalQty = isExpenseDoc ? 0 : items.reduce((acc, item) => acc + (parseNum(item.quantity) || 1), 0);
  const estimatedCogs = isExpenseDoc ? 0 : Math.round(subtotal * 0.65);

  const handleAccountMap = async (idx, isCredit, targetName, targetType) => {
    if (!targetName) return;
    setMappingLoading(prev => ({ ...prev, [idx]: true }));
    try {
      const res = await apiFetch('/api/ops/vouchers/map-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: activeWorkbench?.id,
          voucher_type: isCredit ? 'receipt' : 'payment',
          target_type: targetType,
          target_account_name: targetName,
          amount: grandTotal
        })
      });
      if (res?.status === 'success') {
        setMappedAccounts(prev => ({
          ...prev,
          [idx]: {
            targetName,
            targetType,
            entryText: res.posting?.entry_text,
            labelId: res.label_id,
            code: res.account?.account_code || res.label_id
          }
        }));
      }
    } catch (err) {
      console.error('Failed to map voucher account:', err);
    } finally {
      setMappingLoading(prev => ({ ...prev, [idx]: false }));
    }
  };

  if (isBankStatement) {
    const bankSummary = note.statement_summary || ufo.statement_summary || {};
    const transactions = (note.transactions && note.transactions.length > 0)
      ? note.transactions
      : (ufo.transactions || ufo.line_items || lineItems);

    const bankName = bankSummary.bank_name || 'Axis Bank';
    const accNumber = bankSummary.account_number || 'XXXX-XXXX-8078';
    const openingBal = Number(bankSummary.opening_balance ?? 0);
    const closingBal = Number(bankSummary.closing_balance ?? 0);
    
    // Calculate total credits & debits from transactions
    const totalCredits = bankSummary.total_credits ?? transactions.reduce((acc, t) => acc + (Number(t.credit_amount || t.credit || 0)), 0);
    const totalDebits = bankSummary.total_debits ?? transactions.reduce((acc, t) => acc + (Number(t.debit_amount || t.debit || 0)), 0);
    const netCashFlow = totalCredits - totalDebits;

    return (
      <div className="flex flex-col h-full bg-[#111111] text-gray-200 overflow-y-auto custom-scrollbar font-dm-sans">
        
        {/* 🟢 TOP BANNER */}
        <div className="p-6 bg-gradient-to-r from-[#141b24] via-[#11161d] to-[#111111] border-b border-white/5 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <BsDiagram3 size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-white tracking-tight">Bank Statement Multi-Voucher Log</h2>
                  <span className="bg-blue-500/10 text-blue-400 text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded border border-blue-500/20">
                    BANK STATEMENT
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  Records: <span className="text-blue-300 font-medium">"{bankName} • Acc: {accNumber}"</span>
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Closing Balance</p>
              <p className="text-xl font-extrabold text-white">{formatCurrency(closingBal, country)}</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-8">
          
          {/* 📊 SECTION 1: 5 BANK IMPACT AREAS */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                <BsGraphUp className="text-blue-400" />
                5 Major Bank Impact Areas
              </h3>
              <span className="text-[10px] text-gray-400 font-mono">Automated Multi-Voucher Sync</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              
              {/* 1. Total Credits */}
              <div className="p-3.5 bg-[#161616] border border-white/5 rounded-xl flex flex-col justify-between hover:border-blue-500/30 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">1. Money In (Credits)</span>
                  <BsArrowUpRight className="text-green-400 text-xs" />
                </div>
                <div>
                  <p className="text-[11px] text-gray-300 font-medium">Receipt Vouchers</p>
                  <p className="text-sm font-extrabold text-green-400 mt-0.5">+{formatCurrency(totalCredits, country)}</p>
                </div>
              </div>

              {/* 2. Total Debits */}
              <div className="p-3.5 bg-[#161616] border border-white/5 rounded-xl flex flex-col justify-between hover:border-blue-500/30 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">2. Money Out (Debits)</span>
                  <BsArrowDownRight className="text-rose-400 text-xs" />
                </div>
                <div>
                  <p className="text-[11px] text-gray-300 font-medium">Payment Vouchers</p>
                  <p className="text-sm font-extrabold text-rose-400 mt-0.5">-{formatCurrency(totalDebits, country)}</p>
                </div>
              </div>

              {/* 3. Net Cash Flow */}
              <div className="p-3.5 bg-[#161616] border border-white/5 rounded-xl flex flex-col justify-between hover:border-blue-500/30 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">3. Net Cash Movement</span>
                  {netCashFlow >= 0 ? <BsArrowUpRight className="text-teal-400 text-xs" /> : <BsArrowDownRight className="text-rose-400 text-xs" />}
                </div>
                <div>
                  <p className="text-[11px] text-gray-300 font-medium">Net Movement</p>
                  <p className={`text-sm font-extrabold mt-0.5 ${netCashFlow >= 0 ? 'text-teal-400' : 'text-rose-400'}`}>
                    {netCashFlow >= 0 ? `+${formatCurrency(netCashFlow, country)}` : formatCurrency(netCashFlow, country)}
                  </p>
                </div>
              </div>

              {/* 4. Total Vouchers */}
              <div className="p-3.5 bg-[#161616] border border-white/5 rounded-xl flex flex-col justify-between hover:border-blue-500/30 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">4. Total Vouchers</span>
                  <BsCheckCircleFill className="text-blue-400 text-xs" />
                </div>
                <div>
                  <p className="text-[11px] text-gray-300 font-medium">Extracted Transactions</p>
                  <p className="text-sm font-extrabold text-blue-400 mt-0.5">{transactions.length} Vouchers</p>
                </div>
              </div>

              {/* 5. Closing Position */}
              <div className="p-3.5 bg-[#161616] border border-white/5 rounded-xl flex flex-col justify-between hover:border-blue-500/30 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">5. End Position</span>
                  <BsShieldCheck className="text-indigo-400 text-xs" />
                </div>
                <div>
                  <p className="text-[11px] text-gray-300 font-medium">Reconciled Balance</p>
                  <p className="text-sm font-extrabold text-indigo-400 mt-0.5">{formatCurrency(closingBal, country)}</p>
                </div>
              </div>

            </div>
          </section>

          {/* 📑 SECTION 2: DERIVED VOUCHERS TABLE WITH ACCOUNT MAPPING */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                <BsFileEarmarkSpreadsheet className="text-blue-400" />
                Derived Transaction Vouchers ({transactions.length})
              </h3>
              <span className="text-[10px] text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded font-mono font-bold">Interactive COA Mapping</span>
            </div>

            <div className="bg-[#141414] border border-white/10 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs divide-y divide-white/5 font-mono">
                  <thead className="bg-white/[0.02] text-gray-400 text-[10px] uppercase font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Description / Particulars</th>
                      <th className="py-2.5 px-3">Voucher Type</th>
                      <th className="py-2.5 px-3">Accounting Entry</th>
                      <th className="py-2.5 px-3">Map Target COA Account</th>
                      <th className="py-2.5 px-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-gray-300">
                    {transactions.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-gray-500">No bank transactions extracted yet.</td>
                      </tr>
                    ) : (
                      transactions.map((tx, idx) => {
                        const isCredit = Number(tx.credit_amount || tx.credit || 0) > 0;
                        const amt = isCredit ? Number(tx.credit_amount || tx.credit) : Number(tx.debit_amount || tx.debit || 0);
                        const vType = isCredit ? 'Receipt Voucher' : 'Payment Voucher';
                        const mapState = mappedAccounts[idx];
                        
                        return (
                          <tr key={idx} className="hover:bg-white/[0.02]">
                            <td className="py-2.5 px-3 text-gray-400 whitespace-nowrap">{tx.date || tx.value_date || 'N/A'}</td>
                            <td className="py-2.5 px-3 font-medium text-white max-w-xs truncate">{tx.description || tx.narrative || tx.particulars || 'Bank Transaction'}</td>
                            <td className="py-2.5 px-3">
                              <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${isCredit ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                                {vType}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-gray-300 text-[11px]">
                              {mapState?.entryText ? (
                                <span className="text-teal-300 font-bold flex items-center gap-1">
                                  <BsCheckCircleFill className="text-teal-400 text-[10px]" />
                                  {mapState.entryText}
                                </span>
                              ) : isCredit ? (
                                <span><strong className="text-teal-400">Dr Bank</strong> / Cr Accounts Receivable</span>
                              ) : (
                                <span><strong className="text-rose-400">Dr Expense/AP</strong> / Cr Bank</span>
                              )}
                            </td>
                            {/* Interactive COA Mapping Selector */}
                            <td className="py-2 px-3">
                              <div className="flex items-center gap-2">
                                <select 
                                  value={mapState?.targetName || ''}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    if (!val) return;
                                    const type = isCredit 
                                      ? (val.includes('Receivable') ? 'customer_ar' : 'revenue')
                                      : (val.includes('Payable') ? 'vendor_ap' : val.includes('COGS') ? 'cogs' : 'expense');
                                    handleAccountMap(idx, isCredit, val, type);
                                  }}
                                  className="bg-[#1a1a1a] text-xs text-gray-200 border border-white/10 rounded px-2 py-1 focus:outline-none focus:border-teal-500 font-sans"
                                >
                                  <option value="">-- Map Target Account --</option>
                                  {isCredit ? (
                                    <>
                                      <option value="Accounts Receivable — Customer (AR)">👤 Accounts Receivable — Customer Invoice</option>
                                      <option value="Sales Revenue Account">💰 Sales Revenue Account</option>
                                      <option value="Consulting Revenue">📈 Consulting Revenue</option>
                                      <option value="Interest & Financial Income">🏦 Interest & Financial Income</option>
                                      <option value="Capital Investment / Equity">🏛️ Capital Investment / Share Equity</option>
                                    </>
                                  ) : (
                                    <>
                                      <option value="Accounts Payable — Vendor (AP)">🏢 Accounts Payable — Vendor Bill</option>
                                      <option value="Software & Subscriptions Expense">💻 Software & Subscriptions Expense</option>
                                      <option value="Office Rent & Utilities">🏢 Office Rent & Utilities</option>
                                      <option value="Salaries & Wages Expense">👥 Salaries & Wages Expense</option>
                                      <option value="Cost of Goods Sold (COGS)">📦 Cost of Goods Sold (COGS)</option>
                                      <option value="Travel & Business Expenses">✈️ Travel & Business Expenses</option>
                                      <option value="Legal & Professional Fees">⚖️ Legal & Professional Fees</option>
                                    </>
                                  )}
                                </select>
                                {mapState?.mapped && (
                                  <span className="text-[10px] text-teal-400 bg-teal-500/10 px-1.5 py-0.5 rounded font-mono font-bold">
                                    Mapped
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className={`py-2.5 px-3 text-right font-bold ${isCredit ? 'text-green-400' : 'text-rose-400'}`}>
                              {isCredit ? `+${formatCurrency(amt, country)}` : `-${formatCurrency(amt, country)}`}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#111111] text-gray-200 overflow-y-auto custom-scrollbar font-dm-sans">
      
      {/* 🟢 TOP BANNER */}
      <div className="p-6 bg-gradient-to-r from-[#161d1a] via-[#121614] to-[#111111] border-b border-white/5 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
              <BsReceipt size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  {isExpenseDoc ? 'Direct OPEX Expense Voucher Entry' : isVendorDoc ? 'Purchase / Vendor Voucher Entry' : 'Sales Voucher Entry'}
                </h2>
                <span className="bg-teal-500/10 text-teal-400 text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded border border-teal-500/20">
                  {docTypeStr.replace('_', ' ')}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Records: <span className="text-teal-300 font-medium">
                  {isExpenseDoc ? '"Direct Operational Expense / Employee Out-of-Pocket Reimbursement."' : isVendorDoc ? '"We purchased goods/services from a vendor."' : '"We sold goods/services to a customer."'}
                </span>
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Grand Total</p>
            <p className="text-xl font-extrabold text-white">{formatCurrency(grandTotal, country)}</p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-8">

        {/* 📊 SECTION 1: 5 MAJOR AFFECTED AREAS */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
              <BsGraphUp className="text-teal-400" />
              5 Major Impact Areas
            </h3>
            <span className="text-[10px] text-gray-400 font-mono">ERP State Sync</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            
            {/* 1. Revenue / Expense */}
            <div className="p-3.5 bg-[#161616] border border-white/5 rounded-xl flex flex-col justify-between hover:border-teal-500/30 transition-colors group">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  {isExpenseDoc || isVendorDoc ? '1. Expense' : '1. Revenue'}
                </span>
                <BsArrowUpRight className="text-green-400 text-xs" />
              </div>
              <div>
                <p className="text-[11px] text-gray-300 font-medium">
                  {isExpenseDoc || isVendorDoc ? 'Operating Expense' : 'Sales Income'}
                </p>
                <p className="text-sm font-extrabold text-green-400 mt-0.5">+{formatCurrency(subtotal, country)}</p>
              </div>
            </div>

            {/* 2. Vendor / Employee Payables / Customer AR */}
            <div className="p-3.5 bg-[#161616] border border-white/5 rounded-xl flex flex-col justify-between hover:border-teal-500/30 transition-colors group">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  {isExpenseDoc ? '2. Reimbursement (AP)' : isVendorDoc ? '2. Vendor (AP)' : '2. Customer (AR)'}
                </span>
                <BsArrowUpRight className={isExpenseDoc || isVendorDoc ? 'text-rose-400 text-xs' : 'text-teal-400 text-xs'} />
              </div>
              <div>
                <p className="text-[11px] text-gray-300 font-medium">
                  {isExpenseDoc ? 'Employee Dues' : isVendorDoc ? 'We Owe Vendor' : 'Customer Owes'}
                </p>
                <p className={`text-sm font-extrabold mt-0.5 ${isExpenseDoc || isVendorDoc ? 'text-rose-400' : 'text-teal-400'}`}>
                  +{formatCurrency(grandTotal, country)}
                </p>
              </div>
            </div>

            {/* 3. Tax Liability / Credit */}
            <div className="p-3.5 bg-[#161616] border border-white/5 rounded-xl flex flex-col justify-between hover:border-teal-500/30 transition-colors group">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  {isExpenseDoc || isVendorDoc ? '3. Input GST' : '3. Output GST'}
                </span>
                <BsArrowUpRight className="text-amber-400 text-xs" />
              </div>
              <div>
                <p className="text-[11px] text-gray-300 font-medium">
                  {isExpenseDoc || isVendorDoc ? 'Input Tax Credit' : 'Tax Payable'}
                </p>
                <p className="text-sm font-extrabold text-amber-400 mt-0.5">+{formatCurrency(totalTax, country)}</p>
              </div>
            </div>

            {/* 4. Inventory */}
            <div className="p-3.5 bg-[#161616] border border-white/5 rounded-xl flex flex-col justify-between hover:border-teal-500/30 transition-colors group">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">4. Inventory</span>
                {isVendorDoc ? <BsArrowUpRight className="text-teal-400 text-xs" /> : <BsArrowDownRight className="text-rose-400 text-xs" />}
              </div>
              <div>
                <p className="text-[11px] text-gray-300 font-medium">
                  {isExpenseDoc ? 'No Inventory Impact' : isVendorDoc ? 'Stock Increases' : 'Stock Decreases'}
                </p>
                <p className={`text-sm font-extrabold mt-0.5 ${isExpenseDoc ? 'text-gray-400' : isVendorDoc ? 'text-teal-400' : 'text-rose-400'}`}>
                  {isExpenseDoc ? '0 Units' : isVendorDoc ? `+${totalQty} Units` : `-${totalQty} Units`}
                </p>
              </div>
            </div>

            {/* 5. COGS / Accrual / Net PnL Impact */}
            <div className="p-3.5 bg-[#161616] border border-white/5 rounded-xl flex flex-col justify-between hover:border-teal-500/30 transition-colors group">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  {isExpenseDoc ? '5. Net P&L Impact' : isVendorDoc ? '5. Payable Liability' : '5. COGS'}
                </span>
                <BsArrowUpRight className="text-indigo-400 text-xs" />
              </div>
              <div>
                <p className="text-[11px] text-gray-300 font-medium">
                  {isExpenseDoc ? 'Net Profit Impact' : isVendorDoc ? 'Accrued Payable' : 'Cost Expense'}
                </p>
                <p className="text-sm font-extrabold text-indigo-400 mt-0.5">
                  {isExpenseDoc ? `-${formatCurrency(grandTotal, country)}` : `+${formatCurrency(isVendorDoc ? grandTotal : estimatedCogs, country)}`}
                </p>
              </div>
            </div>

          </div>
        </section>

        {/* 📑 SECTION 2: ACCOUNTING DOUBLE-ENTRY (JOURNAL VOUCHER PREVIEW) */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
              <BsFileEarmarkSpreadsheet className="text-teal-400" />
              Double-Entry Accounting Journal
            </h3>
            <span className="text-[10px] text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded font-mono font-bold">Balanced Entry</span>
          </div>

          <div className="space-y-4">
            
            {/* Primary Entry Card */}
            <div className="bg-[#141414] border border-white/10 rounded-xl overflow-hidden">
              <div className="px-4 py-2.5 bg-white/[0.03] border-b border-white/5 flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-teal-400"></span>
                  {isExpenseDoc 
                    ? 'Entry 1: OPEX Expense & Employee Reimbursement Entry' 
                    : isVendorDoc 
                      ? 'Entry 1: Purchase Expense & Vendor Payable Entry' 
                      : 'Entry 1: Revenue & Receivables Entry'}
                </span>
                <span className="text-[10px] text-gray-400 font-mono">Invoice Date: {invoiceDate}</span>
              </div>
              
              <div className="p-4 space-y-2 text-xs font-mono">
                {isExpenseDoc ? (
                  <>
                    {/* Debit Expense */}
                    <div className="flex flex-wrap justify-between items-center py-2 border-b border-white/5 gap-2">
                      <div className="flex items-center gap-3 flex-1 min-w-[280px]">
                        <span className="px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-300 font-bold text-[10px] shrink-0">Dr</span>
                        <select
                          value={mappedAccounts['opex_dr']?.targetName || ''}
                          disabled={mappingLoading['opex_dr']}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val) handleAccountMap('opex_dr', false, val, 'expense');
                          }}
                          className="bg-[#1a1a1a] text-xs text-gray-200 border border-white/10 rounded px-2.5 py-1 focus:outline-none focus:border-teal-500 font-sans cursor-pointer hover:border-teal-500/50"
                        >
                          <option value="">-- Map Expense Account (Default: Travel & Fuel) --</option>
                          <option value="Travel & Fuel Operations Expense">⛽ Travel & Fuel Operations Expense</option>
                          <option value="Software & Subscriptions Expense">💻 Software & Subscriptions Expense</option>
                          <option value="Employee Meals & Entertainment">🍔 Employee Meals & Entertainment</option>
                          <option value="Office Supplies & Stationery">📦 Office Supplies & Stationery</option>
                          <option value="Utilities & Electricity Expense">⚡ Utilities & Electricity Expense</option>
                          <option value="Office Rent & Premises Expense">🏢 Office Rent & Premises Expense</option>
                          <option value="Legal & Professional Fees">⚖️ Legal & Professional Fees</option>
                          <option value="Repairs & Hardware Maintenance">🔧 Repairs & Hardware Maintenance</option>
                          <option value="General Operating Expense (OPEX)">🌐 General Operating Expense (OPEX)</option>
                        </select>
                        {mappedAccounts['opex_dr'] && (
                          <span className="text-[10px] text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded font-mono font-bold border border-teal-500/20 shrink-0">
                            Mapped ({mappedAccounts['opex_dr']?.code || 'EXP-101'})
                          </span>
                        )}
                      </div>
                      <span className="text-teal-400 font-bold font-mono">{formatCurrency(subtotal, country)}</span>
                    </div>

                    {/* Debit Input GST if tax present */}
                    {totalTax > 0 && (
                      <div className="flex justify-between items-center py-2 border-b border-white/5">
                        <div className="flex items-center gap-3">
                          <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold text-[10px]">Dr</span>
                          <span className="text-gray-200 font-bold">Input GST Credit Account (18%)</span>
                        </div>
                        <span className="text-amber-400 font-bold font-mono">{formatCurrency(totalTax, country)}</span>
                      </div>
                    )}

                    {/* Credit Employee Reimbursement Line */}
                    <div className="flex flex-wrap justify-between items-center py-2 pl-6 gap-2">
                      <div className="flex items-center gap-3 flex-1 min-w-[280px]">
                        <span className="px-1.5 py-0.5 rounded bg-white/10 text-gray-400 font-bold text-[10px] shrink-0">Cr</span>
                        <select
                          value={mappedAccounts['opex_cr']?.targetName || ''}
                          disabled={mappingLoading['opex_cr']}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val) handleAccountMap('opex_cr', true, val, 'vendor_ap');
                          }}
                          className="bg-[#1a1a1a] text-xs text-gray-200 border border-white/10 rounded px-2.5 py-1 focus:outline-none focus:border-teal-500 font-sans cursor-pointer hover:border-teal-500/50"
                        >
                          <option value="">-- Map Credit Account (Default: Employee Dues) --</option>
                          <option value={`Employee Reimbursement Payable — ${seller.name}`}>👤 Employee Reimbursement Payable — {seller.name}</option>
                          <option value="Petty Cash Operating Account">💵 Petty Cash Operating Account</option>
                          <option value="Primary Bank Operating Account">🏦 Primary Bank Operating Account</option>
                          <option value="Corporate Credit Card Payable">💳 Corporate Credit Card Payable</option>
                        </select>
                        {mappedAccounts['opex_cr'] && (
                          <span className="text-[10px] text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded font-mono font-bold border border-teal-500/20 shrink-0">
                            Mapped ({mappedAccounts['opex_cr']?.code || 'AP-201'})
                          </span>
                        )}
                      </div>
                      <span className="text-rose-400 font-bold font-mono">{formatCurrency(grandTotal, country)}</span>
                    </div>
                  </>
                ) : isVendorDoc ? (
                  <>
                    {/* Debit Expense */}
                    <div className="flex flex-wrap justify-between items-center py-2 border-b border-white/5 gap-2">
                      <div className="flex items-center gap-3 flex-1 min-w-[280px]">
                        <span className="px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-300 font-bold text-[10px] shrink-0">Dr</span>
                        <select
                          value={mappedAccounts['vendor_dr']?.targetName || ''}
                          disabled={mappingLoading['vendor_dr']}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val) handleAccountMap('vendor_dr', false, val, 'expense');
                          }}
                          className="bg-[#1a1a1a] text-xs text-gray-200 border border-white/10 rounded px-2.5 py-1 focus:outline-none focus:border-teal-500 font-sans cursor-pointer hover:border-teal-500/50"
                        >
                          <option value="">-- Map Target Account --</option>
                          <option value="Operating Expense / Purchase Account">🏢 Operating Expense / Purchase Account</option>
                          <option value="Software & Subscriptions Expense">💻 Software & Subscriptions Expense</option>
                          <option value="Cost of Goods Sold (COGS)">📦 Cost of Goods Sold (COGS)</option>
                          <option value="Legal & Professional Fees">⚖️ Legal & Professional Fees</option>
                        </select>
                        {mappedAccounts['vendor_dr'] && (
                          <span className="text-[10px] text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded font-mono font-bold border border-teal-500/20 shrink-0">
                            Mapped ({mappedAccounts['vendor_dr']?.code || 'PUR-101'})
                          </span>
                        )}
                      </div>
                      <span className="text-teal-400 font-bold font-mono">{formatCurrency(subtotal, country)}</span>
                    </div>

                    {/* Debit Input GST */}
                    <div className="flex justify-between items-center py-2 border-b border-white/5">
                      <div className="flex items-center gap-3">
                        <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold text-[10px]">Dr</span>
                        <span className="text-gray-200 font-bold">Input GST Credit Account (18%)</span>
                      </div>
                      <span className="text-amber-400 font-bold font-mono">{formatCurrency(totalTax, country)}</span>
                    </div>

                    {/* Credit Vendor Payable Line */}
                    <div className="flex flex-wrap justify-between items-center py-2 pl-6 gap-2">
                      <div className="flex items-center gap-3 flex-1 min-w-[280px]">
                        <span className="px-1.5 py-0.5 rounded bg-white/10 text-gray-400 font-bold text-[10px] shrink-0">Cr</span>
                        <select
                          value={mappedAccounts['vendor_cr']?.targetName || ''}
                          disabled={mappingLoading['vendor_cr']}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val) handleAccountMap('vendor_cr', true, val, 'vendor_ap');
                          }}
                          className="bg-[#1a1a1a] text-xs text-gray-200 border border-white/10 rounded px-2.5 py-1 focus:outline-none focus:border-teal-500 font-sans cursor-pointer hover:border-teal-500/50"
                        >
                          <option value="">-- Map Vendor Payable Account --</option>
                          <option value={`Accounts Payable — ${seller.name}`}>🏢 Accounts Payable — {seller.name}</option>
                          <option value="Primary Bank Operating Account">🏦 Primary Bank Operating Account</option>
                        </select>
                        {mappedAccounts['vendor_cr'] && (
                          <span className="text-[10px] text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded font-mono font-bold border border-teal-500/20 shrink-0">
                            Mapped ({mappedAccounts['vendor_cr']?.code || 'AP-301'})
                          </span>
                        )}
                      </div>
                      <span className="text-rose-400 font-bold font-mono">{formatCurrency(grandTotal, country)}</span>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Debit Line */}
                    <div className="flex flex-wrap justify-between items-center py-2 border-b border-white/5 gap-2">
                      <div className="flex items-center gap-3 flex-1 min-w-[280px]">
                        <span className="px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-300 font-bold text-[10px] shrink-0">Dr</span>
                        <select
                          value={mappedAccounts['sales_dr']?.targetName || ''}
                          disabled={mappingLoading['sales_dr']}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val) handleAccountMap('sales_dr', false, val, 'customer_ar');
                          }}
                          className="bg-[#1a1a1a] text-xs text-gray-200 border border-white/10 rounded px-2.5 py-1 focus:outline-none focus:border-teal-500 font-sans cursor-pointer hover:border-teal-500/50"
                        >
                          <option value="">-- Map Receivables Account --</option>
                          <option value={`Accounts Receivable — ${customer.name}`}>👤 Accounts Receivable — {customer.name}</option>
                          <option value="Primary Bank Operating Account">🏦 Primary Bank Operating Account</option>
                        </select>
                        {mappedAccounts['sales_dr'] && (
                          <span className="text-[10px] text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded font-mono font-bold border border-teal-500/20 shrink-0">
                            Mapped ({mappedAccounts['sales_dr']?.code || 'AR-101'})
                          </span>
                        )}
                      </div>
                      <span className="text-teal-400 font-bold font-mono">{formatCurrency(grandTotal, country)}</span>
                    </div>

                    {/* Credit Revenue Line */}
                    <div className="flex flex-wrap justify-between items-center py-2 border-b border-white/5 pl-6 gap-2">
                      <div className="flex items-center gap-3 flex-1 min-w-[280px]">
                        <span className="px-1.5 py-0.5 rounded bg-white/10 text-gray-400 font-bold text-[10px] shrink-0">Cr</span>
                        <select
                          value={mappedAccounts['sales_cr']?.targetName || ''}
                          disabled={mappingLoading['sales_cr']}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val) handleAccountMap('sales_cr', true, val, 'revenue');
                          }}
                          className="bg-[#1a1a1a] text-xs text-gray-200 border border-white/10 rounded px-2.5 py-1 focus:outline-none focus:border-teal-500 font-sans cursor-pointer hover:border-teal-500/50"
                        >
                          <option value="">-- Map Revenue Account --</option>
                          <option value="Sales Revenue Account">💰 Sales Revenue Account</option>
                          <option value="Consulting Revenue">📈 Consulting Revenue</option>
                          <option value="Software & SaaS Subscription Revenue">💻 Software & SaaS Subscription Revenue</option>
                        </select>
                        {mappedAccounts['sales_cr'] && (
                          <span className="text-[10px] text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded font-mono font-bold border border-teal-500/20 shrink-0">
                            Mapped ({mappedAccounts['sales_cr']?.code || 'REV-401'})
                          </span>
                        )}
                      </div>
                      <span className="text-gray-300 font-mono">{formatCurrency(subtotal, country)}</span>
                    </div>

                    {/* Credit GST Line */}
                    <div className="flex justify-between items-center py-2 pl-6">
                      <div className="flex items-center gap-3">
                        <span className="px-1.5 py-0.5 rounded bg-white/10 text-gray-400 font-bold text-[10px]">Cr</span>
                        <span className="text-gray-300 font-bold">Output GST Payable (18%)</span>
                      </div>
                      <span className="text-gray-300 font-mono">{formatCurrency(totalTax, country)}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Inventory Entry Card */}
            <div className="bg-[#141414] border border-white/10 rounded-xl overflow-hidden">
              <div className="px-4 py-2.5 bg-white/[0.03] border-b border-white/5 flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
                  {isVendorDoc ? 'Entry 2: Stock Receipt & Inventory Asset Entry' : 'Entry 2: Cost of Goods Sold & Inventory Asset Entry'}
                </span>
                <span className="text-[10px] text-gray-400 font-mono">Stock Movement</span>
              </div>
              
              <div className="p-4 space-y-2 text-xs font-mono">
                {isVendorDoc ? (
                  <>
                    {/* Debit Inventory */}
                    <div className="flex justify-between items-center py-1.5 border-b border-white/5">
                      <div className="flex items-center gap-3">
                        <span className="px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-bold text-[10px]">Dr</span>
                        <span className="text-gray-200 font-bold">Inventory Stock Asset Account</span>
                      </div>
                      <span className="text-indigo-400 font-bold">{formatCurrency(subtotal, country)}</span>
                    </div>

                    {/* Credit Clearing */}
                    <div className="flex justify-between items-center py-1.5 pl-6">
                      <div className="flex items-center gap-3">
                        <span className="px-1.5 py-0.5 rounded bg-white/10 text-gray-400 font-bold text-[10px]">Cr</span>
                        <span className="text-gray-300">Unbilled Inventory Clearing / Purchases</span>
                      </div>
                      <span className="text-gray-300">{formatCurrency(subtotal, country)}</span>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Debit COGS */}
                    <div className="flex justify-between items-center py-1.5 border-b border-white/5">
                      <div className="flex items-center gap-3">
                        <span className="px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-bold text-[10px]">Dr</span>
                        <span className="text-gray-200 font-bold">Cost of Goods Sold (COGS Expense)</span>
                      </div>
                      <span className="text-indigo-400 font-bold">{formatCurrency(estimatedCogs, country)}</span>
                    </div>

                    {/* Credit Inventory */}
                    <div className="flex justify-between items-center py-1.5 pl-6">
                      <div className="flex items-center gap-3">
                        <span className="px-1.5 py-0.5 rounded bg-white/10 text-gray-400 font-bold text-[10px]">Cr</span>
                        <span className="text-gray-300">Inventory Stock Asset Account</span>
                      </div>
                      <span className="text-gray-300">{formatCurrency(estimatedCogs, country)}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

          </div>
        </section>

        {/* 🌐 SECTION 3: UNIVERSAL ERP CONNECTOR FIELDS (6 SECTIONS) */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
              <BsBuilding className="text-teal-400" />
              Universal ERP Connector Dataset
            </h3>
            <span className="text-[10px] text-gray-400 font-mono">Tally • Zoho • SAP Ready</span>
          </div>

          <div className="space-y-4">
            
            {/* 1. INVOICE HEADER */}
            <div className="bg-[#141414] border border-white/5 rounded-xl p-4 space-y-3">
              <h4 className="text-xs font-bold text-teal-400 flex items-center gap-2">
                <BsReceipt size={14} /> 1. Invoice Header
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <p className="text-[10px] text-gray-400">Invoice Number</p>
                  <p className="font-bold text-white font-mono">{invoiceNo}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400">Invoice Date</p>
                  <p className="font-medium text-gray-200">{invoiceDate}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400">Due Date</p>
                  <p className="font-medium text-gray-200">{dueDate}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400">Invoice Type</p>
                  <p className="font-medium text-gray-200 uppercase">Tax Invoice</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400">Currency</p>
                  <p className="font-medium text-gray-200">INR (₹)</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400">Place of Supply</p>
                  <p className="font-medium text-gray-200">{placeOfSupply}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400">Reverse Charge</p>
                  <p className="font-medium text-gray-200">{reverseCharge}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400">Nature of Supply</p>
                  <p className="font-medium text-gray-200">{natureOfSupply}</p>
                </div>
              </div>
            </div>

            {/* 2. SELLER & 3. CUSTOMER */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* 2. SELLER */}
              <div className="bg-[#141414] border border-white/5 rounded-xl p-4 space-y-2 text-xs">
                <h4 className="text-xs font-bold text-gray-300 flex items-center gap-2 mb-2">
                  <BsBuilding className="text-gray-400" /> 2. Seller Information
                </h4>
                <div>
                  <p className="text-[10px] text-gray-400">Legal Name</p>
                  <p className="font-bold text-white">{seller.name}</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-[10px] text-gray-400">GSTIN</p>
                    <p className="font-mono text-teal-400">{seller.gstin}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400">PAN</p>
                    <p className="font-mono text-gray-300">{seller.pan}</p>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400">Address</p>
                  <p className="text-gray-300">{seller.address}</p>
                </div>
              </div>

              {/* 3. CUSTOMER / RECIPIENT */}
              <div className="bg-[#141414] border border-white/5 rounded-xl p-4 space-y-2 text-xs">
                <h4 className="text-xs font-bold text-teal-400 flex items-center gap-2 mb-2">
                  <BsPersonBadge size={14} /> {isVendorDoc ? '3. Buyer / Billed-To (Accounts Payable)' : '3. Customer (Accounts Receivable)'}
                </h4>
                <div className="flex justify-between">
                  <div>
                    <p className="text-[10px] text-gray-400">{isVendorDoc ? 'Buyer Name' : 'Customer Name'}</p>
                    <p className="font-bold text-white">{customer.name}</p>
                  </div>
                  <span className="text-[10px] font-mono text-gray-400 bg-white/5 px-2 py-0.5 rounded">{customer.customer_code}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-[10px] text-gray-400">GSTIN</p>
                    <p className="font-mono text-teal-400">{customer.gstin}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400">PAN</p>
                    <p className="font-mono text-gray-300">{customer.pan}</p>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400">Address</p>
                  <p className="text-gray-300">{customer.address}</p>
                </div>
              </div>

            </div>

            {/* 4. LINE ITEMS TABLE */}
            <div className="bg-[#141414] border border-white/5 rounded-xl p-4 space-y-3 overflow-hidden">
              <h4 className="text-xs font-bold text-gray-300 flex items-center gap-2">
                <BsBoxSeam size={14} className="text-gray-400" /> 4. Line Items Table ({items.length})
              </h4>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs divide-y divide-white/5">
                  <thead className="bg-white/[0.02] text-gray-400 font-semibold text-[10px] uppercase">
                    <tr>
                      <th className="py-2 px-2">Description</th>
                      <th className="py-2 px-2">HSN/SAC</th>
                      <th className="py-2 px-2 text-right">Qty</th>
                      <th className="py-2 px-2 text-right">Rate</th>
                      <th className="py-2 px-2 text-right">Taxable</th>
                      <th className="py-2 px-2 text-right">GST %</th>
                      <th className="py-2 px-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-gray-300">
                    {items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-white/[0.02]">
                        <td className="py-2.5 px-2 font-medium text-white">{item.description || item.item_name || 'Item'}</td>
                        <td className="py-2.5 px-2 font-mono text-gray-400">{item.hsn_sac || item.hsn || '9983'}</td>
                        <td className="py-2.5 px-2 text-right font-mono">{item.quantity || item.qty || 1} {item.unit || 'NOS'}</td>
                        <td className="py-2.5 px-2 text-right font-mono">{formatCurrency(item.rate || 0, country)}</td>
                        <td className="py-2.5 px-2 text-right font-mono text-gray-200">{formatCurrency(item.taxable_value || (item.rate * item.quantity) || 0, country)}</td>
                        <td className="py-2.5 px-2 text-right font-mono text-amber-400">{item.gst_rate || 18}%</td>
                        <td className="py-2.5 px-2 text-right font-mono font-bold text-white">{formatCurrency(item.total || (item.taxable_value * 1.18) || 0, country)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 5. TAX SUMMARY & 6. PAYMENT TERMS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* 5. TAX SUMMARY */}
              <div className="bg-[#141414] border border-white/5 rounded-xl p-4 space-y-2 text-xs">
                <h4 className="text-xs font-bold text-amber-400 flex items-center gap-2 mb-2">
                  <BsCalculator size={14} /> 5. Tax Summary Breakdown
                </h4>
                <div className="space-y-1.5 divide-y divide-white/5">
                  <div className="flex justify-between py-1 text-gray-400">
                    <span>Taxable Amount</span>
                    <span className="text-gray-200 font-mono">{formatCurrency(subtotal, country)}</span>
                  </div>
                  <div className="flex justify-between py-1 text-gray-400">
                    <span>CGST (9%)</span>
                    <span className="text-gray-200 font-mono">{formatCurrency(cgst, country)}</span>
                  </div>
                  <div className="flex justify-between py-1 text-gray-400">
                    <span>SGST (9%)</span>
                    <span className="text-gray-200 font-mono">{formatCurrency(sgst, country)}</span>
                  </div>
                  <div className="flex justify-between py-1 text-gray-400">
                    <span>IGST</span>
                    <span className="text-gray-200 font-mono">{formatCurrency(igst, country)}</span>
                  </div>
                  <div className="flex justify-between py-1.5 pt-2 text-white font-bold">
                    <span>Grand Total Payable</span>
                    <span className="text-teal-400 font-mono text-sm">{formatCurrency(grandTotal, country)}</span>
                  </div>
                </div>
              </div>

              {/* 6. PAYMENT TERMS */}
              <div className="bg-[#141414] border border-white/5 rounded-xl p-4 space-y-3 text-xs">
                <h4 className="text-xs font-bold text-teal-400 flex items-center gap-2 mb-2">
                  <BsCalendarCheck size={14} /> {isVendorDoc ? '6. Payment Terms & Payables' : '6. Payment Terms & Receivables'}
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[10px] text-gray-400">Credit Days</p>
                    <p className="font-bold text-white font-mono">30 Days</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400">Due Date</p>
                    <p className="font-bold text-white font-mono">{dueDate}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400">Payment Terms</p>
                    <p className="font-medium text-gray-200">Net 30 Days</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400">Advance Received</p>
                    <p className="font-bold text-green-400 font-mono">{formatCurrency(0, country)}</p>
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-teal-500/10 border border-teal-500/20 flex justify-between items-center">
                  <span className="text-[11px] font-bold text-teal-300">Balance Outstanding</span>
                  <span className="text-sm font-extrabold text-teal-400 font-mono">{formatCurrency(grandTotal, country)}</span>
                </div>
              </div>

            </div>

          </div>
        </section>

      </div>
    </div>
  );
}
