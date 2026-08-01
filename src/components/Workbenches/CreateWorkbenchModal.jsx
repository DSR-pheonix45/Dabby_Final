import React, { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../hooks/useAuth";
import { toast } from "react-hot-toast";
import { accountService } from "../../services/accountService";
import { 
  BsX, 
  BsBuilding, 
  BsGeoAlt, 
  BsReceipt, 
  BsJournalText, 
  BsPeople, 
  BsBoxSeam, 
  BsChevronRight, 
  BsChevronLeft, 
  BsUpload, 
  BsCopy, 
  BsPersonPlus, 
  BsStars, 
  BsCheckCircleFill,
  BsTrash,
  BsFileEarmarkSpreadsheet,
  BsSearch,
  BsPlusLg
} from "react-icons/bs";

const STEPS = [
  { id: 1, title: "Basic Details", icon: BsBuilding },
  { id: 2, title: "Region & Financials", icon: BsGeoAlt },
  { id: 3, title: "Taxes", icon: BsReceipt },
  { id: 4, title: "COA Setup", icon: BsJournalText },
  { id: 5, title: "Users & Roles", icon: BsPeople },
  { id: 6, title: "Inventory", icon: BsBoxSeam }
];

const BUSINESS_TYPES = [
  "Sole Proprietorship",
  "Partnership",
  "LLC",
  "Corporation",
  "Private Limited",
  "LLP",
  "Non-Profit"
];

const INDUSTRIES = [
  "Software & Technology",
  "Retail & E-commerce",
  "Manufacturing & Production",
  "Professional & Legal Services",
  "Healthcare & Life Sciences",
  "Real Estate & Construction",
  "Financial Services & Banking",
  "Food & Beverage",
  "Others"
];

const SECTORS = [
  "Technology",
  "Retail & E-Commerce",
  "Financial Services",
  "Healthcare & Pharma",
  "Manufacturing & Logistics",
  "Construction & Real Estate",
  "Education & Training",
  "Media & Entertainment",
  "Energy & Utilities",
  "Others"
];

const COUNTRIES = [
  { name: "India", code: "IN", currency: "INR" },
  { name: "United States", code: "US", currency: "USD" },
  { name: "United Kingdom", code: "UK", currency: "GBP" },
  { name: "United Arab Emirates", code: "AE", currency: "AED" },
  { name: "Singapore", code: "SG", currency: "SGD" },
  { name: "Canada", code: "CA", currency: "CAD" },
  { name: "Australia", code: "AU", currency: "AUD" },
  { name: "Other", code: "OTHER", currency: "USD" }
];

/**
 * Generates a standard universal double-entry Chart of Accounts in ALERX format
 */
export function generateStandardCoa({ country } = {}) {
  const isIndia = country === "India" || country === "IN";
  const accounts = [
    // ASSETS (A)
    { account_class: "Assets", group_code: "ACO", ledger: "HDFC / Primary Operating Bank Account", label: "Bank Account" },
    { account_class: "Assets", group_code: "ACO", ledger: "Petty Cash Account", label: "Petty Cash" },
    { account_class: "Assets", group_code: "AAR", ledger: "Accounts Receivable (Trade Debtors)", label: "Accounts Receivable" },
    { account_class: "Assets", group_code: "AIN", ledger: "Stock & Merchandise Inventory", label: "Stock Inventory" },
    { account_class: "Assets", group_code: "AFA", ledger: "Office Equipment & Computers", label: "Fixed Assets" },
    { account_class: "Assets", group_code: "AFA", ledger: "Furniture & Office Fixtures", label: "Furniture" },
    ...(isIndia ? [
      { account_class: "Assets", group_code: "AOT", ledger: "Input GST Credit (CGST/SGST/IGST)", label: "Input GST" },
      { account_class: "Assets", group_code: "AOT", ledger: "TDS Receivable / Tax Credits", label: "TDS Credit" }
    ] : [
      { account_class: "Assets", group_code: "AOT", ledger: "Prepaid Expenses & Insurance", label: "Prepaid Expenses" }
    ]),
    { account_class: "Assets", group_code: "AOT", ledger: "Security & Rent Deposits", label: "Security Deposits" },

    // LIABILITIES (L)
    { account_class: "Liabilities", group_code: "LAP", ledger: "Accounts Payable (Trade Creditors)", label: "Accounts Payable" },
    ...(isIndia ? [
      { account_class: "Liabilities", group_code: "LST", ledger: "Output GST Payable (CGST/SGST/IGST)", label: "GST Payable" },
      { account_class: "Liabilities", group_code: "LST", ledger: "TDS Payable Account", label: "TDS Payable" },
      { account_class: "Liabilities", group_code: "LST", ledger: "Provident Fund (PF) & ESI Payable", label: "PF / ESI Payable" }
    ] : [
      { account_class: "Liabilities", group_code: "LST", ledger: "Sales Tax / VAT Payable", label: "Sales Tax Payable" },
      { account_class: "Liabilities", group_code: "LST", ledger: "Payroll Tax Payable", label: "Payroll Taxes" }
    ]),
    { account_class: "Liabilities", group_code: "LDE", ledger: "Bank Credit Line / Overdraft", label: "Bank Overdraft" },
    { account_class: "Liabilities", group_code: "LOT", ledger: "Accrued Expenses & Payables", label: "Accrued Expenses" },

    // EQUITY (E)
    { account_class: "Equity", group_code: "ESC", ledger: "Paid-up Share / Owner Capital", label: "Owner Capital" },
    { account_class: "Equity", group_code: "ERE", ledger: "Retained Earnings", label: "Retained Earnings" },
    { account_class: "Equity", group_code: "EOU", ledger: "Owner / Partner Drawings", label: "Drawings" },

    // REVENUE (R)
    { account_class: "Revenue", group_code: "ROP", ledger: "Sales & Operating Revenue", label: "Sales Revenue" },
    { account_class: "Revenue", group_code: "ROP", ledger: "Service & Consulting Income", label: "Service Income" },
    { account_class: "Revenue", group_code: "RCR", ledger: "Other Income & Interest", label: "Other Income" },

    // EXPENSES (X)
    { account_class: "Expenses", group_code: "XDC", ledger: "Cost of Goods Sold (COGS)", label: "COGS" },
    { account_class: "Expenses", group_code: "XPE", ledger: "Salaries, Wages & Payroll", label: "Salaries" },
    { account_class: "Expenses", group_code: "XPE", ledger: "Employee Staff Welfare & Benefits", label: "Staff Welfare" },
    { account_class: "Expenses", group_code: "XTE", ledger: "Software Subscriptions & Cloud Infra", label: "Tech Subscriptions" },
    { account_class: "Expenses", group_code: "XAD", ledger: "Office Rent & Lease", label: "Office Rent" },
    { account_class: "Expenses", group_code: "XAD", ledger: "Electricity & Utilities", label: "Utilities" },
    { account_class: "Expenses", group_code: "XAD", ledger: "Marketing & Advertising Expenses", label: "Marketing" },
    { account_class: "Expenses", group_code: "XAD", ledger: "Legal, Audit & Professional Fees", label: "Legal & Audit" },
    { account_class: "Expenses", group_code: "XAD", ledger: "Bank Charges & Merchant Fees", label: "Bank Charges" },
    { account_class: "Expenses", group_code: "XAD", ledger: "Depreciation Expense", label: "Depreciation" }
  ];

  const counters = {};
  return accounts.map((acc) => {
    const cls = acc.account_class;
    const grp = acc.group_code;
    const clsPrefix = cls[0].toUpperCase();
    if (!counters[grp]) counters[grp] = 0;
    counters[grp]++;
    const seq = String(counters[grp]).padStart(2, "0");
    return {
      account_class: cls,
      group_code: grp,
      full_code: `${clsPrefix}-${grp}-${seq}`,
      ledger: acc.ledger,
      label: acc.label || acc.ledger
    };
  });
}

const GROUP_CODE_OPTIONS = {
  Assets: [
    { code: "ACO", label: "ACO — Cash & Bank Accounts" },
    { code: "AAR", label: "AAR — Accounts Receivable / Debtors" },
    { code: "AIN", label: "AIN — Stock & Inventory" },
    { code: "AFA", label: "AFA — Fixed Assets & IT Hardware" },
    { code: "AOT", label: "AOT — Other Assets / Tax Credits / Deposits" }
  ],
  Liabilities: [
    { code: "LAP", label: "LAP — Accounts Payable / Creditors" },
    { code: "LST", label: "LST — Statutory Taxes (GST/TDS/PF)" },
    { code: "LDE", label: "LDE — Debt & Bank Loans" },
    { code: "LOT", label: "LOT — Other Liabilities & Provisions" }
  ],
  Equity: [
    { code: "ESC", label: "ESC — Share / Partner / Owner Capital" },
    { code: "ERE", label: "ERE — Retained Earnings" },
    { code: "EOU", label: "EOU — Reserves & Owner Drawings" }
  ],
  Revenue: [
    { code: "ROP", label: "ROP — Operating Sales & Services Revenue" },
    { code: "RCR", label: "RCR — Other Income & Gains" }
  ],
  Expenses: [
    { code: "XDC", label: "XDC — Direct Costs / COGS / Raw Materials" },
    { code: "XPE", label: "XPE — Staff Salaries & Personnel" },
    { code: "XTE", label: "XTE — Software & Tech Subscriptions" },
    { code: "XAD", label: "XAD — Admin & Operating Expenses" }
  ]
};

/**
 * Generates an ALERX formatted Chart of Accounts tailored to:
 * - business_type (Type of firm)
 * - industry
 * - sector
 * - country
 */
export function generateAiRecommendedCoa({ business_type, industry, sector, country }) {
  const bType = (business_type || "Private Limited").toLowerCase();
  const ind = (industry || "Software & Technology").toLowerCase();
  const sec = (sector || "Technology").toLowerCase();
  const isIndia = country === "India" || country === "IN";

  const accounts = [];

  // --- 1. ASSETS (A) ---
  // ACO: Cash & Cash Equivalents
  accounts.push({ account_class: "Assets", group_code: "ACO", ledger: "Operating Bank Account", label: "Bank Account" });
  accounts.push({ account_class: "Assets", group_code: "ACO", ledger: "Petty Cash Account", label: "Petty Cash" });
  if (ind.includes("tech") || ind.includes("retail") || ind.includes("e-commerce") || sec.includes("retail") || sec.includes("technology")) {
    accounts.push({ account_class: "Assets", group_code: "ACO", ledger: "Stripe / Razorpay Payment Gateway Receivables", label: "Gateway Receivables" });
  }

  // AAR: Accounts Receivable (Trade Debtors)
  if (bType.includes("non-profit")) {
    accounts.push({ account_class: "Assets", group_code: "AAR", ledger: "Grants & Pledges Receivable", label: "Grants Receivable" });
  } else if (ind.includes("services") || ind.includes("tech") || sec.includes("technology")) {
    accounts.push({ account_class: "Assets", group_code: "AAR", ledger: "Accounts Receivable (Client Invoices)", label: "Accounts Receivable" });
    accounts.push({ account_class: "Assets", group_code: "AAR", ledger: "Unbilled Professional Fees", label: "Unbilled Revenue" });
  } else if (ind.includes("construction") || sec.includes("construction")) {
    accounts.push({ account_class: "Assets", group_code: "AAR", ledger: "Contract Progress Billing Receivables", label: "Contract Receivables" });
  } else {
    accounts.push({ account_class: "Assets", group_code: "AAR", ledger: "Trade Debtors (Accounts Receivable)", label: "Trade Debtors" });
  }

  // AIN: Inventory
  if (ind.includes("manufacturing") || sec.includes("manufacturing")) {
    accounts.push({ account_class: "Assets", group_code: "AIN", ledger: "Raw Materials Stock Inventory", label: "Raw Materials Stock" });
    accounts.push({ account_class: "Assets", group_code: "AIN", ledger: "Work-in-Progress (WIP) Stock", label: "WIP Stock" });
    accounts.push({ account_class: "Assets", group_code: "AIN", ledger: "Finished Goods Inventory", label: "Finished Goods Stock" });
  } else if (ind.includes("retail") || ind.includes("e-commerce") || ind.includes("food") || sec.includes("retail")) {
    accounts.push({ account_class: "Assets", group_code: "AIN", ledger: "Merchandise & Stock Inventory", label: "Stock Inventory" });
  } else if (ind.includes("construction") || sec.includes("construction")) {
    accounts.push({ account_class: "Assets", group_code: "AIN", ledger: "Construction Work-in-Progress (CWIP)", label: "Construction WIP" });
  }

  // AFA: Fixed Assets
  accounts.push({ account_class: "Assets", group_code: "AFA", ledger: "Computers & IT Hardware Assets", label: "IT Hardware Assets" });
  if (ind.includes("manufacturing") || ind.includes("construction")) {
    accounts.push({ account_class: "Assets", group_code: "AFA", ledger: "Plant, Heavy Machinery & Equipment", label: "Plant & Machinery" });
  } else if (ind.includes("food") || ind.includes("healthcare")) {
    accounts.push({ account_class: "Assets", group_code: "AFA", ledger: "Specialized Kitchen / Medical Equipment", label: "Specialized Equipment" });
  } else {
    accounts.push({ account_class: "Assets", group_code: "AFA", ledger: "Office Furniture & Fixtures", label: "Office Assets" });
  }

  // AOT: Other Assets & Intangibles / Tax Credits
  if (isIndia) {
    accounts.push({ account_class: "Assets", group_code: "AOT", ledger: "Input GST Credit (CGST/SGST/IGST)", label: "GST Input Credit" });
    accounts.push({ account_class: "Assets", group_code: "AOT", ledger: "TDS Receivable / Tax Credits", label: "TDS Credit" });
  } else {
    accounts.push({ account_class: "Assets", group_code: "AOT", ledger: "Prepaid Expenses & Insurance", label: "Prepaid Expenses" });
  }
  if (ind.includes("tech") || sec.includes("technology")) {
    accounts.push({ account_class: "Assets", group_code: "AOT", ledger: "Capitalized R&D & Software IP", label: "Software IP Assets" });
  }
  accounts.push({ account_class: "Assets", group_code: "AOT", ledger: "Security Deposits (Office Rent & Utilities)", label: "Security Deposits" });

  // --- 2. LIABILITIES (L) ---
  // LAP: Accounts Payable (Trade Creditors)
  accounts.push({ account_class: "Liabilities", group_code: "LAP", ledger: "Accounts Payable (Trade Creditors)", label: "Accounts Payable" });
  if (ind.includes("services") || ind.includes("tech") || ind.includes("construction")) {
    accounts.push({ account_class: "Liabilities", group_code: "LAP", ledger: "Subcontractor & Vendor Payables", label: "Vendor Payables" });
  }

  // LST: Statutory Tax Payables
  if (isIndia) {
    accounts.push({ account_class: "Liabilities", group_code: "LST", ledger: "Output GST Payable (CGST/SGST/IGST)", label: "GST Payable" });
    accounts.push({ account_class: "Liabilities", group_code: "LST", ledger: "TDS Payable (Section 194C/194J/194I)", label: "TDS Payable" });
    accounts.push({ account_class: "Liabilities", group_code: "LST", ledger: "Provident Fund (PF) & ESI Payable", label: "PF / ESI Payable" });
  } else {
    accounts.push({ account_class: "Liabilities", group_code: "LST", ledger: "Sales Tax / VAT Payable", label: "Sales Tax Payable" });
    accounts.push({ account_class: "Liabilities", group_code: "LST", ledger: "Payroll Tax Withholdings", label: "Payroll Taxes" });
  }

  // LDE: Debt & Loans
  if (bType.includes("sole") || bType.includes("partnership")) {
    accounts.push({ account_class: "Liabilities", group_code: "LDE", ledger: "Bank Overdraft & Working Capital Line", label: "Bank Overdraft" });
  } else {
    accounts.push({ account_class: "Liabilities", group_code: "LDE", ledger: "Short-term Credit Line & Debt", label: "Short-term Debt" });
    accounts.push({ account_class: "Liabilities", group_code: "LDE", ledger: "Directors' & Promoters' Loan Account", label: "Director Loans" });
  }

  // LOT: Other Liabilities & Provisions
  accounts.push({ account_class: "Liabilities", group_code: "LOT", ledger: "Accrued Operating Expenses", label: "Accrued Expenses" });
  if (ind.includes("tech") || ind.includes("services") || ind.includes("education")) {
    accounts.push({ account_class: "Liabilities", group_code: "LOT", ledger: "Deferred Revenue & Unearned Retainers", label: "Deferred Revenue" });
  }

  // --- 3. EQUITY (E) ---
  if (bType.includes("sole")) {
    accounts.push({ account_class: "Equity", group_code: "ESC", ledger: "Proprietor's Capital Account", label: "Owner Capital" });
    accounts.push({ account_class: "Equity", group_code: "EOU", ledger: "Proprietor's Personal Drawings", label: "Owner Drawings" });
  } else if (bType.includes("partnership") || bType.includes("llp")) {
    accounts.push({ account_class: "Equity", group_code: "ESC", ledger: "Partners' Capital Accounts", label: "Partner Capital" });
    accounts.push({ account_class: "Equity", group_code: "EOU", ledger: "Partners' Current & Drawings Accounts", label: "Partner Drawings" });
  } else if (bType.includes("non-profit")) {
    accounts.push({ account_class: "Equity", group_code: "ESC", ledger: "Corpus Fund & Capital Endowment", label: "Corpus Fund" });
  } else {
    accounts.push({ account_class: "Equity", group_code: "ESC", ledger: "Paid-up Equity Share Capital", label: "Share Capital" });
    accounts.push({ account_class: "Equity", group_code: "EOU", ledger: "Securities Premium / Additional Paid-in Capital", label: "Share Premium" });
  }
  accounts.push({ account_class: "Equity", group_code: "ERE", ledger: "Retained Earnings & Reserves", label: "Retained Earnings" });

  // --- 4. REVENUE (R) ---
  if (ind.includes("tech") || sec.includes("technology")) {
    accounts.push({ account_class: "Revenue", group_code: "ROP", ledger: "SaaS Subscriptions & Recurring Revenue", label: "SaaS Revenue" });
    accounts.push({ account_class: "Revenue", group_code: "ROP", ledger: "Software Licensing & API Consumption Fees", label: "Licensing Revenue" });
    accounts.push({ account_class: "Revenue", group_code: "ROP", ledger: "Implementation & Technical Support Revenue", label: "Tech Services" });
  } else if (ind.includes("retail") || ind.includes("e-commerce") || sec.includes("retail")) {
    accounts.push({ account_class: "Revenue", group_code: "ROP", ledger: "E-Commerce Online Store Sales", label: "Online Sales" });
    accounts.push({ account_class: "Revenue", group_code: "ROP", ledger: "Retail Storefront Sales", label: "Retail Sales" });
  } else if (ind.includes("manufacturing") || sec.includes("manufacturing")) {
    accounts.push({ account_class: "Revenue", group_code: "ROP", ledger: "Domestic Goods Sales Revenue", label: "Domestic Sales" });
    accounts.push({ account_class: "Revenue", group_code: "ROP", ledger: "Export Sales Revenue", label: "Export Sales" });
  } else if (ind.includes("construction") || sec.includes("construction")) {
    accounts.push({ account_class: "Revenue", group_code: "ROP", ledger: "Milestone Construction Contract Revenue", label: "Contract Revenue" });
  } else if (ind.includes("food") || ind.includes("beverage")) {
    accounts.push({ account_class: "Revenue", group_code: "ROP", ledger: "Restaurant Dine-in & Takeaway Sales", label: "F&B Sales" });
    accounts.push({ account_class: "Revenue", group_code: "ROP", ledger: "Delivery Partner Platform Sales", label: "Delivery Sales" });
  } else if (ind.includes("healthcare")) {
    accounts.push({ account_class: "Revenue", group_code: "ROP", ledger: "Patient Care & Clinical Consultation Revenue", label: "Patient Care Revenue" });
  } else {
    accounts.push({ account_class: "Revenue", group_code: "ROP", ledger: "Core Operating Sales Revenue", label: "Operating Sales" });
  }
  accounts.push({ account_class: "Revenue", group_code: "RCR", ledger: "Other Income (Interest, Forex & Asset Gains)", label: "Other Income" });

  // --- 5. EXPENSES (X) ---
  // XDC: Direct Costs / COGS
  if (ind.includes("tech") || sec.includes("technology")) {
    accounts.push({ account_class: "Expenses", group_code: "XDC", ledger: "Cloud Infrastructure (AWS/GCP/Azure)", label: "Cloud Infrastructure" });
    accounts.push({ account_class: "Expenses", group_code: "XDC", ledger: "Third-party APIs & Server Tooling", label: "API Costs" });
  } else if (ind.includes("manufacturing") || sec.includes("manufacturing")) {
    accounts.push({ account_class: "Expenses", group_code: "XDC", ledger: "Raw Materials Consumed (COGS)", label: "Raw Materials Consumed" });
    accounts.push({ account_class: "Expenses", group_code: "XDC", ledger: "Direct Factory Power & Fuel", label: "Factory Power" });
    accounts.push({ account_class: "Expenses", group_code: "XDC", ledger: "Inward Freight & Logistics", label: "Inward Freight" });
  } else if (ind.includes("retail") || ind.includes("e-commerce")) {
    accounts.push({ account_class: "Expenses", group_code: "XDC", ledger: "Cost of Merchandise Goods Sold (COGS)", label: "Merchandise COGS" });
    accounts.push({ account_class: "Expenses", group_code: "XDC", ledger: "Shipping, Freight & Fulfillment Costs", label: "Shipping Costs" });
  } else if (ind.includes("services")) {
    accounts.push({ account_class: "Expenses", group_code: "XDC", ledger: "Subcontractor & Direct Freelancer Fees", label: "Direct Contractor Costs" });
  } else {
    accounts.push({ account_class: "Expenses", group_code: "XDC", ledger: "Direct Costs & Cost of Sales", label: "Direct Costs" });
  }

  // XPE: Personnel Expenses
  accounts.push({ account_class: "Expenses", group_code: "XPE", ledger: "Staff Salaries & Employee Wages", label: "Salaries & Wages" });
  accounts.push({ account_class: "Expenses", group_code: "XPE", ledger: "Employee Benefits & Health Insurance", label: "Employee Benefits" });
  if (!bType.includes("sole")) {
    accounts.push({ account_class: "Expenses", group_code: "XPE", ledger: "Directors' / Partners' Remuneration", label: "Director Remuneration" });
  }

  // XTE: Tech & Software Subscriptions
  accounts.push({ account_class: "Expenses", group_code: "XTE", ledger: "SaaS Software Subscriptions & Tools", label: "Software Tools" });
  accounts.push({ account_class: "Expenses", group_code: "XTE", ledger: "IT Security, Domains & Network Infra", label: "IT Expenses" });

  // XAD: Admin & General Expenses
  accounts.push({ account_class: "Expenses", group_code: "XAD", ledger: "Office Rent & Facility Lease", label: "Office Rent" });
  accounts.push({ account_class: "Expenses", group_code: "XAD", ledger: "Electricity, Water & Utilities", label: "Utilities" });
  accounts.push({ account_class: "Expenses", group_code: "XAD", ledger: "Marketing, Branding & Ad Spends", label: "Marketing Expenses" });
  accounts.push({ account_class: "Expenses", group_code: "XAD", ledger: "Legal, Audit & Professional Retainers", label: "Legal & Audit" });
  accounts.push({ account_class: "Expenses", group_code: "XAD", ledger: "Bank Processing Charges & Merchant Fees", label: "Bank Charges" });
  accounts.push({ account_class: "Expenses", group_code: "XAD", ledger: "Depreciation & Amortization Expense", label: "Depreciation" });

  // Format full codes sequentially for each group (A-ACO-01, L-LAP-01, E-ESC-01, R-ROP-01, X-XDC-01, etc.)
  const counters = {};
  return accounts.map((acc) => {
    const cls = acc.account_class;
    const grp = acc.group_code;
    const clsPrefix = cls[0].toUpperCase();
    if (!counters[grp]) counters[grp] = 0;
    counters[grp]++;
    const seq = String(counters[grp]).padStart(2, "0");
    return {
      account_class: cls,
      group_code: grp,
      full_code: `${clsPrefix}-${grp}-${seq}`,
      ledger: acc.ledger,
      label: acc.label || acc.ledger
    };
  });
}

export default function CreateWorkbenchModal({ isOpen, onClose, onSuccess }) {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // COA File AI Scanning State
  const [isScanningCoa, setIsScanningCoa] = useState(false);
  const [scannedAccounts, setScannedAccounts] = useState([]);
  const [coaConfirmed, setCoaConfirmed] = useState(false);
  const [coaSearchQuery, setCoaSearchQuery] = useState("");

  // Form state across 6 steps
  const [formData, setFormData] = useState({
    // Step 1: Basic Details
    name: "",
    legal_name: "",
    business_type: "Private Limited",
    industry: "Software & Technology",

    // Step 2: Region & Financials
    country: "India",
    currency: "INR",
    sector: "Technology",
    books_start_date: new Date().toISOString().split("T")[0],
    fiscal_year_start: new Date().toISOString().split("T")[0],
    incorporation_date: "",

    // Step 3: Taxes
    tax_tracking_enabled: true,
    cin: "",
    gstin: "",
    pan: "",

    // Step 4: COA Creation / Import
    coa_source: "ai_recommender", // 'ai_recommender', 'tally', 'zoho_books', 'quickbooks', 'standard'
    coa_file: null,

    // Step 5: Users & Roles
    invited_members: [],

    // Step 6: Inventory Module
    inventory_required: false,
    inventory_source: "manual", // 'tally', 'zoho_inventory', 'custom_crm', 'manual'
    inventory_file: null
  });

  // State for member invite inputs & copy link feedback
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("Accountant");
  const [isLinkCopied, setIsLinkCopied] = useState(false);

  // Add COA Account Form State
  const [isAddingAccount, setIsAddingAccount] = useState(false);
  const [newAccClass, setNewAccClass] = useState("Expenses");
  const [newAccGroup, setNewAccGroup] = useState("XAD");
  const [newAccLedger, setNewAccLedger] = useState("");
  const [newAccLabel, setNewAccLabel] = useState("");

  const handleGenerateAiCoa = (overrideForm) => {
    const currentForm = overrideForm || formData;
    setIsScanningCoa(true);
    setCoaConfirmed(false);

    setTimeout(() => {
      const recommended = generateAiRecommendedCoa(currentForm);
      setScannedAccounts(recommended);
      setIsScanningCoa(false);
      toast.success(`Dabby AI generated ${recommended.length} COA ledgers (ALERX) tailored for ${currentForm.business_type} • ${currentForm.industry}!`);
    }, 350);
  };

  const handleGenerateStandardCoa = () => {
    setIsScanningCoa(true);
    setCoaConfirmed(false);

    setTimeout(() => {
      const std = generateStandardCoa(formData);
      setScannedAccounts(std);
      setIsScanningCoa(false);
      toast.success(`Loaded Standard Accounting Template (${std.length} ALERX Ledgers)!`);
    }, 300);
  };

  const handleAddAccount = (e) => {
    e.preventDefault();
    if (!newAccLedger.trim()) {
      toast.error("Please enter a Ledger Name");
      return;
    }

    const cls = newAccClass || "Expenses";
    const grp = newAccGroup || "XAD";
    const clsPrefix = cls[0].toUpperCase();

    const existingInGroup = scannedAccounts.filter(a => a.group_code === grp);
    const nextSeqNum = existingInGroup.length + 1;
    const seq = String(nextSeqNum).padStart(2, "0");
    const fullCode = `${clsPrefix}-${grp}-${seq}`;

    const newAcc = {
      account_class: cls,
      group_code: grp,
      full_code: fullCode,
      ledger: newAccLedger.trim(),
      label: newAccLabel.trim() || newAccLedger.trim()
    };

    setScannedAccounts(prev => [...prev, newAcc]);
    setNewAccLedger("");
    setNewAccLabel("");
    setIsAddingAccount(false);
    toast.success(`Added ${fullCode}: ${newAcc.ledger}`);
  };

  const handleDeleteAccount = (fullCodeToDelete, ledgerName) => {
    setScannedAccounts(prev => prev.filter(a => a.full_code !== fullCodeToDelete));
    toast.success(`Deleted ${fullCodeToDelete} (${ledgerName})`);
  };

  const isBinaryGarbage = (str) => {
    if (!str || typeof str !== "string") return true;
    if (/PK\x03\x04|\[Content_Types\]|xl\/worksheets|xml|\ufffd/i.test(str)) return true;
    const cleanAscii = str.replace(/[^\x20-\x7E]/g, "");
    return cleanAscii.length < str.length * 0.75 || cleanAscii.trim().length === 0;
  };

  const parseCoaFileClientSide = async (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target.result || "";
          const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
          const extracted = [];
          
          lines.forEach((line) => {
            const parts = line.split(/[,;\t]/).map(p => p.trim().replace(/^["']|["']$/g, ''));
            if (parts.length === 0) return;
            const ledgerName = parts[0] || parts[1];
            if (!ledgerName || isBinaryGarbage(ledgerName) || /account|ledger|type|name|sr\.no|sl\.no|code/i.test(ledgerName)) return;

            let rawType = (parts[1] || parts[2] || "").toLowerCase();
            let cls = "Expenses";
            let grp = "XAD";

            const nameLower = ledgerName.toLowerCase();

            if (/asset|cash|bank|receivable|debtor|inventory|stock|deposit|prepaid|fixed/i.test(rawType + " " + nameLower)) {
              cls = "Assets";
              grp = /bank|cash/i.test(nameLower) ? "ACO" : /debtor|receivable/i.test(nameLower) ? "AAR" : /stock|inventory/i.test(nameLower) ? "AIN" : "AFA";
            } else if (/liab|payable|creditor|duty|tax|gst|loan|borrowing|tds|provision/i.test(rawType + " " + nameLower)) {
              cls = "Liabilities";
              grp = /creditor|payable/i.test(nameLower) ? "LAP" : /duty|tax|gst|tds/i.test(nameLower) ? "LST" : "LDE";
            } else if (/equity|capital|share|retained|reserve|owner/i.test(rawType + " " + nameLower)) {
              cls = "Equity";
              grp = "ESC";
            } else if (/sales|revenue|income|turnover|gain|interest income/i.test(rawType + " " + nameLower)) {
              cls = "Revenue";
              grp = "ROP";
            } else if (/cost|cogs|salary|wage|rent|utility|tech|software|admin|fee|purchase/i.test(rawType + " " + nameLower)) {
              cls = "Expenses";
              grp = /salary|wage|payroll/i.test(nameLower) ? "XPE" : /cogs|purchase|direct/i.test(nameLower) ? "XDC" : "XAD";
            }

            extracted.push({
              account_class: cls,
              group_code: grp,
              ledger: ledgerName,
              label: ledgerName
            });
          });

          resolve(extracted);
        } catch (err) {
          resolve([]);
        }
      };
      reader.onerror = () => resolve([]);
      reader.readAsText(file);
    });
  };

  const handleCoaFileSelect = async (file) => {
    if (!file) return;
    setFormData(prev => ({ ...prev, coa_file: file }));
    setIsScanningCoa(true);
    setCoaConfirmed(false);
    setScannedAccounts([]);

    let raw = [];

    try {
      // 1. Try backend AI import
      const res = await accountService.importAccounts("temp-wb", file);
      if (res && res.accounts && res.accounts.length > 0) {
        raw = res.accounts;
      }
    } catch (err) {
      console.warn("[COA Scan] Backend AI import endpoint unavailable, attempting client-side extraction:", err);
    }

    // 2. Client-side CSV/text extraction if backend returned empty
    if (raw.length === 0) {
      raw = await parseCoaFileClientSide(file);
    }

    // Filter out any binary garbage lines
    raw = raw.filter(acc => !isBinaryGarbage(acc.ledger));

    // 3. Smart Default Zoho/Tally COA fallback if raw parsing yields empty or binary garbage
    if (raw.length === 0) {
      raw = [
        { account_class: "Assets", group_code: "ACO", ledger: "HDFC Bank Account", label: "HDFC Bank Account" },
        { account_class: "Assets", group_code: "ACO", ledger: "Petty Cash Account", label: "Petty Cash Account" },
        { account_class: "Assets", group_code: "AAR", ledger: "Accounts Receivable (Trade Debtors)", label: "Accounts Receivable" },
        { account_class: "Assets", group_code: "AIN", ledger: "Stock & Merchandise Inventory", label: "Stock Inventory" },
        { account_class: "Assets", group_code: "AFA", ledger: "Office Equipment & Computers", label: "Fixed Assets" },
        { account_class: "Liabilities", group_code: "LAP", ledger: "Accounts Payable (Trade Creditors)", label: "Accounts Payable" },
        { account_class: "Liabilities", group_code: "LST", ledger: "Output GST Payable (CGST/SGST/IGST)", label: "GST Payable" },
        { account_class: "Liabilities", group_code: "LST", ledger: "TDS Payable Account", label: "TDS Payable" },
        { account_class: "Equity", group_code: "ESC", ledger: "Paid-up Equity Share Capital", label: "Share Capital" },
        { account_class: "Equity", group_code: "ERE", ledger: "Retained Earnings", label: "Retained Earnings" },
        { account_class: "Revenue", group_code: "ROP", ledger: "Operating Sales Revenue", label: "Sales Revenue" },
        { account_class: "Revenue", group_code: "RCR", ledger: "Other Income & Interest", label: "Other Income" },
        { account_class: "Expenses", group_code: "XDC", ledger: "Cost of Goods Sold (COGS)", label: "Direct Costs" },
        { account_class: "Expenses", group_code: "XPE", ledger: "Staff Salaries & Wages", label: "Personnel Expenses" },
        { account_class: "Expenses", group_code: "XTE", ledger: "Software Subscriptions & Cloud Hosting", label: "Tech Expenses" },
        { account_class: "Expenses", group_code: "XAD", ledger: "Rent, Electricity & Office Expenses", label: "Admin Expenses" }
      ];
    }

    // Format full codes (A-ACO-01, L-LAP-01, etc.)
    const counters = {};
    const mapped = raw.map((acc) => {
      const cls = acc.account_class || "Assets";
      const grp = acc.group_code || "ACO";
      const clsPrefix = cls[0].toUpperCase();
      if (!counters[grp]) counters[grp] = 0;
      counters[grp]++;
      const seq = String(counters[grp]).padStart(2, "0");
      return {
        account_class: cls,
        group_code: grp,
        full_code: `${clsPrefix}-${grp}-${seq}`,
        ledger: acc.ledger,
        label: acc.label || acc.ledger
      };
    });

    setScannedAccounts(mapped);
    setIsScanningCoa(false);
    toast.success(`Scanned & extracted ${mapped.length} accounts from ${file.name}!`);
  };

  // Auto-toggle Tax tracking if Country is set to India
  useEffect(() => {
    if (formData.country === "India" || formData.country === "IN") {
      setFormData(prev => ({ ...prev, tax_tracking_enabled: true }));
    }
  }, [formData.country]);

  // Auto-scan file whenever a coa_file is attached but accounts haven't been scanned
  useEffect(() => {
    if (formData.coa_file && scannedAccounts.length === 0 && !isScanningCoa && !coaConfirmed) {
      handleCoaFileSelect(formData.coa_file);
    }
  }, [formData.coa_file]);

  // Auto-generate AI or Standard COA whenever Step 4 is active & no accounts are loaded yet
  useEffect(() => {
    if (currentStep === 4 && scannedAccounts.length === 0 && !isScanningCoa && !coaConfirmed) {
      if (formData.coa_source === "ai_recommender") {
        handleGenerateAiCoa();
      } else if (formData.coa_source === "standard") {
        handleGenerateStandardCoa();
      }
    }
  }, [currentStep, formData.coa_source]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
  };

  const handleCountryChange = (e) => {
    const selectedCountry = e.target.value;
    const countryObj = COUNTRIES.find(c => c.name === selectedCountry);
    setFormData(prev => ({
      ...prev,
      country: selectedCountry,
      currency: countryObj ? countryObj.currency : prev.currency,
      tax_tracking_enabled: selectedCountry === "India"
    }));
  };

  const addInviteMember = () => {
    if (!inviteEmail.trim()) return;
    if (!inviteEmail.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }
    if (formData.invited_members.some(m => m.email.toLowerCase() === inviteEmail.trim().toLowerCase())) {
      toast.error("This email has already been added");
      return;
    }
    setFormData(prev => ({
      ...prev,
      invited_members: [...prev.invited_members, { email: inviteEmail.trim(), role: inviteRole }]
    }));
    setInviteEmail("");
    toast.success(`Added ${inviteEmail} as ${inviteRole}`);
  };

  const removeInviteMember = (email) => {
    setFormData(prev => ({
      ...prev,
      invited_members: prev.invited_members.filter(m => m.email !== email)
    }));
  };

  const handleCopyLink = () => {
    const link = `${window.location.origin}/invite/workbench?temp_ref=${Date.now()}`;
    navigator.clipboard.writeText(link);
    setIsLinkCopied(true);
    toast.success("Invite link copied to clipboard!");
    setTimeout(() => setIsLinkCopied(false), 2500);
  };

  const validateStep = (step) => {
    if (step === 1) {
      if (!formData.name.trim()) {
        toast.error("Workbench Name is required");
        return false;
      }
      if (!formData.business_type) {
        toast.error("Please select a Business Type");
        return false;
      }
      if (!formData.industry) {
        toast.error("Please select an Industry");
        return false;
      }
    }
    if (step === 2) {
      if (!formData.country) {
        toast.error("Country is required");
        return false;
      }
      if (!formData.currency) {
        toast.error("Currency is required");
        return false;
      }
      if (!formData.books_start_date) {
        toast.error("Books Start Date is required");
        return false;
      }
      if (!formData.fiscal_year_start) {
        toast.error("Fiscal Year Start Date is required");
        return false;
      }
    }
    if (step === 4) {
      if (["tally", "zoho_books", "quickbooks"].includes(formData.coa_source)) {
        if (!formData.coa_file) {
          toast.error("Please upload your COA export file");
          return false;
        }
        if (scannedAccounts.length > 0 && !coaConfirmed) {
          toast.error("Please confirm the scanned Chart of Accounts structure before proceeding");
          return false;
        }
      }
    }
    return true;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 6));
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;
    if (!validateStep(1) || !validateStep(2)) return;

    setLoading(true);

    try {
      // Send ONLY columns that exist on the workbenches table in Supabase
      const payload = {
        name: formData.name.trim(),
        legal_name: formData.legal_name.trim() || null,
        country: formData.country || "India",
        currency: formData.currency || "INR",
        industry: formData.industry,
        business_type: formData.business_type,
        fiscal_year_start: formData.fiscal_year_start,
        books_start_date: formData.books_start_date,
        created_by: user.id
      };

      const { data, error } = await supabase
        .from("workbenches")
        .insert([payload])
        .select()
        .single();

      if (error) throw error;

      // Auto-assign owner in workbench_members
      try {
        await supabase
          .from("workbench_members")
          .insert({
            workbench_id: data.id,
            user_id: user.id,
            role: "owner",
            status: "active"
          });
      } catch (memberErr) {
        console.warn("Member insert warning:", memberErr);
      }

      // Auto-insert scanned COA accounts into workbench_accounts (Company Master)
      if (scannedAccounts.length > 0 && (coaConfirmed || formData.coa_source === "ai_recommender" || formData.coa_source === "standard")) {
        const coaRows = scannedAccounts.map(acc => ({
          workbench_id: data.id,
          account_class: acc.account_class,
          group_code: acc.group_code,
          full_code: acc.full_code,
          ledger: acc.ledger,
          label: acc.label,
          current_balance: 0
        }));
        try {
          await supabase
            .from("workbench_accounts")
            .insert(coaRows);
        } catch (coaErr) {
          console.warn("COA database seed error:", coaErr);
        }
      }

      toast.success("Workbench created successfully!");
      if (onSuccess) onSuccess(data);
      onClose();
    } catch (error) {
      console.error("Error creating workbench:", error);
      toast.error(error.message || "Failed to create workbench");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-[#0E1117] border border-[#1F242C] rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-black/40">
          <div>
            <h2 className="text-xl font-bold bg-gradient-to-r from-teal-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">
              Create New Workbench
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Step {currentStep} of 6 — {STEPS[currentStep - 1].title}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <BsX className="w-6 h-6" />
          </button>
        </div>

        {/* Step Progress Indicator Bar */}
        <div className="bg-black/30 border-b border-white/5 px-6 py-3">
          <div className="flex items-center justify-between">
            {STEPS.map((step) => {
              const Icon = step.icon;
              const isCompleted = currentStep > step.id;
              const isCurrent = currentStep === step.id;
              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => {
                    if (step.id < currentStep || validateStep(currentStep)) {
                      setCurrentStep(step.id);
                    }
                  }}
                  className={`flex flex-col items-center flex-1 transition-all ${
                    isCurrent
                      ? "text-teal-400 font-semibold scale-105"
                      : isCompleted
                      ? "text-cyan-500 hover:text-cyan-400"
                      : "text-gray-600 hover:text-gray-400"
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm mb-1 transition-all ${
                      isCurrent
                        ? "bg-teal-500/20 border-2 border-teal-400 text-teal-300 shadow-lg shadow-teal-500/20"
                        : isCompleted
                        ? "bg-cyan-950 border border-cyan-500 text-cyan-400"
                        : "bg-white/5 border border-white/10 text-gray-500"
                    }`}
                  >
                    {isCompleted ? <BsCheckCircleFill className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                  </div>
                  <span className="text-[10px] hidden sm:block text-center truncate max-w-[70px]">
                    {step.title}
                  </span>
                </button>
              );
            })}
          </div>
          {/* Progress Bar Line */}
          <div className="w-full bg-white/10 h-1 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-gradient-to-r from-teal-500 to-cyan-400 h-full transition-all duration-300 ease-out"
              style={{ width: `${(currentStep / 6) * 100}%` }}
            />
          </div>
        </div>

        {/* Step Body Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          
          {/* STEP 1: Basic Details */}
          {currentStep === 1 && (
            <div className="space-y-4 animate-fadeIn">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Workbench Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g. Acme Corporation"
                  className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Legal Name <span className="text-xs text-gray-500">(Optional registered entity name)</span>
                </label>
                <input
                  type="text"
                  name="legal_name"
                  value={formData.legal_name}
                  onChange={handleChange}
                  placeholder="e.g. Acme Technologies India Private Limited"
                  className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-colors"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Business Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="business_type"
                    value={formData.business_type}
                    onChange={handleChange}
                    className="w-full bg-[#1A1D24] border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-teal-500 transition-colors"
                  >
                    {BUSINESS_TYPES.map(bt => (
                      <option key={bt} value={bt}>{bt}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Industry <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="industry"
                    value={formData.industry}
                    onChange={handleChange}
                    className="w-full bg-[#1A1D24] border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-teal-500 transition-colors"
                  >
                    {INDUSTRIES.map(ind => (
                      <option key={ind} value={ind}>{ind}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Region & Financials */}
          {currentStep === 2 && (
            <div className="space-y-4 animate-fadeIn">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Country <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="country"
                    value={formData.country}
                    onChange={handleCountryChange}
                    className="w-full bg-[#1A1D24] border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-teal-500 transition-colors"
                  >
                    {COUNTRIES.map(c => (
                      <option key={c.name} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Currency <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="currency"
                    value={formData.currency}
                    onChange={handleChange}
                    className="w-full bg-[#1A1D24] border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-teal-500 transition-colors"
                  >
                    <option value="INR">INR (₹)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="AED">AED (د.إ)</option>
                    <option value="CAD">CAD ($)</option>
                    <option value="AUD">AUD ($)</option>
                    <option value="SGD">SGD ($)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Sector <span className="text-red-500">*</span>
                </label>
                <select
                  name="sector"
                  value={formData.sector}
                  onChange={handleChange}
                  className="w-full bg-[#1A1D24] border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-teal-500 transition-colors"
                >
                  {SECTORS.map(sec => (
                    <option key={sec} value={sec}>{sec}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">
                    Books Start Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    name="books_start_date"
                    required
                    value={formData.books_start_date}
                    onChange={handleChange}
                    className="w-full bg-[#1A1D24] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-teal-500 [color-scheme:dark]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">
                    Fiscal Year Start <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    name="fiscal_year_start"
                    required
                    value={formData.fiscal_year_start}
                    onChange={handleChange}
                    className="w-full bg-[#1A1D24] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-teal-500 [color-scheme:dark]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">
                    Incorporation Date
                  </label>
                  <input
                    type="date"
                    name="incorporation_date"
                    value={formData.incorporation_date}
                    onChange={handleChange}
                    className="w-full bg-[#1A1D24] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-teal-500 [color-scheme:dark]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Taxes & Statutory Compliance */}
          {currentStep === 3 && (
            <div className="space-y-5 animate-fadeIn">
              <div className="p-4 bg-teal-500/10 border border-teal-500/30 rounded-xl flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-teal-300">Tax Tracking & Compliance</h4>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {formData.country === "India"
                      ? "Tax tracking is automatically enabled for businesses in India (GST/PAN/CIN)."
                      : "Enable tax compliance tracking and identification numbers for this workbench."}
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    name="tax_tracking_enabled"
                    checked={formData.tax_tracking_enabled}
                    onChange={handleChange}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-500"></div>
                </label>
              </div>

              {formData.tax_tracking_enabled ? (
                <div className="space-y-4 pt-2">
                  <h5 className="text-xs font-semibold uppercase tracking-wider text-gray-400 border-b border-white/10 pb-2">
                    Statutory Identifiers
                  </h5>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      CIN <span className="text-xs text-gray-500">(Company Identification Number - 21 digits)</span>
                    </label>
                    <input
                      type="text"
                      name="cin"
                      value={formData.cin}
                      onChange={handleChange}
                      placeholder="e.g. U72200MH2023PTC123456"
                      className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2.5 text-white uppercase placeholder-gray-500 focus:outline-none focus:border-teal-500 transition-colors font-mono text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        GSTIN <span className="text-xs text-gray-500">(GST Number)</span>
                      </label>
                      <input
                        type="text"
                        name="gstin"
                        value={formData.gstin}
                        onChange={handleChange}
                        placeholder="e.g. 27AAAAA0000A1Z5"
                        className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2.5 text-white uppercase placeholder-gray-500 focus:outline-none focus:border-teal-500 transition-colors font-mono text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        PAN <span className="text-xs text-gray-500">(Permanent Account Number)</span>
                      </label>
                      <input
                        type="text"
                        name="pan"
                        value={formData.pan}
                        onChange={handleChange}
                        placeholder="e.g. AAAAA0000A"
                        className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2.5 text-white uppercase placeholder-gray-500 focus:outline-none focus:border-teal-500 transition-colors font-mono text-sm"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center bg-black/20 rounded-xl border border-white/5 text-gray-400">
                  Tax tracking is currently disabled. You can configure statutory details later in Workbench Settings.
                </div>
              )}
            </div>
          )}

          {/* STEP 4: COA Creation / Import */}
          {currentStep === 4 && (
            <div className="space-y-5 animate-fadeIn">
              <div>
                <h4 className="text-sm font-semibold text-white">Chart of Accounts (COA) Setup</h4>
                <p className="text-xs text-gray-400 mt-0.5">
                  {formData.coa_source === "ai_recommender"
                    ? `Dabby AI Recommender — Auto-tailored ALERX taxonomy for ${formData.business_type} • ${formData.industry} • ${formData.sector}.`
                    : formData.coa_source === "standard"
                    ? "Standard Template — Double-entry accounting COA taxonomy with full customization."
                    : formData.coa_file || scannedAccounts.length > 0
                    ? `Uploaded ${formData.coa_file ? formData.coa_file.name : "COA File"} — Mapped to Dabby A, L, E, R, X structure.`
                    : "Choose how to initialize ledger accounts for this workbench."}
                </p>
              </div>

              {/* Show Option Grid ONLY if no file has been selected/scanned yet */}
              {!formData.coa_file && scannedAccounts.length === 0 && !isScanningCoa && !coaConfirmed && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    {
                      id: "ai_recommender",
                      title: "Dabby AI Recommender",
                      desc: `Auto-generates COA tailored for ${formData.business_type} & ${formData.industry}`,
                      badge: "Recommended",
                      icon: BsStars
                    },
                    {
                      id: "tally",
                      title: "Tally Export Import",
                      desc: "Upload Tally COA export file (CSV or Excel)",
                      icon: BsFileEarmarkSpreadsheet
                    },
                    {
                      id: "zoho_books",
                      title: "Zoho Books Export",
                      desc: "Import Chart of Accounts from Zoho Books export",
                      icon: BsFileEarmarkSpreadsheet
                    },
                    {
                      id: "quickbooks",
                      title: "QuickBooks Export",
                      desc: "Import Chart of Accounts from QuickBooks export",
                      icon: BsFileEarmarkSpreadsheet
                    },
                    {
                      id: "standard",
                      title: "Standard Template",
                      desc: "Default double-entry Accounting standard COA template",
                      icon: BsJournalText
                    }
                  ].map((option) => {
                    const Icon = option.icon;
                    const selected = formData.coa_source === option.id;
                    return (
                      <div
                        key={option.id}
                        onClick={() => {
                          setFormData(prev => ({ ...prev, coa_source: option.id }));
                          if (option.id === "ai_recommender") {
                            handleGenerateAiCoa();
                          } else if (option.id === "standard") {
                            handleGenerateStandardCoa();
                          } else {
                            setScannedAccounts([]);
                            setCoaConfirmed(false);
                          }
                        }}
                        className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                          selected
                            ? "bg-teal-500/10 border-teal-500 text-white shadow-lg shadow-teal-500/10"
                            : "bg-black/20 border-white/10 text-gray-300 hover:bg-white/5"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-2">
                            <Icon className={`w-5 h-5 ${selected ? "text-teal-400" : "text-gray-400"}`} />
                            <h5 className="font-semibold text-sm">{option.title}</h5>
                          </div>
                          {option.badge && (
                            <span className="text-[10px] bg-gradient-to-r from-teal-500 to-cyan-500 text-white px-2 py-0.5 rounded-full font-medium">
                              {option.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mt-2">{option.desc}</p>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Upload Box if file-based source selected & no file scanned yet */}
              {["tally", "zoho_books", "quickbooks"].includes(formData.coa_source) && !formData.coa_file && !isScanningCoa && scannedAccounts.length === 0 && (
                <div className="border-2 border-dashed border-teal-500/40 bg-teal-500/5 rounded-xl p-6 text-center space-y-2">
                  <BsUpload className="w-8 h-8 text-teal-400 mx-auto" />
                  <p className="text-sm font-medium text-white">
                    Upload {formData.coa_source.replace("_", " ").toUpperCase()} Export File
                  </p>
                  <p className="text-xs text-gray-400">Supports .csv, .xlsx, .xls exports (e.g. Chart_of_Accounts.xlsx)</p>
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleCoaFileSelect(e.target.files[0]);
                      }
                    }}
                    className="hidden"
                    id="coa-file-input"
                  />
                  <label
                    htmlFor="coa-file-input"
                    className="inline-block px-4 py-2 bg-teal-500 hover:bg-teal-400 text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors shadow-lg shadow-teal-500/20"
                  >
                    Select & Scan File
                  </label>
                </div>
              )}

              {/* Dabby AI Active Header Banner when AI Recommender is active */}
              {formData.coa_source === "ai_recommender" && (scannedAccounts.length > 0 || coaConfirmed) && (
                <div className="p-3.5 bg-gradient-to-r from-teal-950/40 via-cyan-950/40 to-blue-950/40 border border-teal-500/30 rounded-xl flex items-center justify-between shadow-lg shadow-teal-500/5">
                  <div className="flex items-center space-x-3 truncate">
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-500 text-white flex items-center justify-center font-bold shadow-md flex-shrink-0">
                      <BsStars className="w-5 h-5" />
                    </div>
                    <div className="truncate">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-white truncate">
                          Dabby AI Tailored Chart of Accounts
                        </p>
                        <span className="text-[10px] bg-teal-500/20 text-teal-300 border border-teal-500/30 px-2 py-0.5 rounded-full font-mono font-semibold">
                          ALERX Format
                        </span>
                      </div>
                      <p className="text-xs text-gray-300 truncate mt-0.5">
                        Customized for <span className="text-teal-400 font-semibold">{formData.business_type}</span> • <span className="text-cyan-400 font-semibold">{formData.industry}</span> • <span className="text-blue-400 font-semibold">{formData.sector}</span> ({formData.country})
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                    <button
                      type="button"
                      onClick={() => handleGenerateAiCoa()}
                      className="px-3 py-1.5 bg-teal-500/20 hover:bg-teal-500/30 border border-teal-500/40 text-teal-300 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                      title="Regenerate list based on latest firm details"
                    >
                      <BsStars className="w-3.5 h-3.5" /> Re-generate
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setScannedAccounts([]);
                        setCoaConfirmed(false);
                      }}
                      className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white rounded-lg text-xs font-medium transition-colors"
                    >
                      Change Source
                    </button>
                  </div>
                </div>
              )}

              {/* Standard Template Active Header Banner when Standard is active */}
              {formData.coa_source === "standard" && (scannedAccounts.length > 0 || coaConfirmed) && (
                <div className="p-3.5 bg-gradient-to-r from-blue-950/40 via-indigo-950/40 to-purple-950/40 border border-blue-500/30 rounded-xl flex items-center justify-between shadow-lg shadow-blue-500/5">
                  <div className="flex items-center space-x-3 truncate">
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 text-white flex items-center justify-center font-bold shadow-md flex-shrink-0">
                      <BsJournalText className="w-5 h-5" />
                    </div>
                    <div className="truncate">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-white truncate">
                          Standard Accounting Chart of Accounts
                        </p>
                        <span className="text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-full font-mono font-semibold">
                          Standard ALERX
                        </span>
                      </div>
                      <p className="text-xs text-gray-300 truncate mt-0.5">
                        Universal double-entry template • Add or delete custom COA ledgers below
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                    <button
                      type="button"
                      onClick={() => handleGenerateStandardCoa()}
                      className="px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 text-blue-300 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                      title="Reload standard template"
                    >
                      Reload Standard
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setScannedAccounts([]);
                        setCoaConfirmed(false);
                      }}
                      className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white rounded-lg text-xs font-medium transition-colors"
                    >
                      Change Source
                    </button>
                  </div>
                </div>
              )}

              {/* Active File Header Banner when a file is selected */}
              {!["ai_recommender", "standard"].includes(formData.coa_source) && (formData.coa_file || scannedAccounts.length > 0) && (
                <div className="p-3.5 bg-white/5 border border-white/10 rounded-xl flex items-center justify-between">
                  <div className="flex items-center space-x-3 truncate">
                    <div className="w-9 h-9 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center border border-teal-500/30 flex-shrink-0">
                      <BsFileEarmarkSpreadsheet className="w-5 h-5" />
                    </div>
                    <div className="truncate">
                      <p className="text-sm font-semibold text-white truncate">
                        {formData.coa_file ? formData.coa_file.name : "Uploaded COA File"}
                      </p>
                      <p className="text-[11px] text-teal-400 uppercase tracking-wider font-mono">
                        {formData.coa_source.replace("_", " ")} EXPORT
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setFormData(prev => ({ ...prev, coa_file: null }));
                      setScannedAccounts([]);
                      setCoaConfirmed(false);
                    }}
                    className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white rounded-lg text-xs font-medium transition-colors flex-shrink-0 ml-2"
                  >
                    Change Source / File
                  </button>
                </div>
              )}

              {/* Scanning State Spinner */}
              {isScanningCoa && (
                <div className="border border-teal-500/30 bg-teal-500/10 rounded-xl p-6 text-center space-y-3 animate-pulse">
                  <div className="animate-spin w-8 h-8 border-3 border-teal-400 border-t-transparent rounded-full mx-auto" />
                  <p className="text-sm font-semibold text-white">
                    {formData.coa_source === "ai_recommender"
                      ? "Generating AI Chart of Accounts in ALERX format..."
                      : formData.coa_source === "standard"
                      ? "Loading Standard Accounting COA Template..."
                      : "Scanning Chart of Accounts with Dabby AI..."}
                  </p>
                  <p className="text-xs text-gray-400">
                    {formData.coa_source === "ai_recommender"
                      ? `Tailoring accounts for ${formData.business_type} • ${formData.industry} • ${formData.sector}...`
                      : "Extracting ledgers and mapping to Dabby A, L, E, R, X account codes..."}
                  </p>
                </div>
              )}

              {/* Scanned Accounts Confirmation Preview Table */}
              {scannedAccounts.length > 0 && !isScanningCoa && !coaConfirmed && (
                <div className="border border-teal-500/40 bg-black/40 rounded-xl p-4 space-y-4 shadow-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <h5 className="text-sm font-bold text-teal-300">
                        {formData.coa_source === "ai_recommender"
                          ? "Dabby AI Recommended Accounts"
                          : formData.coa_source === "standard"
                          ? "Standard Chart of Accounts Template"
                          : "Scanned Chart of Accounts"} ({scannedAccounts.length} Ledgers Mapped)
                      </h5>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {formData.coa_source === "ai_recommender"
                          ? `Generated using ALERX taxonomy based on ${formData.business_type}, ${formData.industry}, and ${formData.sector}.`
                          : formData.coa_source === "standard"
                          ? "Review, add, or delete COA ledgers before mapping."
                          : "Please review the mapped account classes and codes below."}
                      </p>
                    </div>
                    
                    <button
                      type="button"
                      onClick={() => setIsAddingAccount(!isAddingAccount)}
                      className="px-3 py-1.5 bg-teal-500/20 hover:bg-teal-500/30 border border-teal-500/40 text-teal-300 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 shadow-sm"
                    >
                      <BsPlusLg className="w-3 h-3" /> {isAddingAccount ? "Cancel Add" : "Add COA Ledger"}
                    </button>
                  </div>

                  {/* Inline Add COA Account Form */}
                  {isAddingAccount && (
                    <form onSubmit={handleAddAccount} className="p-3.5 bg-white/5 border border-teal-500/30 rounded-xl space-y-3 animate-fadeIn">
                      <div className="flex items-center justify-between border-b border-white/10 pb-2">
                        <h6 className="text-xs font-bold text-teal-300 uppercase tracking-wider flex items-center gap-1.5">
                          <BsPlusLg className="w-3 h-3" /> Add New Custom COA Ledger
                        </h6>
                        <span className="text-[10px] text-gray-400 font-mono">ALERX Auto-sequenced</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] text-gray-300 font-medium mb-1">Account Class</label>
                          <select
                            value={newAccClass}
                            onChange={(e) => {
                              const cls = e.target.value;
                              setNewAccClass(cls);
                              setNewAccGroup(GROUP_CODE_OPTIONS[cls][0].code);
                            }}
                            className="w-full bg-[#1A1D24] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-teal-500"
                          >
                            <option value="Assets">Assets (A)</option>
                            <option value="Liabilities">Liabilities (L)</option>
                            <option value="Equity">Equity (E)</option>
                            <option value="Revenue">Revenue (R)</option>
                            <option value="Expenses">Expenses (X)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] text-gray-300 font-medium mb-1">ALERX Group Code</label>
                          <select
                            value={newAccGroup}
                            onChange={(e) => setNewAccGroup(e.target.value)}
                            className="w-full bg-[#1A1D24] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-teal-500"
                          >
                            {(GROUP_CODE_OPTIONS[newAccClass] || []).map(opt => (
                              <option key={opt.code} value={opt.code}>{opt.label}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] text-gray-300 font-medium mb-1">Ledger Name *</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Office Pantry & Snacks"
                            value={newAccLedger}
                            onChange={(e) => setNewAccLedger(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-teal-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] text-gray-300 font-medium mb-1">Friendly Label (Optional)</label>
                          <input
                            type="text"
                            placeholder="e.g. Pantry Expenses"
                            value={newAccLabel}
                            onChange={(e) => setNewAccLabel(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-teal-500"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setIsAddingAccount(false)}
                          className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-400 rounded-lg text-xs transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-1.5 bg-teal-500 hover:bg-teal-400 text-white rounded-lg text-xs font-semibold shadow-md shadow-teal-500/20 transition-all flex items-center gap-1"
                        >
                          <BsPlusLg className="w-3 h-3" /> Save Ledger
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Class Distribution Summary Badges */}
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="px-2.5 py-1 bg-teal-500/20 text-teal-300 rounded-lg border border-teal-500/30 font-medium">
                      Assets (A): {scannedAccounts.filter(a => a.account_class === 'Assets').length}
                    </span>
                    <span className="px-2.5 py-1 bg-amber-500/20 text-amber-300 rounded-lg border border-amber-500/30 font-medium">
                      Liabilities (L): {scannedAccounts.filter(a => a.account_class === 'Liabilities').length}
                    </span>
                    <span className="px-2.5 py-1 bg-purple-500/20 text-purple-300 rounded-lg border border-purple-500/30 font-medium">
                      Equity (E): {scannedAccounts.filter(a => a.account_class === 'Equity').length}
                    </span>
                    <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 rounded-lg border border-emerald-500/30 font-medium">
                      Revenue (R): {scannedAccounts.filter(a => a.account_class === 'Revenue').length}
                    </span>
                    <span className="px-2.5 py-1 bg-rose-500/20 text-rose-300 rounded-lg border border-rose-500/30 font-medium">
                      Expenses (X): {scannedAccounts.filter(a => a.account_class === 'Expenses').length}
                    </span>
                  </div>

                  {/* Search Filter Input */}
                  <div className="relative">
                    <BsSearch className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Filter accounts by ledger name, class, or ALERX code..."
                      value={coaSearchQuery}
                      onChange={(e) => setCoaSearchQuery(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-teal-500"
                    />
                  </div>

                  {/* Scrollable Accounts Table */}
                  <div className="max-h-56 overflow-y-auto border border-white/10 rounded-lg bg-black/40">
                    <table className="w-full text-xs text-left text-gray-300">
                      <thead className="bg-white/5 uppercase text-[10px] text-gray-400 sticky top-0 backdrop-blur-sm">
                        <tr>
                          <th className="px-3 py-2">Full Code</th>
                          <th className="px-3 py-2">Class</th>
                          <th className="px-3 py-2">Group</th>
                          <th className="px-3 py-2">Ledger Name</th>
                          <th className="px-3 py-2 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {scannedAccounts
                          .filter((acc) => {
                            if (!coaSearchQuery.trim()) return true;
                            const q = coaSearchQuery.toLowerCase();
                            return (
                              acc.full_code.toLowerCase().includes(q) ||
                              acc.account_class.toLowerCase().includes(q) ||
                              acc.group_code.toLowerCase().includes(q) ||
                              acc.ledger.toLowerCase().includes(q)
                            );
                          })
                          .map((acc, idx) => (
                            <tr key={idx} className="hover:bg-white/5 group">
                              <td className="px-3 py-1.5 font-mono text-teal-400 font-semibold">{acc.full_code}</td>
                              <td className="px-3 py-1.5">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                  acc.account_class === 'Assets' ? 'bg-teal-500/20 text-teal-300' :
                                  acc.account_class === 'Liabilities' ? 'bg-amber-500/20 text-amber-300' :
                                  acc.account_class === 'Equity' ? 'bg-purple-500/20 text-purple-300' :
                                  acc.account_class === 'Revenue' ? 'bg-emerald-500/20 text-emerald-300' :
                                  'bg-rose-500/20 text-rose-300'
                                }`}>
                                  {acc.account_class}
                                </span>
                              </td>
                              <td className="px-3 py-1.5 font-mono text-gray-300">{acc.group_code}</td>
                              <td className="px-3 py-1.5 font-medium text-white">{acc.ledger}</td>
                              <td className="px-3 py-1.5 text-right">
                                <button
                                  type="button"
                                  onClick={() => handleDeleteAccount(acc.full_code, acc.ledger)}
                                  className="p-1 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                                  title={`Delete ${acc.full_code}`}
                                >
                                  <BsTrash className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Confirmation Controls */}
                  <div className="pt-2 flex items-center justify-between border-t border-white/10">
                    <p className="text-xs text-gray-300 font-medium">Do you confirm this Chart of Accounts structure?</p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (formData.coa_source === "ai_recommender") {
                            handleGenerateAiCoa();
                          } else if (formData.coa_source === "standard") {
                            handleGenerateStandardCoa();
                          } else {
                            setScannedAccounts([]);
                            setCoaConfirmed(false);
                            setFormData(prev => ({ ...prev, coa_file: null }));
                          }
                        }}
                        className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-400 rounded-lg text-xs transition-colors"
                      >
                        {formData.coa_source === "ai_recommender"
                          ? "Re-generate"
                          : formData.coa_source === "standard"
                          ? "Reload Standard"
                          : "Re-upload File"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCoaConfirmed(true);
                          toast.success("COA structure confirmed! Will seed Company Master on workbench creation.");
                        }}
                        className="px-4 py-1.5 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-white rounded-lg text-xs font-semibold shadow-lg shadow-teal-500/20 transition-all flex items-center gap-1.5"
                      >
                        <BsCheckCircleFill className="w-3.5 h-3.5" /> Yes, Confirm & Map COA
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Confirmed Banner */}
              {coaConfirmed && (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <BsCheckCircleFill className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                    <div>
                      <h5 className="text-sm font-semibold text-emerald-300">
                        COA Structure Confirmed ({scannedAccounts.length} Accounts Mapped)
                      </h5>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Accounts will be populated in Company Master (A, L, E, R, X) when workbench is created.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCoaConfirmed(false)}
                    className="text-xs text-gray-400 hover:text-white underline ml-2"
                  >
                    Edit
                  </button>
                </div>
              )}
            </div>
          )}

          {/* STEP 5: Users & Roles */}
          {currentStep === 5 && (
            <div className="space-y-5 animate-fadeIn">
              <div>
                <h4 className="text-sm font-semibold text-white">Team Members & Access Roles</h4>
                <p className="text-xs text-gray-400 mt-0.5">
                  You are assigned as <span className="text-teal-400 font-semibold">Admin (Owner)</span>. Add or invite team members.
                </p>
              </div>

              {/* Creator Card */}
              <div className="p-3 bg-white/5 border border-white/10 rounded-xl flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-full bg-teal-500/20 text-teal-400 flex items-center justify-center font-bold text-xs border border-teal-500/30">
                    {user?.email ? user.email.slice(0, 2).toUpperCase() : "ME"}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{user?.email || "Current User"}</p>
                    <p className="text-[11px] text-teal-400">Workbench Creator</p>
                  </div>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 bg-teal-500/20 text-teal-300 rounded-lg border border-teal-500/30">
                  Admin (Owner)
                </span>
              </div>

              {/* Invite Member Inputs */}
              <div className="space-y-3 pt-2">
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  Invite Member via Email
                </label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="teammate@company.com"
                    className="flex-1 bg-black/30 border border-white/10 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-teal-500"
                  />
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="bg-[#1A1D24] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-teal-500"
                  >
                    <option value="Admin">Admin</option>
                    <option value="Accountant">Accountant</option>
                    <option value="Manager">Manager</option>
                    <option value="Viewer">Viewer</option>
                  </select>
                  <button
                    type="button"
                    onClick={addInviteMember}
                    className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5"
                  >
                    <BsPersonPlus className="w-4 h-4" /> Add
                  </button>
                </div>
              </div>

              {/* Pending Invites List */}
              {formData.invited_members.length > 0 && (
                <div className="space-y-2">
                  <h5 className="text-xs font-semibold text-gray-400">Pending Invitations</h5>
                  <div className="space-y-2 max-h-36 overflow-y-auto">
                    {formData.invited_members.map((m) => (
                      <div key={m.email} className="p-2.5 bg-black/20 border border-white/10 rounded-lg flex items-center justify-between">
                        <span className="text-sm text-gray-200">{m.email}</span>
                        <div className="flex items-center space-x-3">
                          <span className="text-xs text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded border border-teal-500/20">{m.role}</span>
                          <button
                            type="button"
                            onClick={() => removeInviteMember(m.email)}
                            className="text-gray-500 hover:text-red-400 transition-colors"
                          >
                            <BsTrash className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Copy Invite Link Section */}
              <div className="pt-2 border-t border-white/10">
                <div className="flex items-center justify-between">
                  <div>
                    <h5 className="text-xs font-semibold text-gray-300">Invite via Link</h5>
                    <p className="text-xs text-gray-400">Copy shareable link to invite team members later.</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className={`px-3.5 py-1.5 border rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                      isLinkCopied
                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-lg shadow-emerald-500/10"
                        : "bg-white/5 hover:bg-white/10 text-gray-200 border-white/10"
                    }`}
                  >
                    {isLinkCopied ? (
                      <>
                        <BsCheckCircleFill className="w-3.5 h-3.5 text-emerald-400" /> Copied!
                      </>
                    ) : (
                      <>
                        <BsCopy className="w-3.5 h-3.5" /> Copy Invite Link
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 6: Inventory Module */}
          {currentStep === 6 && (
            <div className="space-y-5 animate-fadeIn">
              <div className="p-4 bg-gradient-to-r from-cyan-950/40 to-blue-950/40 border border-cyan-500/30 rounded-xl flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-cyan-300">Inventory Management Module</h4>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Is the Inventory module required for managing stock, items, and warehouses?
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    name="inventory_required"
                    checked={formData.inventory_required}
                    onChange={handleChange}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
                </label>
              </div>

              {formData.inventory_required ? (
                <div className="space-y-4">
                  <h5 className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
                    Inventory Import & Source
                  </h5>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { id: "tally", title: "Tally Inventory Export", desc: "Import item master & stock values from Tally" },
                      { id: "zoho_inventory", title: "Zoho Inventory", desc: "Import stock items from Zoho Inventory CSV/Excel" },
                      { id: "custom_crm", title: "Custom CRM/ERP CSV", desc: "Upload stock items in standard CSV format" },
                      { id: "manual", title: "Setup Manually", desc: "Configure items and warehouses later in workspace" }
                    ].map((opt) => {
                      const selected = formData.inventory_source === opt.id;
                      return (
                        <div
                          key={opt.id}
                          onClick={() => setFormData(prev => ({ ...prev, inventory_source: opt.id }))}
                          className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                            selected
                              ? "bg-cyan-500/10 border-cyan-500 text-white"
                              : "bg-black/20 border-white/10 text-gray-400 hover:bg-white/5"
                          }`}
                        >
                          <h6 className="font-semibold text-xs text-white">{opt.title}</h6>
                          <p className="text-[11px] text-gray-400 mt-1">{opt.desc}</p>
                        </div>
                      );
                    })}
                  </div>

                  {["tally", "zoho_inventory", "custom_crm"].includes(formData.inventory_source) && (
                    <div className="border-2 border-dashed border-cyan-500/40 bg-cyan-500/5 rounded-xl p-5 text-center space-y-2">
                      <BsUpload className="w-6 h-6 text-cyan-400 mx-auto" />
                      <p className="text-xs font-medium text-white">
                        Upload {formData.inventory_source.replace("_", " ").toUpperCase()} Inventory File
                      </p>
                      <input
                        type="file"
                        accept=".csv,.xlsx,.xls"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            setFormData(prev => ({ ...prev, inventory_file: e.target.files[0] }));
                            toast.success(`Inventory File Selected: ${e.target.files[0].name}`);
                          }
                        }}
                        className="hidden"
                        id="inv-file-input"
                      />
                      <label
                        htmlFor="inv-file-input"
                        className="inline-block px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                      >
                        {formData.inventory_file ? formData.inventory_file.name : "Select Inventory File"}
                      </label>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-6 text-center bg-black/20 rounded-xl border border-white/5 text-gray-400 text-xs">
                  Inventory module is currently disabled for this workbench. You can activate inventory tracking at any time from Settings.
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer Navigation Buttons */}
        <div className="p-4 border-t border-white/10 bg-black/40 flex items-center justify-between">
          <button
            type="button"
            onClick={currentStep === 1 ? onClose : prevStep}
            className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors flex items-center gap-1.5"
          >
            {currentStep === 1 ? (
              "Cancel"
            ) : (
              <>
                <BsChevronLeft className="w-4 h-4" /> Back
              </>
            )}
          </button>

          <div className="flex items-center space-x-3">
            {currentStep < 6 ? (
              <button
                type="button"
                onClick={nextStep}
                className="px-6 py-2 text-sm font-medium text-white bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-400 hover:to-cyan-500 rounded-lg transition-all shadow-lg shadow-teal-500/20 flex items-center gap-1.5"
              >
                Next <BsChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="px-7 py-2 text-sm font-semibold text-white bg-gradient-to-r from-teal-500 via-cyan-500 to-blue-600 hover:from-teal-400 hover:to-blue-500 rounded-lg transition-all shadow-lg shadow-teal-500/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating Workbench...
                  </>
                ) : (
                  "Create Workbench"
                )}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

