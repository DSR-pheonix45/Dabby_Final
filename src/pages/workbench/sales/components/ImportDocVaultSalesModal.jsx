import React, { useState, useEffect } from 'react';
import { diService } from '../../../../services/diService';
import { classifyDocumentParties } from '../../../../utils/docPartyClassifier';
import { salesService } from '../../../../services/salesService';
import { formatCurrency } from '../../../../utils/currency';
import { toast } from 'react-hot-toast';
import { BsX, BsFileEarmarkText, BsDownload, BsCheckCircleFill, BsExclamationTriangleFill, BsArrowRight } from 'react-icons/bs';

export default function ImportDocVaultSalesModal({ isOpen, onClose, workbenchId, onImportSuccess }) {
  const [salesDocs, setSalesDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    if (!isOpen || !workbenchId) return;

    async function loadDocs() {
      setLoading(true);
      try {
        const allDocs = await diService.getDocuments(workbenchId);
        // Filter sales-related documents
        const filtered = allDocs.filter(d => {
          const note = d.di_analysis_notes?.[0] || {};
          const docType = (note.document_type || note.extracted_data?.document_type || '').toLowerCase();
          return docType.includes('sales') || docType.includes('invoice') || docType.includes('receipt') || docType.includes('order');
        });

        filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        setSalesDocs(filtered);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load Doc Vault sales documents");
      } finally {
        setLoading(false);
      }
    }

    loadDocs();
  }, [isOpen, workbenchId]);

  if (!isOpen) return null;

  const handleImportDoc = async (doc) => {
    setSelectedDoc(doc);
    setImporting(true);
    try {
      // Import into salesService with duplicate prevention check
      const sale = salesService.importFromDocVault(workbenchId, doc);
      toast.success(`Imported "${doc.original_filename}" into Sales!`);
      if (onImportSuccess) onImportSuccess(sale);
      onClose();
    } catch (err) {
      toast.error(err.message || "Failed to import document");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-[#18181A] border border-white/10 rounded-2xl p-6 shadow-2xl relative my-8 max-h-[85vh] flex flex-col font-dm-sans">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-teal-500/10 border border-teal-500/20 text-teal-400 rounded-xl">
              <BsFileEarmarkText className="text-xl" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Import from Document Vault</h2>
              <p className="text-xs text-gray-400">Select OCR verified sales invoices/orders from Doc Vault</p>
            </div>
          </div>

          <button onClick={onClose} className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors">
            <BsX className="text-xl" />
          </button>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto pt-4 space-y-3 pr-1 custom-scrollbar">
          {loading ? (
            <div className="p-12 text-center text-gray-500 text-xs animate-pulse">
              Fetching sales documents from Doc Vault...
            </div>
          ) : salesDocs.length === 0 ? (
            <div className="p-12 text-center text-gray-500 text-xs">
              No unlinked sales documents found in Doc Vault. Upload sales invoices in Doc Vault first.
            </div>
          ) : (
            <div className="space-y-3">
              {salesDocs.map(doc => {
                const note = doc.di_analysis_notes?.[0] || {};
                const data = note.extracted_data || {};
                const partyName = note.parties?.customer?.name || data.parties?.customer?.value || "Customer";
                const refNo = data.document?.reference_number?.value || doc.original_filename;
                const totalAmt = note.money?.total_amount !== undefined ? note.money?.total_amount : (data.financials?.total_amount?.value || 0);

                return (
                  <div
                    key={doc.id}
                    className="p-4 bg-[#111111] border border-white/5 hover:border-teal-500/30 rounded-xl transition-all flex items-center justify-between gap-4 group"
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className="p-3 rounded-lg bg-teal-500/10 border border-teal-500/20 text-teal-400 shrink-0">
                        <BsFileEarmarkText className="text-lg" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-white truncate">{doc.original_filename}</div>
                        <div className="flex items-center space-x-2 text-xs text-gray-400 mt-0.5">
                          <span className="text-teal-400 font-semibold">{partyName}</span>
                          <span>•</span>
                          <span className="font-mono">{refNo}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4 text-right shrink-0">
                      <div>
                        <div className="text-sm font-bold text-white">
                          ₹{Number(totalAmt).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </div>
                        <div className="text-[10px] text-gray-500 uppercase tracking-wider">
                          Extracted Amount
                        </div>
                      </div>

                      <button
                        disabled={importing && selectedDoc?.id === doc.id}
                        onClick={() => handleImportDoc(doc)}
                        className="flex items-center space-x-1.5 px-3 py-1.5 bg-teal-500 hover:bg-teal-400 text-black rounded-lg text-xs font-bold transition-all shadow-md"
                      >
                        <span>Confirm & Import</span>
                        <BsArrowRight />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
