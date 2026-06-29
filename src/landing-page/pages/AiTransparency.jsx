import { motion } from "framer-motion";
import { useTheme } from "../../context/ThemeContext";
import { Eye, ShieldAlert, Database, Cpu } from "lucide-react";

export default function AiTransparency({ isModal = false }) {
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
          <h1 className="text-4xl md:text-5xl font-bold mb-4 font-display">AI Transparency Document</h1>
          <p className={`text-sm mb-12 ${isDark ? "text-[#787878]" : "text-gray-500"}`}>
            Last Updated: June 29, 2026
          </p>

          <div className="space-y-12">
            <div className={`space-y-6 text-base leading-relaxed ${isDark ? "text-gray-300" : "text-gray-600"}`}>
              <p>
                Dabby is built on AI-first principles. We believe that when AI is used to make decisions in business and finance, founders and accounting professionals have a right to understand exactly how those decisions are made.
              </p>
              <p className="font-semibold text-white">
                This document describes the models, parameters, data pipeline, and human-in-the-loop structures we use in Dabby to process raw company documents and ledger entries.
              </p>
            </div>

            {/* Sections */}
            <div className="space-y-8">
              <section className="space-y-4">
                <h2 className="text-xl font-bold flex items-center gap-2 text-white">
                  <Cpu className="w-5 h-5 text-[#81E6D9]" /> 1. Models and Services Utilized
                </h2>
                <p className={`leading-relaxed text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                  Dabby utilizes specialized models via API integrations for text extraction, document reconciliation, and general inquiries:
                </p>
                <ul className={`list-disc pl-5 text-sm space-y-2 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                  <li><strong className="text-white">Gemini 1.5 Flash:</strong> Used for vision-based OCR scanning of PDFs and receipts.</li>
                  <li><strong className="text-white">Llama 3.3 70B & Llama 3.1 8B:</strong> Deployed via Groq for high-speed categorization, structural P&L audits, and template generation.</li>
                </ul>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-bold flex items-center gap-2 text-white">
                  <Database className="w-5 h-5 text-[#81E6D9]" /> 2. Data Ingestion & RAG Pipelines
                </h2>
                <p className={`leading-relaxed text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                  When you upload spreadsheets or financial statements, we use Retrieval-Augmented Generation (RAG) to scan specific rows.
                </p>
                <ul className={`list-disc pl-5 text-sm space-y-2 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                  <li>We parse rows client-side or securely in our backend memory.</li>
                  <li>Only relevant row context is sent to the LLM context window.</li>
                  <li>We <strong className="text-white">never</strong> store raw files on public servers without explicit request, and we do not use your business files to train public models.</li>
                </ul>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-bold flex items-center gap-2 text-white">
                  <ShieldAlert className="w-5 h-5 text-[#81E6D9]" /> 3. Hallucination Risk and Mitigation
                </h2>
                <p className={`leading-relaxed text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                  Large language models (LLMs) can occasionally hallucinate information. Dabby implements a strict "Zero Fabrication" system prompt policy:
                </p>
                <div className={`p-4 rounded-xl border ${isDark ? "bg-[#111] border-white/10" : "bg-white border-gray-200"} text-xs leading-relaxed`}>
                  <p className="font-bold text-[#81E6D9] mb-1">Our AI Guardrail Protocol:</p>
                  <p className={isDark ? "text-gray-300" : "text-gray-600"}>
                    "If a number, date, or ledger detail is not explicitly present in the uploaded document, the AI must report it as missing. Extrapolations are strictly prohibited."
                  </p>
                </div>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-bold text-white">4. Human-in-the-Loop Requirement</h2>
                <p className={`leading-relaxed text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                  AI outputs are designed to assist, not replace, accounting professionals. All generated ledger mappings, tax splits, and Business MRI reports must be reviewed by a qualified accountant or bookkeeper before filing.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-bold text-white">5. Compliance and Contact</h2>
                <p className={`leading-relaxed text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                  If you have concerns about the accuracy or transparency of Dabby's AI decisions, contact our officer:
                </p>
                <div className={`p-5 rounded-2xl border ${isDark ? "bg-[#111] border-white/10 text-white" : "bg-gray-50 border-gray-200 text-[#1a1a1a]"}`}>
                  <p className="font-bold text-sm">AI Governance & Compliance Officer</p>
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
