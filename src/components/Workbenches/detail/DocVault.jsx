import React, { useState, useEffect, useRef } from "react";
import { 
  BsShieldLock, 
  BsUpload, 
  BsSearch, 
  BsFilter, 
  BsFileEarmarkPdf, 
  BsFileEarmarkText, 
  BsLink45Deg, 
  BsEye, 
  BsDownload, 
  BsTrash, 
  BsCheckCircleFill, 
  BsClockHistory, 
  BsExclamationCircleFill,
  BsPlusLg,
  BsThreeDotsVertical,
  BsArrowRight,
  BsMagic,
  BsStars,
  BsX
} from "react-icons/bs";
import { X } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { backendService } from "../../../services/backendService";
import { useWorkbench } from "../../../context/WorkbenchContext";
import Card from "../../shared/Card";
import { toast } from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import LinkDocumentModal from "../ops/LinkDocumentModal";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../../../lib/apiClient";

const DOC_TYPES = [
  { id: 'all', label: 'All', color: 'bg-teal-500/10 text-teal-400 font-bold border border-teal-500/20' },
  { id: 'sales_invoice', label: 'Sales Invoice', color: 'bg-teal-500/10 text-teal-400' },
  { id: 'customer_payment_receipt', label: 'Customer Receipt', color: 'bg-blue-500/10 text-blue-400' },
  { id: 'vendor_invoice', label: 'Vendor Invoice', color: 'bg-rose-500/10 text-rose-400' },
  { id: 'vendor_payment_receipt', label: 'Vendor Proof', color: 'bg-emerald-500/10 text-emerald-400' },
  { id: 'bank_statement', label: 'Bank Statement', color: 'bg-gray-500/10 text-gray-400' },
  { id: 'expense_receipt', label: 'Expense Receipt', color: 'bg-amber-500/10 text-amber-400' },
  { id: 'payroll_register', label: 'Payroll Register', color: 'bg-indigo-500/10 text-indigo-400' },
  { id: 'credit_note', label: 'Credit Note', color: 'bg-purple-500/10 text-purple-400' },
  { id: 'debit_note', label: 'Debit Note', color: 'bg-pink-500/10 text-pink-400' },
  { id: 'loan_agreement', label: 'Loan Agreement', color: 'bg-cyan-500/10 text-cyan-400' },
  { id: 'investment_agreement', label: 'Investment', color: 'bg-violet-500/10 text-violet-400' },
  { id: 'tax_document', label: 'Tax Doc', color: 'bg-orange-500/10 text-orange-400' },
  { id: 'purchase_order', label: 'Purchase Order', color: 'bg-sky-500/10 text-sky-400' },
  { id: 'sales_order', label: 'Sales Order', color: 'bg-lime-500/10 text-lime-400' }
];


