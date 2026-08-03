import React, { useState, useEffect } from 'react';
import { BsCheckCircleFill, BsXCircleFill, BsClockHistory, BsPerson, BsBuilding, BsFileEarmarkText } from 'react-icons/bs';
import { collaborationService } from '../../../../services/collaborationService';
import { toast } from 'react-hot-toast';

export default function ExpenseClaimsReview({ workbenchId }) {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('ALL'); // ALL | PENDING | APPROVED | REJECTED

  useEffect(() => {
    fetchClaims();

    const handleClaimSubmitted = () => fetchClaims();
    window.addEventListener("claimSubmitted", handleClaimSubmitted);
    return () => window.removeEventListener("claimSubmitted", handleClaimSubmitted);
  }, [workbenchId]);

  const fetchClaims = async () => {
    if (!workbenchId) return;
    setLoading(true);
    try {
      const data = await collaborationService.getClaims(workbenchId);
      setClaims(data || []);
    } catch (err) {
      console.warn("Notice fetching claims:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (claimId, status, claimNumber) => {
    try {
      await collaborationService.updateClaimStatus(workbenchId, claimId, status);
      toast.success(
        status === 'APPROVED' 
          ? `Claim ${claimNumber} APPROVED and posted to ledger!` 
          : `Claim ${claimNumber} REJECTED.`
      );
      fetchClaims();
    } catch (err) {
      toast.error("Failed to update claim status");
    }
  };

  const filteredClaims = claims.filter(c => {
    if (filterStatus === 'ALL') return true;
    return c.status === filterStatus;
  });

  const pendingCount = claims.filter(c => c.status === 'PENDING').length;

  return (
    <div className="space-y-6 font-dm-sans">
      
      {/* Top Header Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#181818] border border-white/10 rounded-2xl p-5">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            Employee Expense Claims & Approval Queue
            {pendingCount > 0 && (
              <span className="px-2.5 py-0.5 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full text-xs font-extrabold animate-pulse">
                {pendingCount} Pending Approval
              </span>
            )}
          </h2>
          <p className="text-xs text-gray-400 mt-1">Review, approve, or reject employee out-of-pocket reimbursements and company card allowances</p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 bg-black/40 border border-white/10 p-1 rounded-xl text-xs">
          {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                filterStatus === status 
                  ? 'bg-teal-500 text-black shadow-md' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Claims List */}
      {loading ? (
        <div className="py-12 text-center text-xs text-gray-500">Loading expense claims...</div>
      ) : filteredClaims.length === 0 ? (
        <div className="py-16 text-center bg-[#181818]/40 border border-white/5 rounded-2xl p-8 space-y-2">
          <BsClockHistory className="mx-auto text-3xl text-gray-600 mb-2" />
          <h3 className="text-sm font-bold text-gray-300">No Expense Claims Found</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            When employees submit petrol, site visit, or software receipts via the Public Link, they will appear here for your review & approval.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredClaims.map((claim) => (
            <div
              key={claim.id || claim.claim_number}
              className="bg-[#181818] border border-white/10 hover:border-white/20 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all"
            >
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg shrink-0 ${
                  claim.status === 'APPROVED' ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400' :
                  claim.status === 'REJECTED' ? 'bg-red-500/10 border border-red-500/30 text-red-400' :
                  'bg-amber-500/10 border border-amber-500/30 text-amber-400 animate-pulse'
                }`}>
                  {claim.status === 'APPROVED' ? <BsCheckCircleFill /> :
                   claim.status === 'REJECTED' ? <BsXCircleFill /> :
                   <BsClockHistory />}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-extrabold text-white">{claim.claim_number}</span>
                    <span className={`px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider rounded-full border ${
                      claim.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                      claim.status === 'REJECTED' ? 'bg-red-500/10 text-red-400 border-red-500/30' :
                      'bg-amber-500/10 text-amber-400 border-amber-500/30'
                    }`}>
                      {claim.status}
                    </span>
                    <span className="text-[11px] text-gray-500">
                      • {claim.date}
                    </span>
                  </div>

                  <p className="text-xs text-gray-300 flex items-center gap-3">
                    <span className="flex items-center gap-1 font-semibold text-white">
                      <BsPerson className="text-teal-400" /> {claim.employee_name}
                    </span>
                    <span className="flex items-center gap-1 text-gray-400">
                      <BsBuilding className="text-purple-400" /> {claim.department_name}
                    </span>
                  </p>

                  <p className="text-xs text-gray-400 mt-1">
                    Category: <strong className="text-gray-200">{claim.category}</strong> ({claim.payment_type === 'REIMBURSEMENT' ? 'Out-of-Pocket Reimbursement' : 'Company Card'})
                  </p>
                  {claim.notes && (
                    <p className="text-xs text-gray-500 italic mt-0.5">"{claim.notes}"</p>
                  )}
                </div>
              </div>

              {/* Right Side: Amount & Approve/Reject Actions */}
              <div className="flex items-center justify-between md:justify-end gap-6 pt-3 md:pt-0 border-t md:border-t-0 border-white/5">
                <div className="text-left md:text-right">
                  <div className="text-xs text-gray-400">Claim Amount</div>
                  <div className="text-lg font-extrabold text-teal-400">₹{(claim.amount || 0).toLocaleString()}</div>
                </div>

                {claim.status === 'PENDING' ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleStatusUpdate(claim.id || claim.claim_number, 'APPROVED', claim.claim_number)}
                      className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
                    >
                      <BsCheckCircleFill />
                      <span>Approve</span>
                    </button>
                    <button
                      onClick={() => handleStatusUpdate(claim.id || claim.claim_number, 'REJECTED', claim.claim_number)}
                      className="px-3.5 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5"
                    >
                      <BsXCircleFill />
                      <span>Reject</span>
                    </button>
                  </div>
                ) : (
                  <span className="text-xs text-gray-500 font-medium">
                    Processed
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
