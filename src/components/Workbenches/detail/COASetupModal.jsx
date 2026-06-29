import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

import { 
  BsX as IconX, 
  BsTag as IconTag, 
  BsGrid as IconGrid, 
  BsCheckCircleFill as IconCheckCircleFill, 
  BsArrowRepeat as IconArrowRepeat, 
  BsFileEarmarkPdf as IconFileEarmarkPdf, 
  BsCloudArrowUp as IconCloudArrowUp,
  BsLaptop as IconLaptop, 
  BsCheck as IconCheck, 
  BsPlusLg as IconPlusLg,
  BsArrowRight as IconArrowRight,
  BsBookHalf as IconBookHalf
} from "react-icons/bs";
import { toast } from "react-hot-toast";

const INDUSTRY_COA_TEMPLATES = {
  services: {
    technology: [
      { type: 'revenue', sub_account: 'Operating Revenue', name: 'SaaS Revenue' },
      { type: 'revenue', sub_account: 'Operating Revenue', name: 'Consulting Income' },
      { type: 'revenue', sub_account: 'Operating Revenue', name: 'Service Fees' },
      { type: 'expense', sub_account: 'Software & Subscriptions', name: 'Cloud Hosting' },
      { type: 'expense', sub_account: 'Software & Subscriptions', name: 'Software Subscriptions' },
      { type: 'expense', sub_account: 'Salaries & Wages', name: 'Employee Salaries' },
      { type: 'expense', sub_account: 'Marketing & Advertising', name: 'Digital Ads' },
      { type: 'asset', sub_account: 'Bank Accounts', name: 'HDFC Bank Account' },
      { type: 'asset', sub_account: 'Accounts Receivable (AR)', name: 'Accounts Receivable' },
      { type: 'liability', sub_account: 'Accounts Payable (AP)', name: 'Accounts Payable' },
    ],
    default: [
      { type: 'revenue', sub_account: 'Operating Revenue', name: 'Service Revenue' },
      { type: 'revenue', sub_account: 'Other Income', name: 'Other Income' },
      { type: 'expense', sub_account: 'Rent', name: 'Office Rent' },
      { type: 'expense', sub_account: 'Salaries & Wages', name: 'Salaries & Wages' },
      { type: 'asset', sub_account: 'Bank Accounts', name: 'Cash & Bank' },
      { type: 'liability', sub_account: 'Accounts Payable (AP)', name: 'Accounts Payable' },
    ],
  },
  manufacturing: {
    default: [
      { type: 'revenue', sub_account: 'Operating Revenue', name: 'Product Sales' },
      { type: 'expense', sub_account: 'Cost of Goods Sold (COGS)', name: 'Raw Materials' },
      { type: 'expense', sub_account: 'Cost of Goods Sold (COGS)', name: 'Direct Labour' },
      { type: 'expense', sub_account: 'Salaries & Wages', name: 'Salaries & Wages' },
      { type: 'asset', sub_account: 'Inventory', name: 'Raw Material Inventory' },
      { type: 'asset', sub_account: 'Bank Accounts', name: 'SBI Bank Account' },
      { type: 'liability', sub_account: 'Accounts Payable (AP)', name: 'Accounts Payable' },
    ],
  },
  trading: {
    default: [
      { type: 'revenue', sub_account: 'Operating Revenue', name: 'Sales Revenue' },
      { type: 'expense', sub_account: 'Cost of Goods Sold (COGS)', name: 'Inventory Purchases' },
      { type: 'expense', sub_account: 'Cost of Goods Sold (COGS)', name: 'Logistics & Freight' },
      { type: 'asset', sub_account: 'Inventory', name: 'Stock Inventory' },
      { type: 'asset', sub_account: 'Bank Accounts', name: 'HDFC Current Account' },
      { type: 'liability', sub_account: 'Accounts Payable (AP)', name: 'Accounts Payable' },
    ],
  },
  ecommerce: {
    default: [
      { type: 'revenue', sub_account: 'Operating Revenue', name: 'Online Sales' },
      { type: 'revenue', sub_account: 'Operating Revenue', name: 'Marketplace Revenue' },
      { type: 'expense', sub_account: 'Cost of Goods Sold (COGS)', name: 'Product Cost' },
      { type: 'expense', sub_account: 'Cost of Goods Sold (COGS)', name: 'Shipping & Fulfillment' },
      { type: 'expense', sub_account: 'Software & Subscriptions', name: 'Platform Fees' },
      { type: 'asset', sub_account: 'Inventory', name: 'Inventory Stock' },
      { type: 'asset', sub_account: 'Bank Accounts', name: 'Razorpay Escrow A/c' },
      { type: 'liability', sub_account: 'Accounts Payable (AP)', name: 'Accounts Payable' },
    ],
  },
  others: {
    default: [
      { type: 'revenue', sub_account: 'Operating Revenue', name: 'Primary Revenue' },
      { type: 'revenue', sub_account: 'Other Income', name: 'Other Income' },
      { type: 'expense', sub_account: 'Rent', name: 'General Rent' },
      { type: 'expense', sub_account: 'Salaries & Wages', name: 'Staff Salaries' },
      { type: 'asset', sub_account: 'Bank Accounts', name: 'Cash & Bank' },
      { type: 'liability', sub_account: 'Accounts Payable (AP)', name: 'Accounts Payable' },
    ],
  },
};

