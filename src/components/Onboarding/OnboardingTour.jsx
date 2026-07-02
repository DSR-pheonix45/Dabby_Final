import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../lib/supabase";
import {
  BsX,
  BsArrowRight,
  BsArrowLeft,
  BsCheck2,
  BsChat,
  BsGear,
  BsLightning,
  BsStars,
  BsRocket,
  BsFileEarmark,
  BsSearch,
  BsBuilding,
  BsShieldCheck,
  BsFolder2,
  BsArrowLeftRight,
  BsArrowUpRight,
} from "react-icons/bs";

// 1. Dashboard Steps (Pre-workbench creation)
const dashboardTourSteps = [
  {
    id: "sidebar",
    type: "spotlight",
    route: "/dashboard",
    target: '[data-tour="sidebar"]',
    position: "right",
    title: "Global Sidebar Navigation",
    description: "Your main command center. Easily switch between Dabby Chat, your Workbenches list, and settings from here.",
    icon: BsSearch,
    tip: "Use the toggle button at the bottom of the sidebar to collapse it and gain more screen space.",
  },
  {
    id: "chat-input",
    type: "spotlight",
    route: "/dashboard",
    target: '[data-tour="chat-input"]',
    position: "top",
    title: "Ask Dabby AI Consultant",
    description: "Type financial questions in natural language. Use the paperclip icon to upload spreadsheets/PDFs or toggle Web Search for real-time internet context.",
    icon: BsChat,
    tip: 'Try asking: "What are my cash margins?" or "Compare last quarter expenses."',
  },
  {
    id: "workbenches-section",
    type: "spotlight",
    route: "/dashboard",
    target: '[data-tour="workbenches-section"]',
    position: "right",
    title: "Workbenches & Companies",
    description: "Manage isolated workspaces for specific companies. Each workbench configures its own ledger, custom counterparties, and documents.",
    icon: BsBuilding,
    tip: "Hover over the Workbenches section to view and jump directly to recently active companies.",
  },
  {
    id: "dashboard-complete",
    type: "modal",
    route: "/dashboard",
    title: "Part 1 Complete!",
    subtitle: "Dabby Global Operations",
    description: "You have mastered the global workspace layout! Next, let's explore how a dedicated company workbench functions.",
    icon: BsCheck2,
    isPart1Complete: true,
  }
];

