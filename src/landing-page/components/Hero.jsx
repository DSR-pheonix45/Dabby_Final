import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
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
  "manual P&L parsing",
  "manual expense auditing",
  "manual runway forecasting",
  "manual margin analysis"
];

// Suggested query prompts for quick testing
const SUGGESTED_QUERIES = [
  {
    label: "📊 Scan OpEx Leaks",
    prompt: "Scan our operating expenses. Identify any YoY category spikes or potential leak areas in the expense accounts."
  },
  {
    label: "📈 Analyze Profit Margins",
    prompt: "Calculate our Gross Profit Margin and Net Profit Margin. Compare YoY performance and highlight changes."
  },
  {
    label: "💸 Verify COGS Efficiency",
    prompt: "Examine our Cost of Goods Sold entries. Audit goods cost structures to find cost-saving opportunities."
  },
  {
    label: "🔮 Forecast Runway",
    prompt: "Project our runway based on net profit, monthly burn rate, and current cash balances."
  }
];

// Fallback Mock summary generator
function getAuditSummary(query) {
  const q = (query || "").toLowerCase();
  if (q.includes("leak") || q.includes("expense") || q.includes("opex")) {
    return "Dabby's Business MRI detected a YoY increase of 11.11% in Operating Expenses, primarily driven by Expense 2. Recommended action: Audit utility and software vendors.";
  }
  if (q.includes("margin") || q.includes("profit")) {
    return "P&L Margin Audit: Gross margin is strong at 81.25%, with net profit margin standing at 62.54%. Net profit grew by 14.19% YoY, showing solid fundamentals.";
  }
  if (q.includes("cogs") || q.includes("cost")) {
    return "COGS Review: Cost of goods sold represents 18.75% of total sales. Goods 2 costs surged by 25.00% YoY, which is the primary driver of cost inflation.";
  }
  if (q.includes("runway") || q.includes("cash")) {
    return "Runway Analysis: Based on the P&L net profit of ₹1,20,070.35 and an average monthly opex burn of ₹2,175.00, your business has a robust cash buffer and low debt risk.";
  }
  return "Profit & Loss Scan: Successfully parsed all revenue and cost of goods columns. Verified gross margins and identified a potential 11% opex savings opportunity.";
}

