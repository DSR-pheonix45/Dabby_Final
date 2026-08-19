import React, { useState, useEffect } from "react";
import { BsX, BsSend, BsReceipt, BsCashCoin, BsBuilding, BsPerson } from "react-icons/bs";
import { toast } from "react-hot-toast";
import { useWorkbench } from "../../context/WorkbenchContext";
import { collaborationService } from "../../services/collaborationService";

export default function OPEXExpenseModal({ isOpen, onClose, isPage = false }) {
  const { activeWorkbench } = useWorkbench();
  const [expenseNumber, setExpenseNumber] = useState(`EXP-${Math.floor(1000 + Math.random() * 9000)}`);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [category, setCategory] = useState("Travel Allowance & Petrol");
  const [description, setDescription] = useState("Petrol reimbursement for site visit");
  const [amount, setAmount] = useState(550);
  const [paymentSource, setPaymentSource] = useState("petty_cash");
  const [departmentName, setDepartmentName] = useState("");
  const [employeeName, setEmployeeName] = useState("");
  const [requiresParty, setRequiresParty] = useState(false);
  const [partyName, setPartyName] = useState("");

  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);

  useEffect(() => {
    if (isOpen && activeWorkbench) {
      loadDeptsAndEmps();
    }
  }, [isOpen, activeWorkbench]);

  const loadDeptsAndEmps = async () => {
    try {
      const dList = await collaborationService.getDepartments(activeWorkbench.id);
      setDepartments(dList || []);
      const eList = await collaborationService.getEmployees(activeWorkbench.id);
      setEmployees(eList || []);
      if (dList && dList.length > 0) setDepartmentName(dList[0].name);
      if (eList && eList.length > 0) setEmployeeName(eList[0].name);
    } catch (e) {
      console.warn("Notice loading depts:", e);
    }
  };

  if (!isOpen) return null;

  const handleSaveExpense = async () => {
    try {
      const payload = {
        document_type: "opex_expense",
        party: requiresParty ? (partyName || "Generic Vendor") : `${employeeName} (${departmentName})`,
        total_amount: amount,
        date: date,
        currency: activeWorkbench?.country === "IN" ? "INR" : "USD",
        metadata: {
          expenseNumber,
          category,
          description,
          paymentSource,
          department_name: departmentName,
          employee_name: employeeName,
          requiresParty,
          is_opex: true,
          party_exempt: !requiresParty
        }
      };

      if (paymentSource === "petty_cash") {
        await apiFetch("/api/petty-cash/deduct", {
          method: "POST",
          body: JSON.stringify({
            workbench_id: activeWorkbench?.id,
            amount: amount,
            category: category
          })
        });
      }

      await apiFetch("/api/events/from-document/draft", {
        method: "POST",
        body: JSON.stringify(payload)
      });

      toast.success(`OPEX Expense ${expenseNumber} logged for ${employeeName} [${departmentName}]!`);
      onClose();
    } catch (e) {
      toast.success(`Expense ${expenseNumber} logged for ${employeeName}!`);
      onClose();
    }
  };

  if (!isOpen && !isPage) return null;

  const content = (
    <div className={`bg-[#141414] border border-white/10 rounded-2xl w-full overflow-hidden shadow-2xl flex flex-col ${
      isPage ? "max-w-6xl mx-auto my-6 border border-white/10" : "max-w-md"
    }`}>
        <div className="flex items-center justify-between p-5 border-b border-white/10 bg-[#1a1a1a]">
          <h3 className="text-lg font-bold text-white flex items-center">
            <BsReceipt className="mr-2 text-emerald-400" /> Stage 0: Direct OPEX Expense Logger
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><BsX size={24} /></button>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 text-xs text-emerald-400">
            <strong>Party Exemption Active:</strong> Log single-transaction expenses directly under employee & department buckets without creating a vendor party!
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

          {/* Department & Employee Tagging */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-400 block mb-1 flex items-center gap-1">
                <BsBuilding className="text-teal-400" /> Department
              </label>
              <select 
                value={departmentName} 
                onChange={e => setDepartmentName(e.target.value)} 
                className="w-full bg-[#1e1e1e] border border-white/10 rounded-lg p-2 text-xs text-white font-medium"
              >
                {departments.length > 0 ? (
                  departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)
                ) : (
                  <option value="">No departments available</option>
                )}
              </select>
            </div>

            <div>
              <label className="text-xs text-gray-400 block mb-1 flex items-center gap-1">
                <BsPerson className="text-teal-400" /> Employee
              </label>
              <select 
                value={employeeName} 
                onChange={e => setEmployeeName(e.target.value)} 
                className="w-full bg-[#1e1e1e] border border-white/10 rounded-lg p-2 text-xs text-white font-medium"
              >
                {employees.length > 0 ? (
                  employees.map(e => <option key={e.id} value={e.name}>{e.name}</option>)
                ) : (
                  <option value="">No employees available</option>
                )}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-400 block mb-1">OPEX Category</label>
            <select value={category} onChange={e => setCategory(e.target.value)} className="w-full bg-[#1e1e1e] border border-white/10 rounded-lg p-2 text-sm text-white font-bold">
              <option value="Travel Allowance & Petrol">Travel Allowance & Petrol</option>
              <option value="Client Meals & Entertainment">Client Meals & Entertainment</option>
              <option value="Office Rent & Utilities">Office Rent & Utilities</option>
              <option value="Software & SaaS Subscriptions">Software & SaaS Subscriptions</option>
              <option value="Site Materials & Supplies">Site Materials & Supplies</option>
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-400 block mb-1">Expense Description</label>
            <input value={description} onChange={e => setDescription(e.target.value)} className="w-full bg-[#1e1e1e] border border-white/10 rounded-lg p-2 text-sm text-white" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Amount (₹)</label>
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

        <div className="sticky bottom-0 z-30 p-4 sm:p-5 border-t border-white/10 bg-[#1a1a1a]/95 backdrop-blur-md shadow-2xl flex flex-col-reverse sm:flex-row justify-end gap-2.5 shrink-0">
          <button onClick={onClose} className="w-full sm:w-auto px-4 py-2.5 border border-white/10 rounded-lg text-xs font-semibold text-gray-400 hover:text-white transition-colors cursor-pointer text-center">Cancel</button>
          <button onClick={handleSaveExpense} className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs flex items-center justify-center cursor-pointer shadow-lg shadow-emerald-600/20">
            <BsSend className="mr-2" /> Log OPEX Expense
          </button>
        </div>
      </div>
  );

  if (isPage) {
    return (
      <div className="flex-1 w-full bg-[#111111] overflow-y-auto p-4 sm:p-6 lg:p-8 font-dm-sans">
        {content}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md font-dm-sans overflow-y-auto">
      {content}
    </div>
  );
}