// 3. First Trade workflow — Upload → OCR → Ruleset → Review → Execute → COA
const firstTradeTourSteps = [
  {
    id: "ft-intro",
    type: "modal",
    title: "Your First Trade in 6 Steps",
    subtitle: "Upload → Analyze → Map → Review → Execute → See Results",
    description: "This guided walkthrough shows you exactly how a document becomes a committed journal entry in your Chart of Accounts. Follow each step and your first trade will be live in minutes.",
    icon: BsRocket,
    tip: "You can press → arrow key to advance, ← to go back, and Esc to exit at any time.",
  },
  {
    id: "ft-docvault-open",
    type: "spotlight",
    target: '[data-tour="workbench-sidebar"]',
    position: "right",
    title: "Step 1 — Open Doc Vault",
    description: "Click 'Doc Vault' in the left Architecture panel. This is where all your financial documents live — invoices, receipts, bank statements.",
    icon: BsFolder2,
    tip: "Doc Vault supports PDFs, images (JPG/PNG), Excel files, and ZIP archives of multiple documents.",
    action: { label: "Open Doc Vault", tab: "DocVault" },
  },
  {
    id: "ft-upload",
    type: "spotlight",
    target: '[data-tour="workbench-content"]',
    position: "top",
    title: "Step 1 — Upload a Document",
    description: "Drag and drop a vendor invoice, expense receipt, or any financial document into the upload zone. Dabby's OCR engine will automatically extract the key fields.",
    icon: BsFolder2,
    tip: "Start with a vendor invoice (PDF) for the best demonstration. Dabby extracts: amount, party, date, GST, line items.",
    action: { label: "Switch to Doc Vault", tab: "DocVault" },
  },
  {
    id: "ft-ocr-wait",
    type: "modal",
    title: "Step 2 — AI Analyzes Your Document",
    subtitle: "OCR + Gemini extraction in progress",
    description: "After upload, Dabby runs the document through Google Vision OCR + Gemini to extract a structured analysis note. This usually takes 10–30 seconds.\n\nThe note contains: document_type, parties, amounts, line items, and confidence score.",
    icon: BsStars,
    tip: "You'll see the document card update from 'Processing' to showing the extracted amount and party name once OCR completes.",
  },
  {
    id: "ft-ruleset",
    type: "spotlight",
    target: '[data-tour="workbench-sidebar"]',
    position: "right",
    title: "Step 3 — Check Your Rulesets",
    description: "Click 'Rulesets' in the sidebar. Rulesets are the rules that decide: does this document auto-approve or go to Needs Review? You can create rules based on amount, document type, party name, and more.",
    icon: BsGear,
    tip: "For your first trade, a default ruleset may already exist. If nothing matches, the trade lands in 'Needs Review' automatically — that's fine!",
    action: { label: "Open Rulesets", tab: "Rulesets" },
  },
  {
    id: "ft-trade-engine",
    type: "spotlight",
    target: '[data-tour="workbench-sidebar"]',
    position: "right",
    title: "Step 4 — Open Trade Engine",
    description: "Click 'Trade Engine' in the sidebar. The OCR analysis note was automatically pushed here. Look under 'Needs Review' tab — your document should appear there as a structured trade.",
    icon: BsArrowLeftRight,
    tip: "If the trade auto-matched a Ruleset and the conditions passed, it will appear in 'Approved' instead.",
    action: { label: "Open Trade Engine", tab: "TradeEngine" },
  },
  {
    id: "ft-review",
    type: "spotlight",
    target: '[data-tour="workbench-content"]',
    position: "top",
    title: "Step 4 — Review the Trade",
    description: "Click on the trade card. The right panel shows the extracted fields (amount, party, date, type). Review them and fill in any missing fields. Dabby pre-fills everything it could extract.",
    icon: BsArrowLeftRight,
    tip: "The 'Confidence' badge shows how sure the AI is. Below 80%? Check the fields manually before approving.",
  },
  {
    id: "ft-execute",
    type: "modal",
    title: "Step 5 — Approve & Execute",
    subtitle: "Commit the trade to the ledger",
    description: "Once you're satisfied with the fields, click 'Approve & Execute'. Dabby will:\n\n① Create the bill or invoice record\n② Generate the double-entry journal (Dr Expense / Cr Accounts Payable)\n③ Commit it to the immutable ledger\n④ Recompute your Chart of Accounts balances",
    icon: BsLightning,
    tip: "If execution fails (e.g. missing COA accounts), a guided Resolve dialog will appear with exact steps to fix it.",
  },
  {
    id: "ft-coa",
    type: "spotlight",
    target: '[data-tour="workbench-sidebar"]',
    position: "right",
    title: "Step 6 — See Your COA Update",
    description: "Click 'Chart of Accounts'. Your Expense account and Accounts Payable balance now reflect the trade. The Financial Ledger is your live, real-time view of committed transactions.",
    icon: BsShieldCheck,
    tip: "The NET PROFIT figure at the top of the COA updates automatically. Negative = expenses exceed revenue so far.",
    action: { label: "Open Chart of Accounts", tab: "COA" },
  },
  {
    id: "ft-complete",
    type: "modal",
    title: "🎉 First Trade Complete!",
    subtitle: "Your ledger is live",
    description: "Congratulations! You've uploaded a document, let Dabby extract it, reviewed the trade, and committed it to your double-entry ledger.\n\nFrom here you can: upload more documents, set up Rulesets for auto-approval, or check the Investor View for business health metrics.",
    icon: BsCheck2,
    isComplete: true,
  },
];



