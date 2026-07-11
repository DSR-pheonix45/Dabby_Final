import React, { useState, useEffect, useCallback } from "react";
import { useWorkbench } from "../../../context/WorkbenchContext";
import { diService } from "../../../services/diService";
import { toast } from "react-hot-toast";
import { useDropzone } from "react-dropzone";
import { BsCloudUpload, BsShieldLock } from "react-icons/bs";
import DocumentList from "./DocumentList";
import RightPanel from "./RightPanel";
import PreviewTab from "./tabs/PreviewTab";
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from "react-resizable-panels";

// Utility to derive status dynamically since we skipped DDL changes for MVP
export const deriveDocumentStatus = (doc) => {
  const logs = doc.di_document_processing_logs || [];
  
  if (logs.some(l => l.status === 'failed')) return 'Failed';
  if (logs.some(l => l.stage === 'post' && l.status === 'success')) return 'Posted';
  
  const analysisLog = logs.find(l => l.stage === 'analysis');
  if (analysisLog?.status === 'success') {
    // Check confidence in analysis note
    const note = doc.di_analysis_notes?.[0];
    if (note && note.confidence >= 0.90) return 'Ready to Post';
    return 'Needs Review';
  }
  
  if (logs.some(l => l.stage === 'ocr' || l.stage === 'analysis')) return 'Processing';
  
  return 'Uploaded';
};

export default function DocVaultIndex() {
  const { activeWorkbench } = useWorkbench();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);

  const loadDocuments = async () => {
    if (!activeWorkbench) return;
    setLoading(true);
    try {
      const docs = await diService.getDocuments(activeWorkbench.id);
      
      // Inject derived status into the objects for easier frontend rendering
      const enhancedDocs = docs.map(doc => ({
        ...doc,
        derivedStatus: deriveDocumentStatus(doc)
      }));
      
      // Sort by latest created first
      enhancedDocs.sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
      
      setDocuments(enhancedDocs);
      
      // Update selected doc reference if it exists
      if (selectedDoc) {
        const updated = enhancedDocs.find(d => d.id === selectedDoc.id);
        if (updated) setSelectedDoc(updated);
      }
    } catch (err) {
      toast.error("Failed to load documents");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, [activeWorkbench]);

  const onDrop = useCallback(async (acceptedFiles) => {
    if (acceptedFiles.length === 0 || !activeWorkbench) return;
    
    setUploading(true);
    const file = acceptedFiles[0];
    
    try {
      toast.loading("Uploading document...", { id: "upload" });
      const res = await diService.uploadDocument(activeWorkbench.id, file);
      
      toast.loading("AI parsing in progress...", { id: "upload" });
      
      await diService.processDocument(res.document_id);
      
      toast.success("Document parsed successfully!", { id: "upload" });
      loadDocuments();
    } catch (err) {
      toast.error(err.message || "Upload failed", { id: "upload" });
    } finally {
      setUploading(false);
    }
  }, [activeWorkbench]);

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png']
    },
    multiple: false,
    noClick: true
  });

  if (!activeWorkbench) return null;

  return (
    <div className="flex flex-col flex-1 h-full bg-[#0D0D0D] overflow-hidden text-gray-200 font-sans" {...getRootProps()}>
      <input {...getInputProps()} />
      
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/5 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center">
            <BsShieldLock className="text-teal-500 text-lg" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight">Doc Vault</h1>
            <p className="text-xs text-gray-500 mt-0.5">Source of financial truth</p>
          </div>
        </div>
        <div>
          <label className="flex items-center gap-2 bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 border border-teal-500/20 px-4 py-2 rounded-lg font-semibold text-sm cursor-pointer transition-colors">
            <BsCloudUpload className="text-lg" />
            Upload Document
            <input type="file" className="hidden" onChange={(e) => onDrop(Array.from(e.target.files))} accept=".pdf,.jpg,.jpeg,.png" />
          </label>
        </div>
      </div>

      {/* Split Layout */}
      <div className="flex flex-1 overflow-hidden">
        <PanelGroup orientation="horizontal">
          {/* Left Panel */}
          <Panel defaultSize={20} minSize={15} className="border-r border-white/5 flex flex-col bg-[#111111]">
            <DocumentList 
              documents={documents} 
              loading={loading} 
              selectedDoc={selectedDoc} 
              onSelect={setSelectedDoc}
              uploading={uploading}
            />
          </Panel>

          <PanelResizeHandle className="w-1.5 bg-[#0D0D0D] hover:bg-teal-500/50 cursor-col-resize transition-colors z-10 flex flex-col justify-center items-center">
            <div className="h-8 w-0.5 bg-white/20 rounded-full" />
          </PanelResizeHandle>

          {/* Right Panel */}
          <Panel defaultSize={80} className="flex flex-col bg-[#0D0D0D] overflow-hidden relative">
            {selectedDoc ? (
              <PanelGroup orientation="horizontal">
                {/* Preview Tab (Always visible next to data) */}
                <Panel defaultSize={40} minSize={20} className="border-r border-white/5">
                  <PreviewTab doc={selectedDoc} />
                </Panel>
                
                <PanelResizeHandle className="w-1.5 bg-[#0D0D0D] hover:bg-teal-500/50 cursor-col-resize transition-colors z-10 flex flex-col justify-center items-center">
                  <div className="h-8 w-0.5 bg-white/20 rounded-full" />
                </PanelResizeHandle>
                
                {/* Data Tabs */}
                <Panel defaultSize={60} minSize={30} className="flex flex-col">
                  <RightPanel 
                    doc={selectedDoc} 
                    onUpdate={loadDocuments} 
                    onClose={() => setSelectedDoc(null)} 
                  />
                </Panel>
              </PanelGroup>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
                <BsShieldLock className="text-6xl mb-4 opacity-20" />
                <p className="font-medium text-gray-400">Select a document to review</p>
              </div>
            )}
          </Panel>
        </PanelGroup>
      </div>
    </div>
  );
}
