import React, { useState, useEffect } from "react";
import { BsArrowLeftRight, BsArrowRepeat, BsCheckCircleFill, BsExclamationTriangleFill } from "react-icons/bs";
import { apiFetch } from "../../../lib/apiClient";
import toast from "react-hot-toast";

export default function SettlementsView({ workbenchId }) {
  const [settlements, setSettlements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);
  
  useEffect(() => {
    if (workbenchId) fetchSettlements();
  }, [workbenchId]);

  const fetchSettlements = async () => {
    try {
      setLoading(true);
      const res = await apiFetch(`/api/settlements/workbench/${workbenchId}?limit=100`);
      if (res.ok) {
        const data = await res.json();
        setSettlements(data || []);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load settlements");
    } finally {
      setLoading(false);
    }
  };

  const handleRecalculate = async () => {
    try {
      setRecalculating(true);
      const res = await apiFetch(`/api/settlements/recalculate/${workbenchId}`, { method: "POST" });
      if (res.ok) {
        toast.success("Settlements recalculated successfully");
        fetchSettlements();
      }
    } catch (err) {
      toast.error("Failed to recalculate");
    } finally {
      setRecalculating(false);
    }
  };

  const formatCurrency = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val || 0);

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a]">
      {/* Header */}
      <div className="flex items-center justify-between p-8 pb-4">
        <div className="flex items-center space-x-3">
          <BsArrowLeftRight className="text-teal-400 text-2xl" />
          <h2 className="text-2xl font-bold text-white">Settlements</h2>
        </div>
        
        <button 
          onClick={handleRecalculate}
          disabled={recalculating}
          className="flex items-center space-x-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-bold transition-all border border-white/10"
        >
          <BsArrowRepeat className={recalculating ? "animate-spin" : ""} />
          <span>{recalculating ? "Recalculating..." : "Recalculate Settlements"}</span>
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-8 pt-4 custom-scrollbar">
        {loading ? (
          <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div></div>
        ) : settlements.length === 0 ? (
          <div className="text-center py-20 bg-white/[0.02] border border-white/5 rounded-2xl">
            <BsArrowLeftRight className="mx-auto text-4xl text-gray-600 mb-4" />
            <h3 className="text-white font-bold mb-2">No settlements found</h3>
            <p className="text-gray-500 text-sm">When payments match invoices, they appear here.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {settlements.map(s => (
              <div key={s.id} className="bg-[#0d1117] border border-white/10 rounded-2xl p-6 flex items-center justify-between hover:border-teal-500/30 transition-all">
                
                {/* Event A (E.g., Invoice) */}
                <div className="flex-1 bg-white/5 rounded-xl p-4 border border-white/5">
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{s.event_a?.event_type?.replace(/_/g, ' ')}</span>
                  <p className="text-lg font-bold text-white mt-1">{s.event_a?.counterparty || "Unknown"}</p>
                  <p className="text-sm font-mono text-gray-400">{formatCurrency(s.event_a?.amount)}</p>
                  <p className="text-xs text-gray-500 mt-2">Ref: {s.event_a?.settlement_key || "None"}</p>
                </div>

                {/* Match Info */}
                <div className="px-6 flex flex-col items-center">
                  {s.settlement_status === 'FULL_MATCH' ? (
                    <BsCheckCircleFill className="text-emerald-500 text-2xl mb-2" />
                  ) : (
                    <BsExclamationTriangleFill className="text-amber-500 text-2xl mb-2" />
                  )}
                  <p className="text-[10px] font-bold text-white uppercase tracking-widest bg-white/10 px-3 py-1 rounded-full whitespace-nowrap">
                    {s.settlement_status?.replace(/_/g, ' ')}
                  </p>
                  <p className="text-xs text-teal-400 mt-2 font-bold bg-teal-500/10 px-2 py-1 rounded-md">
                    Matched: {formatCurrency(s.settled_amount)}
                  </p>
                  <p className="text-[10px] text-gray-500 mt-1">{s.match_strategy}</p>
                </div>

                {/* Event B (E.g., Payment) */}
                <div className="flex-1 bg-white/5 rounded-xl p-4 border border-white/5">
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{s.event_b?.event_type?.replace(/_/g, ' ')}</span>
                  <p className="text-lg font-bold text-white mt-1">{s.event_b?.counterparty || "Unknown"}</p>
                  <p className="text-sm font-mono text-gray-400">{formatCurrency(s.event_b?.amount)}</p>
                  <p className="text-xs text-gray-500 mt-2">Ref: {s.event_b?.settlement_key || "None"}</p>
                </div>
                
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