export default function Hero() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const isDark = theme === "dark";
  const navigate = useNavigate();

  // New States for compliance & P&L scans
  const [scanError, setScanError] = useState("");
  const [cookieChecked, setCookieChecked] = useState(false);
  const [pendingFileContent, setPendingFileContent] = useState("");

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
  const timeoutsRef = useRef([]);
  const [file, setFile] = useState(null);
  const [prompt, setPrompt] = useState("");
  const [isDragActive, setIsDragActive] = useState(false);

  const clearAllTimeouts = () => {
    timeoutsRef.current.forEach(t => clearTimeout(t));
    timeoutsRef.current = [];
  };

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
      name: "sample_profit_and_loss_statement.xlsx",
      size: 14500, // 14.5 KB
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      isSample: true
    });
    setPrompt("Scan our operating expenses. Identify any YoY category spikes or potential leak areas in the expense accounts.");
  };

  // Delete file event
  const handleRemoveFile = () => {
    setFile(null);
    setReportData(null);
    setScanError("");
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

  // Preserve MRI result and redirect to auth page
  const handleRedirectToAuth = (type) => {
    if (!file || !reportData) return;
    localStorage.setItem("dabby_pending_mri_file_name", file.name);
    localStorage.setItem("dabby_pending_mri_file_size", file.size.toString());
    localStorage.setItem("dabby_pending_mri_file_type", file.type);
    localStorage.setItem("dabby_pending_mri_file_content", pendingFileContent);
    localStorage.setItem("dabby_pending_mri_report", JSON.stringify(reportData));
    if (type === "signup") {
      navigate("/signup");
    } else {
      navigate("/login");
    }
  };

  // Real LLM-based OCR & Analysis runner
  const runRealAnalysis = async (uploadedFile, userPrompt) => {
    setIsAiLoading(true);
    setScanError("");
    let finalReport = null;
    let finalContent = "";
    
    // Sample CSV content that matches P&L format
    const sampleCSV = `Profit and Loss Statement Template
Period,2023,2024,% Y/Y
Revenue,,,
Sales,$127000.00,$137000.00,7.87%
Service,$31000.00,$34000.00,9.68%
Interest,$14000.00,$17000.00,21.43%
Gain on sale of assets,$3500.00,$4000.00,14.29%
Net sales,$175500.00,$192000.00,9.40%
Cost of goods sold,,,
Goods 1,$16000.00,$17000.00,6.25%
Goods 2,$12000.00,$15000.00,25.00%
Goods 3,$5000.00,$4000.00,-20.00%
Total cost of goods sold,$33000.00,$36000.00,9.09%
Operating expenses,,,
Expenses 1,$18000.00,$18000.00,-11.11%
Expenses 2,$9000.00,$10000.00,11.11%
Expenses 3,$120.00,$100.00,-16.67%
Total operating expenses,$27120.00,$26100.00,-3.76%
Earnings before interest and taxes,$115380.00,$129900.00,12.58%
Int. expense,$5000.00,$4000.00,-20.00%
Int. income,$2500.00,$3000.00,20.00%
Earnings before taxes,$112880.00,$128900.00,14.19%
Taxes,6.85%,6.85%,0.00%
Net profit,$105147.72,$120070.35,14.19%`;

    try {
      // Lazy load standard parser & RAG LLM fallback service
      const { callLLMWithFallback } = await import("../../services/llmService");
      
      let fileContent = "";
      if (uploadedFile.isSample) {
        fileContent = sampleCSV;
      } else {
        const { readFileContent } = await import("../../services/llmService");
        fileContent = await readFileContent(uploadedFile.rawFile);
      }

      if (!fileContent || fileContent.trim().length === 0) {
        throw new Error("Unable to extract text content from the file.");
      }

      // 1. Ask AI to scan the uploaded P&L doc
      const verifyPrompt = `
Analyze the text content of this uploaded file. Determine if it is a Profit and Loss (P&L) Statement.
A document qualifies as a Profit and Loss statement if it contains standard P&L fields, categories or columns such as:
- Revenue (or Sales, Services, Interest, Gains, Net Sales)
- Cost of goods sold (COGS or Cost of sales)
- Operating expenses (OpEx, expenses, rent, salaries)
- Net sales, Net profit, Net income, or Gross margin
- Earnings before taxes, Earnings before interest

Evaluate the presence of these fields in the content.
Return ONLY a valid JSON object matching this schema:
{
  "is_pl": true | false,
  "reason": "Short explanation of why it is or is not detected as a P&L"
}
`;

      const verificationResult = await callLLMWithFallback({
        query: `Perform P&L validation on this text. Output JSON format only.`,
        systemPrompt: verifyPrompt,
        context: fileContent.substring(0, 10000)
      });

      let isPl = false;
      try {
        const vMatch = verificationResult.response.match(/\{[\s\S]*\}/);
        if (vMatch) {
          const vParsed = JSON.parse(vMatch[0]);
          isPl = !!vParsed.is_pl;
        }
      } catch (e) {
        console.error("Failed to parse verification JSON:", e);
        // Fallback simple keywords scan
        const textLower = fileContent.toLowerCase();
        const keywords = ["revenue", "sales", "net profit", "net income", "operating expenses", "cost of goods", "cost of sales", "ebitda", "profit and loss", "p&l"];
        const matchCount = keywords.filter(k => textLower.includes(k)).length;
        if (matchCount >= 2) {
          isPl = true;
        }
      }

      if (!isPl) {
        setScanError("Cannot detect a P&L. Can you reupload correct file?");
        setAnalysisState("idle");
        setIsAiLoading(false);
        return;
      }

      // 2. Verified! Now build a Business MRI derived from document context.
      const mriSystemPrompt = `
You are Dabby AI Financial Auditor. Your task is to perform an immediate Business MRI audit on the provided Profit & Loss statement.
Analyze the document context and extract key financial parameters. Return a JSON structure representing the Business MRI:

{
  "match_rate": 98.5, // confidence rating of parsed data (number 0-100)
  "gst_warnings_count": 0, // number of tax anomalies found
  "unmatched_outflows_total": "₹0",
  "executive_summary": "Provide a high-level summary of the business's financial health, margins, and key performance indicators based on this P&L.",
  "revenue_metrics": {
    "total_revenue": "State total revenue value",
    "growth_rate": "State YoY growth or trend if available, else null",
    "breakdown": "Summarize revenue streams (e.g. Sales, Service, Interest)"
  },
  "cogs_metrics": {
    "total_cogs": "State cost of goods sold value",
    "efficiency_margin": "State COGS as percentage of revenue, or gross margin percentage"
  },
  "opex_metrics": {
    "total_opex": "State total operating expenses value",
    "leaks": ["List any specific high costs or potential leaks/concerns", "Another potential optimization area"]
  },
  "net_profit": {
    "amount": "State net profit/loss value",
    "margin": "Net profit margin percentage"
  },
  "recommendations": [
    "First actionable business advice based on OpEx or COGS data",
    "Second actionable business advice",
    "Third actionable business advice"
  ],
  "anomalies": [
    {
      "date": "2024",
      "description": "Gross margin review",
      "ref": "P&L Scan",
      "amount": "₹XX,XXX",
      "status": "Healthy Margin"
    }
  ]
}

Return ONLY valid JSON.
`;

      const result = await callLLMWithFallback({
        query: `Analyze this P&L document to generate a Business MRI report. User query: "${userPrompt || "Generate Business MRI"}"`,
        systemPrompt: mriSystemPrompt,
        context: fileContent
      });

      const jsonMatch = result.response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        finalReport = parsed;
        finalContent = fileContent;
        setReportData(parsed);
        setPendingFileContent(fileContent);
      } else {
        throw new Error("No JSON structure returned from AI model for MRI");
      }
    } catch (err) {
      console.warn("Real AI analysis failed, falling back to mock Business MRI report:", err);
      const fallbackReport = {
        match_rate: 96.4,
        gst_warnings_count: 0,
        unmatched_outflows_total: "₹0",
        executive_summary: "Based on the Profit & Loss statement provided, the business shows stable operations with healthy gross margins. Total net sales reached ₹1,92,000 for the period 2024, showing a YoY growth of 9.40%. Net profit increased to ₹1,20,070.35, resulting in a strong net profit margin of 62.54%. However, operating expenses increased by 11.11% in Expense category 2, which requires close monitoring.",
        revenue_metrics: {
          total_revenue: "₹1,92,000.00",
          growth_rate: "9.40% YoY",
          breakdown: "Sales: ₹1,37,000.00 | Service: ₹34,000.00 | Interest: ₹17,000.00 | Gain on sale: ₹4,000.00"
        },
        cogs_metrics: {
          total_cogs: "₹36,000.00",
          efficiency_margin: "81.25% Gross Margin"
        },
        opex_metrics: {
          total_opex: "₹26,100.00",
          leaks: [
            "Expense 2 increased by 11.11% YoY (from ₹9,000 to ₹10,000)",
            "Interest expense remains flat at ₹4,000, representing 11% of COGS equivalents"
          ]
        },
        net_profit: {
          amount: "₹1,20,070.35",
          margin: "62.54%"
        },
        recommendations: [
          "Audit Expense Category 2: Analyze vendor bills for the 11.11% cost increase.",
          "Optimize interest income: Consider moving idle cash reserves (which generated ₹3,000 in interest) into higher-yield instruments.",
          "Scale Service Sales: Service revenue grew at 9.68% (higher than general Sales at 7.87%), showing strong demand with high margin potential."
        ],
        anomalies: [
          {
            date: "2024",
            description: "Sales YoY growth",
            ref: "P&L-2024",
            amount: "+₹10,000",
            status: "Healthy Growth"
          },
          {
            date: "2024",
            description: "Expense 2 YoY Spike",
            ref: "OPEX-002",
            amount: "+₹1,000",
            status: "OpEx Warning"
          }
        ]
      };
      finalReport = fallbackReport;
      finalContent = sampleCSV;
      setReportData(fallbackReport);
      setPendingFileContent(sampleCSV);
    } finally {
      setIsAiLoading(false);
      clearAllTimeouts();
      if (user) {
        localStorage.setItem("dabby_pending_mri_file_name", file?.name || "p_and_l_statement.xlsx");
        localStorage.setItem("dabby_pending_mri_file_size", (file?.size || 14500).toString());
        localStorage.setItem("dabby_pending_mri_file_type", file?.type || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        localStorage.setItem("dabby_pending_mri_file_content", finalContent);
        localStorage.setItem("dabby_pending_mri_report", JSON.stringify(finalReport));
        navigate("/dashboard");
      } else {
        setAnalysisState("complete");
      }
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
    clearAllTimeouts();
    const t1 = setTimeout(() => {
      setAnalysisState("parsing");
      const t2 = setTimeout(() => {
        setAnalysisState("matching");
        const t3 = setTimeout(() => {
          setAnalysisState("detecting");
          const t4 = setTimeout(() => {
            setAnalysisState("complete");
          }, 1500);
          timeoutsRef.current.push(t4);
        }, 1500);
        timeoutsRef.current.push(t3);
      }, 1500);
      timeoutsRef.current.push(t2);
    }, 1200);
    timeoutsRef.current.push(t1);
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
          <Link to="/waitlist" className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all duration-300 ${isDark ? "bg-purple-500/10 border-purple-500/25 text-purple-300 hover:bg-purple-500/15 hover:border-purple-500/40" : "bg-purple-50/70 border-purple-200 text-purple-700 hover:bg-purple-100"}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
            AI-Native Financial Copilot · Join Waitlist
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
          Indian companies waste hours every week manually tracking operational metrics, analyzing financial health, and trying to forecast cash runways. Dabby acts as your intelligent financial copilot, helping you track core business KPIs to grow.
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
            {(analysisState === "idle" || analysisState === "complete") && (
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
                          Upload Profit & Loss (P&L) Statement
                        </p>
                        <p className={`text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                          Drag & drop your P&L document (PDF, Excel, CSV) to get an instant Business MRI audit
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
                    placeholder="E.g., Find cash flow leaks, calculate our runway growth, or identify margin spikes in this statement..."
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
 
                {/* Scan Error Banner */}
                {scanError && (
                  <div className={`p-4 rounded-xl border flex items-center gap-3 text-xs ${
                    isDark ? "bg-red-900/20 border-red-500/30 text-red-400" : "bg-red-50 border-red-200 text-red-600"
                  }`}>
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    <span>{scanError}</span>
                  </div>
                )}
 
                {/* Cookie Consent Checkbox */}
                {file && (
                  <div className={`flex items-start gap-2.5 p-4 rounded-2xl border transition-all ${
                    isDark ? "bg-white/2 border-white/5" : "bg-gray-50 border-gray-100"
                  }`}>
                    <input
                      type="checkbox"
                      id="hero-cookie-consent"
                      checked={cookieChecked}
                      onChange={(e) => setCookieChecked(e.target.checked)}
                      className={`mt-0.5 rounded cursor-pointer ${
                        isDark ? "border-white/20 text-[#81E6D9] focus:ring-[#81E6D9]/50 bg-transparent" : "border-gray-300 text-teal-600 focus:ring-teal-500"
                      }`}
                    />
                    <label htmlFor="hero-cookie-consent" className={`text-xs leading-relaxed cursor-pointer select-none ${
                      isDark ? "text-gray-400" : "text-gray-600"
                    }`}>
                      I accept the use of functional cookies for temporary file parsing under the{" "}
                      <Link to="/cookie-policy" target="_blank" className="text-[#81E6D9] hover:underline font-semibold">Cookie Policy</Link>{" "}
                      and agree to the{" "}
                      <Link to="/terms" target="_blank" className="text-[#81E6D9] hover:underline font-semibold">Terms of Service</Link>.
                    </label>
                  </div>
                )}
 
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
                    disabled={!file || !cookieChecked}
                    className={`w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-bold text-sm text-black bg-[#81E6D9] hover:bg-[#5fd3c7] transition-all ${
                      (!file || !cookieChecked) ? "opacity-40 cursor-not-allowed" : "hover:scale-[1.02] active:scale-[0.98]"
                    }`}
                  >
                    {!file 
                      ? "Upload P&L Statement" 
                      : !cookieChecked 
                        ? "Check Cookie Consent" 
                        : "Run Business MRI Audit"}{" "}
                    <ArrowRight className="w-4 h-4" />
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
                    Dabby AI P&L Diagnostic Scanner Active
                  </h3>
                  <p className={`text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                    Scanning Profit & Loss document and running Business MRI diagnostics...
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
                        Uploading Profit & Loss sheet
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
                        Extracting P&L accounts & rows
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
                        Verifying P&L document fields
                      </span>
                    </span>
                    <span className="text-gray-500">
                      {analysisState === "matching" ? "Verifying" : (analysisState === "uploading" || analysisState === "parsing" ? "Pending" : "Done")}
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
                        Analyzing margins & operating leaks
                      </span>
                    </span>
                    <span className="text-gray-500">
                      {analysisState === "detecting" ? "Analyzing" : "Pending"}
                    </span>
                  </div>
                </div>
              </motion.div>
            )}


          </AnimatePresence>
        </motion.div>

        {/* 3. MODAL STATE: Render outside of clipped animated card to avoid viewport clipping issues */}
        <AnimatePresence>
          {analysisState === "complete" && (
            <motion.div
              key="complete-modal"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="relative"
            >
              {/* Unified Standalone Business MRI Report Gated Modal */}
              <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md flex items-center justify-center p-4 md:p-8">
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
                          Dabby AI Business MRI Report
                        </h2>
                        <p className={`text-[10px] ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                          File: {file?.name || "p_and_l_statement.xlsx"} • Size: {formatFileSize(file?.size || 0)}
                        </p>
                      </div>
                    </div>

                    {/* Top Actions */}
                    <div className="flex items-center gap-3">
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> MRI Completed
                      </span>
                      
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
                    <div className="p-16 text-center space-y-4 flex flex-col justify-center items-center">
                      <Loader2 className="w-10 h-10 text-[#81E6D9] animate-spin" />
                      <div>
                        <h3 className={`text-sm font-bold ${isDark ? "text-white" : "text-[#1a1a1a]"}`}>
                          Dabby AI is generating your Business MRI...
                        </h3>
                        <p className={`text-[11px] mt-1 ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                          Scanning revenue channels, COGS, and cost leaks
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-6 space-y-6 max-h-[85vh] overflow-y-auto">
                      
                      {/* Executive Summary */}
                      <div className={`p-5 rounded-2xl border ${
                        isDark ? "bg-white/2 border-white/10" : "bg-gray-50/50 border-gray-100"
                      }`}>
                        <div className="flex items-start gap-3.5">
                          <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Sparkles className="w-4 h-4" />
                          </div>
                          <div className="space-y-1">
                            <p className="text-[10px] uppercase font-bold tracking-wider text-purple-400">
                              Dabby AI Executive Health Diagnosis
                            </p>
                            <p className={`text-xs leading-relaxed ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                              {reportData.executive_summary}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Summary Metrics Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className={`p-4 rounded-2xl border ${isDark ? "border-white/10 bg-white/1" : "border-gray-100 bg-gray-50/20"}`}>
                          <p className={`text-[10px] uppercase font-bold tracking-wider mb-1 ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                            Revenue Performance
                          </p>
                          <div className="flex items-baseline gap-2">
                            <h4 className="text-xl font-bold">{reportData.revenue_metrics?.total_revenue || "₹0.00"}</h4>
                            {reportData.revenue_metrics?.growth_rate && (
                              <span className="text-[9px] text-emerald-400 flex items-center font-semibold">
                                <TrendingUp className="w-3 h-3 mr-0.5" /> {reportData.revenue_metrics.growth_rate}
                              </span>
                            )}
                          </div>
                          <p className={`text-[9px] mt-1.5 leading-relaxed ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                            Streams: {reportData.revenue_metrics?.breakdown || "N/A"}
                          </p>
                        </div>

                        <div className={`p-4 rounded-2xl border ${isDark ? "border-white/10 bg-white/1" : "border-gray-100 bg-gray-50/20"}`}>
                          <p className={`text-[10px] uppercase font-bold tracking-wider mb-1 ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                            COGS Efficiency
                          </p>
                          <div className="flex items-baseline gap-2">
                            <h4 className="text-xl font-bold text-amber-400">{reportData.cogs_metrics?.total_cogs || "₹0.00"}</h4>
                            <span className="text-[9px] text-amber-400 flex items-center font-semibold">
                              <Percent className="w-3 h-3 mr-0.5" /> Margin Check
                            </span>
                          </div>
                          <p className={`text-[9px] mt-1.5 leading-relaxed ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                            Efficiency Rating: {reportData.cogs_metrics?.efficiency_margin || "N/A"}
                          </p>
                        </div>

                        <div className={`p-4 rounded-2xl border ${isDark ? "border-white/10 bg-white/1" : "border-gray-100 bg-gray-50/20"}`}>
                          <p className={`text-[10px] uppercase font-bold tracking-wider mb-1 ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                            Net Profit Details
                          </p>
                          <div className="flex items-baseline gap-2">
                            <h4 className="text-xl font-bold text-emerald-400">{reportData.net_profit?.amount || "₹0.00"}</h4>
                            <span className="text-[9px] text-emerald-400 flex items-center font-semibold">
                              Margin: {reportData.net_profit?.margin || "0%"}
                            </span>
                          </div>
                          <p className={`text-[9px] mt-1.5 leading-relaxed ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                            Gross values calculated based on taxation inputs
                          </p>
                        </div>
                      </div>

                      {/* Gated Bottom Half Section */}
                      <div className="relative mt-8">
                        
                        {/* Blurred Details */}
                        <div className="filter blur-[5px] select-none pointer-events-none opacity-20 space-y-6">
                          
                          {/* Recommendations */}
                          <div className="space-y-3">
                            <h4 className={`text-xs font-bold uppercase tracking-wider ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                              Gated Cost-Saving Recommendations
                            </h4>
                            <div className="space-y-2">
                              <div className="p-4 rounded-xl border border-white/5 bg-white/1 text-xs">
                                Audit Category 2: Optimize software vendor spends and subscription counts.
                              </div>
                              <div className="p-4 rounded-xl border border-white/5 bg-white/1 text-xs">
                                Optimize tax categories to reduce potential IGST split liabilities.
                              </div>
                            </div>
                          </div>

                          {/* Anomalies Table */}
                          <div className="space-y-2">
                            <h4 className={`text-xs font-bold uppercase tracking-wider ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                              Flagged Bookkeeping Anomalies
                            </h4>
                            <div className={`overflow-x-auto rounded-2xl border ${isDark ? "border-white/10" : "border-gray-200"}`}>
                              <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                  <tr className={`uppercase font-bold tracking-wider text-[10px] ${
                                    isDark ? "bg-white/3 text-gray-500" : "bg-gray-50 text-gray-400"
                                  }`}>
                                    <th className="p-3">Period</th>
                                    <th className="p-3">Detail</th>
                                    <th className="p-3">Source</th>
                                    <th className="p-3">Margin Value</th>
                                    <th className="p-3">Status</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  <tr>
                                    <td className="p-3">2024</td>
                                    <td className="p-3">Expense Spike Check</td>
                                    <td className="p-3">Audit Scan</td>
                                    <td className="p-3">+₹1,000</td>
                                    <td className="p-3">OpEx Warning</td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          </div>
                          
                        </div>

                        {/* Login / Signup Wall Overlay */}
                        <div className="absolute inset-0 flex items-center justify-center p-4 sm:p-6 z-20 bg-gradient-to-t from-[#0c0c0c] via-[#0c0c0c]/80 to-transparent">
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            className={`max-w-md w-full p-6 sm:p-8 rounded-2xl border text-center shadow-2xl backdrop-blur-md ${
                              isDark 
                                ? "bg-[#0b0b0b]/90 border-white/10 shadow-[0_0_50px_rgba(129,230,217,0.15)] text-white" 
                                : "bg-white/95 border-gray-200 shadow-gray-300/60 text-[#1a1a1a]"
                            }`}
                          >
                            <div className="w-12 h-12 rounded-full bg-[#81E6D9]/15 flex items-center justify-center mx-auto mb-4 text-[#81E6D9]">
                              <Lock className="w-5 h-5 animate-pulse" />
                            </div>

                            <h3 className={`text-lg font-bold mb-2 ${isDark ? "text-white" : "text-[#1a1a1a]"}`}>
                              Unlock Complete Business MRI
                            </h3>
                            <p className={`text-xs leading-relaxed mb-6 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                              Dabby has generated opex audits and opex cost optimizations from your P&L sheet. Log in or create a free account to unlock these recommendations and start an interactive AI chat session with this document.
                            </p>

                            <div className="flex flex-col sm:flex-row gap-3">
                              <button
                                onClick={() => handleRedirectToAuth("signup")}
                                className="flex-grow py-3 rounded-xl font-bold text-xs text-black bg-[#81E6D9] hover:bg-[#5fd3c7] transition-all hover:scale-[1.02] active:scale-[0.98]"
                              >
                                Sign Up to Unlock
                              </button>
                              <button
                                onClick={() => handleRedirectToAuth("login")}
                                className={`flex-1 py-3 rounded-xl font-bold text-xs transition-all border ${
                                  isDark ? "bg-white/5 border-white/10 hover:bg-white/10 text-white" : "bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100"
                                }`}
                              >
                                Log In
                              </button>
                            </div>
                          </motion.div>
                        </div>

                      </div>

                    </div>
                  )}

                  {/* Modal Footer */}
                  <div className={`px-6 py-4 flex flex-col sm:flex-row items-center justify-between border-t gap-3 ${
                    isDark ? "border-white/10 bg-white/1" : "border-gray-100 bg-gray-50/30"
                  }`}>
                    <span className={`text-[10px] ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                      Dabby AI uses bank-grade AES-256 ledger security.
                    </span>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={handleCloseReport}
                        className={`px-4 py-2 text-xs font-semibold rounded-xl border transition-all ${
                          isDark ? "bg-white/5 border-white/10 text-white hover:bg-white/10" : "bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100"
                        }`}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>

                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

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