const PILLAR_MAP = {
  asset: "ASSETS",
  liability: "LIABILITIES",
  equity: "EQUITY",
  revenue: "REVENUE",
  expense: "EXPENSES"
};

const TYPE_COLORS = {
  revenue: { bg: 'rgba(16, 185, 129, 0.05)', border: 'rgba(16, 185, 129, 0.2)', text: '#10B981' },
  expense: { bg: 'rgba(239, 68, 68, 0.05)', border: 'rgba(239, 68, 68, 0.2)', text: '#EF4444' },
  asset: { bg: 'rgba(59, 130, 246, 0.05)', border: 'rgba(59, 130, 246, 0.2)', text: '#3B82F6' },
  liability: { bg: 'rgba(245, 158, 11, 0.05)', border: 'rgba(245, 158, 11, 0.2)', text: '#F59E0B' },
  equity: { bg: 'rgba(139, 92, 246, 0.05)', border: 'rgba(139, 92, 246, 0.2)', text: '#8B5CF6' }
};

export default function COASetupModal({ isOpen, onClose, workbench, onSuccess }) {
  const [activeTab, setActiveTab] = useState("starter"); // starter, custom, pl, zoho
  const [loading, setLoading] = useState(false);
  const [masterAccounts, setMasterAccounts] = useState([]);
  const [masterSubAccounts, setMasterSubAccounts] = useState([]);
  const [loadingLookups, setLoadingLookups] = useState(true);

  // Customized templates state to let users delete/add suggested items
  const [customizedTemplates, setCustomizedTemplates] = useState([]);
  const [quickAdd, setQuickAdd] = useState({ type: "expense", sub_account: "", name: "" });

  // Form state for Custom Label
  const [customForm, setCustomForm] = useState({
    name: "",
    type: "expense",
    master_sub_account_id: "",
    description: "",
  });

  // P&L Statement Import states
  const [plFile, setPlFile] = useState(null);
  const [importStep, setImportStep] = useState("upload"); // upload, scanning, select
  const [extractedAccounts, setExtractedAccounts] = useState([]);
  const [selectedExtracted, setSelectedExtracted] = useState(new Set());
  const fileInputRef = useRef(null);

  // Zoho Books Import states
  const [zohoStep, setZohoStep] = useState("connect"); // connect, connecting, select
  const [zohoAccounts, setZohoAccounts] = useState([]);
  const [selectedZoho, setSelectedZoho] = useState(new Set());

  const industry = workbench?.industry || "services";
  const sector = workbench?.sector || "technology";
  const industryTemplates = INDUSTRY_COA_TEMPLATES[industry] || INDUSTRY_COA_TEMPLATES.others;
  const template = industryTemplates[sector] || industryTemplates.default || INDUSTRY_COA_TEMPLATES.others.default;

  useEffect(() => {
    if (isOpen) {
      fetchLookups();
      resetStates();
    }
  }, [isOpen]);

  useEffect(() => {
    if (template) {
      setCustomizedTemplates(template.map((item, idx) => ({ ...item, tempId: idx })));
    }
  }, [template, isOpen]);

  const resetStates = () => {
    setActiveTab("starter");
    setImportStep("upload");
    setPlFile(null);
    setExtractedAccounts([]);
    setSelectedExtracted(new Set());
    setZohoStep("connect");
    setZohoAccounts([]);
    setSelectedZoho(new Set());
    setCustomForm({
      name: "",
      type: "expense",
      master_sub_account_id: "",
      description: "",
    });
    setQuickAdd({ type: "expense", sub_account: "", name: "" });
  };

  const fetchLookups = async () => {
    try {
      setLoadingLookups(true);
      const [accsRes, subsRes] = await Promise.all([
        fetch("http://localhost:8000/api/ledger/master-accounts"),
        fetch("http://localhost:8000/api/ledger/master-sub-accounts")
      ]);
      if (!accsRes.ok || !subsRes.ok) throw new Error("Failed to load schema groups");
      
      const accs = await accsRes.json();
      const subs = await subsRes.json();
      
      setMasterAccounts(accs);
      setMasterSubAccounts(subs);
      
      // Init custom form default
      const expenseAcc = accs.find(acc => acc.account_name.toUpperCase() === "EXPENSES");
      if (expenseAcc) {
        const firstSub = subs.find(sub => sub.master_account_id === expenseAcc.id);
        if (firstSub) {
          setCustomForm(prev => ({
            ...prev,
            master_sub_account_id: firstSub.id
          }));
        }
      }
    } catch (err) {
      console.error("Error fetching ledger groups:", err);
      toast.error("Failed to load Chart of Accounts lookup data");
    } finally {
      setLoadingLookups(false);
    }
  };

  const handleCustomTypeChange = (type) => {
    const targetName = PILLAR_MAP[type] || "EXPENSES";
    const targetAcc = masterAccounts.find(acc => acc.account_name.toUpperCase() === targetName);
    const firstSub = targetAcc 
      ? masterSubAccounts.find(sub => sub.master_account_id === targetAcc.id)
      : null;
      
    setCustomForm({
      ...customForm,
      type,
      master_sub_account_id: firstSub ? firstSub.id : ""
    });
  };

  const selectedMasterAcc = masterAccounts.find(acc => acc.account_name.toUpperCase() === (PILLAR_MAP[customForm.type] || "EXPENSES"));
  const filteredSubAccounts = selectedMasterAcc
    ? masterSubAccounts.filter(sub => sub.master_account_id === selectedMasterAcc.id)
    : [];

  // Add a suggested label inline
  const handleQuickAdd = () => {
    if (!quickAdd.name || !quickAdd.sub_account) {
      toast.error("Please fill in sub-account and name");
      return;
    }
    const newItem = {
      type: quickAdd.type,
      sub_account: quickAdd.sub_account.trim(),
      name: quickAdd.name.trim(),
      tempId: Date.now() + Math.random()
    };
    setCustomizedTemplates(prev => [...prev, newItem]);
    setQuickAdd({ type: "expense", sub_account: "", name: "" });
    toast.success("Added to template list!");
  };

  // 1. Customized Starter Seeding
  const handleSeedDefaults = async () => {
    if (customizedTemplates.length === 0) {
      toast.error("Template list is empty. Add some labels or use another setup option.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:8000/api/ledger/labels/seed/${workbench.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          labels: customizedTemplates.map(t => ({
            type: t.type,
            sub_account: t.sub_account,
            name: t.name
          }))
        })
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Seeding API failed");
      }
      toast.success("Default Chart of Accounts seeded successfully!");
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("Seeding failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // 2. Custom Category Creation
  const handleCreateCustom = async (e) => {
    e.preventDefault();
    if (!customForm.name || !customForm.master_sub_account_id || !selectedMasterAcc) {
      toast.error("Please fill in all required fields");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("http://localhost:8000/api/ledger/labels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workbench_id: workbench.id,
          master_account_id: selectedMasterAcc.id,
          master_sub_account_id: customForm.master_sub_account_id,
          full_account_name: customForm.name,
          description: customForm.description || "",
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || "Failed to create label");
      }

      toast.success("Account category created!");
      onSuccess?.();
      // Keep modal open but clear form to let them add more custom labels
      setCustomForm(prev => ({
        ...prev,
        name: "",
        description: "",
      }));
    } catch (err) {
      console.error(err);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Helper: Find closest master/sub IDs to map string-based imports to ontology structure
  const findOntologyIds = (type, subAccountName) => {
    const pillarName = PILLAR_MAP[type.toLowerCase()] || "EXPENSES";
    const masterAcc = masterAccounts.find(acc => acc.account_name.toUpperCase() === pillarName);
    if (!masterAcc) return { master_id: null, sub_id: null };

    const subs = masterSubAccounts.filter(s => s.master_account_id === masterAcc.id);
    let subAcc = subs.find(s => s.sub_account_name.toLowerCase().includes(subAccountName.toLowerCase()));
    if (!subAcc && subs.length > 0) subAcc = subs[0];

    return {
      master_id: masterAcc.id,
      sub_id: subAcc ? subAcc.id : null
    };
  };

  // Helper: Batch import a list of categories
  const batchImportAccounts = async (accountsToImport) => {
    setLoading(true);
    let successCount = 0;
    try {
      for (const item of accountsToImport) {
        const { master_id, sub_id } = findOntologyIds(item.type, item.sub_account);
        if (!master_id || !sub_id) continue;

        const response = await fetch("http://localhost:8000/api/ledger/labels", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workbench_id: workbench.id,
            master_account_id: master_id,
            master_sub_account_id: sub_id,
            full_account_name: item.name,
            description: `Imported from ${item.source}`,
          }),
        });
        if (response.ok) successCount++;
      }
      toast.success(`Successfully imported ${successCount} accounts into your ledger!`);
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("Import failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // 3. P&L Import Simulation
  const handlePlFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPlFile(file);
      setImportStep("scanning");
      
      setTimeout(() => {
        const extracted = [
          { type: 'revenue', sub_account: 'Operating Revenue', name: 'Export Income', source: 'P&L Statement' },
          { type: 'revenue', sub_account: 'Operating Revenue', name: 'Domestic SaaS Sales', source: 'P&L Statement' },
          { type: 'expense', sub_account: 'Rent', name: 'Office Coworking Rent', source: 'P&L Statement' },
          { type: 'expense', sub_account: 'Software & Subscriptions', name: 'GitHub & Vercel Fees', source: 'P&L Statement' },
          { type: 'expense', sub_account: 'Legal & Professional Fees', name: 'Auditor Retainer', source: 'P&L Statement' },
          { type: 'asset', sub_account: 'Bank Accounts', name: 'ICICI Bank Current A/c', source: 'P&L Statement' },
        ];
        setExtractedAccounts(extracted);
        setSelectedExtracted(new Set(extracted.map((_, i) => i)));
        setImportStep("select");
      }, 2500);
    }
  };

  const toggleExtracted = (idx) => {
    const next = new Set(selectedExtracted);
    if (next.has(idx)) next.delete(idx);
    else next.add(idx);
    setSelectedExtracted(next);
  };

  const handleImportExtracted = () => {
    const list = extractedAccounts.filter((_, idx) => selectedExtracted.has(idx));
    if (list.length === 0) {
      toast.error("Please select at least one account to import");
      return;
    }
    batchImportAccounts(list);
  };

  // 4. Zoho Books Import Simulation
  const handleConnectZoho = () => {
    setZohoStep("connecting");
    setTimeout(() => {
      const zohoList = [
        { type: 'revenue', sub_account: 'Operating Revenue', name: 'Zoho Sales Revenue', source: 'Zoho Books' },
        { type: 'revenue', sub_account: 'Other Income', name: 'Zoho Referral Commissions', source: 'Zoho Books' },
        { type: 'expense', sub_account: 'Marketing & Advertising', name: 'Google AdWords OPEX', source: 'Zoho Books' },
        { type: 'expense', sub_account: 'Salaries & Wages', name: 'Direct Salary Payroll', source: 'Zoho Books' },
        { type: 'asset', sub_account: 'Bank Accounts', name: 'Axis Bank Escrow', source: 'Zoho Books' },
        { type: 'liability', sub_account: 'GST Payable / Tax Payables', name: 'GST Output Liability', source: 'Zoho Books' },
      ];
      setZohoAccounts(zohoList);
      setSelectedZoho(new Set(zohoList.map((_, i) => i)));
      setZohoStep("select");
    }, 2000);
  };

  const toggleZoho = (idx) => {
    const next = new Set(selectedZoho);
    if (next.has(idx)) next.delete(idx);
    else next.add(idx);
    setSelectedZoho(next);
  };

  const handleImportZoho = () => {
    const list = zohoAccounts.filter((_, idx) => selectedZoho.has(idx));
    if (list.length === 0) {
      toast.error("Please select at least one account to import");
      return;
    }
    batchImportAccounts(list);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/85 backdrop-blur-md"
      />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-3xl bg-[#080808] border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[85vh] text-white"
      >
        {/* Close Button */}
        <button 
          onClick={onClose} 
          className="absolute top-6 right-6 p-2 bg-white/5 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-all cursor-pointer z-10"
        >
          <IconX size={20} />
        </button>

        {/* Modal Header */}
        <div className="p-8 pb-4 border-b border-white/5 bg-white/[0.01]">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <IconBookHalf className="text-teal-400" />
            Initialize Chart of Accounts
          </h3>
          <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
            Choose your seeding path to set up the accounting ontology tree. Every transaction maps to these leaf nodes.
          </p>

          {/* Tab Navigation */}
          <div className="flex space-x-1 mt-6 bg-white/5 p-1 rounded-2xl border border-white/5 w-fit">
            {[
              { id: "starter", label: "Starter Template", icon: IconGrid },
              { id: "custom", label: "Create Custom", icon: IconPlusLg },
              { id: "pl", label: "Import Statement (P&L)", icon: IconFileEarmarkPdf },
              { id: "zoho", label: "Zoho Books", icon: IconLaptop },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === tab.id
                    ? "bg-teal-500 text-black shadow-lg"
                    : "text-gray-400 hover:text-gray-200"
                }`}
              >
                <tab.icon size={13} />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 p-8 overflow-y-auto custom-scrollbar min-h-[350px]">
          
          {/* Tab 1: Starter Template */}
          {activeTab === "starter" && (
            <div className="space-y-6">
              <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 space-y-4">
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Suggested starter labels for ({industry} / {sector}) — Hover to delete
                </h4>
                <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar p-1">
                  {customizedTemplates.map((item) => {
                    const color = TYPE_COLORS[item.type] || TYPE_COLORS.expense;
                    return (
                      <div
                        key={item.tempId}
                        className="flex flex-col px-3 py-1.5 rounded-xl border text-[10px] relative group min-w-[120px]"
                        style={{ backgroundColor: color.bg, borderColor: color.border }}
                      >
                        {/* Inline Delete Button */}
                        <button
                          type="button"
                          onClick={() => setCustomizedTemplates(prev => prev.filter(t => t.tempId !== item.tempId))}
                          className="absolute -top-1.5 -right-1.5 p-0.5 bg-red-500/90 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 cursor-pointer shadow-md"
                        >
                          <IconX size={8} />
                        </button>
                        
                        <span className="text-[7px] font-black tracking-widest uppercase" style={{ color: color.text }}>{item.type}</span>
                        <span className="font-bold text-white mt-0.5">{item.name}</span>
                        <span className="text-[9px] text-gray-500 mt-0.5">{item.sub_account}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Quick Add Form inside Starter Tab */}
              <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-4 space-y-3">
                <h5 className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Add customized label to list</h5>
                <div className="flex flex-col sm:flex-row gap-2">
                  <select
                    value={quickAdd.type}
                    onChange={(e) => setQuickAdd({ ...quickAdd, type: e.target.value })}
                    className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-[10px] text-gray-300 focus:outline-none focus:border-teal-500/40"
                  >
                    <option value="revenue" className="bg-[#080808]">Revenue</option>
                    <option value="expense" className="bg-[#080808]">Expense</option>
                    <option value="asset" className="bg-[#080808]">Asset</option>
                    <option value="liability" className="bg-[#080808]">Liability</option>
                    <option value="equity" className="bg-[#080808]">Equity</option>
                  </select>

                  <input
                    type="text"
                    placeholder="Sub-account group (e.g. Bank Accounts)"
                    value={quickAdd.sub_account}
                    onChange={(e) => setQuickAdd({ ...quickAdd, sub_account: e.target.value })}
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-[10px] focus:outline-none focus:border-teal-500/40 text-white"
                  />

                  <input
                    type="text"
                    placeholder="Category Name (e.g. ICICI Bank)"
                    value={quickAdd.name}
                    onChange={(e) => setQuickAdd({ ...quickAdd, name: e.target.value })}
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-[10px] focus:outline-none focus:border-teal-500/40 text-white"
                  />

                  <button
                    type="button"
                    onClick={handleQuickAdd}
                    className="px-4 py-2 bg-teal-500 text-black hover:bg-teal-400 font-bold rounded-xl text-[10px] cursor-pointer active:scale-95 transition-all"
                  >
                    Add
                  </button>
                </div>
              </div>

              <div className="flex justify-center pt-4">
                <button
                  onClick={handleSeedDefaults}
                  disabled={loading || customizedTemplates.length === 0}
                  className="w-full max-w-sm px-6 py-4 bg-teal-500 text-black hover:bg-teal-400 disabled:opacity-50 font-bold rounded-2xl text-xs transition-all shadow-lg shadow-teal-500/10 flex items-center justify-center space-x-2 cursor-pointer active:scale-95"
                >
                  {loading ? (
                    <><IconArrowRepeat className="animate-spin text-black" size={14} /> <span>Creating customized ledger...</span></>
                  ) : (
                    <><IconCheckCircleFill size={14} /> <span>Auto-Seed Starter Labels</span></>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Tab 2: Custom Category Form */}
          {activeTab === "custom" && (
            <form onSubmit={handleCreateCustom} className="space-y-5 max-w-lg mx-auto">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Account Pillar (Type)</label>
                <div className="grid grid-cols-5 gap-2">
                  {Object.keys(PILLAR_MAP).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => handleCustomTypeChange(t)}
                      className={`px-2 py-2.5 rounded-xl text-[9px] font-bold uppercase tracking-wider border transition-all cursor-pointer ${
                        customForm.type === t
                          ? "bg-teal-500/10 border-teal-500/40 text-teal-400"
                          : "bg-white/5 border-white/5 text-gray-500 hover:text-gray-300"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Sub-Account Group</label>
                <div className="flex flex-wrap gap-1.5 p-4 bg-white/[0.02] border border-white/5 rounded-2xl min-h-[80px]">
                  {loadingLookups ? (
                    <div className="w-full flex items-center justify-center py-4">
                      <div className="w-5 h-5 border-2 border-teal-500/20 border-t-teal-500 rounded-full animate-spin" />
                    </div>
                  ) : filteredSubAccounts.length === 0 ? (
                    <span className="text-xs text-gray-600 font-bold m-auto">No groups found under this pillar</span>
                  ) : (
                    filteredSubAccounts.map((sub) => (
                      <button
                        key={sub.id}
                        type="button"
                        onClick={() => setCustomForm({ ...customForm, master_sub_account_id: sub.id })}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border cursor-pointer ${
                          customForm.master_sub_account_id === sub.id
                            ? "bg-teal-500/20 border-teal-500/40 text-teal-300"
                            : "bg-white/5 border-transparent text-gray-500 hover:text-gray-300"
                        }`}
                      >
                        {sub.sub_account_name}
                      </button>
                    ))
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Category Label Name</label>
                <div className="relative">
                  <IconTag className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Server Hosting, Office Rent, Consulting Income"
                    value={customForm.name}
                    onChange={(e) => setCustomForm({ ...customForm, name: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:border-teal-500/50 text-white transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Description (Optional)</label>
                <input
                  type="text"
                  placeholder="Additional ledger context..."
                  value={customForm.description}
                  onChange={(e) => setCustomForm({ ...customForm, description: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-teal-500/50 text-white transition-all"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading || loadingLookups || !customForm.name}
                  className="w-full px-6 py-3.5 bg-teal-500 text-black rounded-2xl text-xs font-bold hover:bg-teal-400 transition-all shadow-lg shadow-teal-500/10 disabled:opacity-50 cursor-pointer active:scale-95"
                >
                  {loading ? "Creating Category..." : "Create Custom Label"}
                </button>
              </div>
            </form>
          )}

          {/* Tab 3: P&L Statement Import */}
          {activeTab === "pl" && (
            <div className="space-y-6">
              {importStep === "upload" && (
                <div className="max-w-md mx-auto space-y-4 text-center">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-white/10 hover:border-teal-500/40 bg-white/[0.01] hover:bg-teal-500/[0.02] rounded-3xl p-10 cursor-pointer transition-all flex flex-col items-center justify-center space-y-3"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      onChange={handlePlFileChange}
                      accept=".pdf,.xls,.xlsx"
                    />
                    <div className="p-4 bg-white/5 rounded-full text-gray-400">
                      <IconCloudArrowUp size={28} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">Upload Profit & Loss or Balance Sheet</h4>
                      <p className="text-[10px] text-gray-500 mt-1">PDF, XLS or XLSX up to 10MB</p>
                    </div>
                  </div>
                </div>
              )}

              {importStep === "scanning" && (
                <div className="flex flex-col items-center justify-center py-12 space-y-4">
                  <IconArrowRepeat className="animate-spin text-teal-400" size={36} />
                  <div className="text-center">
                    <p className="text-xs font-bold text-white uppercase tracking-wider">Parsing Financial Statement...</p>
                    <p className="text-[10px] text-gray-500 mt-1">Mapping line items to standard ontology tree...</p>
                  </div>
                </div>
              )}

              {importStep === "select" && (
                <div className="space-y-6 max-w-xl mx-auto">
                  <div className="bg-white/[0.01] border border-white/5 rounded-2xl overflow-hidden">
                    <div className="px-6 py-4 border-b border-white/5 bg-white/[0.01] flex justify-between items-center">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Extracted Categories ({extractedAccounts.length})</span>
                      <span className="text-[10px] text-gray-500">{selectedExtracted.size} selected</span>
                    </div>

                    <div className="divide-y divide-white/[0.02] max-h-60 overflow-y-auto custom-scrollbar">
                      {extractedAccounts.map((item, idx) => {
                        const color = TYPE_COLORS[item.type] || TYPE_COLORS.expense;
                        const isSelected = selectedExtracted.has(idx);
                        return (
                          <div 
                            key={idx}
                            onClick={() => toggleExtracted(idx)}
                            className="px-6 py-3.5 hover:bg-white/[0.02] transition-all flex items-center justify-between cursor-pointer group"
                          >
                            <div className="flex items-center space-x-4">
                              <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                                isSelected ? "bg-teal-500 border-teal-500 text-black" : "border-white/20 group-hover:border-white/40"
                              }`}>
                                {isSelected && <IconCheck size={14} />}
                              </div>
                              <div className="flex flex-col">
                                <span className="text-xs font-bold text-white">{item.name}</span>
                                <span className="text-[9px] text-gray-500 mt-0.5">{item.sub_account}</span>
                              </div>
                            </div>
                            <span className="px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider" style={{ backgroundColor: color.bg, color: color.text, borderColor: color.border, borderWidth: 1 }}>
                              {item.type}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex space-x-3">
                    <button
                      onClick={() => setImportStep("upload")}
                      className="flex-1 px-6 py-3.5 border border-white/10 rounded-2xl text-xs font-bold text-gray-400 hover:bg-white/5 transition-all cursor-pointer"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleImportExtracted}
                      disabled={loading}
                      className="flex-[2] px-6 py-3.5 bg-teal-500 text-black rounded-2xl text-xs font-bold hover:bg-teal-400 transition-all shadow-lg disabled:opacity-50 cursor-pointer flex items-center justify-center space-x-2"
                    >
                      {loading ? <><IconArrowRepeat className="animate-spin text-black" size={14} /> <span>Importing...</span></> : <span>Import Selected Accounts</span>}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab 4: Zoho Books Import */}
          {activeTab === "zoho" && (
            <div className="space-y-6">
              {zohoStep === "connect" && (
                <div className="max-w-md mx-auto text-center py-6 space-y-6">
                  <div className="p-4 bg-blue-500/10 border border-blue-500/20 text-blue-400 w-16 h-16 rounded-3xl flex items-center justify-center mx-auto shadow-lg">
                    <IconLaptop size={32} />
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-base font-bold text-white">Import from Zoho Books</h4>
                    <p className="text-xs text-gray-500 leading-relaxed max-w-sm mx-auto">
                      Connect your Zoho Books organization to dynamically pull your Chart of Accounts schema directly.
                    </p>
                  </div>
                  <button
                    onClick={handleConnectZoho}
                    className="px-8 py-3.5 bg-blue-500 text-white hover:bg-blue-400 font-bold rounded-2xl text-xs transition-all shadow-lg shadow-blue-500/15 flex items-center justify-center space-x-2 cursor-pointer active:scale-95 mx-auto"
                  >
                    <span>Connect Zoho Books</span>
                    <IconArrowRight />
                  </button>
                </div>
              )}

              {zohoStep === "connecting" && (
                <div className="flex flex-col items-center justify-center py-12 space-y-4">
                  <IconArrowRepeat className="animate-spin text-blue-400" size={36} />
                  <div className="text-center">
                    <p className="text-xs font-bold text-white uppercase tracking-wider">Authenticating with Zoho secure portal...</p>
                    <p className="text-[10px] text-gray-500 mt-1">Retrieving Chart of Accounts schema...</p>
                  </div>
                </div>
              )}

              {zohoStep === "select" && (
                <div className="space-y-6 max-w-xl mx-auto">
                  <div className="bg-white/[0.01] border border-white/5 rounded-2xl overflow-hidden">
                    <div className="px-6 py-4 border-b border-white/5 bg-white/[0.01] flex justify-between items-center">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Zoho Books Accounts ({zohoAccounts.length})</span>
                      <span className="text-[10px] text-gray-500">{selectedZoho.size} selected</span>
                    </div>

                    <div className="divide-y divide-white/[0.02] max-h-60 overflow-y-auto custom-scrollbar">
                      {zohoAccounts.map((item, idx) => {
                        const color = TYPE_COLORS[item.type] || TYPE_COLORS.expense;
                        const isSelected = selectedZoho.has(idx);
                        return (
                          <div 
                            key={idx}
                            onClick={() => toggleZoho(idx)}
                            className="px-6 py-3.5 hover:bg-white/[0.02] transition-all flex items-center justify-between cursor-pointer group"
                          >
                            <div className="flex items-center space-x-4">
                              <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                                isSelected ? "bg-teal-500 border-teal-500 text-black" : "border-white/20 group-hover:border-white/40"
                              }`}>
                                {isSelected && <IconCheck size={14} />}
                              </div>
                              <div className="flex flex-col">
                                <span className="text-xs font-bold text-white">{item.name}</span>
                                <span className="text-[9px] text-gray-500 mt-0.5">{item.sub_account}</span>
                              </div>
                            </div>
                            <span className="px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider" style={{ backgroundColor: color.bg, color: color.text, borderColor: color.border, borderWidth: 1 }}>
                              {item.type}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex space-x-3">
                    <button
                      onClick={() => setZohoStep("connect")}
                      className="flex-1 px-6 py-3.5 border border-white/10 rounded-2xl text-xs font-bold text-gray-400 hover:bg-white/5 transition-all cursor-pointer"
                    >
                      Disconnect
                    </button>
                    <button
                      onClick={handleImportZoho}
                      disabled={loading}
                      className="flex-[2] px-6 py-3.5 bg-teal-500 text-black rounded-2xl text-xs font-bold hover:bg-teal-400 transition-all shadow-lg disabled:opacity-50 cursor-pointer flex items-center justify-center space-x-2"
                    >
                      {loading ? <><IconArrowRepeat className="animate-spin text-black" size={14} /> <span>Importing...</span></> : <span>Import Zoho Accounts</span>}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </motion.div>
    </div>
  );
}