// 2. Workbench Steps (Ontology, Doc Vault, Trade Engine, etc.)
const workbenchTourSteps = [
  {
    id: "workbench-intro",
    type: "modal",
    title: "Active Workbench Tour",
    subtitle: "Isolated Company Architecture",
    description: "Welcome to the Workbench! This environment is designed to manage a single organization's double-entry accounting ledger, legal structures, invoices, and analytics.",
    icon: BsBuilding,
  },
  {
    id: "workbench-sidebar",
    type: "spotlight",
    target: '[data-tour="workbench-sidebar"]',
    position: "right",
    title: "Architecture Navigation",
    description: "Use this internal navigation tree to switch between Chart of Accounts, Document Vault, Trade Engine, Operations, and Settings.",
    icon: BsSearch,
  },
  {
    id: "workbench-coa",
    type: "spotlight",
    target: '[data-tour="workbench-content"]',
    position: "bottom",
    tab: "COA",
    title: "Chart of Accounts (Ledger)",
    description: "Define your company's ontology tree. Standardize assets, liabilities, equity, revenues, and expenses. Dabby maintains a strict double-entry ledger behind the scenes.",
    icon: BsShieldCheck,
  },
  {
    id: "workbench-docvault",
    type: "spotlight",
    target: '[data-tour="workbench-content"]',
    position: "bottom",
    tab: "DocVault",
    title: "Document Vault",
    description: "Secure storage for organizational proofs. Upload vendor invoices, customer bills, or tax files. Dabby's OCR extracts context into structured AI analysis notes.",
    icon: BsFolder2,
  },
  {
    id: "workbench-tradeengine",
    type: "spotlight",
    target: '[data-tour="workbench-content"]',
    position: "bottom",
    tab: "TradeEngine",
    title: "Trade Engine",
    description: "Execute multi-party transactions. Model legal entities, counterparties, contracts, and automate ledger bookings under a zero-trust model.",
    icon: BsArrowLeftRight,
  },
  {
    id: "workbench-ops",
    type: "spotlight",
    target: '[data-tour="workbench-content"]',
    position: "bottom",
    tab: "Ops",
    title: "Operations (Ops)",
    description: "Manage accounts payable (AP) and accounts receivable (AR). Record customer receipts, settle vendor invoices, link attachments, and track custom budgets.",
    icon: BsLightning,
  },
  {
    id: "workbench-investor",
    type: "spotlight",
    target: '[data-tour="workbench-content"]',
    position: "bottom",
    tab: "Investor",
    title: "Investor View & Runway",
    description: "Get real-time business health reports. Analyze cash runway estimations, net worth calculations, and download auditor-ready PDF snapshots.",
    icon: BsArrowUpRight,
  },
  {
    id: "workbench-complete",
    type: "modal",
    title: "You're All Set!",
    subtitle: "Dabby Operations Ready",
    description: "Congratulations! You have completed the systematic onboarding. Start chatting or upload files inside your workbench to begin managing your business.",
    icon: BsCheck2,
    isComplete: true,
  }
];

