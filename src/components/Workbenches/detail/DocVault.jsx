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
  { id: 'sales_order', label: 'Sales Order', color: 'bg-lime-500/10 text-lime-400' },
  { id: 'manual_journal', label: 'Manual Journal', color: 'bg-zinc-500/10 text-zinc-400' }
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
    const hasProcessing = documents.some(d => d.status === 'uploaded' || d.status === 'processing');
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
      const response = await fetch(`http://localhost:8000/api/ops/documents/process/${doc.id}`, { method: 'POST' });
      if (!response.ok) throw new Error("Server error");
      toast.success("Added to processing queue", { id: `proc-${doc.id}` });
      fetchDocumentsSilent();
    } catch (err) {
      toast.error("Failed to enqueue: " + err.message, { id: `proc-${doc.id}` });
    }
  };

  const filteredDocs = documents.filter(doc => {
    const matchesStage = 
      activeStage === 'uploaded' ? (doc.status === 'uploaded' || doc.status === 'failed' || !doc.status) :
      activeStage === 'processing' ? doc.status === 'processing' :
      activeStage === 'analyzed' ? doc.status === 'analyzed' : false;

    const matchesSearch = doc.filename?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          doc.metadata?.extracted_invoice?.parties?.vendor_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          doc.metadata?.extracted_invoice?.parties?.customer_name?.toLowerCase().includes(searchQuery.toLowerCase());
                          
    return matchesStage && matchesSearch;
  });

  const countUploaded = documents.filter(d => d.status === 'uploaded' || d.status === 'failed' || !d.status).length;
  const countProcessing = documents.filter(d => d.status === 'processing').length;
  const countAnalyzed = documents.filter(d => d.status === 'analyzed').length;

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
                              {doc.status === 'uploaded' && (
                                <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                  Uploaded
                                </span>
                              )}
                              {doc.status === 'processing' && (
                                <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse flex items-center">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping mr-1" />
                                  Processing
                                </span>
                              )}
                              {doc.status === 'analyzed' && (
                                <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest bg-teal-500/10 text-teal-400 border border-teal-500/20">
                                  Analyzed
                                </span>
                              )}
                              {doc.status === 'failed' && (
                                <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest bg-red-500/10 text-red-400 border border-red-500/20" title={doc.metadata?.error || "Processing failed"}>
                                  Failed
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
                             {doc.status === 'analyzed' && doc.metadata?.extracted_invoice && (
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
                              )}
                             {(doc.status === 'uploaded' || doc.status === 'failed' || !doc.status) && (
                               <button 
                                 onClick={async (e) => {
                                   e.stopPropagation();
                                   handleTriggerProcess(doc);
                                 }}
                                 title="Process / Retry Document"
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

  const note = doc.metadata?.extracted_invoice || {};

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(note, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("JSON copied to clipboard!");
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="bg-[#0a0a0a] border border-white/10 w-full max-w-3xl rounded-[32px] flex flex-col overflow-hidden max-h-[85vh] shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-teal-500/10 text-teal-400 border border-teal-500/20 rounded-2xl">
              <BsStars size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">AI Analysis Note</h3>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Parsed document event schema</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-colors text-gray-500 hover:text-white">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-grow overflow-y-auto p-6 space-y-6 custom-scrollbar text-sm">
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
