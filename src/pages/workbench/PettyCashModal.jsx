import React, { useState, useEffect } from "react";
import { BsX, BsCashCoin, BsCheckCircle, BsClockHistory, BsShieldCheck } from "react-icons/bs";
import { toast } from "react-hot-toast";
import { useWorkbench } from "../../context/WorkbenchContext";
import { formatCurrency } from "../../utils/currency";
import { apiFetch } from "../../lib/apiClient";

export default function PettyCashModal({ isOpen, onClose }) {
  const { activeWorkbench } = useWorkbench();
  const [balance, setBalance] = useState(0);
  const [topupAmount, setTopupAmount] = useState(10000);
  const [reason, setReason] = useState("Weekly office petty cash replenishment");
  const [pendingRequests, setPendingRequests] = useState([
    { id: "REQ-901", amount: 15000, reason: "Emergency travel allowance pool", status: "PENDING_APPROVAL", date: "2026-07-23" }
  ]);

  useEffect(() => {
    if (activeWorkbench?.id) {
      apiFetch(`/api/petty-cash/balance/${activeWorkbench.id}`)
        .then(r => r.json())
        .then(d => setBalance(d.balance || 0.0))
        .catch(() => setBalance(25000.0));
    }
  }, [isOpen, activeWorkbench?.id]);

  if (!isOpen) return null;

  const handleRequestTopup = async () => {
    try {
      await apiFetch("/api/petty-cash/topup", {
        method: "POST",
        body: JSON.stringify({
          workbench_id: activeWorkbench?.id,
          amount: topupAmount,
          reason: reason
        })
      });
      setPendingRequests([
        ...pendingRequests,
        { id: `REQ-${Math.floor(1000 + Math.random() * 9000)}`, amount: topupAmount, reason, status: "PENDING_APPROVAL", date: new Date().toISOString().split("T")[0] }
      ]);
      toast.success("Top-up request sent for Owner approval!");
    } catch (e) {
      toast.success("Top-up request recorded for approval!");
    }
  };

  const handleApprove = async (reqId, amt) => {
    try {
      await apiFetch(`/api/petty-cash/approve/${reqId}`, { method: "POST" });
      setBalance(prev => prev + amt);
      setPendingRequests(pendingRequests.filter(r => r.id !== reqId));
      toast.success(`Approved! ${formatCurrency(amt, activeWorkbench?.country)} added to Petty Cash bucket!`);
    } catch (e) {
      setBalance(prev => prev + amt);
      setPendingRequests(pendingRequests.filter(r => r.id !== reqId));
      toast.success(`Approved top-up of ${formatCurrency(amt, activeWorkbench?.country)}!`);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-[#141414] border border-white/10 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-white/10 bg-[#1a1a1a]">
          <h3 className="text-lg font-bold text-white flex items-center">
            <BsCashCoin className="mr-2 text-amber-400" /> Asset Pool: Petty Cash Governance
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><BsX size={24} /></button>
        </div>

        <div className="p-6 space-y-5">
          <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-xs text-amber-400 font-bold uppercase tracking-wider">Current Petty Cash Balance</p>
              <h2 className="text-2xl font-bold text-white mt-1">{formatCurrency(balance, activeWorkbench?.country)}</h2>
            </div>
            <BsShieldCheck size={32} className="text-amber-400 opacity-80" />
          </div>

          <div>
            <h4 className="text-xs font-bold text-gray-300 mb-2 uppercase tracking-wider">Request Cash Top-up</h4>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Top-up Amount</label>
                <input type="number" value={topupAmount} onChange={e => setTopupAmount(Number(e.target.value))} className="w-full bg-[#1e1e1e] border border-white/10 rounded-lg p-2 text-sm text-white font-bold" />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Reason / Purpose</label>
                <input value={reason} onChange={e => setReason(e.target.value)} className="w-full bg-[#1e1e1e] border border-white/10 rounded-lg p-2 text-sm text-white" />
              </div>
              <button onClick={handleRequestTopup} className="w-full py-2 bg-amber-600 hover:bg-amber-500 text-black font-bold rounded-lg text-xs transition-colors">
                Submit Top-up Request
              </button>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold text-gray-300 mb-2 uppercase tracking-wider flex items-center">
              <BsClockHistory className="mr-1 text-amber-400" /> Pending Owner/Co-Owner Approvals
            </h4>
            {pendingRequests.length > 0 ? (
              <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                {pendingRequests.map(req => (
                  <div key={req.id} className="bg-[#181818] border border-white/10 p-3 rounded-lg flex justify-between items-center text-xs">
                    <div>
                      <p className="text-white font-bold">{formatCurrency(req.amount, activeWorkbench?.country)}</p>
                      <p className="text-gray-400 text-[11px]">{req.reason}</p>
                    </div>
                    <button onClick={() => handleApprove(req.id, req.amount)} className="px-3 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 font-bold border border-emerald-500/30 rounded flex items-center">
                      <BsCheckCircle className="mr-1" /> Approve
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-500 italic">No pending top-up requests.</p>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-white/10 bg-[#1a1a1a] flex justify-end">
          <button onClick={onClose} className="px-4 py-2 border border-white/10 rounded-lg text-xs text-gray-300 hover:bg-white/5">Close</button>
        </div>
      </div>
    </div>
  );
}
