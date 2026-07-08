import React, { useState, useEffect } from "react";
import { BsCheckCircle, BsX, BsPencilSquare, BsArrowLeft, BsFileEarmarkText, BsLightningCharge } from "react-icons/bs";
import { apiFetch } from "../../../lib/apiClient";
import toast from "react-hot-toast";

export default function RealityReviewView({ workbenchId }) {
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDraft, setSelectedDraft] = useState(null);
  
  useEffect(() => {
    if (workbenchId) fetchDrafts();
  }, [workbenchId]);

  const fetchDrafts = async () => {
    try {
      setLoading(true);
      const res = await apiFetch(`/api/trade-drafts/workbench/${workbenchId}?status=PENDING_REVIEW`);
      if (res.ok) {
        const data = await res.json();
        setDrafts(data.drafts || data || []);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load drafts");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    try {
      const res = await apiFetch(`/api/trade-drafts/${id}/approve`, { method: "POST" });
      if (res.ok) {
        toast.success("Business Event Created. Accounting Will Be Generated Automatically.");
        setSelectedDraft(null);
        fetchDrafts();
      } else {
        toast.error("Failed to approve event");
      }
    } catch (err) {
      toast.error("An error occurred");
    }
  };

  const handleReject = async (id) => {
    try {
      const res = await apiFetch(`/api/trade-drafts/${id}/reject`, { method: "POST", body: JSON.stringify({ reason: "Rejected by user" }) });
      if (res.ok) {
        toast.success("Draft rejected");
        setSelectedDraft(null);
        fetchDrafts();
      }
    } catch (err) {
      toast.error("An error occurred");
    }
  };

  if (loading) {
    return <div className="flex-1 flex justify-center items-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div></div>;
  }

  // --- DETAIL VIEW ---
  if (selectedDraft) {
    return (
      <div className="flex flex-col h-full bg-[#0a0a0a]">
        <div className="flex items-center space-x-4 p-4 border-b border-white/5 bg-[#0d1117]">
          <button onClick={() => setSelectedDraft(null)} className="p-2 hover:bg-white/5 rounded-lg text-gray-400">
            <BsArrowLeft />
          </button>
          <h2 className="text-lg font-bold text-white">Review Business Event</h2>
        </div>
        
        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel: Evidence */}
          <div className="w-1/3 border-r border-white/5 p-4 flex flex-col bg-[#0d1117]/50">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">1. Evidence</h3>
            <div className="flex-1 bg-black/40 border border-white/10 rounded-xl flex items-center justify-center text-gray-600">
              <div className="text-center">
                <BsFileEarmarkText size={48} className="mx-auto mb-2 opacity-20" />
                <p className="text-sm">Document Preview</p>
                <p className="text-xs">{selectedDraft.document_id || "No document attached"}</p>
              </div>
            </div>
          </div>

          {/* Center Panel: Understanding */}
          <div className="w-1/3 border-r border-white/5 p-6 overflow-y-auto custom-scrollbar bg-[#0d1117]">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-6">2. Dabby's Understanding</h3>
            
            <div className="space-y-6">
              <div>
                <p className="text-[10px] font-bold text-teal-500 uppercase tracking-widest mb-1">Business Intent</p>
                <p className="text-lg font-bold text-white">{selectedDraft.event_type?.replace(/_/g, ' ')}</p>
              </div>
              
              <div className="bg-white/[0.02] border border-white/5 p-4 rounded-xl space-y-4">
                <div>
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Counterparty</p>
                  <p className="text-white font-medium">{selectedDraft.proposed_counterparty || "Unknown"}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Amount</p>
                  <p className="text-xl font-black text-white">₹{selectedDraft.proposed_amount?.toLocaleString() || "0"}</p>
                </div>
                <div className="flex justify-between">
                  <div>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Date</p>
                    <p className="text-white font-medium">{selectedDraft.proposed_date || "-"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Settlement Key</p>
                    <p className="text-white font-medium">{selectedDraft.proposed_settlement_key || "-"}</p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2 bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl">
                <BsLightningCharge className="text-emerald-400" />
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">High Confidence Extract</span>
              </div>
            </div>
          </div>

          {/* Right Panel: Actions */}
          <div className="w-1/3 p-6 flex flex-col bg-[#0d1117]/80">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-6">3. Reality Check</h3>
            
            <div className="flex-1 space-y-4">
              <p className="text-sm text-gray-400">Does Dabby's understanding match what actually happened in the business?</p>
              
              <button 
                onClick={() => handleApprove(selectedDraft.id)}
                className="w-full flex items-center justify-center space-x-2 py-4 bg-teal-500 text-black rounded-xl font-bold hover:bg-teal-400 transition-all shadow-lg shadow-teal-500/20"
              >
                <BsCheckCircle size={18} />
                <span>Approve Event</span>
              </button>
              
              <button className="w-full flex items-center justify-center space-x-2 py-4 bg-white/5 text-white rounded-xl font-bold hover:bg-white/10 transition-all border border-white/10">
                <BsPencilSquare size={18} />
                <span>Edit Event</span>
              </button>
              
              <button 
                onClick={() => handleReject(selectedDraft.id)}
                className="w-full flex items-center justify-center space-x-2 py-4 bg-transparent text-rose-400 rounded-xl font-bold hover:bg-rose-500/10 transition-all border border-transparent hover:border-rose-500/20"
              >
                <BsX size={20} />
                <span>Reject Event</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- LIST VIEW ---
  return (
    <div className="p-8 h-full overflow-y-auto custom-scrollbar bg-[#0a0a0a]">
      <div className="flex items-center space-x-3 mb-8">
        <BsCheckCircle className="text-teal-400 text-2xl" />
        <h2 className="text-2xl font-bold text-white">Reality Review</h2>
      </div>
      
      {drafts.length === 0 ? (
        <div className="text-center py-20 bg-white/[0.02] border border-white/5 rounded-2xl">
          <BsCheckCircle className="mx-auto text-4xl text-emerald-500/30 mb-4" />
          <h3 className="text-white font-bold mb-2">No pending drafts</h3>
          <p className="text-gray-500 text-sm">All business reality checks are up to date.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {drafts.map(draft => (
            <div key={draft.id} className="bg-[#0d1117] border border-white/10 rounded-2xl p-5 hover:border-teal-500/30 transition-all group flex flex-col">
              <div className="flex justify-between items-start mb-4">
                <span className="px-2 py-1 bg-teal-500/10 text-teal-400 text-[10px] font-bold uppercase tracking-widest rounded-lg border border-teal-500/20">
                  {draft.event_type?.replace(/_/g, ' ')}
                </span>
                <span className="text-xs text-gray-500">{new Date(draft.created_at).toLocaleDateString()}</span>
              </div>
              
              <p className="text-xs text-gray-400 mb-1">Dabby believes you transacted with:</p>
              <p className="text-lg font-bold text-white mb-4 line-clamp-1">{draft.proposed_counterparty || "Unknown"}</p>
              
              <div className="flex justify-between items-end mt-auto pt-4 border-t border-white/5">
                <div>
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Amount</p>
                  <p className="text-xl font-black text-white">₹{draft.proposed_amount?.toLocaleString() || "0"}</p>
                </div>
                <button 
                  onClick={() => setSelectedDraft(draft)}
                  className="px-4 py-2 bg-white/10 text-white text-xs font-bold rounded-xl hover:bg-white/20 transition-all"
                >
                  Review
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
