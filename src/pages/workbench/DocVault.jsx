import React, { useState, useEffect, useCallback } from "react";
import { useWorkbench } from "../../context/WorkbenchContext";
import { diService } from "../../services/diService";
import { toast } from "react-hot-toast";
import { useDropzone } from "react-dropzone";
import { BsCloudUpload, BsFileEarmarkText, BsCheckCircle, BsXCircle, BsClockHistory, BsX } from "react-icons/bs";

export default function DocVault() {
  const { currentWorkbench } = useWorkbench();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);

  useEffect(() => {
    if (currentWorkbench) {
      loadDocuments();
    }
  }, [currentWorkbench]);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const docs = await diService.getDocuments(currentWorkbench.id);
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
      const res = await diService.uploadDocument(currentWorkbench.id, file);
      
      toast.loading("Processing AI Extraction...", { id: "upload" });
      await diService.processDocument(res.document_id);
      
      toast.success("Document processed successfully!", { id: "upload" });
      loadDocuments();
    } catch (err) {
      toast.error(err.message || "Upload failed", { id: "upload" });
    } finally {
      setUploading(false);
    }
  }, [currentWorkbench]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png']
    },
    multiple: false
  });

  const getStatusIcon = (status) => {
    if (status === 'success') return <BsCheckCircle className="text-teal-500" />;
    if (status === 'failed') return <BsXCircle className="text-rose-500" />;
    return <BsClockHistory className="text-amber-500 animate-spin" />;
  };

  return (
    <div className="flex flex-1 h-full bg-[#111111] overflow-hidden relative">
      
      {/* Main Content */}
      <div className={`flex-1 p-8 overflow-y-auto transition-all duration-300 ${selectedDoc ? 'pr-[400px]' : ''}`}>
        <div className="max-w-5xl mx-auto space-y-6">
          
          <div>
            <h1 className="text-2xl font-semibold text-white">Document Vault</h1>
            <p className="text-sm text-gray-400 mt-1">Immutable storage and AI semantic analysis engine.</p>
          </div>

          {/* Upload Dropzone */}
          <div 
            {...getRootProps()} 
            className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center cursor-pointer transition-colors
              ${isDragActive ? 'border-teal-500 bg-teal-500/10' : 'border-white/10 bg-[#181818] hover:border-teal-500/50 hover:bg-[#1A1A1A]'}`}
          >
            <input {...getInputProps()} />
            <BsCloudUpload className={`w-10 h-10 mb-4 ${isDragActive ? 'text-teal-400' : 'text-gray-500'}`} />
            {uploading ? (
              <p className="text-teal-400 font-medium">Uploading and processing...</p>
            ) : isDragActive ? (
              <p className="text-teal-400 font-medium">Drop the invoice or receipt here</p>
            ) : (
              <div className="text-center">
                <p className="text-gray-300 font-medium">Click or drag document here to upload</p>
                <p className="text-xs text-gray-500 mt-1">Supports PDF, JPG, PNG up to 10MB</p>
              </div>
            )}
          </div>

          {/* Documents Table */}
          <div className="bg-[#181818] border border-white/10 rounded-xl shadow-sm overflow-hidden mt-8">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#111111] border-b border-white/10 text-xs uppercase tracking-wider text-gray-500">
                  <th className="p-4 font-medium">Filename</th>
                  <th className="p-4 font-medium">Date Uploaded</th>
                  <th className="p-4 font-medium">AI Status</th>
                  <th className="p-4 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm">
                {loading ? (
                  <tr>
                    <td colSpan="4" className="p-8 text-center text-gray-500 animate-pulse">Loading documents...</td>
                  </tr>
                ) : documents.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="p-8 text-center text-gray-500">No documents found. Upload one to get started.</td>
                  </tr>
                ) : (
                  documents.map((doc) => {
                    const latestLog = doc.di_document_processing_logs?.sort((a,b) => new Date(b.created_at) - new Date(a.created_at))[0];
                    const analysis = doc.di_analysis_notes?.[0];
                    return (
                      <tr key={doc.id} className="hover:bg-white/5 transition-colors">
                        <td className="p-4 font-medium text-gray-200 flex items-center gap-3">
                          <BsFileEarmarkText className="text-gray-500 text-lg" />
                          {doc.original_filename}
                        </td>
                        <td className="p-4 text-gray-500">
                          {new Date(doc.created_at).toLocaleDateString()}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(latestLog?.status || 'started')}
                            <span className="capitalize text-gray-400">
                              {latestLog ? `${latestLog.stage} (${latestLog.status})` : 'Processing'}
                            </span>
                          </div>
                        </td>
                        <td className="p-4 text-right">
                          <button 
                            onClick={() => setSelectedDoc(doc)}
                            className="text-teal-400 font-medium px-3 py-1 bg-teal-500/10 border border-teal-500/20 hover:bg-teal-500/20 rounded-md transition-colors"
                          >
                            View Analysis
                          </button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

        </div>
      </div>

      {/* Slide-over Side Panel */}
      <div 
        className={`fixed top-0 right-0 h-full w-[400px] bg-[#181818] shadow-2xl border-l border-white/10 transition-transform duration-300 transform ${selectedDoc ? 'translate-x-0' : 'translate-x-full'} z-50 overflow-y-auto`}
      >
        {selectedDoc && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-white/10">
              <h2 className="text-lg font-semibold text-white truncate pr-4">{selectedDoc.original_filename}</h2>
              <button onClick={() => setSelectedDoc(null)} className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors">
                <BsX className="w-5 h-5" />
              </button>
            </div>

            {selectedDoc.di_analysis_notes?.length > 0 ? (
              <div className="space-y-6">
                
                <div className="p-4 bg-teal-500/10 border border-teal-500/20 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-teal-500">Classification</span>
                    <span className="px-2 py-1 bg-[#111111] text-teal-400 border border-teal-500/30 text-xs rounded-full font-medium">
                      {(selectedDoc.di_analysis_notes[0].confidence * 100).toFixed(0)}% Conf
                    </span>
                  </div>
                  <p className="text-teal-400 capitalize text-lg font-medium">
                    {selectedDoc.di_analysis_notes[0].classification_type}
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider">AI Reasoning</h3>
                  <div className="p-4 bg-[#111111] border border-white/5 rounded-xl text-sm text-gray-300 leading-relaxed">
                    {selectedDoc.di_analysis_notes[0].reasoning}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider">Extracted Data</h3>
                  <div className="bg-[#0A0A0A] rounded-xl p-4 overflow-x-auto border border-white/5">
                    <pre className="text-xs text-green-400 font-mono">
                      {JSON.stringify(selectedDoc.di_analysis_notes[0].extracted_data, null, 2)}
                    </pre>
                  </div>
                </div>
                
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500 bg-[#111111] rounded-xl border border-dashed border-white/10">
                Analysis still processing or failed.
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
}
