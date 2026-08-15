import { useState, useRef, useEffect } from "react";
import { Routes, Route, useLocation, Navigate } from "react-router-dom";
import Sidebar from "./Sidebar/Sidebar";
import Header from "./Header/Header";
import WelcomeSection from "./WelcomeSection/WelcomeSection";
import ActionCards from "./ActionCards/ActionCards";
import ChatInput from "./ChatInput/ChatInput";
import ChatArea from "./ChatArea/ChatArea";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../hooks/useAuth";
import Settings from "./Settings/Settings";
import Workbenches from "../pages/Workbenches";
import WorkbenchLayout from "../pages/workbench/WorkbenchLayout";
import Members from "../pages/workbench/Members";
import Parties from "../pages/workbench/Parties";
import WorkbenchSettings from "../pages/workbench/Settings";
import JoinWorkbench from "../pages/workbench/JoinWorkbench";
import COA from "../pages/workbench/COA";
import DocVault from "../pages/workbench/DocVault";
import OPS from "../pages/workbench/ops/OPS";
import SalesFlow from "../pages/workbench/flows/SalesFlow";
import PurchasesFlow from "../pages/workbench/flows/PurchasesFlow";
import GeneratorPage from "../pages/workbench/GeneratorPage";
import LedgerView from "../pages/workbench/LedgerView";
import OnboardingTour from "./Onboarding/OnboardingTour";
import FeedbackModal from "./ChatArea/FeedbackModal";
import { backendService } from "../services/backendService";
import { contextService } from "../services/contextService";
import { supabase } from "../lib/supabase";
import { BsRocketTakeoff, BsChevronRight } from "react-icons/bs";
import { apiFetch } from "../lib/apiClient";
import { consumeAiMessage } from "../lib/plans";
import { toast } from "react-hot-toast";
import { useWorkbench } from "../context/WorkbenchContext";

