import { motion } from "framer-motion";
import { useTheme } from "../../context/ThemeContext";
import { ShieldCheck, Heart, Sparkles, Scale } from "lucide-react";

export default function ResponsibleAi({ isModal = false }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <div className={`min-h-screen ${isModal ? "pt-8" : "pt-32"} pb-20 px-6 ${isDark ? "bg-black text-white" : "bg-[#f0f0f0] text-[#1e293b]"}`}>
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-4xl md:text-5xl font-bold mb-4 font-display">Responsible AI Document</h1>
          <p className={`text-sm mb-12 ${isDark ? "text-[#787878]" : "text-gray-500"}`}>
            Last Updated: June 29, 2026
          </p>

          <div className="space-y-12">
            <div className={`space-y-6 text-base leading-relaxed ${isDark ? "text-gray-300" : "text-gray-600"}`}>
              <p>
                Dabby is committed to deploying Artificial Intelligence in a safe, fair, and responsible manner. We recognize that algorithmic financial auditing comes with high stakes, and we build safety systems to protect our users.
              </p>
              <p className="font-semibold text-white">
                This document outlines our fundamental guidelines, ethical guardrails, and quality check systems.
              </p>
            </div>

            {/* Sections */}
            <div className="space-y-8">
              <section className="space-y-4">
                <h2 className="text-xl font-bold flex items-center gap-2 text-white">
                  <ShieldCheck className="w-5 h-5 text-[#81E6D9]" /> 1. Safe Processing and Data Secrecy
                </h2>
                <p className={`leading-relaxed text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                  We treat your uploaded P&L statements, ledgers, and bank records with strict privacy:
                </p>
                <ul className={`list-disc pl-5 text-sm space-y-2 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                  <li>We do not share your private financial parameters with public directories.</li>
                  <li>Our API providers (Groq and Gemini) operate under strict enterprise data-handling SLAs that do not permit using inputs for model tuning.</li>
                </ul>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-bold flex items-center gap-2 text-white">
                  <Scale className="w-5 h-5 text-[#81E6D9]" /> 2. Algorithmic Bias Prevention
                </h2>
                <p className={`leading-relaxed text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                  Financial mapping should not favor any particular entity. We program our classification engines based on standardized systems (e.g. Chart of Accounts structures) to ensure neutral categorization of business accounts.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-bold flex items-center gap-2 text-white">
                  <Heart className="w-5 h-5 text-[#81E6D9]" /> 3. Human Control Protocol
                </h2>
                <p className={`leading-relaxed text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                  AI is an augmentation tool. Dabby does not execute automatic tax filings or wire transfers without human review and confirmation. Users must review all AI recommendations.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-bold flex items-center gap-2 text-white">
                  <Sparkles className="w-5 h-5 text-[#81E6D9]" /> 4. Ongoing Model Verification
                </h2>
                <p className={`leading-relaxed text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                  We run daily automated check scripts on simulated financial sheets to measure categorization precision and guard against regression or drift.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-bold text-white">5. Contact and Grievance Officer</h2>
                <p className={`leading-relaxed text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                  For questions about our ethical AI design or model compliance, reach out directly to:
                </p>
                <div className={`p-5 rounded-2xl border ${isDark ? "bg-[#111] border-white/10 text-white" : "bg-gray-50 border-gray-200 text-[#1a1a1a]"}`}>
                  <p className="font-bold text-sm">Responsible AI Officer</p>
                  <p className="text-xs text-gray-500 mt-1">Datalis Compliance Department</p>
                  <p className="text-xs text-[#81E6D9] mt-1 font-semibold">📧 Email: medhanshk02@gmail.com / opportunities@datalis.in</p>
                </div>
              </section>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
