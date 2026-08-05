import React, { useState } from 'react';
import { BsSearch, BsFileEarmarkText, BsExclamationCircle, BsTrash } from 'react-icons/bs';
import { useWorkbench } from '../../../context/WorkbenchContext';
import { formatCurrency } from '../../../utils/currency';
import { classifyDocumentParties } from '../../../utils/docPartyClassifier';

const StatusBadge = ({ status }) => {
  const styles = {
    'Uploaded': 'bg-gray-500/20 text-gray-400 border-gray-500/20',
    'Processing': 'bg-amber-500/20 text-amber-500 border-amber-500/20',
    'Needs Review': 'bg-rose-500/20 text-rose-400 border-rose-500/20',
    'Ready to Post': 'bg-blue-500/20 text-blue-400 border-blue-500/20',
    'Posted': 'bg-teal-500/20 text-teal-400 border-teal-500/20',
    'Failed': 'bg-red-500/20 text-red-500 border-red-500/20'
  };

  const style = styles[status] || styles['Uploaded'];

  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border tracking-wider uppercase ${style}`}>
      {status}
    </span>
  );
};

const parseNum = (val) => {
  if (val === undefined || val === null || val === '') return undefined;
  if (typeof val === 'number') return isNaN(val) ? undefined : val;
  if (typeof val === 'object' && val !== null) {
    if ('value' in val) return parseNum(val.value);
    if ('amount' in val) return parseNum(val.amount);
    if ('total' in val) return parseNum(val.total);
  }
  if (typeof val === 'string') {
    const cleaned = val.replace(/[^0-9.-]/g, '');
    if (!cleaned) return undefined;
    const n = parseFloat(cleaned);
    return isNaN(n) ? undefined : n;
  }
  return undefined;
};

export default function DocumentList({ documents, loading, selectedDoc, onSelect, onDelete, uploading, uploadProgress = 0, uploadStage = "", uploadFileName = "" }) {
  const [search, setSearch] = useState("");
  const { activeWorkbench } = useWorkbench();

  const filteredDocs = documents.filter(doc => {
    const term = search.toLowerCase();
    const note = doc.di_analysis_notes?.[0]?.extracted_data;
    const party = note?.parties?.vendor?.value || note?.parties?.customer?.value || "";
    const ref = note?.document?.reference_number?.value || "";
    return (
      doc.original_filename.toLowerCase().includes(term) ||
      party.toLowerCase().includes(term) ||
      ref.toLowerCase().includes(term) ||
      (doc.derivedStatus && doc.derivedStatus.toLowerCase().includes(term))
    );
  });

  return (
    <div className="flex flex-col h-full">
      {/* Search Bar */}
      <div className="p-4 border-b border-white/5 shrink-0">
        <div className="relative">
          <BsSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
          <input 
            type="text" 
            placeholder="Search party, invoice, status..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#181818] border border-white/5 rounded-lg pl-9 pr-4 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-teal-500/50 transition-colors"
          />
        </div>
      </div>

      {/* Active Uploading Progress Card */}
      {uploading && (
        <div className="p-4 bg-teal-950/40 border-b border-teal-500/30 animate-pulse">
          <div className="flex items-center justify-between text-xs font-bold text-teal-400 mb-1.5">
            <span className="truncate pr-2">{uploadFileName || "Uploading document..."}</span>
            <span className="font-mono shrink-0">{uploadProgress}%</span>
          </div>
          <div className="text-[10px] text-gray-400 mb-2 truncate">
            {uploadStage || "Processing OCR & AI analysis..."}
          </div>
          <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden border border-teal-500/20">
            <div 
              className="h-full bg-gradient-to-r from-teal-500 to-emerald-400 rounded-full transition-all duration-300 shadow-[0_0_8px_rgba(20,184,166,0.6)]"
              style={{ width: `${Math.max(5, uploadProgress)}%` }}
            />
          </div>
        </div>
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-8 text-center text-gray-500 animate-pulse text-sm">Loading documents...</div>
        ) : filteredDocs.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">
            {uploading ? "Uploading document..." : "No documents found."}
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {filteredDocs.map((doc) => {
              const isSelected = selectedDoc?.id === doc.id;
              const note = doc.di_analysis_notes?.[0] || {};
              const data = note.extracted_data || {};
              
              // Read from UFO columns if available, fallback to raw extracted_data
              const rawDocType = note.document_type || data.document_type;
              const docType = (typeof rawDocType === 'object' ? rawDocType?.value : rawDocType) || "Document";
              
              const refNumber = data.document?.reference_number?.value || "No Ref";
              
              const amount = 
                parseNum(note.money?.total_amount) ?? 
                parseNum(note.money?.subtotal) ?? 
                parseNum(data.financials?.total_amount) ?? 
                parseNum(data.total_amount) ??
                parseNum(doc.total_amount) ??
                parseNum(doc.amount);
              
              const displayAmount = amount !== undefined && !isNaN(amount) ? formatCurrency(amount, activeWorkbench?.country) : "-";
              
              // Only show Needs Review icon if specifically Needs Review
              const showWarning = doc.derivedStatus === 'Needs Review';
              
              const classified = classifyDocumentParties(doc, activeWorkbench);
              const partyName = classified.externalParty?.name || "Unknown Party";

              return (
                <div 
                  key={doc.id}
                  onClick={() => onSelect(doc)}
                  className={`p-4 cursor-pointer transition-colors relative border-l-2 ${
                    isSelected 
                      ? "bg-white/[0.04] border-teal-500" 
                      : "border-transparent hover:bg-white/[0.02]"
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-semibold text-gray-200 text-sm truncate pr-2 flex items-center gap-2">
                      {partyName}
                      {showWarning && <BsExclamationCircle className="text-rose-500 text-xs" title="Low Confidence Fields" />}
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-bold text-teal-400 text-sm">{displayAmount}</div>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center text-xs text-gray-500 mb-3">
                    <div className="flex items-center gap-1.5 truncate">
                      <BsFileEarmarkText className="opacity-70 shrink-0" />
                      <span className="truncate">{docType} • {refNumber}</span>
                    </div>
                    <div className="shrink-0 ml-2">
                      {new Date(doc.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </div>
                  </div>

                  <div className="flex justify-between items-center group/row">
                    <StatusBadge status={doc.derivedStatus} />
                    <div className="flex items-center gap-2">
                      {onDelete && (
                        <button
                          onClick={(e) => onDelete(doc.id, e)}
                          className="opacity-0 group-hover/row:opacity-100 p-1 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-all"
                          title="Delete Document"
                        >
                          <BsTrash size={13} />
                        </button>
                      )}
                      {doc.derivedStatus === 'Uploaded' || doc.derivedStatus === 'Processing' ? (
                         <div className="text-[10px] text-gray-600 truncate max-w-[120px]">{doc.original_filename}</div>
                      ) : (
                        note?.confidence !== undefined && (
                          <div className={`text-[10px] font-bold ${note.confidence >= 0.90 ? 'text-green-500/70' : 'text-amber-500/70'}`}>
                            {Math.round(note.confidence * 100)}% Match
                          </div>
                        )
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
