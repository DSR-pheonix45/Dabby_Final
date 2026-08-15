import React, { useState, useEffect, useCallback } from "react";
import { useWorkbench } from "../../../context/WorkbenchContext";
import { diService } from "../../../services/diService";
import { checkPdfPassword, verifyPdfPassword } from "../../../utils/pdfDecrypter";
import { toast } from "react-hot-toast";
import { useDropzone } from "react-dropzone";
import { BsArrowLeft, BsCloudUpload, BsShieldLock } from "react-icons/bs";
import { collaborationService } from "../../../services/collaborationService";
import { classifyDocumentParties } from "../../../utils/docPartyClassifier";
import NewPartyDetectedModal from "../../../components/DocVault/NewPartyDetectedModal";
import CreateFolderModal from "../../../components/DocVault/CreateFolderModal";
import MoveToFolderModal from "../../../components/DocVault/MoveToFolderModal";
import DocVaultExplorer from "./DocVaultExplorer";
import RightPanel from "./RightPanel";
import PreviewTab from "./tabs/PreviewTab";
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from "react-resizable-panels";

// Utility to derive status dynamically
export const deriveDocumentStatus = (doc) => {
  const logs = doc.di_document_processing_logs || [];
  
  if (logs.some(l => l.status === 'failed')) return 'Failed';
  if (logs.some(l => l.stage === 'post' && l.status === 'success')) return 'Posted';
  
  const analysisLog = logs.find(l => l.stage === 'analysis');
  if (analysisLog?.status === 'success') {
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
  const [folders, setFolders] = useState([]);
  const [currentFolderId, setCurrentFolderId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [pendingFile, setPendingFile] = useState(null);
  const [showClassModal, setShowClassModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [movingDoc, setMovingDoc] = useState(null);

  const [pdfPassword, setPdfPassword] = useState("");
  const [unlocking, setUnlocking] = useState(false);
  const [lockedFile, setLockedFile] = useState(null);

  const loadDocuments = async () => {
    if (!activeWorkbench) return [];
    setLoading(true);
    try {
      const [docs, fds] = await Promise.all([
        diService.getDocuments(activeWorkbench.id).catch(() => []),
        diService.getFolders(activeWorkbench.id).catch(() => [])
      ]);
      
      const enhancedDocs = (docs || []).map(doc => ({
        ...doc,
        derivedStatus: deriveDocumentStatus(doc)
      }));
      
      enhancedDocs.sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
      
      setDocuments(enhancedDocs);
      setFolders(fds || []);
      
      if (selectedDoc) {
        const updated = enhancedDocs.find(d => d.id === selectedDoc.id);
        if (updated) setSelectedDoc(updated);
      }
      return enhancedDocs;
    } catch (err) {
      toast.error("Failed to load documents");
      return [];
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
    const handleRefresh = () => loadDocuments();
    window.addEventListener("docVaultUpdated", handleRefresh);
    return () => window.removeEventListener("docVaultUpdated", handleRefresh);
  }, [activeWorkbench]);

  const handleCreateFolder = async (name, color) => {
    if (!activeWorkbench) return;
    try {
      await diService.createFolder(activeWorkbench.id, name, currentFolderId, color);
      toast.success(`Folder "${name}" created!`);
      loadDocuments();
    } catch (err) {
      console.error(err);
      toast.error("Failed to create folder");
    }
  };

  const handleDeleteFolder = async (folderId) => {
    if (!window.confirm("Are you sure you want to delete this folder? Any files inside will revert to Root.")) return;
    try {
      await diService.deleteFolder(folderId);
      toast.success("Folder deleted");
      if (currentFolderId === folderId) {
        setCurrentFolderId(null);
      }
      loadDocuments();
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete folder");
    }
  };

  const handleMoveDocument = async (docId, targetFolderId) => {
    try {
      await diService.moveDocument(docId, targetFolderId);
      toast.success("Document moved!");
      loadDocuments();
    } catch (err) {
      console.error(err);
      toast.error("Failed to move document");
    }
  };

  const handleDeleteDocument = async (docId, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this document from Doc Vault?")) return;

    try {
      await diService.deleteDocument(docId);
      toast.success("Document deleted from Doc Vault");
      if (selectedDoc?.id === docId) {
        setSelectedDoc(null);
      }
      loadDocuments();
    } catch (err) {
      console.error("Delete error:", err);
      toast.error("Failed to delete document");
    }
  };

  const handleScanDocument = async (docId) => {
    if (!docId) return;
    const toastId = toast.loading("Scanning document with Gemini Vision OCR...");
    try {
      await diService.processDocument(docId);
      toast.success("Document scanned & extracted successfully!", { id: toastId });
      const updatedDocs = await loadDocuments();
      if (updatedDocs) {
        const match = updatedDocs.find(d => d.id === docId);
        if (match) setSelectedDoc(match);
      }
    } catch (err) {
      console.error("Scan error:", err);
      toast.error("Failed to scan document: " + (err.message || err), { id: toastId });
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
    setPdfPassword("");
    
    setUploading(true);
    try {
      toast.loading("Uploading document...", { id: "upload" });
      const res = await diService.uploadDocument(activeWorkbench.id, file, currentFolderId);
      
      toast.loading("AI parsing in progress...", { id: "upload" });
      
      const processRes = await diService.processDocument(res.document_id, hint, currentPassword);
      
      toast.success("Document parsed successfully!", { id: "upload" });
      const freshDocs = await loadDocuments();
      const freshDoc = freshDocs.find(d => d.id === res.document_id) || processRes;

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
      toast.error(err.message || "Upload failed", { id: "upload" });
    } finally {
      setUploading(false);
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
      
      {/* Dynamic View: If no document selected, show full Explorer Grid; otherwise show Document Viewer */}
      {!selectedDoc ? (
        <DocVaultExplorer
          folders={folders}
          documents={documents}
          currentFolderId={currentFolderId}
          onSelectFolder={setCurrentFolderId}
          onCreateFolder={() => setShowCreateFolderModal(true)}
          onDeleteFolder={handleDeleteFolder}
          onSelectDocument={setSelectedDoc}
          onDeleteDocument={handleDeleteDocument}
          onOpenMoveModal={(doc) => setMovingDoc(doc)}
          onMoveDocument={handleMoveDocument}
          onDropFiles={onDrop}
          loading={loading}
          uploading={uploading}
        />
      ) : (
        <div className="flex flex-col flex-1 h-full overflow-hidden">
          {/* Header Bar in Document Viewer Mode */}
          <div className="px-6 py-3 border-b border-white/5 bg-[#121214] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedDoc(null)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-teal-400 font-semibold text-xs transition-colors border border-white/10"
              >
                <BsArrowLeft size={14} />
                <span>Back to Explorer</span>
              </button>
              <div className="h-4 w-px bg-white/10" />
              <div className="flex items-center gap-2 text-xs text-gray-400 truncate">
                <span className="font-semibold text-white">{selectedDoc.original_filename}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setMovingDoc(selectedDoc)}
                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-gray-300 hover:text-white border border-white/10 transition-colors"
              >
                Move Document
              </button>
              <button
                onClick={(e) => handleDeleteDocument(selectedDoc.id, e)}
                className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-xs font-semibold text-rose-400 border border-rose-500/20 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>

          {/* Split Document Viewer Layout */}
          <div className="flex-1 overflow-hidden">
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
          </div>
        </div>
      )}

      {/* Modals */}
      <CreateFolderModal
        isOpen={showCreateFolderModal}
        onClose={() => setShowCreateFolderModal(false)}
        onCreate={handleCreateFolder}
      />

      <MoveToFolderModal
        isOpen={!!movingDoc}
        onClose={() => setMovingDoc(null)}
        documentObj={movingDoc}
        folders={folders}
        onMove={handleMoveDocument}
      />

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
