import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  BsPlusLg, 
  BsSearch, 
  BsTrash, 
  BsFiles, 
  BsPlayFill, 
  BsStopFill, 
  BsArrowRight,
  BsStars,
  BsClockHistory,
  BsCheckCircleFill,
  BsExclamationCircleFill
} from "react-icons/bs";
import { supabase } from "../lib/supabase";
import { toast } from "react-hot-toast";
import { motion } from "framer-motion";

export default function Rulesets({ workbenchId }) {
  const navigate = useNavigate();
  const [rulesets, setRulesets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchRulesets();
  }, [workbenchId]);

  const fetchRulesets = async () => {
    try {
      setLoading(true);
      const res = await fetch(`http://localhost:8000/api/rulesets/workbench/${workbenchId}`);
      if (!res.ok) throw new Error("Failed to fetch rulesets");
      const data = await res.json();
      setRulesets(data || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load rulesets");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNew = async () => {
    try {
      const payload = {
        workbench_id: workbenchId,
        name: "Untitled Ruleset",
        description: "Specify rules for document event mappings",
        document_type: "sales_invoice",
        prompt: "Whenever a Sales Invoice is received, create a Customer Sale...",
        structured_logic: {
          event_name: "Customer Sale",
          party_field: "customer_name",
          amount_field: "total_amount",
          date_field: "document_date",
          status_field: "Pending Payment",
          mappings: [
            { account_name: "Operating Revenue", variable: "subtotal", entry_type: "CREDIT" },
            { account_name: "Accounts Receivable (AR)", variable: "total_amount", entry_type: "DEBIT" }
          ]
        },
        status: "Draft"
      };

      const res = await fetch("http://localhost:8000/api/rulesets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Failed to create ruleset");
      }

      const newRuleset = await res.json();
      toast.success("Created new playbook canvas!");
      navigate(`/ruleset/editor/${newRuleset.id}`);
    } catch (err) {
      toast.error(err.message || "Failed to create ruleset");
    }
  };

  const handleDuplicate = async (r) => {
    try {
      toast.loading("Duplicating ruleset...", { id: "ruleset-dup" });
      const payload = {
        workbench_id: workbenchId,
        name: `${r.name} (Copy)`,
        description: r.description,
        document_type: r.document_type,
        prompt: r.versions?.[0]?.prompt || "",
        structured_logic: r.versions?.[0]?.structured_logic || {},
        status: "Draft"
      };

      const res = await fetch("http://localhost:8000/api/rulesets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("Failed to duplicate ruleset");
      toast.success("Playbook duplicated!", { id: "ruleset-dup" });
      fetchRulesets();
    } catch (err) {
      toast.error(err.message, { id: "ruleset-dup" });
    }
  };

  const handleToggleStatus = async (r) => {
    const newStatus = r.status === "Active" ? "Disabled" : "Active";
    try {
      toast.loading(`Setting status to ${newStatus}...`, { id: "ruleset-status" });
      const res = await fetch(`http://localhost:8000/api/rulesets/${r.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Failed to update status");
      }

      toast.success(`Ruleset set to ${newStatus}!`, { id: "ruleset-status" });
      fetchRulesets();
    } catch (err) {
      toast.error(err.message, { id: "ruleset-status" });
    }
  };

  const handleDelete = async (rulesetId) => {
    if (!window.confirm("Are you sure you want to delete this ruleset playbook?")) return;
    try {
      toast.loading("Deleting ruleset...", { id: "ruleset-del" });
      const res = await fetch(`http://localhost:8000/api/rulesets/${rulesetId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_deleted: true })
      });

      if (!res.ok) throw new Error("Failed to delete ruleset");
      toast.success("Ruleset deleted successfully", { id: "ruleset-del" });
      fetchRulesets();
    } catch (err) {
      toast.error(err.message, { id: "ruleset-del" });
    }
  };

  const filteredRulesets = rulesets.filter(r => 
    r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.document_type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDocType = (type) => {
    return type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] text-white animate-in fade-in duration-500 overflow-hidden p-8">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div className="flex items-center space-x-4">
          <div className="p-3 rounded-2xl bg-teal-500/10 text-teal-400 border border-teal-500/20 shadow-lg shadow-teal-500/5">
            <BsStars size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Rulesets</h1>
            <p className="text-sm text-gray-500 mt-1 font-medium">Define reusable company playbooks for translating documents to double-entry ledger postings</p>
          </div>
        </div>

        <button 
          onClick={handleCreateNew}
          className="flex items-center space-x-2 px-6 py-3 bg-[#81E6D9] text-black rounded-2xl text-sm font-bold hover:opacity-90 transition-all shadow-lg shadow-[#81E6D9]/10"
        >
          <BsPlusLg size={16} />
          <span>New Ruleset</span>
        </button>
      </div>

      {/* Search bar */}
      <div className="relative group mb-6 max-w-md">
        <BsSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-teal-400 transition-colors" />
        <input 
          type="text"
          placeholder="Search Rulesets..."
          className="bg-white/5 border border-white/10 rounded-2xl pl-11 pr-4 py-3 text-sm w-full focus:outline-none focus:border-teal-500/50 transition-all font-medium"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Rulesets Grid */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-16 space-y-4">
            <div className="w-8 h-8 border-2 border-teal-500/20 border-t-teal-500 rounded-full animate-spin" />
            <p className="text-xs text-gray-500 uppercase font-black tracking-widest">Loading rulesets...</p>
          </div>
        ) : filteredRulesets.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 border border-dashed border-white/5 rounded-3xl opacity-55 text-center max-w-md mx-auto space-y-4 mt-12">
            <BsStars size={36} className="text-gray-500" />
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-white">No Ruleset Playbooks</h3>
              <p className="text-xs text-gray-500 leading-relaxed">Create a visual ruleset playbook to specify mapping logic for uploaded organization documents.</p>
            </div>
            <button 
              onClick={handleCreateNew}
              className="px-4 py-2 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl text-xs font-bold transition-all text-gray-300"
            >
              Configure First Playbook
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRulesets.map(r => (
              <motion.div 
                key={r.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/[0.02] border border-white/5 hover:border-teal-500/30 rounded-3xl p-6 transition-all relative flex flex-col justify-between shadow-xl group"
              >
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg border ${
                      r.status === 'Active' 
                        ? 'bg-teal-500/10 text-teal-400 border-teal-500/20' 
                        : r.status === 'Disabled' 
                          ? 'bg-red-500/10 text-red-400 border-red-500/20' 
                          : 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
                    }`}>
                      {r.status}
                    </span>
                    <span className="text-[10px] text-gray-500 font-bold">Version {r.version || "1.0"}</span>
                  </div>

                  <h3 className="text-lg font-bold text-white group-hover:text-teal-400 transition-colors mb-1 truncate">{r.name}</h3>
                  <p className="text-xs text-gray-500 mb-4 line-clamp-2 h-8 leading-relaxed">{r.description || "No description provided."}</p>

                  <div className="space-y-2 border-t border-white/5 pt-4 mb-6">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-gray-500 uppercase tracking-widest font-black">Document Type</span>
                      <span className="font-bold text-gray-300 bg-white/5 px-2 py-0.5 rounded-md">{formatDocType(r.document_type)}</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-gray-500 uppercase tracking-widest font-black">Input Source</span>
                      <span className="font-bold text-gray-300">Analysis Notes</span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center border-t border-white/5 pt-4">
                  <div className="flex items-center space-x-2">
                    <button 
                      onClick={() => handleToggleStatus(r)}
                      title={r.status === 'Active' ? 'Disable ruleset' : 'Activate ruleset'}
                      className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all"
                    >
                      {r.status === 'Active' ? <BsStopFill size={14} /> : <BsPlayFill size={14} />}
                    </button>
                    <button 
                      onClick={() => handleDuplicate(r)}
                      title="Duplicate playbook"
                      className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all"
                    >
                      <BsFiles size={14} />
                    </button>
                    <button 
                      onClick={() => handleDelete(r.id)}
                      title="Delete playbook"
                      className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500 hover:text-black text-red-400 transition-all border border-red-500/10"
                    >
                      <BsTrash size={14} />
                    </button>
                  </div>

                  <button 
                    onClick={() => navigate(`/ruleset/editor/${r.id}`)}
                    className="flex items-center space-x-1.5 text-xs font-bold text-teal-400 hover:text-teal-300 transition-colors group-hover:translate-x-0.5 transition-transform"
                  >
                    <span>Open Editor</span>
                    <BsArrowRight />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
