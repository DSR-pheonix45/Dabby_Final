import React, { useState, useEffect } from "react";
import { BsListUl, BsFilter, BsSearch, BsLightningCharge, BsArrowRight } from "react-icons/bs";
import { apiFetch } from "../../../lib/apiClient";
import toast from "react-hot-toast";

export default function BusinessEventsView({ workbenchId }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");
  
  useEffect(() => {
    if (workbenchId) fetchEvents();
  }, [workbenchId]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const res = await apiFetch(`/api/business-events/workbench/${workbenchId}?limit=200`);
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events || data || []);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load business events");
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'OPEN': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      case 'PARTIALLY_SETTLED': return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
      case 'SETTLED': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      case 'CANCELLED': return 'text-gray-400 bg-gray-500/10 border-gray-500/20';
      case 'SUPERSEDED': return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
      default: return 'text-gray-400 bg-gray-500/10 border-gray-500/20';
    }
  };

  const filteredEvents = filter === "ALL" ? events : events.filter(e => {
    if (filter === "RECEIVABLES") return e.event_type.includes("CUSTOMER");
    if (filter === "PAYABLES") return e.event_type.includes("VENDOR") || e.event_type.includes("EXPENSE");
    if (filter === "PAYROLL") return e.event_type.includes("PAYROLL");
    return true;
  });

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a]">
      {/* Header */}
      <div className="flex items-center justify-between p-8 pb-4">
        <div className="flex items-center space-x-3">
          <BsListUl className="text-teal-400 text-2xl" />
          <h2 className="text-2xl font-bold text-white">Business Events</h2>
        </div>
        
        <div className="flex space-x-2">
          {["ALL", "RECEIVABLES", "PAYABLES", "PAYROLL"].map(f => (
            <button 
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${filter === f ? "bg-teal-500 text-black shadow-lg shadow-teal-500/20" : "bg-white/5 text-gray-400 hover:bg-white/10"}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-8 pt-4 custom-scrollbar">
        {loading ? (
          <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div></div>
        ) : filteredEvents.length === 0 ? (
          <div className="text-center py-20 bg-white/[0.02] border border-white/5 rounded-2xl">
            <BsListUl className="mx-auto text-4xl text-gray-600 mb-4" />
            <h3 className="text-white font-bold mb-2">No business events found</h3>
            <p className="text-gray-500 text-sm">Completed reality checks will appear here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {filteredEvents.map(event => (
              <div key={event.id} className="bg-[#0d1117] border border-white/10 rounded-2xl p-6 flex flex-col hover:border-teal-500/30 transition-all">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-white font-bold text-lg mb-1">{event.event_type?.replace(/_/g, ' ')}</h3>
                    <p className="text-xs text-gray-500">Event ID: {event.id.split('-')[0]} • {new Date(event.event_date || event.created_at).toLocaleDateString()}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-xl text-[10px] font-bold uppercase tracking-widest border ${getStatusColor(event.event_status)}`}>
                    {event.event_status?.replace(/_/g, ' ')}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-white/5 rounded-xl p-4">
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Counterparty</p>
                    <p className="text-white font-medium line-clamp-1">{event.counterparty || "Unknown"}</p>
                  </div>
                  <div className="bg-white/5 rounded-xl p-4">
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Amount</p>
                    <p className="text-xl font-black text-white">₹{event.amount?.toLocaleString() || "0"}</p>
                  </div>
                </div>

                <div className="mt-auto pt-4 border-t border-white/5 flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-gray-400">
                    <BsLightningCharge size={14} />
                    <span className="text-xs font-mono">{event.settlement_key || "No Settlement Key"}</span>
                  </div>
                  
                  {event.event_metadata && Object.keys(event.event_metadata).length > 0 && (
                    <button className="text-teal-400 text-xs font-bold hover:text-teal-300 flex items-center space-x-1">
                      <span>View Metadata</span>
                      <BsArrowRight />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
