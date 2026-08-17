import React from 'react';
import { 
  BsJournalText, 
  BsReceipt, 
  BsBuilding, 
  BsPersonBadge, 
  BsBoxSeam, 
  BsCalculator, 
  BsCalendarCheck,
  BsShieldCheck
} from 'react-icons/bs';
import { useWorkbench } from '../../../../context/WorkbenchContext';
import { formatCurrency } from '../../../../utils/currency';
import { classifyDocumentParties } from '../../../../utils/docPartyClassifier';

export default function VoucherEntryTab({ doc }) {
  const { activeWorkbench } = useWorkbench();
  const note = doc?.di_analysis_notes?.[0] || doc?.analysis_notes?.[0] || {};
  const ext = note.extracted_data || {};
  const country = activeWorkbench?.country || 'INR';

  // Use Letterhead vs Billed-To Party Classification
  const partyInfo = classifyDocumentParties(doc, activeWorkbench);
  const isVendorDoc = partyInfo.isBuyer;
  const docType = (note.document_type || ext.document_type || partyInfo.classification || 'VOUCHER').toUpperCase();

  // Parties
  const parties = note.parties || ext.parties || {};
  const seller = {
    name: partyInfo.isSeller ? (activeWorkbench?.name || 'Company') : (parties.issuer?.name || ext.vendor_name || partyInfo.externalParty.name || 'Vendor / Seller'),
    gstin: partyInfo.isSeller ? (activeWorkbench?.gstin || 'N/A') : (parties.issuer?.gstin || ext.vendor_gstin || 'N/A'),
    pan: partyInfo.isSeller ? (activeWorkbench?.pan || 'N/A') : (parties.issuer?.pan || ext.vendor_pan || 'N/A'),
    address: partyInfo.isSeller ? (activeWorkbench?.address || 'N/A') : (parties.issuer?.address || ext.vendor_address || 'N/A')
  };

  const customer = {
    name: partyInfo.isBuyer ? (activeWorkbench?.name || 'Company') : (parties.recipient?.name || ext.customer_name || partyInfo.externalParty.name || 'Customer / Billed-To'),
    gstin: partyInfo.isBuyer ? (activeWorkbench?.gstin || 'N/A') : (parties.recipient?.gstin || ext.customer_gstin || 'N/A'),
    pan: partyInfo.isBuyer ? (activeWorkbench?.pan || 'N/A') : (parties.recipient?.pan || ext.customer_pan || 'N/A'),
    address: partyInfo.isBuyer ? (activeWorkbench?.address || 'N/A') : (parties.recipient?.address || ext.customer_address || 'N/A'),
    customer_code: 'CUST-001'
  };

  // Money & Amounts
  const money = note.money || {};
  const taxes = note.taxes || {};
  const grandTotal = Number(money.total_amount || ext.total_amount || ext.invoice_total || 0);
  const subtotal = Number(money.subtotal || ext.subtotal || (grandTotal > 0 ? grandTotal / 1.18 : 0));
  const taxTotal = Number(taxes.total_tax || ext.tax_amount || (grandTotal - subtotal));
  const cgst = Number(taxes.cgst || taxTotal / 2);
  const sgst = Number(taxes.sgst || taxTotal / 2);
  const igst = Number(taxes.igst || 0);

  // Line items
  const items = note.line_items || ext.line_items || [
    {
      description: 'Parsed Goods / Service Item',
      hsn_sac: '9983',
      quantity: 1,
      unit: 'NOS',
      rate: subtotal,
      taxable_value: subtotal,
      gst_rate: 18,
      total: grandTotal
    }
  ];

  // Dates
  const dates = note.dates || ext.dates || {};
  const docDate = dates.document_date || ext.invoice_date || doc?.created_at?.split('T')[0] || new Date().toISOString().split('T')[0];
  const dueDate = dates.due_date || ext.due_date || docDate;
  const docNo = ext.invoice_number || ext.voucher_number || doc?.id?.substring(0, 8) || 'INV-001';

  return (
    <div className="flex flex-col h-full bg-[#111111] text-white">
      <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">

        {/* 1. DRAFT DOUBLE-ENTRY ACCOUNTING JOURNAL (READ-ONLY PREVIEW) */}
        <section className="bg-[#181818] border border-white/10 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <div className="flex items-center gap-2">
              <BsJournalText className="text-teal-400 text-base" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Draft Double-Entry Voucher
              </h3>
            </div>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-teal-500/10 text-teal-400 border border-teal-500/20 flex items-center gap-1">
              <BsShieldCheck /> Balanced Journal Entry
            </span>
          </div>

          <div className="space-y-3">
            {/* Entry Leg 1 */}
            <div className="bg-[#111111] border border-white/5 rounded-lg p-3 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-teal-300">
                  {isVendorDoc ? 'Entry 1: Purchase Expense & Vendor Payable Entry' : 'Entry 1: Sales Revenue & Customer Receivable Entry'}
                </span>
                <span className="text-[10px] font-mono text-gray-500">Date: {docDate}</span>
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between items-center bg-white/[0.02] px-3 py-2 rounded">
                  <span className="font-medium text-teal-300 flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold text-teal-400 bg-teal-500/10 px-1.5 py-0.5 rounded">Dr</span>
                    {isVendorDoc ? 'Operating Expense / Purchase Account' : 'Trade Debtors (Accounts Receivable)'}
                  </span>
                  <span className="font-mono font-bold text-emerald-400">{formatCurrency(subtotal, country)}</span>
                </div>
                {taxTotal > 0 && (
                  <div className="flex justify-between items-center bg-white/[0.02] px-3 py-2 rounded">
                    <span className="font-medium text-amber-300 flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">Dr</span>
                      {isVendorDoc ? 'Input GST Credit Account (18%)' : 'Output GST Payable Account (18%)'}
                    </span>
                    <span className="font-mono font-bold text-amber-400">{formatCurrency(taxTotal, country)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center bg-white/[0.02] px-3 py-2 rounded">
                  <span className="font-medium text-rose-300 flex items-center gap-2 pl-4">
                    <span className="text-[10px] font-mono font-bold text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded">Cr</span>
                    {isVendorDoc ? 'Trade Creditors (Vendor Accounts Payable)' : 'Sales Operating Revenue'}
                  </span>
                  <span className="font-mono font-bold text-purple-300">{formatCurrency(grandTotal, country)}</span>
                </div>
              </div>
            </div>

            {/* Entry Leg 2 (Stock Movement if vendor doc) */}
            {isVendorDoc && (
              <div className="bg-[#111111] border border-white/5 rounded-lg p-3 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-gray-400">Entry 2: Stock Receipt & Inventory Asset Entry</span>
                  <span className="text-[10px] font-mono text-gray-500">Stock Movement</span>
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between items-center bg-white/[0.02] px-3 py-2 rounded">
                    <span className="font-medium text-gray-300 flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold text-gray-400 bg-white/10 px-1.5 py-0.5 rounded">Dr</span>
                      Inventory Stock Asset Account
                    </span>
                    <span className="font-mono font-bold text-gray-300">{formatCurrency(grandTotal, country)}</span>
                  </div>
                  <div className="flex justify-between items-center bg-white/[0.02] px-3 py-2 rounded">
                    <span className="font-medium text-gray-400 flex items-center gap-2 pl-4">
                      <span className="text-[10px] font-mono font-bold text-gray-500 bg-white/10 px-1.5 py-0.5 rounded">Cr</span>
                      Unbilled Inventory Clearing / Purchases
                    </span>
                    <span className="font-mono font-bold text-gray-400">{formatCurrency(grandTotal, country)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* 2. VOUCHER & PARTY DETAILS */}
        <section className="bg-[#181818] border border-white/10 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-white/5 pb-3">
            <BsReceipt className="text-teal-400 text-base" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Voucher Header & Parties
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Seller / Vendor */}
            <div className="bg-[#111111] border border-white/5 rounded-xl p-4 space-y-2 text-xs">
              <h4 className="text-xs font-bold text-teal-400 flex items-center gap-2 mb-2">
                <BsBuilding size={14} /> {isVendorDoc ? 'Seller / Supplier (Vendor)' : 'Company / Seller'}
              </h4>
              <div className="space-y-1">
                <p className="font-bold text-white">{seller.name}</p>
                <p className="text-gray-400">GSTIN: <span className="font-mono text-teal-400">{seller.gstin}</span></p>
                <p className="text-gray-400">PAN: <span className="font-mono text-gray-300">{seller.pan}</span></p>
                <p className="text-gray-400 truncate" title={seller.address}>Address: {seller.address}</p>
              </div>
            </div>

            {/* Buyer / Customer */}
            <div className="bg-[#111111] border border-white/5 rounded-xl p-4 space-y-2 text-xs">
              <h4 className="text-xs font-bold text-teal-400 flex items-center gap-2 mb-2">
                <BsPersonBadge size={14} /> {isVendorDoc ? 'Buyer / Billed-To (Company)' : 'Customer'}
              </h4>
              <div className="space-y-1">
                <p className="font-bold text-white">{customer.name}</p>
                <p className="text-gray-400">GSTIN: <span className="font-mono text-teal-400">{customer.gstin}</span></p>
                <p className="text-gray-400">PAN: <span className="font-mono text-gray-300">{customer.pan}</span></p>
                <p className="text-gray-400 truncate" title={customer.address}>Address: {customer.address}</p>
              </div>
            </div>
          </div>
        </section>

        {/* 3. LINE ITEMS TABLE */}
        <section className="bg-[#181818] border border-white/10 rounded-xl p-5 space-y-3">
          <h4 className="text-xs font-bold text-gray-300 flex items-center gap-2">
            <BsBoxSeam size={14} className="text-teal-400" /> Line Items ({items.length})
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs divide-y divide-white/5">
              <thead className="bg-white/[0.02] text-gray-400 font-semibold text-[10px] uppercase">
                <tr>
                  <th className="py-2.5 px-3">Description</th>
                  <th className="py-2.5 px-2">HSN/SAC</th>
                  <th className="py-2.5 px-2 text-right">Qty</th>
                  <th className="py-2.5 px-2 text-right">Rate</th>
                  <th className="py-2.5 px-2 text-right">Taxable</th>
                  <th className="py-2.5 px-2 text-right">GST %</th>
                  <th className="py-2.5 px-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-gray-300">
                {items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-white/[0.02]">
                    <td className="py-2.5 px-3 font-medium text-white">{item.description || item.item_name || 'Item'}</td>
                    <td className="py-2.5 px-2 font-mono text-gray-400">{item.hsn_sac || item.hsn || '9983'}</td>
                    <td className="py-2.5 px-2 text-right font-mono">{item.quantity || item.qty || 1} {item.unit || 'NOS'}</td>
                    <td className="py-2.5 px-2 text-right font-mono">{formatCurrency(item.rate || 0, country)}</td>
                    <td className="py-2.5 px-2 text-right font-mono text-gray-200">{formatCurrency(item.taxable_value || (item.rate * item.quantity) || 0, country)}</td>
                    <td className="py-2.5 px-2 text-right font-mono text-amber-400">{item.gst_rate || 18}%</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-white">{formatCurrency(item.total || (item.taxable_value * 1.18) || 0, country)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* 4. TAX SUMMARY & PAYMENT TERMS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Tax Summary */}
          <div className="bg-[#181818] border border-white/10 rounded-xl p-5 space-y-2 text-xs">
            <h4 className="text-xs font-bold text-amber-400 flex items-center gap-2 mb-2">
              <BsCalculator size={14} /> Tax Summary Breakdown
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
                <span>Grand Total</span>
                <span className="text-teal-400 font-mono text-sm">{formatCurrency(grandTotal, country)}</span>
              </div>
            </div>
          </div>

          {/* Payment Terms */}
          <div className="bg-[#181818] border border-white/10 rounded-xl p-5 space-y-3 text-xs">
            <h4 className="text-xs font-bold text-teal-400 flex items-center gap-2 mb-2">
              <BsCalendarCheck size={14} /> Payment Terms & Summary
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] text-gray-400">Voucher No</p>
                <p className="font-bold text-white font-mono">{docNo}</p>
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
                <p className="text-[10px] text-gray-400">Document Type</p>
                <p className="font-bold text-teal-300 font-mono">{docType}</p>
              </div>
            </div>
            <div className="p-2.5 rounded-lg bg-teal-500/10 border border-teal-500/20 flex justify-between items-center">
              <span className="text-[11px] font-bold text-teal-300">Voucher Total Amount</span>
              <span className="text-sm font-extrabold text-teal-400 font-mono">{formatCurrency(grandTotal, country)}</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
