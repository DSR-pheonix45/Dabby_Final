import React, { useState, useEffect } from "react";
import { BsLightningCharge, BsArrowDownRight, BsArrowUpRight, BsCashStack } from "react-icons/bs";
import { apiFetch } from "../../../lib/apiClient";
import toast from "react-hot-toast";

export default function CashFlowView({ workbenchId }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (workbenchId) fetchEvents();
  }, [workbenchId]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const res = await apiFetch(`/api/business-events/workbench/${workbenchId}?limit=1000`);
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events || data || []);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load cash events");
    } finally {
      setLoading(false);
    }
  };

  // Filter only cash events
  const cashEvents = events.filter(e => [
    'CUSTOMER_PAYMENT_RECEIVED', 'LOAN_RECEIVED', 'INVESTMENT_RECEIVED', 
    'VENDOR_PAYMENT_MADE', 'PAYROLL_PAID', 'TAX_PAID', 'EXPENSE_INCURRED', 'BANK_ACTIVITY_RECORDED'
  ].includes(e.event_type)).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  // Tier 1: Cash In / Out
  const cashInEvents = cashEvents.filter(e => ['CUSTOMER_PAYMENT_RECEIVED', 'LOAN_RECEIVED', 'INVESTMENT_RECEIVED'].includes(e.event_type));
  const cashOutEvents = cashEvents.filter(e => ['VENDOR_PAYMENT_MADE', 'PAYROLL_PAID', 'TAX_PAID', 'EXPENSE_INCURRED'].includes(e.event_type));
  
  const cashIn = cashInEvents.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const cashOut = cashOutEvents.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const netCashFlow = cashIn - cashOut;

  // Tier 2: Monthly Net Burn
  const operatingCashIn = cashEvents.filter(e => e.event_type === 'CUSTOMER_PAYMENT_RECEIVED').reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const monthlyNetBurn = cashOut - operatingCashIn;

  // Tier 3: Runway
  const currentCashPosition = 500000; // Mock current balance
  const runwayMonths = monthlyNetBurn > 0 ? (currentCashPosition / monthlyNetBurn).toFixed(1) : null;

  const formatCurrency = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Math.abs(val || 0));

  if (loading) {
    return <div className="flex-1 flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div></div>;
  }

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] overflow-y-auto custom-scrollbar p-8">
      <div className="flex items-center space-x-3 mb-8">
        <BsLightningCharge className="text-teal-400 text-2xl" />
        <h2 className="text-2xl font-bold text-white">Cash Flow</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Tier 1 */}
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-6">
          <div className="flex items-center space-x-2 mb-2">
            <BsArrowDownRight className="text-emerald-400" />
            <p className="text-xs font-bold text-emerald-500 uppercase tracking-widest">Cash In</p>
          </div>
          <p className="text-3xl font-black text-emerald-400">{formatCurrency(cashIn)}</p>
        </div>
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-6">
          <div className="flex items-center space-x-2 mb-2">
            <BsArrowUpRight className="text-rose-400" />
            <p className="text-xs font-bold text-rose-500 uppercase tracking-widest">Cash Out</p>
          </div>
          <p className="text-3xl font-black text-rose-400">{formatCurrency(cashOut)}</p>
        </div>
        <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6">
          <div className="flex items-center space-x-2 mb-2">
            <BsCashStack className={netCashFlow >= 0 ? "text-emerald-400" : "text-rose-400"} />
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Net Cash Flow</p>
          </div>
          <p className={`text-3xl font-black ${netCashFlow >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
            {netCashFlow < 0 ? "-" : "+"}{formatCurrency(netCashFlow)}
          </p>
        </div>
      </div>

      {/* Tier 2 & 3 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
        <div className="bg-[#0d1117] border border-white/5 rounded-2xl p-6 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Monthly Net Burn</p>
            <p className="text-[10px] text-gray-600 mb-2">Cash Outflows - Operating Inflows</p>
          </div>
          <p className="text-3xl font-black text-white">
            {monthlyNetBurn > 0 ? formatCurrency(monthlyNetBurn) : <span className="text-emerald-400 text-xl">Positive Generation</span>}
          </p>
        </div>
        <div className="bg-gradient-to-br from-teal-500/10 to-cyan-500/10 border border-teal-500/20 rounded-2xl p-6 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-teal-500 uppercase tracking-widest mb-1">Estimated Runway</p>
            <p className="text-[10px] text-teal-500/50 mb-2">Current Cash / Net Burn</p>
          </div>
          <p className="text-3xl font-black text-teal-400">
            {runwayMonths ? `${runwayMonths} Months` : "Sustainable"}
          </p>
        </div>
      </div>

      {/* Timeline Feed */}
      <div>
        <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-6">Timeline Feed</h3>
        <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-white/10 before:to-transparent">
          {cashEvents.map(event => {
            const isInflow = ['CUSTOMER_PAYMENT_RECEIVED', 'LOAN_RECEIVED', 'INVESTMENT_RECEIVED'].includes(event.event_type);
            return (
              <div key={event.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-[#0a0a0a] shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm bg-[#0d1117] z-10">
                  {isInflow ? <BsArrowDownRight className="text-emerald-400" /> : <BsArrowUpRight className="text-rose-400" />}
                </div>
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-white/5 bg-[#0d1117] hover:border-white/20 transition-all">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-white font-bold">{event.event_type.replace(/_/g, ' ')}</span>
                    <span className={`font-black ${isInflow ? "text-emerald-400" : "text-rose-400"}`}>
                      {isInflow ? "+" : "-"} {formatCurrency(event.amount)}
                    </span>
                  </div>
                  <div className="text-gray-500 text-xs">
                    {event.counterparty || "Unknown"} • {new Date(event.event_date || event.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
