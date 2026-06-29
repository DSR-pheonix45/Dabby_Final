import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "../../context/ThemeContext";
import { 
  BookOpen, 
  FileText, 
  CheckCircle2, 
  Settings, 
  ArrowRight, 
  Terminal, 
  Info, 
  ExternalLink,
  MessageSquare,
  Sparkles,
  Calculator,
  Grid
} from "lucide-react";

const guides = [
  {
    id: "mri",
    title: "Profit & Loss AI Ingestion (Business MRI)",
    shortTitle: "Business MRI Audit",
    icon: <Grid className="w-5 h-5" />,
    optimalUseCase: "Running an instant margin diagnostic on raw Profit & Loss (P&L) statement documents to identify operational inefficiencies, high vendor costs, and spend leak warnings.",
    steps: [
      {
        title: "Upload your raw statement file",
        description: "Drag and drop your PDF, Excel, or CSV statement directly into the hero zone. Dabby runs a local validation check to detect P&L key concepts (e.g. Sales, COGS, opex lines)."
      },
      {
        title: "Consent to the processing check",
        description: "Check the cookie and data processing consents adjacent to the ingestion box to unlock the parser and execute the local OCR scans."
      },
      {
        title: "Analyze the Gated Business MRI summary",
        description: "Review the instant executive metrics grid showing Gross Revenue, Net Margin, and EBITDA values. The anomalies table highlights initial warnings."
      },
      {
        title: "Migrate the document to your live workbench",
        description: "Click 'Sign Up' or 'Log In' to save this file context securely. Once authenticated, Dabby automatically starts a persistent chat session pre-populated with your full P&L MRI audit data."
      }
    ],
    tips: [
      "Ensure document numbers are legible and column headers (such as Revenue or Operating Expenses) are present.",
      "You can export the initial Business MRI report as a shareable link to email directly to stakeholders."
    ],
    promptExample: "Show me a cash burn runway forecast based on this P&L and suggest three specific operational costs we can trim."
  },
  {
    id: "rag",
    title: "AI-Native Finance Chat (RAG Engine)",
    shortTitle: "Interactive Finance Chat",
    icon: <MessageSquare className="w-5 h-5" />,
    optimalUseCase: "Querying transactional general ledgers and multi-month statements to identify specific vendors, project cash runways, and parse narratives without writing SQL formulas.",
    steps: [
      {
        title: "Access the Workbench Chat panel",
        description: "Log in and open the Dabby Dashboard. Select your active document in the left sidebar attachment selector."
      },
      {
        title: "Query in natural language",
        description: "Type plain English questions into the chat prompt box. Dabby automatically performs semantic search mapping using Retrieval-Augmented Generation (RAG)."
      },
      {
        title: "Audit citations and references",
        description: "Click the reference citations below Dabby's answers to verify specific ledger transaction dates, amounts, and source document lines."
      }
    ],
    tips: [
      "Use specific prompt instructions like 'Scan opex lines for Zoho invoices between May and June' for highly target-rich searches.",
      "Select 'Company Scope' if you want Dabby to search across all uploaded ledgers instead of a single worksheet."
    ],
    promptExample: "Find all payments to AWS or Google Cloud and list them chronologically in a markdown table."
  },
  {
    id: "templates",
    title: "Automated Document Template Instantiation",
    shortTitle: "AI Template Engine",
    icon: <FileText className="w-5 h-5" />,
    optimalUseCase: "Creating structured financial models, tax invoices, client quotations, and receivable trackers instantly from text prompts without building sheets from scratch.",
    steps: [
      {
        title: "Select your template category",
        description: "Go to the 'Templates' tab in the app drawer. Choose from Receivable Trackers, GST Invoice formats, Quotation layouts, or Cashflow Planners."
      },
      {
        title: "Prompt custom sheet requirements",
        description: "Instruct Dabby's template generator in the workspace. For example: 'Create an invoice for TechCorp containing 3 line items for software development with 18% CGST split'."
      },
      {
        title: "Review and fill rows",
        description: "Let the AI build the schema. Fill in your client details and invoice numbers using the interactive grid."
      },
      {
        title: "Export to CSV or PDF",
        description: "Generate the client-ready sheet and click 'Export'. Save as CSV for spreadsheet editing or download a clean PDF invoice."
      }
    ],
    tips: [
      "Specify your tax jurisdictions (e.g. IGST vs SGST/CGST) when prompting invoice generation to ensure proper automatic split calculation."
    ],
    promptExample: "Generate a 12-month expense tracker layout with columns for Date, Category, Vendor, Amount, and GST split."
  },
  {
    id: "forecasting",
    title: "Advanced Cash Analytics & Runway Forecasting",
    shortTitle: "Runway Forecasting",
    icon: <Calculator className="w-5 h-5" />,
    optimalUseCase: "Generating automated monthly burn summaries and forward-looking cash runway projections based on historical transaction logs.",
    steps: [
      {
        title: "Sync or select transaction histories",
        description: "Select your multi-month statement context in the left sidebar attachment selector."
      },
      {
        title: "Request runway diagnostics",
        description: "Use specific query commands to trigger forecasting modules (e.g. 'Forecast cash runway under standard opex')."
      },
      {
        title: "Simulate growth scenarios",
        description: "Instruct Dabby to model overhead increases (such as +10% engineering payroll) to review runway impacts."
      },
      {
        title: "Export projection summaries",
        description: "Export the forecast table and charts as clean CSV worksheets for presentations."
      }
    ],
    tips: [
      "Upload at least 3 months of consecutive ledger logs for Dabby to identify recurring cash patterns.",
      "Specify any planned fixed cost revisions in your query for accurate projection modeling."
    ],
    promptExample: "Project our cash runway for the next 12 months assuming revenue grows at 5% MoM and fixed overheads remain flat."
  }
];

