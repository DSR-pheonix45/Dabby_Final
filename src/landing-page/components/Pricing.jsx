import React, { useState } from "react";
import { motion } from "framer-motion";
import { Check, X, Shield, Sparkles, Building, Users, FileText, ArrowRight } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import { Link } from "react-router-dom";
import { saveRedirectIntent } from "../../utils/redirectUtility";

const plans = [
  {
    key: "launch",
    name: "01 — Launch",
    price: "30,000",
    monthlyEquiv: "2,500",
    description: "For businesses getting their finance organized.",
    documentsLimit: "500 documents / year",
    membersLimit: "5 team members",
    workbenchLimit: "1 Workbench",
    deptLimit: "3 departments",
    highlights: [
      "Doc Vault & AI OCR extraction",
      "Sales & Purchase / Expense",
      "Payment & Receipt Vouchers",
      "Basic Transfers & Journal Vouchers",
      "Party Management & COA",
      "P&L, Balance Sheet & Trial Balance",
      "AR / AP & Basic Compliance",
      "AI Finance Consultant",
    ],
    bestFor: "Founders who want to move away from spreadsheets, WhatsApp, and scattered documents.",
    cta: "Start Dabby",
    link: "/waitlist",
    highlight: false,
    badge: "Essential Launch",
  },
  {
    key: "growth",
    name: "02 — Growth ⭐",
    price: "60,000",
    monthlyEquiv: "5,000",
    description: "For businesses with an active finance operation.",
    documentsLimit: "1,500 documents / year",
    membersLimit: "15 team members",
    workbenchLimit: "1 Workbench",
    deptLimit: "10 departments",
    highlights: [
      "Everything in Launch, plus:",
      "Approval Workflows & Advanced Expenses",
      "Payment & Receipt → Invoice Linking",
      "Advanced AR / AP & Financial Dimensions",
      "Department-wise Accounting",
      "Advanced AI Consultant & Cash-Flow Visibility",
      "Budgeting & Financial KPIs",
      "Exception & Anomaly Insights",
      "Role-Based & CA / Accountant Access",
      "Accounting-system Data Import / Export",
    ],
    bestFor: "Growing companies where multiple people create, approve, and manage financial activity.",
    cta: "Start Growth",
    link: "/waitlist",
    highlight: true,
    badge: "Recommended",
  },
  {
    key: "scale",
    name: "03 — Scale",
    price: "90,000",
    monthlyEquiv: "7,500",
    description: "For companies running finance as a team.",
    documentsLimit: "3,000 documents / year",
    membersLimit: "30 team members",
    workbenchLimit: "1 Workbench",
    deptLimit: "Unlimited departments",
    highlights: [
      "Everything in Growth, plus:",
      "Multi-Level Approvals & Workflow Controls",
      "Advanced Transfers & Reconciliation",
      "Custom Financial Dimensions",
      "Advanced FP&A & Budget Planning",
      "Budget vs Actuals & Cash Forecasting",
      "Investor & Management View",
      "Advanced RBAC, Audit Trails & Activity Logs",
      "Tally & Zoho Integration + API Support",
      "CA / CFO Collaboration & Priority Support",
    ],
    bestFor: "Finance teams, CFO-led businesses, and companies with complex financial operations.",
    cta: "Talk to Dabby",
    link: "/waitlist",
    highlight: false,
    badge: "Full Scale",
  },
];

const featureMatrix = [
  { feature: "Annual Investment (₹)", launch: "₹30,000", growth: "₹60,000", scale: "₹90,000" },
  { feature: "Monthly Equivalent", launch: "₹2,500/mo", growth: "₹5,000/mo", scale: "₹7,500/mo" },
  { feature: "Workbench Count", launch: "1", growth: "1", scale: "1" },
  { feature: "Team Members", launch: "5", growth: "15", scale: "30" },
  { feature: "Processed Documents / year", launch: "500", growth: "1,500", scale: "3,000" },
  { feature: "Department Dimensions", launch: "3", growth: "10", scale: "Unlimited" },
  { feature: "Doc Vault & AI OCR", launch: true, growth: true, scale: true },
  { feature: "Parties & Ledger COA", launch: true, growth: true, scale: true },
  { feature: "Sales & Purchase Modules", launch: true, growth: true, scale: true },
  { feature: "Payment & Receipt Vouchers", launch: true, growth: true, scale: true },
  { feature: "Transfers & Journal Vouchers", launch: true, growth: true, scale: true },
  { feature: "P&L, Balance Sheet, Trial Balance", launch: true, growth: true, scale: true },
  { feature: "AR / AP Tracking", launch: "Basic", growth: "Advanced", scale: "Advanced" },
  { feature: "Approval Workflows", launch: "Basic", growth: true, scale: "Multi-Level" },
  { feature: "AI Finance Consultant", launch: true, growth: true, scale: "Advanced" },
  { feature: "Budgeting & Dimensions", launch: false, growth: true, scale: true },
  { feature: "FP&A & Cash Forecasting", launch: false, growth: "Basic", scale: "Advanced" },
  { feature: "Investor View Dashboard", launch: false, growth: false, scale: true },
  { feature: "Tally / Zoho Integration", launch: false, growth: true, scale: true },
  { feature: "Advanced Permissions & Audit Logs", launch: false, growth: true, scale: true },
  { feature: "Priority Support", launch: false, growth: false, scale: true },
];

