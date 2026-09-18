import React from "react";
import { motion } from "framer-motion";
import { useTheme } from "../../context/ThemeContext";
import Pricing from "../components/Pricing";
import BrandLogo from "../../components/common/BrandLogo";
import { Link } from "react-router-dom";

export default function PricingPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <div className={`min-h-screen py-24 px-6 flex flex-col items-center justify-center text-center ${isDark ? "bg-[#0a0a0a] text-white" : "bg-white text-gray-900"}`}>
      <div className="mb-8">
        <Link to="/">
          <BrandLogo iconSize={48} label="Dabby" />
        </Link>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-xl mx-auto p-8 rounded-3xl border border-teal-500/30 bg-teal-500/5 backdrop-blur-md"
      >
        <span className="px-4 py-1.5 bg-teal-500/20 text-[#81E6D9] text-xs font-bold rounded-full uppercase tracking-wider mb-4 inline-block">
          Unlimited Workspace Access
        </span>
        <h1 className="text-3xl font-bold mb-4">No Subscription Required</h1>
        <p className="text-gray-400 mb-8 text-sm leading-relaxed">
          All features in Dabby — including AI queries, OCR document ingestion, custom rulesets, and multi-bank ledgers — are fully unlocked with unlimited access.
        </p>

        <Link
          to="/dashboard"
          className="inline-block px-8 py-3.5 bg-[#81E6D9] text-black font-bold rounded-xl hover:bg-[#70d4c7] transition-all"
        >
          Go to Dashboard
        </Link>
      </motion.div>
    </div>
  );
}


