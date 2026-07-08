import React, { useState, useEffect } from "react";
import { BsGraphUp, BsCash, BsLightningCharge, BsWallet2, BsBuilding, BsArrowUpRight, BsArrowDownRight } from "react-icons/bs";
import { apiFetch } from "../../../lib/apiClient";
import toast from "react-hot-toast";

export default function BusinessHealthView({ workbenchId }) {
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState([]);
  
  useEffect(() => {
    if (workbenchId) {
      fetchEvents();
    }
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
      toast.error("Failed to load business events");
    } finally {
      setLoading(false);
    }
  };

  // Calculate KPIs
  // Tier 1: Cash In / Out
  const cashInEvents = events.filter(e => ['CUSTOMER_PAYMENT_RECEIVED', 'LOAN_RECEIVED', 'INVESTMENT_RECEIVED'].includes(e.event_type));
  const cashOutEvents = events.filter(e => ['VENDOR_PAYMENT_MADE', 'PAYROLL_PAID', 'TAX_PAID', 'EXPENSE_INCURRED'].includes(e.event_type));
  
  const cashIn = cashInEvents.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const cashOut = cashOutEvents.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const netCashFlow = cashIn - cashOut;

  // Tier 2: Monthly Net Burn
  const operatingCashIn = events.filter(e => e.event_type === 'CUSTOMER_PAYMENT_RECEIVED').reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const monthlyNetBurn = cashOut - operatingCashIn;

  // Revenue & Outstanding
  const revenue = events.filter(e => e.event_type === 'CUSTOMER_BILLED').reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const payables = events.filter(e => e.event_type === 'VENDOR_BILLED' && e.event_status !== 'SETTLED').reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const receivables = events.filter(e => e.event_type === 'CUSTOMER_BILLED' && e.event_status !== 'SETTLED').reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  // Tier 3: Runway
  const currentCashPosition = 500000; // Mock current balance since we don't have historical bank balance without ledger
  const runwayMonths = monthlyNetBurn > 0 ? (currentCashPosition / monthlyNetBurn).toFixed(1) : null;

  const formatCurrency = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val || 0);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
      </div>
    );
  }

  return (
    <div className="p-8 h-full overflow-y-auto custom-scrollbar bg-[#0a0a0a]">
      <div className="flex items-center space-x-3 mb-8">
        <BsGraphUp className="text-teal-400 text-2xl" />
        <h2 className="text-2xl font-bold text-white">Business Health</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {/* Tier 1: Core Performance */}
        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10"><BsLightningCharge size={40} className="text-teal-500" /></div>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Revenue Generated</p>
          <p className="text-3xl font-black text-white">{formatCurrency(revenue)}</p>
        </div>
        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Cash Collected</p>
          <p className="text-3xl font-black text-emerald-400">{formatCurrency(cashIn)}</p>
        </div>
        <div className="bg-white/[0.02] border border-rose-500/10 rounded-2xl p-6">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Outstanding Payables</p>
          <p className="text-3xl font-black text-rose-400">{formatCurrency(payables)}</p>
        </div>
        <div className="bg-white/[0.02] border border-emerald-500/10 rounded-2xl p-6">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Outstanding Receivables</p>
          <p className="text-3xl font-black text-emerald-400">{formatCurrency(receivables)}</p>
        </div>
      </div>

      <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Cash Runway & Burn</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Current Cash Position</p>
          <p className="text-3xl font-black text-white">{formatCurrency(currentCashPosition)}</p>
        </div>
        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Monthly Net Burn</p>
          <p className="text-3xl font-black text-white">
            {monthlyNetBurn > 0 ? formatCurrency(monthlyNetBurn) : <span className="text-emerald-400 text-lg">Positive Generation</span>}
          </p>
          <p className="text-[10px] text-gray-500 mt-2">Cash Outflows - Operating Inflows</p>
        </div>
        <div className="bg-gradient-to-br from-teal-500/10 to-cyan-500/10 border border-teal-500/20 rounded-2xl p-6">
          <p className="text-xs font-bold text-teal-500 uppercase tracking-widest mb-1">Estimated Runway</p>
          <p className="text-3xl font-black text-teal-400">
            {runwayMonths ? `${runwayMonths} Months` : "Sustainable"}
          </p>
        </div>
      </div>
    </div>
  );
}