export default function OnboardingTour({ isOpen, onComplete }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [tourPart, setTourPart] = useState("choice"); // "choice", "dashboard", "workbench", "firstTrade"
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [firstWorkbenchId, setFirstWorkbenchId] = useState(null);
  const [loadingWorkbenches, setLoadingWorkbenches] = useState(true);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Fetch the first available workbench to navigate user for workbench tour
  useEffect(() => {
    if (!isOpen) return;
    
    const fetchWorkbench = async () => {
      try {
        setLoadingWorkbenches(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
        const { data, error } = await supabase
          .from("workbench_members")
          .select("workbench_id")
          .eq("user_id", user.id)
          .limit(1);
          
        if (!error && data && data.length > 0) {
          setFirstWorkbenchId(data[0].workbench_id);
        }
      } catch (err) {
        console.error("Failed to load first workbench for tour:", err);
      } finally {
        setLoadingWorkbenches(false);
      }
    };
    
    fetchWorkbench();
  }, [isOpen]);

  // Reset state on open/close
  useEffect(() => {
    if (isOpen) {
      setTourPart("choice");
      setCurrentStep(0);
    }
  }, [isOpen]);

  // Determine active steps list
  const activeSteps =
    tourPart === "dashboard"   ? dashboardTourSteps  :
    tourPart === "workbench"   ? workbenchTourSteps  :
    tourPart === "firstTrade"  ? firstTradeTourSteps :
    [];
  const step = activeSteps[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === activeSteps.length - 1;
  const progress = activeSteps.length ? ((currentStep + 1) / activeSteps.length) * 100 : 0;

  // Handle route navigation when step changes
  useEffect(() => {
    if (!isOpen || !step?.route) return;

    if (location.pathname !== step.route) {
      setIsNavigating(true);
      navigate(step.route);
      const timer = setTimeout(() => setIsNavigating(false), 500);
      return () => clearTimeout(timer);
    }
  }, [currentStep, tourPart, isOpen, step?.route, navigate, location.pathname]);

  // Handle programmatic tab changes inside workbench or firstTrade tour
  useEffect(() => {
    if (isOpen && (tourPart === "workbench" || tourPart === "firstTrade")) {
      const tab = step?.tab || step?.action?.tab;
      if (tab) {
        window.dispatchEvent(
          new CustomEvent("change-workbench-tab", {
            detail: { tab },
          })
        );
      }
    }
  }, [currentStep, tourPart, step, isOpen]);

  // Spotlight positioning calculations
  useEffect(() => {
    if (!isOpen || isNavigating || step?.type !== "spotlight" || !step?.target) {
      setTargetRect(null);
      return;
    }

    const updateTargetRect = () => {
      const element = document.querySelector(step.target);
      if (element) {
        const rect = element.getBoundingClientRect();
        setTargetRect({
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
          right: rect.right,
          bottom: rect.bottom,
        });
      } else {
        setTargetRect(null);
      }
    };

    const timer = setTimeout(updateTargetRect, 300);
    window.addEventListener("resize", updateTargetRect);
    window.addEventListener("scroll", updateTargetRect, true);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", updateTargetRect);
      window.removeEventListener("scroll", updateTargetRect, true);
    };
  }, [step, isOpen, isNavigating, tourPart]);

  const handleStartDashboardTour = () => {
    setTourPart("dashboard");
    setCurrentStep(0);
    navigate("/dashboard");
  };

  const handleStartWorkbenchTour = () => {
    if (firstWorkbenchId) {
      setTourPart("workbench");
      setCurrentStep(0);
      navigate(`/dashboard/workbenches/${firstWorkbenchId}`);
    } else {
      alert("No active workbenches found. Please create a workbench first or start with the Dashboard Tour!");
    }
  };

  const handleStartFirstTrade = () => {
    if (firstWorkbenchId) {
      setTourPart("firstTrade");
      setCurrentStep(0);
      navigate(`/dashboard/workbenches/${firstWorkbenchId}`);
    } else {
      alert("No active workbenches found. Please create a workbench first!");
    }
  };

  const handleNext = useCallback(() => {
    if (step?.isPart1Complete) {
      // Prompt user to switch to workbench tour
      if (firstWorkbenchId) {
        handleStartWorkbenchTour();
      } else {
        onComplete?.();
      }
    } else if (isLastStep) {
      onComplete?.();
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  }, [isLastStep, step, firstWorkbenchId, onComplete]);

  const handlePrev = useCallback(() => {
    if (!isFirstStep) {
      setCurrentStep((prev) => prev - 1);
    }
  }, [isFirstStep]);

  const handleSkip = useCallback(() => {
    onComplete?.();
  }, [onComplete]);

  // Keyboard controls
  useEffect(() => {
    if (!isOpen || tourPart === "choice") return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        handleSkip();
      } else if (e.key === "ArrowRight" || e.key === "Enter") {
        e.preventDefault();
        handleNext();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        handlePrev();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, tourPart, handleNext, handlePrev, handleSkip]);

  if (!isOpen) return null;

  const StepIcon = step?.icon || BsStars;

  const getTooltipStyle = () => {
    if (!targetRect || step?.type !== "spotlight") return {};

    const tooltipWidth = 360;
    const tooltipHeight = 280;
    const gap = 20;
    const padding = 16;

    let left, top;

    switch (step.position) {
      case "right":
        left = targetRect.right + gap;
        top = targetRect.top + targetRect.height / 2 - tooltipHeight / 2;
        if (left + tooltipWidth > window.innerWidth - padding) {
          left = targetRect.left - tooltipWidth - gap;
        }
        break;
      case "left":
        left = targetRect.left - tooltipWidth - gap;
        top = targetRect.top + targetRect.height / 2 - tooltipHeight / 2;
        if (left < padding) {
          left = targetRect.right + gap;
        }
        break;
      case "top":
        left = targetRect.left + targetRect.width / 2 - tooltipWidth / 2;
        top = targetRect.top - tooltipHeight - gap;
        if (top < padding) {
          top = targetRect.bottom + gap;
        }
        break;
      case "bottom":
      default:
        left = targetRect.left + targetRect.width / 2 - tooltipWidth / 2;
        top = targetRect.bottom + gap;
        if (top + tooltipHeight > window.innerHeight - padding) {
          top = targetRect.top - tooltipHeight - gap;
        }
        break;
    }

    left = Math.max(padding, Math.min(left, window.innerWidth - tooltipWidth - padding));
    top = Math.max(padding, Math.min(top, window.innerHeight - tooltipHeight - padding));

    return { left, top, width: tooltipWidth };
  };

  const renderSpotlightOverlay = () => {
    if (step?.type !== "spotlight" || !targetRect) {
      return (
        <div className="fixed inset-0 bg-black/70" onClick={(e) => e.stopPropagation()} />
      );
    }

    const spotPadding = 8;
    const spotRadius = 12;

    return (
      <svg className="fixed inset-0 w-full h-full" style={{ zIndex: 1, pointerEvents: "none" }}>
        <defs>
          <mask id="spotlight-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            <rect
              x={targetRect.left - spotPadding}
              y={targetRect.top - spotPadding}
              width={targetRect.width + spotPadding * 2}
              height={targetRect.height + spotPadding * 2}
              rx={spotRadius}
              ry={spotRadius}
              fill="black"
            />
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(0, 0, 0, 0.75)"
          mask="url(#spotlight-mask)"
          style={{ pointerEvents: "auto" }}
          onClick={(e) => e.stopPropagation()}
        />
      </svg>
    );
  };

  const renderSpotlightHighlight = () => {
    if (step?.type !== "spotlight" || !targetRect) return null;
    const spotPadding = 8;

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="fixed pointer-events-none"
        style={{
          left: targetRect.left - spotPadding,
          top: targetRect.top - spotPadding,
          width: targetRect.width + spotPadding * 2,
          height: targetRect.height + spotPadding * 2,
          zIndex: 2,
        }}
      >
        <div className="absolute inset-0 rounded-xl border-2 border-teal-400 shadow-md" />
        <div className="absolute inset-0 rounded-xl border-2 border-teal-300/50 animate-pulse" />
      </motion.div>
    );
  };

  const renderTourCard = (isSpotlight = false) => (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
      className={`bg-[#0d1117] border border-white/10 rounded-2xl shadow-2xl overflow-hidden ${
        isSpotlight ? "w-[360px]" : "w-full max-w-md"
      }`}
      style={isSpotlight ? { ...getTooltipStyle(), position: "fixed", zIndex: 10 } : {}}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="h-1 bg-white/10">
        <motion.div
          className="h-full bg-gradient-to-r from-teal-500 to-cyan-500"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      <button
        onClick={handleSkip}
        className="absolute top-3 right-3 p-1.5 text-gray-500 hover:text-white hover:bg-white/10 rounded-lg transition-all z-10"
        aria-label="Close tour"
      >
        <BsX className="text-lg" />
      </button>

      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <motion.div
            className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-lg bg-gradient-to-br from-teal-500 to-cyan-600`}
            initial={{ rotate: -10, scale: 0.8 }}
            animate={{ rotate: 0, scale: 1 }}
          >
            <StepIcon className="text-xl text-white" />
          </motion.div>
          <div className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-full">
            <span className="text-xs font-bold text-teal-400">{currentStep + 1}</span>
            <span className="text-xs text-gray-600">/</span>
            <span className="text-xs text-gray-500">{activeSteps.length}</span>
          </div>
        </div>

        <h2 className="text-xl font-bold text-white mb-1">{step?.title}</h2>
        {step?.subtitle && <p className="text-sm font-medium text-teal-400 mb-3">{step.subtitle}</p>}
        <p className="text-sm text-gray-400 leading-relaxed mb-4">{step?.description}</p>
        
        {step?.tip && (
          <div className="p-3 bg-teal-500/10 border border-teal-500/20 rounded-lg">
            <div className="flex items-start gap-2">
              <BsLightning className="text-teal-400 flex-shrink-0 mt-0.5 text-sm" />
              <p className="text-xs text-teal-300">{step.tip}</p>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between px-5 py-3 bg-black/20 border-t border-white/10">
        <button onClick={handleSkip} className="text-xs text-gray-500 hover:text-gray-300 transition-colors">
          Skip tour
        </button>

        <div className="flex items-center gap-2">
          {!isFirstStep && (
            <button
              onClick={handlePrev}
              className="flex items-center gap-1.5 px-3 py-2 text-xs text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all"
            >
              <BsArrowLeft className="text-xs" />
              Back
            </button>
          )}
          <button
            onClick={handleNext}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white rounded-lg transition-all shadow-md bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-400 hover:to-cyan-500"
          >
            {step?.isPart1Complete ? (firstWorkbenchId ? "Start Workbench Tour" : "Finish") : (isLastStep ? "Finish" : "Continue")}
            {isLastStep || step?.isPart1Complete ? (
              <BsCheck2 className="text-sm" />
            ) : (
              <BsArrowRight className="text-xs" />
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );

  const renderChoiceModal = () => (
    <div className="fixed inset-0 flex items-center justify-center p-4" onClick={(e) => e.stopPropagation()}>
      <div className="fixed inset-0 bg-black/85 backdrop-blur-md" onClick={handleSkip} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -20 }}
        className="bg-[#0e1117] border border-white/10 w-full max-w-2xl rounded-3xl shadow-2xl relative z-10 overflow-hidden flex flex-col font-dm-sans"
      >
        <button
          onClick={handleSkip}
          className="absolute top-4 right-4 p-2 text-gray-500 hover:text-white hover:bg-white/5 rounded-xl transition-all"
        >
          <BsX size={20} />
        </button>

        <div className="p-8">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/10 text-teal-400 flex items-center justify-center border border-teal-500/20">
              <BsRocket size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Dabby Product Tour</h2>
              <p className="text-[10px] text-teal-400 font-bold uppercase tracking-wider">Choose Onboarding Mode</p>
            </div>
          </div>

          <p className="text-gray-400 text-sm mb-8 leading-relaxed">
            Welcome to Dabby! Get up to speed with our system by taking a structured product walk. Choose a path below to begin:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Part 1 Choice */}
            <button
              onClick={handleStartDashboardTour}
              className="text-left p-6 rounded-2xl border border-white/5 bg-white/[0.01] hover:bg-teal-500/5 hover:border-teal-500/30 transition-all flex flex-col justify-between group"
            >
              <div className="space-y-4">
                <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center group-hover:bg-teal-500/20 transition-all">
                  <BsChat size={18} />
                </div>
                <h3 className="text-base font-bold text-white group-hover:text-teal-400 transition-colors">
                  1. Dashboard & Chat Tour
                </h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Understand how to toggle web search, attach spreadsheets, and talk with the Dabby AI consultant to query data.
                </p>
              </div>
              <div className="flex items-center text-xs font-bold text-teal-500/60 group-hover:text-teal-400 mt-6 transition-all">
                <span>Start Tour</span>
                <BsArrowRight className="ml-2 transform group-hover:translate-x-1 transition-transform" />
              </div>
            </button>

            {/* Part 2 Choice */}
            <button
              onClick={handleStartWorkbenchTour}
              className="text-left p-6 rounded-2xl border border-white/5 bg-white/[0.01] hover:bg-cyan-500/5 hover:border-cyan-500/30 transition-all flex flex-col justify-between group"
            >
              <div className="space-y-4">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center group-hover:bg-cyan-500/20 transition-all">
                  <BsBuilding size={18} />
                </div>
                <h3 className="text-base font-bold text-white group-hover:text-cyan-400 transition-colors">
                  2. Active Workbench Tour
                </h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Learn how to configure your double-entry Chart of Accounts, upload bills to the Doc Vault, and analyze company MRIs.
                </p>
              </div>
              <div className="flex items-center text-xs font-bold text-cyan-500/60 group-hover:text-cyan-400 mt-6 transition-all">
                <span>Start Tour</span>
                <BsArrowRight className="ml-2 transform group-hover:translate-x-1 transition-transform" />
              </div>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );

  return createPortal(
    <div className="fixed inset-0" style={{ zIndex: 99999 }}>
      {tourPart === "choice" ? (
        renderChoiceModal()
      ) : step?.type === "spotlight" ? (
        <>
          {renderSpotlightOverlay()}
          {renderSpotlightHighlight()}
          {targetRect && renderTourCard(true)}
          {!targetRect && !isNavigating && (
            <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 10 }}>
              <div className="fixed inset-0 bg-black/70" onClick={handleSkip} />
              {renderTourCard(false)}
            </div>
          )}
        </>
      ) : (
        <div className="fixed inset-0 flex items-center justify-center p-4" onClick={(e) => e.stopPropagation()}>
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={handleSkip} />
          <div style={{ position: "relative", zIndex: 10 }}>{renderTourCard(false)}</div>
        </div>
      )}
    </div>,
    document.body
  );
}