export default function DocVault({ workbenchId }) {
  const { labels } = useWorkbench();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeStage, setActiveStage] = useState('uploaded');
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [selectedDocForLinking, setSelectedDocForLinking] = useState(null);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false);
  const [analysisNoteDoc, setAnalysisNoteDoc] = useState(null);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDocuments();
  }, [workbenchId]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('workbench_documents')
        .select('*, transactions(description, transaction_entries(amount))')
        .eq('workbench_id', workbenchId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Error fetching documents:", error);
        setDocuments([]);
      } else {
        const processedData = (data || []).map(doc => {
          const txAmount = doc.transactions?.transaction_entries?.find(e => e.amount > 0)?.amount;
          return {
            ...doc,
            display_linked_unit: doc.transactions?.description || doc.transaction_id || null,
            display_amount: txAmount || doc.metadata?.extracted_invoice?.financials?.total_amount || doc.metadata?.amount || null
          };
        });
        setDocuments(processedData);
      }
    } catch (err) {
      console.error("Error fetching documents:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDocumentsSilent = async () => {
    try {
      const { data, error } = await supabase
        .from('workbench_documents')
        .select('*, transactions(description, transaction_entries(amount))')
        .eq('workbench_id', workbenchId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        const processedData = data.map(doc => {
          const txAmount = doc.transactions?.transaction_entries?.find(e => e.amount > 0)?.amount;
          return {
            ...doc,
            display_linked_unit: doc.transactions?.description || doc.transaction_id || null,
            display_amount: txAmount || doc.metadata?.extracted_invoice?.financials?.total_amount || doc.metadata?.amount || null
          };
        });
        setDocuments(processedData);
      }
    } catch (err) {
      console.error("Error fetching documents silently:", err);
    }
  };

  useEffect(() => {
    const hasProcessing = documents.some(d => 
      ['uploaded', 'processing', 'VALIDATING', 'SPLITTING', 'OCR_RUNNING', 'NORMALIZING', 'AGGREGATING', 'ANALYZING'].includes(d.status)
    );
    if (!hasProcessing) return;

    const interval = setInterval(() => {
      fetchDocumentsSilent();
    }, 3000);

    return () => clearInterval(interval);
  }, [documents]);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleAICategorize = async (doc) => {
    try {
      toast.loading("Analyzing with AI...", { id: `ai-cat-${doc.id}` });
      
      // We only send expense labels to narrow down classification
      const expenseLabels = labels.filter(l => l.type === 'expense').map(l => ({
        id: l.id,
        name: l.name,
        sub_account: l.sub_account
      }));

      if (expenseLabels.length === 0) {
        toast.error("No expense labels found in COA to categorize against.", { id: `ai-cat-${doc.id}` });
        return;
      }

      const result = await backendService.aiCategorize(doc.filename, expenseLabels);
      
      if (result.label_id) {
        toast.success(
          (t) => (
            <div className="flex flex-col">
              <span className="font-bold text-xs uppercase tracking-widest mb-1">AI Suggestion</span>
              <span className="text-sm">This looks like <span className="text-teal-500 font-bold">{result.label_name}</span></span>
              <span className="text-[10px] text-gray-500 mt-1 italic">"{result.reasoning}"</span>
            </div>
          ), 
          { id: `ai-cat-${doc.id}`, duration: 5000 }
        );
      } else {
        toast.error("AI couldn't find a confident match.", { id: `ai-cat-${doc.id}` });
      }
    } catch (err) {
      console.error("AI Categorization failed:", err);
      toast.error("AI Analysis failed", { id: `ai-cat-${doc.id}` });
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      toast.loading("Sending to Doc_vault_Raw...", { id: "upload-doc" });
      
      await backendService.uploadDocument(workbenchId, file, 'sales_invoice');
      
      toast.success("Document uploaded to raw bucket!", { id: "upload-doc" });
      setTimeout(() => fetchDocumentsSilent(), 1500);
    } catch (err) {
      toast.error("Upload failed: " + err.message, { id: "upload-doc" });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleTriggerProcess = async (doc) => {
    try {
      toast.loading("Queuing for analysis...", { id: `proc-${doc.id}` });
      const response = await apiFetch(`/api/ops/documents/process/${doc.id}`, { method: 'POST' });
      if (!response.ok) throw new Error("Server error");
      toast.success("Added to processing queue", { id: `proc-${doc.id}` });
      fetchDocumentsSilent();
    } catch (err) {
      toast.error("Failed to enqueue: " + err.message, { id: `proc-${doc.id}` });
    }
  };

  const filteredDocs = documents.filter(doc => {
    const status = doc.status?.toLowerCase() || '';
    const matchesStage = 
      activeStage === 'uploaded' ? (status === 'uploaded' || status === 'failed' || status === 'needs ruleset' || status === 'needs review' || !status) :
      activeStage === 'processing' ? (status === 'processing' || ['validating', 'splitting', 'ocr_running', 'normalizing', 'aggregating', 'analyzing'].includes(status)) :
      activeStage === 'analyzed' ? (status === 'analyzed' || status === 'processed') : false;

    const matchesSearch = doc.filename?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          doc.metadata?.extracted_invoice?.parties?.vendor_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          doc.metadata?.extracted_invoice?.parties?.customer_name?.toLowerCase().includes(searchQuery.toLowerCase());
                          
    return matchesStage && matchesSearch;
  });

  const countUploaded = documents.filter(d => {
    const s = d.status?.toLowerCase() || '';
    return s === 'uploaded' || s === 'failed' || s === 'needs ruleset' || s === 'needs review' || !s;
  }).length;
  const countProcessing = documents.filter(d => {
    const s = d.status?.toLowerCase() || '';
    return s === 'processing' || ['validating', 'splitting', 'ocr_running', 'normalizing', 'aggregating', 'analyzing'].includes(s);
  }).length;
  const countAnalyzed = documents.filter(d => {
    const s = d.status?.toLowerCase() || '';
    return s === 'analyzed' || s === 'processed';
  }).length;

  const stats = {
    total: documents.length,
    mapped: documents.filter(d => d.metadata?.linked_unit || d.transaction_id).length,
    unmapped: documents.filter(d => !d.metadata?.linked_unit && !d.transaction_id).length
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] text-white animate-in fade-in duration-500 overflow-hidden">
      {/* Header Section */}
      <div className="p-6 pb-2">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center space-x-4">
            <div className="p-3 rounded-2xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
              <BsShieldLock size={28} />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Document Vault</h1>
              <p className="text-sm text-gray-500 mt-1 font-medium">Secure storage for organization proofs and support docs for transactions</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="relative group">
              <BsSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-teal-400 transition-colors" />
              <input 
                type="text"
                placeholder="Search documents or linked units..."
                className="bg-white/5 border border-white/10 rounded-2xl pl-11 pr-4 py-3 text-sm w-80 focus:outline-none focus:border-teal-500/50 transition-all font-medium"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <button 
              onClick={handleUploadClick}
              disabled={isUploading}
              className="flex items-center space-x-2 px-6 py-3 bg-[#81E6D9] text-black rounded-2xl text-sm font-bold hover:opacity-90 transition-all shadow-lg shadow-[#81E6D9]/10 disabled:opacity-50"
            >
              <BsUpload size={16} strokeWidth={1} />
              <span>Upload & Map</span>
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              onChange={handleFileChange}
              accept=".pdf,.jpg,.jpeg,.png,.csv"
            />
          </div>
        </div>

        {/* Stage Tabs */}
        <div className="flex items-center space-x-6 mb-4 border-b border-white/5 pb-px">
          {[
            { id: 'uploaded', label: 'Uploaded Documents', count: countUploaded, activeColor: 'border-blue-500 text-blue-400' },
            { id: 'processing', label: 'Processing Queue', count: countProcessing, activeColor: 'border-amber-500 text-amber-400', isPulse: countProcessing > 0 },
            { id: 'analyzed', label: 'Analysis Notes', count: countAnalyzed, activeColor: 'border-teal-500 text-teal-400' },
          ].map(stage => (
            <button
              key={stage.id}
              onClick={() => setActiveStage(stage.id)}
              className={`pb-3 px-1 text-xs font-black relative transition-all flex items-center space-x-2 border-b-2 -mb-px ${
                activeStage === stage.id 
                  ? `${stage.activeColor}` 
                  : "border-transparent text-gray-500 hover:text-gray-300"
              }`}
            >
              <span className="uppercase tracking-widest">{stage.label}</span>
              <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold bg-white/5 text-gray-400 ${
                stage.isPulse ? 'animate-pulse bg-amber-500/10 text-amber-400 border border-amber-500/20' : ''
              }`}>
                {stage.count}
              </span>
            </button>
          ))}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-6 mb-4">
          {[
            { label: "Total Docs", val: stats.total, color: "text-white" },
            { label: "Mapped to Units", val: stats.mapped, color: "text-teal-400" },
            { label: "Unmapped", val: stats.unmapped, color: "text-rose-400" },
            { label: "Active Stage", val: activeStage === 'uploaded' ? 'Uploaded' : activeStage === 'processing' ? 'Processing Queue' : 'Analysis Notes', color: "text-gray-400", isFilter: true },
          ].map((stat, i) => (
            <div key={i} className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 relative overflow-hidden group">
              <div className="flex flex-col space-y-1 relative z-10">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{stat.label}</span>
                <span className={`text-2xl font-bold ${stat.color}`}>{stat.val}</span>
              </div>
              {!stat.isFilter && (
                <div className="absolute right-0 bottom-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                   <BsShieldLock size={40} className={stat.color} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Document Table Area */}
      <div className="flex-1 px-8 pb-8 overflow-hidden flex flex-col">
        <div className="flex-1 bg-white/[0.01] border border-white/5 rounded-3xl overflow-hidden flex flex-col relative">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm z-20">
               <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
            </div>
          ) : null}

          <div className="flex-1 overflow-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-[#0d1117] z-10 border-b border-white/5">
                <tr>
                  <th className="p-4 w-12"><input type="checkbox" className="rounded bg-white/5 border-white/10" /></th>
                  <th className="p-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Name <span className="ml-1">⇅</span></th>
                  {activeStage === 'analyzed' && <th className="p-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest text-center">Type</th>}
                  {activeStage === 'analyzed' && <th className="p-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Linked Unit</th>}
                  {activeStage === 'analyzed' && <th className="p-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest text-right">Amount</th>}
                  <th className="p-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest text-right">Date Added</th>
                  <th className="p-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest text-right pr-6">Size</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {filteredDocs.length === 0 ? (
                  <tr>
                    <td colSpan={activeStage === 'analyzed' ? 7 : 5} className="p-20 text-center">
                       <div className="flex flex-col items-center space-y-4 opacity-40">
                          <BsFileEarmarkText size={48} className="text-gray-600" />
                          <h3 className="text-lg font-bold">No documents found</h3>
                          <p className="text-sm max-w-xs">Upload your first organization document or refine your search/filters.</p>
                       </div>
                    </td>
                  </tr>
                ) : (
                  filteredDocs.map((doc, idx) => (
                    <motion.tr 
                      key={doc.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="group hover:bg-white/[0.02] transition-colors cursor-pointer"
                    >
                      <td className="p-4"><input type="checkbox" className="rounded bg-white/5 border-white/10" /></td>
                      <td className="p-4">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 rounded-lg bg-white/5 text-gray-500 group-hover:text-teal-400 transition-colors">
                             {doc.filename?.endsWith('.pdf') ? <BsFileEarmarkPdf size={18} /> : <BsFileEarmarkText size={18} />}
                          </div>
                          <div>
                            <span className="text-sm font-bold text-white group-hover:text-teal-400 transition-colors truncate block max-w-xs">
                              {doc.filename}
                            </span>
                             <div className="flex items-center space-x-2 mt-1">
                              {doc.status?.toLowerCase() === 'uploaded' && (
                                <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                  Uploaded
                                </span>
                              )}
                               {['processing', 'validating', 'splitting', 'ocr_running', 'normalizing', 'aggregating', 'analyzing'].includes(doc.status?.toLowerCase()) && (
                                 <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse flex items-center">
                                   <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping mr-1" />
                                   {doc.status?.toLowerCase() === 'processing' ? 'Processing' : 
                                    doc.status?.toLowerCase() === 'validating' ? 'Validating' : 
                                    doc.status?.toLowerCase() === 'splitting' ? 'Splitting Pages' : 
                                    doc.status?.toLowerCase() === 'ocr_running' ? (
                                      doc.metadata?.total_pages ? 
                                      `OCR: ${(doc.metadata?.completed_pages || 0) + (doc.metadata?.failed_pages || 0)}/${doc.metadata.total_pages}` : 
                                      'Running OCR'
                                    ) : 
                                    doc.status?.toLowerCase() === 'normalizing' ? 'Normalizing' : 
                                    doc.status?.toLowerCase() === 'aggregating' ? 'Aggregating' : 
                                    doc.status?.toLowerCase() === 'analyzing' ? 'Analyzing' : 'Processing'}
                                 </span>
                               )}
                              {doc.status?.toLowerCase() === 'analyzed' && (
                                <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest bg-teal-500/10 text-teal-400 border border-teal-500/20">
                                  Analyzed
                                </span>
                              )}
                              {(doc.status?.toLowerCase() === 'processed' || doc.status?.toLowerCase() === 'completed') && (
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    window.dispatchEvent(new CustomEvent('change-workbench-tab', { detail: { tab: 'TradeEngine' } }));
                                  }}
                                  className="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest bg-teal-500/10 text-teal-400 border border-teal-500/20 hover:bg-teal-500 hover:text-black transition-all cursor-pointer"
                                  title="Click to view trade in Trade Engine"
                                >
                                  Processed
                                </button>
                              )}
                              {doc.status?.toLowerCase() === 'needs review' && (
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    window.dispatchEvent(new CustomEvent('change-workbench-tab', { detail: { tab: 'TradeEngine' } }));
                                  }}
                                  className="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest bg-amber-500/10 text-amber-300 border border-amber-500/20 hover:bg-amber-500 hover:text-black transition-all cursor-pointer"
                                  title="Click to review trade in Trade Engine"
                                >
                                  Needs Review
                                </button>
                              )}
                              {doc.status?.toLowerCase() === 'failed' && (
                                <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest bg-red-500/10 text-red-400 border border-red-500/20" title={doc.metadata?.error || "Processing failed"}>
                                  Failed
                                </span>
                              )}
                              {doc.status?.toLowerCase() === 'needs ruleset' && (
                                <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest bg-amber-500/10 text-amber-300 border border-amber-500/20" title="This document does not have an active ruleset. Configure a playbook to auto-process.">
                                  Needs Ruleset
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      {activeStage === 'analyzed' && (
                        <td className="p-4 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-tighter ${
                            DOC_TYPES.find(t => t.id === doc.document_type)?.color || 'bg-white/5 text-gray-500'
                          }`}>
                            {doc.document_type || 'Uncategorized'}
                          </span>
                        </td>
                      )}
                      {activeStage === 'analyzed' && (
                        <td className="p-4">
                          {doc.display_linked_unit ? (
                            <div className="flex items-center space-x-1.5 text-teal-400">
                               <BsLink45Deg className="text-lg" />
                               <span className="text-xs font-bold underline underline-offset-4 decoration-teal-500/30 truncate max-w-[150px]">
                                 {doc.display_linked_unit}
                               </span>
                            </div>
                           ) : (
                            <div className="flex items-center space-x-2">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedDocForLinking(doc);
                                  setIsLinkModalOpen(true);
                                }}
                                className="flex items-center space-x-1.5 text-gray-600 hover:text-teal-400 transition-colors group/link"
                              >
                                 <BsPlusLg size={10} className="group-hover/link:rotate-90 transition-transform" />
                                 <span className="text-[10px] font-bold uppercase tracking-widest">Link Unit</span>
                              </button>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  handleAICategorize(doc);
                                }}
                                title="AI Categorize Suggestion"
                                className="p-1 rounded-md bg-teal-500/5 text-teal-500/40 hover:text-teal-400 hover:bg-teal-500/10 transition-all"
                              >
                                 <BsMagic size={10} />
                              </button>
                            </div>
                          )}
                        </td>
                      )}
                      {activeStage === 'analyzed' && (
                        <td className="p-4 text-right text-sm font-bold text-white">
                          {doc.display_amount ? `₹${Number(doc.display_amount).toLocaleString()}` : '—'}
                        </td>
                      )}
                      <td className="p-4 text-right text-xs text-gray-500 font-medium">
                        {new Date(doc.created_at).toLocaleDateString()}
                      </td>
                      <td className="p-4 text-right pr-6">
                        <div className="flex items-center justify-end space-x-3">
                          <span className="text-[10px] text-gray-600 font-bold">{(doc.file_size / (1024 * 1024)).toFixed(2)} MB</span>
                          <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                             {doc.filename?.toLowerCase().match(/\.(csv|xlsx|xls)$/) && (
                               <button 
                                 onClick={(e) => {
                                   e.stopPropagation();
                                   navigate(`/data-ingestion?workbench=${workbenchId}&docId=${doc.id}`);
                                 }}
                                 title="Ingest to Ledger"
                                 className="p-1.5 rounded-lg bg-teal-500/10 text-teal-400 hover:bg-teal-500 hover:text-black transition-all"
                               >
                                  <BsArrowRight size={14} />
                               </button>
                             )}
                             {(doc.status === 'analyzed' || doc.status === 'processed') && doc.metadata?.extracted_invoice && (
                                <div className="flex space-x-1">
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setAnalysisNoteDoc(doc);
                                      setIsAnalysisModalOpen(true);
                                    }}
                                    title="View AI Analysis Note"
                                    className="p-1.5 rounded-lg bg-teal-500/10 text-teal-400 hover:bg-teal-500 hover:text-black transition-all"
                                  >
                                     <BsStars size={14} />
                                  </button>
                                </div>
                              )}
                             {(doc.status === 'uploaded' || doc.status === 'failed' || doc.status === 'Needs Ruleset' || doc.status === 'processed' || doc.status === 'Needs Review' || !doc.status) && (
                               <button 
                                 onClick={async (e) => {
                                   e.stopPropagation();
                                   handleTriggerProcess(doc);
                                 }}
                                 title="Process / Re-run Ruleset matching"
                                 className="p-1.5 rounded-lg bg-teal-500/10 text-teal-400 hover:bg-teal-500 hover:text-black transition-all"
                               >
                                  <BsMagic size={14} />
                               </button>
                             )}
                             <button 
                               onClick={async (e) => {
                                 e.stopPropagation();
                                 try {
                                   const url = await backendService.getDocumentUrl(doc.file_path);
                                   window.open(url, '_blank');
                                 } catch (err) {
                                   toast.error("Failed to open document");
                                 }
                               }}
                               title="View Document"
                               className="p-1.5 rounded-lg bg-white/5 text-gray-400 hover:text-white hover:bg-white/10"
                             >
                                <BsEye size={14} />
                             </button>
                             <button 
                               onClick={async (e) => {
                                 e.stopPropagation();
                                 try {
                                   toast.loading("Preparing download...", { id: "dl-doc" });
                                   await backendService.downloadDocument(doc.file_path, doc.filename);
                                   toast.success("Download started", { id: "dl-doc" });
                                 } catch (err) {
                                   toast.error("Download failed", { id: "dl-doc" });
                                 }
                               }}
                               title="Download Document"
                               className="p-1.5 rounded-lg bg-white/5 text-gray-400 hover:text-white hover:bg-white/10"
                             >
                                <BsDownload size={14} />
                             </button>
                             <button 
                               onClick={async (e) => {
                                 e.stopPropagation();
                                 if (!window.confirm(`Are you sure you want to delete ${doc.filename}?`)) return;
                                 try {
                                   toast.loading("Deleting...", { id: "del-doc" });
                                   await backendService.deleteDocument(doc.id, doc.file_path);
                                   toast.success("Document deleted", { id: "del-doc" });
                                   fetchDocuments();
                                 } catch (err) {
                                   toast.error("Delete failed: " + err.message, { id: "del-doc" });
                                 }
                               }}
                               title="Delete Document"
                               className="p-1.5 rounded-lg bg-white/5 text-gray-400 hover:text-rose-400 hover:bg-rose-500/10"
                             >
                                <BsTrash size={14} />
                             </button>
                          </div>
                        </div>
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      
      <LinkDocumentModal 
        isOpen={isLinkModalOpen}
        onClose={() => setIsLinkModalOpen(false)}
        document={selectedDocForLinking}
        workbenchId={workbenchId}
        onSuccess={fetchDocuments}
      />

      <AnalysisNoteModal 
        isOpen={isAnalysisModalOpen}
        onClose={() => {
          setIsAnalysisModalOpen(false);
          setAnalysisNoteDoc(null);
        }}
        doc={analysisNoteDoc}
      />
    </div>
  );
}

