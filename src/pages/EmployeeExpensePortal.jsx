import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { 
  BsReceipt, BsUpload, BsCheckCircleFill, BsBuilding, BsPerson, 
  BsTag, BsCashCoin, BsCalendar3, BsFileEarmarkText, BsShieldCheck 
} from 'react-icons/bs';
import { toast, Toaster } from 'react-hot-toast';
import { diService } from '../services/diService';
import { collaborationService } from '../services/collaborationService';
import { supabase } from '../lib/supabase';

export default function EmployeeExpensePortal() {
  const { workbenchId } = useParams();

  const [loadingWorkbench, setLoadingWorkbench] = useState(true);
  const [workbenchInfo, setWorkbenchInfo] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);

  // Form State
  const [employeeName, setEmployeeName] = useState('');
  const [employeeEmail, setEmployeeEmail] = useState('');
  const [departmentName, setDepartmentName] = useState('Site Operations');
  const [category, setCategory] = useState('Travel Allowance & Petrol');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentType, setPaymentType] = useState('REIMBURSEMENT'); // REIMBURSEMENT | COMPANY_CARD
  const [notes, setNotes] = useState('');
  const [receiptFile, setReceiptFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submittedClaim, setSubmittedClaim] = useState(null);

  useEffect(() => {
    fetchInitialData();
  }, [workbenchId]);

  const fetchInitialData = async () => {
    try {
      if (workbenchId) {
        const { data: wb } = await supabase
          .from('workbenches')
          .select('*')
          .eq('id', workbenchId)
          .single();
        if (wb) setWorkbenchInfo(wb);

        // Fetch depts & employees
        const deptsRes = await fetch(`/api/collaboration/${workbenchId}/departments`);
        if (deptsRes.ok) setDepartments(await deptsRes.json());

        const empsRes = await fetch(`/api/collaboration/${workbenchId}/employees`);
        if (empsRes.ok) setEmployees(await empsRes.json());
      }
    } catch (err) {
      console.warn("Notice loading portal meta:", err);
    } finally {
      setLoadingWorkbench(false);
    }
  };

  const handleEmployeeSelect = (empName) => {
    setEmployeeName(empName);
    const found = employees.find(e => e.name === empName);
    if (found) {
      if (found.email) setEmployeeEmail(found.email);
      if (found.department_name) setDepartmentName(found.department_name);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!employeeName.trim()) {
      toast.error("Please enter your employee name.");
      return;
    }
    if (!amount || Number(amount) <= 0) {
      toast.error("Please enter a valid expense amount.");
      return;
    }

    setSubmitting(true);
    const claimNumber = `CLM-${Math.floor(1000 + Math.random() * 9000)}`;

    try {
      let documentId = null;

      // 1. Upload receipt file to Doc Vault if provided
      if (receiptFile) {
        const targetWbId = workbenchId || "default_wb";
        const fileToUpload = new File([receiptFile], `${claimNumber}_${employeeName.replace(/\s+/g, '_')}_receipt.pdf`, { type: receiptFile.type });
        const uploadRes = await diService.uploadDocument(targetWbId, fileToUpload);
        documentId = uploadRes.document_id;
        if (documentId) {
          diService.processDocument(documentId, "expense_receipt").catch(e => console.warn("Background scanning notice:", e));
        }
      }

      // 2. Submit claim to backend router & emit notification to owner
      const targetWbId = workbenchId || "default_wb";
      await collaborationService.submitClaim(targetWbId, {
        claim_number: claimNumber,
        employee_name: employeeName,
        employee_email: employeeEmail,
        department_name: departmentName,
        category: category,
        amount: Number(amount),
        date: date,
        payment_type: paymentType,
        notes: notes,
        document_id: documentId
      });

      // 3. Register claim analysis note
      const companyName = workbenchInfo?.name || "Company";
      const analysisData = {
        document_id: documentId,
        document_type: "expense_receipt",
        confidence: 0.99,
        parties: {
          issuer: { name: employeeName, email: employeeEmail, department: departmentName },
          recipient: { name: companyName }
        },
        money: {
          total_amount: Number(amount),
          subtotal: Number(amount),
          currency: workbenchInfo?.currency || "INR"
        },
        dates: {
          document_date: date
        },
        line_items: [
          { sno: 1, description: `${category} (${paymentType === 'REIMBURSEMENT' ? 'Out-of-Pocket Reimbursement' : 'Company Allowance/Card'})`, amount: Number(amount) }
        ],
        raw_text: `Employee Claim #: ${claimNumber}\nEmployee: ${employeeName}\nDepartment: ${departmentName}\nCategory: ${category}\nPayment Mode: ${paymentType}\nNotes: ${notes}`
      };

      try {
        await supabase.from("di_analysis_notes").insert(analysisData);
      } catch (dbErr) {
        console.warn("Doc Vault notice:", dbErr);
      }

      setSubmittedClaim({
        claimNumber,
        employeeName,
        departmentName,
        category,
        amount: Number(amount),
        date,
        paymentType
      });

      window.dispatchEvent(new CustomEvent("claimSubmitted", { detail: { claimNumber, amount, employeeName } }));
      toast.success(`Expense claim ${claimNumber} submitted! Sent to owner for approval.`);
    } catch (err) {
      console.error("Submission error:", err);
      toast.error("Failed to submit claim: " + (err.message || err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0C0E14] text-gray-100 font-sans flex flex-col justify-between p-4 sm:p-6 lg:p-10">
      <Toaster position="top-center" />

      {/* Navigation / Header */}
      <div className="max-w-2xl mx-auto w-full flex items-center justify-between py-4 border-b border-white/10 mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 font-extrabold text-lg">
            {workbenchInfo?.name ? workbenchInfo.name.charAt(0) : "D"}
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-extrabold text-white tracking-tight">
              {workbenchInfo?.name || "Company Expense Portal"}
            </h1>
            <p className="text-xs text-gray-400">Employee OPEX Claim & Reimbursement Portal</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[11px] text-gray-400">
          <BsShieldCheck className="text-emerald-400" />
          <span>Verified Submission</span>
        </div>
      </div>

      {/* Main Body Card */}
      <div className="max-w-2xl mx-auto w-full bg-[#141722] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        
        {submittedClaim ? (
          /* Confirmation Screen */
          <div className="text-center py-10 space-y-6">
            <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/30 rounded-3xl flex items-center justify-center text-emerald-400 mx-auto animate-bounce">
              <BsCheckCircleFill size={40} />
            </div>
            <div>
              <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-xs font-bold uppercase tracking-wider">
                Claim Submitted
              </span>
              <h2 className="text-2xl font-extrabold text-white mt-3">{submittedClaim.claimNumber}</h2>
              <p className="text-xs text-gray-400 mt-1">Submitted by <strong className="text-white">{submittedClaim.employeeName}</strong> ({submittedClaim.departmentName})</p>
            </div>

            <div className="bg-black/40 border border-white/10 rounded-2xl p-5 text-left text-xs space-y-2 max-w-md mx-auto">
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-gray-400">Category:</span>
                <span className="font-bold text-white">{submittedClaim.category}</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-gray-400">Claim Amount:</span>
                <span className="font-extrabold text-teal-400 text-sm">₹{submittedClaim.amount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-gray-400">Payment Mode:</span>
                <span className="font-bold text-gray-200">
                  {submittedClaim.paymentType === 'REIMBURSEMENT' ? 'Out-of-Pocket Reimbursement' : 'Company Card / Allowance'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Date:</span>
                <span className="text-gray-300">{submittedClaim.date}</span>
              </div>
            </div>

            <button
              onClick={() => {
                setSubmittedClaim(null);
                setAmount('');
                setNotes('');
                setReceiptFile(null);
              }}
              className="px-6 py-2.5 bg-teal-500 hover:bg-teal-400 text-black font-bold text-xs rounded-xl transition-all shadow-lg shadow-teal-500/20"
            >
              + Submit Another Expense Claim
            </button>
          </div>
        ) : (
          /* Form Screen */
          <form onSubmit={handleSubmit} className="space-y-5 text-xs">
            <div className="border-b border-white/10 pb-4 mb-2">
              <h2 className="text-lg font-bold text-white">Log Operational Expense</h2>
              <p className="text-xs text-gray-400 mt-0.5">Submit site visits, petrol, meals, or software receipts for approval</p>
            </div>

            {/* Employee Information */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1 flex items-center gap-1.5">
                  <BsPerson className="text-teal-400" /> Employee Name
                </label>
                {employees.length > 0 ? (
                  <select
                    value={employeeName}
                    onChange={(e) => handleEmployeeSelect(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-teal-500"
                  >
                    <option value="">-- Select Registered Employee --</option>
                    {employees.map(e => (
                      <option key={e.id} value={e.name}>{e.name} ({e.department_name})</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    required
                    value={employeeName}
                    onChange={(e) => setEmployeeName(e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-teal-500"
                  />
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1 flex items-center gap-1.5">
                  <BsBuilding className="text-teal-400" /> Department
                </label>
                <select
                  value={departmentName}
                  onChange={(e) => setDepartmentName(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-teal-500"
                >
                  {departments.length > 0 ? (
                    departments.map(d => (
                      <option key={d.id} value={d.name}>{d.name}</option>
                    ))
                  ) : (
                    <>
                      <option value="Site Operations">Site Operations</option>
                      <option value="Sales & Business Development">Sales & Business Development</option>
                      <option value="Engineering & IT">Engineering & IT</option>
                      <option value="Administration & HR">Administration & HR</option>
                    </>
                  )}
                </select>
              </div>
            </div>

            {/* Expense Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1 flex items-center gap-1.5">
                  <BsTag className="text-teal-400" /> Expense Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-teal-500"
                >
                  <option value="Travel Allowance & Petrol">Travel Allowance & Petrol</option>
                  <option value="Client Meals & Entertainment">Client Meals & Entertainment</option>
                  <option value="Office Rent & Utilities">Office Rent & Utilities</option>
                  <option value="Software & SaaS Subscriptions">Software & SaaS Subscriptions</option>
                  <option value="Site Materials & Supplies">Site Materials & Supplies</option>
                  <option value="Miscellaneous OPEX">Miscellaneous OPEX</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1 flex items-center gap-1.5">
                  <BsCashCoin className="text-teal-400" /> Amount (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm font-bold text-white focus:outline-none focus:border-teal-500"
                />
              </div>
            </div>

            {/* Date & Mode */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1 flex items-center gap-1.5">
                  <BsCalendar3 className="text-teal-400" /> Expense Date
                </label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Claim Type</label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-black/40 border border-white/10 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setPaymentType("REIMBURSEMENT")}
                    className={`py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                      paymentType === 'REIMBURSEMENT' ? 'bg-teal-500 text-black shadow-md' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Reimbursement
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentType("COMPANY_CARD")}
                    className={`py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                      paymentType === 'COMPANY_CARD' ? 'bg-purple-500 text-white shadow-md' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Company Card
                  </button>
                </div>
              </div>
            </div>

            {/* File Upload */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1 flex items-center gap-1.5">
                <BsFileEarmarkText className="text-teal-400" /> Upload Receipt Proof (Photo / PDF)
              </label>
              <div className="border-2 border-dashed border-white/10 hover:border-teal-500/50 rounded-2xl p-4 text-center cursor-pointer bg-black/20 transition-all relative">
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => setReceiptFile(e.target.files[0])}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <BsUpload className="mx-auto text-xl text-teal-400 mb-1" />
                <p className="text-xs font-bold text-gray-300">
                  {receiptFile ? receiptFile.name : "Tap to upload receipt image or PDF"}
                </p>
                <p className="text-[10px] text-gray-500 mt-0.5">Supports JPG, PNG, PDF up to 10MB</p>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">Expense Purpose / Remarks</label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Fuel allowance for client site visit to Mysuru"
                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-teal-500"
              />
            </div>

            {/* Submit Button */}
            <div className="pt-3">
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-teal-500 hover:bg-teal-400 text-black font-extrabold rounded-xl text-xs uppercase tracking-wider transition-all shadow-lg shadow-teal-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <BsCheckCircleFill size={16} />
                <span>{submitting ? "Submitting Claim..." : "Submit Expense Claim"}</span>
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Footer */}
      <div className="max-w-2xl mx-auto w-full text-center py-4 text-[11px] text-gray-600">
        Powered by Dabby AI Business Intelligence • Secure Employee Expense Claim Portal
      </div>
    </div>
  );
}
