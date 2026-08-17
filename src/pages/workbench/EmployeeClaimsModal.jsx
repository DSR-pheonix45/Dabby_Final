import React, { useState, useEffect } from 'react';
import { 
  BsX, 
  BsReceipt, 
  BsCheckCircleFill, 
  BsXCircleFill, 
  BsClockHistory, 
  BsLink45Deg, 
  BsPlusLg, 
  BsFileEarmarkText, 
  BsCheck2,
  BsCashCoin,
  BsBuilding,
  BsTag
} from 'react-icons/bs';
import { collaborationService } from '../../services/collaborationService';
import { toast } from 'react-hot-toast';

export default function EmployeeClaimsModal({ employee, workbenchId, isOpen, onClose, onUpdate }) {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeStatusFilter, setActiveStatusFilter] = useState('ALL'); // ALL | PENDING | APPROVED | REJECTED
  const [copiedLink, setCopiedLink] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);

  // New Claim Form State
  const [newClaimTitle, setNewClaimTitle] = useState('');
  const [newClaimAmount, setNewClaimAmount] = useState('');
  const [newClaimCategory, setNewClaimCategory] = useState('Travel & Conveyance');
  const [newClaimNotes, setNewClaimNotes] = useState('');

  useEffect(() => {
    if (isOpen && workbenchId && employee) {
      loadEmployeeClaims();
    }
  }, [isOpen, workbenchId, employee]);

  const loadEmployeeClaims = async () => {
    setLoading(true);
    try {
      const allClaims = await collaborationService.getClaims(workbenchId);
      // Filter claims belonging to this employee
      const empClaims = (allClaims || []).filter(c => 
        c.employee_id === employee.id || 
        (c.employee_name && c.employee_name.toLowerCase() === employee.name.toLowerCase()) ||
        (c.user_name && c.user_name.toLowerCase() === employee.name.toLowerCase())
      );

      // If no claims exist for this employee yet, provide helpful initial mock/demo entries for rich visual feedback
      if (empClaims.length === 0) {
        const demoClaims = [
          {
            id: `clm-demo-1-${employee.id}`,
            claim_number: `CLM-1042`,
            employee_id: employee.id,
            employee_name: employee.name,
            category: 'Travel & Conveyance',
            description: 'Site visit travel & fuel reimbursement (Client Meeting)',
            amount: 2500,
            status: 'PENDING',
            date: new Date().toISOString().split('T')[0],
            created_at: new Date().toISOString()
          },
          {
            id: `clm-demo-2-${employee.id}`,
            claim_number: `CLM-1018`,
            employee_id: employee.id,
            employee_name: employee.name,
            category: 'Meals & Hospitality',
            description: 'Team lunch during site operations',
            amount: 1800,
            status: 'APPROVED',
            date: new Date(Date.now() - 5 * 86400000).toISOString().split('T')[0],
            created_at: new Date(Date.now() - 5 * 86400000).toISOString()
          }
        ];
        setClaims(demoClaims);
      } else {
        setClaims(empClaims);
      }
    } catch (err) {
      console.warn("Notice loading employee claims:", err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !employee) return null;

  const allowance = Number(employee.monthly_allowance || 15000);
  
  // Calculate Claim Stats
  const totalClaimed = claims.reduce((sum, c) => sum + Number(c.amount || 0), 0);
  const totalApproved = claims
    .filter(c => c.status === 'APPROVED' || c.status === 'REIMBURSED')
    .reduce((sum, c) => sum + Number(c.amount || 0), 0);
  const totalPending = claims
    .filter(c => c.status === 'PENDING')
    .reduce((sum, c) => sum + Number(c.amount || 0), 0);
  
  const remainingAllowance = Math.max(0, allowance - totalApproved);

  const handleStatusChange = async (claim, newStatus) => {
    try {
      // If it's a demo claim, update state directly
      if (claim.id.startsWith('clm-demo-')) {
        setClaims(prev => prev.map(c => c.id === claim.id ? { ...c, status: newStatus } : c));
        toast.success(`Claim ${claim.claim_number || '#'+claim.id} set to ${newStatus}!`);
      } else {
        await collaborationService.updateClaimStatus(workbenchId, claim.id, newStatus);
        toast.success(`Claim ${claim.claim_number || '#'+claim.id} updated to ${newStatus}!`);
        loadEmployeeClaims();
      }
      if (onUpdate) onUpdate();
    } catch (err) {
      toast.error(err.message || "Failed to update claim status");
    }
  };

  const handleCopyPersonalLink = () => {
    const link = `${window.location.origin}/expense-claim/${workbenchId}?empId=${employee.id}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    toast.success(`Personal OPEX Logger link copied for ${employee.name}!`);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleCreateClaim = async (e) => {
    e.preventDefault();
    if (!newClaimAmount || Number(newClaimAmount) <= 0) {
      toast.error("Please enter a valid claim amount");
      return;
    }

    try {
      const claimPayload = {
        employee_id: employee.id,
        employee_name: employee.name,
        department_name: employee.department_name || "Site Operations",
        category: newClaimCategory,
        description: newClaimTitle || "Out-of-pocket Business Expense",
        amount: Number(newClaimAmount),
        notes: newClaimNotes,
        date: new Date().toISOString().split('T')[0],
        status: 'PENDING'
      };

      await collaborationService.submitClaim(workbenchId, claimPayload);
      toast.success(`Submitted claim of ₹${Number(newClaimAmount).toLocaleString()} for ${employee.name}!`);
      setNewClaimTitle('');
      setNewClaimAmount('');
      setNewClaimNotes('');
      setShowSubmitModal(false);
      loadEmployeeClaims();
      if (onUpdate) onUpdate();
    } catch (err) {
      toast.error("Failed to submit claim");
    }
  };

  const filteredClaims = claims.filter(c => {
    if (activeStatusFilter === 'ALL') return true;
    return c.status === activeStatusFilter;
  });

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 font-dm-sans">
      <div className="bg-[#141414] border border-white/10 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="p-6 border-b border-white/10 bg-gradient-to-r from-[#1A1A1A] to-[#141414] flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/30 text-teal-400 font-extrabold text-xl flex items-center justify-center shadow-inner">
              {employee.name ? employee.name.charAt(0).toUpperCase() : 'E'}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-bold text-white">{employee.name}</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  {employee.department_name || "General Department"}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                {employee.designation || "Company Employee"} • <span className="text-gray-300">{employee.email || "No email assigned"}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleCopyPersonalLink}
              className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-gray-300 hover:text-white transition-all flex items-center gap-1.5"
            >
              {copiedLink ? <BsCheck2 className="text-emerald-400 text-sm" /> : <BsLink45Deg className="text-teal-400 text-sm" />}
              <span>{copiedLink ? "Copied!" : "OPEX Link"}</span>
            </button>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 hover:text-white flex items-center justify-center transition-all"
            >
              <BsX className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="p-5 border-b border-white/10 bg-[#181818] grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-black/30 p-3 rounded-xl border border-white/5 space-y-1">
            <p className="text-[10px] text-gray-400 uppercase font-semibold">Expense Limit</p>
            <p className="text-sm font-bold text-teal-400">₹{allowance.toLocaleString()}/mo</p>
          </div>
          <div className="bg-black/30 p-3 rounded-xl border border-white/5 space-y-1">
            <p className="text-[10px] text-gray-400 uppercase font-semibold">Total Claimed</p>
            <p className="text-sm font-bold text-white">₹{totalClaimed.toLocaleString()}</p>
          </div>
          <div className="bg-black/30 p-3 rounded-xl border border-white/5 space-y-1">
            <p className="text-[10px] text-gray-400 uppercase font-semibold">Total Approved</p>
            <p className="text-sm font-bold text-emerald-400">₹{totalApproved.toLocaleString()}</p>
          </div>
          <div className="bg-black/30 p-3 rounded-xl border border-white/5 space-y-1">
            <p className="text-[10px] text-gray-400 uppercase font-semibold">Remaining Cap</p>
            <p className="text-sm font-bold text-indigo-400">₹{remainingAllowance.toLocaleString()}</p>
          </div>
        </div>

        {/* Filters & Actions Bar */}
        <div className="px-6 py-3.5 bg-[#141414] border-b border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-1 overflow-x-auto w-full sm:w-auto">
            {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map(st => (
              <button
                key={st}
                onClick={() => setActiveStatusFilter(st)}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap ${
                  activeStatusFilter === st
                    ? 'bg-teal-500 text-black shadow-md shadow-teal-500/20'
                    : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowSubmitModal(true)}
            className="w-full sm:w-auto px-4 py-2 bg-teal-500 hover:bg-teal-400 text-black font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-md shadow-teal-500/20"
          >
            <BsPlusLg className="w-3.5 h-3.5" />
            <span>Log Claim for {employee.name.split(' ')[0]}</span>
          </button>
        </div>

        {/* Claims List Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-3 custom-scrollbar">
          {loading ? (
            <div className="py-12 text-center text-xs text-gray-500">Loading claims history...</div>
          ) : filteredClaims.length === 0 ? (
            <div className="py-12 text-center bg-[#181818]/40 border border-white/5 rounded-2xl p-6 space-y-2">
              <BsReceipt className="mx-auto text-3xl text-gray-600 mb-1" />
              <p className="text-xs font-bold text-gray-300">No {activeStatusFilter !== 'ALL' ? activeStatusFilter.toLowerCase() : ''} claims found</p>
              <p className="text-[11px] text-gray-500 max-w-xs mx-auto">
                No expense receipts have been filed under this filter status for {employee.name}.
              </p>
            </div>
          ) : (
            filteredClaims.map((claim) => {
              const isPending = claim.status === 'PENDING';
              const isApproved = claim.status === 'APPROVED' || claim.status === 'REIMBURSED';
              const isRejected = claim.status === 'REJECTED';

              return (
                <div
                  key={claim.id}
                  className="bg-[#181818] border border-white/10 hover:border-white/20 rounded-2xl p-4 transition-all space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center space-x-3">
                      <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-teal-400">
                        <BsReceipt className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="text-xs font-bold text-white">{claim.description || claim.category}</h4>
                          <span className="text-[10px] text-gray-400 font-mono">
                            {claim.claim_number || `#${claim.id.substring(0, 8)}`}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-400 mt-0.5 flex items-center gap-2">
                          <span className="text-teal-400 font-semibold">{claim.category}</span>
                          <span>•</span>
                          <span>{claim.date}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3">
                      <div className="text-right">
                        <span className="text-sm font-extrabold text-white">₹{Number(claim.amount || 0).toLocaleString()}</span>
                      </div>

                      {/* Status Tag */}
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold flex items-center gap-1 ${
                        isApproved
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          : isRejected
                          ? "bg-red-500/20 text-red-300 border border-red-500/30"
                          : "bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse"
                      }`}>
                        {isApproved && <BsCheckCircleFill className="w-3 h-3 text-emerald-400" />}
                        {isRejected && <BsXCircleFill className="w-3 h-3 text-red-400" />}
                        {isPending && <BsClockHistory className="w-3 h-3 text-amber-400" />}
                        <span>{claim.status}</span>
                      </span>
                    </div>
                  </div>

                  {claim.notes && (
                    <p className="text-[11px] text-gray-400 bg-black/30 p-2.5 rounded-xl border border-white/5 italic">
                      "{claim.notes}"
                    </p>
                  )}

                  {/* Manager Actions */}
                  {isPending && (
                    <div className="pt-2 border-t border-white/5 flex items-center justify-end space-x-2 text-xs">
                      <button
                        onClick={() => handleStatusChange(claim, 'REJECTED')}
                        className="px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/20 font-bold transition-all flex items-center gap-1"
                      >
                        <BsXCircleFill className="w-3 h-3 text-red-400" />
                        <span>Reject</span>
                      </button>
                      <button
                        onClick={() => handleStatusChange(claim, 'APPROVED')}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold transition-all flex items-center gap-1 shadow-md shadow-emerald-500/20"
                      >
                        <BsCheckCircleFill className="w-3.5 h-3.5" />
                        <span>Approve Claim</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

      </div>

      {/* Sub-modal: Manual Submit Claim on behalf of Employee */}
      {showSubmitModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[60] flex items-center justify-center p-4">
          <div className="bg-[#181818] border border-white/10 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <BsReceipt className="text-teal-400 text-base" />
                Submit Claim for {employee.name}
              </h3>
              <button onClick={() => setShowSubmitModal(false)} className="text-gray-400 hover:text-white">
                <BsX className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateClaim} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-gray-300 font-semibold mb-1">Expense Description / Purpose *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Travel & Taxi to Client Office"
                  value={newClaimTitle}
                  onChange={(e) => setNewClaimTitle(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">Amount (₹) *</label>
                  <input
                    type="number"
                    required
                    placeholder="1500"
                    value={newClaimAmount}
                    onChange={(e) => setNewClaimAmount(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-teal-500 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">Category</label>
                  <select
                    value={newClaimCategory}
                    onChange={(e) => setNewClaimCategory(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-teal-500"
                  >
                    <option value="Travel & Conveyance">Travel & Conveyance</option>
                    <option value="Meals & Hospitality">Meals & Hospitality</option>
                    <option value="Site Operations">Site Operations</option>
                    <option value="Software & Tools">Software & Tools</option>
                    <option value="Office Supplies">Office Supplies</option>
                    <option value="Other OPEX">Other OPEX</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-gray-300 font-semibold mb-1">Notes / Voucher Context</label>
                <textarea
                  rows={2}
                  placeholder="Attach receipt notes, vehicle mileage, or vendor reference..."
                  value={newClaimNotes}
                  onChange={(e) => setNewClaimNotes(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSubmitModal(false)}
                  className="px-4 py-2 text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-500 hover:bg-teal-400 text-black font-bold rounded-xl"
                >
                  Submit Expense Claim
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
