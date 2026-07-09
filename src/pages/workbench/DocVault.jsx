import React, { useState, useEffect, useCallback } from "react";
import { useWorkbench } from "../../context/WorkbenchContext";
import { diService } from "../../services/diService";
import { toast } from "react-hot-toast";
import { useDropzone } from "react-dropzone";
import { 
  BsCloudUpload, 
  BsFileEarmarkText, 
  BsCheckCircle, 
  BsXCircle, 
  BsClockHistory, 
  BsX, 
  BsSearch, 
  BsShieldLock, 
  BsStars 
} from "react-icons/bs";

export default function DocVault() {
  const { activeWorkbench } = useWorkbench();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [activeTab, setActiveTab] = useState("UPLOADED DOCUMENTS");

  useEffect(() => {
    if (activeWorkbench) {
      loadDocuments();
    }
  }, [activeWorkbench]);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const docs = await diService.getDocuments(activeWorkbench.id);
      setDocuments(docs || []);
    } catch (err) {
      toast.error("Failed to load documents");
    } finally {
      setLoading(false);
    }
  };

  const onDrop = useCallback(async (acceptedFiles) => {
    if (acceptedFiles.length === 0) return;
    
    setUploading(true);
    const file = acceptedFiles[0];
    
    try {
      toast.loading("Uploading document...", { id: "upload" });
      const res = await diService.uploadDocument(activeWorkbench.id, file);
      
      toast.loading("Processing AI Extraction...", { id: "upload" });
      
      const analysis = await diService.processDocument(res.document_id);
      
      toast.success("Document processed successfully!", { id: "upload" });
      loadDocuments();
    } catch (err) {
      toast.error(err.message || "Upload failed", { id: "upload" });
    } finally {
      setUploading(false);
    }
  }, [activeWorkbench]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png']
    },
    multiple: false,
    noClick: true // We will handle clicks manually for the upload button
  });

  const getStatusPill = (status) => {
    if (status === 'success') {
      return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-500/20 text-teal-400 border border-teal-500/20 tracking-wider">SUCCESS</span>;
    }
    if (status === 'failed') {
      return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-500 border border-rose-500/20 tracking-wider">FAILED</span>;
    }
    return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-500 border border-amber-500/20 tracking-wider">PROCESSING</span>;
  };

  const handleCopyJSON = (data) => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    toast.success("JSON copied to clipboard!");
  };

  return (
    <div className="flex flex-col flex-1 h-full bg-[#0D0D0D] overflow-hidden text-gray-200 font-sans" {...getRootProps()}>
      <input {...getInputProps()} />
      
      {/* Header Area */}
      <div className="px-8 pt-8 pb-4">
        <div className="flex justify-between items-start mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center">
              <BsShieldLock className="text-teal-500 text-xl" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Document Vault</h1>
              <p className="text-sm text-gray-500 mt-1">Secure storage for organization proofs and support docs for transactions</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <BsSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
              <input 
                type="text" 
                placeholder="Search documents or linked units..." 
                className="w-64 bg-[#181818] border border-white/5 rounded-lg pl-10 pr-4 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-teal-500/50 transition-colors"
              />
            </div>
            <label className="flex items-center gap-2 bg-teal-300 hover:bg-teal-400 text-teal-950 px-4 py-2 rounded-lg font-semibold text-sm cursor-pointer transition-colors shadow-[0_0_15px_rgba(45,212,191,0.2)]">
              <BsCloudUpload className="text-lg" />
              Upload & Map
              {/* Hidden file input for button click */}
              <input type="file" className="hidden" onChange={(e) => onDrop(Array.from(e.target.files))} accept=".pdf,.jpg,.jpeg,.png" />
            </label>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-8 border-b border-white/5">
          {["UPLOADED DOCUMENTS", "PROCESSING QUEUE", "ANALYSIS NOTES"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 text-xs font-bold tracking-wider uppercase transition-colors relative
                ${activeTab === tab ? "text-blue-400" : "text-gray-500 hover:text-gray-300"}`}
            >
              <div className="flex items-center gap-2">
                {tab}
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${activeTab === tab ? "bg-blue-500/20 text-blue-400" : "bg-white/5 text-gray-500"}`}>
                  {tab === "UPLOADED DOCUMENTS" ? documents.length : tab === "ANALYSIS NOTES" ? documents.filter(d => d.di_analysis_notes?.length > 0).length : 0}
                </span>
              </div>
              {activeTab === tab && (
                <div className="absolute bottom-0 left-0 w-full h-[2px] bg-blue-500 rounded-t-full shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 px-8 pb-8 overflow-y-auto">
        
        {/* KPI Cards */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-[#141414] border border-white/5 rounded-xl p-5 relative overflow-hidden group">
            <div className="absolute right-0 bottom-0 opacity-5 transform translate-x-1/4 translate-y-1/4">
              <BsShieldLock className="text-8xl" />
            </div>
            <h3 className="text-xs font-bold text-gray-500 tracking-wider uppercase mb-2">Total Docs</h3>
            <div className="text-3xl font-bold text-white">{documents.length}</div>
          </div>
          <div className="bg-[#141414] border border-white/5 rounded-xl p-5 relative overflow-hidden">
            <div className="absolute right-0 bottom-0 opacity-5 transform translate-x-1/4 translate-y-1/4">
              <BsShieldLock className="text-8xl text-teal-500" />
            </div>
            <h3 className="text-xs font-bold text-gray-500 tracking-wider uppercase mb-2">Mapped To Units</h3>
            <div className="text-3xl font-bold text-teal-500">
              {documents.filter(d => d.di_analysis_notes?.length > 0).length}
            </div>
          </div>
          <div className="bg-[#141414] border border-white/5 rounded-xl p-5 relative overflow-hidden">
            <div className="absolute right-0 bottom-0 opacity-5 transform translate-x-1/4 translate-y-1/4">
              <BsShieldLock className="text-8xl text-rose-500" />
            </div>
            <h3 className="text-xs font-bold text-gray-500 tracking-wider uppercase mb-2">Unmapped</h3>
            <div className="text-3xl font-bold text-rose-500">
              {documents.filter(d => !d.di_analysis_notes?.length).length}
            </div>
          </div>
          <div className="bg-[#141414] border border-white/5 rounded-xl p-5 flex flex-col justify-center">
            <h3 className="text-xs font-bold text-gray-500 tracking-wider uppercase mb-2">Active Stage</h3>
            <div className="text-2xl font-bold text-gray-300">Uploaded</div>
          </div>
        </div>

        {/* Documents Table */}
        <div className="bg-[#141414] border border-white/5 rounded-xl overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/5 text-[11px] font-bold text-gray-500 tracking-widest uppercase">
                <th className="p-4 w-12 text-center">
                  <input type="checkbox" className="rounded border-gray-600 bg-transparent focus:ring-teal-500/50 checked:bg-teal-500" />
                </th>
                <th className="p-4">Name</th>
                <th className="p-4">Date Added</th>
                <th className="p-4">Size</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan="4" className="p-8 text-center text-gray-500 animate-pulse">Loading documents...</td>
                </tr>
              ) : documents.length === 0 ? (
                <tr>
                  <td colSpan="4" className="p-8 text-center text-gray-500">
                    {uploading ? "Uploading..." : "No documents in the vault yet."}
                  </td>
                </tr>
              ) : (
                documents.map((doc) => {
                  const latestLog = doc.di_document_processing_logs?.sort((a,b) => new Date(b.created_at) - new Date(a.created_at))[0];
                  const hasAnalysis = doc.di_analysis_notes?.length > 0;
                  
                  return (
                    <tr 
                      key={doc.id} 
                      className="hover:bg-white/[0.02] transition-colors cursor-pointer group"
                      onClick={() => hasAnalysis && setSelectedDoc(doc)}
                    >
                      <td className="p-4 w-12 text-center">
                        <input type="checkbox" className="rounded border-gray-600 bg-transparent focus:ring-teal-500/50 checked:bg-teal-500" onClick={(e) => e.stopPropagation()} />
                      </td>
                      <td className="p-4">
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                            <BsFileEarmarkText className="text-gray-400 text-xl" />
                          </div>
                          <div>
                            <div className="font-semibold text-gray-200 text-sm mb-1 line-clamp-1 group-hover:text-teal-400 transition-colors">
                              {doc.original_filename.toUpperCase()}
                            </div>
                            {getStatusPill(latestLog?.status || 'started')}
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-sm text-gray-500">
                        {new Date(doc.created_at).toLocaleDateString()}
                      </td>
                      <td className="p-4 text-sm text-gray-500">
                        {doc.size_bytes ? (doc.size_bytes / (1024 * 1024)).toFixed(2) + " MB" : "-"}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* AI Analysis Note Modal Overlay */}
      {selectedDoc && selectedDoc.di_analysis_notes?.length > 0 && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111111] border border-white/10 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-white/5 flex justify-between items-start">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center">
                  <BsStars className="text-teal-400 text-xl" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white tracking-tight">AI Analysis Note</h2>
                  <p className="text-[10px] font-bold text-gray-500 tracking-widest uppercase mt-1">Parsed Document Event Schema</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedDoc(null)} 
                className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors"
              >
                <BsX className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              
              {/* Line Items Grid */}
              {selectedDoc.di_analysis_notes[0].extracted_data?.line_items?.length > 0 && (
                <div>
                  <div className="grid grid-cols-[1fr_80px_100px_100px] gap-4 mb-3 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                    <div>Description</div>
                    <div className="text-right">Qty</div>
                    <div className="text-right">Price</div>
                    <div className="text-right">Total</div>
                  </div>
                  <div className="space-y-2">
                    {selectedDoc.di_analysis_notes[0].extracted_data.line_items.map((item, idx) => (
                      <div key={idx} className="grid grid-cols-[1fr_80px_100px_100px] gap-4 p-4 rounded-xl bg-[#161616] border border-white/5 text-sm font-semibold text-gray-300">
                        <div>{item.description || '-'}</div>
                        <div className="text-right font-medium text-gray-400">{item.quantity || 1}</div>
                        <div className="text-right font-medium text-gray-400">{item.unit_price ? Number(item.unit_price).toLocaleString() : '-'}</div>
                        <div className="text-right font-bold text-teal-400">{item.total ? Number(item.total).toLocaleString() : '-'}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Raw JSON Block */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Raw OCR Event Schema Note</h3>
                  <button 
                    onClick={() => handleCopyJSON(selectedDoc.di_analysis_notes[0].extracted_data)}
                    className="text-xs font-bold text-teal-400 hover:text-teal-300 uppercase tracking-wider transition-colors"
                  >
                    Copy JSON
                  </button>
                </div>
                <div className="bg-[#0A0A0A] border border-white/5 rounded-xl p-5 overflow-x-auto">
                  <pre className="text-[13px] font-mono text-gray-400 leading-relaxed">
                    {JSON.stringify(selectedDoc.di_analysis_notes[0].extracted_data, null, 2)}
                  </pre>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-white/5 flex justify-end">
              <button 
                onClick={() => setSelectedDoc(null)}
                className="px-6 py-2.5 rounded-lg border border-white/10 text-gray-300 font-semibold text-sm hover:bg-white/5 transition-colors"
              >
                Close Note
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