export default function MainApp() {
  useTheme(); // Theme context is used for side effects
  const location = useLocation();
  const { activeWorkbench, isWorkbenchContextEnabled } = useWorkbench();
  const { user, profile, loading: authLoading } = useAuth();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [messages, setMessages] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [currentContext, setCurrentContext] = useState("");
  const [isInConversation, setIsInConversation] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showTour, setShowTour] = useState(false);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const chatInputRef = useRef(null);
  const chatContainerRef = useRef(null);

  // Auto-show onboarding tour for new users who just completed the onboarding form
  useEffect(() => {
    if (authLoading) return;

    const hasCompletedOnboarding = localStorage.getItem("dabby_onboarding_completed");
    const justOnboarded = location.state?.fromOnboarding;

    // Only show the tour if they just finished the onboarding form 
    // OR if it's a first-time user on this device who hasn't seen it yet
    // BUT we check if they are actually a new user by looking at profile.status
    // Actually, if they just onboarded, they definitely should see it.
    if (justOnboarded || (!hasCompletedOnboarding && user?.id && profile?.status === 'partial')) {
      const timer = setTimeout(() => {
        setShowTour(true);
        // Clear the state so it doesn't trigger again on refresh
        if (justOnboarded) {
          window.history.replaceState({}, document.title);
        }
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [user?.id, location.state, profile?.status, authLoading]);

  // Load pre-auth P&L and Business MRI if present
  useEffect(() => {
    if (authLoading) return;
    if (!user?.id) return;

    const pendingReport = localStorage.getItem("dabby_pending_mri_report");
    const pendingFileName = localStorage.getItem("dabby_pending_mri_file_name");
    const pendingFileContent = localStorage.getItem("dabby_pending_mri_file_content");
    const pendingFileSize = localStorage.getItem("dabby_pending_mri_file_size");
    const pendingFileType = localStorage.getItem("dabby_pending_mri_file_type");

    if (pendingReport) {
      // Clear immediately to avoid multiple runs on mount/state updates
      localStorage.removeItem("dabby_pending_mri_report");
      localStorage.removeItem("dabby_pending_mri_file_name");
      localStorage.removeItem("dabby_pending_mri_file_content");
      localStorage.removeItem("dabby_pending_mri_file_size");
      localStorage.removeItem("dabby_pending_mri_file_type");

      try {
        const welcomeMessage = `I have uploaded my Profit & Loss statement: **${pendingFileName || "p_and_l_statement.xlsx"}** for AI Business MRI diagnosis.`;
        const newUserMsg = {
          id: Date.now(),
          content: welcomeMessage,
          role: "user",
          timestamp: new Date().toISOString(),
          options: {
            uploadedFiles: [{
              name: pendingFileName || "p_and_l_statement.xlsx",
              size: pendingFileSize ? parseInt(pendingFileSize) : 14500,
              type: pendingFileType || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            }]
          }
        };

        const loadingAssistantMsg = {
          id: Date.now() + 1,
          content: "Generating your Dabby AI Business MRI Report...",
          role: "assistant",
          sender: "Dabby Consultant",
          timestamp: new Date().toISOString(),
          isLoading: true
        };

        setMessages([newUserMsg, loadingAssistantMsg]);
        setIsInConversation(true);
        setIsLoading(true);
        setUploadedFiles(newUserMsg.options.uploadedFiles);

        const runMigratedAnalysis = async () => {
          try {
            console.log("[DEBUG] Starting dynamic migrated P&L analysis...");
            const sessionTitle = `Business MRI: ${pendingFileName || "P&L Statement"}`;
            const session = await backendService.createChatSession(sessionTitle);
            let sessionId = null;
            if (session && session.id) {
              sessionId = session.id;
              setCurrentSessionId(session.id);
              await backendService.saveChatMessage(
                session.id,
                "user",
                newUserMsg.content,
                {
                  timestamp: newUserMsg.timestamp,
                  sender: "You",
                  files: newUserMsg.options.uploadedFiles
                }
              );
            }

            const { callLLMWithFallback } = await import("../services/llmService.js");
            const systemPrompt = `
You are Dabby Consultant, an elite Financial Auditor, Forensic Accountant, and Business Intelligence Specialist.
Perform a complete Business MRI analysis report on the provided Profit & Loss statement text context.

### REQUIRED SECTIONS:
1. Executive Health Diagnosis
2. Key Metrics Audit (Revenue, Growth, COGS, Net Profit margins)
3. Actionable Cost-saving Recommendations
4. Flagged Bookkeeping Anomalies or warning flags.

### RESPONSE FORMATTING AND STRUCTURE PROTOCOLS (MANDATORY):
- **Narration & Sentence Formation**: Always write in clear, professionally structured, complete sentences. Avoid overly dense paragraphs. Use single or double line breaks to separate distinct ideas and ensure excellent readability.
- **Proper Spacing**: Ensure logical separation between topics, metrics, recommendations, and sections. Never bundle multiple bullet points or distinct concepts into a single unspaced line/paragraph.
- **Highlight Key Values**: Always bold important financial metrics, percentages, dollar/rupee amounts, growth indicators, dates, and names using markdown bolding (e.g., **₹57,25,000**, **14.8%**, **30.3%**).
- **Structured Layout**: Use bold headers, bullet lists, or tables where appropriate to organize details cleanly and logically.

Do NOT generate any visual charts or interactive scenario comparison blocks unless explicitly requested by the user. Use clear markdown styling.
`;
            const fallbackReportText = `Here is your completed **Dabby AI Business MRI Report** (Mock Fallback due to API key config):

### Executive Health Diagnosis:
Based on the Profit & Loss statement provided, the business shows stable operations with healthy gross margins. Total net sales reached ₹1,92,000 for the period, showing a YoY growth of 9.40%. Net profit increased to ₹1,20,070.35, resulting in a strong net profit margin of 62.54%. However, operating expenses increased by 11.11% in Expense category 2, which requires close monitoring.

### Key Metrics Audit:
- **Revenue Performance**: ₹1,92,000.00 (9.40% YoY)
  - *Breakdown*: Sales: ₹1,37,000.00 | Service: ₹34,000.00 | Interest: ₹17,000.00 | Gain on sale: ₹4,000.00
- **COGS Efficiency**: ₹36,000.00 (81.25% Gross Margin)
- **Net Profit Margin**: ₹1,20,070.35 (62.54%)

### Actionable Cost-Saving Recommendations:
1. Audit Expense Category 2: Analyze vendor bills for the 11.11% cost increase.
2. Optimize interest income: Consider moving idle cash reserves (which generated ₹3,000 in interest) into higher-yield instruments.
3. Scale Service Sales: Service revenue grew at 9.68% (higher than general Sales at 7.87%), showing strong demand with high margin potential.

### Flagged Bookkeeping Anomalies:
1. **2024** - Sales YoY growth (+₹10,000) - *Healthy Growth*
2. **2024** - Expense 2 YoY Spike (+₹1,000) - *OpEx Warning*

*Notice: Loaded diagnostic mock report. To enable live custom document analysis, please configure a valid VITE_GROQ_API_KEY in your .env file.*`;

            let aiContent = "";
            try {
              const llmResponse = await callLLMWithFallback({
                query: "Run a complete Business MRI analysis report for this Profit & Loss statement.",
                systemPrompt: systemPrompt,
                context: pendingFileContent || "",
                history: [],
                uploaded_files: []
              });
              aiContent = llmResponse.error ? fallbackReportText : llmResponse.response;
            } catch (err) {
              console.warn("LLM API call threw exception, using fallback:", err);
              aiContent = fallbackReportText;
            }

            if (sessionId) {
              await backendService.saveChatMessage(
                sessionId,
                "assistant",
                aiContent,
                {
                  timestamp: new Date().toISOString(),
                  sender: "Dabby Consultant",
                  files: []
                }
              );
            }

            const finalAssistantMsg = {
              id: Date.now() + 2,
              content: aiContent,
              role: "assistant",
              sender: "Dabby Consultant",
              timestamp: new Date().toISOString()
            };

            setCurrentContext(pendingFileContent || "");
            setMessages([newUserMsg, finalAssistantMsg]);
            setIsLoading(false);
            window.dispatchEvent(new Event("chatHistoryUpdated"));
            console.log("[DEBUG] Dynamic migrated analysis completed successfully!");
          } catch (e) {
            console.error("Failed to run migrated analysis:", e);
            setIsLoading(false);
            const fallbackMsg = {
              id: Date.now() + 2,
              content: `Here is your completed **Dabby AI Business MRI Report** (Mock Fallback due to API error):

### Executive Health Diagnosis:
Based on the Profit & Loss statement provided, the business shows stable operations with healthy gross margins. Total net sales reached ₹1,92,000 for the period, showing a YoY growth of 9.40%. Net profit increased to ₹1,20,070.35, resulting in a strong net profit margin of 62.54%.

### Key Metrics Audit:
- **Revenue Performance**: ₹1,92,000.00 (9.40% YoY)
- **COGS Efficiency**: ₹36,000.00 (81.25% Gross Margin)
- **Net Profit Margin**: ₹1,20,070.35 (62.54%)

### Actionable Cost-Saving Recommendations:
1. Audit Expense Category 2: Analyze vendor bills for the 11.11% cost increase.
2. Optimize interest income: Consider moving idle cash reserves (which generated ₹3,000 in interest) into higher-yield instruments.
3. Scale Service Sales: Service revenue grew at 9.68% (higher than general Sales at 7.87%), showing strong demand with high margin potential.

### Flagged Bookkeeping Anomalies:
1. **2024** - Sales YoY growth (+₹10,000) - *Healthy Growth*
2. **2024** - Expense 2 YoY Spike (+₹1,000) - *OpEx Warning*

*Notice: Loaded diagnostic mock report. To enable live custom document analysis, please configure a valid VITE_GROQ_API_KEY in your .env file.*`,
              role: "assistant",
              sender: "Dabby Consultant",
              timestamp: new Date().toISOString()
            };
            setMessages([newUserMsg, fallbackMsg]);
          }
        };

        runMigratedAnalysis();
      } catch (err) {
        console.error("Error shifting P&L state:", err);
      }
    }
  }, [authLoading, user?.id, location.pathname]);

  const handleTourComplete = () => {
    setShowTour(false);
    localStorage.setItem("dabby_onboarding_completed", "true");
  };

  // Auto-persist context to localStorage
  useEffect(() => {
    if (currentSessionId && currentContext) {
      localStorage.setItem(`dabby_context_${currentSessionId}`, currentContext);
    }
  }, [currentContext, currentSessionId]);

  // Listen for clearChat event from sidebar
  useEffect(() => {
    const handleClearChat = () => {
      // Show feedback modal before clearing if there was a conversation
      if (messages.length > 0) {
        setIsFeedbackModalOpen(true);
      }
      setMessages([]);
      setUploadedFiles([]);
      setIsInConversation(false);
      setWebSearchEnabled(false);
      setCurrentContext("");
      setCurrentSessionId(null);
    };

    const handleLoadChatSession = (event) => {
      const { sessionId, messages: sessionMessages } = event.detail;
      setCurrentSessionId(sessionId);
      setMessages(sessionMessages);
      setIsInConversation(true);

      // Load persisted context for this session
      const savedContext = localStorage.getItem(`dabby_context_${sessionId}`);

      // Extract uploaded files from session messages to restore uploadedFiles state
      const allUploadedFiles = sessionMessages
        .filter(m => m.options?.uploadedFiles?.length > 0)
        .flatMap(m => m.options.uploadedFiles);
      setUploadedFiles(allUploadedFiles);

      if (savedContext) {
        setCurrentContext(savedContext);
      } else {
        // If no saved context, try to rebuild it from messages that had files
        const fileMessages = sessionMessages.filter(m => m.options?.uploadedFiles?.length > 0);
        if (fileMessages.length > 0) {
          console.log("Found messages with files, context might need rebuilding.");
        }
        setCurrentContext("");
      }
    };

    const handleStartAIChat = (event) => {
      const { query } = event.detail;
      
      // Small delay to ensure any other UI actions complete
      setTimeout(() => {
        handleSendMessage(query, {
          web: false,
          uploadedFiles: [],
          hasContext: true
        });
      }, 100);
    };

    window.addEventListener("clearChat", handleClearChat);
    window.addEventListener("loadChatSession", handleLoadChatSession);
    window.addEventListener("start-ai-chat", handleStartAIChat);

    return () => {
      window.removeEventListener("clearChat", handleClearChat);
      window.removeEventListener("loadChatSession", handleLoadChatSession);
      window.removeEventListener("start-ai-chat", handleStartAIChat);
    };
  }, [messages.length]);

  // Auto-save chat session and generate summary
  const saveChatSession = async (sessionMessages) => {
    // Don't store chat sessions if user isn't authenticated or there's only 1 message
    if (!user?.id || sessionMessages.length < 2) {
      console.log("[DEBUG] Chat persistence skipped: Not authenticated or insufficient messages.");
      return;
    }

    try {
      // Find the last User message and the last Assistant message in the current thread
      const lastUserMessage = [...sessionMessages].reverse().find(m => m.role === 'user');
      const lastAssistantMessage = [...sessionMessages].reverse().find(m => m.role === 'assistant');

      if (!lastUserMessage || !lastAssistantMessage) {
        console.warn("[DEBUG] Chat persistence skipped: Missing user or assistant message in thread.");
        return;
      }

      // Generate title from first user message if it doesn't exist
      const firstUserMsg = sessionMessages.find((m) => m.role === "user");
      const title = firstUserMsg
        ? firstUserMsg.content.substring(0, 50) +
        (firstUserMsg.content.length > 50 ? "..." : "")
        : "Untitled Chat";

      // Removed Workbench context check

      let sessionIdToUse = currentSessionId;
      let isNewSession = false;

      // 1. Create session if it doesn't exist
      if (!sessionIdToUse) {
        const session = await backendService.createChatSession(title);
        if (session && session.id) {
          sessionIdToUse = session.id;
          setCurrentSessionId(sessionIdToUse);
          isNewSession = true;
          console.log("[DEBUG] New session ID created:", sessionIdToUse);
        } else {
          throw new Error("Failed to create chat session - no ID returned.");
        }
      }

      // 2. Save User Message
      const userMetadata = {
        timestamp: lastUserMessage.timestamp || new Date().toISOString(),
        sender: "You",
        files: lastUserMessage.options?.uploadedFiles?.map(f => ({
          name: f.name,
          size: f.size,
          type: f.type
        })) || [],
      };
      
      console.log("[DEBUG] Persistence: Saving User message...");
      await backendService.saveChatMessage(
        sessionIdToUse,
        "user",
        lastUserMessage.content,
        userMetadata
      );

      // 3. Save Assistant Message
      const aiMetadata = {
        timestamp: lastAssistantMessage.timestamp || new Date().toISOString(),
        sender: "Dabby Consultant",
        files: [],
      };

      console.log("[DEBUG] Persistence: Saving Assistant response...");
      await backendService.saveChatMessage(
        sessionIdToUse,
        "assistant",
        lastAssistantMessage.content,
        aiMetadata
      );

      console.log("[DEBUG] Full exchange persisted successfully to session:", sessionIdToUse);

      // Trigger sidebar refresh
      window.dispatchEvent(new Event("chatHistoryUpdated"));
    } catch (error) {
      console.error("[ERROR] Chat persistence failed:", error);
      if (error.code === '42501') {
        toast.error("Database permission denied (RLS). Please check Supabase policies.");
      } else if (error.code === '42P01') {
        toast.error("Database table missing. Please run setup script.");
      }
    }
  };

  // Fetch workbenches code removed

  // handleToggleWorkbenchContext and useEffect removed

  const handleSendMessage = async (
    message,
    options = {},
    isAIResponse = false
  ) => {
    // If this is an AI response, add it to the conversation
    if (isAIResponse && options.response) {
      const aiResponse = {
        id: Date.now() + 1,
        content: options.response,
        role: "assistant",
        sender: "Dabby Consultant",
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, aiResponse]);
      return;
    }

    // Handle empty message with files
    let displayMessage = message;
    let llmQuery = message;
    const hasFiles = options.uploadedFiles && options.uploadedFiles.length > 0;

    if (!message.trim() && hasFiles) {
      const fileCount = options.uploadedFiles.length;
      const fileNames = options.uploadedFiles.map(f => f.name).join(", ");
      displayMessage = `Attached ${fileCount} file${fileCount > 1 ? 's' : ''}: ${fileNames}`;
      llmQuery = `I have uploaded these files: ${fileNames}. Please acknowledge receipt and ask how you can help. Do not analyze them yet.`;
    } else if (!message.trim() && !hasFiles) {
      // Should not happen due to disabled button, but safe guard
      return;
    }

    // Plan gate (Module 12): meter this AI consultant message for the user.
    const meter = await consumeAiMessage(null);
    if (meter && meter.allowed === false) {
      toast.error(
        `Daily AI limit reached (${meter.limit} messages on the ${meter.plan || "current"} plan). Upgrade to keep chatting.`
      );
      return;
    }

    // This is a user message, add it to conversation
    const newMessage = {
      id: Date.now(),
      content: displayMessage,
      role: "user",
      options,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, newMessage]);
    setIsInConversation(true); // Switch to conversation mode

    // If there are uploaded files, show loading message
    let loadingId = null;

    if (hasFiles) {
      // We set this for display in ChatArea, but we don't want it re-syncing to ChatInput as "pending"
      setUploadedFiles(prev => [...prev, ...options.uploadedFiles]);
      const fileNames = options.uploadedFiles.map((f) => f.name).join(", ");
      const loadingMsg = message.trim()
        ? `Analyzing files: ${fileNames}...`
        : `Uploading files: ${fileNames}...`;

      const loading = {
        id: Date.now() + 2,
        content: loadingMsg,
        role: "assistant",
        sender: "Dabby Consultant",
        timestamp: new Date().toISOString(),
        isLoading: true,
      };
      setMessages((prev) => [...prev, loading]);
      setIsLoading(true);
      loadingId = loading.id;
    }

    // Always call AI function (ChatInput handles this now)
    try {
      const { callLLMWithFallback } = await import("../services/llmService.js");

      // Build real-time business context for user
      let userContextStr = "";
      if (isWorkbenchContextEnabled === false) {
        console.log(`[DEBUG] Workbench Context is OFF by user setting. Skipping workbench intelligence.`);
        userContextStr = "Workbench context is OFF. Respond using general domain knowledge or uploaded files.";
      } else {
        try {
          console.log(`[DEBUG] Building real-time intelligence for user`);
          const intel = await contextService.getUserIntelligence();
          userContextStr = contextService.formatForLLM(intel);
        } catch (ctxError) {
          console.error("[DEBUG] Error building user intelligence:", ctxError);
          userContextStr = "Error: Failed to fetch real-time data.";
        }
      }

      const llmResponse = await callLLMWithFallback({
        query: llmQuery, 
        context: userContextStr + (currentContext ? `\n\n=== ADDITIONAL HISTORY CONTEXT ===\n${currentContext}` : ""),
        web_search: options.web || false,
        uploaded_files: options.uploadedFiles || [], 
        history: messages
      });

      if (llmResponse.error) {
        throw new Error(llmResponse.error);
      }

      // Update current context if returned (always keep the latest context)
      if (llmResponse.context) {
        setCurrentContext(llmResponse.context);
      }

      // Remove loading message and add AI response
      setMessages((prev) =>
        prev
          .filter((m) => m.id !== loadingId)
          .concat({
            id: Date.now() + 1,
            content: llmResponse.response,
            role: "assistant",
            sender: "Dabby Consultant",
            timestamp: new Date().toISOString(),
          })
      );
      setIsLoading(false);

      // Auto-save chat session after AI responds
      const updatedMessages = messages.concat(newMessage, {
        id: Date.now() + 1,
        content: llmResponse.response,
        role: "assistant",
        sender: "Dabby Consultant",
        timestamp: new Date().toISOString(),
      });
      await saveChatSession(updatedMessages);
    } catch (error) {
      console.error("Error sending message:", error);
      // Remove loading and add error response
      setMessages((prev) =>
        prev
          .filter((m) => m.id !== loadingId)
          .concat({
            id: Date.now() + 1,
            content: "Sorry, I encountered an error. Please try again.",
            role: "assistant",
            sender: "Dabby Consultant",
            timestamp: new Date().toISOString(),
          })
      );
      setIsLoading(false);
    }
  };

  const handleQuestionCardClick = (question) => {
    if (chatInputRef.current) {
      chatInputRef.current.setMessage(question);
      // Always auto-send the message when clicking a suggestion card
      setTimeout(() => {
        chatInputRef.current.sendMessage(question);
      }, 100);
    }
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#0a0a0a] text-white font-dm-sans relative">
      {/* Database Setup Banner - Removed as it's part of cleaned features */}
      <FeedbackModal
        isOpen={isFeedbackModalOpen}
        onClose={() => setIsFeedbackModalOpen(false)}
        sessionId={currentSessionId}
      />

      {/* Mobile/Tablet Backdrop Overlay */}
      {isMobileSidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      {/* Mobile Sidebar Drawer - Slides in from left */}
      <div
        className={`lg:hidden fixed top-0 left-0 h-full w-[280px] max-w-[85vw] z-50 bg-[#0E1117] border-r border-[#1F242C] transform transition-transform duration-300 ease-out overflow-y-auto
        ${isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        {/* Mobile Sidebar Header with Close */}
        <div className="sticky top-0 flex items-center justify-between p-4 border-b border-white/10 bg-[#0E1117]/95 backdrop-blur-sm z-10">
          <div className="flex items-center space-x-2">
            <img src="/dabby-logo.svg" alt="Dabby" className="h-7 w-7" />
            <span className="text-lg font-bold bg-gradient-to-r from-teal-400 to-cyan-500 bg-clip-text text-transparent">Dabby</span>
          </div>
          <button
            onClick={() => setIsMobileSidebarOpen(false)}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <Sidebar
          onNavigate={() => setIsMobileSidebarOpen(false)}
        />
      </div>

      {/* Desktop Sidebar - Hidden on mobile/tablet */}
      <div
        className={`hidden lg:block bg-[#0A0A0A] transition-all duration-500 ease-in-out flex-shrink-0 relative group/sidebar ${
          isSidebarCollapsed ? "w-16" : "w-[280px]"
        }`}
      >
        <Sidebar isCollapsed={isSidebarCollapsed} />
        
        {/* Desktop Sidebar Toggle Button - Now integrated into the edge */}
        <button
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className={`absolute top-1/2 -translate-y-1/2 -right-3 z-50 w-6 h-12 bg-[#0A0A0A] border border-white/10 hover:border-teal-500/50 text-gray-500 hover:text-teal-400 rounded-full flex items-center justify-center transition-all duration-500 shadow-xl group-hover/sidebar:opacity-100 ${isSidebarCollapsed ? "opacity-100" : "opacity-0"}`}
        >
          <BsChevronRight className={`text-[10px] transition-transform duration-500 ${isSidebarCollapsed ? "" : "rotate-180"}`} />
        </button>
      </div>


      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Header */}
        <Header
          onMobileMenuClick={() => setIsMobileSidebarOpen(true)}
        />

        {/* Main Dashboard Content */}
        <div className="flex-1 min-h-0 overflow-auto pb-[120px] sm:pb-[100px] lg:pb-0 relative">
          <Routes>
            <Route
              index
              element={
                isInConversation ? (
                  <ChatArea
                    messages={messages}
                    isLoading={isLoading}
                    chatContainerRef={chatContainerRef}
                    onSendMessage={handleSendMessage}
                    uploadedFiles={uploadedFiles}
                    webSearchEnabled={webSearchEnabled}
                    onWebSearchToggle={setWebSearchEnabled}
                  />
                ) : (
                  <>
                    <WelcomeSection />
                    {activeWorkbench && (
                      <ActionCards
                        onQuestionCardClick={handleQuestionCardClick}
                      />
                    )}
                  </>
                )
              }
            />
            <Route
              path="home"
              element={
                <>
                  <WelcomeSection />
                  {activeWorkbench && (
                    <ActionCards
                      onQuestionCardClick={handleQuestionCardClick}
                    />
                  )}
                </>
              }
            />
            <Route path="settings" element={<Settings />} />
            <Route path="join" element={<JoinWorkbench />} />
            <Route path="workbenches" element={<Workbenches />} />
            <Route path="workbench" element={<WorkbenchLayout />}>
              <Route path="sales" element={<SalesFlow />} />
              <Route path="purchases" element={<PurchasesFlow />} />
              <Route path="generator/:type" element={<GeneratorPage />} />
              <Route path="business-engine" element={<Navigate to="/dashboard/workbench/sales" replace />} />
              <Route path="ledger" element={<LedgerView />} />
              <Route path="members" element={<Members />} />
              <Route path="parties" element={<Parties />} />
              <Route path="coa" element={<COA />} />
              <Route path="doc-vault" element={<DocVault />} />
              <Route path="ops" element={<OPS />} />
              <Route path="settings" element={<WorkbenchSettings />} />
            </Route>
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>

        {!isInConversation &&
          !location.pathname.includes("/settings") &&
          !location.pathname.includes("/workbenches") &&
          !location.pathname.includes("/workbench/") && (
            <ChatInput
              ref={chatInputRef}
              onSendMessage={handleSendMessage}
              webSearchEnabled={webSearchEnabled}
              uploadedFiles={uploadedFiles}
              onWebSearchToggle={setWebSearchEnabled}
            />
          )}

        {/* Floating Help Button - Removed, now in Settings */}
      </div>

      {/* Onboarding Tour - Auto-shows for new users on any device */}
      <OnboardingTour
        isOpen={showTour}
        onClose={() => setShowTour(false)}
        onComplete={handleTourComplete}
      />
    </div>
  );
}
