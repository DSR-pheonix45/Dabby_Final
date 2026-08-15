import React, { useState } from 'react';
import { SALE_TYPES, salesService } from '../../../../services/salesService';
import { toast } from 'react-hot-toast';
import { 
  BsX, 
  BsPlusLg, 
  BsTrash, 
  BsCartCheck, 
  BsReceipt, 
  BsShop, 
  BsCalendarEvent, 
  BsBagCheck, 
  BsBuilding,
  BsLightningCharge,
  BsCheck2Circle
} from 'react-icons/bs';

export default function RecordSaleModal({ isOpen, onClose, workbenchId, onSaleRecorded, savedParties = [] }) {
  const [selectedType, setSelectedType] = useState('pos');
  const [customerName, setCustomerName] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]);
  const [refNumber, setRefNumber] = useState('');
  const [paymentAccount, setPaymentAccount] = useState('HDFC Bank Main');
  const [paymentMethod, setPaymentMethod] = useState('UPI / Cash');

  // Marketplace fields
  const [grossSales, setGrossSales] = useState(50000);
  const [commission, setCommission] = useState(5000);
  const [platformFees, setPlatformFees] = useState(1000);
  const [shippingCharges, setShippingCharges] = useState(1200);

  // Line items
  const [items, setItems] = useState([
    { name: 'Standard Product / Service', quantity: 1, rate: 5000, discount: 0, taxRate: 18, is_inventory: true }
  ]);

  if (!isOpen) return null;

  const handleAddItem = () => {
    setItems(prev => [...prev, { name: '', quantity: 1, rate: 0, discount: 0, taxRate: 18, is_inventory: true }]);
  };

  const handleRemoveItem = (index) => {
    if (items.length <= 1) return;
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index, field, value) => {
    setItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  // Compute calculated line totals
  const computedItems = items.map(item => {
    const qty = Number(item.quantity) || 1;
    const rate = Number(item.rate) || 0;
    const disc = Number(item.discount) || 0;
    const taxRate = Number(item.taxRate) || 0;

    const lineSubtotal = Math.max(0, (qty * rate) - disc);
    const lineTax = (lineSubtotal * taxRate) / 100;
    const lineTotal = lineSubtotal + lineTax;

    return {
      ...item,
      quantity: qty,
      rate: rate,
      discount: disc,
      tax: lineTax,
      total: lineTotal
    };
  });

  const subtotal = computedItems.reduce((s, i) => s + (i.quantity * i.rate - i.discount), 0);
  const discountTotal = computedItems.reduce((s, i) => s + i.discount, 0);
  const taxTotal = computedItems.reduce((s, i) => s + i.tax, 0);
  
  let grandTotal = subtotal + taxTotal;
  if (selectedType === 'marketplace') {
    grandTotal = Math.max(0, grossSales - commission - platformFees - shippingCharges);
  }

  const handleSubmit = (e) => {
    e.preventDefault();

    // Rule 2 Check: Credit / Invoice requires customer
    if (selectedType !== 'pos' && !customerName.trim()) {
      toast.error("Customer / Party name is required for credit invoice sales.");
      return;
    }

    try {
      const payload = {
        sale_type: selectedType,
        customer: {
          id: customerName ? `cust_${Date.now()}` : 'anonymous',
          name: customerName.trim() || 'Walk-in / Anonymous Customer'
        },
        date: date,
        due_date: dueDate,
        reference_number: refNumber || `${selectedType.toUpperCase()}-${Date.now().toString().slice(-6)}`,
        items: computedItems,
        grand_total: grandTotal,
        payment_account: paymentAccount,
        payment_method: paymentMethod,
        marketplace_details: selectedType === 'marketplace' ? {
          gross_sales: grossSales,
          commission: commission,
          platform_fees: platformFees,
          shipping_charges: shippingCharges,
          net_settlement: grandTotal
        } : null
      };

      const recorded = salesService.recordSale(workbenchId, payload);
      toast.success(`Sale #${recorded.id} recorded successfully!`);
      if (onSaleRecorded) onSaleRecorded(recorded);
      onClose();
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to record sale");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-3xl bg-[#18181A] border border-white/10 rounded-2xl p-6 shadow-2xl relative my-8 max-h-[90vh] flex flex-col font-dm-sans">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-teal-500/10 border border-teal-500/20 text-teal-400 rounded-xl">
              <BsCartCheck className="text-xl" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Record Commercial Sale</h2>
              <p className="text-xs text-gray-400">Select business model & record operational sale event</p>
            </div>
          </div>

          <button onClick={onClose} className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors">
            <BsX className="text-xl" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto pt-5 space-y-6 pr-1 custom-scrollbar">
          {/* Step 1: Sale Type Selection */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-teal-400 mb-2">
              1. Select Sale Model (Rule: Sale ≠ Invoice)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {SALE_TYPES.map(type => {
                const isSelected = selectedType === type.id;
                return (
                  <button
                    type="button"
                    key={type.id}
                    onClick={() => setSelectedType(type.id)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      isSelected 
                        ? 'bg-teal-500/15 border-teal-500/50 text-white shadow-md shadow-teal-500/5' 
                        : 'bg-[#111111] border-white/5 text-gray-400 hover:border-white/20 hover:text-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold text-xs">
                      <span>{type.label}</span>
                      {isSelected && <BsCheck2Circle className="text-teal-400 text-sm" />}
                    </div>
                    <div className="text-[10px] opacity-70 mt-1 line-clamp-2">{type.description}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2: Customer & Date Info */}
          <div className="bg-[#111111] border border-white/5 rounded-xl p-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">
                  Customer / Party {selectedType === 'pos' ? '(Optional for Walk-in POS)' : '(Required)'}
                </label>
                <input
                  type="text"
                  placeholder={selectedType === 'pos' ? "Walk-in / Anonymous Customer" : "e.g. Acme Corp / Datalis Tech"}
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  list="parties_list"
                  className="w-full bg-[#18181A] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-teal-500/50"
                />
                <datalist id="parties_list">
                  {savedParties.map(p => <option key={p.id} value={p.name} />)}
                </datalist>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">Reference / Invoice #</label>
                <input
                  type="text"
                  placeholder="e.g. INV-2026-089 or Receipt #"
                  value={refNumber}
                  onChange={(e) => setRefNumber(e.target.value)}
                  className="w-full bg-[#18181A] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-teal-500/50 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">Sale Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-[#18181A] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-teal-500/50"
                />
              </div>

              {selectedType !== 'pos' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1">Due Date (AR Payment Terms)</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full bg-[#18181A] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-teal-500/50"
                  />
                </div>
              )}
            </div>

            {/* POS Immediate Settlement Option */}
            {selectedType === 'pos' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-white/5">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full bg-[#18181A] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-teal-500/50"
                  >
                    <option value="UPI / Cash">UPI / Cash</option>
                    <option value="Card Machine">Card Machine</option>
                    <option value="Bank Direct">Bank Direct</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1">Destination Cash/Bank Account</label>
                  <select
                    value={paymentAccount}
                    onChange={(e) => setPaymentAccount(e.target.value)}
                    className="w-full bg-[#18181A] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-teal-500/50"
                  >
                    <option value="HDFC Bank Main">HDFC Bank Main</option>
                    <option value="Petty Cash Drawer">Petty Cash Drawer</option>
                    <option value="Axis Bank Corp">Axis Bank Corp</option>
                  </select>
                </div>
              </div>
            )}

            {/* Marketplace Specific Deductions */}
            {selectedType === 'marketplace' && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-3">
                <div className="text-xs font-bold text-amber-400 flex items-center justify-between">
                  <span>Marketplace Settlement Breakdown (Gross vs Net Bank)</span>
                  <span className="text-[10px] text-amber-300">Rule 16 Enforced</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <label className="text-gray-400">Gross Sales</label>
                    <input type="number" value={grossSales} onChange={(e) => setGrossSales(Number(e.target.value))} className="w-full bg-[#18181A] border border-white/10 rounded px-2 py-1 text-white mt-1" />
                  </div>
                  <div>
                    <label className="text-gray-400">Commission</label>
                    <input type="number" value={commission} onChange={(e) => setCommission(Number(e.target.value))} className="w-full bg-[#18181A] border border-white/10 rounded px-2 py-1 text-white mt-1" />
                  </div>
                  <div>
                    <label className="text-gray-400">Platform Fees</label>
                    <input type="number" value={platformFees} onChange={(e) => setPlatformFees(Number(e.target.value))} className="w-full bg-[#18181A] border border-white/10 rounded px-2 py-1 text-white mt-1" />
                  </div>
                  <div>
                    <label className="text-gray-400">Shipping</label>
                    <input type="number" value={shippingCharges} onChange={(e) => setShippingCharges(Number(e.target.value))} className="w-full bg-[#18181A] border border-white/10 rounded px-2 py-1 text-white mt-1" />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Line Items Table */}
          {selectedType !== 'marketplace' && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Line Items & Services</label>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="flex items-center space-x-1 text-xs text-teal-400 hover:text-teal-300 font-semibold"
                >
                  <BsPlusLg className="text-xs" />
                  <span>Add Line Item</span>
                </button>
              </div>

              <div className="bg-[#111111] border border-white/5 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#18181A] text-gray-400 font-semibold border-b border-white/5">
                    <tr>
                      <th className="p-3">Item / Description</th>
                      <th className="p-3 w-16 text-center">Qty</th>
                      <th className="p-3 w-24">Rate (₹)</th>
                      <th className="p-3 w-20">Discount</th>
                      <th className="p-3 w-20">Tax %</th>
                      <th className="p-3 w-28 text-right">Total (₹)</th>
                      <th className="p-3 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {items.map((item, idx) => {
                      const computed = computedItems[idx];
                      return (
                        <tr key={idx} className="hover:bg-white/[0.02]">
                          <td className="p-2">
                            <input
                              type="text"
                              placeholder="Item description"
                              value={item.name}
                              onChange={(e) => handleItemChange(idx, 'name', e.target.value)}
                              className="w-full bg-[#18181A] border border-white/10 rounded px-2 py-1.5 text-white focus:outline-none focus:border-teal-500/50"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                              className="w-full bg-[#18181A] border border-white/10 rounded px-2 py-1.5 text-center text-white focus:outline-none focus:border-teal-500/50"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              min="0"
                              value={item.rate}
                              onChange={(e) => handleItemChange(idx, 'rate', e.target.value)}
                              className="w-full bg-[#18181A] border border-white/10 rounded px-2 py-1.5 text-white focus:outline-none focus:border-teal-500/50"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              min="0"
                              value={item.discount}
                              onChange={(e) => handleItemChange(idx, 'discount', e.target.value)}
                              className="w-full bg-[#18181A] border border-white/10 rounded px-2 py-1.5 text-white focus:outline-none focus:border-teal-500/50"
                            />
                          </td>
                          <td className="p-2">
                            <select
                              value={item.taxRate}
                              onChange={(e) => handleItemChange(idx, 'taxRate', e.target.value)}
                              className="w-full bg-[#18181A] border border-white/10 rounded px-1.5 py-1.5 text-white focus:outline-none focus:border-teal-500/50"
                            >
                              <option value="0">0%</option>
                              <option value="5">5%</option>
                              <option value="12">12%</option>
                              <option value="18">18%</option>
                              <option value="28">28%</option>
                            </select>
                          </td>
                          <td className="p-3 text-right font-bold text-white">
                            ₹{computed.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td className="p-2 text-center">
                            {items.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(idx)}
                                className="text-gray-500 hover:text-rose-400 p-1"
                              >
                                <BsTrash />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Grand Total Summary Box */}
          <div className="p-4 bg-[#111111] border border-white/10 rounded-xl flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="text-xs font-semibold text-gray-400">Total Commercial Impact</div>
              <div className="text-[10px] text-gray-500">
                Subtotal: ₹{subtotal.toLocaleString()} • Tax: ₹{taxTotal.toLocaleString()}
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-extrabold text-teal-400 tracking-tight">
                ₹{grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[10px] text-gray-400">
                {selectedType === 'pos' ? 'Auto-settled in Cash/Bank' : 'Pushed to OPS → Accounts Receivable'}
              </div>
            </div>
          </div>

          {/* Footer Submit Actions */}
          <div className="pt-3 border-t border-white/10 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white text-xs font-bold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-black text-xs font-extrabold transition-all shadow-lg shadow-teal-500/20 flex items-center space-x-2"
            >
              <BsCheck2Circle className="text-base" />
              <span>Confirm & Post Sale</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
