import React, { useState, useEffect, useCallback } from "react";
import { useWorkbench } from "../../../context/WorkbenchContext";
import { diService } from "../../../services/diService";
import { checkPdfPassword, verifyPdfPassword } from "../../../utils/pdfDecrypter";
import { toast } from "react-hot-toast";
import { useDropzone } from "react-dropzone";
import { BsCloudUpload, BsShieldLock } from "react-icons/bs";
import { collaborationService } from "../../../services/collaborationService";
import { classifyDocumentParties } from "../../../utils/docPartyClassifier";
import NewPartyDetectedModal from "../../../components/DocVault/NewPartyDetectedModal";
import DocumentList from "./DocumentList";
import RightPanel from "./RightPanel";
import PreviewTab from "./tabs/PreviewTab";
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from "react-resizable-panels";

// Utility to derive status dynamically since we skipped DDL changes for MVP
export const deriveDocumentStatus = (doc) => {
  const logs = doc.di_document_processing_logs || [];
  
  if (logs.some(l => l.stage === 'post' && l.status === 'success')) return 'Posted';

  const note = doc.di_analysis_notes?.[0];
  const hasAnalysisSuccess = logs.some(l => l.stage === 'analysis' && l.status === 'success');

  // If analysis succeeded OR an analysis note exists with data, the document extraction was successful!
  if (hasAnalysisSuccess || (note && Object.keys(note).length > 0)) {
    const confidence = note?.confidence ?? 0.95;
    if (confidence >= 0.90) return 'Ready to Post';
    return 'Needs Review';
  }
  
  // Only return Failed if there is an explicit failed log and NO successful analysis note
  if (logs.some(l => l.status === 'failed')) return 'Failed';

  if (logs.some(l => l.stage === 'ocr' || l.stage === 'analysis')) return 'Processing';
  
  return 'Uploaded';
};

