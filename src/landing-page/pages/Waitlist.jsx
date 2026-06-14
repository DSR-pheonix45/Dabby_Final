import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../lib/supabase";
import { useTheme } from "../../context/ThemeContext";
import { AlertCircle, CheckCircle2, ArrowRight, Loader } from "lucide-react";
import { Link } from "react-router-dom";

export default function Waitlist() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const validateEmail = (val) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = email.trim();
    
    if (!trimmed) {
      setError("Please enter your email address.");
      return;
    }
    if (!validateEmail(trimmed)) {
      setError("Please enter a valid email address.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const { error: insertError } = await supabase
        .from("waitlist")
        .insert([{ email: trimmed }]);

      if (insertError) {
        if (insertError.code === "23505") {
          // Unique violation
          setSubmitted(true);
          return;
        }
        throw insertError;
      }

      setSubmitted(true);
    } catch (err) {
      console.error("Waitlist signup error:", err);
      setError("Something went wrong. Please check your network or try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-[80vh] flex flex-col justify-center items-center px-6 py-12 relative overflow-hidden ${isDark ? "bg-[#0a0a0a]" : "bg-[#f5f5f5]"}`}>
      {/* Glow Effects */}
      {isDark && (
        <>
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-[#81E6D9]/5 blur-[120px] pointer-events-none" />
          <div className="absolute bottom-10 left-10 w-[300px] h-[300px] rounded-full bg-[#3b82f6]/5 blur-[100px] pointer-events-none" />
        </>
      )}

      <div className="max-w-xl w-full z-10 text-center">
        {/* Badge */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }} 
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border mb-8 bg-[#81E6D9]/10 border-[#81E6D9]/25 text-[#81E6D9]"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#81E6D9] animate-pulse" />
          Join Dabby Waitlist · Limited Early Access
        </motion.div>

        <AnimatePresence mode="wait">
          {!submitted ? (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
            >
              {/* Copy solving the main pain */}
              <h1 className={`font-display text-4xl sm:text-5xl font-bold leading-tight tracking-tight mb-6 ${isDark ? "text-white" : "text-[#1a1a1a]"}`}>
                Get your finance team out of{" "}
                <span className="text-[#81E6D9] block sm:inline">spreadsheet hell</span>
              </h1>
              
              <p className={`text-base sm:text-lg leading-relaxed mb-10 max-w-lg mx-auto ${isDark ? "text-[#a0a0a0]" : "text-gray-600"}`}>
                Indian companies waste hours every week manually reconciling bank statements, mapping GST tax splits, and fixing CRM sync errors. 
                Dabby automates your ledger, GST allocation, and reconciliation so you can run your business with real-time numbers.
              </p>

              {/* Waitlist Box */}
              <div className={`p-8 rounded-3xl border backdrop-blur-xl ${isDark ? "bg-[#111111]/80 border-white/10 shadow-2xl shadow-black/50" : "bg-white/95 border-gray-200 shadow-xl"}`}>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="text-left">
                    <label className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${isDark ? "text-[#787878]" : "text-gray-400"}`}>
                      Business Email
                    </label>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@company.com"
                        className={`flex-grow px-5 py-3.5 rounded-xl text-sm outline-none transition-all ${
                          isDark 
                            ? "bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:border-[#81E6D9]/50 focus:ring-1 focus:ring-[#81E6D9]/20" 
                            : "bg-gray-50 border border-gray-200 text-[#1a1a1a] placeholder-gray-400 focus:border-[#81E6D9] focus:ring-1 focus:ring-[#81E6D9]/20"
                        }`}
                        disabled={loading}
                      />
                      <button
                        type="submit"
                        disabled={loading}
                        className="px-6 py-3.5 rounded-xl font-semibold text-black bg-[#81E6D9] hover:bg-[#5fd3c7] disabled:opacity-50 transition-all flex items-center justify-center gap-2 text-sm whitespace-nowrap"
                      >
                        {loading ? (
                          <Loader className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            Join Waitlist <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </form>

                {error && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2 text-left"
                  >
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{error}</span>
                  </motion.div>
                )}
              </div>

              {/* Already have account block */}
              <p className={`mt-6 text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                Already registered?{" "}
                <Link to="/login" className="text-[#81E6D9] hover:underline underline-offset-2">
                  Sign in to your account →
                </Link>
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              className={`p-8 sm:p-10 rounded-3xl border text-center ${isDark ? "bg-[#111111]/80 border-white/10 shadow-2xl shadow-black/50" : "bg-white border-gray-200 shadow-xl"}`}
            >
              <div className="w-16 h-16 bg-[#81E6D9]/15 rounded-full flex items-center justify-center mx-auto mb-6 text-[#81E6D9]">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h2 className={`text-2xl font-bold mb-3 ${isDark ? "text-white" : "text-[#1a1a1a]"}`}>
                You're on the list!
              </h2>
              <p className={`text-sm leading-relaxed mb-6 max-w-sm mx-auto ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                Thank you for joining our waitlist. We are rolling out early access invitations in weekly cohorts. 
                Keep an eye on <strong>{email}</strong> for your invite code!
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  to="/"
                  className={`px-6 py-2.5 rounded-xl text-xs font-semibold border transition-all ${
                    isDark
                      ? "border-white/15 text-white hover:bg-white/5"
                      : "border-gray-200 text-[#1a1a1a] hover:bg-gray-50"
                  }`}
                >
                  Return to Home
                </Link>
                <a
                  href={`https://twitter.com/intent/tweet?text=I%20just%20joined%20the%20waitlist%20for%20Dabby%20%40datalis%20to%20automate%20my%20SME%20accounting%20reconciliation%20and%20reclaim%20hours%20of%20grunt%20work.%20Get%20early%20access%20here%3A%20${window.location.origin}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-2.5 rounded-xl text-xs font-semibold text-black bg-[#81E6D9] hover:bg-[#5fd3c7] transition-all flex items-center justify-center gap-1.5"
                >
                  Share early access
                </a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
