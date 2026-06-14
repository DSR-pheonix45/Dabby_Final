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
  Percent
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

  // Waitlist Embedded Form states
  const [waitlistEmail, setWaitlistEmail] = useState("");
  const [waitlistLoading, setWaitlistLoading] = useState(false);
  const [waitlistSuccess, setWaitlistSuccess] = useState(false);
  const [waitlistError, setWaitlistError] = useState("");

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
        isSample: false
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
        isSample: false
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

  // Trigger analysis simulation
  const handleAnalyze = () => {
    if (!file) {
      alert("Please upload a file or click 'Use sample statement' first.");
      return;
    }
    
    setAnalysisState("uploading");
    setUploadProgress(0);

    // Simulate progress updates for uploading
    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + 20;
      });
    }, 200);

    // Timeline simulation
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

  // Reset uploader
  const handleReset = () => {
    setFile(null);
    setPrompt("");
    setAnalysisState("idle");
    setWaitlistEmail("");
    setWaitlistSuccess(false);
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
            <span className="relative inline-flex overflow-hidden align-bottom text-[#81E6D9] min-w-[280px] sm:min-w-[480px] justify-center sm:justify-start">
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

            {/* 3. COMPLETE STATE: Blurred Report & Waitlist Overlay */}
            {analysisState === "complete" && (
              <motion.div
                key="complete"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="relative"
              >
                {/* BLURRED MOCK DASHBOARD PREVIEW */}
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
                      <h4 className="text-xl font-bold text-amber-400">3 Audited Flags</h4>
                      <p className="text-[10px] text-gray-500 mt-1">Mismatched Input Tax Credit rates</p>
                    </div>
                    <div className="p-4 rounded-xl border border-white/10 bg-white/2">
                      <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1">Unmatched Outflows</p>
                      <h4 className="text-xl font-bold text-red-400">₹8,12,000</h4>
                      <p className="text-[10px] text-gray-500 mt-1">Duplicate vendor payments detected</p>
                    </div>
                  </div>

                  {/* Mock Table */}
                  <div className="overflow-x-auto rounded-xl border border-white/10">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-white/5 text-gray-500 uppercase font-bold tracking-wider text-[10px]">
                          <th className="p-3">Date</th>
                          <th className="p-3">Ledger Description</th>
                          <th className="p-3">Reference ID</th>
                          <th className="p-3">Amount</th>
                          <th className="p-3">Audit Alert Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        <tr>
                          <td className="p-3">2026-06-12</td>
                          <td className="p-3">Zoho Invoice #INV-2026-8928</td>
                          <td className="p-3 font-mono">TXN_987234</td>
                          <td className="p-3">₹45,000</td>
                          <td className="p-3"><span className="px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/25">Duplicate Payment</span></td>
                        </tr>
                        <tr>
                          <td className="p-3">2026-06-08</td>
                          <td className="p-3">HDFC Bank Transfer Outflow</td>
                          <td className="p-3 font-mono">TXN_002842</td>
                          <td className="p-3">₹1,20,000</td>
                          <td className="p-3"><span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/25">Missing Voucher</span></td>
                        </tr>
                        <tr>
                          <td className="p-3">2026-06-02</td>
                          <td className="p-3">Zoho Purchase Split - DigitalOcean Inc</td>
                          <td className="p-3 font-mono">TXN_873198</td>
                          <td className="p-3">₹12,900</td>
                          <td className="p-3"><span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/25">GST Split Mismatch</span></td>
                        </tr>
                        <tr>
                          <td className="p-3">2026-05-28</td>
                          <td className="p-3">Tally General Ledger Adjustment</td>
                          <td className="p-3 font-mono">TXN_287419</td>
                          <td className="p-3">₹89,000</td>
                          <td className="p-3"><span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">Auto Reconciled</span></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* OVERLAID PREMIUM WAITLIST CARD */}
                <div className="absolute inset-0 flex items-center justify-center p-4 sm:p-6 z-10">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
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

                    <AnimatePresence mode="wait">
                      {!waitlistSuccess ? (
                        <motion.form 
                          key="form" 
                          onSubmit={handleWaitlistSubmit} 
                          className="space-y-3 text-left"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                        >
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
                        </motion.form>
                      ) : (
                        <motion.div
                          key="success"
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="space-y-4"
                        >
                          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 border border-emerald-500/25 text-emerald-400">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Saved! You are on the list.
                          </div>
                          <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                            We will send your invite credentials to <strong>{waitlistEmail || "your email"}</strong> as soon as your cohort opens.
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Reset Button to try another file */}
                    <div className="mt-6 pt-4 border-t border-white/5 flex justify-center">
                      <button
                        onClick={handleReset}
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
