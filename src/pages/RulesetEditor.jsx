import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  BsChevronLeft, 
  BsStars, 
  BsCpu, 
  BsDatabase, 
  BsCheckCircleFill,
  BsFileEarmarkText, 
  BsArrowRight,
  BsZoomIn,
  BsZoomOut,
  BsGrid,
  BsArrowRepeat
} from "react-icons/bs";
import { supabase } from "../lib/supabase";
import { toast } from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";

const DOCUMENT_TYPES = [
  { id: "sales_invoice", label: "Sales Invoice" },
  { id: "customer_payment_receipt", label: "Customer Payment Receipt" },
  { id: "vendor_invoice", label: "Vendor Invoice" },
  { id: "vendor_payment_receipt", label: "Vendor Payment Receipt" },
  { id: "bank_statement", label: "Bank Statement" },
  { id: "expense_receipt", label: "Expense Receipt" },
  { id: "payroll_register", label: "Payroll Register" },
  { id: "credit_note", label: "Credit Note" },
  { id: "debit_note", label: "Debit Note" },
  { id: "loan_agreement", label: "Loan Agreement" },
  { id: "investment_agreement", label: "Investment Agreement" },
  { id: "tax_document", label: "Tax Document" },
  { id: "purchase_order", label: "Purchase Order" },
  { id: "sales_order", label: "Sales Order" },
  { id: "manual_journal", label: "Manual Journal" }
];

const OCR_VARIABLES = {
  "Document Metadata": ["document_date", "currency", "language"],
  "Parties": ["customer_name", "vendor_name", "gst_number"],
  "Financials": ["subtotal", "tax_amount", "discount", "total_amount"],
  "References": ["invoice_number", "purchase_order", "transaction_reference"],
  "Additional Fields": ["payment_method", "bank_name", "statement_period", "employees", "principal"]
};

