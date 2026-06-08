import React, { useState, useEffect, useCallback } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from "recharts";
import { BsArrowRepeat } from "react-icons/bs";
import { backendService } from "../../../services/backendService";

const fmtINR = (n) => `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

export default function CashFlowView({ workbenchId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!workbenchId) return;
    setLoading(true);
    try {
      setData(await backendService.getCashFlowForecast(workbenchId, 6));
    } catch (e) {
      console.error(e); setData(null);
    } finally {
      setLoading(false);
    }
  }, [workbenchId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return <div className="flex items-center gap-2 text-gray-500 text-sm"><BsArrowRepeat className="animate-spin" /> Building forecast…</div>;
  }
  if (!data) return <div className="text-sm text-gray-500">Forecast unavailable. Ensure the backend is running.</div>;

  const chart = data.series.map((s) => ({ name: s.period.slice(2), cash: s.closing_cash, net: s.net }));

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-white mb-1">Cash-Flow Forecast</h3>
        <p className="text-gray-500 text-xs">Projected from current cash, AR/AP due dates, and recurring transactions.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#0E1117] border border-white/5 rounded-xl p-5">
          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Current Cash</div>
          <div className="text-2xl font-bold text-white">{fmtINR(data.current_cash)}</div>
        </div>
        <div className="bg-[#0E1117] border border-white/5 rounded-xl p-5">
          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Avg Monthly Net</div>
          <div className={`text-2xl font-bold ${data.avg_monthly_net >= 0 ? "text-emerald-400" : "text-red-400"}`}>{fmtINR(data.avg_monthly_net)}</div>
        </div>
        <div className="bg-[#0E1117] border border-white/5 rounded-xl p-5">
          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Runway</div>
          <div className="text-2xl font-bold text-white">{data.runway_months == null ? "Cash-positive" : `${data.runway_months} mo`}</div>
        </div>
      </div>

      <div className="bg-[#0E1117] border border-white/5 rounded-xl p-5">
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={chart} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="cashGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#14b8a6" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#14b8a6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
            <XAxis dataKey="name" stroke="#6b7280" fontSize={11} />
            <YAxis stroke="#6b7280" fontSize={11} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
            <Tooltip formatter={(v) => fmtINR(v)} contentStyle={{ background: "#0E1117", border: "1px solid #ffffff20", borderRadius: 12 }} />
            <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="4 4" />
            <Area type="monotone" dataKey="cash" stroke="#14b8a6" strokeWidth={2} fill="url(#cashGrad)" name="Closing Cash" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-[#0E1117] border border-white/5 rounded-xl overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-white/5 text-[10px] uppercase tracking-wider text-gray-500">
              <th className="px-4 py-3">Period</th>
              <th className="px-4 py-3 text-right">Inflow</th>
              <th className="px-4 py-3 text-right">Outflow</th>
              <th className="px-4 py-3 text-right">Net</th>
              <th className="px-4 py-3 text-right">Closing Cash</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {data.series.map((s, i) => (
              <tr key={i} className="text-gray-300">
                <td className="px-4 py-3">{s.period}</td>
                <td className="px-4 py-3 text-right text-emerald-400">{fmtINR(s.inflow)}</td>
                <td className="px-4 py-3 text-right text-red-400">{fmtINR(s.outflow)}</td>
                <td className={`px-4 py-3 text-right font-semibold ${s.net >= 0 ? "text-emerald-400" : "text-red-400"}`}>{fmtINR(s.net)}</td>
                <td className={`px-4 py-3 text-right font-bold ${s.closing_cash >= 0 ? "text-white" : "text-red-400"}`}>{fmtINR(s.closing_cash)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
