import React, { useState } from 'react';
import { 
  BsSearch, 
  BsFileEarmarkText, 
  BsExclamationCircle, 
  BsTrash, 
  BsFolderFill, 
  BsFolderPlus, 
  BsChevronRight, 
  BsHouse, 
  BsFolderSymlink,
  BsGrid,
  BsListUl
} from 'react-icons/bs';
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

export default function DocumentList({ 
  documents = [], 
  folders = [],
  currentFolderId = null,
  onSelectFolder,
  onCreateFolder,
  onDeleteFolder,
  onOpenMoveModal,
  onMoveDocument,
  loading, 
  selectedDoc, 
  onSelect, 
  onDelete, 
  uploading 
}) {
  const [search, setSearch] = useState("");
  const [dragOverFolderId, setDragOverFolderId] = useState(null);
  const [viewMode, setViewMode] = useState("all"); // 'all' (current folder docs + subfolders) or 'explorer'
  const { activeWorkbench } = useWorkbench();

  const currentFolder = folders.find(f => f.id === currentFolderId);

  // Filter folders for current level
  const subFolders = folders.filter(f => {
    if (search.trim()) {
      return f.name.toLowerCase().includes(search.toLowerCase());
    }
    return f.parent_id === (currentFolderId || null);
  });

  // Filter docs for current level or search query
  const filteredDocs = documents.filter(doc => {
    const term = search.toLowerCase().trim();
    if (term) {
      const note = doc.di_analysis_notes?.[0]?.extracted_data;
      const party = note?.parties?.vendor?.value || note?.parties?.customer?.value || "";
      const ref = note?.document?.reference_number?.value || "";
      return (
        doc.original_filename.toLowerCase().includes(term) ||
        party.toLowerCase().includes(term) ||
        ref.toLowerCase().includes(term) ||
        (doc.derivedStatus && doc.derivedStatus.toLowerCase().includes(term))
      );
    }
    // Match current folder scope
    return (doc.folder_id || null) === (currentFolderId || null);
  });

  const getFolderDocStats = (folderId) => {
    const folderDocs = documents.filter(d => (d.folder_id || null) === folderId);
    let totalVal = 0;
    folderDocs.forEach(d => {
      const note = d.di_analysis_notes?.[0];
      const amt = note?.money?.total_amount !== undefined ? note.money?.total_amount : note?.extracted_data?.financials?.total_amount?.value;
      if (amt && typeof amt === 'number') totalVal += amt;
    });
    return { count: folderDocs.length, totalVal };
  };

  return (
    <div className="flex flex-col h-full bg-[#111111] text-gray-200">
      {/* Top Breadcrumb & Controls Bar */}
      <div className="p-3 border-b border-white/5 shrink-0 flex flex-col gap-2.5 bg-[#141416]">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-semibold scrollbar-none py-1 pr-2">
            <button
              onClick={() => onSelectFolder(null)}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors ${
                currentFolderId === null ? 'bg-teal-500/10 text-teal-400' : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
              title="All Documents (Root)"
            >
              <BsHouse className="text-sm" />
              <span>Root</span>
            </button>

            {currentFolder && (
              <>
                <BsChevronRight className="text-gray-600 text-[10px] shrink-0" />
                <div 
                  className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-teal-500/15 border border-teal-500/30 text-teal-300 max-w-[140px] truncate"
                  style={{ borderColor: `${currentFolder.color || '#14b8a6'}50` }}
                >
                  <BsFolderFill className="shrink-0 text-xs" style={{ color: currentFolder.color || '#14b8a6' }} />
                  <span className="truncate">{currentFolder.name}</span>
                </div>
              </>
            )}
          </div>

          <button
            onClick={onCreateFolder}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-teal-400 hover:text-teal-300 transition-colors shrink-0"
            title="Create New Folder"
          >
            <BsFolderPlus className="text-sm" />
            <span>New Folder</span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative">
          <BsSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-xs" />
          <input 
            type="text" 
            placeholder="Search party, invoice, folder..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#0D0D0D] border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-teal-500/50 transition-colors"
          />
        </div>
      </div>

      {/* Main Explorer Content */}
      <div className="flex-1 overflow-y-auto divide-y divide-white/5">
        {/* Folders List Header if at current level */}
        {subFolders.length > 0 && (
          <div className="p-3 bg-[#0E0E10]">
            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2 px-1">
              Folders ({subFolders.length})
            </div>
            <div className="grid grid-cols-1 gap-2">
              {subFolders.map(folder => {
                const stats = getFolderDocStats(folder.id);
                const isDragOver = dragOverFolderId === folder.id;

                return (
                  <div
                    key={folder.id}
                    onClick={() => onSelectFolder(folder.id)}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOverFolderId(folder.id);
                    }}
                    onDragLeave={() => setDragOverFolderId(null)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragOverFolderId(null);
                      const docId = e.dataTransfer.getData("text/plain");
                      if (docId && onMoveDocument) {
                        onMoveDocument(docId, folder.id);
                      }
                    }}
                    className={`group/folder flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
                      isDragOver
                        ? 'bg-teal-500/20 border-teal-500 scale-[1.01]'
                        : 'bg-[#18181A] hover:bg-[#202023] border-white/5 hover:border-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-3 truncate pr-2">
                      <div 
                        self-center="true"
                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${folder.color || '#14b8a6'}18` }}
                      >
                        <BsFolderFill style={{ color: folder.color || '#14b8a6' }} className="text-base" />
                      </div>
                      <div className="truncate">
                        <div className="font-semibold text-xs text-gray-200 group-hover/folder:text-white truncate">
                          {folder.name}
                        </div>
                        <div className="text-[10px] text-gray-500">
                          {stats.count} file{stats.count !== 1 ? 's' : ''}
                          {stats.totalVal > 0 && ` • ${formatCurrency(stats.totalVal, activeWorkbench?.country)}`}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover/folder:opacity-100 transition-opacity">
                      {onDeleteFolder && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteFolder(folder.id);
                          }}
                          className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                          title="Delete Folder"
                        >
                          <BsTrash size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Documents Section Header */}
        <div className="p-3 pb-1 flex justify-between items-center bg-[#0D0D0D]">
          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider px-1">
            Documents ({filteredDocs.length})
          </div>
        </div>

        {/* Documents List */}
        {loading ? (
          <div className="p-8 text-center text-gray-500 animate-pulse text-xs">Loading documents...</div>
        ) : filteredDocs.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-xs">
            {uploading ? "Uploading file..." : "No documents in this folder."}
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {filteredDocs.map((doc) => {
              const isSelected = selectedDoc?.id === doc.id;
              const note = doc.di_analysis_notes?.[0] || {};
              const data = note.extracted_data || {};
              
              const rawDocType = note.document_type || data.document_type;
              const docType = (typeof rawDocType === 'object' ? rawDocType?.value : rawDocType) || "Document";
              const refNumber = data.document?.reference_number?.value || "No Ref";
              
              const amount = note.money?.total_amount !== undefined ? note.money?.total_amount : data.financials?.total_amount?.value;
              const displayAmount = amount !== undefined ? formatCurrency(amount, activeWorkbench?.country) : "-";
              
              const showWarning = doc.derivedStatus === 'Needs Review';
              const classified = classifyDocumentParties(doc, activeWorkbench);
              const partyName = classified.externalParty?.name || "Unknown Party";

              return (
                <div 
                  key={doc.id}
                  draggable={true}
                  onDragStart={(e) => {
                    e.dataTransfer.setData("text/plain", doc.id);
                  }}
                  onClick={() => onSelect(doc)}
                  className={`p-3.5 cursor-pointer transition-all relative border-l-2 ${
                    isSelected 
                      ? "bg-white/[0.04] border-teal-500" 
                      : "border-transparent hover:bg-white/[0.02]"
                  }`}
                >
                  <div className="flex justify-between items-start mb-1.5">
                    <div className="font-semibold text-gray-200 text-xs truncate pr-2 flex items-center gap-2">
                      {partyName}
                      {showWarning && <BsExclamationCircle className="text-rose-500 text-[10px]" title="Needs Review" />}
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-bold text-teal-400 text-xs">{displayAmount}</div>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center text-[11px] text-gray-500 mb-2.5">
                    <div className="flex items-center gap-1.5 truncate">
                      <BsFileEarmarkText className="opacity-70 shrink-0" />
                      <span className="truncate">{docType} • {refNumber}</span>
                    </div>
                    <div className="shrink-0 ml-2 text-[10px]">
                      {new Date(doc.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </div>
                  </div>

                  <div className="flex justify-between items-center group/row">
                    <StatusBadge status={doc.derivedStatus} />
                    
                    <div className="flex items-center gap-1.5">
                      {onOpenMoveModal && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenMoveModal(doc);
                          }}
                          className="opacity-0 group-hover/row:opacity-100 p-1 text-gray-400 hover:text-teal-400 hover:bg-teal-500/10 rounded transition-all"
                          title="Move to Folder"
                        >
                          <BsFolderSymlink size={13} />
                        </button>
                      )}
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
                         <div className="text-[10px] text-gray-600 truncate max-w-[100px]">{doc.original_filename}</div>
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