function AnalysisNoteModal({ isOpen, onClose, doc }) {
  const [copied, setCopied] = useState(false);
  if (!isOpen || !doc) return null;

  const isBankStatement = doc.document_type === 'bank_statement' || !!doc.metadata?.bank_statement;
  const note = isBankStatement ? (doc.metadata?.bank_statement || {}) : (doc.metadata?.extracted_invoice || {});

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(note, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("JSON copied to clipboard!");
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-in fade-in duration-200">
      <div className={`bg-[#0a0a0a] border border-white/10 w-full rounded-[32px] flex flex-col overflow-hidden max-h-[85vh] shadow-2xl ${
        isBankStatement ? 'max-w-6xl' : 'max-w-3xl'
      }`}>
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-teal-500/10 text-teal-400 border border-teal-500/20 rounded-2xl">
              <BsStars size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {isBankStatement ? "Bank Statement Financial Dashboard" : "AI Analysis Note"}
              </h3>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                {isBankStatement ? "Parsed Statement Analytics & Transactions" : "Parsed document event schema"}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-colors text-gray-500 hover:text-white">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-grow overflow-y-auto p-6 space-y-6 custom-scrollbar text-sm">
          {isBankStatement ? (
            <BankStatementDashboard note={note} />
          ) : (
            <>
              {/* Main Info */}
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                  <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Document Type</span>
                  <span className="text-xs font-black text-teal-400 uppercase tracking-tighter bg-teal-500/10 px-2 py-0.5 rounded border border-teal-500/20">
                    {note.document_type || doc.document_type || "Unknown"}
                  </span>
                </div>
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                  <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Confidence Score</span>
                  <span className="text-sm font-bold text-white">{(note.confidence ? note.confidence * 100 : 98).toFixed(0)}%</span>
                </div>
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                  <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Issue Date</span>
                  <span className="text-sm font-bold text-white">{note.document_metadata?.document_date || "—"}</span>
                </div>
              </div>

              {/* Parties & Currency */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2">
                  <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest block">Parties Involved</span>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between"><span className="text-gray-500">Vendor:</span> <span className="text-white font-bold">{note.parties?.vendor_name || "—"}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Customer:</span> <span className="text-white font-bold">{note.parties?.customer_name || "—"}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">GSTIN:</span> <span className="text-white font-bold">{note.parties?.gst_number || "—"}</span></div>
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2">
                  <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest block">References & Financials</span>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between"><span className="text-gray-500">Invoice #:</span> <span className="text-white font-bold">{note.references?.invoice_number || "—"}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Currency:</span> <span className="text-white font-bold">{note.document_metadata?.currency || "INR"}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Total Amt:</span> <span className="text-teal-400 font-bold">{note.financials?.total_amount ? `${note.document_metadata?.currency || 'INR'} ${note.financials.total_amount.toLocaleString()}` : "—"}</span></div>
                  </div>
                </div>
              </div>

              {/* Line Items */}
              {note.line_items && note.line_items.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest block">Extracted Line Items</span>
                  <div className="border border-white/5 rounded-2xl overflow-hidden bg-black/40">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-white/5 text-[9px] font-bold uppercase tracking-widest text-gray-500">
                        <tr>
                          <th className="p-3">Description</th>
                          <th className="p-3 text-right">Qty</th>
                          <th className="p-3 text-right">Unit Price</th>
                          <th className="p-3 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {note.line_items.map((item, idx) => (
                          <tr key={idx}>
                            <td className="p-3 text-white font-bold">{item.description}</td>
                            <td className="p-3 text-right text-gray-400">{item.quantity}</td>
                            <td className="p-3 text-right text-gray-400">{item.unit_price?.toLocaleString()}</td>
                            <td className="p-3 text-right text-teal-400 font-bold">{item.amount?.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Raw JSON View */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest block">Raw OCR Event Schema Note</span>
              <button 
                onClick={handleCopy}
                className="text-[10px] font-bold text-teal-400 hover:text-teal-300 transition-colors uppercase tracking-widest"
              >
                {copied ? "Copied!" : "Copy JSON"}
              </button>
            </div>
            <pre className="p-4 bg-black rounded-2xl text-[11px] font-mono text-gray-300 overflow-x-auto max-h-48 border border-white/5 custom-scrollbar">
              {JSON.stringify(note, null, 2)}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/5 flex justify-end bg-white/[0.02]">
          <button 
            onClick={onClose}
            className="px-6 py-2.5 bg-white/5 border border-white/10 rounded-2xl text-xs font-bold text-gray-300 hover:text-white transition-colors"
          >
            Close Note
          </button>
        </div>
      </div>
    </div>
  );
}

function BankStatementDashboard({ note }) {
  const [search, setSearch] = useState("");
  const summary = note.statement_summary || {};
  const kpis = note.transaction_summary || {};
  const validation = note.validation || {};
  const paymentModes = note.payment_mode_summary || [];
  const beneficiaries = note.beneficiary_summary || [];
  const transactions = note.transactions || [];

  const filteredTx = transactions.filter(t => {
    const s = search.toLowerCase();
    return (
      (t.raw_particulars || "").toLowerCase().includes(s) ||
      (t.beneficiary_name || "").toLowerCase().includes(s) ||
      (t.beneficiary_bank || "").toLowerCase().includes(s) ||
      (t.reference_number || "").toLowerCase().includes(s) ||
      (t.category || "").toLowerCase().includes(s) ||
      (t.date || "").toLowerCase().includes(s)
    );
  });

  return (
    <div className="space-y-6">
      {/* Statement Summary Card */}
      <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
        <div>
          <span className="text-[10px] text-gray-500 uppercase tracking-widest block font-bold mb-1">Bank</span>
          <span className="text-white font-bold text-sm">{summary.bank_name || "—"}</span>
        </div>
        <div>
          <span className="text-[10px] text-gray-500 uppercase tracking-widest block font-bold mb-1">Account Holder</span>
          <span className="text-white font-bold text-sm">{summary.account_holder_name || "—"}</span>
        </div>
        <div>
          <span className="text-[10px] text-gray-500 uppercase tracking-widest block font-bold mb-1">Account Number</span>
          <span className="text-white font-bold text-sm">{summary.account_number || "—"}</span>
        </div>
        <div>
          <span className="text-[10px] text-gray-500 uppercase tracking-widest block font-bold mb-1">Statement Period</span>
          <span className="text-white font-bold text-sm">
            {summary.statement_start_date || "—"} to {summary.statement_end_date || "—"}
            <span className="text-[10px] text-gray-500 block font-normal mt-0.5">({kpis.statement_duration || "—"} days)</span>
          </span>
        </div>
      </div>

      {/* Validation Card */}
      <div className={`p-4.5 rounded-2xl border flex items-center justify-between ${
        validation.balance_verified 
          ? "bg-emerald-500/5 border-emerald-500/10 text-emerald-400" 
          : "bg-rose-500/5 border-rose-500/10 text-rose-400"
      }`}>
        <div className="flex items-center space-x-3">
          <span className="text-xl font-bold">{validation.balance_verified ? "✓" : "⚠"}</span>
          <div>
            <h4 className="font-extrabold text-sm uppercase tracking-wider">
              {validation.balance_verified ? "Balance Verified" : "Balance Mismatch"}
            </h4>
            <p className="text-xs opacity-75">
              {validation.balance_verified 
                ? "Opening Balance + Credits - Debits exactly matches Closing Balance." 
                : "OCR verification recommended. Mathematical mismatch detected between opening balance, transactions, and closing balance."}
            </p>
          </div>
        </div>
        <div className="text-right">
          <span className="text-[10px] uppercase font-bold tracking-widest block opacity-75">Difference</span>
          <span className="text-lg font-black">₹{Number(validation.difference || 0).toLocaleString()}</span>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Opening Balance", val: kpis.opening_balance, color: "text-white" },
          { label: "Closing Balance", val: kpis.closing_balance, color: "text-teal-400" },
          { label: "Total Credits", val: kpis.credit_total, sub: `${kpis.credit_count} txn`, color: "text-emerald-400" },
          { label: "Total Debits", val: kpis.debit_total, sub: `${kpis.debit_count} txn`, color: "text-rose-400" },
          { label: "Net Cash Flow", val: kpis.net_cash_flow, color: kpis.net_cash_flow >= 0 ? "text-emerald-400" : "text-rose-400" },
          { label: "Total Transactions", val: kpis.total_transactions, isRaw: true, color: "text-white" },
          { label: "Active Days", val: kpis.active_transaction_days, isRaw: true, color: "text-white" },
          { label: "Largest Credit", val: kpis.highest_credit, color: "text-emerald-400" },
          { label: "Largest Debit", val: kpis.highest_debit, color: "text-rose-400" },
          { label: "Average Credit", val: kpis.average_credit, color: "text-emerald-400" },
          { label: "Average Debit", val: kpis.average_debit, color: "text-rose-400" },
        ].map((card, i) => (
          <div key={i} className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1 relative overflow-hidden group">
            <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest block">{card.label}</span>
            <div className="flex items-baseline space-x-1.5">
              <span className={`text-lg font-extrabold ${card.color}`}>
                {card.isRaw ? card.val : `₹${Number(card.val || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
              </span>
              {card.sub && <span className="text-[10px] text-gray-500 font-bold">({card.sub})</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Analyst Notes */}
      <div className="p-5 rounded-2xl bg-teal-500/[0.02] border border-teal-500/10 space-y-3">
        <h4 className="text-[10px] font-black text-teal-400 uppercase tracking-widest">Analyst Note Observations</h4>
        <pre className="text-xs text-gray-300 font-sans whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto custom-scrollbar">
          {note.analysis_note || "No observations generated."}
        </pre>
      </div>

      {/* Summaries Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Payment Modes */}
        <div className="space-y-2">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block">Payment Mode Summary</span>
          <div className="border border-white/5 rounded-2xl overflow-hidden bg-black/20">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/5 text-[9px] font-bold uppercase tracking-widest text-gray-500 border-b border-white/5">
                <tr>
                  <th className="p-3">Mode</th>
                  <th className="p-3 text-right">Count</th>
                  <th className="p-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {paymentModes.map((item, idx) => (
                  <tr key={idx} className="hover:bg-white/[0.01]">
                    <td className="p-3 text-white font-bold">{item.mode}</td>
                    <td className="p-3 text-right text-gray-400 font-medium">{item.count}</td>
                    <td className="p-3 text-right text-teal-400 font-black">₹{item.amount?.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Beneficiary Summary */}
        <div className="space-y-2">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block">Beneficiary Summary</span>
          <div className="border border-white/5 rounded-2xl overflow-hidden bg-black/20">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/5 text-[9px] font-bold uppercase tracking-widest text-gray-500 border-b border-white/5">
                <tr>
                  <th className="p-3">Beneficiary</th>
                  <th className="p-3 text-right">Txn (Dr/Cr)</th>
                  <th className="p-3 text-right">Credits</th>
                  <th className="p-3 text-right">Debits</th>
                  <th className="p-3 text-right">Net</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {beneficiaries.map((item, idx) => (
                  <tr key={idx} className="hover:bg-white/[0.01]">
                    <td className="p-3 text-white font-bold truncate max-w-[120px]" title={item.beneficiary_name}>
                      {item.beneficiary_name}
                      {item.beneficiary_bank && <span className="text-[9px] text-gray-500 block font-normal">{item.beneficiary_bank}</span>}
                    </td>
                    <td className="p-3 text-right text-gray-400 font-medium">{item.debit_count}/{item.credit_count}</td>
                    <td className="p-3 text-right text-emerald-400 font-bold">₹{item.total_credits?.toLocaleString()}</td>
                    <td className="p-3 text-right text-rose-400 font-bold">₹{item.total_debits?.toLocaleString()}</td>
                    <td className={`p-3 text-right font-black ${item.net_amount >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      ₹{item.net_amount?.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Transactions Searchable Table */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block">Search Statement Transactions</span>
          <div className="relative">
            <input 
              type="text"
              placeholder="Search date, beneficiary, particulars..."
              className="bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-teal-500 w-64 transition-all"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="border border-white/5 rounded-2xl overflow-hidden bg-black/40 max-h-96 overflow-y-auto custom-scrollbar">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 bg-[#0A0A0A] text-[9px] font-bold uppercase tracking-widest text-gray-500 border-b border-white/5 z-10">
              <tr>
                <th className="p-3">Date</th>
                <th className="p-3 text-right">Debit</th>
                <th className="p-3 text-right">Credit</th>
                <th className="p-3 text-right">Balance</th>
                <th className="p-3">Mode</th>
                <th className="p-3">Beneficiary</th>
                <th className="p-3">Category</th>
                <th className="p-3">Reference</th>
                <th className="p-3">Raw Particulars</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredTx.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-12 text-center text-gray-500">
                    No transactions match search criteria.
                  </td>
                </tr>
              ) : (
                filteredTx.map((tx, idx) => (
                  <tr key={idx} className="hover:bg-white/[0.01] transition-colors">
                    <td className="p-3 text-white font-medium whitespace-nowrap">{tx.date}</td>
                    <td className="p-3 text-right text-rose-400 font-bold">
                      {tx.debit_amount ? `₹${tx.debit_amount.toLocaleString()}` : "—"}
                    </td>
                    <td className="p-3 text-right text-emerald-400 font-bold">
                      {tx.credit_amount ? `₹${tx.credit_amount.toLocaleString()}` : "—"}
                    </td>
                    <td className="p-3 text-right text-teal-400 font-bold">
                      {tx.balance ? `₹${tx.balance.toLocaleString()}` : "—"}
                    </td>
                    <td className="p-3 text-gray-400 font-medium">{tx.payment_mode || "—"}</td>
                    <td className="p-3 text-white font-bold truncate max-w-[150px]" title={tx.beneficiary_name}>
                      {tx.beneficiary_name || "—"}
                      {tx.beneficiary_bank && <span className="text-[9px] text-gray-500 block font-normal">{tx.beneficiary_bank}</span>}
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-white/5 text-gray-400">
                        {tx.category || "Unknown"}
                      </span>
                    </td>
                    <td className="p-3 text-gray-500 font-mono truncate max-w-[100px]" title={tx.reference_number || tx.cheque_number}>
                      {tx.reference_number || tx.cheque_number || "—"}
                    </td>
                    <td className="p-3 text-gray-500 truncate max-w-[200px]" title={tx.raw_particulars}>
                      {tx.raw_particulars}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
