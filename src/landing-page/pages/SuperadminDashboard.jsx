import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../lib/supabase";
import { backendService } from "../../services/backendService";
import { useTheme } from "../../context/ThemeContext";
import { 
  Users, Key, CreditCard, BarChart2, Shield, Plus, CheckCircle, 
  XCircle, AlertTriangle, RefreshCw, Layers, Eye, ShieldAlert,
  ChevronRight, Calendar, Activity, Zap, DollarSign, LogOut
} from "lucide-react";

export default function SuperadminDashboard() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const navigate = useNavigate();

  // Authentication & Loading
  const [isAdmin, setIsAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [errorMsg, setErrorMsg] = useState("");

  // Modals & Forms State
  const [showAddKey, setShowAddKey] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newKeyLabel, setNewKeyLabel] = useState("");

  const [showAddWaitlist, setShowAddWaitlist] = useState(false);
  const [newWaitlistEmail, setNewWaitlistEmail] = useState("");
  const [newWaitlistStatus, setNewWaitlistStatus] = useState("approved");

  const [showSimulatePay, setShowSimulatePay] = useState(false);
  const [simWbId, setSimWbId] = useState("");
  const [simEmail, setSimEmail] = useState("");
  const [simAmount, setSimAmount] = useState("4000");
  const [simPlan, setSimPlan] = useState("go");

  const [actionLoading, setActionLoading] = useState(false);

  // 1. Verify Superadmin Session on Mount
  useEffect(() => {
    async function verifyAndFetch() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user?.email) {
          setIsAdmin(false);
          setLoading(false);
          return;
        }

        // Call the check-waitlist endpoint (which checks superadmin table first)
        const email = session.user.email;
        const res = await apiFetch(`/api/plans/check-waitlist?email=${encodeURIComponent(email)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.is_superadmin) {
            setIsAdmin(true);
            await refreshStats();
          } else {
            setIsAdmin(false);
          }
        } else {
          setIsAdmin(false);
        }
      } catch (err) {
        console.error("Superadmin verification error:", err);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    }
    verifyAndFetch();
  }, []);

  // 2. Fetch Stats
  const refreshStats = async () => {
    try {
      setErrorMsg("");
      const data = await backendService.getSuperadminStats();
      setStats(data);
    } catch (err) {
      console.error("Error fetching stats:", err);
      setErrorMsg("Failed to load administration statistics. Make sure the database tables are seeded.");
    }
  };

  // 3. Waitlist Actions
  const handleUpdateWaitlist = async (email, status) => {
    try {
      setActionLoading(true);
      await backendService.updateWaitlistStatus(email, status);
      await refreshStats();
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddWaitlist = async (e) => {
    e.preventDefault();
    if (!newWaitlistEmail.trim()) return;
    try {
      setActionLoading(true);
      await backendService.addWaitlistEmail(newWaitlistEmail, newWaitlistStatus);
      setNewWaitlistEmail("");
      setShowAddWaitlist(false);
      await refreshStats();
    } catch (err) {
      alert("Error adding email: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // 4. Groq Key Actions
  const handleAddGroqKey = async (e) => {
    e.preventDefault();
    if (!newKey.trim()) return;
    try {
      setActionLoading(true);
      await backendService.addGroqKey(newKey, newKeyLabel);
      setNewKey("");
      setNewKeyLabel("");
      setShowAddKey(false);
      await refreshStats();
    } catch (err) {
      alert("Error adding key: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateKeyStatus = async (id, status) => {
    try {
      setActionLoading(true);
      await backendService.updateGroqKeyStatus(id, status);
      await refreshStats();
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteKey = async (id) => {
    if (!confirm("Are you sure you want to delete this Groq API Key?")) return;
    try {
      setActionLoading(true);
      await backendService.deleteGroqKey(id);
      await refreshStats();
    } catch (err) {
      alert("Error deleting key: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // 5. Workbench & Plan Actions
  const handleChangePlan = async (wbId, newPlan) => {
    try {
      setActionLoading(true);
      await backendService.changeWorkbenchPlan(wbId, newPlan);
      await refreshStats();
    } catch (err) {
      alert("Error changing plan: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSimulatePayment = async (e) => {
    e.preventDefault();
    if (!simWbId || !simEmail) {
      alert("Please fill in the Workbench ID and email address.");
      return;
    }
    try {
      setActionLoading(true);
      await backendService.simulatePayment(simWbId, simEmail, parseFloat(simAmount), simPlan);
      // Automatically update plan as well to reflect upgrade
      await backendService.changeWorkbenchPlan(simWbId, simPlan);
      setSimWbId("");
      setSimEmail("");
      setShowSimulatePay(false);
      await refreshStats();
    } catch (err) {
      alert("Error simulating payment: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // --- Render Gates ---

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center flex-col gap-4">
        <div className="w-12 h-12 border-4 border-[#00FFD1] border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-400 text-sm tracking-widest font-mono">LOADING CONTROL CENTER...</p>
      </div>
    );
  }

  if (isAdmin === false) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col justify-center items-center px-6">
        <div className="w-20 h-20 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-500 mb-8 animate-pulse">
          <ShieldAlert size={48} />
        </div>
        <h1 className="text-3xl font-bold tracking-tight mb-3">Unauthorized Access</h1>
        <p className="text-gray-400 text-center max-w-md mb-8">
          This dashboard is reserved for Dabby platform administrators only. Please log in with a superadmin credential.
        </p>
        <button
          onClick={() => navigate("/login")}
          className="px-6 py-3 rounded-xl font-bold text-black bg-[#00FFD1] hover:bg-[#00FFD1]/90 transition-all"
        >
          Go to Sign In
        </button>
      </div>
    );
  }

  // Calculate high-level stats cards
  const totalWaitlist = stats?.waitlist?.length || 0;
  const pendingWaitlist = stats?.waitlist?.filter(w => w.status === "pending").length || 0;
  const activeKeys = stats?.groq_keys?.filter(k => k.status === "active").length || 0;
  const totalKeys = stats?.groq_keys?.length || 0;
  const totalPayments = stats?.payments?.length || 0;
  const totalWorkbenches = stats?.workbenches?.length || 0;

  return (
    <div className={`min-h-screen p-8 bg-black text-gray-100 font-sans`}>
      {/* Background Neon Glows */}
      <div className="fixed top-0 left-0 w-[500px] h-[500px] rounded-full bg-[#00FFD1]/5 blur-[150px] pointer-events-none" />
      <div className="fixed bottom-0 right-0 w-[600px] h-[600px] rounded-full bg-[#7928ca]/5 blur-[180px] pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10 space-y-8">
        
        {/* Header Block */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-white/10 pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-[#00FFD1]/10 text-[#00FFD1] border border-[#00FFD1]/20">
                <Shield size={24} />
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-white font-display">
                Superadmin Dashboard
              </h1>
            </div>
            <p className="text-gray-400 text-sm">
              Control center for key rotation pool, waitlist access, and subscription plan management.
            </p>
          </div>
          
          <div className="flex items-center gap-3 mt-4 md:mt-0">
            <button
              onClick={refreshStats}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all"
            >
              <RefreshCw size={14} className={actionLoading ? "animate-spin text-[#00FFD1]" : ""} />
              Refresh System Metrics
            </button>
            <button
              onClick={() => {
                supabase.auth.signOut();
                navigate("/login");
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-red-950/20 border border-red-500/30 hover:bg-red-900/30 hover:border-red-500/50 text-red-400 transition-all"
            >
              <LogOut size={14} />
              Log Out
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/10 text-red-400 flex items-center gap-3 text-sm">
            <AlertTriangle size={18} className="flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Dashboard Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-white/5 pb-2">
          {[
            { id: "overview", label: "Overview & Analytics", icon: BarChart2 },
            { id: "waitlist", label: `Waitlist Gating (${pendingWaitlist} Pending)`, icon: Users },
            { id: "keys", label: `Groq Rotation Health (${activeKeys}/${totalKeys})`, icon: Key },
            { id: "payments", label: "Plans & Payments", icon: CreditCard }
          ].map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-bold transition-all ${
                  active 
                    ? "bg-[#00FFD1]/15 border border-[#00FFD1]/40 text-[#00FFD1]" 
                    : "bg-white/5 border border-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon size={14} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* KPI Summaries Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-2">
            <div className="flex justify-between items-center text-gray-400">
              <span className="text-xs font-bold uppercase tracking-wider">Total Waitlist</span>
              <Users size={16} className="text-[#00FFD1]" />
            </div>
            <p className="text-3xl font-bold text-white">{totalWaitlist}</p>
            <p className="text-[10px] text-gray-500">{pendingWaitlist} approvals pending</p>
          </div>

          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-2">
            <div className="flex justify-between items-center text-gray-400">
              <span className="text-xs font-bold uppercase tracking-wider">Active API Keys</span>
              <Key size={16} className="text-emerald-400" />
            </div>
            <p className="text-3xl font-bold text-white">{activeKeys} <span className="text-sm font-normal text-gray-500">/ {totalKeys}</span></p>
            <p className="text-[10px] text-gray-500">keys currently operational</p>
          </div>

          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-2">
            <div className="flex justify-between items-center text-gray-400">
              <span className="text-xs font-bold uppercase tracking-wider">Payments Logged</span>
              <CreditCard size={16} className="text-[#7928ca]" />
            </div>
            <p className="text-3xl font-bold text-white">{totalPayments}</p>
            <p className="text-[10px] text-gray-500">Razorpay subscription updates</p>
          </div>

          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-2">
            <div className="flex justify-between items-center text-gray-400">
              <span className="text-xs font-bold uppercase tracking-wider">Total Orgs</span>
              <Layers size={16} className="text-blue-400" />
            </div>
            <p className="text-3xl font-bold text-white">{totalWorkbenches}</p>
            <p className="text-[10px] text-gray-500">workbenches created on Dabby</p>
          </div>
        </div>

        {/* Tab Contents */}
        <AnimatePresence mode="wait">
          
          {/* Tab 1: Overview & Analytics */}
          {activeTab === "overview" && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-6"
            >
              {/* Page Views aggregate */}
              <div className="lg:col-span-2 p-6 rounded-2xl bg-white/5 border border-white/10 space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <BarChart2 size={16} className="text-[#00FFD1]" />
                    Page-wise Usage Statistics
                  </h3>
                  <span className="text-xs bg-white/5 px-3 py-1 rounded-full text-gray-400">
                    Total logged views: {stats?.page_views?.total_count || 0}
                  </span>
                </div>

                <div className="space-y-4">
                  {(!stats?.page_views?.path_aggregates || stats.page_views.path_aggregates.length === 0) ? (
                    <p className="text-xs text-gray-500 text-center py-10 font-mono">NO NAVIGATION DATA RECORDED YET</p>
                  ) : (
                    stats.page_views.path_aggregates.map((item, idx) => {
                      // Simple bar width calculation
                      const maxCount = Math.max(...stats.page_views.path_aggregates.map(a => a.count));
                      const percent = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
                      return (
                        <div key={idx} className="space-y-1.5">
                          <div className="flex justify-between text-xs font-mono">
                            <span className="text-[#00FFD1]">{item.path}</span>
                            <span className="text-white font-bold">{item.count} views</span>
                          </div>
                          <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-[#00FFD1] to-[#7928ca] rounded-full" 
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Recent view logs */}
              <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-6">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Eye size={16} className="text-[#7928ca]" />
                  Live Navigation Log
                </h3>

                <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                  {(!stats?.page_views?.recent_logs || stats.page_views.recent_logs.length === 0) ? (
                    <p className="text-xs text-gray-500 text-center py-10 font-mono">LOG EMPTY</p>
                  ) : (
                    stats.page_views.recent_logs.map((view, idx) => (
                      <div key={idx} className="p-3 rounded-lg bg-white/5 border border-white/5 space-y-1">
                        <div className="flex justify-between text-[11px] font-mono text-gray-400">
                          <span className="truncate max-w-[130px]">{view.email || "anonymous"}</span>
                          <span>{new Date(view.created_at).toLocaleTimeString()}</span>
                        </div>
                        <p className="text-xs font-semibold text-white font-mono truncate">{view.path}</p>
                        <p className="text-[9px] text-gray-600 font-mono">IP: {view.ip_address || "Unknown"}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* Tab 2: Waitlist Management */}
          {activeTab === "waitlist" && (
            <motion.div
              key="waitlist"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-6"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Users size={16} className="text-[#00FFD1]" />
                  Waitlist Approval Queue
                </h3>
                <button
                  onClick={() => setShowAddWaitlist(true)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-black bg-[#00FFD1] hover:bg-[#00FFD1]/90 transition-all"
                >
                  <Plus size={14} />
                  Add Waitlist User
                </button>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 text-gray-400 uppercase font-mono tracking-wider">
                      <th className="py-3 px-4">Email</th>
                      <th className="py-3 px-4">Joined Date</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(!stats?.waitlist || stats.waitlist.length === 0) ? (
                      <tr>
                        <td colSpan="4" className="text-center py-10 text-gray-500 font-mono">WAITLIST IS EMPTY</td>
                      </tr>
                    ) : (
                      stats.waitlist.map((user, idx) => {
                        const isPending = user.status === "pending" || !user.status;
                        const isApproved = user.status === "approved";
                        const isRejected = user.status === "rejected";
                        
                        return (
                          <tr key={idx} className="border-b border-white/5 hover:bg-white/5 transition-all">
                            <td className="py-3 px-4 font-mono font-semibold text-white">{user.email}</td>
                            <td className="py-3 px-4 text-gray-400 font-mono">
                              {new Date(user.created_at).toLocaleDateString()}
                            </td>
                            <td className="py-3 px-4">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                                isApproved ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400" :
                                isRejected ? "bg-red-500/10 border border-red-500/30 text-red-400" :
                                "bg-amber-500/10 border border-amber-500/30 text-amber-400"
                              }`}>
                                {user.status || "pending"}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right space-x-2">
                              {!isApproved && (
                                <button
                                  onClick={() => handleUpdateWaitlist(user.email, "approved")}
                                  disabled={actionLoading}
                                  className="px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/20 transition-all text-[11px]"
                                >
                                  Approve
                                </button>
                              )}
                              {!isRejected && (
                                <button
                                  onClick={() => handleUpdateWaitlist(user.email, "rejected")}
                                  disabled={actionLoading}
                                  className="px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold border border-red-500/20 transition-all text-[11px]"
                                >
                                  Reject
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {/* Tab 3: Groq Key Health */}
          {activeTab === "keys" && (
            <motion.div
              key="keys"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              <div className="flex justify-between items-center">
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Key size={16} className="text-[#00FFD1]" />
                    Groq Key Rotation Pool
                  </h3>
                  <p className="text-xs text-gray-500">
                    Add multiple keys to rotate calls. Rate-limited keys (429) or invalid keys (401) are automatically marked and rotated.
                  </p>
                </div>
                <button
                  onClick={() => setShowAddKey(true)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-black bg-[#00FFD1] hover:bg-[#00FFD1]/90 transition-all"
                >
                  <Plus size={14} />
                  Add Groq Key
                </button>
              </div>

              {/* Key Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(!stats?.groq_keys || stats.groq_keys.length === 0) ? (
                  <div className="col-span-full p-10 rounded-2xl bg-white/5 border border-white/10 text-center text-gray-500 font-mono">
                    NO KEYS REGISTERED IN DB (USING SERVER ENV FALLBACK)
                  </div>
                ) : (
                  stats.groq_keys.map((keyObj, idx) => {
                    const isActive = keyObj.status === "active";
                    const isLimited = keyObj.status === "rate_limited";
                    const isInvalid = keyObj.status === "invalid";
                    
                    return (
                      <div 
                        key={idx} 
                        className={`p-5 rounded-2xl bg-white/5 border border-white/10 flex flex-col justify-between gap-6 transition-all hover:scale-[1.01]`}
                      >
                        <div className="space-y-2">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="text-xs font-bold text-white truncate max-w-[150px]">{keyObj.label || "No Label"}</p>
                              <p className="text-[10px] text-gray-500 font-mono">{keyObj.api_key}</p>
                            </div>
                            <span className={`px-2.5 py-1 rounded-full text-[9px] font-bold uppercase ${
                              isActive ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400" :
                              isLimited ? "bg-amber-500/10 border border-amber-500/30 text-amber-400" :
                              "bg-red-500/10 border border-red-500/30 text-red-400"
                            }`}>
                              {keyObj.status}
                            </span>
                          </div>
                          
                          <div className="flex gap-4 text-[10px] text-gray-400 font-mono">
                            <div>
                              <span>Failures: </span>
                              <span className={keyObj.failure_count > 0 ? "text-red-400 font-bold" : "text-gray-400"}>
                                {keyObj.failure_count || 0}
                              </span>
                            </div>
                            <div>
                              <span>Last Used: </span>
                              <span>
                                {keyObj.last_used_at ? new Date(keyObj.last_used_at).toLocaleTimeString() : "Never"}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          {isActive ? (
                            <button
                              onClick={() => handleUpdateKeyStatus(keyObj.id, "rate_limited")}
                              disabled={actionLoading}
                              className="flex-1 py-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-400 font-bold transition-all text-[10px]"
                            >
                              Mock 429 Limit
                            </button>
                          ) : (
                            <button
                              onClick={() => handleUpdateKeyStatus(keyObj.id, "active")}
                              disabled={actionLoading}
                              className="flex-1 py-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 font-bold transition-all text-[10px]"
                            >
                              Set Active
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteKey(keyObj.id)}
                            disabled={actionLoading}
                            className="py-2 px-3 rounded-lg bg-red-950/20 hover:bg-red-900/30 border border-red-500/20 text-red-400 font-bold transition-all text-[10px]"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          )}

          {/* Tab 4: Payments & Workbenches */}
          {activeTab === "payments" && (
            <motion.div
              key="payments"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              {/* Section 1: Workbenches Plan Overrides */}
              <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Layers size={16} className="text-blue-400" />
                    Workbench Plan Quota Management
                  </h3>
                  <button
                    onClick={() => setShowSimulatePay(true)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-black bg-[#00FFD1] hover:bg-[#00FFD1]/90 transition-all"
                  >
                    <DollarSign size={14} />
                    Simulate Payment Link
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-white/10 text-gray-400 uppercase font-mono tracking-wider">
                        <th className="py-3 px-4">Workbench ID</th>
                        <th className="py-3 px-4">Name</th>
                        <th className="py-3 px-4">Owner ID</th>
                        <th className="py-3 px-4">Plan Tier</th>
                        <th className="py-3 px-4 text-right">Change Plan</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(!stats?.workbenches || stats.workbenches.length === 0) ? (
                        <tr>
                          <td colSpan="5" className="text-center py-10 text-gray-500 font-mono">NO ORGS/WORKBENCHES FOUND</td>
                        </tr>
                      ) : (
                        stats.workbenches.map((wb, idx) => (
                          <tr key={idx} className="border-b border-white/5 hover:bg-white/5 transition-all">
                            <td className="py-3 px-4 font-mono text-gray-400 truncate max-w-[120px]">{wb.id}</td>
                            <td className="py-3 px-4 font-semibold text-white">{wb.name || "Unnamed"}</td>
                            <td className="py-3 px-4 font-mono text-gray-500 truncate max-w-[120px]">{wb.owner_user_id || "None"}</td>
                            <td className="py-3 px-4">
                              <span className={`px-2.5 py-1 rounded-full text-[9px] font-bold uppercase ${
                                wb.plan === "enterprise" ? "bg-purple-500/10 border border-purple-500/30 text-purple-400" :
                                wb.plan === "pro" ? "bg-blue-500/10 border border-blue-500/30 text-blue-400" :
                                wb.plan === "go" ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400" :
                                "bg-gray-500/10 border border-gray-500/30 text-gray-400"
                              }`}>
                                {wb.plan || "free"}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <select
                                value={wb.plan || "free"}
                                onChange={(e) => handleChangePlan(wb.id, e.target.value)}
                                className="bg-[#111] border border-white/10 rounded-lg px-2 py-1 text-xs font-mono text-white outline-none focus:border-[#00FFD1]"
                                disabled={actionLoading}
                              >
                                <option value="free">Free</option>
                                <option value="go">Go</option>
                                <option value="pro">Pro</option>
                                <option value="enterprise">Enterprise</option>
                              </select>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Section 2: Payments Logs */}
              <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-6">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <CreditCard size={16} className="text-[#7928ca]" />
                  Razorpay Subscriptions & Payment Transactions
                </h3>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-white/10 text-gray-400 uppercase font-mono tracking-wider">
                        <th className="py-3 px-4">Payment ID</th>
                        <th className="py-3 px-4">Workbench ID</th>
                        <th className="py-3 px-4">User Email</th>
                        <th className="py-3 px-4">Amount</th>
                        <th className="py-3 px-4">Plan Selected</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Processed At</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(!stats?.payments || stats.payments.length === 0) ? (
                        <tr>
                          <td colSpan="7" className="text-center py-10 text-gray-500 font-mono">NO PAYMENTS RECORDED</td>
                        </tr>
                      ) : (
                        stats.payments.map((p, idx) => (
                          <tr key={idx} className="border-b border-white/5 hover:bg-white/5 transition-all">
                            <td className="py-3 px-4 font-mono font-semibold text-white">{p.razorpay_payment_id}</td>
                            <td className="py-3 px-4 font-mono text-gray-400 truncate max-w-[120px]">{p.user_id}</td>
                            <td className="py-3 px-4 font-mono text-gray-300">{p.email}</td>
                            <td className="py-3 px-4 font-semibold text-white">₹{p.amount}</td>
                            <td className="py-3 px-4 text-[#00FFD1] uppercase font-bold">{p.plan}</td>
                            <td className="py-3 px-4">
                              <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                {p.status || "completed"}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-gray-500 font-mono">
                              {new Date(p.created_at).toLocaleString()}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* --- Overlay Modals --- */}

      {/* 1. Add Groq Key */}
      {showAddKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-md bg-[#0d0d0d] border border-white/10 rounded-2xl p-6 space-y-4">
            <h4 className="text-base font-bold text-white flex items-center gap-2">
              <Key size={18} className="text-[#00FFD1]" /> Add Groq API Key
            </h4>
            <form onSubmit={handleAddGroqKey} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase text-gray-400 font-mono">API Key</label>
                <input
                  type="password"
                  placeholder="gsk_..."
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-[#00FFD1]"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase text-gray-400 font-mono">Label (Optional)</label>
                <input
                  type="text"
                  placeholder="Backup Key / Primary Key"
                  value={newKeyLabel}
                  onChange={(e) => setNewKeyLabel(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-[#00FFD1]"
                />
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddKey(false)}
                  className="px-4 py-2 rounded-lg text-xs font-bold bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10 hover:text-white transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-lg text-xs font-bold text-black bg-[#00FFD1] hover:bg-[#00FFD1]/90 transition-all"
                >
                  Add Key
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Add Waitlist */}
      {showAddWaitlist && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-md bg-[#0d0d0d] border border-white/10 rounded-2xl p-6 space-y-4">
            <h4 className="text-base font-bold text-white flex items-center gap-2">
              <Users size={18} className="text-[#00FFD1]" /> Manually Add Waitlist Email
            </h4>
            <form onSubmit={handleAddWaitlist} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase text-gray-400 font-mono">Email Address</label>
                <input
                  type="email"
                  placeholder="user@company.com"
                  value={newWaitlistEmail}
                  onChange={(e) => setNewWaitlistEmail(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-[#00FFD1]"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase text-gray-400 font-mono">Approval Status</label>
                <select
                  value={newWaitlistStatus}
                  onChange={(e) => setNewWaitlistStatus(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-[#00FFD1]"
                >
                  <option value="approved">Approved (Allowed to register)</option>
                  <option value="pending">Pending</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddWaitlist(false)}
                  className="px-4 py-2 rounded-lg text-xs font-bold bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10 hover:text-white transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-lg text-xs font-bold text-black bg-[#00FFD1] hover:bg-[#00FFD1]/90 transition-all"
                >
                  Add Email
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Simulate Payment */}
      {showSimulatePay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-md bg-[#0d0d0d] border border-white/10 rounded-2xl p-6 space-y-4">
            <h4 className="text-base font-bold text-white flex items-center gap-2">
              <DollarSign size={18} className="text-[#00FFD1]" /> Simulate Payment Upgrade
            </h4>
            <p className="text-[11px] text-gray-500 leading-relaxed">
              This simulates a successful Razorpay payment webhook transaction. It creates a payment record and automatically updates the workbench plan limits.
            </p>
            <form onSubmit={handleSimulatePayment} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase text-gray-400 font-mono">Target Workbench ID</label>
                <input
                  type="text"
                  placeholder="e.g. 2d057275-8914-40bd-a836-a153f58dfee3"
                  value={simWbId}
                  onChange={(e) => setSimWbId(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-[#00FFD1]"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase text-gray-400 font-mono">User/Payer Email</label>
                <input
                  type="email"
                  placeholder="payer@company.com"
                  value={simEmail}
                  onChange={(e) => setSimEmail(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-[#00FFD1]"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase text-gray-400 font-mono">Amount (INR)</label>
                  <input
                    type="number"
                    value={simAmount}
                    onChange={(e) => setSimAmount(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-[#00FFD1]"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase text-gray-400 font-mono">Plan Tier</label>
                  <select
                    value={simPlan}
                    onChange={(e) => setSimPlan(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-[#00FFD1]"
                  >
                    <option value="go">Go (Seed)</option>
                    <option value="pro">Pro (Growth)</option>
                    <option value="enterprise">Enterprise (Scale)</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowSimulatePay(false)}
                  className="px-4 py-2 rounded-lg text-xs font-bold bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10 hover:text-white transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-lg text-xs font-bold text-black bg-[#00FFD1] hover:bg-[#00FFD1]/90 transition-all"
                >
                  Process Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
