import { motion } from "framer-motion";
import { useTheme } from "../../context/ThemeContext";
import { Scale, Users, ShieldAlert } from "lucide-react";

export default function DataProcessingAddendum({ isModal = false }) {
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
          <h1 className="text-4xl md:text-5xl font-bold mb-4 font-display">Data Processing Addendum (DPA)</h1>
          <p className={`text-sm mb-12 ${isDark ? "text-[#787878]" : "text-gray-500"}`}>
            Last Updated: June 29, 2026
          </p>

          <div className="space-y-12">
            <div className={`space-y-6 text-base leading-relaxed ${isDark ? "text-gray-300" : "text-gray-600"}`}>
              <p>
                This Data Processing Addendum (“DPA”) governs the processing of personal and business data by Datalis (“Processor”) on behalf of the customer (“Controller”) when using Dabby.
              </p>
              <p className="font-semibold text-white">
                This DPA forms part of the Terms of Service. In case of any conflict between this DPA and the Terms of Service, this DPA will control.
              </p>
            </div>

            {/* Sections */}
            <div className="space-y-8">
              <section className="space-y-4">
                <h2 className="text-xl font-bold flex items-center gap-2 text-white">
                  <Users className="w-5 h-5 text-[#81E6D9]" /> 1. Scope and Roles
                </h2>
                <p className={`leading-relaxed text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                  The Controller determines the purposes and parameters of data analysis, while the Processor processes personal data, transaction sheets, and general ledger records solely on documented instructions from the Controller.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-bold flex items-center gap-2 text-white">
                  <Scale className="w-5 h-5 text-[#81E6D9]" /> 2. Compliance with DPDP Act 2023
                </h2>
                <p className={`leading-relaxed text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                  Processor implements appropriate technical and organizational measures to assist the Controller in meeting obligations under India's Digital Personal Data Protection Act, 2023:
                </p>
                <ul className={`list-disc pl-5 text-sm space-y-2 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                  <li>Processing data only under explicit user consent.</li>
                  <li>Assisting the Controller in honoring Data Principal rights (Access, correction, deletion, withdrawal).</li>
                  <li>Informing the Controller of any data breaches without undue delay.</li>
                </ul>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-bold flex items-center gap-2 text-white">
                  <ShieldAlert className="w-5 h-5 text-[#81E6D9]" /> 3. Sub-Processors
                </h2>
                <p className={`leading-relaxed text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                  Controller consents to the use of primary sub-processors for infrastructure:
                </p>
                <ul className={`list-disc pl-5 text-sm space-y-2 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                  <li><strong className="text-white">Supabase:</strong> For account management, databases, and authentication.</li>
                  <li><strong className="text-white">Groq & Google:</strong> For secure, zero-retention LLM inference processing.</li>
                </ul>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-bold text-white">4. Security Standards</h2>
                <p className={`leading-relaxed text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                  Processor maintains logical access barriers, bank-grade encryption in transit (TLS 1.3), encryption at rest (AES-256), and daily automated vulnerability scanning.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-bold text-white">5. Audit and Grievance Contacts</h2>
                <p className={`leading-relaxed text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                  For questions about DPA compliance, data audits, or sub-processor listings, reach out to our designated officer:
                </p>
                <div className={`p-5 rounded-2xl border ${isDark ? "bg-[#111] border-white/10 text-white" : "bg-gray-50 border-gray-200 text-[#1a1a1a]"}`}>
                  <p className="font-bold text-sm">Data Protection Grievance Officer</p>
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
