import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "../../context/ThemeContext";
import { Link } from "react-router-dom";
import { Shield, Eye, Settings } from "lucide-react";

export default function CookiePolicy({ isModal = false }) {
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
          <h1 className="text-4xl md:text-5xl font-bold mb-4 font-display">Cookie Policy</h1>
          <p className={`text-sm mb-12 ${isDark ? "text-[#787878]" : "text-gray-500"}`}>
            Last Updated: June 29, 2026
          </p>

          <div className="space-y-12">
            <div className={`space-y-6 text-base leading-relaxed ${isDark ? "text-gray-300" : "text-gray-600"}`}>
              <p>
                This Cookie Policy explains how Datalis (“Company”, “we”, “us”, or “our”) uses cookies and similar tracking technologies when you visit our landing pages and use Dabby, our software platform.
              </p>
              <p className="font-semibold text-white">
                This Policy should be read alongside our Privacy Policy and Terms of Service. In compliance with the Digital Personal Data Protection Act, 2023 (DPDP Act) and international data rules, we obtain explicit consent before setting any non-essential cookies.
              </p>
            </div>

            {/* Sections */}
            <div className="space-y-8">
              <section className="space-y-4">
                <h2 className="text-xl font-bold flex items-center gap-2 text-white">
                  <Shield className="w-5 h-5 text-[#81E6D9]" /> 1. What are Cookies?
                </h2>
                <p className={`leading-relaxed text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                  Cookies are small text files stored on your browser or device when you visit a website. They allow the website to recognize your device, maintain session states, improve performance, and customize preferences. We also use localStorage to save documents you upload in the pre-auth hero sections before you register or log in.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-bold flex items-center gap-2 text-white">
                  <Eye className="w-5 h-5 text-[#81E6D9]" /> 2. Types of Cookies We Use
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className={`p-5 rounded-2xl border ${isDark ? "bg-[#111] border-white/10" : "bg-white border-gray-200"}`}>
                    <h3 className="font-bold text-sm mb-2 text-[#81E6D9]">Essential Cookies</h3>
                    <p className={`text-xs leading-relaxed ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                      These cookies and storage objects are strictly necessary to provide our services. For example, we use them to store your uploaded Profit & Loss file context temporarily so we can shift it to your dashboard chat after login or signup.
                    </p>
                  </div>
                  <div className={`p-5 rounded-2xl border ${isDark ? "bg-[#111] border-white/10" : "bg-white border-gray-200"}`}>
                    <h3 className="font-bold text-sm mb-2 text-[#81E6D9]">Analytics & Functional Cookies</h3>
                    <p className={`text-xs leading-relaxed ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                      These help us understand how users interact with our pre-auth landing pages, allowing us to detect errors, optimize layout responsiveness, and remember theme choices (dark/light mode).
                    </p>
                  </div>
                </div>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-bold flex items-center gap-2 text-white">
                  <Settings className="w-5 h-5 text-[#81E6D9]" /> 3. Cookie Consent and Control
                </h2>
                <p className={`leading-relaxed text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                  You can choose to accept or decline cookies. Essential cookies cannot be disabled as the system cannot function without them. For non-essential cookies, you can manage preferences through our Cookie Banner. You can also block cookies via your browser settings, though some features of Dabby may fail to load as a result.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-bold text-white">4. DPDP Act Alignment</h2>
                <p className={`leading-relaxed text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                  Under India's DPDP Act, 2023, data principals have the right to withdraw consent for data collection at any time. If you consent to our cookies and wish to revoke it later, you can clear your browser storage and cookies at any time, which instantly purges all local states.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-bold text-white">5. Contact and Grievance Officer</h2>
                <p className={`leading-relaxed text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                  For questions about our cookie usage, data practices, or to raise a compliance grievance, contact our designated officer:
                </p>
                <div className={`p-5 rounded-2xl border ${isDark ? "bg-[#111] border-white/10 text-white" : "bg-gray-50 border-gray-200 text-[#1a1a1a]"}`}>
                  <p className="font-bold text-sm">Grievance & Compliance Officer</p>
                  <p className="text-xs text-gray-500 mt-1">Datalis Compliance Department</p>
                  <p className="text-xs text-[#81E6D9] mt-1 font-semibold">📧 Email: medhanshk02@gmail.com / opportunities@datalis.in</p>
                  <p className="text-[11px] text-gray-500 mt-3 leading-relaxed">We commit to addressing cookie and privacy requests within 30 days under applicable legal timelines.</p>
                </div>
              </section>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

// Global Cookie Banner Component
export function CookieBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const { theme } = useTheme();
  const isDark = theme === "dark";

  useEffect(() => {
    const consent = localStorage.getItem("dabby_cookie_consent");
    if (!consent) {
      const timer = setTimeout(() => setShowBanner(true), 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem("dabby_cookie_consent", "accepted");
    setShowBanner(false);
  };

  const handleDecline = () => {
    localStorage.setItem("dabby_cookie_consent", "declined");
    setShowBanner(false);
  };

  return (
    <AnimatePresence>
      {showBanner && (
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          className="fixed bottom-6 left-6 right-6 md:left-auto md:right-6 md:max-w-md z-[999]"
        >
          <div className={`p-5 rounded-2xl border shadow-2xl backdrop-blur-xl ${
            isDark ? "bg-[#0d0d0d]/95 border-white/10 text-white shadow-black/80" : "bg-white/95 border-teal-600/20 text-[#1a1a1a] shadow-gray-400/40"
          }`}>
            <h4 className="font-bold text-xs flex items-center gap-2 mb-2 text-[#81E6D9]">
              🛡️ Cookie Consent Notice
            </h4>
            <p className={`text-xs leading-relaxed mb-4 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
              Dabby uses essential cookies and local storage to parse your uploaded Profit & Loss sheets, and remember settings. By clicking "Accept All", you agree to our use of functional cookies. See our{" "}
              <Link to="/cookie-policy" className="text-[#81E6D9] underline font-medium">Cookie Policy</Link>.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={handleDecline}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                  isDark ? "border-white/10 hover:bg-white/5 text-gray-400" : "border-gray-200 hover:bg-gray-50 text-gray-500"
                }`}
              >
                Essential Only
              </button>
              <button
                onClick={handleAccept}
                className="px-4 py-1.5 bg-[#81E6D9] text-black font-bold text-xs rounded-xl hover:bg-[#5fd3c7] transition-all"
              >
                Accept All
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
