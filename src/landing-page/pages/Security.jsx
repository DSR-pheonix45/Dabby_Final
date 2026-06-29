import { motion } from "framer-motion";
import { useTheme } from "../../context/ThemeContext";
import { Shield, Lock, Activity, Award } from "lucide-react";

export default function SecurityPage({ isModal = false }) {
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
          <h1 className="text-4xl md:text-5xl font-bold mb-4 font-display">Security Center</h1>
          <p className={`text-lg mb-12 ${isDark ? "text-white/60" : "text-[#1e293b]/60"}`}>
            Bank-grade encryption and standard compliance measures for enterprise financial operations.
          </p>

          <div className="space-y-12">
            <div className={`space-y-6 text-base leading-relaxed ${isDark ? "text-gray-300" : "text-gray-600"}`}>
              <p>
                Dabby is engineered to maintain absolute confidentiality and isolation of company books. We apply multiple layers of control across database access, API communication, and LLM processing to safeguard transaction records.
              </p>
            </div>

            {/* Sections */}
            <div className="space-y-8">
              <section className="space-y-4">
                <h2 className="text-xl font-bold flex items-center gap-2 text-white">
                  <Lock className="w-5 h-5 text-[#81E6D9]" /> 1. Encryption Standards
                </h2>
                <p className={`leading-relaxed text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                  All connections are encrypted:
                </p>
                <ul className={`list-disc pl-5 text-sm space-y-2 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                  <li><strong className="text-white">Data in Transit:</strong> Encrypted using TLS 1.3 protocol.</li>
                  <li><strong className="text-white">Data at Rest:</strong> Encrypted in database instances via AES-256 standards.</li>
                  <li><strong className="text-white">API Keys:</strong> Stored securely in secret vaults and isolated backend environments.</li>
                </ul>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-bold flex items-center gap-2 text-white">
                  <Shield className="w-5 h-5 text-[#81E6D9]" /> 2. Infrastructure Isolation
                </h2>
                <p className={`leading-relaxed text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                  Dabby operates on PostgreSQL databases managed by Supabase, with strict row-level security (RLS) policies. Every query executes in isolation, ensuring users can never fetch or reference entries from other workbenches.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-bold flex items-center gap-2 text-white">
                  <Award className="w-5 h-5 text-[#81E6D9]" /> 3. Compliance & Alignment
                </h2>
                <p className={`leading-relaxed text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                  We align our controls with international frameworks and local guidelines:
                </p>
                <ul className={`list-disc pl-5 text-sm space-y-2 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                  <li><strong className="text-white">DPDP Act 2023:</strong> Full conformance to Indian data principal guidelines.</li>
                  <li><strong className="text-white">Zero Model Training:</strong> Uploaded transaction files are parsed via secure API pipes and are never stored or used to train general models.</li>
                </ul>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-bold flex items-center gap-2 text-white">
                  <Activity className="w-5 h-5 text-[#81E6D9]" /> 4. Security Auditing & Logs
                </h2>
                <p className={`leading-relaxed text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                  We track critical operations: onboarding, workbench additions, and ledger integrations. Auditable trails prevent unmonitored changes.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-bold text-white">5. Security Contact and Vulnerability Reports</h2>
                <p className={`leading-relaxed text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                  If you discover a vulnerability or have a security question, reach out directly:
                </p>
                <div className={`p-5 rounded-2xl border ${isDark ? "bg-[#111] border-white/10 text-white" : "bg-gray-50 border-gray-200 text-[#1a1a1a]"}`}>
                  <p className="font-bold text-sm">Security & Compliance Department</p>
                  <p className="text-xs text-[#81E6D9] mt-1 font-semibold">📧 Email: opportunities@datalis.in / opportunities@datalis.in</p>
                </div>
              </section>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
