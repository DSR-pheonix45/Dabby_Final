import React from 'react';
import { BsLightningCharge, BsArrowRightShort } from 'react-icons/bs';
import { useWorkbench } from '../../../../context/WorkbenchContext';
import { formatCurrency } from '../../../../utils/currency';
import { financialRouting, ROUTING_TONE } from '../../../../utils/financialRouting';

export default function FinancialImpactTab({ doc, onUpdate }) {
  const { activeWorkbench } = useWorkbench();
  const note = doc?.di_analysis_notes?.[0] || doc?.analysis_notes?.[0];

  if (!note) {
    return <div className="p-8 text-center text-gray-500 text-sm">No analysis available. Run the document through analysis first.</div>;
  }

  // Canonical UFO (flattened columns) with legacy extracted_data fallback
  const legacy = note.extracted_data || {};
  const rawDocType = (note.document_type || note.classification_type || legacy.document_type || 'vendor_invoice').toLowerCase();
  
  const money = note.money || {};
  const taxes = note.taxes || {};
  const total = Number(money.total_amount ?? money.subtotal ?? legacy.total_amount ?? 0);
  const tax = Number(taxes.total_tax ?? legacy.tax_amount ?? 0);
  const net = Number(money.subtotal ?? legacy.subtotal ?? (total > tax ? total - tax : total));
  
  const parties = note.parties || {};
  const vendorName = parties.issuer?.name || legacy.parties?.vendor?.value || legacy.parties?.vendor_name || 'Vendor';
  const customerName = parties.recipient?.name || legacy.parties?.customer?.value || legacy.parties?.customer_name || activeWorkbench?.name || 'Customer';
  
  const routing = financialRouting(rawDocType, null, vendorName);

  // Accounting Classification Logic
  const isVendorDoc = rawDocType.includes('vendor') || rawDocType.includes('purchase') || rawDocType.includes('bill') || rawDocType.includes('opex') || rawDocType.includes('cogs');
  const isSalesDoc = rawDocType.includes('sales') || rawDocType.includes('tax_invoice') || rawDocType.includes('customer_billed');
  const isCustomerPayment = rawDocType.includes('customer_payment') || rawDocType.includes('receipt');
  const isVendorPayment = rawDocType.includes('vendor_payment') || rawDocType.includes('payment_advice');

  // Compute Dynamic Financial Impact
  const computedImpact = [];
  const computedEvents = [];
  const computedJournal = [];

  if (isVendorDoc) {
    computedEvents.push('Vendor Invoice Received', 'Expense / Purchase Incurred');
    computedImpact.push(
      { account: 'Operating Expense / Purchases', amount: net, category: 'expense', displayType: 'Expense Incurred' },
      { account: `Accounts Payable (${vendorName})`, amount: total, category: 'liability', displayType: 'Payable (Owed to Vendor)' }
    );
    computedJournal.push(
      { account: 'Operating Expense / Purchase Account', type: 'debit', amount: net },
      ...(tax > 0 ? [{ account: 'Input GST Tax Credit', type: 'debit', amount: tax }] : []),
      { account: `Trade Creditors / Accounts Payable (${vendorName})`, type: 'credit', amount: total }
    );
  } else if (isSalesDoc) {
    computedEvents.push('Sales Invoice Issued', 'Revenue Earned');
    computedImpact.push(
      { account: `Accounts Receivable (${customerName})`, amount: total, category: 'asset', displayType: 'Receivable (Owed by Customer)' },
      { account: 'Sales Revenue', amount: net, category: 'revenue', displayType: 'Revenue Earned' }
    );
    computedJournal.push(
      { account: `Trade Debtors / Accounts Receivable (${customerName})`, type: 'debit', amount: total },
      { account: 'Sales Operating Revenue', type: 'credit', amount: net },
      ...(tax > 0 ? [{ account: 'Output GST Tax Payable', type: 'credit', amount: tax }] : [])
    );
  } else if (isCustomerPayment) {
    computedEvents.push('Customer Payment Received');
    computedImpact.push(
      { account: 'Operating Bank Account', amount: total, category: 'asset', displayType: 'Cash Inflow' },
      { account: 'Accounts Receivable (Customer)', amount: total, category: 'settlement', displayType: 'Receivable Settled' }
    );
    computedJournal.push(
      { account: 'Operating Bank Account', type: 'debit', amount: total },
      { account: 'Trade Debtors / Accounts Receivable', type: 'credit', amount: total }
    );
  } else if (isVendorPayment) {
    computedEvents.push('Vendor Payment Made');
    computedImpact.push(
      { account: 'Accounts Payable (Vendor)', amount: total, category: 'settlement', displayType: 'Liability Settled' },
      { account: 'Operating Bank Account', amount: total, category: 'liability', displayType: 'Cash Outflow' }
    );
    computedJournal.push(
      { account: 'Trade Creditors / Accounts Payable', type: 'debit', amount: total },
      { account: 'Operating Bank Account', type: 'credit', amount: total }
    );
  } else {
    // Fallback
    computedEvents.push('Document Event Recorded');
    computedImpact.push({ account: 'Financial Amount', amount: total, category: 'expense', displayType: 'Document Entry' });
    computedJournal.push(
      { account: 'Document Entry', type: 'debit', amount: total },
      { account: 'Clearing Entry', type: 'credit', amount: total }
    );
  }

  const country = activeWorkbench?.country || 'INR';

  return (
    <div className="flex flex-col h-full bg-[#111111] text-white">
      <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">

        {/* 1. ROUTING OVERVIEW */}
        <section>
          <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">Target Workflow Routing</h3>
          <div className={`flex items-center justify-between rounded-xl border p-5 ${ROUTING_TONE[routing.tone]}`}>
            <div>
              <p className="text-[10px] uppercase tracking-wider opacity-70 font-bold mb-1">Posts To Workflow</p>
              <p className="text-lg font-bold flex items-center gap-1">
                <BsArrowRightShort className="text-xl -ml-1" />
                {routing.where}
              </p>
              <p className="text-xs opacity-70 mt-0.5">{routing.hint}</p>
            </div>
            <div className="text-right">
              <span className="px-2.5 py-1 rounded-lg text-xs font-bold border border-current/30">{routing.label}</span>
              <p className="text-lg font-bold mt-2">{formatCurrency(total, country)}</p>
            </div>
          </div>
        </section>

        {/* 2. TAX & AMOUNT BREAKDOWN */}
        {tax > 0 && (
          <section>
            <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">Amount & Tax Breakdown</h3>
            <div className="bg-[#161616] border border-white/5 rounded-xl divide-y divide-white/5">
              <div className="flex justify-between px-5 py-3 text-sm">
                <span className="text-gray-400">Taxable Value</span>
                <span className="text-gray-200 font-semibold font-mono">{formatCurrency(net, country)}</span>
              </div>
              <div className="flex justify-between px-5 py-3 text-sm">
                <span className="text-gray-400">Tax (GST)</span>
                <span className="text-amber-400 font-semibold font-mono">{formatCurrency(tax, country)}</span>
              </div>
              <div className="flex justify-between px-5 py-3 text-sm bg-white/[0.02]">
                <span className="text-gray-300 font-bold">Grand Total</span>
                <span className="text-teal-400 font-bold font-mono">{formatCurrency(total, country)}</span>
              </div>
            </div>
          </section>
        )}

        {/* 3. DYNAMIC FINANCIAL IMPACT */}
        <section>
          <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">Financial Impact Analysis</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {computedImpact.map((impact, idx) => {
              let colorStyle = 'text-teal-400';
              let signPrefix = '+ ';
              let badgeText = impact.displayType;

              if (impact.category === 'liability') {
                colorStyle = 'text-amber-400';
                signPrefix = '- '; // Debt / Owed
              } else if (impact.category === 'expense') {
                colorStyle = 'text-rose-400';
                signPrefix = 'Cost: ';
              } else if (impact.category === 'settlement') {
                colorStyle = 'text-blue-400';
                signPrefix = 'Settled: ';
              }

              return (
                <div key={idx} className="bg-[#161616] border border-white/5 rounded-xl p-4 flex flex-col justify-between space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-200 truncate">{impact.account}</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-white/5 text-gray-400 border border-white/5">{badgeText}</span>
                  </div>
                  <div className={`text-base font-extrabold font-mono ${colorStyle}`}>
                    {signPrefix}{formatCurrency(impact.amount, country)}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 4. BUSINESS EVENTS TRIGGERED */}
        <section>
          <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">Business Events Triggered</h3>
          <div className="flex flex-wrap gap-2">
            {computedEvents.map((event, idx) => (
              <div key={idx} className="flex items-center gap-2 bg-teal-500/10 border border-teal-500/20 text-teal-400 px-3 py-1.5 rounded-lg text-xs font-bold">
                <BsLightningCharge />
                {event}
              </div>
            ))}
          </div>
        </section>

        {/* 5. EXPECTED JOURNAL ENTRY */}
        <section>
          <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">Expected Journal Entry Preview</h3>
          <div className="bg-[#161616] border border-white/5 rounded-xl overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/5 text-[10px] font-bold text-gray-500 uppercase tracking-widest bg-white/[0.02]">
                  <th className="p-3">Account</th>
                  <th className="p-3 text-right">Debit ({country})</th>
                  <th className="p-3 text-right">Credit ({country})</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {computedJournal.map((entry, idx) => (
                  <tr key={idx} className="text-gray-300">
                    <td className={`p-3 text-xs font-medium ${entry.type === 'credit' ? 'pl-8 text-gray-400' : 'text-white'}`}>
                      <span className={`text-[10px] font-mono font-bold mr-2 px-1.5 py-0.5 rounded ${entry.type === 'debit' ? 'bg-teal-500/10 text-teal-400' : 'bg-rose-500/10 text-rose-400'}`}>
                        {entry.type === 'debit' ? 'Dr' : 'Cr'}
                      </span>
                      {entry.account}
                    </td>
                    <td className="p-3 text-right font-mono text-xs font-bold text-emerald-400">
                      {entry.type === 'debit' ? formatCurrency(entry.amount, country) : '-'}
                    </td>
                    <td className="p-3 text-right font-mono text-xs font-bold text-purple-300">
                      {entry.type === 'credit' ? formatCurrency(entry.amount, country) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

      </div>
    </div>
  );
}
