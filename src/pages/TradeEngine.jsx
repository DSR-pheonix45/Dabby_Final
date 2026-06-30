import React, { useState, useEffect, useCallback } from "react";
import { 
  BsArrowLeft, 
  BsArrowLeftRight, 
  BsBuilding, 
  BsCheckCircleFill, 
  BsExclamationTriangleFill, 
  BsPlusLg, 
  BsSave, 
  BsCheck2, 
  BsXCircle, 
  BsArrowRight, 
  BsArrowRepeat, 
  BsFileEarmarkPdf, 
  BsFileEarmarkText,
  BsChevronDown,
  BsSearch,
  BsDatabaseAdd
} from "react-icons/bs";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import { backendService } from "../services/backendService";
import Card from "../components/shared/Card";
import { toast } from "react-hot-toast";

const TRADE_STATUS_TABS = [
  { id: "All", label: "All Trades" },
  { id: "Needs Review", label: "Needs Review" },
  { id: "Draft", label: "Drafts" },
  { id: "Approved", label: "Approved" },
  { id: "Rejected", label: "Rejected" }
];

export default function TradeEngine({ workbenchId }) {
  const { user } = useAuth();
  
  // Workbench state
  const selectedWorkbenchId = workbenchId;
  const workbenchLoading = false;

  // Queue state
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("Needs Review");
  const [searchQuery, setSearchQuery] = useState("");

  // Review state
  const [selectedTrade, setSelectedTrade] = useState(null);
  const [docUrl, setDocUrl] = useState("");
  const [docUrlLoading, setDocUrlLoading] = useState(false);
  const [leftPanelTab, setLeftPanelTab] = useState("preview");

  // Dropdown lists
  const [parties, setParties] = useState([]);
  const [ourEntities, setOurEntities] = useState([]);
  const [counterpartyEntities, setCounterpartyEntities] = useState([]);
  const [labels, setLabels] = useState([]);
  const [activities, setActivities] = useState([]);
  const [auditTrail, setAuditTrail] = useState([]);

  // Form state
  const [formData, setFormData] = useState({
    trade_type: "",
    trade_direction: "",
    amount: "",
    gross_amount: "",
    tax_amount: "",
    net_amount: "",
    currency: "INR",
    invoice_number: "",
    invoice_date: "",
    due_date: "",
    notes: "",
    description: "",
    party_id: "",
    entity_id: "",
    our_entity_id: "",
    label_id: ""
  });

  // Modal / Quick Add state
  const [showAddPartyModal, setShowAddPartyModal] = useState(false);
  const [newPartyName, setNewPartyName] = useState("");
  const [newPartyCategory, setNewPartyCategory] = useState("corporation");
  
  const [showAddEntityModal, setShowAddEntityModal] = useState(false);
  const [entityModalPartyId, setEntityModalPartyId] = useState("");
  const [newEntityName, setNewEntityName] = useState("");
  const [newEntityType, setNewEntityType] = useState("bank");

  // Fetch trades whenever workbench changes
  const fetchTrades = useCallback(async () => {
    if (!selectedWorkbenchId) return;
    try {
      setLoading(true);
      const url = `http://localhost:8000/api/trades/workbench/${selectedWorkbenchId}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch trades");
      const data = await res.json();
      setTrades(data || []);
    } catch (err) {
      console.error("Error fetching trades:", err);
      toast.error("Failed to fetch trades queue");
    } finally {
      setLoading(false);
    }
  }, [selectedWorkbenchId]);

  // Fetch parties for workbench
  const fetchParties = useCallback(async () => {
    if (!selectedWorkbenchId) return;
    try {
      const { data, error } = await supabase
        .from("parties")
        .select("*")
        .eq("workbench_id", selectedWorkbenchId)
        .order("name");
      if (error) throw error;
      setParties(data || []);
    } catch (err) {
      console.error("Error fetching parties:", err);
    }
  }, [selectedWorkbenchId]);

  const fetchLabels = useCallback(async () => {
    if (!selectedWorkbenchId) return;
    try {
      const res = await fetch(`http://localhost:8000/api/ledger/labels/${selectedWorkbenchId}`);
      if (!res.ok) throw new Error("Failed to fetch labels");
      const data = await res.json();
      setLabels(data || []);
    } catch (err) {
      console.error("Error fetching labels:", err);
    }
  }, [selectedWorkbenchId]);

  useEffect(() => {
    fetchTrades();
    fetchParties();
    fetchLabels();
  }, [selectedWorkbenchId, fetchTrades, fetchParties, fetchLabels]);

  useEffect(() => {
    const handleTabChange = async (e) => {
      const docId = e.detail?.documentId;
      if (!docId || !selectedWorkbenchId) return;
      
      try {
        setLoading(true);
        // Fetch all trades for the workbench to find the one matching documentId
        const url = `http://localhost:8000/api/trades/workbench/${selectedWorkbenchId}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("Failed to fetch trades");
        const data = await res.json();
        setTrades(data || []);
        
        const matchedTrade = data?.find(t => t.document_id === docId);
        if (matchedTrade) {
          handleSelectTrade(matchedTrade);
        } else {
          // If no trade exists yet, let's process it now!
          toast.loading("Initializing Trade Engine for document...", { id: "proc-trade" });
          const procRes = await fetch(`http://localhost:8000/api/trades/process-document/${docId}`, {
            method: "POST"
          });
          if (procRes.ok) {
            const newTrade = await procRes.json();
            if (newTrade && newTrade.trade) {
              handleSelectTrade(newTrade.trade);
              setTrades(prev => [newTrade.trade, ...prev]);
              toast.success("Trade loaded!", { id: "proc-trade" });
            } else {
              toast.error("No trade record returned", { id: "proc-trade" });
            }
          } else {
             toast.error("Failed to initialize Trade Engine record", { id: "proc-trade" });
          }
        }
      } catch (err) {
        console.error("Error navigating from analysis note:", err);
      } finally {
        setLoading(false);
      }
    };

    window.addEventListener('change-workbench-tab', handleTabChange);
    return () => window.removeEventListener('change-workbench-tab', handleTabChange);
  }, [selectedWorkbenchId, fetchTrades]);

  // Fetch entities for a party
  const fetchEntities = async (partyId, isSelf) => {
    if (!partyId) {
      if (isSelf) setOurEntities([]);
      else setCounterpartyEntities([]);
      return;
    }
    try {
      const { data, error } = await supabase
        .from("entities")
        .select("*")
        .eq("party_id", partyId)
        .order("name");
      if (error) throw error;
      if (isSelf) setOurEntities(data || []);
      else setCounterpartyEntities(data || []);
    } catch (err) {
      console.error("Error fetching entities:", err);
    }
  };

  // Cache workbench selection
  const handleWorkbenchChange = (wbId) => {
    setSelectedWorkbenchId(wbId);
    localStorage.setItem("last_active_workbench_id", wbId);
    setSelectedTrade(null);
  };

  // Select a trade for review workspace
  const handleSelectTrade = async (trade) => {
    setSelectedTrade(trade);
    setDocUrl("");
    
    // Fetch resolved label for this trade from trade_labels table
    let resolvedLabelId = "";
    try {
      const { data, error } = await supabase
        .from("trade_labels")
        .select("label_id")
        .eq("trade_id", trade.id)
        .maybeSingle();
      if (!error && data) {
        resolvedLabelId = data.label_id || "";
      }
    } catch (err) {
      console.error("Error fetching resolved label:", err);
    }

    // FETCH ACTIVITIES
    try {
      const actRes = await fetch(`http://localhost:8000/api/trades/${trade.id}/activities`);
      if (actRes.ok) {
        const actData = await actRes.json();
        setActivities(actData || []);
      }
    } catch (err) {
      console.error("Error fetching activities:", err);
    }

    // FETCH AUDIT TRAIL
    try {
      const auditRes = await fetch(`http://localhost:8000/api/trades/${trade.id}/audit-trail`);
      if (auditRes.ok) {
        const auditData = await auditRes.json();
        setAuditTrail(auditData || []);
      }
    } catch (err) {
      console.error("Error fetching audit trail:", err);
    }

    setFormData({
      trade_type: trade.trade_type || "",
      trade_direction: trade.trade_direction || "",
      amount: trade.amount || "",
      gross_amount: trade.gross_amount || trade.amount || "",
      tax_amount: trade.tax_amount || "",
      net_amount: trade.net_amount || "",
      currency: trade.currency || "INR",
      invoice_number: trade.invoice_number || "",
      invoice_date: trade.invoice_date || "",
      due_date: trade.due_date || "",
      notes: trade.notes || "",
      description: trade.description || "",
      party_id: trade.trade_parties?.find(p => !p.parties?.is_self)?.party_id || "",
      entity_id: trade.trade_entities?.find(e => e.role === "counterparty")?.entity_id || "",
      our_entity_id: trade.trade_entities?.find(e => e.role === "our_company")?.entity_id || "",
      label_id: resolvedLabelId
    });

    // Load entities for dropdown lists
    const ourCompanyPartyId = trade.trade_parties?.find(p => p.parties?.is_self)?.party_id;
    if (ourCompanyPartyId) {
      fetchEntities(ourCompanyPartyId, true);
    }

    const counterpartyPartyId = trade.trade_parties?.find(p => !p.parties?.is_self)?.party_id;
    if (counterpartyPartyId) {
      fetchEntities(counterpartyPartyId, false);
    }

    // Fetch PDF preview URL
    if (trade.document?.file_path) {
      try {
        setDocUrlLoading(true);
        const url = await backendService.getDocumentUrl(trade.document.file_path);
        setDocUrl(url);
      } catch (err) {
        console.error("Error fetching preview url:", err);
        toast.error("Failed to load document preview");
      } finally {
        setDocUrlLoading(false);
      }
    }
  };

  // Handle party dropdown change
  const handlePartyChange = (partyId) => {
    setFormData(prev => ({ ...prev, party_id: partyId, entity_id: "" }));
    fetchEntities(partyId, false);
  };

  // Submit edits / Save draft
  const handleSaveTrade = async (newStatus = null) => {
    if (!selectedTrade) return;
    try {
      const payload = {
        ...formData,
        amount: formData.gross_amount !== "" ? parseFloat(formData.gross_amount) : (formData.amount !== "" ? parseFloat(formData.amount) : null),
        gross_amount: formData.gross_amount !== "" ? parseFloat(formData.gross_amount) : null,
        tax_amount: formData.tax_amount !== "" ? parseFloat(formData.tax_amount) : null,
        net_amount: formData.net_amount !== "" ? parseFloat(formData.net_amount) : null,
        invoice_date: formData.invoice_date || null,
        due_date: formData.due_date || null
      };
      if (newStatus) {
        payload.status = newStatus;
      }

      const res = await fetch(`http://localhost:8000/api/trades/${selectedTrade.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("Failed to save changes");
      const data = await res.json();
      
      toast.success(newStatus ? `Trade status updated to ${newStatus}` : "Trade draft saved successfully");
      
      // Re-fetch trade details to update validation sidebars
      const freshRes = await fetch(`http://localhost:8000/api/trades/${selectedTrade.id}`);
      if (freshRes.ok) {
        const freshData = await freshRes.json();
        setSelectedTrade(freshData);
      }

      fetchTrades();
    } catch (err) {
      console.error("Save trade error:", err);
      toast.error("Failed to save trade changes");
    }
  };

  // Approve & Execute Activities sequence
  const handleApproveExecute = async () => {
    if (!selectedTrade) return;
    try {
      toast.loading("Executing operational activities...", { id: "exec-trade" });
      
      // 1. Save activities updates first
      const saveActRes = await fetch(`http://localhost:8000/api/trades/${selectedTrade.id}/save-activities`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activities })
      });
      if (!saveActRes.ok) throw new Error("Failed to save activities updates");

      // 2. Save trade main details
      const payload = {
        ...formData,
        amount: formData.gross_amount !== "" ? parseFloat(formData.gross_amount) : (formData.amount !== "" ? parseFloat(formData.amount) : null),
        gross_amount: formData.gross_amount !== "" ? parseFloat(formData.gross_amount) : null,
        tax_amount: formData.tax_amount !== "" ? parseFloat(formData.tax_amount) : null,
        net_amount: formData.net_amount !== "" ? parseFloat(formData.net_amount) : null,
        invoice_date: formData.invoice_date || null,
        due_date: formData.due_date || null,
        status: "Approved"
      };

      const saveRes = await fetch(`http://localhost:8000/api/trades/${selectedTrade.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!saveRes.ok) throw new Error("Failed to save trade details");

      // 3. Trigger activity execution
      const execRes = await fetch(`http://localhost:8000/api/trades/${selectedTrade.id}/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user?.id })
      });

      if (!execRes.ok) {
        const errData = await execRes.json();
        throw new Error(errData.detail || "Operational execution failed");
      }

      toast.success("Operational activities executed successfully!", { id: "exec-trade" });
      setSelectedTrade(null);
      fetchTrades();
    } catch (err) {
      console.error("Execution error:", err);
      if (err.message.includes("activities") || err.message.includes("save") || err.message.includes("execute")) {
        toast.error("Execution failed: Please copy and run the DDL schema commands from backend/migrations/006_financial_engine.sql inside the Supabase SQL Editor first!", { id: "exec-trade", duration: 8000 });
      } else {
        toast.error(`Execution failed: ${err.message}`, { id: "exec-trade" });
      }
    }
  };

  // Re-run Trade Engine / OCR extraction
  const handleReRunEngine = async () => {
    if (!selectedTrade || !selectedTrade.document_id) return;
    try {
      toast.loading("Re-running Trade Engine analysis...", { id: "rerun-engine" });
      const res = await fetch(`http://localhost:8000/api/trades/process-document/${selectedTrade.document_id}`, {
        method: "POST"
      });
      if (!res.ok) throw new Error("Failed to process document");
      const data = await res.json();
      toast.success("Trade Engine analysis complete!", { id: "rerun-engine" });

      if (data.trade) {
        handleSelectTrade(data.trade);
      }
      fetchTrades();
    } catch (err) {
      console.error("Rerun engine fail:", err);
      toast.error("Failed to execute Trade Engine", { id: "rerun-engine" });
    }
  };

  // Continue to next item in the queue
  const handleContinue = () => {
    const currentIndex = trades.findIndex(t => t.id === selectedTrade.id);
    if (currentIndex !== -1 && currentIndex < trades.length - 1) {
      handleSelectTrade(trades[currentIndex + 1]);
    } else {
      setSelectedTrade(null);
      fetchTrades();
      toast.success("Queue completed!");
    }
  };

  // Quick Add Party
  const handleCreateParty = async () => {
    if (!newPartyName.trim()) return;
    try {
      const { data, error } = await supabase
        .from("parties")
        .insert({
          workbench_id: selectedWorkbenchId,
          name: newPartyName,
          category: newPartyCategory,
          is_self: false
        })
        .select()
        .single();

      if (error) throw error;
      toast.success("Party created!");
      setParties(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      setFormData(prev => ({ ...prev, party_id: data.id }));
      fetchEntities(data.id, false);
      setShowAddPartyModal(false);
      setNewPartyName("");
    } catch (err) {
      console.error("Failed to create party:", err);
      toast.error("Failed to create party");
    }
  };

  // Quick Add Entity
  const handleCreateEntity = async () => {
    if (!newEntityName.trim() || !entityModalPartyId) return;
    try {
      const { data, error } = await supabase
        .from("entities")
        .insert({
          party_id: entityModalPartyId,
          name: newEntityName,
          type: newEntityType,
          metadata: {}
        })
        .select()
        .single();

      if (error) throw error;
      toast.success("Entity created!");
      
      const isSelf = selectedTrade?.trade_parties?.find(p => p.party_id === entityModalPartyId)?.parties?.is_self;
      if (isSelf) {
        setOurEntities(prev => [...prev, data]);
        setFormData(prev => ({ ...prev, our_entity_id: data.id }));
      } else {
        setCounterpartyEntities(prev => [...prev, data]);
        setFormData(prev => ({ ...prev, entity_id: data.id }));
      }
      
      setShowAddEntityModal(false);
      setNewEntityName("");
    } catch (err) {
      console.error("Failed to create entity:", err);
      toast.error("Failed to create entity");
    }
  };

  // Helper formatting values
  const getValidationCount = (t) => {
    if (!t.validation_issues) return 0;
    return t.validation_issues.length;
  };

  const hasValidationError = (issues, keyword) => {
    return (issues || []).some(issue => issue.message.toLowerCase().includes(keyword.toLowerCase()));
  };

  const getFilteredTrades = () => {
    return trades.filter(t => {
      // 1. Status Filter
      if (statusFilter !== "All" && t.status !== statusFilter) {
        return false;
      }
      
      // 2. Search Filter
      const search = searchQuery.toLowerCase().trim();
      if (!search) return true;
      const counterparty = t.trade_parties?.find(p => !p.parties?.is_self)?.detected_name || "";
      const docName = t.document?.filename || "";
      const invoiceNumber = t.invoice_number || "";
      return (
        counterparty.toLowerCase().includes(search) ||
        docName.toLowerCase().includes(search) ||
        invoiceNumber.toLowerCase().includes(search) ||
        t.trade_type.toLowerCase().includes(search)
      );
    });
  };

  const filteredTradesList = getFilteredTrades();

  return (
    <div className="h-full flex flex-col bg-[#0A0A0A] text-white">
      {/* Header Bar */}
      <div className="flex items-center justify-between p-6 border-b border-white/5 bg-[#0e1117]/40 backdrop-blur-md sticky top-0 z-30">
        <div className="flex items-center space-x-4">
          {selectedTrade && (
            <button 
              onClick={() => setSelectedTrade(null)} 
              className="p-2 hover:bg-white/5 border border-white/10 rounded-xl transition-all text-gray-400 hover:text-white"
            >
              <BsArrowLeft size={16} />
            </button>
          )}
          <div>
            <h1 className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-teal-400 to-cyan-500 bg-clip-text text-transparent">
              {selectedTrade ? "Trade Review Workspace" : "Trade Engine Queue"}
            </h1>
            <p className="text-[11px] text-gray-500 font-bold uppercase tracking-wider mt-0.5">
              {selectedTrade ? `Reviewing Document: ${selectedTrade.document?.filename || "Manual Trade"}` : "Validate and convert OCR nodes into structured Trades"}
            </p>
          </div>
        </div>

        {/* Workbench title placeholder (hidden since sidebar has it) */}
        <div className="flex items-center space-x-3">
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden">
        {selectedTrade ? (
          /* ==============================================================
             SPLIT review workspace view (3 panels + bottom actions)
             ============================================================== */
          <div className="h-full flex flex-col relative">
            <div className="flex-1 flex overflow-hidden">
              
              {/* Left Panel: Document Preview / Raw OCR JSON */}
              <div className="w-[38%] border-r border-white/5 p-5 flex flex-col overflow-hidden bg-black/20">
                <div className="flex items-center justify-between mb-3.5">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setLeftPanelTab("preview")}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                        leftPanelTab === "preview"
                          ? "bg-white/10 text-white"
                          : "text-gray-500 hover:text-white"
                      }`}
                    >
                      Preview
                    </button>
                    <button
                      onClick={() => setLeftPanelTab("json")}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                        leftPanelTab === "json"
                          ? "bg-white/10 text-white"
                          : "text-gray-500 hover:text-white"
                      }`}
                    >
                      OCR JSON
                    </button>
                  </div>
                  <button 
                    onClick={handleReRunEngine}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-teal-500/20 bg-teal-500/5 hover:bg-teal-500/10 text-teal-400 transition-all text-[10px] font-black uppercase tracking-wider"
                  >
                    <BsArrowRepeat className="animate-hover-spin" />
                    <span>Re-Run OCR</span>
                  </button>
                </div>
                
                <div className="flex-1 rounded-2xl border border-white/5 overflow-hidden flex relative bg-white/[0.01]">
                  {leftPanelTab === "preview" ? (
                    docUrlLoading ? (
                      <div className="flex-1 flex flex-col items-center justify-center space-y-3">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500" />
                        <span className="text-xs text-gray-500">Loading document vault...</span>
                      </div>
                    ) : docUrl ? (
                      selectedTrade.document?.mime_type?.includes("pdf") ? (
                        <iframe src={docUrl} className="w-full h-full border-0 bg-transparent" title="Document Preview" />
                      ) : (
                        <img src={docUrl} className="w-full h-full object-contain p-2" alt="Document Preview" />
                      )
                    ) : (
                      <div className="flex-1 flex items-center justify-center p-6 text-center">
                        <p className="text-gray-500 text-xs font-medium">No preview available for this document type</p>
                      </div>
                    )
                  ) : (
                    <div className="flex-1 p-4 overflow-auto custom-scrollbar bg-black/40">
                      <pre className="text-[10px] text-gray-400 font-mono whitespace-pre-wrap">
                        {JSON.stringify(selectedTrade.document?.metadata?.extracted_invoice || {}, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>

              {/* Center Panel: Edit Form */}
              <div className="flex-1 border-r border-white/5 p-5 overflow-y-auto custom-scrollbar space-y-6">
                
                {/* Dynamic Summary Card */}
                <div className="p-4.5 rounded-2xl bg-teal-500/[0.02] border border-teal-500/10 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-teal-500/10 text-teal-400 border border-teal-500/20">
                      Summary Note
                    </span>
                    <span className="text-[10px] text-gray-500 font-bold">Confidence: {((selectedTrade.confidence || 0.98) * 100).toFixed(0)}%</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-gray-500 block text-[10px] uppercase font-bold tracking-wider mb-0.5">Event Detected</span>
                      <span className="font-bold text-white text-sm">{formData.trade_type} ({formData.trade_direction})</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block text-[10px] uppercase font-bold tracking-wider mb-0.5">Counterparty</span>
                      <span className="font-bold text-white text-sm">
                        {parties.find(p => p.id === formData.party_id)?.name || "Unresolved Party"}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500 block text-[10px] uppercase font-bold tracking-wider mb-0.5">Total Amount</span>
                      <span className="font-black text-teal-400 text-sm">
                        {formData.currency} {formData.amount ? Number(formData.amount).toLocaleString(undefined, { minimumFractionDigits: 2 }) : "—"}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500 block text-[10px] uppercase font-bold tracking-wider mb-0.5">Invoice Date</span>
                      <span className="font-bold text-white text-sm">{formData.invoice_date || "—"}</span>
                    </div>
                  </div>
                </div>

                {/* Edit Form */}
                <div className="space-y-4">
                  <h3 className="text-xs font-black uppercase tracking-widest text-gray-500 border-b border-white/5 pb-2">Detected Parameters</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Trade Type</label>
                      <select
                        value={formData.trade_type}
                        onChange={(e) => setFormData(prev => ({ ...prev, trade_type: e.target.value }))}
                        className="w-full bg-[#141414] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-teal-500 transition-all cursor-pointer"
                      >
                        <option value="Vendor Invoice">Vendor Invoice</option>
                        <option value="Vendor Payment">Vendor Payment</option>
                        <option value="Sales Invoice">Sales Invoice</option>
                        <option value="Customer Payment">Customer Payment</option>
                        <option value="Expense Receipt">Expense Receipt</option>
                        <option value="Payroll">Payroll</option>
                        <option value="Investment">Investment</option>
                        <option value="Loan">Loan</option>
                        <option value="Bank Statement">Bank Statement</option>
                        <option value="Credit Note">Credit Note</option>
                        <option value="Debit Note">Debit Note</option>
                        <option value="Purchase Order">Purchase Order</option>
                        <option value="Sales Order">Sales Order</option>
                        <option value="Manual Trade">Manual Trade</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Trade Direction</label>
                      <select
                        value={formData.trade_direction}
                        onChange={(e) => setFormData(prev => ({ ...prev, trade_direction: e.target.value }))}
                        className="w-full bg-[#141414] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-teal-500 transition-all cursor-pointer"
                      >
                        <option value="PAYABLE">PAYABLE</option>
                        <option value="RECEIVABLE">RECEIVABLE</option>
                        <option value="IMMEDIATE_SETTLEMENT">IMMEDIATE_SETTLEMENT</option>
                        <option value="TRANSFER">TRANSFER</option>
                        <option value="NON_FINANCIAL">NON_FINANCIAL</option>
                      </select>
                    </div>
                  </div>

                  {/* Party Dropdown */}
                  <div className="grid grid-cols-1 gap-1">
                    <div className="flex items-center justify-between">
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Party Resolution</label>
                      <button 
                        type="button"
                        onClick={() => setShowAddPartyModal(true)}
                        className="flex items-center space-x-1 text-[10px] text-teal-400 hover:text-teal-300 font-black uppercase tracking-wider"
                      >
                        <BsPlusLg size={8} />
                        <span>Add Party</span>
                      </button>
                    </div>
                    <select
                      value={formData.party_id}
                      onChange={(e) => handlePartyChange(e.target.value)}
                      className="w-full bg-[#141414] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-teal-500 transition-all cursor-pointer"
                    >
                      <option value="">-- Choose Party --</option>
                      {parties.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name} {p.is_self ? "(Self)" : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Entities Dropdowns */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center justify-between">
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Counterparty Entity</label>
                        {formData.party_id && (
                          <button 
                            type="button"
                            onClick={() => {
                              setEntityModalPartyId(formData.party_id);
                              setShowAddEntityModal(true);
                            }}
                            className="text-[9px] text-teal-400 hover:text-teal-300 uppercase tracking-wider font-bold mb-1.5"
                          >
                            + Add Entity
                          </button>
                        )}
                      </div>
                      <select
                        value={formData.entity_id}
                        disabled={!formData.party_id}
                        onChange={(e) => setFormData(prev => ({ ...prev, entity_id: e.target.value }))}
                        className="w-full bg-[#141414] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-teal-500 transition-all disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                      >
                        <option value="">-- Leave Unresolved --</option>
                        {counterpartyEntities.map(e => (
                          <option key={e.id} value={e.id}>{e.name} ({e.type})</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <div className="flex items-center justify-between">
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Our Entity</label>
                        {parties.find(p => p.is_self)?.id && (
                          <button 
                            type="button"
                            onClick={() => {
                              setEntityModalPartyId(parties.find(p => p.is_self).id);
                              setShowAddEntityModal(true);
                            }}
                            className="text-[9px] text-teal-400 hover:text-teal-300 uppercase tracking-wider font-bold mb-1.5"
                          >
                            + Add Entity
                          </button>
                        )}
                      </div>
                      <select
                        value={formData.our_entity_id}
                        onChange={(e) => setFormData(prev => ({ ...prev, our_entity_id: e.target.value }))}
                        className="w-full bg-[#141414] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-teal-500 transition-all cursor-pointer"
                      >
                        <option value="">-- Leave Unresolved --</option>
                        {ourEntities.map(e => (
                          <option key={e.id} value={e.id}>{e.name} ({e.type})</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* COA Label Resolution */}
                  <div className="grid grid-cols-1 gap-1">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">COA Label Resolution</label>
                    <select
                      value={formData.label_id}
                      onChange={(e) => setFormData(prev => ({ ...prev, label_id: e.target.value }))}
                      className="w-full bg-[#141414] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-teal-500 transition-all cursor-pointer"
                    >
                      <option value="">-- Choose Label --</option>
                      {labels.map(l => (
                        <option key={l.id} value={l.id}>{l.name} ({l.type})</option>
                      ))}
                    </select>
                  </div>

                  {/* Financial Fields */}
                  <div className="grid grid-cols-4 gap-4">
                    <div className="col-span-1">
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Gross Amount</label>
                      <input
                        type="number"
                        value={formData.gross_amount}
                        onChange={(e) => setFormData(prev => ({ ...prev, gross_amount: e.target.value, amount: e.target.value }))}
                        placeholder="0.00"
                        className="w-full bg-[#141414] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-teal-500 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Tax Portion</label>
                      <input
                        type="number"
                        value={formData.tax_amount}
                        onChange={(e) => setFormData(prev => ({ ...prev, tax_amount: e.target.value }))}
                        placeholder="0.00"
                        className="w-full bg-[#141414] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-teal-500 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Net Amount</label>
                      <input
                        type="number"
                        value={formData.net_amount}
                        onChange={(e) => setFormData(prev => ({ ...prev, net_amount: e.target.value }))}
                        placeholder="0.00"
                        className="w-full bg-[#141414] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-teal-500 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Currency</label>
                      <input
                        type="text"
                        value={formData.currency}
                        onChange={(e) => setFormData(prev => ({ ...prev, currency: e.target.value }))}
                        className="w-full bg-[#141414] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-teal-500 transition-all"
                      />
                    </div>
                  </div>

                  {/* Dates & Reference */}
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Invoice Number</label>
                      <input
                        type="text"
                        value={formData.invoice_number}
                        onChange={(e) => setFormData(prev => ({ ...prev, invoice_number: e.target.value }))}
                        placeholder="INV-XXX"
                        className="w-full bg-[#141414] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-teal-500 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Invoice Date</label>
                      <input
                        type="date"
                        value={formData.invoice_date}
                        onChange={(e) => setFormData(prev => ({ ...prev, invoice_date: e.target.value }))}
                        className="w-full bg-[#141414] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-teal-500 transition-all cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Due Date</label>
                      <input
                        type="date"
                        value={formData.due_date}
                        onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
                        className="w-full bg-[#141414] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-teal-500 transition-all cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Description & Notes */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Description Summary</label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                        rows={2}
                        className="w-full bg-[#141414] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-teal-500 transition-all custom-scrollbar"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Internal Notes</label>
                      <textarea
                        value={formData.notes}
                        onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                        rows={2}
                        className="w-full bg-[#141414] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-teal-500 transition-all custom-scrollbar"
                        placeholder="Add annotations or corrections..."
                      />
                    </div>
                  </div>

                  {/* Operational Financial Activities Section */}
                  <div className="space-y-4 pt-6 border-t border-white/5">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-black uppercase tracking-widest text-gray-500">Operational Financial Activities Sequence</h3>
                      <button
                        type="button"
                        onClick={() => {
                          setActivities(prev => [
                            ...prev,
                            {
                              id: `temp-${Date.now()}`,
                              sequence: prev.length + 1,
                              activity_type: "INCREASE_LABEL",
                              amount: 0,
                              target_id: "",
                              status: "Pending"
                            }
                          ])
                        }}
                        className="flex items-center space-x-1 text-[10px] text-teal-400 hover:text-teal-300 font-black uppercase tracking-wider"
                      >
                        <BsPlusLg size={8} />
                        <span>Add Activity</span>
                      </button>
                    </div>

                    {/* Timeline Tracker */}
                    <div className="flex items-center space-x-2 overflow-x-auto py-2 px-1">
                      {activities.map((act, index) => (
                        <React.Fragment key={act.id}>
                          {index > 0 && <span className="text-gray-600 text-xs shrink-0">➔</span>}
                          <div className="flex flex-col items-center bg-white/[0.03] border border-white/5 px-2.5 py-1.5 rounded-lg shrink-0">
                            <span className="text-[8px] text-teal-400 font-black uppercase">Seq {act.sequence}</span>
                            <span className="text-[10px] text-white font-bold max-w-[120px] truncate">{act.activity_type}</span>
                          </div>
                        </React.Fragment>
                      ))}
                    </div>

                    <div className="space-y-3">
                      {activities.map((act, index) => (
                        <div key={act.id} className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl space-y-3 relative group">
                          <button
                            type="button"
                            onClick={() => {
                              setActivities(prev => prev.filter(a => a.id !== act.id).map((a, i) => ({ ...a, sequence: i + 1 })));
                            }}
                            className="absolute right-4 top-4 opacity-0 group-hover:opacity-100 text-rose-400 hover:text-rose-300 text-xs transition-opacity font-bold uppercase tracking-wider"
                          >
                            Delete
                          </button>

                          <div className="grid grid-cols-3 gap-4">
                            <div>
                              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Activity Type</label>
                              <select
                                value={act.activity_type}
                                onChange={(e) => {
                                  const updated = [...activities];
                                  updated[index].activity_type = e.target.value;
                                  setActivities(updated);
                                }}
                                className="w-full bg-[#141414] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500 transition-all cursor-pointer"
                              >
                                <option value="CREATE_RECEIVABLE">CREATE_RECEIVABLE</option>
                                <option value="CREATE_PAYABLE">CREATE_PAYABLE</option>
                                <option value="INCREASE_LABEL">INCREASE_LABEL</option>
                                <option value="DECREASE_LABEL">DECREASE_LABEL</option>
                                <option value="CREATE_ASSET">CREATE_ASSET</option>
                                <option value="UPDATE_STOCK">UPDATE_STOCK</option>
                                <option value="CONSUME_BUDGET">CONSUME_BUDGET</option>
                                <option value="UPDATE_PARTY">UPDATE_PARTY</option>
                                <option value="UPDATE_ENTITY">UPDATE_ENTITY</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Target Account/Label</label>
                              <select
                                value={act.target_id || ""}
                                onChange={(e) => {
                                  const updated = [...activities];
                                  updated[index].target_id = e.target.value;
                                  setActivities(updated);
                                }}
                                className="w-full bg-[#141414] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500 transition-all cursor-pointer"
                              >
                                <option value="">-- Choose Label --</option>
                                {labels.map(l => (
                                  <option key={l.id} value={l.id}>{l.name} ({l.type})</option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Amount</label>
                              <input
                                type="number"
                                value={act.amount}
                                onChange={(e) => {
                                  const updated = [...activities];
                                  updated[index].amount = e.target.value;
                                  setActivities(updated);
                                }}
                                className="w-full bg-[#141414] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500 transition-all"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Operational Balance Preview */}
                  <div className="space-y-4 pt-6 border-t border-white/5">
                    <h3 className="text-xs font-black uppercase tracking-widest text-gray-500">Operational Balance Impact Preview</h3>
                    <div className="grid grid-cols-2 gap-4">
                      {activities.map(act => {
                        const lbl = labels.find(l => l.id === act.target_id);
                        if (!lbl) return null;
                        const currentVal = parseFloat(lbl.current_amount || 0.0);
                        const change = act.activity_type.startsWith("DECREASE") || act.activity_type.startsWith("SUBTRACT") || act.activity_type.startsWith("REMOVE") ? -parseFloat(act.amount || 0) : parseFloat(act.amount || 0);
                        const predicted = currentVal + change;
                        
                        return (
                          <div key={act.id} className="p-3 bg-white/[0.01] border border-white/5 rounded-2xl flex flex-col justify-between space-y-1">
                            <div>
                              <span className="font-extrabold text-white text-xs block truncate">{lbl.name}</span>
                              <span className="text-[9px] text-gray-500 uppercase tracking-widest block">{act.activity_type}</span>
                            </div>
                            <div className="flex items-baseline justify-between pt-1 border-t border-white/5 mt-1">
                              <span className="text-[10px] text-gray-400">₹{currentVal.toLocaleString()} ➔ <span className="font-black text-teal-400">₹{predicted.toLocaleString()}</span></span>
                              <span className={`text-[10px] font-bold ${change >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                                {change >= 0 ? "+" : ""}₹{change.toLocaleString()}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                </div>
              </div>

              {/* Right Panel: Validation Sidebar */}
              <div className="w-[30%] p-5 overflow-y-auto custom-scrollbar flex flex-col space-y-6 bg-black/10">
                
                {/* Confidence ring */}
                <div className="flex flex-col items-center justify-center p-4 bg-white/[0.02] border border-white/5 rounded-2xl text-center">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-3 block">Extraction Confidence</span>
                  
                  <div className="relative w-24 h-24 flex items-center justify-center mb-1">
                    {/* Ring background */}
                    <svg className="w-full h-full transform -rotate-90">
                      <circle cx="48" cy="48" r="40" stroke="rgba(255,255,255,0.03)" strokeWidth="6" fill="transparent" />
                      <circle 
                        cx="48" 
                        cy="48" 
                        r="40" 
                        stroke="#81E6D9" 
                        strokeWidth="6" 
                        fill="transparent"
                        strokeDasharray={2 * Math.PI * 40}
                        strokeDashoffset={2 * Math.PI * 40 * (1 - (selectedTrade.confidence || 0.95))}
                        className="transition-all duration-1000 ease-out"
                      />
                    </svg>
                    <span className="absolute text-lg font-black text-white">{((selectedTrade.confidence || 0.95) * 100).toFixed(0)}%</span>
                  </div>
                  
                  <span className="text-[10px] text-gray-400 font-medium">Verified from raw PDF metadata</span>
                </div>

                {/* Validation warnings */}
                <div className="flex-grow flex flex-col space-y-4">
                  <h3 className="text-xs font-black uppercase tracking-widest text-gray-500 border-b border-white/5 pb-2">Validation Diagnostics</h3>
                  
                  {selectedTrade.validation_issues && selectedTrade.validation_issues.length > 0 ? (
                    <div className="space-y-3.5">
                      {selectedTrade.validation_issues.map((issue, idx) => (
                        <div 
                          key={idx} 
                          className={`p-3.5 rounded-xl border flex items-start space-x-3 text-xs leading-relaxed transition-all ${
                            issue.type === "error" 
                              ? "bg-rose-500/5 border-rose-500/20 text-rose-400" 
                              : "bg-amber-500/5 border-amber-500/20 text-amber-400"
                          }`}
                        >
                          <div className="pt-0.5 shrink-0">
                            {issue.type === "error" ? <BsXCircle size={14} /> : <BsExclamationTriangleFill size={14} />}
                          </div>
                          <div>
                            <span className="font-extrabold uppercase text-[9px] tracking-wider block mb-1">
                              {issue.type === "error" ? "Blocker" : "Warning"}
                            </span>
                            <p>{issue.message}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex-grow flex flex-col items-center justify-center p-6 bg-emerald-500/[0.02] border border-emerald-500/10 rounded-2xl text-center">
                      <BsCheckCircleFill className="text-emerald-400 text-3xl mb-3 animate-pulse" />
                      <h4 className="text-white font-bold text-xs mb-1">All validation checks passed!</h4>
                      <p className="text-gray-500 text-[10px] max-w-[180px]">No duplicates, negative values, or unresolved parties detected.</p>
                    </div>
                  )}
                </div>

                {/* Audit Trail Log */}
                <div className="space-y-4 pt-4 border-t border-white/5">
                  <h3 className="text-xs font-black uppercase tracking-widest text-gray-500 pb-2">Immutable Audit Trail</h3>
                  <div className="space-y-2">
                    {auditTrail.length > 0 ? (
                      auditTrail.map(log => (
                        <div key={log.id} className="p-3 bg-white/[0.01] border border-white/5 rounded-xl text-left space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase text-teal-400">{log.action}</span>
                            <span className="text-[8px] text-gray-500 font-bold">{new Date(log.created_at).toLocaleTimeString()}</span>
                          </div>
                          {log.metadata?.executed_by && (
                            <span className="text-[9px] text-gray-400 block font-medium">By: {log.metadata.executed_by}</span>
                          )}
                          <span className="text-[9px] text-gray-500 block truncate">{JSON.stringify(log.new_value || {})}</span>
                        </div>
                      ))
                    ) : (
                      <span className="text-[10px] text-gray-500 italic block text-center py-2">No audit log entries recorded yet</span>
                    )}
                  </div>
                </div>

              </div>

            </div>

            {/* Bottom Actions Bar */}
            <div className="p-4.5 border-t border-white/5 bg-[#0A0A0A] flex items-center justify-between sticky bottom-0 z-20">
              <button 
                onClick={() => handleSaveTrade("Draft")}
                className="flex items-center space-x-2 px-5 py-2.5 rounded-xl border border-white/10 hover:bg-white/5 text-gray-300 hover:text-white font-bold text-xs transition-all shadow-sm active:scale-95"
              >
                <BsSave />
                <span>Save Draft</span>
              </button>

              <div className="flex items-center space-x-3.5">
                <button 
                  onClick={() => handleSaveTrade("Rejected")}
                  className="flex items-center space-x-2 px-5 py-2.5 rounded-xl border border-rose-500/20 hover:bg-rose-500/10 text-rose-400 hover:text-rose-300 font-bold text-xs transition-all shadow-sm active:scale-95"
                >
                  <BsXCircle />
                  <span>Reject</span>
                </button>

                <button 
                  onClick={handleApproveExecute}
                  className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-teal-400 text-black hover:opacity-90 font-extrabold text-xs transition-all shadow-md active:scale-95"
                >
                  <BsCheck2 />
                  <span>Approve & Execute</span>
                </button>
              </div>
            </div>

          </div>
        ) : (
          /* ==============================================================
             QUEUE list view
             ============================================================== */
          <div className="h-full flex flex-col p-8 space-y-6 overflow-y-auto custom-scrollbar">
            
            {/* Stage/Status Tabs */}
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <div className="flex items-center space-x-6">
                {TRADE_STATUS_TABS.map(tab => {
                  const count = trades.filter(t => tab.id === "All" || t.status === tab.id).length;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setStatusFilter(tab.id)}
                      className={`pb-3 px-1 text-xs font-black tracking-widest relative uppercase transition-all border-b-2 -mb-[10px] ${
                        statusFilter === tab.id 
                          ? "border-teal-400 text-teal-400 font-black" 
                          : "border-transparent text-gray-500 hover:text-gray-300"
                      }`}
                    >
                      <span>{tab.label}</span>
                      <span className="ml-2 bg-white/5 text-gray-400 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Search Bar */}
              <div className="relative w-72">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search trades (invoice, party, type)..."
                  className="w-full bg-[#141414] border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-none focus:border-teal-500 transition-all placeholder-gray-600 font-medium"
                />
                <BsSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-600 text-xs" />
              </div>
            </div>

            {/* Trades List */}
            {loading ? (
              <div className="flex-1 flex flex-col items-center justify-center py-24 space-y-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500" />
                <span className="text-xs text-gray-500">Retrieving Trade Engine Queue...</span>
              </div>
            ) : filteredTradesList.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-24 border border-dashed border-white/5 rounded-3xl bg-white/[0.01]">
                <div className="p-4 rounded-full bg-white/5 mb-4 text-gray-700">
                  <BsArrowLeftRight size={32} />
                </div>
                <h3 className="text-white font-bold mb-1">Queue is empty</h3>
                <p className="text-gray-500 text-sm max-w-[280px]">
                  No trades found matching status filter "{statusFilter}" or search query. Upload documents to process them automatically.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTradesList.map((t) => {
                  const counterparty = t.trade_parties?.find(p => !p.parties?.is_self)?.detected_name || "Unknown";
                  const issueCount = getValidationCount(t);
                  
                  return (
                    <Card 
                      key={t.id} 
                      onClick={() => handleSelectTrade(t)}
                      className="group cursor-pointer hover:border-teal-500/30 p-0 overflow-hidden flex flex-col hover:scale-[1.01] transition-all duration-300"
                    >
                      <div className="p-5 flex-1 flex flex-col justify-between space-y-5">
                        
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest bg-white/5 text-gray-400 border border-white/5">
                              {t.trade_type}
                            </span>
                            <h4 className="text-sm font-extrabold text-white truncate mt-2 group-hover:text-teal-400 transition-colors">
                              {counterparty}
                            </h4>
                            <p className="text-[10px] text-gray-500 font-bold truncate mt-1">
                              Doc: {t.document?.filename || "Manual Entry"}
                            </p>
                          </div>
                          
                          {/* Validation issues bubble */}
                          {issueCount > 0 ? (
                            <span className="shrink-0 flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-rose-500/10 border border-rose-500/20 text-rose-400" title={`${issueCount} validation issues`}>
                              <BsExclamationTriangleFill size={10} />
                              <span>{issueCount}</span>
                            </span>
                          ) : (
                            <span className="shrink-0 flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                              <BsCheckCircleFill size={10} />
                              <span>Ready</span>
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5 text-xs">
                          <div>
                            <span className="text-[9px] uppercase font-bold text-gray-500 tracking-wider block">Amount</span>
                            <span className="font-extrabold text-teal-400">
                              {t.currency} {t.gross_amount || t.amount ? Number(t.gross_amount || t.amount).toLocaleString(undefined, { minimumFractionDigits: 2 }) : "—"}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-[9px] uppercase font-bold text-gray-500 tracking-wider block">Confidence</span>
                            <span className="font-extrabold text-white">
                              {((t.confidence || 0.95) * 100).toFixed(0)}%
                            </span>
                          </div>
                          <div>
                            <span className="text-[9px] uppercase font-bold text-gray-500 tracking-wider block">Status</span>
                            <span className={`font-extrabold uppercase text-[10px] ${t.status === 'Ready' ? 'text-emerald-400' : t.status === 'Rejected' ? 'text-rose-400' : 'text-amber-400'}`}>
                              {t.status}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-[9px] uppercase font-bold text-gray-500 tracking-wider block">Last Updated</span>
                            <span className="text-gray-400 font-medium">
                              {new Date(t.updated_at || t.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>

                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ==============================================================
         MODALS & DIALOGS
         ============================================================== */}

      {/* Quick Add Party Modal */}
      {showAddPartyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#141414] border border-white/10 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-sm font-black uppercase tracking-wider text-teal-400">Create Draft Party</h3>
            
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Party Name</label>
                <input 
                  type="text"
                  value={newPartyName}
                  onChange={(e) => setNewPartyName(e.target.value)}
                  placeholder="e.g. Acme Corp"
                  className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-teal-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Category</label>
                <select
                  value={newPartyCategory}
                  onChange={(e) => setNewPartyCategory(e.target.value)}
                  className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-teal-500 transition-all cursor-pointer"
                >
                  <option value="corporation">Corporation (Company/Vendor)</option>
                  <option value="individual">Individual (Employee/Freelancer)</option>
                  <option value="group">Group / Entity Cluster</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button 
                onClick={() => setShowAddPartyModal(false)}
                className="px-4 py-2 border border-white/10 rounded-xl text-gray-400 hover:text-white transition-all text-xs font-bold"
              >
                Cancel
              </button>
              <button 
                onClick={handleCreateParty}
                disabled={!newPartyName.trim()}
                className="px-4 py-2 bg-teal-400 text-black font-extrabold rounded-xl hover:opacity-90 transition-all text-xs disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Create Party
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Add Entity Modal */}
      {showAddEntityModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#141414] border border-white/10 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-sm font-black uppercase tracking-wider text-teal-400">Add resolved entity</h3>
            
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Entity Name / Handle</label>
                <input 
                  type="text"
                  value={newEntityName}
                  onChange={(e) => setNewEntityName(e.target.value)}
                  placeholder="e.g. HDFC Salary Account, ICICI Current"
                  className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-teal-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Entity Type</label>
                <select
                  value={newEntityType}
                  onChange={(e) => setNewEntityType(e.target.value)}
                  className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-teal-500 transition-all cursor-pointer"
                >
                  <option value="bank">Bank Account</option>
                  <option value="upi">UPI ID / QR Handle</option>
                  <option value="cash">Cash Register / Box</option>
                  <option value="property">Physical Property / Asset</option>
                  <option value="legal_rep">Legal Representative</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button 
                onClick={() => setShowAddEntityModal(false)}
                className="px-4 py-2 border border-white/10 rounded-xl text-gray-400 hover:text-white transition-all text-xs font-bold"
              >
                Cancel
              </button>
              <button 
                onClick={handleCreateEntity}
                disabled={!newEntityName.trim()}
                className="px-4 py-2 bg-teal-400 text-black font-extrabold rounded-xl hover:opacity-90 transition-all text-xs disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Create Entity
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
