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
  BsDiagram3
} from 'react-icons/bs';
import { useWorkbench } from '../../../../context/WorkbenchContext';
import { formatCurrency } from '../../../../utils/currency';

export default function VoucherEntryTab({ doc }) {
  const { activeWorkbench } = useWorkbench();

  const note = doc?.di_analysis_notes?.[0] || {};
  const ufo = note.extracted_data || {};
  
  // Flattened UFO properties with fallback
  const rawDocType = note.document_type || ufo.document_type || 'sales_invoice';
  const docTypeStr = (typeof rawDocType === 'object' ? rawDocType?.value : rawDocType) || 'sales_invoice';
  const lowerDocType = docTypeStr.toLowerCase();
  
  const isVendorDoc = lowerDocType.includes('vendor') || lowerDocType.includes('bill') || lowerDocType.includes('purchase');
  const isBankStatement = lowerDocType.includes('bank_statement') || lowerDocType.includes('bank statement') || lowerDocType.includes('passbook') || lowerDocType.includes('statement');

  const money = note.money || ufo.financials || {};
  const taxes = note.taxes || {};
  const dates = note.dates || ufo.document_metadata || ufo.document || {};
  const parties = note.parties || ufo.parties || {};
  const lineItems = (note.line_items && note.line_items.length > 0) ? note.line_items : (ufo.line_items || []);

  // Currency & Values
  const country = activeWorkbench?.country || 'India';
  const grandTotal = Number(money.total_amount ?? money.grand_total ?? money.subtotal ?? 59000);
  const totalTax = Number(taxes.total_tax ?? money.tax_amount ?? (grandTotal * 0.18 / 1.18));
  const subtotal = Number(money.subtotal ?? money.taxable_amount ?? (grandTotal - totalTax));
  const cgst = Number(taxes.cgst ?? (totalTax / 2));
  const sgst = Number(taxes.sgst ?? (totalTax / 2));
  const igst = Number(taxes.igst ?? 0);

  // Header Details
  const invoiceNo = dates.invoice_number || dates.invoice_no || ufo.invoice_number || 'INV-1024';
  const invoiceDate = dates.document_date || dates.invoice_date || dates.date || '2026-07-26';
  const dueDate = dates.due_date || '2026-08-25';
  const placeOfSupply = dates.place_of_supply || 'Maharashtra (27)';
  const reverseCharge = dates.reverse_charge ? 'Yes' : 'No';
  const natureOfSupply = dates.nature_of_supply || 'B2B Taxable Supply';

  // Parties
  const seller = parties.issuer || parties.seller || parties.vendor || {
    name: 'Wetacre Sustainable Solutions Private Limited',
    gstin: '27AAACA0000A1Z5',
    pan: 'AAACA0000A',
    address: '105, Prism Industrial Estate, Dombivli East, Maharashtra 421201',
    state_code: '27',
    bank_details: 'Axis Bank • A/C 920010050010754'
  };

  const customer = parties.recipient || parties.customer || parties.buyer || {
    name: 'Datalis Private Limited',
    customer_code: 'CUST-8841',
    gstin: '27BBBCA1111B1Z2',
    address: 'Plot 42, MIDC Industrial Area, Andheri East, Mumbai 400093',
    state: 'Maharashtra',
    country: 'India',
    pan: 'BBBCA1111B'
  };

  // Default demonstration line items if none extracted
  const items = lineItems.length > 0 ? lineItems : [
    {
      description: 'Cloud Subscription & License',
      sku: 'SKU-CS-10',
      hsn_sac: '998313',
      quantity: 10,
      unit: 'NOS',
      rate: 5000,
      discount: 0,
      taxable_value: 50000,
      gst_rate: 18,
      cgst: 4500,
      sgst: 4500,
      igst: 0,
      total: 59000
    }
  ];

  // Calculated inventory & COGS estimates
  const totalQty = items.reduce((acc, item) => acc + (Number(item.quantity) || 1), 0);
  const estimatedCogs = Math.round(subtotal * 0.65); // 65% estimated COGS

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

          {/* 📑 SECTION 2: DERIVED VOUCHERS TABLE */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                <BsFileEarmarkSpreadsheet className="text-blue-400" />
                Derived Transaction Vouchers ({transactions.length})
              </h3>
              <span className="text-[10px] text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded font-mono font-bold">Auto-Derived</span>
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
                      <th className="py-2.5 px-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-gray-300">
                    {transactions.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-gray-500">No bank transactions extracted yet.</td>
                      </tr>
                    ) : (
                      transactions.map((tx, idx) => {
                        const isCredit = Number(tx.credit_amount || tx.credit || 0) > 0;
                        const amt = isCredit ? Number(tx.credit_amount || tx.credit) : Number(tx.debit_amount || tx.debit || 0);
                        const vType = isCredit ? 'Receipt Voucher' : 'Payment Voucher';
                        
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
                              {isCredit ? (
                                <span><strong className="text-teal-400">Dr Bank</strong> / Cr Accounts Receivable</span>
                              ) : (
                                <span><strong className="text-rose-400">Dr Expense/AP</strong> / Cr Bank</span>
                              )}
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
                  {isVendorDoc ? 'Purchase / Vendor Voucher Entry' : 'Sales Voucher Entry'}
                </h2>
                <span className="bg-teal-500/10 text-teal-400 text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded border border-teal-500/20">
                  {docTypeStr.replace('_', ' ')}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Records: <span className="text-teal-300 font-medium">
                  {isVendorDoc ? '"We purchased goods/services from a vendor."' : '"We sold goods/services to a customer."'}
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
                  {isVendorDoc ? '1. Expense' : '1. Revenue'}
                </span>
                <BsArrowUpRight className="text-green-400 text-xs" />
              </div>
              <div>
                <p className="text-[11px] text-gray-300 font-medium">
                  {isVendorDoc ? 'Operating Expense' : 'Sales Income'}
                </p>
                <p className="text-sm font-extrabold text-green-400 mt-0.5">+{formatCurrency(subtotal, country)}</p>
              </div>
            </div>

            {/* 2. Vendor (AP) / Customer (AR) */}
            <div className="p-3.5 bg-[#161616] border border-white/5 rounded-xl flex flex-col justify-between hover:border-teal-500/30 transition-colors group">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  {isVendorDoc ? '2. Vendor (AP)' : '2. Customer (AR)'}
                </span>
                <BsArrowUpRight className={isVendorDoc ? 'text-rose-400 text-xs' : 'text-teal-400 text-xs'} />
              </div>
              <div>
                <p className="text-[11px] text-gray-300 font-medium">
                  {isVendorDoc ? 'We Owe Vendor' : 'Customer Owes'}
                </p>
                <p className={`text-sm font-extrabold mt-0.5 ${isVendorDoc ? 'text-rose-400' : 'text-teal-400'}`}>
                  +{formatCurrency(grandTotal, country)}
                </p>
              </div>
            </div>

            {/* 3. Tax Liability / Credit */}
            <div className="p-3.5 bg-[#161616] border border-white/5 rounded-xl flex flex-col justify-between hover:border-teal-500/30 transition-colors group">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  {isVendorDoc ? '3. Input GST' : '3. Output GST'}
                </span>
                <BsArrowUpRight className="text-amber-400 text-xs" />
              </div>
              <div>
                <p className="text-[11px] text-gray-300 font-medium">
                  {isVendorDoc ? 'Input Tax Credit' : 'Tax Payable'}
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
                  {isVendorDoc ? 'Stock Increases' : 'Stock Decreases'}
                </p>
                <p className={`text-sm font-extrabold mt-0.5 ${isVendorDoc ? 'text-teal-400' : 'text-rose-400'}`}>
                  {isVendorDoc ? `+${totalQty} Units` : `-${totalQty} Units`}
                </p>
              </div>
            </div>

            {/* 5. COGS / Accrual */}
            <div className="p-3.5 bg-[#161616] border border-white/5 rounded-xl flex flex-col justify-between hover:border-teal-500/30 transition-colors group">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  {isVendorDoc ? '5. Payable Liability' : '5. COGS'}
                </span>
                <BsArrowUpRight className="text-indigo-400 text-xs" />
              </div>
              <div>
                <p className="text-[11px] text-gray-300 font-medium">
                  {isVendorDoc ? 'Accrued Payable' : 'Cost Expense'}
                </p>
                <p className="text-sm font-extrabold text-indigo-400 mt-0.5">
                  +{formatCurrency(isVendorDoc ? grandTotal : estimatedCogs, country)}
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
                  {isVendorDoc ? 'Entry 1: Purchase Expense & Vendor Payable Entry' : 'Entry 1: Revenue & Receivables Entry'}
                </span>
                <span className="text-[10px] text-gray-400 font-mono">Invoice Date: {invoiceDate}</span>
              </div>
              
              <div className="p-4 space-y-2 text-xs font-mono">
                {isVendorDoc ? (
                  <>
                    {/* Debit Expense */}
                    <div className="flex justify-between items-center py-1.5 border-b border-white/5">
                      <div className="flex items-center gap-3">
                        <span className="px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-300 font-bold text-[10px]">Dr</span>
                        <span className="text-gray-200 font-bold">Operating Expense / Purchase Account</span>
                      </div>
                      <span className="text-teal-400 font-bold">{formatCurrency(subtotal, country)}</span>
                    </div>

                    {/* Debit Input GST */}
                    <div className="flex justify-between items-center py-1.5 border-b border-white/5">
                      <div className="flex items-center gap-3">
                        <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold text-[10px]">Dr</span>
                        <span className="text-gray-200 font-bold">Input GST Credit Account (18%)</span>
                      </div>
                      <span className="text-amber-400 font-bold">{formatCurrency(totalTax, country)}</span>
                    </div>

                    {/* Credit Vendor Payable Line */}
                    <div className="flex justify-between items-center py-1.5 pl-6">
                      <div className="flex items-center gap-3">
                        <span className="px-1.5 py-0.5 rounded bg-white/10 text-gray-400 font-bold text-[10px]">Cr</span>
                        <span className="text-gray-300 font-bold">Accounts Payable — {seller.name}</span>
                      </div>
                      <span className="text-rose-400 font-bold">{formatCurrency(grandTotal, country)}</span>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Debit Line */}
                    <div className="flex justify-between items-center py-1.5 border-b border-white/5">
                      <div className="flex items-center gap-3">
                        <span className="px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-300 font-bold text-[10px]">Dr</span>
                        <span className="text-gray-200 font-bold">Accounts Receivable — {customer.name}</span>
                      </div>
                      <span className="text-teal-400 font-bold">{formatCurrency(grandTotal, country)}</span>
                    </div>

                    {/* Credit Revenue Line */}
                    <div className="flex justify-between items-center py-1.5 border-b border-white/5 pl-6">
                      <div className="flex items-center gap-3">
                        <span className="px-1.5 py-0.5 rounded bg-white/10 text-gray-400 font-bold text-[10px]">Cr</span>
                        <span className="text-gray-300">Sales Revenue Account</span>
                      </div>
                      <span className="text-gray-300">{formatCurrency(subtotal, country)}</span>
                    </div>

                    {/* Credit GST Line */}
                    <div className="flex justify-between items-center py-1.5 pl-6">
                      <div className="flex items-center gap-3">
                        <span className="px-1.5 py-0.5 rounded bg-white/10 text-gray-400 font-bold text-[10px]">Cr</span>
                        <span className="text-gray-300">Output GST Payable (18%)</span>
                      </div>
                      <span className="text-gray-300">{formatCurrency(totalTax, country)}</span>
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
