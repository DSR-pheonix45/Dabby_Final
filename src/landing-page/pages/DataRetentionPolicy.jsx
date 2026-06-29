import { motion } from "framer-motion";
import { useTheme } from "../../context/ThemeContext";
import { Calendar, Trash, Clock } from "lucide-react";

export default function DataRetentionPolicy({ isModal = false }) {
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
          <h1 className="text-4xl md:text-5xl font-bold mb-4 font-display">Data Retention Policy</h1>
          <p className={`text-sm mb-12 ${isDark ? "text-[#787878]" : "text-gray-500"}`}>
            Last Updated: June 29, 2026
          </p>

          <div className="space-y-12">
            <div className={`space-y-6 text-base leading-relaxed ${isDark ? "text-gray-300" : "text-gray-600"}`}>
              <p>
                This Data Retention Policy defines the duration for which Datalis (“Company”) retains various categories of data when using Dabby.
              </p>
              <p className="font-semibold text-white">
                Our policy is designed to comply with global standards and India's DPDP Act, 2023, minimizing storage footprint and providing options to delete data on demand.
              </p>
            </div>

            {/* Sections */}
            <div className="space-y-8">
              <section className="space-y-4">
                <h2 className="text-xl font-bold flex items-center gap-2 text-white">
                  <Calendar className="w-5 h-5 text-[#81E6D9]" /> 1. Retention Schedule
                </h2>
                <div className={`overflow-x-auto rounded-2xl border ${isDark ? "border-white/10 bg-[#111]" : "border-gray-200 bg-white"}`}>
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className={`font-bold ${isDark ? "bg-white/5 text-white" : "bg-gray-100 text-[#1a1a1a]"}`}>
                        <th className="p-3">Data Category</th>
                        <th className="p-3">Retention Period</th>
                        <th className="p-3">Action Post-Retention</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${isDark ? "divide-white/5" : "divide-gray-100"} ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                      <tr>
                        <td className="p-3 font-semibold text-white">Pre-auth Uploaded Files</td>
                        <td className="p-3">Deleted immediately after RAG parsing if not authenticated within 2 hours.</td>
                        <td className="p-3">Permanent deletion.</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-semibold text-white">User Account Info</td>
                        <td className="p-3">Duration of subscription + 90 days.</td>
                        <td className="p-3">Deactivation & deletion.</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-semibold text-white">Dashboard Chat History</td>
                        <td className="p-3">Stored until deleted by the user.</td>
                        <td className="p-3">Deletion upon request.</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-semibold text-white">Compliance Logs</td>
                        <td className="p-3">As required by law (usually 3 to 7 years).</td>
                        <td className="p-3">Archived or anonymized.</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-bold flex items-center gap-2 text-white">
                  <Clock className="w-5 h-5 text-[#81E6D9]" /> 2. Temporary Pre-Auth Storage
                </h2>
                <p className={`leading-relaxed text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                  When you upload files on our landing page prior to account registration, we hold the file text context in `localStorage` on your client browser. This is strictly to support account onboarding. If the registration flow is abandoned, clearing your browser storage will instantly wipe all traces of this context.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-bold flex items-center gap-2 text-white">
                  <Trash className="w-5 h-5 text-[#81E6D9]" /> 3. Data Erasure Rights
                </h2>
                <p className={`leading-relaxed text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                  Under the DPDP Act, 2023, you have the right to request deletion of your personal data. If you delete your account or submit an erasure request, we will remove your files and database entries from all live servers within 30 days. Backups are overwritten within 90 days.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-bold text-white">4. Grievance Contact</h2>
                <p className={`leading-relaxed text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                  To request manual data removal, object to a retention period, or contact our officer:
                </p>
                <div className={`p-5 rounded-2xl border ${isDark ? "bg-[#111] border-white/10 text-white" : "bg-gray-50 border-gray-200 text-[#1a1a1a]"}`}>
                  <p className="font-bold text-sm">Data Retention & Compliance Officer</p>
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
