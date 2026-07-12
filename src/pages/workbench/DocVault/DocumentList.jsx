import React, { useState } from 'react';
import { BsSearch, BsFileEarmarkText, BsExclamationCircle } from 'react-icons/bs';

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

export default function DocumentList({ documents, loading, selectedDoc, onSelect, uploading }) {
  const [search, setSearch] = useState("");

  const filteredDocs = documents.filter(doc => {
    const term = search.toLowerCase();
    const note = doc.di_analysis_notes?.[0]?.extracted_data;
    const party = note?.parties?.vendor?.value || note?.parties?.customer?.value || "";
    const ref = note?.document?.reference_number?.value || "";
    return (
      doc.original_filename.toLowerCase().includes(term) ||
      party.toLowerCase().includes(term) ||
      ref.toLowerCase().includes(term) ||
      doc.derivedStatus.toLowerCase().includes(term)
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

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-8 text-center text-gray-500 animate-pulse text-sm">Loading documents...</div>
        ) : filteredDocs.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">
            {uploading ? "Uploading..." : "No documents found."}
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {filteredDocs.map((doc) => {
              const isSelected = selectedDoc?.id === doc.id;
              const note = doc.di_analysis_notes?.[0];
              const data = note?.extracted_data || {};
              
              const partyName = data.parties?.vendor?.value || data.parties?.customer?.value || "Unknown Party";
              const docType = (typeof data.document_type === 'object' ? data.document_type?.value : data.document_type) || "Document";
              const refNumber = data.document?.reference_number?.value || "No Ref";
              const amount = data.financials?.total_amount?.value;
              const currency = data.financials?.currency?.value || "USD";
              
              const displayAmount = amount !== undefined ? new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount) : "-";
              
              // Only show Needs Review icon if specifically Needs Review
              const showWarning = doc.derivedStatus === 'Needs Review';

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

                  <div className="flex justify-between items-center">
                    <StatusBadge status={doc.derivedStatus} />
                    {doc.derivedStatus === 'Uploaded' || doc.derivedStatus === 'Processing' ? (
                       <div className="text-[10px] text-gray-600 truncate max-w-[150px]">{doc.original_filename}</div>
                    ) : (
                      note?.confidence !== undefined && (
                        <div className={`text-[10px] font-bold ${note.confidence >= 0.90 ? 'text-green-500/70' : 'text-amber-500/70'}`}>
                          {Math.round(note.confidence * 100)}% Match
                        </div>
                      )
                    )}
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
