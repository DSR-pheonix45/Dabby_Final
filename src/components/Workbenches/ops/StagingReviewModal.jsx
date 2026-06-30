import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BsX,
  BsCheckCircle,
  BsStars,
  BsFileEarmarkPdf,
  BsEye,
  BsDatabaseCheck,
} from "react-icons/bs";
import { backendService } from "../../../services/backendService";
import { useWorkbench } from "../../../context/WorkbenchContext";
import { supabase } from "../../../lib/supabase";
import { toast } from "react-hot-toast";

export default function StagingReviewModal({ isOpen, onClose, doc, onSuccess }) {
  const { labels, parties, workbenchId, workbench } = useWorkbench();
  const [docUrl, setDocUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [record, setRecord] = useState(null);

  useEffect(() => {
    if (isOpen && doc) {
      fetchStagingRecord();
      backendService.getDocumentUrl(doc.file_path).then(setDocUrl).catch(console.error);
    }
  }, [isOpen, doc]);

  const fetchStagingRecord = async () => {
    try {
      setLoading(true);
      // Fetch draft record by document_id
      const { data, error } = await supabase
        .from("workbench_records")
        .select("*")
        .eq("document_id", doc.id)
        .eq("status", "draft")
        .maybeSingle();

      if (error) throw error;
      setRecord(data);
    } catch (err) {
      console.error("Error fetching staging record:", err);
      toast.error("Failed to load staging record details");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !doc) return null;

  const ocr = record?.metadata?.ocr_extraction || {};
  const event = record?.metadata?.accounting_event || {};
  const journal = record?.metadata?.draft_journal || {};
  const entries = journal.entries || [];

  const debits = entries.filter((e) => e.entry_type === "Debit");
  const credits = entries.filter((e) => e.entry_type === "Credit");

  const totalDebits = debits.reduce((sum, e) => sum + (e.amount || 0), 0);
  const totalCredits = credits.reduce((sum, e) => sum + (e.amount || 0), 0);

  const formatCurrency = (amount) => {
    const currency = workbench?.currency || "INR";
    const locale = currency.toUpperCase() === "USD" ? "en-US" : "en-IN";
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount || 0);
  };

  const handleAuthorize = async () => {
    if (!record?.id) return;
    try {
      setLoading(true);
      toast.loading("Posting transactions to ledger accounts...", { id: "auth-ledger" });
      await backendService.confirmRecord(record.id);
      toast.success("Journal Authorized & Ledger Updated!", { id: "auth-ledger" });
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error("Staging confirmation failed:", err);
      toast.error(err.message || "Ledger authorization failed", { id: "auth-ledger" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 bg-black/80 backdrop-blur-xl">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-[#0a0a0a] border border-white/10 w-full max-w-7xl h-[90vh] rounded-[40px] flex flex-col overflow-hidden shadow-2xl relative"
      >
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center space-x-4">
            <div className="p-3 rounded-2xl bg-teal-500/10 text-teal-400 border border-teal-500/20 shadow-lg shadow-teal-500/5">
              <BsDatabaseCheck size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">Stage Log & Journal Auditor</h2>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">
                Review draft entries before posting to dynamic Chart of Accounts
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-3 hover:bg-white/10 rounded-2xl transition-colors text-gray-500 hover:text-white"
          >
            <BsX size={24} />
          </button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Left Side: PDF/Image Preview */}
          <div className="hidden lg:flex w-1/2 border-r border-white/5 bg-black p-6 items-center justify-center relative">
            {docUrl ? (
              doc.mime_type?.includes("pdf") ? (
                <iframe
                  src={docUrl}
                  title="Document Preview"
                  className="w-full h-full rounded-2xl border border-white/10"
                />
              ) : (
                <img
                  src={docUrl}
                  alt="Document"
                  className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl shadow-white/5"
                />
              )
            ) : (
              <div className="animate-pulse text-gray-600 font-bold text-xs uppercase tracking-widest">
                Loading original file...
              </div>
            )}
            <div className="absolute top-10 left-10 p-3 bg-black/60 backdrop-blur-md border border-white/10 rounded-2xl text-[10px] font-black text-white uppercase tracking-widest flex items-center space-x-2">
              <BsEye className="text-teal-400" />
              <span>Original Invoice Preview</span>
            </div>
          </div>

          {/* Right Side: Staging Metadata & Journal Entries */}
          <div className="w-full lg:w-1/2 flex flex-col h-full bg-white/[0.01]">
            <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
              
              {/* Staging Event Metadata */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-gray-500 uppercase tracking-widest">Staging Intent Metrics</h3>
                  <span className="px-3 py-1 bg-teal-500/10 text-teal-400 border border-teal-500/20 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center space-x-1.5">
                    <BsStars className="animate-pulse" />
                    <span>AI Confidence: {Math.round((event.confidence || 0) * 100)}%</span>
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl space-y-1">
                    <span className="text-[9px] font-bold text-gray-600 uppercase tracking-widest">Accounting Event</span>
                    <p className="text-sm font-bold text-white uppercase tracking-tight">
                      {(event.event_type || "").replace("_", " ")}
                    </p>
                  </div>
                  <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl space-y-1">
                    <span className="text-[9px] font-bold text-gray-600 uppercase tracking-widest">Payment Status</span>
                    <p className="text-sm font-bold text-white uppercase tracking-tight">
                      {event.payment_status || "unknown"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Journal Double-Entry Ledger Details */}
              <div className="space-y-4">
                <h3 className="text-sm font-black text-gray-500 uppercase tracking-widest">Staging Entries</h3>
                
                <div className="border border-white/5 rounded-3xl overflow-hidden bg-black/40">
                  <div className="grid grid-cols-12 bg-white/[0.02] border-b border-white/5 p-4 text-[9px] font-black text-gray-500 uppercase tracking-widest">
                    <div className="col-span-6">Account Category / Label</div>
                    <div className="col-span-3 text-right">Debit</div>
                    <div className="col-span-3 text-right">Credit</div>
                  </div>

                  <div className="divide-y divide-white/[0.03]">
                    {/* Render Debits */}
                    {debits.map((entry, idx) => (
                      <div key={`db-${idx}`} className="grid grid-cols-12 p-4 text-xs font-medium items-center hover:bg-white/[0.01] transition-colors">
                        <div className="col-span-6 flex flex-col">
                          <span className="text-white font-bold">{entry.label}</span>
                          {entry.party && (
                            <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">
                              Counterparty ID: {entry.party.slice(0, 8)}...
                            </span>
                          )}
                        </div>
                        <div className="col-span-3 text-right text-teal-400 font-black">
                          {formatCurrency(entry.amount)}
                        </div>
                        <div className="col-span-3 text-right text-gray-600">—</div>
                      </div>
                    ))}

                    {/* Render Credits */}
                    {credits.map((entry, idx) => (
                      <div key={`cr-${idx}`} className="grid grid-cols-12 p-4 text-xs font-medium items-center hover:bg-white/[0.01] transition-colors">
                        <div className="col-span-6 flex flex-col pl-6">
                          <span className="text-gray-300 font-bold">{entry.label}</span>
                          {entry.party && (
                            <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">
                              Counterparty ID: {entry.party.slice(0, 8)}...
                            </span>
                          )}
                        </div>
                        <div className="col-span-3 text-right text-gray-600">—</div>
                        <div className="col-span-3 text-right text-red-400 font-black">
                          {formatCurrency(entry.amount)}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Totals */}
                  <div className="grid grid-cols-12 bg-white/[0.02] border-t border-white/5 p-4 text-xs font-black items-center">
                    <div className="col-span-6 text-gray-400 uppercase tracking-widest text-[10px]">Balanced Audit Totals</div>
                    <div className="col-span-3 text-right text-teal-400 font-black">
                      {formatCurrency(totalDebits)}
                    </div>
                    <div className="col-span-3 text-right text-red-400 font-black">
                      {formatCurrency(totalCredits)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions Panel */}
            <div className="p-8 border-t border-white/5 bg-white/[0.01] flex space-x-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-8 py-4 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-500 hover:bg-white/5 hover:text-white transition-all"
              >
                Discard / Close
              </button>
              <button
                type="button"
                onClick={handleAuthorize}
                disabled={loading || totalDebits !== totalCredits || totalDebits === 0}
                className="flex-[2] px-8 py-4 bg-teal-500 text-black rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-teal-400 transition-all shadow-xl shadow-teal-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                <BsCheckCircle size={16} />
                <span>Authorize & Post to Ledger</span>
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