export default function DocVaultIndex() {
  const { activeWorkbench } = useWorkbench();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStage, setUploadStage] = useState("");
  const [uploadFileName, setUploadFileName] = useState("");
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [pendingFile, setPendingFile] = useState(null);
  const [showClassModal, setShowClassModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [pdfPassword, setPdfPassword] = useState("");
  const [unlocking, setUnlocking] = useState(false);
  const [lockedFile, setLockedFile] = useState(null);
  
  const loadDocuments = async (silent = false) => {
    if (!activeWorkbench) return [];
    if (!silent) setLoading(true);
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
      return enhancedDocs;
    } catch (err) {
      toast.error("Failed to load documents");
      return [];
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
    const handleRefresh = () => loadDocuments(true);
    window.addEventListener("docVaultUpdated", handleRefresh);
    return () => window.removeEventListener("docVaultUpdated", handleRefresh);
  }, [activeWorkbench]);

  const handleDeleteDocument = async (docId, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this document from Doc Vault?")) return;

    try {
      await diService.deleteDocument(docId);
      toast.success("Document deleted from Doc Vault");
      if (selectedDoc?.id === docId) {
        setSelectedDoc(null);
      }
      loadDocuments(true);
    } catch (err) {
      console.error("Delete error:", err);
      toast.error("Failed to delete document");
    }
  };

  const handleScanDocument = async (docId) => {
    if (!docId) return;
    setUploading(true);
    setUploadFileName(selectedDoc?.original_filename || "Document");
    setUploadProgress(15);
    setUploadStage("Scanning document with Gemini Vision OCR...");

    const progressTimer = setInterval(() => {
      setUploadProgress(prev => (prev < 90 ? prev + 4 : prev));
    }, 250);

    const toastId = toast.loading("Scanning document with Gemini Vision OCR...");
    try {
      await diService.processDocument(docId);
      clearInterval(progressTimer);
      setUploadProgress(100);
      toast.success("Document scanned & extracted successfully!", { id: toastId });
      const updatedDocs = await loadDocuments(true);
      if (updatedDocs) {
        const match = updatedDocs.find(d => d.id === docId);
        if (match) setSelectedDoc(match);
      }
    } catch (err) {
      clearInterval(progressTimer);
      console.error("Scan error:", err);
      toast.error("Failed to scan document: " + (err.message || err), { id: toastId });
    } finally {
      setTimeout(() => {
        setUploading(false);
        setUploadProgress(0);
        setUploadStage("");
        setUploadFileName("");
      }, 700);
    }
  };

  const onDrop = useCallback(async (acceptedFiles) => {
    if (acceptedFiles.length === 0 || !activeWorkbench) return;
    const file = acceptedFiles[0];

    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      try {
        const isProtected = await checkPdfPassword(file);
        if (isProtected) {
          setLockedFile(file);
          setShowPasswordModal(true);
          return;
        }
      } catch (err) {
        console.error("Error checking PDF password:", err);
      }
    }

    setPendingFile(file);
    setShowClassModal(true);
  }, [activeWorkbench]);

  const handleUnlockPdf = async (e) => {
    e.preventDefault();
    if (!pdfPassword || !lockedFile) return;
    
    setUnlocking(true);
    try {
      await verifyPdfPassword(lockedFile, pdfPassword);
      setShowPasswordModal(false);
      // We do NOT clear pdfPassword here, as we need it for the upload!
      setPendingFile(lockedFile);
      setLockedFile(null);
      setShowClassModal(true);
    } catch (err) {
      toast.error(err.message || "Failed to unlock PDF. Incorrect password?");
    } finally {
      setUnlocking(false);
    }
  };

  const [showNewPartyModal, setShowNewPartyModal] = useState(false);
  const [detectedPartyInfo, setDetectedPartyInfo] = useState(null);
  const [savedParties, setSavedParties] = useState([]);
  const [activeDocForPartyLink, setActiveDocForPartyLink] = useState(null);

  const handleUploadWithHint = async (hint) => {
    if (!pendingFile || !activeWorkbench) return;
    const file = pendingFile;
    const currentPassword = pdfPassword;
    setPendingFile(null);
    setShowClassModal(false);
    setPdfPassword(""); // Reset for next file
    
    setUploading(true);
    setUploadFileName(file.name);
    setUploadProgress(15);
    setUploadStage("Uploading document to Doc Vault...");

    const progressTimer = setInterval(() => {
      setUploadProgress(prev => {
        if (prev < 40) return prev + 5;
        if (prev < 80) return prev + 2;
        if (prev < 92) return prev + 1;
        return prev;
      });
    }, 200);

    try {
      toast.loading("Uploading document...", { id: "upload" });
      const res = await diService.uploadDocument(activeWorkbench.id, file);
      
      // Step 1: Immediately refresh list silently so document shows in list and auto-selects!
      const initialDocs = await loadDocuments(true);
      const uploadedDoc = initialDocs.find(d => d.id === res.document_id);
      if (uploadedDoc) {
        setSelectedDoc(uploadedDoc);
      }

      setUploadProgress(45);
      setUploadStage("Running Gemini Vision OCR & extracting text...");
      toast.loading("AI parsing in progress...", { id: "upload" });
      
      setUploadProgress(75);
      setUploadStage("Mapping Universal Financial Object (UFO) & journal entries...");

      const processRes = await diService.processDocument(res.document_id, hint, currentPassword);
      
      setUploadProgress(95);
      setUploadStage("Finalizing document entry & syncing ledger...");

      clearInterval(progressTimer);
      setUploadProgress(100);

      toast.success("Document parsed successfully!", { id: "upload" });
      
      // Step 2: Refresh list again silently to show extracted status (Ready to Post) & values
      const freshDocs = await loadDocuments(true);
      const freshDoc = freshDocs.find(d => d.id === res.document_id) || processRes;
      if (freshDoc) {
        setSelectedDoc(freshDoc);
      }

      // Scan parties & trigger warning modal if counterparty is unregistered
      try {
        const partiesList = await collaborationService.getParties(activeWorkbench.id);
        setSavedParties(partiesList || []);
        
        const partyScan = classifyDocumentParties(freshDoc, activeWorkbench, partiesList || []);
        if (!partyScan.isRegistered && partyScan.externalParty?.name) {
          setActiveDocForPartyLink(freshDoc);
          setDetectedPartyInfo(partyScan.externalParty);
          setShowNewPartyModal(true);
        }
      } catch (scanErr) {
        console.error("Party scan error:", scanErr);
      }
    } catch (err) {
      clearInterval(progressTimer);
      toast.error(err.message || "Upload failed", { id: "upload" });
    } finally {
      setTimeout(() => {
        setUploading(false);
        setUploadProgress(0);
        setUploadStage("");
        setUploadFileName("");
      }, 700);
    }
  };

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

      {/* Active Upload Flow Progress Banner */}
      {uploading && (
        <div className="bg-gradient-to-r from-teal-950/90 via-[#121c18] to-[#0D0D0D] border-b border-teal-500/30 p-4 px-6 shrink-0 transition-all duration-300">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-400">
                <BsCloudUpload className="animate-bounce" size={16} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white tracking-wide">Document Upload & AI Processing Active</span>
                  <span className="text-[10px] font-mono font-bold bg-teal-500/20 text-teal-300 px-2 py-0.5 rounded border border-teal-500/30">
                    {uploadProgress}%
                  </span>
                </div>
                <p className="text-xs text-gray-300 mt-0.5 flex items-center gap-2">
                  <span className="text-teal-400 font-medium truncate max-w-xs">{uploadFileName}</span>
                  <span className="text-gray-500">•</span>
                  <span className="text-gray-400 italic">{uploadStage}</span>
                </p>
              </div>
            </div>
            <div className="text-right font-mono text-xs font-bold text-teal-400">
              Stage {uploadProgress < 35 ? '1/3' : uploadProgress < 85 ? '2/3' : '3/3'}
            </div>
          </div>
          
          <div className="w-full h-2 bg-gray-900/80 rounded-full overflow-hidden p-0.5 border border-teal-500/20 relative">
            <div 
              className="h-full bg-gradient-to-r from-teal-500 via-emerald-400 to-teal-300 rounded-full transition-all duration-300 shadow-[0_0_12px_rgba(20,184,166,0.6)]"
              style={{ width: `${Math.max(5, uploadProgress)}%` }}
            />
          </div>
        </div>
      )}

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
              onDelete={handleDeleteDocument}
              uploading={uploading}
              uploadProgress={uploadProgress}
              uploadStage={uploadStage}
              uploadFileName={uploadFileName}
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
                  <PreviewTab doc={selectedDoc} onDelete={handleDeleteDocument} onScan={handleScanDocument} />
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

      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-[#18181A] border border-white/10 rounded-2xl p-6 shadow-2xl relative">
            <h3 className="text-lg font-bold text-white mb-2">Password Protected</h3>
            <p className="text-xs text-gray-400 mb-6">This PDF is password protected. Please enter the password to scan its contents.</p>
            
            <form onSubmit={handleUnlockPdf} className="space-y-4">
              <input
                type="password"
                value={pdfPassword}
                onChange={(e) => setPdfPassword(e.target.value)}
                placeholder="Enter document password"
                className="w-full px-4 py-3 bg-[#0D0D0D] border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-teal-500/50"
                autoFocus
              />
              
              <button
                type="submit"
                disabled={unlocking || !pdfPassword}
                className="w-full text-center px-4 py-3 bg-teal-500 hover:bg-teal-400 text-black rounded-xl transition-colors font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {unlocking ? (
                  <>
                    <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin"></div>
                    Scanning Document...
                  </>
                ) : (
                  "Unlock & Scan"
                )}
              </button>
              
              <button 
                type="button"
                onClick={() => { setLockedFile(null); setShowPasswordModal(false); setPdfPassword(""); }}
                className="w-full py-2 text-xs font-semibold text-gray-500 hover:text-white transition-colors"
                disabled={unlocking}
              >
                Cancel
              </button>
            </form>
          </div>
        </div>
      )}

      {showClassModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-[#18181A] border border-white/10 rounded-2xl p-6 shadow-2xl relative">
            <h3 className="text-lg font-bold text-white mb-2">Classify Document</h3>
            <p className="text-xs text-gray-400 mb-6">If you are uploading a payment receipt, tell us the direction of money.</p>
            
            <div className="space-y-3">
              <button 
                onClick={() => handleUploadWithHint(null)}
                className="w-full text-left px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-colors"
              >
                <div className="text-sm font-bold text-white">Auto-Detect</div>
                <div className="text-[10px] text-gray-400 mt-0.5">Let AI figure out the document type</div>
              </button>
              
              <button 
                onClick={() => handleUploadWithHint('customer_payment_receipt')}
                className="w-full text-left px-4 py-3 bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/20 rounded-xl transition-colors"
              >
                <div className="text-sm font-bold text-teal-400">Money In (Credit)</div>
                <div className="text-[10px] text-teal-500/70 mt-0.5">Customer Payment Receipt</div>
              </button>
              
              <button 
                onClick={() => handleUploadWithHint('expense_receipt')}
                className="w-full text-left px-4 py-3 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-xl transition-colors"
              >
                <div className="text-sm font-bold text-rose-400">Money Out (Debit)</div>
                <div className="text-[10px] text-rose-500/70 mt-0.5">Vendor Payment / Expense Receipt</div>
              </button>
            </div>
            
            <button 
              onClick={() => { setPendingFile(null); setShowClassModal(false); }}
              className="mt-6 w-full py-2 text-xs font-semibold text-gray-500 hover:text-white transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* New Party Warning Popup Modal */}
      <NewPartyDetectedModal
        isOpen={showNewPartyModal}
        onClose={() => setShowNewPartyModal(false)}
        workbenchId={activeWorkbench?.id}
        documentObj={activeDocForPartyLink}
        externalParty={detectedPartyInfo}
        savedParties={savedParties}
        onPartyLinked={() => {
          loadDocuments();
        }}
      />
    </div>
  );
}