export default function Pricing({ showDetails = true }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <section id="pricing" className={`py-20 px-4 sm:px-6 lg:px-8 ${isDark ? "bg-black/90" : "bg-gray-50"} transition-colors duration-300 font-dm-sans`}>
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="text-center mb-12">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-400 text-xs font-bold uppercase tracking-wider mb-4"
          >
            <Sparkles className="w-3.5 h-3.5" /> Dabby Pricing
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className={`text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight mb-4 ${isDark ? "text-white" : "text-gray-900"}`}
          >
            Finance that grows with your business.
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-base sm:text-lg text-teal-400 font-bold max-w-2xl mx-auto"
          >
            One Workbench. Your entire finance operation.
          </motion.p>
        </div>

        {/* 30-DAY FOUNDER PILOT BANNER */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="relative overflow-hidden rounded-2xl border border-teal-500/30 bg-gradient-to-r from-teal-950/60 via-slate-900/80 to-teal-950/60 p-6 sm:p-8 max-w-4xl mx-auto mb-16 shadow-2xl backdrop-blur-md"
        >
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
            <div className="space-y-2">
              <span className="px-3 py-1 bg-teal-400 text-slate-950 text-[10px] font-black rounded-full uppercase tracking-wider">
                Conclave Special Pilot
              </span>
              <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                30-Day Founder Pilot
              </h3>
              <p className="text-xs sm:text-sm text-gray-300 max-w-xl">
                Get your company's Dabby Workbench set up and run your real finance workflow with zero upfront commitment.
              </p>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 pt-2 text-[11px] font-mono text-teal-400">
                <span>Founder Pilot</span>
                <span>→</span>
                <span>Real Documents & Workflow</span>
                <span>→</span>
                <span className="font-bold text-white">Launch (₹30K) / Growth (₹60K) / Scale (₹90K)</span>
              </div>
            </div>
            <Link
              to="/waitlist"
              onClick={() => saveRedirectIntent("/pricing")}
              className="shrink-0 px-6 py-3.5 rounded-xl bg-teal-400 hover:bg-teal-300 text-slate-950 font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all shadow-lg shadow-teal-500/20 hover:scale-105"
            >
              <span>Apply for Pilot</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </motion.div>

        {/* 3 PRICING CARDS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className={`relative p-7 rounded-3xl border transition-all duration-300 flex flex-col justify-between ${
                plan.highlight
                  ? "bg-slate-900/90 border-teal-400 shadow-[0_0_40px_rgba(45,212,191,0.15)] ring-1 ring-teal-400/50"
                  : isDark
                  ? "bg-[#141414] border-white/10 hover:border-white/20"
                  : "bg-white border-gray-200 shadow-sm hover:shadow-md"
              }`}
            >
              {plan.highlight && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 bg-teal-400 text-slate-950 text-[10px] font-black rounded-full uppercase tracking-wider shadow-md">
                  RECOMMENDED
                </div>
              )}

              <div>
                {/* Header */}
                <div className="mb-6 border-b border-white/10 pb-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className={`text-xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                      {plan.name}
                    </h3>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-white/5 text-teal-400 border border-white/10">
                      {plan.badge}
                    </span>
                  </div>
                  <p className={`text-xs min-h-[32px] ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                    {plan.description}
                  </p>

                  <div className="mt-4">
                    <div className="flex items-baseline gap-1">
                      <span className={`text-3xl sm:text-4xl font-extrabold ${isDark ? "text-white" : "text-gray-900"}`}>
                        ₹{plan.price}
                      </span>
                      <span className="text-xs font-semibold text-gray-400">/ year</span>
                    </div>
                    <p className="text-[11px] font-mono text-teal-400 mt-1">
                      Monthly equivalent: ₹{plan.monthlyEquiv}/mo
                    </p>
                  </div>
                </div>

                {/* Key Usage Limits */}
                <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 mb-6 space-y-1.5 text-xs text-gray-300">
                  <div className="flex items-center justify-between text-teal-300 font-semibold">
                    <span className="flex items-center gap-1.5"><FileText className="w-3.5 h-3.5 text-teal-400" /> Documents / year</span>
                    <strong className="text-white">{plan.documentsLimit}</strong>
                  </div>
                  <div className="flex items-center justify-between text-gray-400">
                    <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5 text-gray-400" /> Team Members</span>
                    <strong className="text-gray-200">{plan.membersLimit}</strong>
                  </div>
                  <div className="flex items-center justify-between text-gray-400">
                    <span className="flex items-center gap-1.5"><Building className="w-3.5 h-3.5 text-gray-400" /> Departments</span>
                    <strong className="text-gray-200">{plan.deptLimit}</strong>
                  </div>
                </div>

                {/* Features List */}
                <ul className="space-y-3 mb-8">
                  {plan.highlights.map((feat, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 text-xs text-gray-300">
                      <Check className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                      <span className={feat.startsWith("Everything") ? "font-bold text-teal-300" : ""}>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Card Footer & CTA */}
              <div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/5 mb-6 text-[11px] text-gray-400 italic">
                  <strong>Best for:</strong> {plan.bestFor}
                </div>

                <Link
                  to={plan.link || "/waitlist"}
                  onClick={() => saveRedirectIntent("/pricing")}
                  className={`block w-full py-3.5 px-6 rounded-xl text-center text-xs font-bold tracking-wider uppercase transition-all duration-200 ${
                    plan.highlight
                      ? "bg-teal-400 text-slate-950 hover:bg-teal-300 shadow-lg shadow-teal-500/20 hover:scale-[1.02]"
                      : isDark
                      ? "bg-white/10 text-white hover:bg-white/20 border border-white/10"
                      : "bg-black text-white hover:bg-gray-800"
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            </motion.div>
          ))}
        </div>

        {/* DEFINITION BOX: WHAT COUNTS AS A DOCUMENT */}
        <div className="mb-20 p-6 sm:p-8 bg-[#121212] border border-white/10 rounded-2xl max-w-4xl mx-auto">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-5 h-5 text-teal-400" />
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">
              What counts as a processed document?
            </h4>
          </div>
          <p className="text-xs text-gray-300 leading-relaxed">
            Doc Vault is the heart of Dabby. A processed document means <strong>one successfully processed financial evidence item</strong>. Examples:
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mt-4 text-xs font-mono text-gray-300">
            <span className="bg-black/50 p-2.5 rounded-xl border border-white/5 flex items-center gap-2">
              <Check className="w-3.5 h-3.5 text-teal-400 shrink-0" /> 1 Sales Invoice
            </span>
            <span className="bg-black/50 p-2.5 rounded-xl border border-white/5 flex items-center gap-2">
              <Check className="w-3.5 h-3.5 text-teal-400 shrink-0" /> 1 Vendor Invoice / Bill
            </span>
            <span className="bg-black/50 p-2.5 rounded-xl border border-white/5 flex items-center gap-2">
              <Check className="w-3.5 h-3.5 text-teal-400 shrink-0" /> 1 Expense Receipt
            </span>
            <span className="bg-black/50 p-2.5 rounded-xl border border-white/5 flex items-center gap-2">
              <Check className="w-3.5 h-3.5 text-teal-400 shrink-0" /> 1 Payment Screenshot
            </span>
            <span className="bg-black/50 p-2.5 rounded-xl border border-white/5 flex items-center gap-2">
              <Check className="w-3.5 h-3.5 text-teal-400 shrink-0" /> 1 Receipt Screenshot
            </span>
            <span className="bg-black/50 p-2.5 rounded-xl border border-white/5 flex items-center gap-2">
              <Check className="w-3.5 h-3.5 text-teal-400 shrink-0" /> 1 Credit Note
            </span>
          </div>
        </div>

        {/* COMPARISON FEATURE MATRIX */}
        {showDetails && (
          <div className="mt-16">
            <div className="text-center mb-8">
              <h3 className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                Compare Plan Capabilities
              </h3>
              <p className="text-xs text-gray-400 mt-1">Detailed feature comparison across Launch, Growth, and Scale</p>
            </div>

            <div className="overflow-x-auto custom-scrollbar rounded-2xl border border-white/10 bg-[#121212]">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-white/10 bg-[#1A1A1A]">
                    <th className="p-4 font-bold text-gray-300">Feature Capability</th>
                    <th className="p-4 font-bold text-teal-400 text-center">Launch (₹30K)</th>
                    <th className="p-4 font-bold text-teal-300 text-center bg-teal-500/10">Growth ⭐ (₹60K)</th>
                    <th className="p-4 font-bold text-purple-400 text-center">Scale (₹90K)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {featureMatrix.map((row, idx) => (
                    <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                      <td className="p-4 font-medium text-gray-200">{row.feature}</td>
                      <td className="p-4 text-center font-mono text-gray-300">
                        {typeof row.launch === "boolean" ? (
                          row.launch ? <Check className="w-4 h-4 text-teal-400 mx-auto" /> : <X className="w-4 h-4 text-gray-600 mx-auto" />
                        ) : row.launch}
                      </td>
                      <td className="p-4 text-center font-mono text-white bg-teal-500/5">
                        {typeof row.growth === "boolean" ? (
                          row.growth ? <Check className="w-4 h-4 text-teal-400 mx-auto" /> : <X className="w-4 h-4 text-gray-600 mx-auto" />
                        ) : row.growth}
                      </td>
                      <td className="p-4 text-center font-mono text-gray-300">
                        {typeof row.scale === "boolean" ? (
                          row.scale ? <Check className="w-4 h-4 text-teal-400 mx-auto" /> : <X className="w-4 h-4 text-gray-600 mx-auto" />
                        ) : row.scale}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </section>
  );
}
