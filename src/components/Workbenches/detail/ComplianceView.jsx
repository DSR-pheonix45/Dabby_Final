import React, { useState, useEffect, useCallback } from "react";
import { 
  BsClock, 
  BsCheckCircle, 
  BsExclamationCircle,
  BsSearch,
  BsFilter
} from "react-icons/bs";
import { supabase } from "../../../lib/supabase";
import { backendService } from "../../../services/backendService";
import { toast } from "react-hot-toast";

const fmtINR = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

export default function ComplianceView({ workbenchId }) {
  const [compliances, setCompliances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [gst, setGst] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [recon, setRecon] = useState(null);
  const [reconciling, setReconciling] = useState(false);

  const downloadJSON = (obj, filename) => {
    const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  const currentPeriod = () => new Date().toISOString().slice(0, 7); // YYYY-MM

  const handleFiling = async (kind) => {
    try {
      const period = currentPeriod();
      if (kind === "gstr1") {
        const data = await backendService.getGstr1(workbenchId, period);
        downloadJSON(data, `GSTR1-${period}.json`);
      } else if (kind === "gstr3b") {
        const data = await backendService.getGstr3b(workbenchId, period);
        downloadJSON(data, `GSTR3B-${period}.json`);
      } else if (kind === "26q") {
        const now = new Date();
        const m = now.getMonth();
        const q = m < 3 ? "Q4" : m < 6 ? "Q1" : m < 9 ? "Q2" : "Q3";
        const fy = `${m < 3 ? now.getFullYear() - 1 : now.getFullYear()}-${String((m < 3 ? now.getFullYear() : now.getFullYear() + 1)).slice(-2)}`;
        const data = await backendService.getTds26q(workbenchId, q, fy);
        downloadJSON(data, `26Q-${fy}-${q}.json`);
      }
      toast.success("Filing data generated");
    } catch (err) {
      toast.error(err.message || "Failed to generate filing");
    }
  };

  const handleSendReminders = async () => {
    try {
      const res = await backendService.sendPaymentReminders(workbenchId);
      if (!res.email_enabled) {
        toast(`${res.overdue} overdue invoice(s) found. Configure email (RESEND_API_KEY) to send.`, { icon: "✉️" });
      } else {
        toast.success(`Sent ${res.sent} reminder(s) for overdue invoices`);
      }
    } catch (err) {
      toast.error(err.message || "Failed to send reminders");
    }
  };

  const handleReconcile = async () => {
    if (!workbenchId) return;
    setReconciling(true);
    try {
      setRecon(await backendService.runReconciliation(workbenchId));
    } catch (err) {
      toast.error(err.message || "Reconciliation failed");
    } finally {
      setReconciling(false);
    }
  };

  const handleGenerateCalendar = async () => {
    if (!workbenchId) return;
    setGenerating(true);
    try {
      const res = await backendService.generateComplianceCalendar(workbenchId, 12);
      toast.success(`Added ${res.generated} compliance deadlines`);
      fetchCompliances();
    } catch (err) {
      toast.error(err.message || "Failed to generate calendar");
    } finally {
      setGenerating(false);
    }
  };

  const handleMarkFiled = async (id) => {
    try {
      await backendService.markComplianceFiled(id);
      toast.success("Marked as filed");
      fetchCompliances();
    } catch (err) {
      toast.error(err.message || "Failed to update");
    }
  };

  const fetchCompliances = useCallback(async () => {
    if (!workbenchId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("compliances")
        .select("*")
        .eq("workbench_id", workbenchId)
        .order("deadline", { ascending: true });

      if (error) throw error;
      setCompliances(data || []);
    } catch (err) {
      console.error("Error fetching compliances:", err);
    } finally {
      setLoading(false);
    }
  }, [workbenchId]);

  const fetchGst = useCallback(async () => {
    if (!workbenchId) return;
    try {
      setGst(await backendService.getGstSummary(workbenchId));
    } catch (err) {
      console.error("Error fetching GST summary:", err);
      setGst(null);
    }
  }, [workbenchId]);

  useEffect(() => {
    fetchCompliances();
    fetchGst();

    const refresh = () => { fetchCompliances(); fetchGst(); };
    // App dispatches 'refresh-ledger-data' after ledger writes.
    window.addEventListener('refresh-ledger-data', refresh);
    return () => window.removeEventListener('refresh-ledger-data', refresh);
  }, [workbenchId, fetchCompliances, fetchGst]);

  const processStatus = (item) => {
    if (item.status === 'filed') return 'filed';
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadline = new Date(item.deadline);
    
    if (deadline < today) return 'overdue';
    return item.status;
  };

  const filteredCompliances = compliances.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.form && item.form.toLowerCase().includes(searchQuery.toLowerCase()))
  ).map(item => ({
    ...item,
    displayStatus: processStatus(item)
  }));

  const stats = filteredCompliances.reduce((acc, curr) => {
    acc[curr.displayStatus] = (acc[curr.displayStatus] || 0) + 1;
    return acc;
  }, { filed: 0, pending: 0, overdue: 0 });

  const getStatusStyle = (status) => {
    switch (status) {
      case 'filed': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'overdue': return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'pending': return 'bg-primary-300/10 text-primary-300 border-primary-300/20';
      default: return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'filed': return <BsCheckCircle className="text-emerald-500/70" />;
      case 'overdue': return <BsExclamationCircle />;
      case 'pending': return <BsClock className="text-primary-300" />;
      default: return null;
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const healthColor = (h) => h >= 80 ? "text-emerald-400" : h >= 50 ? "text-amber-400" : "text-red-400";

  return (
    <div className="space-y-6">
      {/* Books health / reconciliation */}
      <div className="bg-[#0E1117] border border-white/5 rounded-xl p-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="text-lg font-bold text-white mb-1">Books Health</h3>
            <p className="text-gray-500 text-xs">Reconcile the ledger against AR/AP and check for gaps.</p>
          </div>
          <button
            onClick={handleReconcile}
            disabled={reconciling}
            className="px-4 py-2 rounded-xl text-sm font-bold bg-white/5 border border-white/10 text-gray-200 hover:bg-white/10 transition-all disabled:opacity-50"
          >
            {reconciling ? "Reconciling…" : "Run Reconciliation"}
          </button>
        </div>

        {recon && (
          <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-black/20 rounded-xl p-4">
              <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Health Score</div>
              <div className={`text-3xl font-bold ${healthColor(recon.health_score)}`}>{recon.health_score}<span className="text-base text-gray-600">/100</span></div>
            </div>
            <div className="bg-black/20 rounded-xl p-4">
              <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Completeness</div>
              <div className="text-3xl font-bold text-white">{recon.completeness_percentage}%</div>
              <div className="text-[10px] text-gray-500 mt-1">{recon.missing_months} missing month(s)</div>
            </div>
            <div className="bg-black/20 rounded-xl p-4">
              <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Checks</div>
              {recon.checks?.length ? recon.checks.map((c, i) => (
                <div key={i} className="flex items-center justify-between text-xs mb-1">
                  <span className="text-gray-400">{c.name}</span>
                  <span className={c.ok ? "text-emerald-400" : "text-red-400"}>{c.ok ? "Matched" : `Δ ${fmtINR(c.difference)}`}</span>
                </div>
              )) : <div className="text-xs text-gray-600">No AR/AP accounts found.</div>}
            </div>
            {recon.issues?.length > 0 && (
              <div className="md:col-span-3 space-y-1">
                {recon.issues.map((iss, i) => (
                  <div key={i} className="text-[11px] text-amber-300/80 flex items-start gap-2">
                    <BsExclamationCircle className="mt-0.5 flex-shrink-0" /> {iss}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* GST / TDS summary */}
      {gst && (
        <div>
          <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
            <h3 className="text-lg font-bold text-white">GST &amp; TDS Position</h3>
            <div className="flex items-center gap-2">
              <button onClick={() => handleFiling("gstr1")} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white/5 border border-white/10 text-gray-200 hover:bg-white/10">GSTR-1</button>
              <button onClick={() => handleFiling("gstr3b")} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white/5 border border-white/10 text-gray-200 hover:bg-white/10">GSTR-3B</button>
              <button onClick={() => handleFiling("26q")} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white/5 border border-white/10 text-gray-200 hover:bg-white/10">TDS 26Q</button>
              <button onClick={handleSendReminders} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-teal-500/10 border border-teal-500/20 text-teal-300 hover:bg-teal-500/20">Send Reminders</button>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-[#0E1117] border border-white/5 rounded-xl p-5">
              <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Output GST (Sales)</div>
              <div className="text-xl font-bold text-white">{fmtINR(gst.output_gst)}</div>
              <div className="text-[10px] text-gray-500 mt-1">on {fmtINR(gst.taxable_sales)} taxable</div>
            </div>
            <div className="bg-[#0E1117] border border-white/5 rounded-xl p-5">
              <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Input GST (Purchases)</div>
              <div className="text-xl font-bold text-white">{fmtINR(gst.input_gst)}</div>
              <div className="text-[10px] text-gray-500 mt-1">ITC on {fmtINR(gst.taxable_purchases)}</div>
            </div>
            <div className="bg-[#0E1117] border border-white/5 rounded-xl p-5">
              <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Net GST Payable</div>
              <div className={`text-xl font-bold ${Number(gst.net_gst_payable) >= 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                {fmtINR(gst.net_gst_payable)}
              </div>
              <div className="text-[10px] text-gray-500 mt-1">{Number(gst.net_gst_payable) >= 0 ? 'payable to govt' : 'credit carried forward'}</div>
            </div>
            <div className="bg-[#0E1117] border border-white/5 rounded-xl p-5">
              <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">TDS Deducted</div>
              <div className="text-xl font-bold text-white">{fmtINR(gst.tds_deducted)}</div>
              <div className="text-[10px] text-gray-500 mt-1">to deposit</div>
            </div>
          </div>
        </div>
      )}

      {/* Header & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-white mb-1">Compliance Checklist</h3>
          <div className="flex items-center space-x-4 text-[10px] font-bold tracking-wider uppercase">
            <span className="text-emerald-500">{stats.filed} compliant</span>
            <span className="text-primary-300">{stats.pending} pending</span>
            <span className="text-red-500">{stats.overdue} overdue</span>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="relative">
            <BsSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm" />
            <input
              type="text"
              placeholder="Search forms..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-primary/30 w-64"
            />
          </div>
          <button
            onClick={handleGenerateCalendar}
            disabled={generating}
            className="px-4 py-2 rounded-xl text-sm font-bold bg-teal-500 text-black hover:bg-teal-400 transition-all disabled:opacity-50 whitespace-nowrap"
          >
            {generating ? "Generating…" : "Generate Calendar"}
          </button>
        </div>
      </div>
      
      {/* Checklist Table */}
      <div className="bg-[#0E1117] border border-white/5 rounded-xl overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-white/5 bg-white/[0.02]">
              <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Compliance Form</th>
              <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Due Date</th>
              <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest text-center">Status</th>
              <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading ? (
              <tr>
                <td colSpan="4" className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center space-y-3">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs text-gray-500 font-medium">Loading compliance data...</span>
                  </div>
                </td>
              </tr>
            ) : filteredCompliances.length === 0 ? (
              <tr>
                <td colSpan="4" className="px-6 py-12 text-center">
                  <div className="text-sm text-gray-500">No compliance records found</div>
                </td>
              </tr>
            ) : (
              filteredCompliances.map((item, i) => (
                <tr key={item.id || i} className="group hover:bg-white/[0.02] transition-colors">
                  <td className="px-6 py-5">
                    <div className="text-sm font-medium text-white group-hover:text-primary-300 transition-colors">{item.name}</div>
                    <div className="text-[10px] text-gray-500 mt-0.5">{item.form || "General"}</div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="text-sm text-gray-300">{formatDate(item.deadline)}</div>
                    {item.filed_date && (
                      <div className="text-[10px] text-emerald-500 mt-0.5">Filed: {formatDate(item.filed_date)}</div>
                    )}
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex justify-center">
                      <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${getStatusStyle(item.displayStatus)}`}>
                        {getStatusIcon(item.displayStatus)}
                        {item.displayStatus.toUpperCase()}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    {item.displayStatus === 'filed' ? (
                      <span className="text-[10px] font-bold text-emerald-500/70 uppercase tracking-wider">Filed</span>
                    ) : (
                      <button
                        onClick={() => handleMarkFiled(item.id)}
                        className="text-[10px] font-bold text-teal-400 hover:text-teal-300 uppercase tracking-wider transition-colors"
                      >
                        Mark Filed
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
