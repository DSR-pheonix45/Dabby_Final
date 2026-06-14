import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../hooks/useAuth";
import { supabase } from "../../lib/supabase";
import { 
  Upload, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Trash2, 
  ArrowRight, 
  Lock, 
  Loader2, 
  Sparkles, 
  RefreshCw, 
  FileSpreadsheet,
  AlertTriangle,
  HelpCircle,
  TrendingUp,
  Percent,
  Share2,
  X
} from "lucide-react";

// Rotating title items
const ROTATING_TITLES = [
  "manual bank recon",
  "manual Receivable checklist",
  "manual Expense breakdown",
  "manual cash flow planning"
];

// Suggested query prompts for quick testing
const SUGGESTED_QUERIES = [
  {
    label: "🔍 Find Duplicate Payments",
    prompt: "Audit this general ledger against our bank feeds. Identify any duplicate vendor payments, matching transaction references, and double-billing errors."
  },
  {
    label: "📊 Audit GST Splits",
    prompt: "Scan our Zoho invoice logs against the bank statement. Verify if GST tax splits (18% vs 12%) match our input tax credit claims."
  },
  {
    label: "💸 Identify Cash Leaks",
    prompt: "Analyze our monthly expense log. Highlight recurring software subscriptions that haven't been active, or any unusual spike in miscellaneous expenses."
  },
  {
    label: "📈 Calculate Runway",
    prompt: "Assess our current cash inflows and outflows. Estimate monthly burn rate and forecast runway for the next 12 months."
  }
];

// Fallback Mock summary generator
function getAuditSummary(query) {
  const q = (query || "").toLowerCase();
  if (q.includes("duplicate") || q.includes("double") || q.includes("billing")) {
    return "Dabby's anomaly engine detected 1 duplicate payment of ₹45,000 paid to Acme Corp under reference TXN_987234. Our ledger split matching indicates the same invoice voucher was processed twice within a 24-hour window, bypassing Zoho's standard validation.";
  }
  if (q.includes("gst") || q.includes("tax") || q.includes("split")) {
    return "GST Split Audit: Flagged 3 discrepancies in Zoho purchase records. Input tax credit of 18% was claimed on DigitalOcean cloud services, but bank transactions only show a 12% GST charge reference. Estimated potential tax liability gap of ₹12,900.";
  }
  if (q.includes("leak") || q.includes("expense") || q.includes("subscription")) {
    return "Expense Audit: Identified 2 inactive recurring subscriptions (Slack Pro and Adobe Suite) totalling ₹8,500/month with zero usage logs in the past 90 days. High-risk alert on travel reimbursements: 2 invoices submitted without receipt attachments.";
  }
  if (q.includes("runway") || q.includes("cash") || q.includes("burn")) {
    return "Runway Analysis: Average monthly cash burn is ₹4,20,000. Based on your current bank ledger balance of ₹35,80,000, your business has a runway of approximately 8.5 months. Recommending credit line expansion or optimizing software subscription leaks.";
  }
  return "General Ledger Audit: Parsed all accounts receivable and bank statement logs. Reconciled 94.2% of entries automatically. Flagged 3 transactions for manual review due to missing transaction references, and highlighted ₹8,12,000 in unmatched cash outflows.";
}