export default function Documentation() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [activeGuideId, setActiveGuideId] = useState("mri");
  const [copySuccess, setCopySuccess] = useState(false);

  const activeGuide = guides.find((g) => g.id === activeGuideId) || guides[0];

  const handleCopyPrompt = (text) => {
    navigator.clipboard.writeText(text);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  return (
    <div className={`min-h-screen pt-28 pb-24 px-6 md:px-12 transition-colors duration-300 ${
      isDark ? "bg-[#060606]" : "bg-[#f5f5f7]"
    }`}>
      <div className="max-w-7xl mx-auto">
        
        {/* Page Header */}
        <section className="text-center mb-16">
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-block px-4 py-1.5 text-xs font-semibold uppercase tracking-wider rounded-full bg-[#81E6D9]/10 text-[#81E6D9] border border-[#81E6D9]/30"
          >
            Product Manual
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className={`text-4xl md:text-5xl lg:text-6xl font-bold font-display mt-6 mb-4 tracking-tight leading-[1.1] ${
              isDark ? "text-white" : "text-[#1a1a1a]"
            }`}
          >
            Dabby User Guides & <span className="text-[#81E6D9]">Workflows</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className={`max-w-3xl mx-auto text-base md:text-lg ${
              isDark ? "text-gray-400" : "text-gray-600"
            }`}
          >
            Step-by-step guides and optimal configurations to audit ledgers, sync reports, and maximize Dabby's AI capabilities.
          </motion.p>
        </section>

        {/* Guides Workbench Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-16 items-start">
          
          {/* Left Navigation Panel (Col-4) */}
          <div className="lg:col-span-4 space-y-3">
            <h3 className={`text-xs font-bold uppercase tracking-wider mb-2 ${isDark ? "text-gray-500" : "text-gray-400"}`}>
              Optimal Use Cases
            </h3>
            <div className="flex flex-col gap-2.5">
              {guides.map((guide) => {
                const isActive = guide.id === activeGuideId;
                return (
                  <button
                    key={guide.id}
                    onClick={() => setActiveGuideId(guide.id)}
                    className={`flex items-center gap-3.5 p-4 rounded-2xl border text-left transition-all duration-200 ${
                      isActive
                        ? (isDark 
                          ? "bg-[#81E6D9]/8 border-[#81E6D9]/40 text-white shadow-[0_0_20px_rgba(129,230,217,0.15)]" 
                          : "bg-white border-[#81E6D9] text-[#0d9488] shadow-md")
                        : (isDark 
                          ? "bg-[#111111] border-white/5 text-gray-400 hover:bg-white/5 hover:text-white" 
                          : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-black")
                    }`}
                  >
                    <div className={`p-2.5 rounded-xl flex-shrink-0 flex items-center justify-center transition-colors ${
                      isActive 
                        ? "bg-[#81E6D9] text-black" 
                        : (isDark ? "bg-white/5 text-gray-400" : "bg-gray-100 text-gray-500")
                    }`}>
                      {guide.icon}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold leading-tight">{guide.shortTitle}</h4>
                      <p className={`text-[10px] mt-0.5 leading-relaxed line-clamp-1 ${
                        isActive ? (isDark ? "text-[#81E6D9]" : "text-teal-600") : "text-gray-500"
                      }`}>
                        {guide.id === "mri" ? "P&L audit diagnostic" : guide.id === "rag" ? "Contextual ledgers check" : guide.id === "templates" ? "Invoice / sheet spawning" : "Analytics & Runway forecasting"}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Active Content Panel (Col-8) */}
          <div className="lg:col-span-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeGuide.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
                className={`p-6 md:p-8 rounded-3xl border transition-all duration-300 ${
                  isDark ? "bg-[#0b0b0b] border-white/5 shadow-2xl shadow-black/80" : "bg-white border-gray-200 shadow-xl"
                }`}
              >
                {/* Header */}
                <div className="flex items-center gap-3 border-b border-white/10 pb-5 mb-6">
                  <div className={`p-3 rounded-2xl ${isDark ? "bg-[#81E6D9]/10 text-[#81E6D9]" : "bg-teal-50 text-[#0d9488]"}`}>
                    {activeGuide.icon}
                  </div>
                  <div>
                    <h2 className={`text-xl md:text-2xl font-bold leading-tight ${isDark ? "text-white" : "text-[#1a1a1a]"}`}>
                      {activeGuide.title}
                    </h2>
                    <p className={`text-xs font-semibold mt-1 uppercase tracking-wider ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                      Workflow Manual
                    </p>
                  </div>
                </div>

                {/* Optimal Use Case Alert Box */}
                <div className={`p-4 rounded-2xl mb-6 border ${
                  isDark ? "bg-[#81E6D9]/5 border-[#81E6D9]/15 text-gray-300" : "bg-teal-50/50 border-teal-100 text-gray-700"
                }`}>
                  <div className="flex gap-2 items-start text-xs leading-relaxed">
                    <Info className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isDark ? "text-[#81E6D9]" : "text-teal-600"}`} />
                    <div>
                      <strong className={isDark ? "text-white" : "text-black"}>Optimal Use Case: </strong>
                      {activeGuide.optimalUseCase}
                    </div>
                  </div>
                </div>

                {/* Steps Section */}
                <div className="space-y-6 mb-8">
                  <h3 className={`text-xs font-bold uppercase tracking-wider ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                    Step-by-step Instructions
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {activeGuide.steps.map((step, idx) => (
                      <div
                        key={idx}
                        className={`p-4 rounded-2xl border ${
                          isDark ? "bg-white/1 border-white/5" : "bg-gray-50/50 border-gray-100"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 mb-2">
                          <span className={`w-6 h-6 rounded-lg font-bold text-xs flex items-center justify-center ${
                            isDark ? "bg-[#81E6D9]/20 text-[#81E6D9]" : "bg-teal-100 text-teal-700"
                          }`}>
                            {idx + 1}
                          </span>
                          <h4 className={`text-xs font-bold leading-tight uppercase tracking-wider ${isDark ? "text-white" : "text-[#1a1a1a]"}`}>
                            {step.title}
                          </h4>
                        </div>
                        <p className={`text-xs leading-relaxed ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                          {step.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Prompt Example & Copy */}
                <div className={`p-4 rounded-2xl border mb-6 ${
                  isDark ? "bg-white/2 border-white/5" : "bg-gray-50 border-gray-200"
                }`}>
                  <div className="flex items-center justify-between gap-4 mb-2.5">
                    <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-purple-400">
                      <Terminal className="w-3.5 h-3.5 animate-pulse" /> Try it in the workbench
                    </span>
                    <button
                      onClick={() => handleCopyPrompt(activeGuide.promptExample)}
                      className={`px-3 py-1 rounded-xl text-[10px] font-bold border transition-colors ${
                        copySuccess
                          ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                          : (isDark 
                            ? "bg-white/5 border-white/10 text-white hover:bg-white/10" 
                            : "bg-white border-gray-200 text-gray-700 hover:bg-gray-100")
                      }`}
                    >
                      {copySuccess ? "Copied Prompt!" : "Copy Prompt"}
                    </button>
                  </div>
                  <p className={`text-xs italic px-3 py-2 rounded-xl font-mono leading-relaxed border ${
                    isDark ? "bg-[#0e0e0e] border-white/5 text-gray-300" : "bg-white border-gray-150 text-gray-600"
                  }`}>
                    "{activeGuide.promptExample}"
                  </p>
                </div>

                {/* Tips Checklist */}
                <div className="space-y-2 border-t border-white/10 pt-5">
                  <h4 className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                    Workflow Tips & Best Practices
                  </h4>
                  <ul className="space-y-1.5 text-xs">
                    {activeGuide.tips.map((tip, idx) => (
                      <li key={idx} className={`flex items-start gap-2 ${isDark ? "text-gray-300" : "text-gray-600"}`}>
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#81E6D9] flex-shrink-0 mt-0.5" />
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>

              </motion.div>
            </AnimatePresence>
          </div>

        </div>

        {/* Founder & Custom Audit Query Section */}
        <section className={`rounded-3xl border px-8 py-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6 transition-all duration-300 ${
          isDark ? "bg-[#0b0b0b] border-white/5 shadow-lg" : "bg-white border-gray-200 shadow-md"
        }`}>
          <div>
            <h2 className={`text-2xl font-bold mb-2 font-display ${isDark ? "text-white" : "text-[#1a1a1a]"}`}>
              Need custom documentation?
            </h2>
            <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
              Reach out to our grievance compliance officer or request walkthough instructions tailored to your auditing system.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <a
              href="mailto:opportunities@datalis.in?subject=Request%20for%20documentation"
              className={`px-6 py-3.5 text-center text-xs font-bold rounded-full border transition ${
                isDark 
                  ? "border-[#81E6D9] text-[#81E6D9] hover:bg-[#81E6D9]/10" 
                  : "border-teal-600 text-teal-700 hover:bg-teal-50"
              }`}
            >
              Email Docs Team
            </a>
            <a
              href="https://calendly.com/medhansh_k/new-meeting"
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3.5 rounded-full text-center text-xs font-bold bg-[#81E6D9] text-black hover:bg-[#5fd3c7] transition"
            >
              Talk to Founder
            </a>
          </div>
        </section>

      </div>
    </div>
  );
}