export default function RulesetEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [ruleset, setRuleset] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Editable fields (auto-saved)
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("Draft");
  const [docType, setDocType] = useState("sales_invoice");

  // Prompt / Logic editor state
  const [promptInput, setPromptInput] = useState("");
  const [generatingLogic, setGeneratingLogic] = useState(false);
  const [structuredLogic, setStructuredLogic] = useState({});

  // Node position & Zoom/Pan state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0 });
  const canvasRef = useRef(null);

  // Simulation state
  const [simDocuments, setSimDocuments] = useState([]);
  const [simulationDocId, setSimulationDocId] = useState("");
  const [simulating, setSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState(null);

  // Loaded versions list
  const [versions, setVersions] = useState([]);

  useEffect(() => {
    fetchRulesetDetails();
  }, [id]);

  const fetchRulesetDetails = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/rulesets/${id}`);
      if (!res.ok) throw new Error("Failed to load ruleset details");
      const data = await res.json();
      
      setRuleset(data);
      setName(data.name || "");
      setDescription(data.description || "");
      setStatus(data.status || "Draft");
      setDocType(data.document_type || "sales_invoice");
      
      const latestVer = data.latest_version || {};
      setPromptInput(latestVer.prompt || "");
      setStructuredLogic(latestVer.structured_logic || {});
      setVersions(data.versions || []);
      
      // Load docs available for simulation in this workbench
      if (data.workbench_id) {
        const { data: docs } = await supabase
          .from("workbench_documents")
          .select("id, filename, status")
          .eq("workbench_id", data.workbench_id)
          .in("status", ["analyzed", "processed"]);
        setSimDocuments(docs || []);
        if (docs && docs.length > 0) {
          setSimulationDocId(docs[0].id);
        }
      }
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to load editor");
    } finally {
      setLoading(false);
    }
  };

  // Auto-save logic
  const handleAutoSave = async (updates) => {
    try {
      setSaving(true);
      const res = await fetch(`/api/rulesets/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates)
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Auto-save failed");
      }
    } catch (err) {
      console.warn("Auto-save sync failed:", err.message);
    } finally {
      setSaving(false);
    }
  };

  // Trigger auto-save on individual field updates
  const handleFieldChange = (field, val) => {
    if (field === "name") setName(val);
    if (field === "description") setDescription(val);
    if (field === "status") setStatus(val);
    if (field === "document_type") setDocType(val);

    handleAutoSave({ [field]: val });
  };

  const handleManualSave = async () => {
    try {
      setSaving(true);
      toast.loading("Saving playbook...", { id: "ruleset-save" });
      
      // 1. Save general ruleset info
      const res = await fetch(`/api/rulesets/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          status,
          document_type: docType
        })
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Failed to update ruleset settings");
      }
      
      // 2. Commit the current prompt & structured logic version
      const nextVerNum = (parseFloat(ruleset.version || "1.0") + 0.1).toFixed(1);
      const versionRes = await fetch(`/api/rulesets/${id}/version`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          version: nextVerNum,
          prompt: promptInput,
          structured_logic: structuredLogic
        })
      });
      if (!versionRes.ok) {
        const errData = await versionRes.json();
        throw new Error(errData.detail || "Failed to save playbook version");
      }
      
      const newVersion = await versionRes.json();
      setVersions(prev => [newVersion, ...prev]);
      setRuleset(prev => ({ ...prev, version: nextVerNum }));
      
      toast.success("Playbook saved and compiled successfully!", { id: "ruleset-save" });
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to save playbook", { id: "ruleset-save" });
    } finally {
      setSaving(false);
    }
  };

  // Generate AI structured mapping
  const handleGenerateLogic = async () => {
    if (!promptInput.trim()) {
      toast.error("Please enter mapping prompt details");
      return;
    }
    setGeneratingLogic(true);
    toast.loading("AI is analyzing ruleset prompt...", { id: "ruleset-logic" });
    try {
      // Gather available variables
      const flatVars = Object.values(OCR_VARIABLES).flat();
      
      const res = await fetch("/api/rulesets/generate-logic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: promptInput,
          document_type: docType,
          workbench_id: ruleset.workbench_id,
          available_variables: flatVars
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "AI compilation failed");
      }

      const data = await res.json();
      const newLogic = data.structured_logic || {};
      
      // Save new version
      const nextVerNum = (parseFloat(ruleset.version || "1.0") + 0.1).toFixed(1);
      const saveVerRes = await fetch(`/api/rulesets/${id}/version`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          version: nextVerNum,
          prompt: promptInput,
          structured_logic: newLogic
        })
      });

      if (!saveVerRes.ok) throw new Error("Failed to save ruleset version update");
      const verObj = await saveVerRes.json();

      setStructuredLogic(newLogic);
      setVersions(prev => [verObj, ...prev]);
      
      toast.success(`Successfully generated logic version ${nextVerNum}!`, { id: "ruleset-logic" });
    } catch (err) {
      console.error(err);
      toast.error("Generation failed: " + err.message, { id: "ruleset-logic" });
    } finally {
      setGeneratingLogic(false);
    }
  };

  // Simulate execution
  const handleSimulate = async () => {
    if (!simulationDocId) {
      toast.error("Please select a document to simulate");
      return;
    }
    setSimulating(true);
    setSimulationResult(null);
    try {
      const res = await fetch("/api/rulesets/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ruleset_id: id,
          document_id: simulationDocId
        })
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Simulation failed");
      }
      const data = await res.json();
      setSimulationResult(data);
      toast.success("Simulation finished successfully!");
    } catch (err) {
      toast.error("Simulation error: " + err.message);
    } finally {
      setSimulating(false);
    }
  };

  // Copy variable reference to clipboard
  const handleCopyVariable = (varName) => {
    navigator.clipboard.writeText(varName);
    toast.success(`Copied variable: ${varName}`);
  };

  // Canvas Pan Handlers
  const handleMouseDown = (e) => {
    if (e.target.closest(".node-card")) return; // Don't pan when dragging inside nodes
    setIsPanning(true);
    panStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleMouseMove = (e) => {
    if (!isPanning) return;
    setPan({
      x: e.clientX - panStart.current.x,
      y: e.clientY - panStart.current.y
    });
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const handleZoom = (factor) => {
    setZoom(prev => Math.max(0.5, Math.min(2.0, prev + factor)));
  };

  const handleAutoCenter = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#0a0a0a] text-white">
        <div className="w-8 h-8 border-2 border-teal-500/20 border-t-teal-500 rounded-full animate-spin mb-4" />
        <p className="text-xs uppercase font-black tracking-widest text-gray-500">Loading playbook canvas...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-[#0a0a0a] text-white overflow-hidden select-none">
      
      {/* LEFT SIDEBAR: Ruleset Metadata */}
      <div className="w-80 border-r border-white/5 bg-[#0d1117]/50 flex flex-col flex-shrink-0">
        <div className="p-6 flex items-center space-x-3 border-b border-white/5">
          <button 
            onClick={() => navigate(`/dashboard/workbenches/${ruleset?.workbench_id}`)}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 transition-all"
          >
            <BsChevronLeft />
          </button>
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Playbook</h2>
            <p className="text-[10px] text-teal-400 font-bold uppercase tracking-widest leading-none mt-0.5">Ruleset Canvas</p>
          </div>
        </div>

        <div className="flex-1 p-6 space-y-5 overflow-y-auto custom-scrollbar">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Name</label>
            <input 
              type="text" 
              value={name} 
              onChange={(e) => handleFieldChange("name", e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-teal-500/50 transition-all font-medium"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Description</label>
            <textarea 
              rows={3}
              value={description} 
              onChange={(e) => handleFieldChange("description", e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-teal-500/50 transition-all font-medium resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Status</label>
              <select 
                value={status} 
                onChange={(e) => handleFieldChange("status", e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500/50 transition-all font-medium"
              >
                <option value="Draft" className="bg-[#0f1117] text-white">Draft</option>
                <option value="Active" className="bg-[#0f1117] text-white">Active</option>
                <option value="Disabled" className="bg-[#0f1117] text-white">Disabled</option>
              </select>
            </div>
            
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Version</label>
              <div className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-gray-400 font-bold text-center">
                {ruleset?.version || "1.0"}
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Document Type</label>
            <select 
              value={docType} 
              onChange={(e) => handleFieldChange("document_type", e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500/50 transition-all font-medium"
            >
              {DOCUMENT_TYPES.map(t => (
                <option key={t.id} value={t.id} className="bg-[#0f1117] text-white">{t.label}</option>
              ))}
            </select>
          </div>

          <div className="border-t border-white/5 pt-4">
            <div className="flex justify-between items-center text-[10px] text-gray-500">
              <span className="uppercase font-black tracking-widest">Sync State</span>
              {saving ? (
                <span className="text-amber-500 animate-pulse font-bold">Saving changes...</span>
              ) : (
                <span className="text-teal-400 font-bold flex items-center space-x-1">
                  <BsCheckCircleFill /> <span>Saved</span>
                </span>
              )}
            </div>
          </div>

          <div className="pt-1">
            <button
              onClick={handleManualSave}
              disabled={saving}
              className="w-full flex items-center justify-center space-x-2 py-3 bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-black font-bold rounded-xl text-xs transition-all cursor-pointer shadow-lg shadow-teal-500/10 active:scale-98"
            >
              <BsCheckCircleFill size={12} />
              <span>Save Playbook</span>
            </button>
          </div>

          {/* Versions History */}
          <div className="border-t border-white/5 pt-4 space-y-3">
            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Playbook Versions</span>
            <div className="space-y-2">
              {versions.map(v => (
                <div key={v.id} className="p-3 bg-white/[0.02] border border-white/5 rounded-2xl flex justify-between items-center">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-gray-200">Version {v.version}</span>
                    <span className="text-[9px] text-gray-500 font-mono">{new Date(v.created_at).toLocaleDateString()}</span>
                  </div>
                  <span className="text-[9px] font-bold text-gray-400 truncate max-w-[80px]">{v.prompt.slice(0, 15)}...</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* CENTER WORKSPACE: Connected Visual Canvas */}
      <div 
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        className="flex-1 relative bg-[#060606] h-full flex flex-col justify-between overflow-hidden cursor-grab active:cursor-grabbing"
      >
        {/* Canvas Background Grid */}
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(rgba(255,255,255,0.03) 1px, transparent 0)",
            backgroundSize: "24px 24px",
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: "center"
          }}
        />

        {/* Canvas Controls */}
        <div className="absolute top-6 left-6 z-20 flex items-center space-x-2 bg-white/5 border border-white/10 rounded-2xl p-2 backdrop-blur-md">
          <button onClick={() => handleZoom(0.1)} className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-all" title="Zoom In"><BsZoomIn size={16} /></button>
          <button onClick={() => handleZoom(-0.1)} className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-all" title="Zoom Out"><BsZoomOut size={16} /></button>
          <button onClick={handleAutoCenter} className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-all" title="Auto Center"><BsGrid size={16} /></button>
        </div>

        {/* Dynamic Connected Node Canvas Container */}
        <div 
          className="flex-1 flex items-center justify-center"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: "center"
          }}
        >
          <div className="flex flex-col items-center space-y-16 relative">
            
            {/* SVG Connector Lines */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible" style={{ zIndex: 0 }}>
              {/* Node 1 to 2 */}
              <line x1="50%" y1="110px" x2="50%" y2="180px" stroke="rgba(20, 184, 166, 0.2)" strokeWidth="3" />
              {/* Node 2 to 3 */}
              <line x1="50%" y1="360px" x2="50%" y2="430px" stroke="rgba(20, 184, 166, 0.2)" strokeWidth="3" />
              {/* Node 3 to 4 */}
              <line x1="50%" y1="610px" x2="50%" y2="680px" stroke="rgba(20, 184, 166, 0.2)" strokeWidth="3" />
            </svg>

            {/* NODE 1: INPUT Node */}
            <div className="w-80 bg-[#0d1117] border border-white/10 rounded-[1.5rem] p-5 shadow-2xl z-10 node-card hover:border-teal-500/30 transition-all flex flex-col justify-between" style={{ height: "110px" }}>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold text-xs"><BsDatabase /></div>
                <div>
                  <h4 className="text-xs font-black uppercase text-white tracking-wider leading-none">INPUT</h4>
                  <span className="text-[9px] text-gray-500 uppercase tracking-widest font-black leading-none mt-0.5">Analysis Notes</span>
                </div>
              </div>
              <div className="flex justify-between items-center text-[10px] border-t border-white/5 pt-3">
                <span className="text-gray-500 font-bold uppercase tracking-wider">Document Type</span>
                <span className="font-mono text-gray-300 font-black">{docType}</span>
              </div>
            </div>

            {/* NODE 2: LOGIC Node */}
            <div className="w-80 bg-[#0d1117] border border-white/10 rounded-[1.5rem] p-5 shadow-2xl z-10 node-card hover:border-teal-500/30 transition-all flex flex-col justify-between" style={{ height: "180px" }}>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center font-bold text-xs"><BsStars /></div>
                <div>
                  <h4 className="text-xs font-black uppercase text-white tracking-wider leading-none">LOGIC ENGINE</h4>
                  <span className="text-[9px] text-teal-400 uppercase tracking-widest font-black leading-none mt-0.5">AI Mapped Variables</span>
                </div>
              </div>

              <div className="flex-1 flex flex-col justify-center space-y-2 mt-3">
                <textarea 
                  rows={2}
                  placeholder="Describe your ruleset logic..."
                  value={promptInput}
                  onChange={(e) => setPromptInput(e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-[10px] text-white focus:outline-none focus:border-teal-500/50 transition-all font-medium resize-none w-full"
                />
                
                <button
                  onClick={handleGenerateLogic}
                  disabled={generatingLogic}
                  className="w-full flex items-center justify-center space-x-2 py-2 bg-teal-500 text-black rounded-xl text-xs font-bold hover:bg-teal-400 transition-all"
                >
                  {generatingLogic ? (
                    <>
                      <BsArrowRepeat className="animate-spin" />
                      <span>Generating Mappings...</span>
                    </>
                  ) : (
                    <>
                      <BsStars />
                      <span>Generate Logic</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* NODE 3: FINANCIAL EVENT Node */}
            <div className="w-80 bg-[#0d1117] border border-white/10 rounded-[1.5rem] p-5 shadow-2xl z-10 node-card hover:border-teal-500/30 transition-all flex flex-col justify-between" style={{ height: "180px" }}>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold text-xs"><BsCpu /></div>
                <div>
                  <h4 className="text-xs font-black uppercase text-white tracking-wider leading-none">FINANCIAL EVENT</h4>
                  <span className="text-[9px] text-gray-500 uppercase tracking-widest font-black leading-none mt-0.5">Immutable Contract</span>
                </div>
              </div>

              <div className="space-y-1.5 mt-3 border-t border-white/5 pt-3">
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-gray-500 font-bold uppercase tracking-wider">Event Name</span>
                  <span className="font-bold text-gray-300">{structuredLogic.event_name || "---"}</span>
                </div>
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-gray-500 font-bold uppercase tracking-wider">Party Mapping</span>
                  <span className="font-mono text-gray-300 font-bold">{structuredLogic.party_field || "---"}</span>
                </div>
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-gray-500 font-bold uppercase tracking-wider">Amount Mapping</span>
                  <span className="font-mono text-gray-300 font-bold">{structuredLogic.amount_field || "---"}</span>
                </div>
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-gray-500 font-bold uppercase tracking-wider">Initial Status</span>
                  <span className="font-bold text-gray-300">{structuredLogic.status_field || "---"}</span>
                </div>
              </div>
            </div>

            {/* NODE 4: OUTPUT Node */}
            <div className="w-80 bg-[#0d1117] border border-white/10 rounded-[1.5rem] p-5 shadow-2xl z-10 node-card hover:border-teal-500/30 transition-all flex flex-col justify-between" style={{ height: "180px" }}>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-xs"><BsCheckCircleFill /></div>
                <div>
                  <h4 className="text-xs font-black uppercase text-white tracking-wider leading-none">OUTPUT</h4>
                  <span className="text-[9px] text-gray-500 uppercase tracking-widest font-black leading-none mt-0.5">Ledger & Journal</span>
                </div>
              </div>

              <div className="space-y-1.5 mt-3 border-t border-white/5 pt-3">
                <span className="text-[8px] font-black text-teal-400 uppercase tracking-widest">Postings Preview</span>
                <div className="max-h-[85px] overflow-y-auto custom-scrollbar space-y-1">
                  {(structuredLogic.mappings || []).map((m, idx) => (
                    <div key={idx} className="flex justify-between items-center text-[9px] text-gray-400">
                      <span className="truncate max-w-[130px] font-bold">{m.account_name}</span>
                      <div className="flex items-center space-x-2 font-bold">
                        <span className="font-mono text-[8px] text-gray-500">({m.variable})</span>
                        <span className={m.entry_type === 'DEBIT' ? 'text-teal-400' : 'text-red-400'}>{m.entry_type === 'DEBIT' ? 'Dr' : 'Cr'}</span>
                      </div>
                    </div>
                  ))}
                  {(!structuredLogic.mappings || structuredLogic.mappings.length === 0) && (
                    <span className="text-[9px] text-gray-500 block italic leading-relaxed">No output postings configured. Use logic prompt.</span>
                  )}
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* BOTTOM PANEL: Simulation Panel */}
        <div className="bg-[#0d1117]/80 border-t border-white/5 p-6 backdrop-blur-md z-20 flex flex-col space-y-4">
          <div className="flex justify-between items-center border-b border-white/5 pb-3">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20"><BsStars size={16} /></div>
              <span className="text-xs font-black text-white uppercase tracking-widest">Simulation Engine</span>
            </div>
            
            <div className="flex items-center space-x-4">
              <select
                value={simulationDocId}
                onChange={(e) => setSimulationDocId(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500/50 transition-all font-medium max-w-xs"
              >
                {simDocuments.map(d => (
                  <option key={d.id} value={d.id} className="bg-[#0f1117] text-white">{d.filename}</option>
                ))}
                {simDocuments.length === 0 && (
                  <option value="" className="bg-[#0f1117] text-gray-500">No analyzed documents found</option>
                )}
              </select>

              <button
                onClick={handleSimulate}
                disabled={simulating || !simulationDocId}
                className="flex items-center space-x-2 px-6 py-2.5 bg-teal-500 text-black rounded-xl text-xs font-bold hover:bg-teal-400 transition-all shadow-lg disabled:opacity-50"
              >
                {simulating ? <BsArrowRepeat className="animate-spin" /> : null}
                <span>Run Simulation</span>
              </button>
            </div>
          </div>

          {/* Simulation Output Details */}
          <div className="grid grid-cols-5 gap-4 min-h-[100px] max-h-[180px] overflow-y-auto custom-scrollbar">
            
            {/* Step A: Analysis Notes */}
            <div className="p-4 bg-white/[0.01] border border-white/5 rounded-2xl flex flex-col justify-between">
              <div>
                <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest block mb-2">A. Analysis Notes</span>
                <div className="space-y-1 max-h-[100px] overflow-y-auto custom-scrollbar text-[9px] font-mono text-gray-400">
                  {simulationResult ? (
                    Object.entries(simulationResult.analysis_notes || {}).slice(0, 6).map(([k, v]) => (
                      <div key={k} className="truncate"><span className="text-teal-400 font-bold">{k}:</span> {String(v)}</div>
                    ))
                  ) : (
                    <span className="italic text-gray-500">Run simulation to view extracted notes</span>
                  )}
                </div>
              </div>
            </div>

            {/* Step B: Logic Applied */}
            <div className="p-4 bg-white/[0.01] border border-white/5 rounded-2xl flex flex-col justify-between">
              <div>
                <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest block mb-2">B. Logic Applied</span>
                <div className="space-y-1 max-h-[100px] overflow-y-auto custom-scrollbar text-[9px] text-gray-400 leading-relaxed font-bold">
                  {simulationResult ? (
                    (simulationResult.logic_applied?.mappings || []).map((m, idx) => (
                      <div key={idx} className="truncate">{m.account_name} ← {m.variable}</div>
                    ))
                  ) : (
                    <span className="italic text-gray-500">Run simulation to view mappings logic</span>
                  )}
                </div>
              </div>
            </div>

            {/* Step C: Financial Event Created */}
            <div className="p-4 bg-white/[0.01] border border-white/5 rounded-2xl flex flex-col justify-between">
              <div>
                <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest block mb-2">C. Financial Event</span>
                {simulationResult ? (
                  <div className="space-y-1 text-[9px] text-gray-400">
                    <div><span className="text-teal-400 font-bold">Name:</span> {simulationResult.financial_event_created?.event_name}</div>
                    <div><span className="text-teal-400 font-bold">Party:</span> {simulationResult.financial_event_created?.counterparty}</div>
                    <div><span className="text-teal-400 font-bold">Amount:</span> ₹{simulationResult.financial_event_created?.amount}</div>
                    <div><span className="text-teal-400 font-bold">Date:</span> {simulationResult.financial_event_created?.event_date}</div>
                  </div>
                ) : (
                  <span className="italic text-gray-500 text-[9px]">Event details pending</span>
                )}
              </div>
            </div>

            {/* Step D: Labels Updated */}
            <div className="p-4 bg-white/[0.01] border border-white/5 rounded-2xl flex flex-col justify-between">
              <div>
                <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest block mb-2">D. Labels Updated</span>
                <div className="space-y-1 max-h-[100px] overflow-y-auto custom-scrollbar text-[9px] text-gray-400 leading-relaxed">
                  {simulationResult ? (
                    (simulationResult.labels_updated || []).map((l, idx) => (
                      <div key={idx} className="flex justify-between items-center truncate">
                        <span className="font-bold">{l.account}</span>
                        <span className="text-teal-400 font-bold">{l.change}</span>
                      </div>
                    ))
                  ) : (
                    <span className="italic text-gray-500">Label balances changes pending</span>
                  )}
                </div>
              </div>
            </div>

            {/* Step E: Journal Entries */}
            <div className="p-4 bg-white/[0.01] border border-white/5 rounded-2xl flex flex-col justify-between">
              <div>
                <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest block mb-2">E. Journal Preview</span>
                <div className="space-y-1.5 max-h-[100px] overflow-y-auto custom-scrollbar text-[9px] text-gray-400 font-bold">
                  {simulationResult ? (
                    <>
                      {/* Debits */}
                      {(simulationResult.journal_preview?.debits || []).map((dr, idx) => (
                        <div key={idx} className="flex justify-between items-center text-teal-400">
                          <span className="truncate max-w-[100px]">Dr {dr.account}</span>
                          <span>₹{dr.amount}</span>
                        </div>
                      ))}
                      {/* Credits */}
                      {(simulationResult.journal_preview?.credits || []).map((cr, idx) => (
                        <div key={idx} className="flex justify-between items-center text-red-400">
                          <span className="truncate max-w-[100px] pl-2">Cr {cr.account}</span>
                          <span>₹{cr.amount}</span>
                        </div>
                      ))}
                    </>
                  ) : (
                    <span className="italic text-gray-500">Journal postings pending</span>
                  )}
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* RIGHT SIDEBAR: OCR Variable Definitions (Read-Only) */}
      <div className="w-80 border-l border-white/5 bg-[#0d1117]/50 flex flex-col flex-shrink-0">
        <div className="p-6 border-b border-white/5">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
            <BsStars className="text-teal-400" />
            <span>Analysis Notes</span>
          </h2>
          <p className="text-[9px] text-gray-500 uppercase tracking-widest font-black leading-none mt-1">Copy reference variables on click</p>
        </div>

        <div className="flex-1 p-6 space-y-6 overflow-y-auto custom-scrollbar select-text">
          {Object.entries(OCR_VARIABLES).map(([category, variables]) => (
            <div key={category} className="space-y-2">
              <span className="text-[10px] font-black text-teal-400 uppercase tracking-widest block">{category}</span>
              <div className="space-y-1">
                {variables.map(v => (
                  <div 
                    key={v}
                    onClick={() => handleCopyVariable(v)}
                    className="flex justify-between items-center p-2.5 bg-white/[0.01] hover:bg-teal-500/5 hover:border-teal-500/20 border border-white/5 rounded-xl text-xs font-mono text-gray-400 hover:text-teal-400 cursor-pointer transition-all select-none"
                  >
                    <span>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
