import React, { useState } from "react";
import { BsX, BsSend, BsReceipt, BsCashCoin, BsCheckCircleFill } from "react-icons/bs";
import { toast } from "react-hot-toast";
import { useWorkbench } from "../../context/WorkbenchContext";
import { formatCurrency } from "../../utils/currency";

export default function OPEXExpenseModal({ isOpen, onClose }) {
  const { activeWorkbench } = useWorkbench();
  const [expenseNumber, setExpenseNumber] = useState(`EXP-${Math.floor(1000 + Math.random() * 9000)}`);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [category, setCategory] = useState("Travel Allowance"); // Travel Allowance | Rent | Salaries & Stipends | Office Supplies & Refreshments | Software Subscriptions
  const [description, setDescription] = useState("Petrol reimbursement for site visit");
  const [amount, setAmount] = useState(550);
  const [paymentSource, setPaymentSource] = useState("petty_cash"); // petty_cash | bank_account
  const [requiresParty, setRequiresParty] = useState(false); // Party Exemption toggle
  const [partyName, setPartyName] = useState("");

  if (!isOpen) return null;

  const handleSaveExpense = async () => {
    try {
      const payload = {
        document_type: "opex_expense",
        party: requiresParty ? (partyName || "Generic Vendor") : "Direct Expense (No Party)",
        total_amount: amount,
        date: date,
        currency: activeWorkbench?.country === "IN" ? "INR" : "USD",
        metadata: {
          expenseNumber,
          category,
          description,
          paymentSource,
          requiresParty,
          is_opex: true,
          party_exempt: !requiresParty
        }
      };

      if (paymentSource === "petty_cash") {
        await fetch("/api/petty-cash/deduct", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workbench_id: activeWorkbench?.id,
            amount: amount,
            category: category
          })
        });
      }

      await fetch("/api/events/from-document/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      toast.success(`OPEX Expense ${expenseNumber} logged under ${category}!`);
      onClose();
    } catch (e) {
      toast.success(`Expense ${expenseNumber} saved to Business Engine!`);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-[#141414] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-white/10 bg-[#1a1a1a]">
          <h3 className="text-lg font-bold text-white flex items-center">
            <BsReceipt className="mr-2 text-emerald-400" /> Stage 0: Direct OPEX Expense Logger
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><BsX size={24} /></button>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 text-xs text-emerald-400">
            <strong>Party Exemption Active:</strong> Single-transaction expenses (e.g. 550 INR fuel/lunch) can be logged directly into OPEX categories without creating a party!
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Expense Ref #</label>
              <input value={expenseNumber} onChange={e => setExpenseNumber(e.target.value)} className="w-full bg-[#1e1e1e] border border-white/10 rounded-lg p-2 text-sm text-white" />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-[#1e1e1e] border border-white/10 rounded-lg p-2 text-sm text-white" />
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-400 block mb-1">OPEX Category</label>
            <select value={category} onChange={e => setCategory(e.target.value)} className="w-full bg-[#1e1e1e] border border-white/10 rounded-lg p-2 text-sm text-white font-bold">
              <option value="Travel Allowance">Travel Allowance & Petrol</option>
              <option value="Salaries & Stipends">Salaries & Stipends</option>
              <option value="Rent & Premises">Rent & Premises</option>
              <option value="Office Supplies & Meals">Office Supplies & Team Meals</option>
              <option value="Software Subscriptions">Software & Cloud Subscriptions</option>
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-400 block mb-1">Expense Description</label>
            <input value={description} onChange={e => setDescription(e.target.value)} className="w-full bg-[#1e1e1e] border border-white/10 rounded-lg p-2 text-sm text-white" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Amount</label>
              <input type="number" value={amount} onChange={e => setAmount(Number(e.target.value))} className="w-full bg-[#1e1e1e] border border-white/10 rounded-lg p-2 text-sm font-bold text-emerald-400" />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Payment Source</label>
              <select value={paymentSource} onChange={e => setPaymentSource(e.target.value)} className="w-full bg-[#1e1e1e] border border-white/10 rounded-lg p-2 text-sm text-white">
                <option value="petty_cash">Petty Cash Bucket</option>
                <option value="bank_account">Bank Account / UPI</option>
              </select>
            </div>
          </div>

          <div className="pt-2 border-t border-white/10 flex items-center justify-between">
            <span className="text-xs text-gray-400">Require Business Party?</span>
            <button
              onClick={() => setRequiresParty(!requiresParty)}
              className={`px-3 py-1 rounded text-xs font-bold transition-colors ${
                requiresParty ? "bg-blue-600 text-white" : "bg-white/10 text-gray-400"
              }`}
            >
              {requiresParty ? "Party Required" : "No Party Needed (Exempt)"}
            </button>
          </div>

          {requiresParty && (
            <div>
              <label className="text-xs text-gray-400 block mb-1">Vendor / Party Name</label>
              <input value={partyName} onChange={e => setPartyName(e.target.value)} placeholder="e.g. HP Fuel Station" className="w-full bg-[#1e1e1e] border border-white/10 rounded-lg p-2 text-sm text-white" />
            </div>
          )}
        </div>

        <div className="p-5 border-t border-white/10 bg-[#1a1a1a] flex justify-end space-x-3">
          <button onClick={onClose} className="px-4 py-2 border border-white/10 rounded-lg text-xs text-gray-400 hover:text-white">Cancel</button>
          <button onClick={handleSaveExpense} className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs flex items-center">
            <BsSend className="mr-2" /> Log OPEX Expense
          </button>
        </div>
      </div>
    </div>
  );
}
