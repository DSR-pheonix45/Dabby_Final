import React, { useState, useEffect } from "react";
import { useWorkbench } from "../../context/WorkbenchContext";
import {
  BsCheckCircleFill,
  BsExclamationTriangleFill,
  BsArrowRepeat,
  BsCloudCheckFill,
  BsLightningChargeFill,
  BsLink45Deg,
  BsGearFill,
  BsCpuFill,
  BsShieldCheck
} from "react-icons/bs";
import { toast } from "react-hot-toast";

export default function Integrations() {
  const { activeWorkbench } = useWorkbench();
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [connectionData, setConnectionData] = useState(null);
  const [syncLogs, setSyncLogs] = useState([]);
  const [selectedTab, setSelectedTab] = useState("overview");

  useEffect(() => {
    if (activeWorkbench?.id) {
      fetchConnectionStatus();
    }
  }, [activeWorkbench]);

  const fetchConnectionStatus = async () => {
    setLoading(true);
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
      const resp = await fetch(`${backendUrl}/api/integrations/zoho/status?workbench_id=${activeWorkbench.id}`);
      const data = await resp.json();
      if (resp.ok && data.connected) {
        setConnectionData(data.connection);
        setSyncLogs(data.logs || []);
      } else {
        setConnectionData(null);
        setSyncLogs([]);
      }
    } catch (err) {
      console.error("Error fetching integration status:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleManualSync = async () => {
    if (!activeWorkbench?.id) return;
    setSyncing(true);
    const toastId = toast.loading("Executing incremental sync with Zoho Books...");
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
      const resp = await fetch(`${backendUrl}/api/integrations/zoho/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workbench_id: activeWorkbench.id, sync_type: "manual" })
      });
      const result = await resp.json();

      if (resp.ok && result.status === "success") {
        toast.success(`Sync complete! ${result.records_imported} records imported.`, { id: toastId });
        fetchConnectionStatus();
      } else {
        toast.error(`Sync failed: ${result.detail || "Unknown error"}`, { id: toastId });
      }
    } catch (err) {
      toast.error("Failed to connect to backend sync worker.", { id: toastId });
    } finally {
      setSyncing(false);
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm("Are you sure you want to disconnect Zoho Books from this Workbench?")) return;
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
      const resp = await fetch(`${backendUrl}/api/integrations/zoho/disconnect?workbench_id=${activeWorkbench.id}`, {
        method: "POST"
      });
      if (resp.ok) {
        toast.success("Zoho Books disconnected successfully.");
        setConnectionData(null);
        setSyncLogs([]);
      }
    } catch (err) {
      toast.error("Failed to disconnect ERP.");
    }
  };

  const mockConnectZoho = async () => {
    setSyncing(true);
    const toastId = toast.loading("Connecting Zoho Organization (Mock)...");
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
      const resp = await fetch(`${backendUrl}/api/integrations/zoho/connect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workbench_id: activeWorkbench.id,
          provider_org_id: "90001827",
          provider_org_name: `${activeWorkbench.name} (Zoho Org)`,
          access_token: "mock_access_token_demo",
          refresh_token: "mock_refresh_token_demo",
          api_domain: "https://www.zohoapis.in"
        })
      });
      const data = await resp.json();
      if (resp.ok) {
        toast.success("Zoho Organization bound 1:1 successfully!", { id: toastId });
        fetchConnectionStatus();
      } else {
        toast.error(data.detail || "Connection failed", { id: toastId });
      }
    } catch (err) {
      toast.error("Connection error.", { id: toastId });
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-gray-400 font-dm-sans">
        <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        Loading ERP Integration details...
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-10 font-dm-sans text-white max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">ERP & Universal Integrations Hub</h1>
          <p className="text-sm text-gray-400 mt-1">
            Connect external ERP systems directly into <span className="text-teal-400 font-semibold">{activeWorkbench?.name}</span>'s Universal Financial Graph (UFG).
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <span className="px-3 py-1 bg-teal-500/10 border border-teal-500/20 text-teal-400 text-xs font-semibold rounded-full flex items-center gap-1.5">
            <BsShieldCheck />
            1:1 Workbench Mapping Enforced
          </span>
        </div>
      </div>

      {/* Main Connection Card */}
      <div className="bg-[#181818] border border-white/10 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center space-x-5">
            <div className="w-16 h-16 bg-gradient-to-br from-red-500/20 to-amber-500/20 border border-red-500/30 rounded-2xl flex items-center justify-center text-3xl font-black text-red-400 shrink-0 shadow-lg">
              Z
            </div>
            <div>
              <div className="flex items-center space-x-3">
                <h2 className="text-xl font-bold text-white">Zoho Books Integration</h2>
                {connectionData ? (
                  <span className="px-2.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-semibold rounded-full flex items-center gap-1">
                    <BsCheckCircleFill className="w-3 h-3" />
                    Connected
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 bg-gray-500/10 text-gray-400 border border-gray-500/30 text-xs font-semibold rounded-full">
                    Not Connected
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Automated continuous sync for Chart of Accounts, Customers, Vendors, Invoices, Bills, and Ledger Entries.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3 w-full md:w-auto justify-end">
            {connectionData ? (
              <>
                <button
                  onClick={handleManualSync}
                  disabled={syncing}
                  className="px-4 py-2.5 bg-teal-500 hover:bg-teal-400 text-black font-bold text-sm rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-teal-500/10 disabled:opacity-50"
                >
                  <BsArrowRepeat className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
                  {syncing ? "Syncing..." : "Sync Now"}
                </button>
                <button
                  onClick={handleDisconnect}
                  className="px-4 py-2.5 bg-white/5 hover:bg-red-500/10 text-gray-300 hover:text-red-400 border border-white/10 hover:border-red-500/20 text-sm font-semibold rounded-xl transition-all"
                >
                  Disconnect
                </button>
              </>
            ) : (
              <button
                onClick={mockConnectZoho}
                disabled={syncing}
                className="px-6 py-3 bg-teal-500 hover:bg-teal-400 text-black font-bold text-sm rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-teal-500/10 disabled:opacity-50"
              >
                <BsLink45Deg className="w-5 h-5" />
                Connect Zoho Books
              </button>
            )}
          </div>
        </div>

        {/* Connected Org Details */}
        {connectionData && (
          <div className="mt-6 pt-6 border-t border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-[#111111] p-4 rounded-xl border border-white/5">
              <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Connected Organization</span>
              <div className="text-base font-semibold text-white mt-1">{connectionData.provider_org_name}</div>
              <span className="text-xs text-gray-400 font-mono mt-0.5 block">Org ID: {connectionData.provider_org_id}</span>
            </div>

            <div className="bg-[#111111] p-4 rounded-xl border border-white/5">
              <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">1:1 Workbench Binding</span>
              <div className="text-base font-semibold text-teal-400 mt-1 truncate">{activeWorkbench?.name}</div>
              <span className="text-xs text-emerald-400 mt-0.5 block font-medium flex items-center gap-1">
                <BsCheckCircleFill className="w-3 h-3" /> Unique constraint active
              </span>
            </div>

            <div className="bg-[#111111] p-4 rounded-xl border border-white/5">
              <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Last Synchronization</span>
              <div className="text-base font-semibold text-white mt-1">
                {connectionData.last_sync_at ? new Date(connectionData.last_sync_at).toLocaleString() : "Just now"}
              </div>
              <span className="text-xs text-gray-400 mt-0.5 block">Incremental Sync Enabled</span>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Sub-Tabs */}
      {connectionData && (
        <div className="space-y-6">
          <div className="flex border-b border-white/10 space-x-6">
            <button
              onClick={() => setSelectedTab("overview")}
              className={`pb-3 text-sm font-semibold border-b-2 transition-colors ${
                selectedTab === "overview" ? "border-teal-500 text-teal-400" : "border-transparent text-gray-400 hover:text-white"
              }`}
            >
              Sync History & Logs
            </button>
            <button
              onClick={() => setSelectedTab("ai-mapping")}
              className={`pb-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
                selectedTab === "ai-mapping" ? "border-teal-500 text-teal-400" : "border-transparent text-gray-400 hover:text-white"
              }`}
            >
              <BsCpuFill />
              AI COA Mapping Layer
            </button>
          </div>

          {selectedTab === "overview" && (
            <div className="bg-[#181818] border border-white/10 rounded-2xl p-6">
              <h3 className="text-base font-bold text-white mb-4">Sync Audit Log</h3>
              {syncLogs.length === 0 ? (
                <div className="text-center py-8 text-gray-500 text-sm">
                  No previous sync operations logged yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-gray-400">
                        <th className="pb-3">Sync Type</th>
                        <th className="pb-3">Status</th>
                        <th className="pb-3">Fetched</th>
                        <th className="pb-3">Imported (UFG)</th>
                        <th className="pb-3">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {syncLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-white/5 transition-colors">
                          <td className="py-3 font-semibold uppercase text-xs text-gray-300">{log.sync_type}</td>
                          <td className="py-3">
                            <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                              log.status === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                            }`}>
                              {log.status}
                            </span>
                          </td>
                          <td className="py-3 text-gray-300">{log.records_fetched}</td>
                          <td className="py-3 text-teal-400 font-semibold">{log.records_imported}</td>
                          <td className="py-3 text-xs text-gray-400">{new Date(log.started_at).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {selectedTab === "ai-mapping" && (
            <div className="bg-[#181818] border border-white/10 rounded-2xl p-6 space-y-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-500/20 border border-purple-500/30 text-purple-400 rounded-xl">
                  <BsCpuFill className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">AI Chart of Accounts Auto-Mapper</h3>
                  <p className="text-xs text-gray-400">Dabby automatically normalizes Zoho account titles into Universal Financial Graph standard classifications.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                <div className="bg-[#111111] p-4 rounded-xl border border-white/5 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-gray-500">Zoho Account:</span>
                    <div className="text-sm font-semibold text-white">Sales A/c</div>
                  </div>
                  <div className="text-teal-400 text-xs font-semibold bg-teal-500/10 px-3 py-1 rounded-lg border border-teal-500/20">
                    ➔ Revenue
                  </div>
                </div>

                <div className="bg-[#111111] p-4 rounded-xl border border-white/5 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-gray-500">Zoho Account:</span>
                    <div className="text-sm font-semibold text-white">Freight Outward</div>
                  </div>
                  <div className="text-teal-400 text-xs font-semibold bg-teal-500/10 px-3 py-1 rounded-lg border border-teal-500/20">
                    ➔ Logistics Expense
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