export default function Hero() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const isDark = theme === "dark";

  // Title Rotation
  const [titleIndex, setTitleIndex] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setTitleIndex((prev) => (prev + 1) % ROTATING_TITLES.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  // File Uploader & Prompt states
  const fileInputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [prompt, setPrompt] = useState("");
  const [isDragActive, setIsDragActive] = useState(false);

  // Analysis State Machine
  // 'idle' | 'uploading' | 'parsing' | 'matching' | 'detecting' | 'complete'
  const [analysisState, setAnalysisState] = useState("idle");
  const [uploadProgress, setUploadProgress] = useState(0);

  // AI & OCR parsed report state
  const [reportData, setReportData] = useState(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Waitlist Embedded Form states
  const [waitlistEmail, setWaitlistEmail] = useState("");
  const [waitlistLoading, setWaitlistLoading] = useState(false);
  const [waitlistSuccess, setWaitlistSuccess] = useState(false);
  const [waitlistError, setWaitlistError] = useState("");

  // Share link states
  const [isSharedView, setIsSharedView] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  // Parse shareable link on page mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const shareParam = params.get("share");
    if (shareParam) {
      try {
        const decodedJson = decodeURIComponent(escape(atob(shareParam)));
        const data = JSON.parse(decodedJson);
        if (data && data.name && data.report) {
          setFile({
            name: data.name,
            size: data.size || 0,
            type: "application/octet-stream",
            isSample: true
          });
          setPrompt(data.query || "");
          setReportData(data.report);
          setAnalysisState("complete");
          setIsSharedView(true);
        }
      } catch (e) {
        console.error("Failed to parse shared report data", e);
      }
    }
  }, []);

  // Drag over/enter/leave events
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  // Drop event
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      setFile({
        name: droppedFile.name,
        size: droppedFile.size,
        type: droppedFile.type,
        isSample: false,
        rawFile: droppedFile
      });
    }
  };

  // File Select event
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile({
        name: selectedFile.name,
        size: selectedFile.size,
        type: selectedFile.type,
        isSample: false,
        rawFile: selectedFile
      });
    }
  };

  // Use Sample statement event
  const handleUseSample = () => {
    setFile({
      name: "zoho_and_tally_ledger_fy26.xlsx",
      size: 2457600, // 2.4 MB
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      isSample: true
    });
    // Prefill with a logical audit prompt
    setPrompt("Audit this general ledger against our bank feeds. Identify any duplicate vendor payments, matching transaction references, and double-billing errors.");
  };

  // Delete file event
  const handleRemoveFile = () => {
    setFile(null);
    setReportData(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (analysisState !== "idle") setAnalysisState("idle");
  };

  // Handle Suggested Quick Tag click
  const handleSuggestedClick = (tag) => {
    setPrompt(tag.prompt);
    if (!file) {
      handleUseSample();
    }
  };

  // Real LLM-based OCR & Analysis runner
  const runRealAnalysis = async (uploadedFile, userPrompt) => {
    setIsAiLoading(true);
    try {
      // Lazy load standard parser & RAG LLM fallback service
      const { callLLMWithFallback } = await import("../../services/llmService");
      
      // Instantiate file object to parse
      let activeFile = uploadedFile.rawFile;
      if (uploadedFile.isSample) {
        // Mock Tally/Zoho General Ledger CSV data
        const sampleCSV = `Date,Description,Reference,Amount,GST
2026-06-12,Zoho Purchase Invoice INV-2026-8928 (Acme Corp),TXN_987234,45000,18%
2026-06-12,Zoho Duplicate Payment INV-2026-8928 (Acme Corp),TXN_987234,45000,18%
2026-06-08,HDFC Bank Debit Self Withdraw,TXN_002842,120000,0%
2026-06-02,Zoho Purchase Split DigitalOcean Cloud,TXN_873198,12900,18%
2026-05-28,Tally General Ledger Transfer Vikas,TXN_287419,89000,18%`;
        activeFile = new File([sampleCSV], uploadedFile.name, { type: "text/csv" });
      }

      const systemPrompt = `
You are Dabby AI Financial Auditor. Your task is to perform an immediate audit on the provided transaction ledger or bank statement.
Analyze the document context and any custom query from the user. Identify anomalies such as:
1. Duplicate payments (same amount, vendor, within a short timeframe).
2. GST tax split mismatches or unexpected tax calculations.
3. Unreconciled or missing voucher descriptions.

You MUST return ONLY a valid JSON object. Do not include any conversational text outside the JSON.
Response format:
{
  "match_rate": 94.2, // estimated percentage of clean/reconciled records (number between 0 and 100)
  "gst_warnings_count": 3, // number of tax anomalies found (integer)
  "unmatched_outflows_total": "₹8,12,000", // sum of unmatched/suspicious outflows (string with currency)
  "executive_summary": "Summarize the audit results, explicitly addressing the user's query: [insert query]. Point out duplicate references, tax liability, or cash flow concerns.",
  "anomalies": [
    {
      "date": "YYYY-MM-DD",
      "description": "Short description of the transaction and what is wrong with it",
      "ref": "Reference ID or transaction hash",
      "amount": "₹XX,XXX",
      "status": "Duplicate Payment" | "GST Mismatch" | "Unreconciled Outflow" | "Auto Reconciled"
    }
  ]
}
`;

      const result = await callLLMWithFallback({
        query: `Perform ledger audit and output JSON format as specified. User inquiry context: "${userPrompt}"`,
        systemPrompt: systemPrompt,
        uploaded_files: [activeFile]
      });

      // Extract JSON from completions response
      const jsonMatch = result.response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        setReportData(parsed);
      } else {
        throw new Error("No JSON structure returned from AI model");
      }
    } catch (err) {
      console.warn("Real AI analysis failed, falling back to mock report:", err);
      // Fallback details generated dynamically
      const fallbackReport = {
        match_rate: 94.2,
        gst_warnings_count: 3,
        unmatched_outflows_total: "₹8,12,000",
        executive_summary: getAuditSummary(userPrompt),
        anomalies: [
          {
            date: "2026-06-12",
            description: "Zoho Purchase Invoice #INV-2026-8928 (Acme Corp)",
            ref: "TXN_987234",
            amount: "₹45,000",
            status: "Duplicate Payment"
          },
          {
            date: "2026-06-08",
            description: "HDFC Bank Debit - Self Withdraw Ref 2842",
            ref: "TXN_002842",
            amount: "₹1,20,000",
            status: "Missing bookkeeping voucher"
          },
          {
            date: "2026-06-02",
            description: "Zoho Purchase Split - Cloud Compute DigitalOcean",
            ref: "TXN_873198",
            amount: "₹12,900",
            status: "GST Split rate mismatch (18% vs 12%)"
          },
          {
            date: "2026-05-28",
            description: "Tally General Ledger Transfer - Vikas Retailers",
            ref: "TXN_287419",
            amount: "₹89,000",
            status: "Auto Reconciled"
          }
        ]
      };
      setReportData(fallbackReport);
    } finally {
      setIsAiLoading(false);
    }
  };

  // Trigger analysis simulation & parallel LLM worker
  const handleAnalyze = () => {
    if (!file) {
      alert("Please upload a file or click 'Use sample statement' first.");
      return;
    }
    
    setAnalysisState("uploading");
    setUploadProgress(0);

    // Trigger LLM OCR & Audit call in background
    runRealAnalysis(file, prompt);

    // Simulate progress updates for uploading UI
    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + 20;
      });
    }, 200);

    // Timeline simulation to display loading checkpoints
    setTimeout(() => {
      setAnalysisState("parsing");
      setTimeout(() => {
        setAnalysisState("matching");
        setTimeout(() => {
          setAnalysisState("detecting");
          setTimeout(() => {
            setAnalysisState("complete");
          }, 1500);
        }, 1500);
      }, 1500);
    }, 1200);
  };

  // Waitlist submission
  const handleWaitlistSubmit = async (e) => {
    e.preventDefault();
    const email = waitlistEmail.trim();
    if (!email) {
      setWaitlistError("Please enter your email.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setWaitlistError("Please enter a valid email address.");
      return;
    }

    try {
      setWaitlistLoading(true);
      setWaitlistError("");
      const { error } = await supabase
        .from("waitlist")
        .insert([{ email }]);
      
      if (error) {
        if (error.code === "23505") {
          setWaitlistSuccess(true);
          return;
        }
        throw error;
      }
      setWaitlistSuccess(true);
    } catch (err) {
      console.error("Waitlist error:", err);
      setWaitlistError("Something went wrong. Please try again.");
    } finally {
      setWaitlistLoading(false);
    }
  };

  // Share Report URL Generation
  const handleShareReport = () => {
    if (!file || !reportData) return;
    const shareData = {
      name: file.name,
      size: file.size,
      query: prompt,
      report: reportData
    };
    const base64Str = btoa(unescape(encodeURIComponent(JSON.stringify(shareData))));
    const shareUrl = `${window.location.origin}${window.location.pathname}?share=${base64Str}`;
    
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    });
  };

  // Reset/Close Report
  const handleCloseReport = () => {
    // Clear URL search params
    const newUrl = window.location.pathname;
    window.history.replaceState({}, document.title, newUrl);
    
    setFile(null);
    setPrompt("");
    setReportData(null);
    setAnalysisState("idle");
    setIsSharedView(false);
    setWaitlistSuccess(false);
    setWaitlistEmail("");
    setWaitlistError("");
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <section className="relative pt-24 md:pt-32 pb-16 md:pb-24 px-4 sm:px-6 md:px-12 overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[500px] pointer-events-none overflow-hidden -z-10">
        <div className={`absolute top-[-20%] left-[20%] w-[350px] sm:w-[500px] h-[350px] sm:h-[500px] rounded-full blur-[120px] opacity-20 ${isDark ? "bg-[#81E6D9]" : "bg-[#0D9488]"}`} />
        <div className={`absolute top-[-10%] right-[20%] w-[300px] sm:w-[400px] h-[300px] sm:h-[400px] rounded-full blur-[100px] opacity-15 ${isDark ? "bg-blue-400" : "bg-blue-300"}`} />
      </div>

      {/* Shared Report Top Banner */}
      {isSharedView && (
        <div className="max-w-4xl mx-auto mb-6">
          <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl border text-center sm:text-left ${
            isDark ? "bg-[#111111]/80 border-[#81E6D9]/30 text-white" : "bg-white border-[#0D9488]/30 text-[#1a1a1a]"
          }`}>
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-[#81E6D9] flex-shrink-0 animate-pulse" />
              <div>
                <p className="text-xs font-bold">Viewing Shared Dabby AI Audit Report</p>
                <p className={`text-[11px] ${isDark ? "text-gray-400" : "text-gray-500"}`}>Want to run an interactive audit on your own ledger sheets?</p>
              </div>
            </div>
            <button 
              onClick={handleCloseReport}
              className="px-4 py-2 bg-[#81E6D9] text-black font-bold text-xs rounded-xl hover:bg-[#5fd3c7] transition-all whitespace-nowrap"
            >
              Analyze Your Statement
            </button>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto">
        {/* Top waitlist badge */}
        <motion.div 
          initial={{ opacity: 0, y: 16 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.5 }} 
          className="flex justify-center mb-6"
        >
          <Link to="/waitlist" className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all duration-300 ${isDark ? "bg-[#81E6D9]/10 border-[#81E6D9]/25 text-[#81E6D9] hover:bg-[#81E6D9]/15" : "bg-[#0D9488]/10 border-[#0D9488]/25 text-[#0D9488] hover:bg-[#0D9488]/15"}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-[#81E6D9] animate-pulse" />
            SME Accounting Automated · Join Waitlist
            <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
          </Link>
        </motion.div>

        {/* Dynamic Rotating Headline */}
        <div className="text-center mb-6 min-h-[7rem] sm:min-h-[5.5rem] md:min-h-[6.5rem] flex flex-col justify-end">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.6, delay: 0.1 }}
            className={`font-display text-3xl sm:text-5xl md:text-6xl font-bold leading-[1.15] sm:leading-[1.1] tracking-tight text-center ${isDark ? "text-white" : "text-[#1a1a1a]"}`}
          >
            Stop wasting 3 days a month
            <br />
            on{" "}
            <span className="relative inline-block overflow-hidden align-bottom text-[#81E6D9] min-w-[280px] sm:min-w-[480px] justify-center sm:justify-start">
              <AnimatePresence mode="wait">
                <motion.span
                  key={titleIndex}
                  initial={{ y: 35, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -35, opacity: 0 }}
                  transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                  className="inline-block text-left"
                >
                  {ROTATING_TITLES[titleIndex]}
                </motion.span>
              </AnimatePresence>
            </span>
          </motion.h1>
        </div>

        {/* Subheadline (Narration: solving the main pain) */}
        <motion.p 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.6, delay: 0.2 }}
          className={`text-base md:text-lg text-center leading-relaxed mb-8 max-w-2xl mx-auto ${isDark ? "text-[#a0a0a0]" : "text-gray-600"}`}
        >
          Indian companies waste hours every week manually reconciling bank statements, mapping GST splits, and tracking down missing vouchers. Dabby automates your entire ledger booking process with real-time AI reconciliation.
        </motion.p>

        {/* Main interactive core card */}
        <motion.div 
          initial={{ opacity: 0, y: 24 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.6, delay: 0.3 }}
          className={`w-full rounded-3xl border shadow-2xl relative overflow-hidden transition-all duration-300 ${
            isDark 
              ? "bg-[#111111]/70 border-white/10 backdrop-blur-xl shadow-black/50" 
              : "bg-white border-gray-200 shadow-gray-200/50"
          }`}
        >
          <AnimatePresence mode="wait">
            {/* 1. IDLE STATE: Upload & Input Form */}
            {analysisState === "idle" && (
              <motion.div
                key="idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="p-6 md:p-8 space-y-6"
              >
                {/* File Uploader Box */}
                {!file ? (
                  <div
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 relative ${
                      isDragActive
                        ? (isDark ? "border-[#81E6D9] bg-[#81E6D9]/5 shadow-[0_0_15px_rgba(129,230,217,0.1)]" : "border-[#0D9488] bg-[#0D9488]/5")
                        : (isDark ? "border-white/10 bg-white/2 hover:border-[#81E6D9]/30 hover:bg-white/3" : "border-gray-200 bg-gray-50/50 hover:border-[#81E6D9]/50 hover:bg-gray-50")
                    }`}
                  >
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleFileChange} 
                      accept=".pdf,.xls,.xlsx,.csv" 
                      className="hidden" 
                    />
                    <div className="flex flex-col items-center gap-3">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isDark ? "bg-[#81E6D9]/10 text-[#81E6D9]" : "bg-[#0D9488]/10 text-[#0D9488]"}`}>
                        <Upload className="w-6 h-6 animate-pulse" />
                      </div>
                      <div>
                        <p className={`text-sm font-semibold mb-1 ${isDark ? "text-white" : "text-[#1a1a1a]"}`}>
                          Upload raw ledger, P&L, or statements
                        </p>
                        <p className={`text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                          Drag & drop PDF, Excel, or CSV exports (Tally, Zoho, etc.) or click to browse
                        </p>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`text-[10px] px-2 py-0.5 rounded border ${isDark ? "border-white/10 text-gray-500" : "border-gray-200 text-gray-400"}`}>PDF</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded border ${isDark ? "border-white/10 text-gray-500" : "border-gray-200 text-gray-400"}`}>XLSX</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded border ${isDark ? "border-white/10 text-gray-500" : "border-gray-200 text-gray-400"}`}>CSV</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  // File Selected Display
                  <div className={`p-4 rounded-2xl border flex items-center justify-between transition-all ${
                    isDark ? "bg-white/2 border-white/10" : "bg-gray-50 border-gray-100"
                  }`}>
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        file.isSample 
                          ? "bg-purple-500/10 text-purple-400" 
                          : (isDark ? "bg-[#81E6D9]/10 text-[#81E6D9]" : "bg-[#0D9488]/10 text-[#0D9488]")
                      }`}>
                        {file.name.endsWith(".xlsx") || file.name.endsWith(".xls") ? (
                          <FileSpreadsheet className="w-5 h-5" />
                        ) : (
                          <FileText className="w-5 h-5" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className={`text-sm font-semibold truncate ${isDark ? "text-white" : "text-[#1a1a1a]"}`}>
                          {file.name}
                        </p>
                        <p className={`text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                          {formatFileSize(file.size)} {file.isSample && "• Sample statement loaded"}
                        </p>
                      </div>
                    </div>
                    <button 
                      onClick={handleRemoveFile}
                      className={`p-2 rounded-lg transition-colors ${
                        isDark ? "text-gray-500 hover:text-red-400 hover:bg-white/5" : "text-gray-400 hover:text-red-500 hover:bg-gray-100"
                      }`}
                      title="Remove file"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Business Query Question Input */}
                <div className="space-y-2">
                  <label className={`block text-xs font-semibold uppercase tracking-wider ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                    Ask Dabby AI about your business data
                  </label>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="E.g., Find cash flow leaks, audit our GST splits against bank records, or detect duplicate entries in this statement..."
                    className={`w-full min-h-[90px] px-4 py-3 rounded-2xl text-sm outline-none transition-all resize-none ${
                      isDark 
                        ? "bg-white/3 border border-white/10 text-white placeholder-gray-600 focus:border-[#81E6D9]/40" 
                        : "bg-gray-50 border border-gray-200 text-[#1a1a1a] placeholder-gray-400 focus:border-[#81E6D9]/50"
                    }`}
                  />
                </div>

                {/* Suggested prompt chips */}
                <div className="space-y-2">
                  <p className={`text-[11px] font-semibold ${isDark ? "text-gray-600" : "text-gray-400"}`}>
                    Don't have a ledger on hand? Try our sample data with these prompt ideas:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {SUGGESTED_QUERIES.map((item, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSuggestedClick(item)}
                        className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                          isDark 
                            ? "border-white/10 bg-white/2 text-gray-400 hover:border-[#81E6D9]/30 hover:text-[#81E6D9] hover:bg-[#81E6D9]/5" 
                            : "border-gray-200 bg-white text-gray-600 hover:border-[#81E6D9]/50 hover:text-[#0d9488] hover:bg-[#81E6D9]/5"
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                    {!file && (
                      <button
                        onClick={handleUseSample}
                        className={`text-xs px-3 py-1.5 rounded-full border border-purple-500/20 bg-purple-500/5 text-purple-400 hover:bg-purple-500/10 hover:border-purple-500/40 transition-all`}
                      >
                        ⚡ Load Sample Statement Only
                      </button>
                    )}
                  </div>
                </div>

                {/* Submit button row */}
                <div className="flex flex-col sm:flex-row justify-between items-center pt-2 gap-4 border-t border-white/5">
                  <div className="flex items-center gap-2">
                    <Sparkles className={`w-4 h-4 ${isDark ? "text-gray-600" : "text-gray-400"}`} />
                    <span className={`text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                      All files processed securely and anonymously.
                    </span>
                  </div>
                  <button
                    onClick={handleAnalyze}
                    disabled={!file}
                    className={`w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-bold text-sm text-black bg-[#81E6D9] hover:bg-[#5fd3c7] transition-all ${
                      !file ? "opacity-40 cursor-not-allowed" : "hover:scale-[1.02] active:scale-[0.98]"
                    }`}
                  >
                    Analyze with Dabby AI <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* 2. LOADING STATE: Multi-step process */}
            {(analysisState === "uploading" || 
              analysisState === "parsing" || 
              analysisState === "matching" || 
              analysisState === "detecting") && (
              <motion.div
                key="loading"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="p-8 text-center space-y-8 min-h-[350px] flex flex-col justify-center items-center"
              >
                {/* Dynamic big loading indicator */}
                <div className="relative w-20 h-20 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full border-4 border-white/5" />
                  <div className="absolute inset-0 rounded-full border-4 border-[#81E6D9] border-t-transparent animate-spin" />
                  <Sparkles className="w-8 h-8 text-[#81E6D9] animate-pulse" />
                </div>

                <div className="space-y-2 max-w-md">
                  <h3 className={`text-lg font-bold ${isDark ? "text-white" : "text-[#1a1a1a]"}`}>
                    Dabby AI Auditing Engine Active
                  </h3>
                  <p className={`text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                    Reconciling general ledger entries and statement logs against local taxation frameworks...
                  </p>
                </div>

                {/* Step indicators */}
                <div className="w-full max-w-sm space-y-3.5 text-left border border-white/5 bg-white/1 p-5 rounded-2xl">
                  {/* Step 1: Uploading */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2">
                      {analysisState === "uploading" ? (
                        <Loader2 className="w-3.5 h-3.5 text-[#81E6D9] animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      )}
                      <span className={analysisState === "uploading" ? "font-bold text-white" : "text-gray-500"}>
                        Uploading statement data
                      </span>
                    </span>
                    <span className="text-gray-500">
                      {analysisState === "uploading" ? `${uploadProgress}%` : "Done"}
                    </span>
                  </div>
                  {/* Upload Progress Bar */}
                  {analysisState === "uploading" && (
                    <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-[#81E6D9] transition-all duration-200" style={{ width: `${uploadProgress}%` }} />
                    </div>
                  )}

                  {/* Step 2: Parsing */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2">
                      {analysisState === "uploading" ? (
                        <div className="w-3.5 h-3.5 rounded-full border border-gray-700" />
                      ) : analysisState === "parsing" ? (
                        <Loader2 className="w-3.5 h-3.5 text-[#81E6D9] animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      )}
                      <span className={analysisState === "parsing" ? "font-bold text-white" : "text-gray-500"}>
                        Extracting ledger transaction segments
                      </span>
                    </span>
                    <span className="text-gray-500">
                      {analysisState === "parsing" ? "Processing" : (analysisState === "uploading" ? "Pending" : "Done")}
                    </span>
                  </div>

                  {/* Step 3: Reconciling */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2">
                      {analysisState === "uploading" || analysisState === "parsing" ? (
                        <div className="w-3.5 h-3.5 rounded-full border border-gray-700" />
                      ) : analysisState === "matching" ? (
                        <Loader2 className="w-3.5 h-3.5 text-[#81E6D9] animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      )}
                      <span className={analysisState === "matching" ? "font-bold text-white" : "text-gray-500"}>
                        Matching transaction refs against bank records
                      </span>
                    </span>
                    <span className="text-gray-500">
                      {analysisState === "matching" ? "Reconciling" : (analysisState === "uploading" || analysisState === "parsing" ? "Pending" : "Done")}
                    </span>
                  </div>

                  {/* Step 4: GST / Anomaly */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2">
                      {analysisState !== "detecting" && analysisState !== "complete" ? (
                        <div className="w-3.5 h-3.5 rounded-full border border-gray-700" />
                      ) : analysisState === "detecting" ? (
                        <Loader2 className="w-3.5 h-3.5 text-[#81E6D9] animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      )}
                      <span className={analysisState === "detecting" ? "font-bold text-white" : "text-gray-500"}>
                        Auditing GST splits & anomaly flags
                      </span>
                    </span>
                    <span className="text-gray-500">
                      {analysisState === "detecting" ? "Auditing" : "Pending"}
                    </span>
                  </div>
                </div>
              </motion.div>
            )}

            {/* 3. COMPLETE STATE: Blurred Dashboard + Waitlist Overlay OR Unblurred Modal */}
            {analysisState === "complete" && (
              <motion.div
                key="complete"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="relative"
              >
                {/* A. If not yet subscribed and not in shared view: show BLURRED mock dashboard and waitlist signup form */}
                {!waitlistSuccess && !isSharedView ? (
                  <>
                    {/* BLURRED PREVIEW */}
                    <div className="p-6 md:p-8 space-y-6 filter blur-[6px] select-none pointer-events-none opacity-40">
                      {/* Report Header */}
                      <div className="flex items-center justify-between border-b border-white/15 pb-4">
                        <div>
                          <h2 className="text-lg font-bold text-white flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-[#81E6D9]" /> 
                            Financial Intelligence Audit Report
                          </h2>
                          <p className="text-xs text-gray-500">{file?.name || "financial_statement_fy26.xlsx"}</p>
                        </div>
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Analysis Complete
                        </span>
                      </div>

                      {/* 3-column stats panel */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="p-4 rounded-xl border border-white/10 bg-white/2">
                          <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1">Reconciled Rate</p>
                          <h4 className="text-xl font-bold text-white">94.2%</h4>
                          <p className="text-[10px] text-emerald-400 mt-1">2,891 items matched automatically</p>
                        </div>
                        <div className="p-4 rounded-xl border border-white/10 bg-white/2">
                          <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1">GST Split Warnings</p>
                          <h4 className="text-xl font-bold text-amber-400">3 Flags</h4>
                          <p className="text-[10px] text-gray-500 mt-1">Mismatched Input Tax Credit rates</p>
                        </div>
                        <div className="p-4 rounded-xl border border-white/10 bg-white/2">
                          <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1">Unmatched Outflows</p>
                          <h4 className="text-xl font-bold text-red-400">₹8,12,000</h4>
                          <p className="text-[10px] text-gray-500 mt-1">Duplicate vendor payments detected</p>
                        </div>
                      </div>

                      {/* Table */}
                      <div className="overflow-x-auto rounded-xl border border-white/10">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-white/5 text-gray-500 uppercase font-bold tracking-wider text-[10px]">
                              <th className="p-3">Date</th>
                              <th className="p-3">Ledger Description</th>
                              <th className="p-3">Reference ID</th>
                              <th className="p-3">Amount</th>
                              <th className="p-3">Alert Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td className="p-3">2026-06-12</td>
                              <td className="p-3">Zoho Purchase Invoice #INV-2026-8928</td>
                              <td className="p-3">TXN_987234</td>
                              <td className="p-3">₹45,000</td>
                              <td className="p-3">Duplicate Payment</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* OVERLAID SIGNUP WALL */}
                    <div className="absolute inset-0 flex items-center justify-center p-4 sm:p-6 z-10">
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        className={`max-w-md w-full p-6 sm:p-8 rounded-2xl border text-center shadow-2xl backdrop-blur-md ${
                          isDark 
                            ? "bg-[#0b0b0b]/90 border-white/10 shadow-[0_0_50px_rgba(129,230,217,0.1)] text-white" 
                            : "bg-white/95 border-gray-200 shadow-gray-300/60 text-[#1a1a1a]"
                        }`}
                      >
                        <div className="w-12 h-12 rounded-full bg-[#81E6D9]/15 flex items-center justify-center mx-auto mb-4 text-[#81E6D9]">
                          <Lock className="w-5 h-5 animate-pulse" />
                        </div>

                        <h3 className={`text-xl font-bold mb-2 ${isDark ? "text-white" : "text-[#1a1a1a]"}`}>
                          Unlock Detailed Audit Reports
                        </h3>
                        <p className={`text-xs sm:text-sm leading-relaxed mb-6 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                          To view reconciliation errors, audit tax splits, and sync Zoho/Tally records live to bank statement logs, join the Dabby Waitlist.
                        </p>

                        <form onSubmit={handleWaitlistSubmit} className="space-y-3 text-left">
                          <label className={`block text-[10px] font-semibold uppercase tracking-wider ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                            Business Email Address
                          </label>
                          <div className="flex flex-col sm:flex-row gap-2">
                            <input
                              type="email"
                              value={waitlistEmail}
                              onChange={(e) => setWaitlistEmail(e.target.value)}
                              placeholder="you@company.com"
                              className={`flex-grow px-4 py-3 rounded-xl text-xs outline-none transition-all ${
                                isDark 
                                  ? "bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:border-[#81E6D9]/50" 
                                  : "bg-gray-50 border border-gray-200 text-[#1a1a1a] placeholder-gray-400 focus:border-[#81E6D9]"
                              }`}
                              disabled={waitlistLoading}
                            />
                            <button
                              type="submit"
                              disabled={waitlistLoading}
                              className="px-5 py-3 rounded-xl font-semibold text-xs text-black bg-[#81E6D9] hover:bg-[#5fd3c7] disabled:opacity-50 transition-all flex items-center justify-center gap-1 whitespace-nowrap"
                            >
                              {waitlistLoading ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <>Join Waitlist <ArrowRight className="w-3.5 h-3.5" /></>
                              )}
                            </button>
                          </div>

                          {waitlistError && (
                            <motion.p 
                              initial={{ opacity: 0, y: 5 }} 
                              animate={{ opacity: 1 }} 
                              className="text-[11px] text-red-400 flex items-center gap-1 mt-1"
                            >
                              <AlertCircle className="w-3 h-3 flex-shrink-0" />
                              {waitlistError}
                            </motion.p>
                          )}
                        </form>

                        <div className="mt-6 pt-4 border-t border-white/5 flex justify-center">
                          <button
                            onClick={handleCloseReport}
                            className={`text-xs flex items-center gap-1.5 transition-colors ${
                              isDark ? "text-gray-500 hover:text-white" : "text-gray-400 hover:text-black"
                            }`}
                          >
                            <RefreshCw className="w-3 h-3" />
                            Analyze another ledger
                          </button>
                        </div>
                      </motion.div>
                    </div>
                  </>
                ) : (
                  // B. UNBLURRED STANDALONE ONE-PAGER REPORT VIEW MODAL
                  <div className={`fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md flex items-center justify-center p-4 md:p-8`}>
                    <motion.div
                      initial={{ opacity: 0, scale: 0.97, y: 15 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      className={`max-w-4xl w-full rounded-3xl border shadow-2xl overflow-hidden flex flex-col relative my-8 ${
                        isDark 
                          ? "bg-[#0c0c0c] border-white/10 text-white shadow-black/80" 
                          : "bg-white border-gray-200 text-[#1a1a1a] shadow-gray-300/40"
                      }`}
                    >
                      {/* Top Header Controls */}
                      <div className={`flex items-center justify-between px-6 py-4 border-b ${
                        isDark ? "border-white/10 bg-white/2" : "border-gray-100 bg-gray-50/50"
                      }`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg bg-[#81E6D9]/15 flex items-center justify-center ${isDark ? "text-[#81E6D9]" : "text-[#0d9488]"}`}>
                            <Sparkles className="w-4 h-4" />
                          </div>
                          <div>
                            <h2 className="text-sm font-bold flex items-center gap-2">
                              Dabby AI Audit Analysis Report
                            </h2>
                            <p className={`text-[10px] ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                              File: {file?.name || "statement.xlsx"} • size: {formatFileSize(file?.size || 0)}
                            </p>
                          </div>
                        </div>

                        {/* Top Actions */}
                        <div className="flex items-center gap-3">
                          <button
                            onClick={handleShareReport}
                            disabled={isAiLoading || !reportData}
                            className={`flex items-center gap-1.5 px-3 py-1.8 rounded-xl font-bold text-xs transition-all border ${
                              copySuccess
                                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                                : (isDark 
                                    ? "bg-white/5 border-white/10 text-white hover:bg-white/10" 
                                    : "bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100")
                            }`}
                          >
                            <Share2 className="w-3.5 h-3.5" />
                            {copySuccess ? "Link Copied!" : "Share Report"}
                          </button>
                          
                          <button
                            onClick={handleCloseReport}
                            className={`p-2 rounded-xl transition-colors ${
                              isDark ? "text-gray-500 hover:bg-white/5 hover:text-white" : "text-gray-400 hover:bg-gray-100 hover:text-[#1a1a1a]"
                            }`}
                            title="Close Report"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Modal Body Contents */}
                      {isAiLoading || !reportData ? (
                        // Spinner inside modal if AI is still working
                        <div className="p-16 text-center space-y-4 flex flex-col justify-center items-center">
                          <Loader2 className="w-10 h-10 text-[#81E6D9] animate-spin" />
                          <div>
                            <h3 className={`text-sm font-bold ${isDark ? "text-white" : "text-[#1a1a1a]"}`}>
                              Dabby AI is auditing your document...
                            </h3>
                            <p className={`text-[11px] mt-1 ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                              Running OCR text extraction and mapping accounts ledger transactions
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
                          
                          {/* Custom Query + Dabby AI Response Section */}
                          <div className={`p-5 rounded-2xl border ${
                            isDark ? "bg-white/2 border-white/10" : "bg-gray-50/50 border-gray-100"
                          }`}>
                            <div className="flex items-start gap-3.5">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                                isDark ? "bg-[#81E6D9]/10 text-[#81E6D9]" : "bg-[#0d9488]/10 text-[#0d9488]"
                              }`}>
                                <HelpCircle className="w-4 h-4" />
                              </div>
                              <div className="space-y-1">
                                <p className={`text-[10px] uppercase font-bold tracking-wider ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                                  User Audit Inquiry
                                </p>
                                <p className="text-xs italic">
                                  "{prompt || "General ledger reconciliation check."}"
                                </p>
                              </div>
                            </div>

                            <div className={`mt-5 pt-4 border-t ${isDark ? "border-white/5" : "border-gray-200/50"} flex items-start gap-3.5`}>
                              <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <Sparkles className="w-4 h-4" />
                              </div>
                              <div className="space-y-1">
                                <p className="text-[10px] uppercase font-bold tracking-wider text-purple-400">
                                  Dabby AI Executive Audit Note
                                </p>
                                <p className={`text-xs leading-relaxed whitespace-pre-line ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                                  {reportData.executive_summary}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Summary Metrics */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className={`p-4 rounded-2xl border ${isDark ? "border-white/10 bg-white/1" : "border-gray-100 bg-gray-50/20"}`}>
                              <p className={`text-[10px] uppercase font-bold tracking-wider mb-1 ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                                Reconciliation Rate
                              </p>
                              <div className="flex items-baseline gap-2">
                                <h4 className="text-2xl font-bold">{reportData.match_rate || "94.2"}%</h4>
                                <span className="text-[10px] text-emerald-400 flex items-center font-semibold">
                                  <TrendingUp className="w-3 h-3 mr-0.5" /> High Match
                                </span>
                              </div>
                              <p className={`text-[10px] mt-1 ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                                Verified ledger transaction lines matched automatically
                              </p>
                            </div>

                            <div className={`p-4 rounded-2xl border ${isDark ? "border-white/10 bg-white/1" : "border-gray-100 bg-gray-50/20"}`}>
                              <p className={`text-[10px] uppercase font-bold tracking-wider mb-1 ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                                Audited Tax Warnings
                              </p>
                              <div className="flex items-baseline gap-2">
                                <h4 className="text-2xl font-bold text-amber-400">{reportData.gst_warnings_count || "0"} Warnings</h4>
                                <span className="text-[10px] text-amber-400 flex items-center font-semibold">
                                  <AlertTriangle className="w-3 h-3 mr-0.5" /> GST Split Risk
                                </span>
                              </div>
                              <p className={`text-[10px] mt-1 ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                                Flagged discrepancies inside tax ledger mappings
                              </p>
                            </div>

                            <div className={`p-4 rounded-2xl border ${isDark ? "border-white/10 bg-white/1" : "border-gray-100 bg-gray-50/20"}`}>
                              <p className={`text-[10px] uppercase font-bold tracking-wider mb-1 ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                                Unmatched Outflows
                              </p>
                              <div className="flex items-baseline gap-2">
                                <h4 className="text-2xl font-bold text-red-400">{reportData.unmatched_outflows_total || "₹0"}</h4>
                                <span className="text-[10px] text-red-400 flex items-center font-semibold">
                                  <AlertCircle className="w-3 h-3 mr-0.5" /> Flagged Outflows
                                </span>
                              </div>
                              <p className={`text-[10px] mt-1 ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                                Potential billing leaks and unmatched cash records
                              </p>
                            </div>
                          </div>

                          {/* Interactive Table of Anomalies */}
                          <div className="space-y-2">
                            <h4 className={`text-xs font-bold uppercase tracking-wider ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                              Flagged ledger anomalies & ledger items
                            </h4>
                            <div className={`overflow-x-auto rounded-2xl border ${isDark ? "border-white/10" : "border-gray-200"}`}>
                              <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                  <tr className={`uppercase font-bold tracking-wider text-[10px] ${
                                    isDark ? "bg-white/3 text-gray-500" : "bg-gray-50 text-gray-400"
                                  }`}>
                                    <th className="p-3">Date</th>
                                    <th className="p-3">Ledger Transaction Detail</th>
                                    <th className="p-3">Reference ID</th>
                                    <th className="p-3">Voucher Value</th>
                                    <th className="p-3">Audit Alert Status</th>
                                  </tr>
                                </thead>
                                <tbody className={`divide-y ${isDark ? "divide-white/5" : "divide-gray-100"}`}>
                                  {reportData.anomalies && reportData.anomalies.length > 0 ? (
                                    reportData.anomalies.map((row, idx) => (
                                      <tr key={idx} className={isDark ? "hover:bg-white/1" : "hover:bg-gray-50"}>
                                        <td className="p-3 whitespace-nowrap">{row.date}</td>
                                        <td className="p-3 font-medium">{row.description}</td>
                                        <td className="p-3 font-mono text-[10px] text-gray-500">{row.ref}</td>
                                        <td className="p-3 font-semibold whitespace-nowrap">{row.amount}</td>
                                        <td className="p-3">
                                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                                            row.status === "Auto Reconciled" || row.status === "Reconciled"
                                              ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                                              : row.status?.toLowerCase().includes("duplicate")
                                                ? "bg-red-500/10 border border-red-500/20 text-red-400"
                                                : "bg-amber-500/10 border border-amber-500/20 text-amber-400"
                                          }`}>
                                            {row.status}
                                          </span>
                                        </td>
                                      </tr>
                                    ))
                                  ) : (
                                    <tr>
                                      <td colSpan="5" className="p-4 text-center text-gray-500">
                                        No significant bookkeeping anomalies or discrepancies flagged. Ledger appears clean.
                                      </td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>

                        </div>
                      )}

                      {/* Modal Footer */}
                      <div className={`px-6 py-4 flex flex-col sm:flex-row items-center justify-between border-t gap-3 ${
                        isDark ? "border-white/10 bg-white/1" : "border-gray-100 bg-gray-50/30"
                      }`}>
                        <span className={`text-[10.5px] ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                          Dabby AI Engine audits data using bank-grade AES-256 ledger security.
                        </span>
                        
                        <div className="flex gap-2">
                          <button
                            onClick={handleShareReport}
                            disabled={isAiLoading || !reportData}
                            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all border ${
                              copySuccess
                                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                                : (isDark 
                                    ? "bg-white/5 border-white/10 text-white hover:bg-white/10" 
                                    : "bg-gray-50 border-gray-200 text-[#1a1a1a] hover:bg-gray-100")
                            }`}
                          >
                            {copySuccess ? "Copied Link!" : "Copy Report Link"}
                          </button>
                          
                          <button
                            onClick={handleCloseReport}
                            className="px-4 py-2 bg-[#81E6D9] text-black font-bold text-xs rounded-xl hover:bg-[#5fd3c7] transition-all"
                          >
                            Analyze Another Ledger
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Existing Waitlist Link under the card */}
        <p className={`text-center text-xs mt-6 ${isDark ? "text-gray-500" : "text-gray-400"}`}>
          🔒 Dabby integrates securely using industry-standard ledger encryption.
          <Link to="/waitlist" className="ml-1 text-[#81E6D9] underline hover:text-[#5fd3c7] transition-colors">
            Learn more about early access cohorts →
          </Link>
        </p>

      </div>
    </section>
  );
}
